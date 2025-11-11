import { chromium, Browser, Page, Frame } from 'playwright';
import { CAMPOS_CORFO_MAPPING, DEFAULT_CONFIG } from '../constants';
import { getNextReportId } from '../../server/utils/getNextReportId';
import { generarInformePDF } from '../../services/report/reportGenerator';
import { DetectorEstructura } from '../navigation/detector';
import { FieldExtractor } from '../fields/fieldExtractor';
import { FieldCompleter } from '../fields/fieldCompleter';
import { Navigator } from '../navigation/navigator';
import { ModalHandler } from '../navigation/modalHandler';
import { LoginService } from '../auth/loginService';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Importar y re-exportar tipos desde types.ts
import type { ResultadoAgente, PasoEjecucion, DetallePaso, ResultadoModal, ResultadoNavegacion, EstadisticasEjecucion } from './types';
export type { ResultadoAgente, PasoEjecucion, DetallePaso, ResultadoModal, ResultadoNavegacion, EstadisticasEjecucion };

export class AgenteOrquestador {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private tiempoEsperaEntreCampos: number;
    private tiempoInicio: number = 0;
    private resultado: ResultadoAgente;
    private formUrl: string = '';
    private archivosSubidosEnSesion: Set<string> = new Set(); // Para evitar subidas duplicadas
    private camposProcesadosEnPasoActual: Set<string> = new Set(); // Para trackear campos procesados en iteraciones
    private headless: boolean = false; // Modo headless - se configura en constructor
    private credenciales: { usuario: string; password: string } | null = null; // Credenciales dinámicas
    private cancelado: boolean = false; // Bandera para cancelación
    private executionId: string | null = null; // ID de ejecución (inyectado desde processService)
    private executionService: any = null; // ExecutionService (inyectado desde processService)
    private shouldLogToExecution: boolean = false; // Flag para saber si debe loguear a executionService
    private originalConsoleLog: typeof console.log | null = null; // Guardar console.log original
    private fieldExtractor: FieldExtractor | null = null; // Servicio para extraer campos
    private fieldCompleter: FieldCompleter | null = null; // Servicio para completar campos
    private navigator: Navigator | null = null; // Servicio para navegación
    private modalHandler: ModalHandler | null = null; // Servicio para manejo de modales
    private loginService: LoginService | null = null; // Servicio para login

    /**
     * Logger personalizado que envía logs tanto a console como a executionService
     */
    private log(...args: any[]): void {
        const message = args.map(arg => String(arg)).join(' ');
        
        // Siempre mostrar en consola usando el original (evita bucle infinito)
        if (this.originalConsoleLog) {
            this.originalConsoleLog(...args);
        } else {
            console.log(...args);
        }
        
        // Si está en modo web, guardar en executionService
        if (this.shouldLogToExecution && this.executionId && this.executionService) {
            this.executionService.addLog(this.executionId, message).catch(() => {
                // Ignorar errores de guardado de logs
            });
        }
    }

    /**
     * Espera inteligente: Verifica condición cada 100ms hasta que se cumpla o se alcance timeout
     * Esto permite continuar apenas la condición es verdadera, sin esperar tiempo fijo innecesario
     * @param condicion Función que retorna true cuando se puede continuar
     * @param timeoutMs Tiempo máximo a esperar (fallback al comportamiento actual)
     * @returns true si la condición se cumplió, false si se alcanzó timeout
     */
    private async esperarCondicion(
        condicion: () => Promise<boolean>,
        timeoutMs: number
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 100; // Verificar cada 100ms
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                if (await condicion()) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera < timeoutMs * 0.5) {
                        console.log(`   ⚡ Condición cumplida en ${tiempoEspera}ms (ahorro: ${timeoutMs - tiempoEspera}ms)`);
                    }
                    return true;
                }
            } catch (error) {
                // Si falla la verificación, continuar esperando
            }
            await this.page!.waitForTimeout(intervalo);
        }
        
        // Timeout alcanzado, continuar de todas formas (comportamiento actual)
        return false;
    }

    constructor(
        headless: boolean = false,
        credenciales?: { usuario: string; password: string },
        tiempoEsperaEntreCampos: number = DEFAULT_CONFIG.tiempoEsperaEntreCampos
    ) {
        this.tiempoEsperaEntreCampos = tiempoEsperaEntreCampos;
        this.headless = headless;
        this.credenciales = credenciales || null;
        this.resultado = {
            exito: false,
            mensaje: '',
            estadisticas: {
                totalPasos: 0,
                totalCampos: 0,
                camposCompletados: 0,
                porcentajeExito: 0,
                velocidadCamposPorSegundo: 0,
                tiempoPromedioPorPaso: 0
            },
            titulo: '',
            tituloProyecto: '',
            codigoProyecto: '',
            urlInicial: '',
            fechaEjecucion: new Date().toISOString(),
            tiempoTotal: 0,
            pasosCompletados: [],
            errores: []
        };
    }

    async ejecutar(): Promise<ResultadoAgente> {
        try {
            this.log('🚀 INICIANDO AGENTE ORQUESTADOR - ANÁLISIS + AUTOCOMPLETADO');
            this.log('='.repeat(60));
            this.log('🎯 Objetivo: Completar formulario en 15-20 minutos');
            this.log('⚡ Estrategia: Extracción + Completado simultáneo');
            this.log('');

            this.tiempoInicio = Date.now();

            // Verificar si se canceló antes de empezar
            if (this.cancelado) {
                this.log('🛑 Ejecución cancelada antes de iniciar');
                this.resultado.exito = false;
                this.resultado.mensaje = 'Ejecución cancelada por el usuario';
                return this.resultado;
            }

            // Solo pedir URL por consola si no fue configurada previamente
            if (!this.formUrl) {
                this.formUrl = await this.solicitarUrlPorConsola();
            } else {
                this.log(`📋 URL del formulario configurada: ${this.formUrl}`);
            }
            
            if (this.cancelado) return this.resultado;
            await this.inicializar();
            
            if (this.cancelado) return this.resultado;
            await this.loginYNavegacion();
            
            if (this.cancelado) return this.resultado;
            await this.procesarFormularioHibrido();

            // Solo marcar como exitoso si no se marcó como fallido previamente
            // (por ejemplo, por errores de validación detectados en enviarFormularioFinal)
            if (this.resultado.exito !== false) {
                this.resultado.exito = true;
                this.log('✅ AGENTE ORQUESTADOR COMPLETADO EXITOSAMENTE');
            }

        } catch (error) {
            this.resultado.errores = this.resultado.errores || [];
            this.resultado.errores.push((error as Error).message);
            console.error('❌ Error en Agente Orquestador:', error);
        } finally {
            await this.limpiarRecursos();
        }

        // Verificar si fue cancelado antes de generar reportes
        if (this.cancelado) {
            console.log('🛑 Ejecución cancelada. No se generará ningún informe.');
            this.resultado.exito = false;
            this.resultado.mensaje = 'Ejecución cancelada por el usuario';
            return this.resultado;
        }

        // Calcular estadísticas y tiempo total ANTES de finalizar
        this.resultado.tiempoTotal = Math.round((Date.now() - this.tiempoInicio) / 1000); // Convertir a segundos
        this.calcularEstadisticas();
        
        // Generar reporte final con estadísticas correctas
        await this.finalizar();

        return this.resultado;
    }

    private async inicializar(): Promise<void> {
        console.log('🔧 Inicializando navegador...');
        
        if (this.headless) {
            console.log('👻 Modo headless activado (navegador oculto)');
        } else {
            console.log('👁️ Modo visible activado (navegador visible)');
        }
        
        this.browser = await chromium.launch({
            headless: this.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        this.page.setDefaultNavigationTimeout(45000);

        // Inicializar servicios
        this.fieldExtractor = new FieldExtractor(this.page);
        this.fieldCompleter = new FieldCompleter(this.page, this.archivosSubidosEnSesion);
        this.navigator = new Navigator(this.page);
        // Pasar información sobre si es ejecución web (tiene executionId) o terminal
        const isWebExecution = this.executionId !== null;
        this.modalHandler = new ModalHandler(this.page, isWebExecution, this.executionId);
        this.loginService = new LoginService(this.page);

        console.log('✅ Navegador inicializado');
    }

    private async solicitarUrlPorConsola(): Promise<string> {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            rl.question('\n Ingresa la URL del formulario CORFO que deseas validar: ', (respuesta: string) => {
                rl.close();
                const url = (respuesta || '').trim();
                if (url.startsWith('http')) return resolve(url);
                reject(new Error('URL inválida. Debe comenzar con http o https'));
            });
        });
    }

    private async loginYNavegacion(): Promise<void> {
        console.log('🔑 Realizando login a CORFO...');

        // Prioridad: ir primero a la URL objetivo antes del login
        const urlEspecifica = this.formUrl || process.env.CORFO_URL;
        if (urlEspecifica && urlEspecifica !== 'https://ejemplo.corfo.cl/concurso/abc') {
            console.log(` Navegando primero a la URL objetivo: ${urlEspecifica}`);
            await this.navigator!.navegarAURLEspecifica(urlEspecifica);
        } else {
            // Si no hay URL, pedirla directamente
            this.formUrl = await this.solicitarUrlPorConsola();
            await this.navigator!.navegarAURLEspecifica(this.formUrl);
        }

        // Ahora realizar login desde el contexto actual (sin ir al home por defecto)
        await this.loginService!.realizarLogin();

        // IMPORTANTE: Prevenir navegación de vuelta a URL de login después de autenticarse
        // 
        // PROBLEMA: Si this.formUrl es una URL de login (ej: login.corfo.cl o Login.aspx),
        // el login exitoso nos redirige automáticamente al formulario o página intermedia.
        // Si intentamos "reafirmar" la URL navegando de vuelta a la URL de login,
        // se pierde la sesión y se desloguea automáticamente.
        //
        // SOLUCIÓN: Solo reafirmar URL si NO es una URL de login.
        // Si es URL de login, confiar en que el flujo de login nos llevó al lugar correcto.
        const esUrlLogin = this.formUrl && (this.formUrl.includes('login.corfo.cl') || this.formUrl.includes('Login.aspx'));
        
        if (esUrlLogin) {
            console.log('ℹ️ URL objetivo es URL de login - confiando en redirección post-login (NO navegar de vuelta)');
            const urlActual = this.page!.url();
            console.log(`📍 URL después del login: ${urlActual}`);
        } else if (this.formUrl && !this.page!.url().startsWith(this.formUrl)) {
            console.log(` Reafirmando URL objetivo autenticado: ${this.formUrl}`);
            const urlActual = this.page!.url();
            if (!urlActual.includes('Postulador.aspx') || urlActual.includes('Borradores')) {
                await this.navigator!.navegarAURLEspecifica(this.formUrl);
            } else {
                console.log('✅ Ya estamos en el formulario real, no es necesario navegar nuevamente');
            }
        }
        
        // Esperar estado estable antes de leer título/URL para evitar "Execution context was destroyed"
        await this.page!.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page!.waitForLoadState('networkidle').catch(() => {});
        
        // NO capturar título y URL aquí, se hará después de navegar al formulario real
    }

    private async extraerInformacionProyecto(): Promise<void> {
        try {
            console.log('🔍 Extrayendo información del proyecto...');
            
            const informacion = await this.page!.evaluate(() => {
                const tituloElement = document.getElementById('Titulo');
                const codigoElement = document.getElementById('SubTitulo');
                
                return {
                    tituloProyecto: tituloElement ? tituloElement.textContent?.trim() || '' : '',
                    codigoProyecto: codigoElement ? codigoElement.textContent?.trim() || '' : ''
                };
            });
            
            this.resultado.tituloProyecto = informacion.tituloProyecto;
            this.resultado.codigoProyecto = informacion.codigoProyecto;
            
            console.log(`📝 Título del proyecto: ${this.resultado.tituloProyecto}`);
            console.log(`🔢 Código del proyecto: ${this.resultado.codigoProyecto}`);
            
        } catch (error) {
            console.warn('⚠️ No se pudo extraer la información del proyecto:', error);
            this.resultado.tituloProyecto = 'No disponible';
            this.resultado.codigoProyecto = 'No disponible';
        }
    }

    private async activarContenidoDinamico(): Promise<void> {
        console.log('⏳ Activando contenido dinámico...');
        
        // Hacer scroll para activar contenido dinámico
        await this.page!.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await this.page!.waitForTimeout(1000);
        
        await this.page!.evaluate(() => {
            window.scrollTo(0, 0);
        });
        await this.page!.waitForTimeout(1000);
        
        // Verificar si hay campos disponibles
        const camposDisponibles = await this.page!.evaluate(() => {
            const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
            const desplegables = document.querySelectorAll('a[class*="collapsed"], a[class*="collapse"], a[data-toggle="collapse"]');
            return {
                inputs: inputs.length,
                desplegables: desplegables.length
            };
        });
        
        // Si no hay campos, esperar un poco más
        if (camposDisponibles.inputs === 0 && camposDisponibles.desplegables === 0) {
            console.log('⏳ Esperando carga de campos...');
            await this.page!.waitForTimeout(3000);
        }
    }

    private async procesarFormularioHibrido(): Promise<void> {
        console.log('🔄 Iniciando procesamiento híbrido...');
        
        // Verificar cancelación
        if (this.cancelado) {
            console.log('🛑 Procesamiento cancelado');
            return;
        }
        
        // Verificar si estamos en borradores o en el formulario real
        const detector = new DetectorEstructura(this.page!);
        const esBorradores = await detector.esPaginaBorradores();
        
        if (esBorradores) {
            console.log('📁 PÁGINA DE BORRADORES DETECTADA - Navegando al formulario real...');
            await this.navigator!.navegarDeBorradoresAFormulario();
        } else {
            console.log('✅ Ya estamos en el formulario real');
            // Espera inteligente: detectar cuando hay campos cargados (máximo 7 segundos)
            console.log('⏳ Esperando carga de campos dinámicos...');
            await this.esperarCondicion(async () => {
                const campos = await this.page!.$$('input:not([type="hidden"]), select, textarea');
                return campos.length > 0;
            }, 7000);
        }
        
        // Verificar cancelación después de navegación
        if (this.cancelado) {
            console.log('🛑 Procesamiento cancelado después de navegación');
            return;
        }
        
        // Capturar título y URL del formulario real (no de borradores)
        this.resultado.urlInicial = this.page?.url() || '';
        this.resultado.titulo = await this.page?.title() || '';
        
        console.log(`📋 Formulario accedido: ${this.resultado.titulo}`);
        console.log(`🔗 URL: ${this.resultado.urlInicial}`);
        
        // OPTIMIZACIÓN: Ejecutar en paralelo operaciones independientes
        await Promise.all([
            this.extraerInformacionProyecto(),
            this.page!.waitForLoadState('networkidle').catch(() => {}),
            this.activarContenidoDinamico()
        ]);
        
        // Detectar estructura del formulario
        let estructura = await detector.detectarEstructuraCompleta();
        
        // Adaptar el agente basado en la estructura detectada
        let pasoActual = estructura.pasoActual;
        let hayMasPasos = true;
        const tiempoLimitePorPaso = 3 * 60 * 1000; // 3 minutos máximo por paso
        const TOTAL_PASOS_ESPERADOS = estructura.totalPasos;

        console.log(`📊 ESTRUCTURA DETECTADA:`);
        this.log(`   📈 Método: ${estructura.tipoDeteccion} (${estructura.confianza}% confianza)`);
        this.log(`   📋 Total pasos: ${TOTAL_PASOS_ESPERADOS}`);
        console.log(`   📍 Paso actual: ${pasoActual}`);
        console.log(`    Es confirmación: ${estructura.esPaginaConfirmacion}`);
        console.log(`   📁 Es borradores: ${estructura.esPaginaBorradores}`);
        
        if (estructura.esPaginaConfirmacion) {
            console.log('📋 PÁGINA DE CONFIRMACIÓN DETECTADA - Procesando verificación y envío...');
            const detallesConfirmacion = await this.procesarPasoConfirmacion();
        
            // Agregar paso de confirmación a los resultados
            const pasoConfirmacion: PasoEjecucion = {
                numero: TOTAL_PASOS_ESPERADOS,
                titulo: 'Confirmación Final',
                camposEncontrados: detallesConfirmacion.length,
                camposCompletados: detallesConfirmacion.filter(d => d.completado).length,
                tiempoTranscurrido: 0,
                exito: true,
                detalles: detallesConfirmacion
            };
            
            this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
            this.resultado.pasosCompletados.push(pasoConfirmacion);
            
            //  NUEVO: Enviar el formulario
            await this.enviarFormularioFinal();
            
            return;
        }

        // Solo procesar pasos si NO estamos en confirmación ni borradores
        if (!estructura.esPaginaConfirmacion && !estructura.esPaginaBorradores) {
            this.log(`🔄 INICIANDO BUCLE DE PROCESAMIENTO DE PASOS...`);
            
            while (hayMasPasos && pasoActual <= TOTAL_PASOS_ESPERADOS) {
                const tiempoInicioPaso = Date.now();
                this.log(`\n🔍 PROCESANDO PASO ${pasoActual} de ${TOTAL_PASOS_ESPERADOS}`);
                this.log('-'.repeat(40));

                // Actualizar progreso al frontend
                await this.actualizarProgreso(pasoActual, TOTAL_PASOS_ESPERADOS, `Procesando paso ${pasoActual} de ${TOTAL_PASOS_ESPERADOS}`);

            try {
                //  NUEVO: procesarPasoActual ahora maneja la navegación internamente con sistema de iteraciones
                const paso = await this.procesarPasoActual(pasoActual, tiempoInicioPaso);
                this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
                this.resultado.pasosCompletados.push(paso);

                const tiempoTranscurrido = Date.now() - tiempoInicioPaso;
                if (tiempoTranscurrido > tiempoLimitePorPaso) {
                    console.log('⚠️ Límite de tiempo por paso alcanzado, pasando al siguiente');
                }

                // Si procesarPasoActual completó exitosamente, avanzar al siguiente paso
                pasoActual++;
                // OPTIMIZADO: Espera reducida después de cambio de paso
                await this.page!.waitForTimeout(1000);
                
                // Verificar si llegamos a una página especial
                const estructuraActual = await detector.detectarEstructuraCompleta();
                if (estructuraActual.esPaginaConfirmacion) {
                    console.log('📋 Página de confirmación detectada, procesando paso final...');
                    
                    // Procesar el paso de confirmación (no extraemos campos)
                    const detallesConfirmacion = await this.procesarPasoConfirmacion();
                    const pasoConfirmacion: PasoEjecucion = {
                        numero: pasoActual,
                        titulo: 'Confirmación Final',
                        camposEncontrados: 0,
                        camposCompletados: 0,
                        tiempoTranscurrido: 0,
                        exito: true,
                        detalles: detallesConfirmacion
                    };
                    this.resultado.pasosCompletados.push(pasoConfirmacion);
                    
                    // Hacer clic en botón "Enviar" para enviar el formulario
                    await this.enviarFormularioFinal();
                    
                    hayMasPasos = false;
                } else if (estructuraActual.esPaginaBorradores) {
                    console.log('📋 Página de borradores detectada, finalizando loop...');
                    hayMasPasos = false;
                }

            } catch (error) {
                console.error(`❌ Error en paso ${pasoActual}:`, (error as Error).message);
                this.resultado.errores = this.resultado.errores || [];
                this.resultado.errores.push(`Paso ${pasoActual}: ${(error as Error).message}`);
                
                // Intentar avanzar al siguiente paso en caso de error
                const resultadoNavegacion = await this.navigator!.navegarAlSiguientePaso();
                if (resultadoNavegacion.navegoExitosamente) {
                    pasoActual++;
                } else {
                    hayMasPasos = false;
                }
            }
            }
        } else {
            console.log(`ℹ️ Salteando bucle principal: página especial detectada`);
        }

        console.log(`\n✅ Procesamiento híbrido completado: ${(this.resultado.pasosCompletados?.length || 0)} pasos`);
    }

    /**
     * Procesa un paso del formulario con sistema de reintentos para campos faltantes
     * Implementa loop de hasta 3 iteraciones cuando el modal indica campos faltantes
     */
    private async procesarPasoActual(numeroPaso: number, tiempoInicio: number): Promise<PasoEjecucion> {
        const titulo = await this.navigator!.obtenerTituloPaso();

        console.log(`📝 Paso ${numeroPaso}: "${titulo}"`);

        //  NUEVO: Limpiar Set de campos procesados para nuevo paso
        this.camposProcesadosEnPasoActual.clear();

        //  DETECCIÓN AUTOMÁTICA DE TIPO DE PASO
        const detector = new DetectorEstructura(this.page!);
        const esConfirmacion = await detector.esPaginaConfirmacion();
        const esPasoPresupuesto = await detector.esPasoPresupuesto();
        const esPasoConAgregar = await detector.esPasoConBotonAgregar();
        
        console.log(`   📋 Tipo de paso detectado: ${esConfirmacion ? 'CONFIRMACIÓN' : 
            (esPasoPresupuesto ? 'PRESUPUESTO' : (esPasoConAgregar ? 'AGREGAR+' : 'NORMAL'))}`);

        let todosCamposProcesados: DetallePaso[] = [];
        
        if (esConfirmacion) {
            console.log(' PASO DE CONFIRMACIÓN DETECTADO AUTOMÁTICAMENTE - Realizando verificación final');
            todosCamposProcesados = await this.procesarPasoConfirmacion();
        } else if (esPasoPresupuesto) {
            console.log(' PASO PRESUPUESTO DETECTADO - Procesando tabs de presupuesto');
            todosCamposProcesados = await this.procesarPasoPresupuesto();
            console.log('✅ Paso Presupuesto completado exitosamente');
        } else if (esPasoConAgregar) {
            console.log(' PASO CON BOTÓN AGREGAR+ DETECTADO - Procesando modal de actividades');
            
            // Procesar modal AGREGAR+ (ya incluye navegación al siguiente paso)
            todosCamposProcesados = await this.procesarPasoConBotonAgregar();
            
            // ✅ NO procesar más campos ni navegar aquí - ya se hizo en procesarPasoConBotonAgregar()
            console.log('✅ Modal procesado exitosamente - Listo para continuar al siguiente paso');
        } else {
            //  NUEVO: Sistema iterativo para completar campos faltantes
            console.log(`🔄 Procesando paso ${numeroPaso} - Autocompletando campos`);
            
            //  DESPLEGABLES DESACTIVADOS: No se procesan por ahora
            
            // Primera iteración: Completar campos iniciales
            let camposIteracion = await this.extraerYCompletarCampos();
            todosCamposProcesados.push(...camposIteracion);
            
            console.log(`   📊 Primera iteración: ${camposIteracion.length} campos procesados`);
            
            //  NUEVO: Iteraciones ilimitadas basadas en aparición del modal
            // Ya no usamos MAX_ITERACIONES fijo, sino que iteramos hasta que el modal no aparezca
            const MAX_ITERACIONES_SEGURIDAD = 7; // Solo por seguridad para evitar loops infinitos
            let iteracionActual = 1;
            let hayMasCamposFaltantes = false;
            let navegoExitosamenteDentroDelLoop = false;
            
            do {
                console.log(`\n   ➡️ Verificando completitud del paso (Iteración ${iteracionActual})...`);
                
                // Intentar navegar al siguiente paso
                const resultadoNavegacion = await this.navigator!.navegarAlSiguientePaso();
                
                if (!resultadoNavegacion.navegoExitosamente) {
                    console.log(`   ⚠️ No se pudo navegar al siguiente paso`);
                    break;
                }
                
                //  CLAVE: Verificar si el modal indicó campos faltantes
                if (resultadoNavegacion.resultadoModal.camposFaltantes) {
                    console.log(`\n   🔄 ITERACIÓN ${iteracionActual + 1}: Procesando campos faltantes detectados...`);
                    
                    iteracionActual++;
                    
                    //  NUEVO: Solo salir si alcanzamos límite de seguridad (prevenir loops infinitos)
                    if (iteracionActual > MAX_ITERACIONES_SEGURIDAD) {
                        console.log(`   ⚠️ Límite de seguridad alcanzado (${MAX_ITERACIONES_SEGURIDAD} iteraciones)`);
                        console.log(`   📝 Posible loop infinito detectado, forzando salida...`);
                        hayMasCamposFaltantes = false;
                        break;
                    }
                    
                    // Espera inteligente: verificar que la página esté estable antes de procesar
                    await this.esperarCondicion(async () => {
                        const url = this.page!.url();
                        await this.page!.waitForTimeout(500);
                        return this.page!.url() === url; // URL estable = página lista
                    }, 2000);
                    
                    //  CORRECCIÓN CRÍTICA: Procesar campos independientemente de si son "nuevos" o no
                    // El modal apareció = hay campos faltantes, debemos intentar completarlos
                    const camposFaltantes = await this.extraerYCompletarCampos();
                    
                    console.log(`   📊 Campos procesados en esta iteración: ${camposFaltantes.length}`);
                    todosCamposProcesados.push(...camposFaltantes);
                    
                    //  CAMBIO FUNDAMENTAL: Continuar iterando SIEMPRE que el modal aparezca
                    // No importa si encontramos campos nuevos o no, si el modal aparece = hay problemas
                    hayMasCamposFaltantes = true;
                    
                    console.log(`   ⏭️ Modal apareció, continuando iteraciones...`);
                } else {
                    // Modal no apareció o se confirmó exitosamente dentro del loop
                    console.log(`   ✅ Paso completado exitosamente - Todos los campos obligatorios OK`);
                    navegoExitosamenteDentroDelLoop = true;
                    hayMasCamposFaltantes = false;
                }
                
            } while (hayMasCamposFaltantes && iteracionActual <= MAX_ITERACIONES_SEGURIDAD);
            
            this.log(`\n   📊 RESUMEN PASO ${numeroPaso}:`);
            this.log(`      🔄 Iteraciones realizadas: ${iteracionActual}`);
            console.log(`      📝 Total campos procesados: ${todosCamposProcesados.length}`);
            console.log(`      ✅ Campos completados: ${todosCamposProcesados.filter(c => c.completado).length}`);
            
            //  CRÍTICO: Solo intentar navegar si NO navegamos exitosamente dentro del loop
            if (!navegoExitosamenteDentroDelLoop) {
                console.log(`\n   ⚠️ FORZANDO AVANCE - Se alcanzó límite de iteraciones, intentando avanzar de todas formas...`);
                const navegacionFinal = await this.navigator!.navegarAlSiguienteParaAvanzar();
                
                if (navegacionFinal) {
                    console.log(`   ✅ Navegación forzada exitosa (puede haber campos faltantes)`);
                } else {
                    console.log(`   ❌ No se pudo avanzar al siguiente paso después de ${iteracionActual} iteraciones`);
                }
            } else {
                console.log(`   ✅ Ya navegó exitosamente dentro del loop, continuando...`);
            }
        }

        const tiempoTranscurrido = Math.round((Date.now() - tiempoInicio) / 1000);

        const paso: PasoEjecucion = {
            numero: numeroPaso,
            titulo: titulo,
            camposEncontrados: todosCamposProcesados.length,
            camposCompletados: todosCamposProcesados.filter(c => c.completado).length,
            tiempoTranscurrido: tiempoTranscurrido,
            exito: todosCamposProcesados.length > 0 || esConfirmacion || esPasoConAgregar || esPasoPresupuesto,
            detalles: todosCamposProcesados
        };

        console.log(`   ⏱️ Tiempo total paso: ${tiempoTranscurrido}s`);

        if (esConfirmacion) {
            console.log('🎉 VERIFICACIÓN FINAL COMPLETADA');
        }

        return paso;
    }

    /**
     * Envía el formulario final haciendo clic en el botón "Enviar"
     */
    private async enviarFormularioFinal(): Promise<void> {
        console.log('📤 Enviando formulario final...');
        
        try {
            // 1. Buscar y hacer clic en botón "Enviar"
            const botonEnviar = await this.page!.$('#BotonEnviar');
            
            if (!botonEnviar) {
                console.log('   ⚠️ No se encontró botón Enviar');
                return;
            }
            
            // Verificar si el botón está habilitado
            const estaHabilitado = await botonEnviar.evaluate((btn: any) => {
                return !btn.disabled && 
                       btn.style.display !== 'none' && 
                       btn.style.visibility !== 'hidden';
            });
            
            if (!estaHabilitado) {
                console.log('   ⚠️ Botón Enviar está deshabilitado');
                return;
            }
            
            console.log('   📤 Haciendo clic en botón Enviar...');
            await botonEnviar.click();
            
            // 2. Esperar un tiempo para que aparezca el modal (éxito o error)
            console.log('   ⏳ Esperando respuesta del servidor...');
            await this.page!.waitForTimeout(5000);
            
            // 3. NUEVO: Detectar si aparece el modal de errores de validación o modal de éxito
            const erroresValidacion = await this.modalHandler!.detectarModalErroresValidacion(this.headless);
            
            if (erroresValidacion.detectado) {
                console.log('   ❌ ERRORES DE VALIDACIÓN DETECTADOS');
                console.log(`   📋 Total de campos faltantes: ${erroresValidacion.camposFaltantes.length}`);
                
                // Guardar errores de validación en el resultado
                this.resultado.erroresValidacion = erroresValidacion;
                
                // Marcar la ejecución como fallida
                this.resultado.exito = false;
                this.resultado.mensaje = `Formulario enviado con ${erroresValidacion.camposFaltantes.length} errores de validación`;
                
                // Agregar errores a la lista de errores
                this.resultado.errores = this.resultado.errores || [];
                erroresValidacion.camposFaltantes.forEach((campo) => {
                    this.resultado.errores!.push(`Campo faltante: ${campo}`);
                });
                
                // Cerrar el modal de errores
                const botonOK = await this.modalHandler!.buscarBotonPorTextoPublico(['OK', 'Aceptar', 'ACEPTAR']);
                if (botonOK) {
                    await botonOK.click();
                    await this.page!.waitForTimeout(1000);
                }
                
                console.log('   ⚠️ Formulario NO se pudo enviar debido a errores de validación');
                return;
            }
            
            // 4. Si no hay errores, verificar si hay modal de éxito
            console.log('   🔍 Verificando modal de éxito...');
            const modalExito = await this.modalHandler!.detectarModalExito();
            
            if (modalExito) {
                console.log('   ✅ Modal de éxito detectado');
                // Marcar como exitoso cuando se detecta el modal de éxito
                this.resultado.exito = true;
                this.resultado.mensaje = 'Formulario enviado exitosamente';
                
                const botonAceptar = await this.modalHandler!.buscarBotonPorTextoPublico(['Aceptar', 'ACEPTAR', 'OK']);
                if (botonAceptar) {
                    console.log('   ✅ Haciendo clic en botón Aceptar del modal de éxito...');
                    await botonAceptar.click();
                    await this.page!.waitForTimeout(2000);
                }
            } else {
                console.log('   ℹ️ No se detectó modal de éxito, continuando...');
            }
            
            // 5. Cerrar modal de encuesta si aparece (manejo dinámico)
            console.log('   🔍 Verificando si aparece modal de encuesta...');
            await this.page!.waitForTimeout(1000);
            
            try {
                // Buscar el botón de cerrar con timeout corto
                const botonCerrarEncuesta = await this.page!.waitForSelector(
                    'button.close[data-dismiss="modal"]',
                    { timeout: 3000, state: 'visible' }
                );
                
                if (botonCerrarEncuesta) {
                    console.log('   ❌ Modal de encuesta detectado, cerrando...');
                    await botonCerrarEncuesta.click();
                    await this.page!.waitForTimeout(1000);
                }
            } catch (error) {
                console.log('   ℹ️ No apareció modal de encuesta, continuando...');
            }
            
            // 6. Retroceder una vez en el navegador
            console.log('   ⬅️ Retrocediendo en el navegador...');
            await this.page!.goBack();
            await this.page!.waitForTimeout(2000);
            
            // 7. Extraer la URL actual del navegador
            const urlFormularioEnviado = this.page!.url();
            console.log(`   🔗 URL del formulario enviado: ${urlFormularioEnviado}`);
            
            // 8. Guardar la URL en el resultado
            this.resultado.urlFormularioEnviado = urlFormularioEnviado;
            
            console.log('✅ Formulario enviado exitosamente');
            
        } catch (error) {
            console.error('   ❌ Error enviando formulario:', (error as Error).message);
            this.resultado.exito = false;
            this.resultado.errores = this.resultado.errores || [];
            this.resultado.errores.push(`Error al enviar formulario: ${(error as Error).message}`);
        }
    }

    private async procesarPasoConfirmacion(): Promise<DetallePaso[]> {
        // Ya no extraemos campos en el paso de confirmación
        // Solo retornamos un array vacío
        return [];
    }

    /**
     * Procesa paso especial con botón AGREGAR+ que abre modal con campos dinámicos
     * Reutiliza lógica existente de procesamiento de campos
     * Incluye navegación al siguiente paso al finalizar
     */
    private async procesarPasoConBotonAgregar(): Promise<DetallePaso[]> {
        console.log('📋 Procesando paso con botón AGREGAR+...');
        const detalles: DetallePaso[] = [];
        
        try {
            // 1. Buscar y clic en AGREGAR+ (reutiliza selectores estándar)
            const botonAgregar = await this.modalHandler!.buscarBotonPorTextoPublico(['AGREGAR +', 'Agregar +']);
            if (!botonAgregar) {
                console.log('   ⚠️ No se encontró botón AGREGAR+');
                return detalles;
            }
            
            await botonAgregar.click();
            // OPTIMIZADO: Espera inteligente para apertura de modal
            await this.esperarCondicion(async () => {
                // Verificar que el modal esté visible
                const modal = await this.page!.$('.modal:visible, [role="dialog"]:visible, .swal2-container:visible');
                return modal !== null;
            }, 2000);
            console.log('   ✅ Modal abierto');
            
            // 2. Procesar campos del modal (REUTILIZA lógica existente)
            const camposModal = await this.extraerYCompletarCampos();
            detalles.push(...camposModal);
            console.log(`   📊 Campos procesados: ${camposModal.length}`);
            
            // 3. Buscar y clic en Enviar
            const botonEnviar = await this.modalHandler!.buscarBotonPorTextoPublico(['Enviar', 'ENVIAR', 'Guardar']);
            if (botonEnviar) {
                await botonEnviar.click();
                await this.page!.waitForTimeout(2000);
                console.log('   ✅ Formulario enviado');
                
                // 4. Manejar modal "Proceso Exitoso" (similar a modal confirmación)
                await this.modalHandler!.cerrarModalConfirmacion(['Aceptar', 'ACEPTAR']);
                
                // 5. ✅ NAVEGAR AL SIGUIENTE PASO después de cerrar el modal
                console.log('   ➡️ Navegando al siguiente paso después de agregar actividad...');
                await this.page!.waitForTimeout(1500); // Esperar que se actualice la tabla
                
                const resultadoNavegacion = await this.navigator!.navegarAlSiguientePaso();
                if (resultadoNavegacion.navegoExitosamente) {
                    console.log('   ✅ Navegación exitosa al siguiente paso');
                } else {
                    console.log('   ⚠️ No se pudo navegar al siguiente paso');
                }
            }
            
        } catch (error) {
            console.error('   ❌ Error:', error);
        }
        
        return detalles;
    }

    /**
     * Extrae información de los tabs de presupuesto
     * @returns Array con título y data-cuenta de cada tab
     */
    private async extraerTabsPresupuesto(): Promise<Array<{titulo: string, dataCuenta: string}>> {
        return await this.page!.evaluate(() => {
            const tabs: Array<{titulo: string, dataCuenta: string}> = [];
            const tabsContainer = document.querySelector('ul[id*="ul_tb_cuentas_"]');
            
            if (tabsContainer) {
                const tabElements = tabsContainer.querySelectorAll('li a[data-toggle="tab"][data-cuenta]');
                
                tabElements.forEach(tab => {
                    const titulo = tab.getAttribute('alt') || 
                                  tab.querySelector('h4')?.textContent?.trim() || 
                                  '';
                    const dataCuenta = tab.getAttribute('data-cuenta') || '';
                    
                    if (titulo && dataCuenta) {
                        tabs.push({ titulo, dataCuenta });
                    }
                });
            }
            
            return tabs;
        });
    }

    /**
     * Activa un tab específico de presupuesto
     * @param dataCuenta El valor de data-cuenta del tab
     */
    private async activarTabPresupuesto(dataCuenta: string): Promise<void> {
        try {
            await this.page!.evaluate((cuenta) => {
                const tab = document.querySelector(`a[data-toggle="tab"][data-cuenta="${cuenta}"]`);
                if (tab) {
                    (tab as HTMLElement).click();
                }
            }, dataCuenta);
        } catch (error) {
            console.log(`      ⚠️ Error activando tab:`, (error as Error).message);
        }
    }

    /**
     * Procesa paso Presupuesto con tabs dinámicos
     * Agrega 1 item por cada tab y luego navega al siguiente paso
     */
    private async procesarPasoPresupuesto(): Promise<DetallePaso[]> {
        console.log('📊 Procesando paso PRESUPUESTO con tabs dinámicos...');
        const detalles: DetallePaso[] = [];
        
        try {
            // 1. Extraer todas las tabs
            const tabs = await this.extraerTabsPresupuesto();
            console.log(`   📋 Tabs encontrados: ${tabs.length}`);
            
            if (tabs.length === 0) {
                console.log('   ⚠️ No se encontraron tabs de presupuesto');
                return detalles;
            }
            
            tabs.forEach((tab, index) => {
                console.log(`      ${index + 1}. "${tab.titulo}"`);
            });
            
            // 2. Procesar cada tab
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i];
                console.log(`\n   📂 Procesando tab ${i + 1}/${tabs.length}: "${tab.titulo}"`);
                
                try {
                    // Hacer clic en el tab para activarlo
                    await this.activarTabPresupuesto(tab.dataCuenta);
                    await this.page!.waitForTimeout(1000);
                    
                    // Buscar y hacer clic en AGREGAR+
                    const botonAgregar = await this.page!.$('#btnAgregar_item');
                    if (!botonAgregar) {
                        console.log('      ⚠️ No se encontró botón AGREGAR+ para este tab');
                        continue;
                    }
                    
                    await botonAgregar.click();
                    // OPTIMIZADO: Espera inteligente para modal de presupuesto
                    await this.esperarCondicion(async () => {
                        const modal = await this.page!.$('.modal:visible, [role="dialog"]:visible');
                        return modal !== null;
                    }, 2000);
                    console.log('      ✅ Modal abierto');
                    
                    //  CRÍTICO: Limpiar Set de campos procesados para cada modal nuevo
                    this.camposProcesadosEnPasoActual.clear();
                    
                    // Completar campos del modal
                    const camposModal = await this.extraerYCompletarCampos();
                    detalles.push(...camposModal);
                    console.log(`      📊 Campos procesados: ${camposModal.length}`);
                    
                    // Verificar que hay campos completados
                    const camposCompletados = camposModal.filter(c => c.completado).length;
                    if (camposCompletados === 0) {
                        console.log('      ⚠️ ADVERTENCIA: No se completaron campos en este tab');
                    }
                    
                    // Buscar botón Guardar
                    const botonGuardar = await this.modalHandler!.buscarBotonPorTextoPublico(['Guardar', 'GUARDAR']);
                    if (!botonGuardar) {
                        console.log('      ⚠️ No se encontró botón Guardar');
                        continue;
                    }
                    
                    // Verificar si el botón ya está habilitado
                    const habilitadoInmediatamente = await botonGuardar.evaluate((btn: any) => {
                        return !btn.disabled;
                    });
                    
                    if (habilitadoInmediatamente) {
                        console.log('      ✅ Botón Guardar ya está habilitado');
                        await botonGuardar.click();
                        await this.page!.waitForTimeout(2000);
                        console.log('      ✅ Formulario guardado');
                        
                        // Cerrar modal de confirmación
                        await this.modalHandler!.cerrarModalConfirmacion(['Aceptar', 'ACEPTAR']);
                        await this.page!.waitForTimeout(1000);
                    } else {
                        console.log('      ⚠️ Botón Guardar deshabilitado - Faltan campos obligatorios');
                        console.log('      📋 Campos completados: ', camposModal.map(c => `${c.etiqueta}: ${c.completado ? '✓' : '✗'}`).join(', '));
                    }
                    
                } catch (errorTab) {
                    console.error(`      ❌ Error procesando tab "${tab.titulo}":`, (errorTab as Error).message);
                }
            }
            
            console.log(`\n   ✅ Todos los tabs procesados (${tabs.length}/${tabs.length})`);
            
            // 3. Navegar al siguiente paso (solo después de procesar TODOS los tabs)
            console.log('   ➡️ Navegando al siguiente paso...');
            const resultadoNavegacion = await this.navigator!.navegarAlSiguientePaso();
            if (resultadoNavegacion.navegoExitosamente) {
                console.log('   ✅ Navegación exitosa al siguiente paso');
            }
            
        } catch (error) {
            console.error('   ❌ Error:', error);
        }
        
        return detalles;
    }

    /**
     * Extrae y completa campos del formulario
     * Usa this.camposProcesadosEnPasoActual para trackear campos entre iteraciones
     * @returns Array de detalles de campos procesados en esta iteración
     */
    private async extraerYCompletarCampos(): Promise<DetallePaso[]> {
        const detalles: DetallePaso[] = [];
        
        const camposYaProcesadosInicio = this.camposProcesadosEnPasoActual.size;
        
        if (camposYaProcesadosInicio > 0) {
            console.log(`   🔄 REINTENTANDO EXTRACCIÓN - Campos ya procesados: ${camposYaProcesadosInicio}`);
        } else {
            console.log(`   🔍 INICIANDO EXTRACCIÓN  DE CAMPOS...`);
        }
        
        //  PASO 1: Hacer scroll PROGRESIVO para activar contenido dinámico
        console.log(`   📜 Haciendo scroll progresivo para activar contenido dinámico...`);
        await this.fieldExtractor!.scrollProgresivoParaActivarContenido();

        //  PASO 3: Buscar TODOS los campos de forma simplificada
        let elementos = await this.fieldExtractor!.obtenerTodosLosCampos();
        
        //  PASO 6: Procesar cada campo encontrado con detección dinámica
        console.log(`   🔍 Analizando ${elementos.length} elementos en total...`);
        
        //  NUEVO: Usar la propiedad de clase para mantener estado entre iteraciones
        const camposProcesados = this.camposProcesadosEnPasoActual;
        let intentos = 0;
        const maxIntentos = 3; // Máximo 3 iteraciones para detectar campos dinámicos
        
        while (intentos < maxIntentos) {
            intentos++;
            console.log(`   🔄 Iteración ${intentos}/${maxIntentos} - Detectando campos dinámicos...`);
            
            // Obtener elementos actuales en cada iteración
            if (intentos > 1) {
                elementos = await this.fieldExtractor!.obtenerTodosLosCampos();
            }
            
            let camposNuevosEncontrados = 0;

        for (const elemento of elementos) {
            try {
                // Verificar si el elemento es realmente interactuable
                const info = await this.fieldExtractor!.obtenerInfoCampoMejorada(elemento);
                    if (!info) {
                        continue;
                    }
                    
                    // Crear identificador único para el campo
                    const campoId = `${info.etiqueta}_${info.tipo}_${info.name || info.id}`;
                    
                    // Si ya procesamos este campo, saltarlo
                    if (camposProcesados.has(campoId)) {
                        continue;
                    }

                    console.log(`     🔍 Procesando campo: "${info.etiqueta}" (tipo: ${info.tipo})`);

                const valorAsignado = await this.fieldCompleter!.completarCampo(elemento, info);

                // Si el campo retorna null (solo para campos readonly/disabled/file sin botón), no incluirlo en el reporte
                if (valorAsignado === null) {
                    continue;
                }

                // Verificar si el campo realmente se completó
                // Valores que indican que el campo NO se completó correctamente
                const valoresError = [
                    'NO_SELECCIONADO',
                    'archivo_no_encontrado',
                    'error_subida_archivo',
                    'sin_boton_subir_archivo'
                ];
                
                const esValorError = valorAsignado !== null && valoresError.includes(valorAsignado);
                let realmenteCompletado = valorAsignado !== null && !esValorError;
                
                if (info.tipo === 'radio') {
                    if (valorAsignado === 'NO_SELECCIONADO') {
                        // Ya sabemos que no se completó
                        realmenteCompletado = false;
                    } else {
                        // Verificar el estado real del radio button en el DOM
                        try {
                            const estaSeleccionado = await elemento.isChecked();
                            realmenteCompletado = estaSeleccionado;
                            if (!estaSeleccionado) {
                                console.log(`     ⚠️ Radio button reportado como completado pero NO está seleccionado en el DOM`);
                            }
                        } catch (error) {
                            // Si no podemos verificar, asumir que no está completado
                            realmenteCompletado = false;
                            console.log(`     ⚠️ No se pudo verificar estado del radio button: ${(error as Error).message}`);
                        }
                    }
                }
                
                // Para campos de archivo, verificar valores de error específicos
                if (info.tipo === 'file' && esValorError) {
                    realmenteCompletado = false;
                    if (valorAsignado === 'archivo_no_encontrado') {
                        console.log(`     ⚠️ Campo file no completado: archivo no encontrado`);
                    } else if (valorAsignado === 'error_subida_archivo') {
                        console.log(`     ⚠️ Campo file no completado: error al subir archivo`);
                    }
                }
                
                // Determinar razón de fallo si no se completó
                let razonFallo: string | undefined = undefined;
                if (!realmenteCompletado) {
                    if (valorAsignado === 'NO_SELECCIONADO') {
                        razonFallo = 'Radio button no pudo ser seleccionado';
                    } else if (valorAsignado === 'archivo_no_encontrado') {
                        razonFallo = 'Archivo no encontrado en carpeta archivos_prueba';
                    } else if (valorAsignado === 'error_subida_archivo') {
                        razonFallo = 'Error al subir el archivo';
                    } else if (valorAsignado === 'sin_boton_subir_archivo') {
                        razonFallo = 'Campo file sin botón de subir archivo visible';
                    } else {
                        razonFallo = 'No se pudo completar el campo correctamente';
                    }
                }
                
                const detalle: DetallePaso = {
                    etiqueta: info.etiqueta,
                    tipo: info.tipo,
                    valorAsignado: valorAsignado === 'NO_SELECCIONADO' ? 'no seleccionado' : valorAsignado,
                    completado: realmenteCompletado,
                    esObligatorio: info.esObligatorio,
                    razonFallo: razonFallo
                };

                detalles.push(detalle);
                    camposProcesados.add(campoId);
                    camposNuevosEncontrados++;
                    
                    console.log(`     ✅ Campo procesado: ${info.tipo} - "${info.etiqueta}" - Valor: "${valorAsignado}"`);
                    
                    //  NUEVO: Si completamos un select, esperar y re-escanear para campos dinámicos
                    if (info.tipo === 'select' && valorAsignado) {
                        console.log(`     🔄 Campo select completado, esperando campos dinámicos...`);
                        await this.fieldExtractor!.esperarYCapturarCamposDinamicos();
                    }
                    
                await this.page!.waitForTimeout(this.tiempoEsperaEntreCampos);

            } catch (error) {
                    console.log(`     ⚠️ Error procesando campo:`, (error as Error).message);
                continue;
            }
        }

            console.log(`   📊 Iteración ${intentos}: ${camposNuevosEncontrados} campos nuevos procesados`);
            
            // Si no encontramos campos nuevos, salir del bucle
            if (camposNuevosEncontrados === 0) {
                console.log(`   ✅ No se encontraron más campos dinámicos, finalizando detección`);
                break;
            }
            
            // Esperar un poco antes de la siguiente iteración
            if (intentos < maxIntentos) {
                await this.page!.waitForTimeout(1000);
            }
        }

        console.log(`    RESUMEN: ${detalles.length} campos procesados, ${detalles.filter(d => d.completado).length} completados exitosamente`);
        return detalles;
    }

    // Métodos de extracción de campos movidos a FieldExtractor
    // Métodos de completado de campos movidos a FieldCompleter
    // Métodos de navegación movidos a Navigator
    // Métodos de modales movidos a ModalHandler
    // Métodos de login movidos a LoginService

    //  NUEVO: Reintentar autocompletado para campos faltantes - VERSIÓN AGRESIVA
    private async reintentarAutocompletado(): Promise<void> {
        console.log('🔄 Reintentando autocompletado de campos faltantes...');
        
        try {
            // Buscar solo campos visibles en el paso actual (no campos ocultos)
            const camposFaltantes = await this.page!.evaluate(() => {
                const campos = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                const faltantes: any[] = [];
                
                campos.forEach(campo => {
                    const element = campo as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                    
                    //  NUEVO: Verificar si el campo está realmente visible en el paso actual
                    const rect = element.getBoundingClientRect();
                    const style = window.getComputedStyle(element);
                    
                    const isVisible = style.display !== 'none' && 
                                     style.visibility !== 'hidden' && 
                                     style.opacity !== '0' &&
                                     rect.width > 0 && 
                                     rect.height > 0;
                    
                    const isInViewport = rect.top >= 0 && 
                                       rect.top <= window.innerHeight && 
                                       rect.left >= 0 && 
                                       rect.left <= window.innerWidth;
                    
                    // Verificar si está vacío
                    const estaVacio = !element.value || element.value.trim() === '';
                    const tieneError = element.classList.contains('error') || 
                                     element.classList.contains('invalid') ||
                                     element.getAttribute('aria-invalid') === 'true';
                    
                    //  NUEVO: Solo incluir campos visibles en el paso actual que estén vacíos o con error
                    if ((estaVacio || tieneError) && isVisible && isInViewport) {
                        // Buscar etiqueta
                        let etiqueta = '';
                        if (element.id) {
                            const labelEl = document.querySelector(`label[for="${element.id}"]`);
                            if (labelEl) etiqueta = labelEl.textContent?.trim() || '';
                        }
                        
                        if (!etiqueta) {
                            const parentLabel = element.closest('label');
                            if (parentLabel) {
                                etiqueta = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                            }
                        }
                        
                        if (!etiqueta && 'placeholder' in element) {
                            etiqueta = (element as HTMLInputElement).placeholder || '';
                        }
                        
                        // Buscar texto anterior si no hay etiqueta
                        if (!etiqueta) {
                            let previous = element.previousElementSibling;
                            let attempts = 0;
                            while (previous && !etiqueta && attempts < 3) {
                                const text = previous.textContent?.trim();
                                if (text && text.length > 0 && text.length < 100) {
                                    etiqueta = text;
                                    break;
                                }
                                previous = previous.previousElementSibling;
                                attempts++;
                            }
                        }
                        
                        //  NUEVO: Usar selector CSS válido para IDs numéricos
                        const selector = element.id ? `[id="${element.id}"]` : `[name="${element.name}"]`;
                        
                        faltantes.push({
                            selector: selector,
                            tipo: element.tagName.toLowerCase(),
                            etiqueta: etiqueta || 'Campo sin etiqueta',
                            esObligatorio: element.hasAttribute('required') || 
                                         element.getAttribute('aria-required') === 'true' ||
                                         element.classList.contains('required')
                        });
                    }
                });
                
                return faltantes;
            });
            
            console.log(`   📝 Campos faltantes encontrados: ${camposFaltantes.length}`);
            
            // Intentar completar cada campo faltante
            for (const campo of camposFaltantes) {
                try {
                    const elemento = await this.page!.$(campo.selector);
                    if (elemento) {
                        // Usar FieldCompleter para generar el valor
                        const infoCampo = {
                            etiqueta: campo.etiqueta,
                            tipo: campo.tipo,
                            esObligatorio: campo.esObligatorio,
                            name: '',
                            id: '',
                            value: '',
                            className: '',
                            placeholder: '',
                            dataCodigo: '',
                            dataOriginalTitle: '',
                            title: '',
                            dataControlId: '',
                            dataExtensiones: '',
                            dataTamanoMaximo: '',
                            dataTipoControl: '',
                            dataAdjuntoId: '',
                            dataInputmask: '',
                            opciones: [],
                            esMultiple: false
                        };
                        const valor = await this.fieldCompleter!.completarCampo(elemento, infoCampo);
                        
                        if (valor) {
                            console.log(`     ✅ Campo completado: ${campo.etiqueta}`);
                            await this.page!.waitForTimeout(100);
                        }
                    }
                } catch (error) {
                    console.log(`     ⚠️ Error completando campo ${campo.etiqueta}:`, (error as Error).message);
                }
            }
            
        } catch (error) {
            console.log('   ⚠️ Error en reintento de autocompletado:', (error as Error).message);
        }
    }

    /**
     * Finaliza la ejecución y guarda el reporte de debugging
     * Este reporte se guarda en data/debugg_results/ (raíz del proyecto) y es útil para ejecuciones manuales desde terminal
     * NO se guarda cuando se ejecuta desde la UI (headless=true)
     */
    private async finalizar(): Promise<void> {
        // Verificar si fue cancelado antes de generar cualquier informe
        if (this.cancelado) {
            console.log('🛑 Ejecución cancelada. No se generará ningún informe.');
            return;
        }

        // Solo guardar reporte cuando se ejecuta desde terminal (NO headless)
        // Cuando se ejecuta desde UI, el reporte lo guarda ProcessService
        if (!this.headless) {
            console.log('\n📊 Generando reporte final...');
            
            // Crear carpeta data/debugg_results/ si no existe
            // Ruta relativa desde dist/src/automation/core/ hasta raíz/data/
            const { getDataSubPath } = require('../../server/utils/dataPath');
            const debuggDir = getDataSubPath('debugg_results');
            await fs.mkdir(debuggDir, { recursive: true });
            
            // Obtener siguiente ID incremental
            const nextId = await getNextReportId(debuggDir, 'report_');
            const rutaReporte = path.join(debuggDir, `report_${nextId}.json`);
            
            await fs.writeFile(rutaReporte, JSON.stringify(this.resultado, null, 2), 'utf-8');
            console.log(`✅ Reporte guardado en: ${rutaReporte}`);

            // Generar PDF automáticamente después de guardar el JSON (solo si está habilitado)
            if (DEFAULT_CONFIG.GENERAR_PDF_DEBUGGING) {
                try {
                    const informesDir = getDataSubPath('informes');
                    await fs.mkdir(informesDir, { recursive: true });
                    const pdfPath = path.join(informesDir, `report_${nextId}.pdf`);
                    
                    await generarInformePDF(rutaReporte, pdfPath);
                    console.log(`✅ Informe PDF generado: report_${nextId}.pdf`);
                } catch (pdfError: any) {
                    console.error(`❌ Error generando PDF para report_${nextId}:`, pdfError.message);
                    console.error(`   Nota: El reporte JSON está guardado, solo falló la generación del PDF`);
                    // No lanzar error para no interrumpir el flujo principal
                }
            } else {
                console.log(`ℹ️ Generación de PDF desactivada para debugging (config: GENERAR_PDF_DEBUGGING = false)`);
            }
        }
    }

    private calcularEstadisticas(): void {
        const pasosCompletados = this.resultado.pasosCompletados || [];
        const tiempoTotal = this.resultado.tiempoTotal;
        
        // Calcular estadísticas basadas en pasosCompletados reales
        this.resultado.estadisticas.totalPasos = pasosCompletados.length;
        this.resultado.estadisticas.totalCampos = pasosCompletados.reduce(
            (total, paso) => total + paso.camposEncontrados, 0
        );
        
        // Recalcular campos completados contando directamente desde los detalles
        // Esto asegura que usamos la lógica corregida de completado
        let camposCompletadosReal = 0;
        let camposObligatoriosNoCompletados = 0;
        
        pasosCompletados.forEach((paso) => {
            paso.detalles.forEach((detalle) => {
                if (detalle.completado) {
                    camposCompletadosReal++;
                } else if (detalle.esObligatorio) {
                    camposObligatoriosNoCompletados++;
                }
            });
        });
        
        this.resultado.estadisticas.camposCompletados = camposCompletadosReal;
        
        // Determinar el estado de éxito basado en los resultados
        // Si hay errores de validación detectados, ya está marcado como false en enviarFormularioFinal
        if (this.resultado.erroresValidacion?.detectado) {
            // Ya está marcado como false, no cambiar
            // Pero asegurar que el mensaje esté establecido
            if (!this.resultado.mensaje) {
                this.resultado.mensaje = `Formulario enviado con ${this.resultado.erroresValidacion.camposFaltantes.length} errores de validación`;
            }
        } else if (camposObligatoriosNoCompletados > 0) {
            // Hay campos obligatorios no completados, marcar como fallido
            this.resultado.exito = false;
            this.resultado.mensaje = `Ejecución completada con ${camposObligatoriosNoCompletados} campos obligatorios no completados`;
        } else {
            // No hay errores de validación ni campos obligatorios no completados
            // Si todos los campos están completados y no hay errores, marcar como exitoso
            // (incluso si no se detectó explícitamente el modal de éxito)
            if (camposCompletadosReal === this.resultado.estadisticas.totalCampos && 
                this.resultado.estadisticas.totalCampos > 0) {
                this.resultado.exito = true;
                if (!this.resultado.mensaje) {
                    this.resultado.mensaje = 'Ejecución completada exitosamente';
                }
            } else if (this.resultado.exito !== false) {
                // Si no todos los campos están completados pero no hay errores explícitos,
                // mantener el estado actual (puede ser true si se detectó modal de éxito)
                if (!this.resultado.mensaje && this.resultado.exito) {
                    this.resultado.mensaje = 'Ejecución completada exitosamente';
                }
            }
        }
        
        // Calcular porcentaje de éxito basado en campos completados vs encontrados
        this.resultado.estadisticas.porcentajeExito = this.resultado.estadisticas.totalCampos > 0 
            ? Math.round((this.resultado.estadisticas.camposCompletados / this.resultado.estadisticas.totalCampos) * 100)
            : 0;
        
        // Calcular velocidad basada en campos completados (tiempoTotal ya está en segundos)
        this.resultado.estadisticas.velocidadCamposPorSegundo = tiempoTotal > 0
            ? Number((this.resultado.estadisticas.camposCompletados / tiempoTotal).toFixed(2))
            : 0;
        
        // Calcular tiempo promedio por paso (ya está en segundos)
        this.resultado.estadisticas.tiempoPromedioPorPaso = this.resultado.estadisticas.totalPasos > 0
            ? Math.round(tiempoTotal / this.resultado.estadisticas.totalPasos)
            : 0;
    }

    /**
     * Actualiza el progreso de la ejecución (solo si hay executionId inyectado)
     */
    private async actualizarProgreso(pasoActual: number, totalPasos: number, mensaje: string): Promise<void> {
        if (!this.executionId || !this.executionService) return;
        
        try {
            const progreso = Math.round((pasoActual / totalPasos) * 100);
            await this.executionService.updateExecutionProgress(this.executionId, progreso, mensaje);
        } catch (error) {
            // Ignorar errores de actualización para no romper el flujo
        }
    }

    /**
     * Detiene la ejecución actual y cierra el navegador
     * Método público para permitir cancelación desde el exterior
     */
    async detener(): Promise<void> {
        console.log('🛑 Deteniendo ejecución del Agente Orquestador...');
        this.cancelado = true;
        await this.limpiarRecursos();
        console.log('✅ Agente Orquestador detenido correctamente');
    }

    private async limpiarRecursos(): Promise<void> {
        try {
            if (this.page) await this.page.close();
            if (this.browser) await this.browser.close();
        } catch (error) {
            console.error('Error al limpiar recursos:', error);
        }
    }
}

export async function ejecutarAgenteOrquestador(): Promise<ResultadoAgente> {
    console.log(' INICIANDO AGENTE ORQUESTADOR CORFO');
    console.log('============================');
    
    const agente = new AgenteOrquestador();
    
    const resultado = await agente.ejecutar();
    
    console.log('\n📈 RESUMEN FINAL AGENTE ORQUESTADOR');
    console.log('===============================');
    console.log(`⏱️ Tiempo total: ${resultado.tiempoTotal} segundos (${(resultado.tiempoTotal / 60).toFixed(1)} minutos)`);
    console.log(`📊 Pasos completados: ${resultado.estadisticas.totalPasos}`);
    console.log(`📝 Campos encontrados: ${resultado.estadisticas.totalCampos}`);
    console.log(`✅ Campos completados: ${resultado.estadisticas.camposCompletados}`);
    console.log(`❌ Campos no completados: ${resultado.estadisticas.totalCampos - resultado.estadisticas.camposCompletados}`);
    console.log(` Porcentaje de éxito: ${resultado.estadisticas.porcentajeExito}%`);
    console.log(`⚡ Velocidad: ${resultado.estadisticas.velocidadCamposPorSegundo} campos/segundo`);
    
    // Mostrar campos obligatorios no completados
    if (resultado.pasosCompletados) {
        const camposObligatoriosNoCompletados: Array<{ paso: string; campo: string; razon: string }> = [];
        resultado.pasosCompletados.forEach((paso) => {
            paso.detalles.forEach((detalle) => {
                if (!detalle.completado && detalle.esObligatorio) {
                    camposObligatoriosNoCompletados.push({
                        paso: paso.titulo,
                        campo: detalle.etiqueta,
                        razon: detalle.razonFallo || 'No especificada'
                    });
                }
            });
        });
        
        if (camposObligatoriosNoCompletados.length > 0) {
            console.log(`\n⚠️ CAMPOS OBLIGATORIOS NO COMPLETADOS: ${camposObligatoriosNoCompletados.length}`);
            camposObligatoriosNoCompletados.forEach((item, index) => {
                console.log(`   ${index + 1}. [${item.paso}] ${item.campo}`);
                console.log(`      Razón: ${item.razon}`);
            });
        }
    }
    
    // Mostrar errores de validación si existen
    if (resultado.erroresValidacion && resultado.erroresValidacion.detectado) {
        console.log(`\n❌ ERRORES DE VALIDACIÓN AL ENVIAR FORMULARIO:`);
        console.log(`   Total de campos faltantes: ${resultado.erroresValidacion.camposFaltantes.length}`);
        resultado.erroresValidacion.camposFaltantes.forEach((campo, index) => {
            console.log(`   ${index + 1}. ${campo}`);
        });
        
        if (resultado.erroresValidacion.rutaScreenshot) {
            console.log(`\n📸 Screenshot del modal de errores guardado en:`);
            console.log(`   ${resultado.erroresValidacion.rutaScreenshot}`);
        }
    }
    
    // Mostrar otros errores si existen
    if (resultado.errores && resultado.errores.length > 0) {
        console.log(`\n❌ OTROS ERRORES ENCONTRADOS: ${resultado.errores.length}`);
        resultado.errores.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    return resultado;
}

if (require.main === module) {
    ejecutarAgenteOrquestador()
        .then((resultado) => {
            if (resultado.exito) {
                console.log('\n🎉 AGENTE ORQUESTADOR COMPLETADO EXITOSAMENTE');
                process.exit(0);
            } else {
                console.log('\n❌ AGENTE ORQUESTADOR FALLÓ');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Error fatal en Agente Orquestador:', error);
            process.exit(1);
        });
} 
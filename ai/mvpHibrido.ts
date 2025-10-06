import { chromium, Browser, Page } from 'playwright';
import { ConfiguracionAgente } from './tipos';
import { obtenerConfiguracion } from './configuraciones';
import { CAMPOS_CORFO_MAPPING, CampoFormulario } from '../scraping/extraerFormularios';
import { CacheInteligente, FormularioCache, EstructuraFormulario, EstrategiaAutocompletado } from './cacheInteligente';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Interfaz para la estructura detectada del formulario
 */
export interface EstructuraFormularioDetectada {
    totalPasos: number;
    pasoActual: number;
    esPaginaConfirmacion: boolean;
    esPaginaBorradores: boolean;
    tieneBarraProgreso: boolean;
    titulosPasos: string[];
    urlActual: string;
    tipoDeteccion: 'barra_progreso' | 'navegacion_botones' | 'analisis_contenido' | 'fallback';
    confianza: number; // 0-100%
}

/**
 * Clase para detectar automáticamente la estructura del formulario
 */
export class DetectorEstructura {
    private page: Page;
    
    constructor(page: Page) {
        this.page = page;
    }

    async detectarEstructuraCompleta(): Promise<EstructuraFormularioDetectada> {
        console.log('🔍 DETECTANDO ESTRUCTURA DEL FORMULARIO...');
        
        const url = this.page.url();
        let estructura: EstructuraFormularioDetectada = {
            totalPasos: 1,
            pasoActual: 1,
            esPaginaConfirmacion: false,
            esPaginaBorradores: false,
            tieneBarraProgreso: false,
            titulosPasos: [],
            urlActual: url,
            tipoDeteccion: 'fallback',
            confianza: 0
        };

        // Método 1: Detectar por barra de progreso visual
        const deteccionProgreso = await this.detectarPorBarraProgreso();
        if (deteccionProgreso.confianza && deteccionProgreso.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionProgreso };
        }

        // Método 2: Detectar por botones de navegación
        const deteccionBotones = await this.detectarPorBotonesNavegacion();
        if (deteccionBotones.confianza && deteccionBotones.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionBotones };
        }

        // Método 3: Detectar por análisis de contenido
        const deteccionContenido = await this.detectarPorContenido();
        if (deteccionContenido.confianza && deteccionContenido.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionContenido };
        }

        // Detectar tipos especiales de página
        estructura.esPaginaConfirmacion = await this.esPaginaConfirmacion();
        estructura.esPaginaBorradores = await this.esPaginaBorradores();

        console.log(`📊 ESTRUCTURA DETECTADA:`);
        console.log(`   📈 Método: ${estructura.tipoDeteccion} (${estructura.confianza}% confianza)`);
        console.log(`   📋 Total pasos: ${estructura.totalPasos}`);
        console.log(`   📍 Paso actual: ${estructura.pasoActual}`);
        console.log(`   🎯 Es confirmación: ${estructura.esPaginaConfirmacion}`);
        console.log(`   📁 Es borradores: ${estructura.esPaginaBorradores}`);

        return estructura;
    }

    private async detectarPorBarraProgreso(): Promise<Partial<EstructuraFormularioDetectada>> {
        try {
            console.log('🔍 Método 1: Detectando por barra de progreso...');
            
            const progreso = await this.page.evaluate(() => {
                // Buscar elementos de progreso comunes
                const selectoresProgreso = [
                    '.progress-bar', '.step-indicator', '.stepper',
                    '.progress-steps', '.wizard-steps', '.form-steps',
                    '[class*="step"]', '[class*="progress"]', '[class*="wizard"]',
                    '.breadcrumb', '.nav-tabs', '.nav-pills'
                ];

                for (const selector of selectoresProgreso) {
                    const elementos = document.querySelectorAll(selector);
                    if (elementos.length > 0) {
                        // Analizar estructura de pasos
                        const pasos = Array.from(elementos).filter(el => {
                            const texto = el.textContent?.trim() || '';
                            const esVisible = window.getComputedStyle(el).display !== 'none';
                            return esVisible && (texto.length > 0 || el.children.length > 0);
                        });

                        if (pasos.length > 1) {
                            const titulosPasos = pasos.map(paso => {
                                const texto = paso.textContent?.trim() || '';
                                return texto.length > 0 ? texto : `Paso ${pasos.indexOf(paso) + 1}`;
                            });

                            // Detectar paso actual (elemento con clase active, current, selected, etc.)
                            let pasoActual = 1;
                            for (let i = 0; i < pasos.length; i++) {
                                const elemento = pasos[i] as Element;
                                if (elemento.classList.contains('active') || 
                                    elemento.classList.contains('current') ||
                                    elemento.classList.contains('selected') ||
                                    elemento.classList.contains('step-active')) {
                                    pasoActual = i + 1;
                                    break;
                                }
                            }

                            return {
                                totalPasos: pasos.length,
                                pasoActual: pasoActual,
                                titulosPasos: titulosPasos,
                                tieneBarraProgreso: true
                            };
                        }
                    }
                }

                return null;
            });

            if (progreso) {
                console.log(`   ✅ Detectados ${progreso.totalPasos} pasos por barra de progreso`);
                return {
                    ...progreso,
                    tipoDeteccion: 'barra_progreso',
                    confianza: 90
                };
            }

        } catch (error) {
            console.log('   ⚠️ Error en detección por progreso:', (error as Error).message);
        }

        return { confianza: 0 };
    }

    private async detectarPorBotonesNavegacion(): Promise<Partial<EstructuraFormularioDetectada>> {
        try {
            console.log('🔍 Método 2: Detectando por botones de navegación...');
            
            const navegacion = await this.page.evaluate(() => {
                // Buscar botones siguiente/anterior
                const todosBotones = document.querySelectorAll('button, input[type="button"], input[type="submit"], a');
                
                let tieneSiguiente = false;
                let tieneAnterior = false;
                
                Array.from(todosBotones).forEach(boton => {
                    const texto = boton.textContent?.toLowerCase() || '';
                    const value = (boton as HTMLInputElement).value?.toLowerCase() || '';
                    const textoBuscar = texto + ' ' + value;
                    
                    if (textoBuscar.includes('siguiente') || textoBuscar.includes('continuar')) {
                        tieneSiguiente = true;
                    }
                    if (textoBuscar.includes('anterior') || textoBuscar.includes('atrás')) {
                        tieneAnterior = true;
                    }
                });

                // Si hay navegación, probablemente hay múltiples pasos
                if (tieneSiguiente || tieneAnterior) {
                    let estimacionPasos = 3; // Mínimo con navegación
                    
                    if (tieneAnterior) {
                        estimacionPasos = 7; // Nueva estructura detectada
                    }

                    return {
                        totalPasos: estimacionPasos,
                        tieneNavegacion: true
                    };
                }

                return null;
            });

            if (navegacion) {
                console.log(`   ✅ Detectada navegación - estimando ${navegacion.totalPasos} pasos`);
                return {
                    ...navegacion,
                    tipoDeteccion: 'navegacion_botones',
                    confianza: 60
                };
            }

        } catch (error) {
            console.log('   ⚠️ Error en detección por navegación:', (error as Error).message);
        }

        return { confianza: 0 };
    }

    private async detectarPorContenido(): Promise<Partial<EstructuraFormularioDetectada>> {
        try {
            console.log('🔍 Método 3: Detectando por análisis de contenido...');
            
            const contenido = await this.page.evaluate(() => {
                const textoCompleto = document.body.textContent || '';
                
                // Patrones que indican múltiples pasos
                const patronesPasos = [
                    /paso\s*(\d+)\s*de\s*(\d+)/i,
                    /step\s*(\d+)\s*of\s*(\d+)/i,
                    /(\d+)\s*\/\s*(\d+)/,
                    /página\s*(\d+)\s*de\s*(\d+)/i
                ];

                for (const patron of patronesPasos) {
                    const match = textoCompleto.match(patron);
                    if (match) {
                        const pasoActual = parseInt(match[1]);
                        const totalPasos = parseInt(match[2]);
                        
                        if (pasoActual > 0 && totalPasos > 1 && pasoActual <= totalPasos) {
                            return {
                                pasoActual: pasoActual,
                                totalPasos: totalPasos
                            };
                        }
                    }
                }

                // Buscar indicadores específicos de CORFO (estructura nueva)
                const indicadoresCORFO = [
                    'datos generales proyecto', 'encargado del proyecto', 
                    'beneficiario', 'asociado', 'coejecutor', 
                    'propuesta técnica', 'financiera', 'confirmación'
                ];

                const indicadoresEncontrados = indicadoresCORFO.filter(indicador => 
                    textoCompleto.toLowerCase().includes(indicador)
                );

                if (indicadoresEncontrados.length >= 2) {
                    return {
                        totalPasos: 7, // Nueva estructura detectada
                        esFormularioComplejo: true
                    };
                }

                return null;
            });

            if (contenido) {
                console.log(`   ✅ Detectado por contenido - ${contenido.totalPasos} pasos`);
                return {
                    ...contenido,
                    tipoDeteccion: 'analisis_contenido',
                    confianza: 70
                };
            }

        } catch (error) {
            console.log('   ⚠️ Error en detección por contenido:', (error as Error).message);
        }

        return { confianza: 0 };
    }

    async esPaginaConfirmacion(): Promise<boolean> {
        return await this.page.evaluate(() => {
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            const url = window.location.href.toLowerCase();
            
            // Indicadores MUY específicos y más restrictivos
            const indicadoresConfirmacion = [
                'resumen y confirmación', 
                'verificación final',
                'confirmar envío final',
                'enviar postulación'
            ];

            // Solo considerar confirmación si la URL es específica de confirmación
            const urlEsConfirmacion = url.includes('confirmacion') || 
                                    url.includes('resumen') || 
                                    url.includes('verification') ||
                                    url.includes('final');

            // Verificar contadores específicos PERO solo si no estamos en un formulario normal
            const tieneContadoresCampos = textoCompleto.includes('campos obligatorios correctos') && 
                                        textoCompleto.includes('campos obligatorios incorrectos');
            
            // CRITERIO ESTRICTO: Solo es confirmación si tiene contadores Y no tiene campos de entrada
            const tieneInputsActivos = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length > 5;
            
            // Si hay muchos inputs activos, NO puede ser página de confirmación
            if (tieneInputsActivos) {
                return false;
            }

            // Solo considerar confirmación si:
            // 1. URL específica de confirmación O
            // 2. Tiene texto específico de confirmación O
            // 3. Tiene contadores Y no tiene inputs activos
            const tieneTextoConfirmacion = indicadoresConfirmacion.some(indicador => 
                textoCompleto.includes(indicador)
            );

            return urlEsConfirmacion || tieneTextoConfirmacion || (tieneContadoresCampos && !tieneInputsActivos);
        });
    }

    async esPaginaBorradores(): Promise<boolean> {
        return await this.page.evaluate(() => {
            const url = window.location.href;
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            
            return url.includes('Borradores') || 
                   textoCompleto.includes('borradores de postulación') ||
                   textoCompleto.includes('nueva postulación');
        });
    }
}

/**
 * MVP HÍBRIDO: Análisis + Autocompletado en Una Sola Ejecución
 * 
 * Objetivo: Completar formularios CORFO en 15-20 minutos (vs 60+ del análisis profundo)
 * Estrategia: Extracción + Completado simultáneo de campos
 * Seguridad: NO envía formularios (solo testing)
 */

export interface ConfiguracionMVP {
    autocompletar: boolean;
    soloObligatorios: boolean;
    velocidad: 'normal' | 'rapida' | 'maxima';
    guardarCache: boolean;
}

export interface ResultadoMVP {
    exito: boolean;
    mensaje: string;
    tiempoEjecucion: number;
    estadisticas: EstadisticasMVP;
    pasos: any[];
    titulo?: string;
    urlInicial?: string;
    fechaEjecucion?: string;
    tiempoTotal?: number;
    pasosCompletados?: PasoMVP[];
    errores?: string[];
}

export interface PasoMVP {
    numero: number;
    titulo: string;
    url: string;
    camposEncontrados: number;
    camposCompletados: number;
    tiempoTranscurrido: number;
    exito: boolean;
    detalles: DetallePasoMVP[];
}

export interface DetallePasoMVP {
    etiqueta: string;
    tipo: string;
    valorAsignado: string;
    completado: boolean;
    esObligatorio: boolean;
    razonFallo?: string;
}

export interface EstadisticasMVP {
    totalPasos: number;
    totalCampos: number;
    camposCompletados: number;
    porcentajeExito: number;
    velocidadCamposPorSegundo: number;
    tiempoPromedioPorPaso: number;
    pasosProcesados?: number;
    camposAutocompletados?: number;
    porcentajeCompletado?: number;
}

export class MVPHibrido {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private configuracion: ConfiguracionAgente;
    private tiempoInicio: number = 0;
    private resultado: ResultadoMVP;
    private cache: CacheInteligente;
    private formularioCache: FormularioCache | null = null;
    private formUrl: string = '';

    constructor(configuracion: ConfiguracionAgente) {
        this.configuracion = configuracion;
        this.cache = new CacheInteligente();
        this.resultado = {
            exito: false,
            mensaje: '',
            tiempoEjecucion: 0,
            estadisticas: {
                totalPasos: 0,
                totalCampos: 0,
                camposCompletados: 0,
                porcentajeExito: 0,
                velocidadCamposPorSegundo: 0,
                tiempoPromedioPorPaso: 0
            },
            pasos: [],
            titulo: '',
            urlInicial: '',
            fechaEjecucion: new Date().toISOString(),
            tiempoTotal: 0,
            pasosCompletados: [],
            errores: []
        };
    }

    async ejecutar(): Promise<ResultadoMVP> {
        console.log('🚀 INICIANDO MVP HÍBRIDO - ANÁLISIS + AUTOCOMPLETADO');
        console.log('=' .repeat(60));
        console.log('🎯 Objetivo: Completar formulario en 15-20 minutos');
        console.log('⚡ Estrategia: Extracción + Completado simultáneo');
        console.log('🛡️ Seguridad: NO envía formulario (solo testing)');
        console.log('');

        this.tiempoInicio = Date.now();

        try {
            this.formUrl = await this.solicitarUrlPorConsola();
            await this.inicializar();
            await this.loginYNavegacion();
            await this.procesarFormularioHibrido();
            await this.finalizar();

            this.resultado.exito = true;
            console.log('✅ MVP HÍBRIDO COMPLETADO EXITOSAMENTE');

        } catch (error) {
            this.resultado.errores = this.resultado.errores || [];
            this.resultado.errores.push((error as Error).message);
            console.error('❌ Error en MVP híbrido:', error);
        } finally {
            await this.limpiarRecursos();
        }

        this.resultado.tiempoTotal = Date.now() - this.tiempoInicio;
        this.calcularEstadisticas();

        return this.resultado;
    }

    private async inicializar(): Promise<void> {
        console.log('🔧 Inicializando navegador...');
        
        this.browser = await chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        this.page.setDefaultNavigationTimeout(45000);

        console.log('✅ Navegador inicializado');
    }

    private async solicitarUrlPorConsola(): Promise<string> {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            rl.question('\n🎯 Ingresa la URL del formulario CORFO que deseas validar: ', (respuesta: string) => {
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
            console.log(`🎯 Navegando primero a la URL objetivo: ${urlEspecifica}`);
            await this.navegarAURLEspecifica(urlEspecifica);
        } else {
            // Si no hay URL, pedirla
            await this.mostrarConvocatoriasYSolicitar();
        }

        // Ahora realizar login desde el contexto actual (sin ir al home por defecto)
        await this.realizarLogin();

        // Asegurar que estemos en la URL objetivo autenticados (si la navegación de login nos movió)
        if (this.formUrl && !this.page!.url().startsWith(this.formUrl)) {
            console.log(`🎯 Reafirmando URL objetivo autenticado: ${this.formUrl}`);
            await this.navegarAURLEspecifica(this.formUrl);
        }
        
        // Esperar estado estable antes de leer título/URL para evitar "Execution context was destroyed"
        await this.page!.waitForLoadState('domcontentloaded').catch(() => {});
        await this.page!.waitForLoadState('networkidle').catch(() => {});

        this.resultado.urlInicial = this.page?.url() || '';
        this.resultado.titulo = await this.page?.title() || '';
        
        console.log(`📋 Formulario accedido: ${this.resultado.titulo}`);
        console.log(`🔗 URL: ${this.resultado.urlInicial}`);
    }

    private async procesarFormularioHibrido(): Promise<void> {
        console.log('🔄 Iniciando procesamiento híbrido...');
        
        // 🎯 DETECCIÓN AUTOMÁTICA DE ESTRUCTURA
        const detector = new DetectorEstructura(this.page!);
        const estructura = await detector.detectarEstructuraCompleta();
        
        // Adaptar el MVP basado en la estructura detectada
        let pasoActual = estructura.pasoActual;
        let hayMasPasos = true;
        const tiempoLimitePorPaso = 3 * 60 * 1000; // 3 minutos máximo por paso
        const TOTAL_PASOS_ESPERADOS = estructura.totalPasos;

        console.log(`🎯 ADAPTACIÓN AUTOMÁTICA:`);
        console.log(`   📊 Total pasos detectados: ${TOTAL_PASOS_ESPERADOS}`);
        console.log(`   📍 Iniciando desde paso: ${pasoActual}`);
        console.log(`   🔧 Método detección: ${estructura.tipoDeteccion}`);
        console.log(`   ✅ Es confirmación: ${estructura.esPaginaConfirmacion}`);
        console.log(`   📋 Es borradores: ${estructura.esPaginaBorradores}`);
        
        // Debugging adicional para entender la detección
        if (estructura.esPaginaConfirmacion) {
            console.log(`⚠️ INVESTIGANDO DETECCIÓN DE CONFIRMACIÓN...`);
            const textoCompleto = await this.page!.evaluate(() => 
                document.body.textContent?.toLowerCase().substring(0, 800) || ''
            );
            console.log(`   📄 Texto de la página (primeros 800 chars): "${textoCompleto}"`);
            console.log(`   🔗 URL completa: ${this.page!.url()}`);
        }

        // Manejar casos especiales
        if (estructura.esPaginaBorradores) {
            console.log('📁 PÁGINA DE BORRADORES DETECTADA - Navegando al formulario real...');
            await this.navegarDeBorradoresAFormulario();
            // Re-detectar estructura después de navegar
            const nuevaEstructura = await detector.detectarEstructuraCompleta();
            pasoActual = nuevaEstructura.pasoActual;
        }

        if (estructura.esPaginaConfirmacion) {
            console.log('🎯 PÁGINA DE CONFIRMACIÓN DETECTADA - Procesando verificación...');
            const detallesConfirmacion = await this.procesarPasoConfirmacion();
            
            // Agregar paso de confirmación a los resultados
            const pasoConfirmacion: PasoMVP = {
                numero: 1,
                titulo: 'Confirmación Final',
                url: this.page!.url(),
                camposEncontrados: detallesConfirmacion.length,
                camposCompletados: detallesConfirmacion.filter(d => d.completado).length,
                tiempoTranscurrido: 0,
                exito: true,
                detalles: detallesConfirmacion
            };
            
            this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
            this.resultado.pasosCompletados.push(pasoConfirmacion);
            return; // No hay más pasos después de confirmación
        }

        // Solo procesar pasos si NO estamos en confirmación ni borradores
        if (!estructura.esPaginaConfirmacion && !estructura.esPaginaBorradores) {
            console.log(`🔄 INICIANDO BUCLE DE PROCESAMIENTO DE PASOS...`);
            
            while (hayMasPasos && pasoActual <= TOTAL_PASOS_ESPERADOS) {
                const tiempoInicioPaso = Date.now();
                console.log(`\n🔍 PROCESANDO PASO ${pasoActual}`);
                console.log('-'.repeat(40));

            try {
                const paso = await this.procesarPasoActual(pasoActual, tiempoInicioPaso);
                this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
                this.resultado.pasosCompletados.push(paso);

                const tiempoTranscurrido = Date.now() - tiempoInicioPaso;
                if (tiempoTranscurrido > tiempoLimitePorPaso) {
                    console.log('⚠️ Límite de tiempo por paso alcanzado, pasando al siguiente');
                }

                hayMasPasos = await this.navegarAlSiguientePaso();
                
                if (hayMasPasos) {
                    pasoActual++;
                    await this.page!.waitForTimeout(2000);
                }

            } catch (error) {
                console.error(`❌ Error en paso ${pasoActual}:`, (error as Error).message);
                this.resultado.errores = this.resultado.errores || [];
                this.resultado.errores.push(`Paso ${pasoActual}: ${(error as Error).message}`);
                
                hayMasPasos = await this.navegarAlSiguientePaso();
                if (hayMasPasos) pasoActual++;
            }
            }
        } else {
            console.log(`ℹ️ Salteando bucle principal: página especial detectada`);
        }

        console.log(`\n✅ Procesamiento híbrido completado: ${(this.resultado.pasosCompletados?.length || 0)} pasos`);
    }

    private async procesarPasoActual(numeroPaso: number, tiempoInicio: number): Promise<PasoMVP> {
        const titulo = await this.obtenerTituloPaso();
        const url = this.page!.url();

        console.log(`📝 Paso ${numeroPaso}: "${titulo}"`);

        // 🎯 DETECCIÓN AUTOMÁTICA DE TIPO DE PASO
        const detector = new DetectorEstructura(this.page!);
        const esConfirmacion = await detector.esPaginaConfirmacion();

        let campos: DetallePasoMVP[] = [];
        
        if (esConfirmacion) {
            console.log('🎯 PASO DE CONFIRMACIÓN DETECTADO AUTOMÁTICAMENTE - Realizando verificación final');
            campos = await this.procesarPasoConfirmacion();
        } else {
            console.log(`🔄 Procesando paso regular ${numeroPaso} - Autocompletando campos`);
            await this.expandirSeccionesAutomaticamente();
            campos = await this.extraerYCompletarCampos();
        }

        const tiempoTranscurrido = Date.now() - tiempoInicio;

        const paso: PasoMVP = {
            numero: numeroPaso,
            titulo: titulo,
            url: url,
            camposEncontrados: campos.length,
            camposCompletados: campos.filter(c => c.completado).length,
            tiempoTranscurrido: tiempoTranscurrido,
            exito: campos.length > 0 || esConfirmacion,
            detalles: campos
        };

        console.log(`   📊 Campos encontrados: ${campos.length}`);
        console.log(`   ✅ Campos completados: ${campos.filter(c => c.completado).length}`);
        console.log(`   ⏱️ Tiempo: ${(tiempoTranscurrido / 1000).toFixed(1)}s`);

        if (esConfirmacion) {
            console.log('🎉 VERIFICACIÓN FINAL COMPLETADA');
        }

        return paso;
    }

    private async procesarPasoConfirmacion(): Promise<DetallePasoMVP[]> {
        console.log('📊 Analizando contadores de campos obligatorios...');
        
        const detalles: DetallePasoMVP[] = [];
        
        try {
            // Buscar los contadores de campos en la página de confirmación
            const contadores = await this.page!.evaluate(() => {
                const resultados = {
                    correctos: 0,
                    incorrectos: 0,
                    formatosIncorrectos: 0
                };
                
                // Buscar elementos que contengan los contadores
                const elementos = document.querySelectorAll('*');
                for (let i = 0; i < elementos.length; i++) {
                    const elemento = elementos[i];
                    const texto = elemento.textContent || '';
                    
                    // Buscar patrones como "Campos obligatorios correctos: 11"
                    if (texto.includes('obligatorios correctos')) {
                        const match = texto.match(/(\d+)/);
                        if (match) resultados.correctos = parseInt(match[1]);
                    }
                    
                    if (texto.includes('obligatorios incorrectos')) {
                        const match = texto.match(/(\d+)/);
                        if (match) resultados.incorrectos = parseInt(match[1]);
                    }
                    
                    if (texto.includes('formatos incorrectos')) {
                        const match = texto.match(/(\d+)/);
                        if (match) resultados.formatosIncorrectos = parseInt(match[1]);
                    }
                }
                
                return resultados;
            });
            
            console.log(`   ✅ Campos obligatorios correctos: ${contadores.correctos}`);
            console.log(`   ❌ Campos obligatorios incorrectos: ${contadores.incorrectos}`);
            console.log(`   ⚠️ Campos con formatos incorrectos: ${contadores.formatosIncorrectos}`);
            
            // Crear detalles para el reporte
            detalles.push({
                etiqueta: 'Campos obligatorios correctos',
                tipo: 'contador',
                valorAsignado: contadores.correctos.toString(),
                completado: true,
                esObligatorio: false
            });
            
            detalles.push({
                etiqueta: 'Campos obligatorios incorrectos',
                tipo: 'contador',
                valorAsignado: contadores.incorrectos.toString(),
                completado: contadores.incorrectos === 0,
                esObligatorio: false,
                razonFallo: contadores.incorrectos > 0 ? `Hay ${contadores.incorrectos} campos incorrectos` : undefined
            });
            
            detalles.push({
                etiqueta: 'Campos con formatos incorrectos',
                tipo: 'contador',
                valorAsignado: contadores.formatosIncorrectos.toString(),
                completado: contadores.formatosIncorrectos === 0,
                esObligatorio: false,
                razonFallo: contadores.formatosIncorrectos > 0 ? `Hay ${contadores.formatosIncorrectos} campos con formato incorrecto` : undefined
            });
            
            // Calcular porcentaje de éxito
            const totalCampos = contadores.correctos + contadores.incorrectos;
            const porcentajeExito = totalCampos > 0 ? Math.round((contadores.correctos / totalCampos) * 100) : 0;
            
            console.log(`📈 RESUMEN DE VERIFICACIÓN:`);
            console.log(`   📊 Total campos obligatorios: ${totalCampos}`);
            console.log(`   🎯 Porcentaje de éxito: ${porcentajeExito}%`);
            
            if (porcentajeExito >= 90) {
                console.log('🎉 ¡EXCELENTE! Formulario casi completamente correcto');
            } else if (porcentajeExito >= 70) {
                console.log('👍 BUENO: Formulario mayormente correcto');
            } else {
                console.log('⚠️ NECESITA MEJORAS: Muchos campos requieren corrección');
            }
            
        } catch (error) {
            console.error('❌ Error al procesar paso de confirmación:', error);
            
            detalles.push({
                etiqueta: 'Error en verificación',
                tipo: 'error',
                valorAsignado: (error as Error).message,
                completado: false,
                esObligatorio: false,
                razonFallo: 'No se pudo acceder a los contadores de verificación'
            });
        }
        
        return detalles;
    }

    private async extraerYCompletarCampos(): Promise<DetallePasoMVP[]> {
        const detalles: DetallePasoMVP[] = [];
        
        // Hacer scroll para activar contenido dinámico
        console.log(`   📜 Haciendo scroll para activar contenido dinámico...`);
        await this.page!.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 200;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        window.scrollTo(0, 0); // Volver al inicio
                        setTimeout(resolve, 1000);
                    }
                }, 100);
            });
        });

        // Buscar en iframe principal si existe
        const frames = this.page!.frames();
        console.log(`   🖼️ Frames encontrados: ${frames.length}`);
        
        let elementos = await this.page!.$$('input, select, textarea');
        console.log(`   🔍 Elementos en página principal: ${elementos.length}`);
        
        // Si no hay elementos en la página principal, buscar en iframes
        if (elementos.length === 0) {
            for (let i = 0; i < frames.length; i++) {
                try {
                    const frame = frames[i];
                    const frameUrl = frame.url();
                    console.log(`   🖼️ Revisando frame ${i + 1}: ${frameUrl}`);
                    
                    const elementosFrame = await frame.$$('input, select, textarea');
                    if (elementosFrame.length > 0) {
                        console.log(`   ✅ Encontrados ${elementosFrame.length} elementos en frame ${i + 1}`);
                        // Cambiar contexto al frame con más elementos
                        elementos = elementosFrame;
                        break;
                    }
                } catch (error) {
                    console.log(`   ⚠️ Error al acceder frame ${i + 1}:`, (error as Error).message);
                }
            }
        }

                 // Buscar campos reales (no hidden) prioritariamente
         if (elementos.length === 0) {
             console.log(`   🔍 Buscando campos reales (no hidden)...`);
             elementos = await this.page!.$$('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], select, textarea, input[type="radio"], input[type="checkbox"]');
             console.log(`   📝 Campos reales encontrados: ${elementos.length}`);
         }

         // Solo si no hay campos reales, buscar hidden como último recurso
         if (elementos.length === 0) {
             console.log(`   🔍 No hay campos reales, buscando campos hidden como último recurso...`);
             elementos = await this.page!.$$('input[type="hidden"]');
             console.log(`   📝 Campos hidden encontrados: ${elementos.length}`);
         }

        console.log(`   🔍 Analizando ${elementos.length} elementos en total...`);

        for (const elemento of elementos) {
            try {
                // Verificar si el elemento es realmente interactuable
                const info = await this.obtenerInfoCampoMejorada(elemento);
                if (!info) continue;

                const valorAsignado = await this.completarCampo(elemento, info);

                const detalle: DetallePasoMVP = {
                    etiqueta: info.etiqueta,
                    tipo: info.tipo,
                    valorAsignado: valorAsignado || '',
                    completado: !!valorAsignado,
                    esObligatorio: info.esObligatorio,
                    razonFallo: valorAsignado ? undefined : 'No se pudo determinar valor apropiado'
                };

                detalles.push(detalle);
                console.log(`     ✅ Campo procesado: ${info.tipo} - "${info.etiqueta}"`);
                await this.page!.waitForTimeout(this.configuracion.tiempoEsperaEntreCampos);

            } catch (error) {
                continue;
            }
        }

        return detalles;
    }

    private async obtenerInfoCampoMejorada(elemento: any): Promise<any> {
        try {
            return await elemento.evaluate((el: any) => {
                const tagName = el.tagName.toLowerCase();
                const type = el.type || tagName;
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';
                const value = el.value || '';

                // Verificar si el elemento está realmente disponible
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isDisplayed = style.display !== 'none';
                const isVisible = style.visibility !== 'hidden';
                const hasSize = rect.width > 0 && rect.height > 0;
                const isInDocument = document.contains(el);

                // Para campos hidden, aceptar si tienen name/id significativo
                const isInteractuable = isDisplayed && isVisible && (hasSize || type === 'hidden') && isInDocument;

                if (!isInteractuable && type !== 'hidden') return null;

                let etiqueta = '';
                
                // Estrategia 1: Label con atributo 'for'
                if (id) {
                    const labelEl = document.querySelector(`label[for="${id}"]`);
                    if (labelEl) etiqueta = labelEl.textContent?.trim() || '';
                }

                // Estrategia 2: Label padre
                if (!etiqueta) {
                    const parentLabel = el.closest('label');
                    if (parentLabel) {
                        etiqueta = parentLabel.textContent?.replace(value, '').trim() || '';
                    }
                }

                // Estrategia 3: Placeholder
                if (!etiqueta && el.placeholder) {
                    etiqueta = el.placeholder;
                }

                // Estrategia 4: Texto anterior (hermanos anteriores)
                if (!etiqueta) {
                    let previous = el.previousElementSibling;
                    let attempts = 0;
                    while (previous && !etiqueta && attempts < 5) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 200) {
                            etiqueta = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }

                // Estrategia 5: Contenedor padre
                if (!etiqueta) {
                    const container = el.closest('div, td, th, li, fieldset');
                    if (container) {
                        const allText = container.textContent?.trim() || '';
                        const lines = allText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
                        if (lines.length > 0) {
                            etiqueta = lines[0].substring(0, 100);
                        }
                    }
                }

                // Estrategia 6: Usar name o id como fallback
                if (!etiqueta) {
                    etiqueta = name || id || `Campo ${tagName}`;
                }

                const esObligatorio = el.hasAttribute('required') || 
                                    el.getAttribute('aria-required') === 'true' ||
                                    className.includes('required') ||
                                    (etiqueta.includes('*') || etiqueta.includes('obligatorio'));

                return {
                    tipo: type,
                    etiqueta: etiqueta,
                    esObligatorio,
                    name: name,
                    id: id,
                    value: value,
                    className: className,
                    debug: {
                        isDisplayed,
                        isVisible,
                        hasSize,
                        isInDocument,
                        isInteractuable
                    }
                };
            });
        } catch (error) {
            return null;
        }
    }

    private async obtenerInfoCampo(elemento: any): Promise<any> {
        try {
            return await elemento.evaluate((el: any) => {
                const tagName = el.tagName.toLowerCase();
                const type = el.type || tagName;
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';

                let etiqueta = '';
                
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label) etiqueta = label.textContent?.trim() || '';
                }

                if (!etiqueta) {
                    const parentLabel = el.closest('label');
                    if (parentLabel) {
                        etiqueta = parentLabel.textContent?.replace(el.value || '', '').trim() || '';
                    }
                }

                if (!etiqueta && el.placeholder) {
                    etiqueta = el.placeholder;
                }

                if (!etiqueta) {
                    let previous = el.previousElementSibling;
                    while (previous && !etiqueta) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 100) {
                            etiqueta = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                    }
                }

                const esObligatorio = el.hasAttribute('required') || 
                                    el.getAttribute('aria-required') === 'true' ||
                                    className.includes('required') ||
                                    (etiqueta.includes('*') || etiqueta.includes('obligatorio'));

                return {
                    tipo: type,
                    etiqueta: etiqueta || `Campo ${tagName}`,
                    esObligatorio
                };
            });
        } catch (error) {
            return null;
        }
    }

    private async completarCampo(elemento: any, info: any): Promise<string | null> {
        try {
            const valor = this.generarValorParaCampo(info);
            if (!valor) return null;

            const tipo = info.tipo.toLowerCase();

            if (tipo === 'select') {
                const opciones = await elemento.$$eval('option', (opts: any[]) => 
                    opts.map((opt: any) => ({ value: opt.value, text: opt.textContent?.trim() }))
                );

                if (opciones.length > 1) {
                    const opcionValida = opciones.find((opt: any) => opt.value && opt.value !== '');
                    if (opcionValida) {
                        await elemento.selectOption(opcionValida.value);
                        return opcionValida.text;
                    }
                }
            } else if (tipo === 'checkbox') {
                await elemento.check();
                return 'true';
            } else if (tipo === 'radio') {
                await elemento.click();
                return 'seleccionado';
            } else if (['text', 'email', 'tel', 'url', 'password', 'textarea'].includes(tipo)) {
                await elemento.fill(valor);
                return valor;
            } else if (tipo === 'number') {
                const numeroValor = typeof valor === 'string' ? valor.replace(/[^\d]/g, '') : valor;
                await elemento.fill(numeroValor);
                return numeroValor;
            } else if (tipo === 'date') {
                await elemento.fill('2024-12-31');
                return '2024-12-31';
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    private generarValorParaCampo(info: any): string {
        const etiqueta = info.etiqueta.toLowerCase();

        if (etiqueta.includes('rut') || etiqueta.includes('run')) {
            return CAMPOS_CORFO_MAPPING.RUT;
        } else if (etiqueta.includes('email') || etiqueta.includes('correo')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.email;
        } else if (etiqueta.includes('teléfono') || etiqueta.includes('telefono')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.telefono;
        } else if (etiqueta.includes('nombre') && !etiqueta.includes('proyecto')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.nombre;
        } else if (etiqueta.includes('apellido')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.apellido;
        } else if (etiqueta.includes('razón social') || etiqueta.includes('empresa')) {
            return this.configuracion.preferenciasAutocompletado.datosEmpresa.razonSocial;
        } else if (etiqueta.includes('proyecto')) {
            return CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
        } else if (etiqueta.includes('descripción') || etiqueta.includes('resumen')) {
            return CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
        } else if (etiqueta.includes('monto') || etiqueta.includes('costo')) {
            return CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
        }

        const tipo = info.tipo.toLowerCase();
        switch (tipo) {
            case 'email': return this.configuracion.preferenciasAutocompletado.datosPersonales.email;
            case 'tel': return this.configuracion.preferenciasAutocompletado.datosPersonales.telefono;
            case 'number': return '100';
            case 'date': return '2024-12-31';
            case 'textarea': return CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
            default: return CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
        }
    }

    private async realizarLogin(): Promise<void> {
        // 1) Intentar interfaz nueva en la página actual
        try {
            const mostrarLink = await this.page!.$('#mostrarCorfoLoginLink');
            const bloqueVisible = await this.page!.$('#bloqueCorfoLogin');

            if (mostrarLink) {
                await mostrarLink.click();
                await this.page!.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
            } else if (!bloqueVisible) {
                // nada visible aún, continuar a verificar iframe
            }

            const hayBloque = await this.page!.$('#bloqueCorfoLogin');
            if (hayBloque) {
                await this.page!.waitForSelector('#rut', { state: 'visible' });
                await this.page!.waitForSelector('#pass', { state: 'visible' });
                await this.page!.fill('#rut', process.env.CORFO_USER!);
                await this.page!.fill('#pass', process.env.CORFO_PASS!);
                await this.page!.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                await Promise.all([
                    this.page!.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                    this.page!.click('#ingresa_')
                ]);
                // Esperar a que se estabilice la red
                await this.page!.waitForLoadState('networkidle').catch(() => {});
                console.log('Login con interfaz nueva completado');
                return;
            }
        } catch {}

        // 2) Intentar interfaz antigua via iframe en la página actual
        const frames = this.page!.frames();
        const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
        if (loginFrame) {
            await loginFrame.waitForLoadState('networkidle');
            await this.page!.waitForTimeout(2000);
            await loginFrame.fill('#rut', process.env.CORFO_USER!);
            await loginFrame.fill('#pass', process.env.CORFO_PASS!);
            await Promise.all([
                this.page!.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                loginFrame.click('#ingresa_')
            ]);
            await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => {});
            await this.page!.waitForLoadState('networkidle').catch(() => {});
            console.log('Login con iframe completado');
            return;
        }

        // 3) Si existe un enlace textual a login en la misma página, usarlo (sin ir al home)
        try {
            const enlaceLogin = await this.page!.$('a:has-text("¿Tienes clave Corfo?"), a:has-text("Inicia sesión"), a:has-text("Ingreso usuario")');
            if (enlaceLogin) {
                await Promise.all([
                    this.page!.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                    enlaceLogin.click()
                ]);

                // Reintentar interfaz nueva o iframe tras navegar
                const mostrarLink2 = await this.page!.$('#mostrarCorfoLoginLink');
                if (mostrarLink2) {
                    await mostrarLink2.click();
                    await this.page!.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
                    await this.page!.fill('#rut', process.env.CORFO_USER!);
                    await this.page!.fill('#pass', process.env.CORFO_PASS!);
                    await Promise.all([
                        this.page!.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                        this.page!.click('#ingresa_')
                    ]);
                    await this.page!.waitForLoadState('networkidle').catch(() => {});
                    console.log('Login completado tras navegar al enlace de login');
                    return;
                }

                const frames2 = this.page!.frames();
                const loginFrame2 = frames2.find(frame => frame.url().includes('login.corfo.cl'));
                if (loginFrame2) {
                    await loginFrame2.waitForLoadState('networkidle');
                    await loginFrame2.fill('#rut', process.env.CORFO_USER!);
                    await loginFrame2.fill('#pass', process.env.CORFO_PASS!);
                    await Promise.all([
                        this.page!.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                        loginFrame2.click('#ingresa_')
                    ]);
                    await loginFrame2.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => {});
                    await this.page!.waitForLoadState('networkidle').catch(() => {});
                    console.log('Login con iframe tras navegar al enlace de login');
                    return;
                }
            }
        } catch {}

        throw new Error('No se encontró interfaz de login en la página actual');
    }

    private async navegarAFormulario(): Promise<void> {
        console.log('🔍 Navegando al formulario CORFO...');
        
        await this.page!.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'domcontentloaded'
        });

        // Scroll para cargar formularios
        await this.page!.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 200);
            });
        });

        await this.page!.waitForTimeout(3000);

        const masInfoLink = await this.page!.$('div.foot-caja_result a');
        if (masInfoLink) {
            const href = await masInfoLink.getAttribute('href');
            const urlCompleta = href!.startsWith('http') ? href! : `https://www.corfo.cl${href}`;
            
            console.log(`📋 Accediendo a convocatoria: ${urlCompleta}`);
            await this.page!.goto(urlCompleta, { waitUntil: 'networkidle' });
            await this.page!.waitForTimeout(2000);

            // Buscar botón "Inicia tu postulación"
            const botonIniciar = await this.page!.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación")');
            if (botonIniciar) {
                console.log('🚀 Haciendo clic en "Inicia tu postulación"...');
                await Promise.all([
                    this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    botonIniciar.click()
                ]);
                await this.page!.waitForTimeout(5000);
                
                // Verificar si estamos en la página de borradores
                const urlActual = this.page!.url();
                console.log(`📍 URL después del login: ${urlActual}`);
                
                if (urlActual.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                } else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            }
        }
    }

    private async navegarAURLEspecifica(url: string): Promise<void> {
        console.log(`🎯 Navegando directamente a la URL: ${url}`);
        
        try {
            await this.page!.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            await this.page!.waitForTimeout(3000);
            
            // Verificar si necesitamos hacer clic en "Inicia tu postulación"
            const botonIniciar = await this.page!.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación")');
            if (botonIniciar) {
                console.log('🚀 Haciendo clic en "Inicia tu postulación"...');
                await Promise.all([
                    this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    botonIniciar.click()
                ]);
                await this.page!.waitForTimeout(5000);
                
                // Verificar si estamos en la página de borradores
                const urlActual = this.page!.url();
                console.log(`📍 URL después del clic: ${urlActual}`);
                
                if (urlActual.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                } else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            } else {
                console.log('✅ Ya estamos en el formulario (no se encontró botón de inicio)');
            }
        } catch (error) {
            console.error(`❌ Error navegando a URL específica: ${error}`);
            throw error;
        }
    }

    private async mostrarConvocatoriasYSolicitar(): Promise<void> {
        console.log('🔍 Esperando URL del formulario...');
        
        const url = await this.solicitarUrlPorConsola();
        console.log(`✅ URL ingresada: ${url}`);
        await this.navegarAURLEspecifica(url);
    }

    private async navegarDeBorradoresAFormulario(): Promise<void> {
        console.log('🔄 Navegando desde borradores al formulario real...');
        
        // Buscar botón "Nueva Postulación"
        const selectoresNuevaPostulacion = [
            'button:has-text("Nueva Postulación")',
            'button:has-text("NUEVA POSTULACIÓN")',
            'a:has-text("Nueva Postulación")',
            'a:has-text("NUEVA POSTULACIÓN")',
            'input[value*="Nueva"]',
            '.btn:has-text("Nueva")',
            '[onclick*="nueva"]'
        ];
        
        let botonNuevaPostulacion = null;
        for (const selector of selectoresNuevaPostulacion) {
            botonNuevaPostulacion = await this.page!.$(selector);
            if (botonNuevaPostulacion) {
                console.log(`✅ Botón "Nueva Postulación" encontrado: ${selector}`);
                break;
            }
        }
        
        if (botonNuevaPostulacion) {
            console.log('🔄 Haciendo clic en "Nueva Postulación"...');
            await Promise.all([
                this.page!.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación')),
                botonNuevaPostulacion.click()
            ]);
            
            await this.page!.waitForTimeout(5000);
            
            const urlFinal = this.page!.url();
            console.log(`📍 URL final del formulario: ${urlFinal}`);
            
                            if (urlFinal.includes('Postulador.aspx') && !urlFinal.includes('Borradores')) {
                    console.log('✅ Navegación exitosa al formulario real');
                    // Buscar y hacer clic en el botón "Siguiente" o "Comenzar" para llegar al primer paso real
                    await this.navegarAlPrimerPasoReal();
                } else {
                    console.log('⚠️ Aún no estamos en el formulario real, intentando otras estrategias...');
                }
        } else {
            console.log('❌ No se encontró botón "Nueva Postulación"');
        }
    }

    // Eliminado: ya no se eliminan postulaciones existentes

    private async navegarAlPrimerPasoReal(): Promise<void> {
        console.log('🎯 Navegando al primer paso real del formulario...');
        
        await this.page!.waitForTimeout(3000); // Esperar que cargue completamente
        
        // Buscar botones que podrían llevarnos al primer paso
        const selectoresPrimerPaso = [
            'button:has-text("Siguiente")',
            'button:has-text("SIGUIENTE")', 
            'button:has-text("Comenzar")',
            'button:has-text("COMENZAR")',
            'button:has-text("Continuar")',
            'button:has-text("CONTINUAR")',
            'input[value*="iguiente"]',
            'input[value*="omenzar"]',
            'input[value*="ontinuar"]',
            'button[type="submit"]',
            '.btn:has-text("Siguiente")',
            '.btn:has-text("Comenzar")',
            '[onclick*="siguiente"]',
            '[onclick*="continuar"]'
        ];
        
        let botonEncontrado = false;
        for (const selector of selectoresPrimerPaso) {
            try {
                const boton = await this.page!.$(selector);
                if (boton && await boton.isVisible()) {
                    console.log(`🔄 Haciendo clic en botón: ${selector}`);
                    
                    await boton.scrollIntoViewIfNeeded();
                    await this.page!.waitForTimeout(500);
                    
                    const urlAntes = this.page!.url();
                    await boton.click();
                    await this.page!.waitForTimeout(3000);
                    
                    const urlDespues = this.page!.url();
                    
                    // Verificar si aparecieron campos reales
                    const camposReales = await this.page!.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
                    console.log(`   📝 Campos reales encontrados después del clic: ${camposReales.length}`);
                    
                    if (camposReales.length > 0 || urlAntes !== urlDespues) {
                        console.log(`✅ Navegación exitosa al primer paso real`);
                        console.log(`📍 Nueva URL: ${urlDespues}`);
                        botonEncontrado = true;
                        break;
                    } else {
                        console.log(`⚠️ No se encontraron campos reales después del clic`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, (error as Error).message);
                continue;
            }
        }
        
        if (!botonEncontrado) {
            console.log('ℹ️ No se encontró botón para navegar al primer paso, puede que ya estemos ahí');
            
            // Verificar si ya hay campos de formulario visibles
            const camposExistentes = await this.page!.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
            if (camposExistentes.length > 0) {
                console.log(`✅ Ya hay ${camposExistentes.length} campos reales disponibles`);
            } else {
                console.log('⚠️ No se encontraron campos reales en la página actual');
                
                // Hacer scroll adicional para activar contenido dinámico
                console.log('📜 Haciendo scroll adicional para activar contenido...');
                await this.page!.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await this.page!.waitForTimeout(3000);
                
                const camposPostScroll = await this.page!.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
                console.log(`📝 Campos encontrados después del scroll: ${camposPostScroll.length}`);
            }
        }
    }

    private async obtenerTituloPaso(): Promise<string> {
        try {
            const titulo = await this.page!.$eval('h1, h2, h3', el => el.textContent?.trim());
            return titulo || `Paso ${Date.now()}`;
        } catch {
            return `Paso ${Date.now()}`;
        }
    }

    private async expandirSeccionesAutomaticamente(): Promise<void> {
        const expandibles = await this.page!.$$('[data-toggle="collapse"], .accordion-toggle, .collapse-toggle');
        
        for (const elemento of expandibles.slice(0, 5)) {
            try {
                await elemento.click();
                await this.page!.waitForTimeout(500);
            } catch {
                continue;
            }
        }
    }

    private async navegarAlSiguientePaso(): Promise<boolean> {
        const selectores = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'button:has-text("CONTINUAR")',
            'button[type="submit"]:not([value*="Enviar"])'
        ];

        for (const selector of selectores) {
            try {
                const boton = await this.page!.$(selector);
                if (boton && await boton.isVisible()) {
                    await boton.click();
                    await this.page!.waitForTimeout(2000);
                    await this.manejarModalConfirmacion();
                    return true;
                }
            } catch {
                continue;
            }
        }

        return false;
    }

    private async manejarModalConfirmacion(): Promise<void> {
        try {
            await this.page!.waitForTimeout(1000);
            
            const botonConfirmar = await this.page!.$('button:has-text("Sí, estoy seguro"), button:has-text("Sí"), button:has-text("OK")');
            if (botonConfirmar && await botonConfirmar.isVisible()) {
                await botonConfirmar.click();
                await this.page!.waitForTimeout(1000);
            }
        } catch {
            // No hay modal
        }
    }

    private async finalizar(): Promise<void> {
        console.log('\n📊 Generando reporte final...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rutaReporte = path.join(__dirname, '../data', `mvp_hibrido_${timestamp}.json`);
        
        await fs.writeFile(rutaReporte, JSON.stringify(this.resultado, null, 2), 'utf-8');
        console.log(`✅ Reporte guardado en: ${rutaReporte}`);
    }

    private calcularEstadisticas(): void {
        const pasosCompletados = this.resultado.pasosCompletados || [];
        const tiempoTotal = this.resultado.tiempoTotal || 0;
        
        this.resultado.estadisticas.totalPasos = pasosCompletados.length;
        this.resultado.estadisticas.totalCampos = pasosCompletados.reduce(
            (total, paso) => total + paso.camposEncontrados, 0
        );
        this.resultado.estadisticas.camposCompletados = pasosCompletados.reduce(
            (total, paso) => total + paso.camposCompletados, 0
        );
        this.resultado.estadisticas.porcentajeExito = this.resultado.estadisticas.totalCampos > 0 
            ? Math.round((this.resultado.estadisticas.camposCompletados / this.resultado.estadisticas.totalCampos) * 100)
            : 0;
        this.resultado.estadisticas.velocidadCamposPorSegundo = tiempoTotal > 0
            ? Number((this.resultado.estadisticas.totalCampos / (tiempoTotal / 1000)).toFixed(2))
            : 0;
        this.resultado.estadisticas.tiempoPromedioPorPaso = this.resultado.estadisticas.totalPasos > 0
            ? Math.round(tiempoTotal / this.resultado.estadisticas.totalPasos)
            : 0;
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

/**
 * Realiza el login a CORFO
 */
async function realizarLogin(page: Page): Promise<void> {
    console.log('🔐 Iniciando login en CORFO...');
    
    // Navegar primero a la página de inicio para manejar avisos
    await page.goto('https://www.corfo.cl/sites/cpp/homecorfo#', {
        waitUntil: 'networkidle',
        timeout: 30000
    });

    // Cerrar aviso inicial si existe
    try {
        const avisoBtn = await page.waitForSelector('button:has-text("Cerrar mensaje e ingresar al sitio de CORFO")', {
            timeout: 7000,
            state: 'visible'
        });
        if (avisoBtn) {
            await avisoBtn.click();
            await page.waitForTimeout(1000);
        }
    } catch (error) {
        // No hay aviso inicial
    }

    // Navegar al enlace de "Ingreso usuario" donde debe estar la nueva interfaz
    console.log('🔍 Navegando a la página de login...');
    
    // Buscar y hacer clic en "Ingreso usuario"
    const ingresoUsuarioLink = await page.waitForSelector('a:has-text("Ingreso usuario")', { 
        timeout: 10000,
        state: 'visible'
    });
    
    if (!ingresoUsuarioLink) {
        throw new Error('No se pudo encontrar el enlace "Ingreso usuario"');
    }
    
    // Navegar al login
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        ingresoUsuarioLink.click()
    ]);
    
    console.log('🔍 URL después de navegar al login:', page.url());

    // Primera estrategia: Buscar el link "¿Tienes clave Corfo? Inicia sesión aquí"
    let loginButton = null;
    
    try {
        // Intentar encontrar el enlace específico para clave Corfo por ID
        loginButton = await page.waitForSelector('#mostrarCorfoLoginLink', { 
            timeout: 8000,
            state: 'visible'
        });
        
        if (loginButton) {
            console.log('Encontrado enlace "¿Tienes clave Corfo? Inicia sesión aquí"');
            
            // Hacer click en el enlace de clave Corfo (ejecuta JavaScript, no navega)
            await loginButton.click();
            
            // Esperar a que aparezca el formulario de login (el div se hace visible)
            console.log('Esperando a que aparezca el formulario de Clave Corfo...');
            await page.waitForSelector('#bloqueCorfoLogin', { 
                state: 'visible',
                timeout: 10000
            });
            
            console.log('Formulario de Clave Corfo ahora visible, procediendo con login...');
            
            // Llenar los campos directamente en la página actual (no hay iframe)
            const user = process.env.CORFO_USER!;
            const pass = process.env.CORFO_PASS!;

            await page.waitForSelector('#rut', { state: 'visible' });
            await page.waitForSelector('#pass', { state: 'visible' });

            // Llenar los campos
            await page.fill('#rut', user);
            await page.fill('#pass', pass);

            // Hacer clic en el botón de enviar
            await page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
            await page.click('#ingresa_');
            
            // Esperar a que el login se procese
            await page.waitForTimeout(3000);
            
            console.log('Login con Clave Corfo completado');
            return; // Salir de la función porque ya hicimos login
        }
    } catch (error) {
        console.log('No se encontró el enlace de Clave Corfo, usando interfaz tradicional con iframe...');
        
        // Si no está la nueva interfaz, debe ser la interfaz antigua con iframe
        // Los campos están en un iframe, procedemos con la lógica antigua
        const frames = await page.frames();
        const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
        
        if (loginFrame) {
            await loginFrame.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            await loginFrame.fill('#rut', process.env.CORFO_USER!);
            await loginFrame.fill('#pass', process.env.CORFO_PASS!);

            await loginFrame.click('#ingresa_');
            await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 });

            const volverButton = await page.waitForSelector('a:has-text("Volver al sitio Público")', { 
                state: 'visible',
                timeout: 10000
            });

            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle' }),
                volverButton.click()
            ]);
            
            console.log('Login con iframe completado');
            return;
        } else {
            throw new Error('No se encontró ni la nueva interfaz ni el iframe de login');
        }
    }

    // Si llegamos aquí, significa que hubo un error inesperado
    throw new Error('Error inesperado en el proceso de login');
}

/**
 * Implementa el flujo completo de análisis y autocompletado del formulario
 */
async function implementarFlujoCompleto(page: Page, configuracion: ConfiguracionMVP): Promise<ResultadoMVP> {
    console.log('🚀 INICIANDO FLUJO COMPLETO MVP HÍBRIDO');
    
    const inicioTiempo = Date.now();
    let totalCamposProcesados = 0;
    let totalCamposAutocompletados = 0;
    const pasosProcesados: any[] = [];

    try {
        // PASO 1: Realizar login
        console.log('🔐 Paso 1: Realizando login...');
        await realizarLogin(page);

        // PASO 2: Navegar al formulario real desde borradores
        console.log('📋 Paso 2: Navegando al formulario de postulación...');
        const formularioAccedido = await navegarAlFormularioReal(page);
        
        if (!formularioAccedido) {
            throw new Error('No se pudo acceder al formulario de postulación');
        }

        console.log('✅ Formulario accedido exitosamente');

        // PASO 3: Procesar todos los pasos del formulario
        console.log('🔄 Paso 3: Procesando pasos del formulario...');
        
        let pasoActual = 1;
        let hayMasPasos = true;
        const limitePasos = 15; // Según el análisis, hay 14 pasos

        while (hayMasPasos && pasoActual <= limitePasos) {
            console.log(`\n📋 Procesando Paso ${pasoActual}...`);
            
            // Obtener información del paso actual
            const nombrePaso = await obtenerNombrePaso(page);
            console.log(`   📝 Nombre del paso: "${nombrePaso}"`);

            // Hacer scroll para cargar todo el contenido
            await scrollCompletoPagina(page);

            // Extraer campos del paso actual
            const camposPaso = await extraerCamposPaso(page);
            console.log(`   🔍 Campos encontrados: ${camposPaso.length}`);

            totalCamposProcesados += camposPaso.length;

            // Autocompletar campos según configuración
            let camposCompletados = 0;
            if (configuracion.autocompletar && camposPaso.length > 0) {
                console.log(`   ✏️ Autocompletando ${camposPaso.length} campos...`);
                camposCompletados = await autocompletarCamposPaso(page, camposPaso, configuracion);
                totalCamposAutocompletados += camposCompletados;
                console.log(`   ✅ Campos autocompletados: ${camposCompletados}`);
            }

            // Guardar información del paso
            pasosProcesados.push({
                numero: pasoActual,
                nombre: nombrePaso,
                url: page.url(),
                camposEncontrados: camposPaso.length,
                camposAutocompletados: camposCompletados,
                campos: camposPaso.map(c => ({
                    tipo: c.tipo,
                    label: c.label,
                    nombre: c.nombre,
                    requerido: c.requerido,
                    autocompletado: camposCompletados > 0
                }))
            });

            // Intentar navegar al siguiente paso
            if (pasoActual < limitePasos) {
                console.log(`   ➡️ Navegando al siguiente paso...`);
                hayMasPasos = await navegarAlSiguientePaso(page);
                
                if (hayMasPasos) {
                    pasoActual++;
                    await page.waitForTimeout(2000); // Esperar que cargue el siguiente paso
                    console.log(`   ✅ Navegación exitosa al paso ${pasoActual}`);
                } else {
                    console.log(`   ℹ️ No hay más pasos disponibles o llegamos al final`);
                }
            } else {
                console.log(`   ℹ️ Límite de pasos alcanzado (${limitePasos})`);
                hayMasPasos = false;
            }
        }

        // Calcular tiempo total
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60; // en minutos

        const resultado: ResultadoMVP = {
            exito: true,
            mensaje: `MVP completado exitosamente en ${tiempoTotal.toFixed(1)} minutos`,
            tiempoEjecucion: tiempoTotal,
            estadisticas: {
                totalPasos: pasosProcesados.length,
                totalCampos: totalCamposProcesados,
                camposCompletados: totalCamposAutocompletados,
                porcentajeExito: totalCamposProcesados > 0 ? 
                    Math.round((totalCamposAutocompletados / totalCamposProcesados) * 100) : 0,
                velocidadCamposPorSegundo: tiempoTotal > 0 ? totalCamposProcesados / (tiempoTotal * 60) : 0,
                tiempoPromedioPorPaso: pasosProcesados.length > 0 ? tiempoTotal / pasosProcesados.length : 0,
                pasosProcesados: pasosProcesados.length,
                camposAutocompletados: totalCamposAutocompletados,
                porcentajeCompletado: totalCamposProcesados > 0 ? 
                    Math.round((totalCamposAutocompletados / totalCamposProcesados) * 100) : 0
            },
            pasos: pasosProcesados
        };

        console.log('\n✅ FLUJO COMPLETO FINALIZADO');
        console.log(`📊 Resumen:`);
        console.log(`   • Pasos procesados: ${resultado.estadisticas.pasosProcesados}`);
        console.log(`   • Total campos: ${resultado.estadisticas.totalCampos}`);
        console.log(`   • Campos autocompletados: ${resultado.estadisticas.camposAutocompletados}`);
        console.log(`   • Porcentaje completado: ${resultado.estadisticas.porcentajeCompletado}%`);
        console.log(`   • Tiempo total: ${resultado.tiempoEjecucion.toFixed(1)} minutos`);

        return resultado;

    } catch (error) {
        console.error('❌ Error en flujo completo:', (error as Error).message);
        
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60;
        
        return {
            exito: false,
            mensaje: `Error: ${(error as Error).message}`,
            tiempoEjecucion: tiempoTotal,
            estadisticas: {
                totalPasos: pasosProcesados.length,
                totalCampos: totalCamposProcesados,
                camposCompletados: totalCamposAutocompletados,
                porcentajeExito: 0,
                velocidadCamposPorSegundo: 0,
                tiempoPromedioPorPaso: 0,
                pasosProcesados: pasosProcesados.length,
                camposAutocompletados: totalCamposAutocompletados,
                porcentajeCompletado: 0
            },
            pasos: pasosProcesados
        };
    }
}

/**
 * Navega desde la página de borradores al formulario real de postulación
 */
async function navegarAlFormularioReal(page: Page): Promise<boolean> {
    console.log('🔍 Navegando al formulario real de postulación...');
    
    try {
        // PASO 1: Navegar a la página de convocatorias
        console.log('   📄 Navegando a convocatorias...');
        await page.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        
        await page.waitForTimeout(3000);
        
        // PASO 2: Buscar y hacer clic en el primer "Más Información"
        console.log('   🔍 Buscando primer formulario...');
        const primerMasInfoLink = await buscarPrimerMasInformacion(page);
        
        if (!primerMasInfoLink) {
            throw new Error('No se encontró enlace "Más Información"');
        }

        // PASO 3: Navegar a la página de detalles
        const href = await primerMasInfoLink.getAttribute('href');
        const urlCompleta = href?.startsWith('http') ? href : `https://www.corfo.cl${href}`;
        
        console.log(`   ➡️ Navegando a: ${urlCompleta}`);
        await page.goto(urlCompleta, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // PASO 4: Buscar y hacer clic en "Inicia tu postulación"
        console.log('   🎯 Buscando botón "Inicia tu postulación"...');
        const botonIniciar = await buscarBotonIniciarPostulacion(page);
        
        if (!botonIniciar) {
            throw new Error('No se encontró botón "Inicia tu postulación"');
        }

        console.log('   🖱️ Haciendo clic en "Inicia tu postulación"...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
            botonIniciar.click()
        ]);
        
        await page.waitForTimeout(3000);

        // PASO 5: Manejar página de borradores y crear nueva postulación
        console.log('   📋 Manejando página de borradores...');
        const nuevaPostulacionCreada = await crearNuevaPostulacion(page);
        
        if (!nuevaPostulacionCreada) {
            throw new Error('No se pudo crear nueva postulación');
        }

        // PASO 6: Verificar que estamos en el formulario real
        console.log('   ✅ Verificando acceso al formulario...');
        const enFormulario = await verificarAccesoFormulario(page);
        
        if (!enFormulario) {
            throw new Error('No se pudo verificar acceso al formulario');
        }

        console.log('✅ Formulario real accedido exitosamente');
        return true;

    } catch (error) {
        console.error(`❌ Error navegando al formulario: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Busca el primer enlace "Más Información" con scroll inteligente
 */
async function buscarPrimerMasInformacion(page: Page): Promise<any> {
    // Hacer scroll para cargar contenido dinámico
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
    
    await page.waitForTimeout(3000);
    
    // Buscar con múltiples selectores
    const selectores = [
        'div.foot-caja_result a',
        'a:has-text("Más información")',
        'a:has-text("Más Información")',
        'a[href*="DetalleProgramaConvocatoria"]'
    ];
    
    for (const selector of selectores) {
        const elemento = await page.$(selector);
        if (elemento) {
            console.log(`   ✅ Enlace encontrado: ${selector}`);
            return elemento;
        }
    }
    
    return null;
}

/**
 * Busca el botón "Inicia tu postulación"
 */
async function buscarBotonIniciarPostulacion(page: Page): Promise<any> {
    const selectores = [
        'a:has-text("Inicia tu postulación")',
        'a:has-text("INICIA TU POSTULACIÓN")',
        'button:has-text("Inicia tu postulación")',
        'button:has-text("INICIA TU POSTULACIÓN")',
        '[onclick*="postulacion"]',
        '[href*="postulacion"]'
    ];
    
    for (const selector of selectores) {
        const elemento = await page.$(selector);
        if (elemento) {
            console.log(`   ✅ Botón encontrado: ${selector}`);
            return elemento;
        }
    }
    
    return null;
}

/**
 * Crea una nueva postulación desde la página de borradores
 */
async function crearNuevaPostulacion(page: Page): Promise<boolean> {
    try {
        console.log('   🔍 Verificando página de borradores...');
        
        // Verificar si estamos en la página de borradores
        if (page.url().includes('PostuladorBorradores.aspx')) {
            console.log('   📋 En página de borradores, buscando postulaciones previas...');
            
            // Buscar el botón "Nueva Postulación"
            console.log('   ➕ Buscando botón "Nueva Postulación"...');
            const selectoresNueva = [
                'button:has-text("Nueva Postulación")',
                'button:has-text("NUEVA POSTULACIÓN")',
                'a:has-text("Nueva Postulación")',
                'a:has-text("NUEVA POSTULACIÓN")',
                'input[value*="Nueva"]',
                '.btn:has-text("Nueva")',
                '[onclick*="nueva"]'
            ];
            
            let botonNueva = null;
            for (const selector of selectoresNueva) {
                botonNueva = await page.$(selector);
                if (botonNueva) {
                    console.log(`   ✅ Botón "Nueva Postulación" encontrado: ${selector}`);
                    break;
                }
            }
            
            if (botonNueva) {
                console.log('   🖱️ Haciendo clic en "Nueva Postulación"...');
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    botonNueva.click()
                ]);
                
                await page.waitForTimeout(3000);
                console.log('   ✅ Nueva postulación creada');
                return true;
            } else {
                console.log('   ⚠️ No se encontró botón "Nueva Postulación"');
                return false;
            }
        } else {
            console.log('   ℹ️ No estamos en página de borradores, continuando...');
            return true;
        }
        
    } catch (error) {
        console.error(`   ❌ Error creando nueva postulación: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Elimina postulaciones existentes si las hay
 */
async function eliminarPostulacionesExistentes(page: Page): Promise<void> {
    try {
        console.log('   🗑️ Buscando postulaciones previas para eliminar...');
        
        const selectoresPapelera = [
            '.ico_sm_papelera',
            '.delPostulacion',
            'span.ico_sm_papelera',
            'a[data-original-title*="Desistir"]',
            'span.delPostulacion'
        ];
        
        let iconoPapelera = null;
        for (const selector of selectoresPapelera) {
            iconoPapelera = await page.$(selector);
            if (iconoPapelera) {
                console.log(`   🗑️ Postulación previa encontrada: ${selector}`);
                break;
            }
        }
        
        if (iconoPapelera) {
            console.log('   🖱️ Eliminando postulación previa...');
            await iconoPapelera.click();
            await page.waitForTimeout(2000);
            
            // Confirmar eliminación
            const botonesConfirmar = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                '.btn-danger',
                '.btn-primary:has-text("Sí")'
            ];
            
            for (const selector of botonesConfirmar) {
                const botonConfirmar = await page.$(selector);
                if (botonConfirmar) {
                    await botonConfirmar.click();
                    await page.waitForTimeout(2000);
                    console.log('   ✅ Postulación previa eliminada');
                    break;
                }
            }
        } else {
            console.log('   ℹ️ No hay postulaciones previas para eliminar');
        }
        
    } catch (error) {
        console.log(`   ⚠️ Error eliminando postulaciones: ${(error as Error).message}`);
    }
}

/**
 * Verifica que tenemos acceso al formulario real
 */
async function verificarAccesoFormulario(page: Page): Promise<boolean> {
    try {
        console.log('   🔍 Verificando campos de formulario...');
        
        // Esperar un poco para que la página cargue
        await page.waitForTimeout(3000);
        
        // Buscar campos de formulario
        const campos = await page.$$('input, select, textarea');
        console.log(`   📝 Campos encontrados: ${campos.length}`);
        
        if (campos.length > 0) {
            // Verificar que no son solo campos de búsqueda/navegación
            const camposRelevantes = await page.$$eval('input, select, textarea', (elements) => {
                return elements.filter(el => {
                    const element = el as HTMLInputElement;
                    return element.type !== 'hidden' && 
                           !element.className.includes('search') &&
                           !element.name?.includes('search');
                }).length;
            });
            
            console.log(`   ✅ Campos relevantes: ${camposRelevantes}`);
            return camposRelevantes > 0;
        }
        
        return false;
        
    } catch (error) {
        console.error(`   ❌ Error verificando formulario: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Obtiene el nombre del paso actual
 */
async function obtenerNombrePaso(page: Page): Promise<string> {
    try {
        const selectoresNombre = [
            'h1', 'h2', 'h3',
            '.step-title', '.phase-title', '.section-title',
            '.paso-actual', '.current-step',
            '[class*="titulo"]', '[class*="title"]'
        ];
        
        for (const selector of selectoresNombre) {
            const elemento = await page.$(selector);
            if (elemento) {
                const texto = await elemento.textContent();
                if (texto && texto.trim().length > 0 && texto.trim().length < 100) {
                    return texto.trim();
                }
            }
        }
        
        // Fallback: usar título de la página
        const titulo = await page.title();
        return titulo || `Paso ${Date.now()}`;
        
    } catch (error) {
        return `Paso ${Date.now()}`;
    }
}

/**
 * Hace scroll completo de la página para cargar todo el contenido
 */
async function scrollCompletoPagina(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    window.scrollTo(0, 0); // Volver al inicio
                    setTimeout(resolve, 1000);
                }
            }, 100);
        });
    });
}

/**
 * Extrae campos del paso actual
 */
async function extraerCamposPaso(page: Page): Promise<CampoFormulario[]> {
    try {
        const campos = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                
                // Verificar visibilidad
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 rect.width > 0 && rect.height > 0 &&
                                 parseFloat(style.opacity) > 0;
                
                if (!isVisible || element.type === 'hidden') return null;
                
                // Buscar etiqueta
                let label = '';
                
                // Por ID
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl) label = labelEl.textContent?.trim() || '';
                }
                
                // Por padre
                if (!label) {
                    const parentLabel = element.closest('label');
                    if (parentLabel) {
                        label = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                    }
                }
                
                // Por hermano anterior
                if (!label) {
                    let previous = element.previousElementSibling;
                    let attempts = 0;
                    while (previous && !label && attempts < 3) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 200) {
                            label = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }
                
                // Por placeholder
                if (!label && 'placeholder' in element) {
                    label = (element as HTMLInputElement).placeholder || '';
                }
                
                // Determinar tipo
                let tipo = element.tagName.toLowerCase();
                if (tipo === 'input') {
                    tipo = (element as HTMLInputElement).type || 'text';
                }
                
                // Opciones para selects
                let opciones: string[] = [];
                if (element.tagName.toLowerCase() === 'select') {
                    const selectEl = element as HTMLSelectElement;
                    opciones = Array.from(selectEl.options).map(option => option.text);
                }
                
                // Determinar si es requerido
                const required = element.hasAttribute('required') || 
                               element.getAttribute('aria-required') === 'true' ||
                               element.classList.contains('required') ||
                               (label.includes('*') || label.includes('obligatorio'));
                
                return {
                    tipo,
                    label: label || `Campo ${element.tagName} sin etiqueta`,
                    nombre: element.name || element.id || `campo_${Date.now()}_${Math.random()}`,
                    requerido: required,
                    opciones: opciones.length > 0 ? opciones : undefined
                };
            }).filter(item => item !== null);
        });
        
        return campos as CampoFormulario[];
        
    } catch (error) {
        console.error('Error extrayendo campos:', error);
        return [];
    }
}

/**
 * Autocompleta los campos de un paso
 */
/**
 * Obtiene el valor apropiado para un campo basado en su tipo y etiqueta
 */
function obtenerValorParaCampo(campo: CampoFormulario): string | null {
    const label = campo.label?.toLowerCase() || '';
    const tipo = campo.tipo?.toLowerCase() || '';
    
    // Mapeo específico basado en la etiqueta
    if (label.includes('título') && label.includes('proyecto')) {
        return CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
    } else if (label.includes('resumen') && label.includes('proyecto')) {
        return CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
    } else if (label.includes('objetivo') && label.includes('general')) {
        return CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
    } else if (label.includes('rut')) {
        return CAMPOS_CORFO_MAPPING.RUT;
    } else if (label.includes('teléfono') || label.includes('telefono')) {
        return CAMPOS_CORFO_MAPPING.TELEFONO;
    } else if (label.includes('mail') || label.includes('email') || label.includes('correo')) {
        return CAMPOS_CORFO_MAPPING.EMAIL;
    } else if (label.includes('duración') && label.includes('mes')) {
        return CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
    } else if (label.includes('costo') || label.includes('monto')) {
        return CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
    } else if (label.includes('empleos') || label.includes('empleo')) {
        return CAMPOS_CORFO_MAPPING.NUMERO;
    } else if (label.includes('renta') || label.includes('salario')) {
        return CAMPOS_CORFO_MAPPING.MONEDA;
    }
    
    // Mapeo por tipo de campo
    switch (tipo) {
        case 'textarea':
            return CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
        case 'text':
            if (label.includes('nombre')) return CAMPOS_CORFO_MAPPING.NOMBRE;
            if (label.includes('apellido')) return CAMPOS_CORFO_MAPPING.APELLIDO_PATERNO;
            return CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
        case 'email':
            return CAMPOS_CORFO_MAPPING.EMAIL;
        case 'tel':
            return CAMPOS_CORFO_MAPPING.TELEFONO;
        case 'number':
            return CAMPOS_CORFO_MAPPING.NUMERO;
        case 'date':
            return CAMPOS_CORFO_MAPPING.FECHA;
        case 'select':
            return null; // Se maneja en completarCampo seleccionando primera opción
        case 'radio':
        case 'checkbox':
            return 'true'; // Se convertirá a check
        default:
            return CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
    }
}

async function autocompletarCamposPaso(
    page: Page, 
    campos: CampoFormulario[], 
    configuracion: ConfiguracionMVP
): Promise<number> {
    let camposCompletados = 0;
    
    for (const campo of campos) {
        try {
            if (configuracion.soloObligatorios && !campo.requerido) {
                continue; // Saltar campos opcionales si está configurado
            }
            
            const valor = obtenerValorParaCampo(campo);
            if (valor !== null) {
                const completado = await completarCampo(page, campo, valor);
                if (completado) {
                    camposCompletados++;
                }
            }
            
        } catch (error) {
            console.log(`   ⚠️ Error completando campo ${campo.label}: ${(error as Error).message}`);
        }
    }
    
    return camposCompletados;
}

/**
 * Completa un campo específico
 */
async function completarCampo(page: Page, campo: CampoFormulario, valor: any): Promise<boolean> {
    try {
        const selectores = [
            `[name="${campo.nombre}"]`,
            `#${campo.nombre}`,
            `[id="${campo.nombre}"]`
        ];
        
        let elemento = null;
        for (const selector of selectores) {
            elemento = await page.$(selector);
            if (elemento) break;
        }
        
        if (!elemento) return false;
        
        const tipoElemento = await elemento.evaluate(el => el.tagName.toLowerCase());
        
        if (tipoElemento === 'select') {
            // Para selects, elegir primera opción válida o por texto
            if (typeof valor === 'string' && campo.opciones) {
                const opcionCoincidente = campo.opciones.find(opt => 
                    opt.toLowerCase().includes(valor.toLowerCase()) ||
                    valor.toLowerCase().includes(opt.toLowerCase())
                );
                if (opcionCoincidente) {
                    await elemento.selectOption({ label: opcionCoincidente });
                } else {
                    await elemento.selectOption({ index: 1 }); // Primera opción válida
                }
            } else {
                await elemento.selectOption({ index: 1 });
            }
        } else if (tipoElemento === 'input') {
            const tipoInput = await elemento.evaluate(el => (el as HTMLInputElement).type);
            
            if (tipoInput === 'radio') {
                await elemento.check();
            } else if (tipoInput === 'checkbox') {
                await elemento.check();
            } else {
                await elemento.fill(String(valor));
            }
        } else if (tipoElemento === 'textarea') {
            await elemento.fill(String(valor));
        }
        
        await page.waitForTimeout(100); // Pequeña pausa entre campos
        return true;
        
    } catch (error) {
        return false;
    }
}

/**
 * Navega al siguiente paso del formulario
 */
async function navegarAlSiguientePaso(page: Page): Promise<boolean> {
    try {
        const selectoresSiguiente = [
            'button:has-text("SIGUIENTE")', 
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]', 
            'input[value*="IGUIENTE"]',
            'button:has-text("CONTINUAR")', 
            'button:has-text("Continuar")',
            'a:has-text("Siguiente")',
            '.btn-next', 
            '[class*="next"]',
            'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])'
        ];
        
        for (const selector of selectoresSiguiente) {
            const boton = await page.$(selector);
            if (boton) {
                const texto = await boton.textContent() || '';
                const value = await boton.getAttribute('value') || '';
                
                // Evitar botones de envío final
                if (texto.toLowerCase().includes('enviar') || 
                    value.toLowerCase().includes('enviar') ||
                    texto.toLowerCase().includes('finalizar')) {
                    continue;
                }
                
                console.log(`     🖱️ Haciendo clic en: "${texto || value}"`);
                
                try {
                    // Hacer clic y esperar
                    await boton.click();
                    await page.waitForTimeout(2000);
                    
                    // Verificar si aparece modal de confirmación
                    const modalManejado = await manejarModalConfirmacion(page);
                    if (modalManejado) {
                        await page.waitForTimeout(2000);
                    }
                    
                    console.log(`     ✅ Navegación exitosa`);
                    return true;
                    
                } catch (error) {
                    console.log(`     ⚠️ Error en navegación: ${(error as Error).message}`);
                    return false;
                }
            }
        }
        
        console.log('     ℹ️ No se encontró botón para siguiente paso');
        return false;
        
    } catch (error) {
        console.log(`     ❌ Error navegando: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Maneja modal de confirmación
 */
async function manejarModalConfirmacion(page: Page): Promise<boolean> {
    try {
        await page.waitForTimeout(1000);
        
        // Buscar botones de confirmación
        const selectoresConfirmar = [
            'button:has-text("Sí, estoy seguro")',
            'button:has-text("Sí")',
            'button:has-text("OK")',
            'button:has-text("Aceptar")',
            'button:has-text("Continuar")',
            '.btn-primary:has-text("Sí")'
        ];
        
        for (const selector of selectoresConfirmar) {
            const boton = await page.$(selector);
            if (boton && await boton.isVisible()) {
                console.log(`     ✅ Confirmando modal: ${selector}`);
                await boton.click();
                await page.waitForTimeout(2000);
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        return false;
    }
}

export async function ejecutarMVPHibrido(configuracionNombre: string = 'demo'): Promise<ResultadoMVP> {
    console.log('🎯 INICIANDO MVP HÍBRIDO CORFO');
    console.log('============================');
    
    const configuracion = obtenerConfiguracion(configuracionNombre as any);
    const mvp = new MVPHibrido(configuracion);
    
    const resultado = await mvp.ejecutar();
    
    console.log('\n📈 RESUMEN FINAL');
    console.log('================');
    console.log(`⏱️ Tiempo total: ${((resultado.tiempoTotal || resultado.tiempoEjecucion * 1000) / 1000 / 60).toFixed(1)} minutos`);
    console.log(`📊 Pasos completados: ${resultado.estadisticas.totalPasos}`);
    console.log(`📝 Campos encontrados: ${resultado.estadisticas.totalCampos}`);
    console.log(`✅ Campos completados: ${resultado.estadisticas.camposCompletados}`);
    console.log(`🎯 Porcentaje de éxito: ${resultado.estadisticas.porcentajeExito}%`);
    console.log(`⚡ Velocidad: ${resultado.estadisticas.velocidadCamposPorSegundo} campos/segundo`);
    
    if (resultado.errores && resultado.errores.length > 0) {
        console.log(`❌ Errores encontrados: ${resultado.errores.length}`);
        resultado.errores.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    return resultado;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const configuracion = args[0] || 'demo';
    
    ejecutarMVPHibrido(configuracion)
        .then((resultado) => {
            if (resultado.exito) {
                console.log('\n🎉 MVP HÍBRIDO COMPLETADO EXITOSAMENTE');
                process.exit(0);
            } else {
                console.log('\n❌ MVP HÍBRIDO FALLÓ');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Error fatal en MVP híbrido:', error);
            process.exit(1);
        });
} 
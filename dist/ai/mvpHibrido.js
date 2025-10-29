"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MVPHibrido = exports.DetectorEstructura = void 0;
exports.ejecutarMVPHibrido = ejecutarMVPHibrido;
const playwright_1 = require("playwright");
const configuraciones_1 = require("./configuraciones");
const extraerFormularios_1 = require("../scraping/extraerFormularios");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
/**
 * Clase para detectar automáticamente la estructura del formulario
 */
class DetectorEstructura {
    constructor(page) {
        this.page = page;
    }
    async detectarEstructuraCompleta() {
        const url = this.page.url();
        let estructura = {
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
        //  DETECCIÓN POR SLICK-SLIDER (CORFO)
        const deteccionSlick = await this.detectarPorSlickSlider();
        if (deteccionSlick.confianza && deteccionSlick.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionSlick };
        }
        // Detectar tipos especiales de página
        estructura.esPaginaConfirmacion = await this.esPaginaConfirmacion();
        estructura.esPaginaBorradores = await this.esPaginaBorradores();
        //  NUEVO: Detectar si es paso de introducción
        const esPasoIntroduccion = await this.esPasoIntroduccion();
        if (esPasoIntroduccion) {
            console.log('   📋 Paso de introducción detectado');
        }
        //  NUEVO: Detectar desplegables
        estructura.desplegables = await this.detectarDesplegables();
        console.log(`📊 ESTRUCTURA DETECTADA:`);
        console.log(`   📈 Método: ${estructura.tipoDeteccion} (${estructura.confianza}% confianza)`);
        console.log(`   📋 Total pasos: ${estructura.totalPasos}`);
        console.log(`   📍 Paso actual: ${estructura.pasoActual}`);
        console.log(`    Es confirmación: ${estructura.esPaginaConfirmacion}`);
        console.log(`   📁 Es borradores: ${estructura.esPaginaBorradores}`);
        console.log(`   📂 Desplegables encontrados: ${estructura.desplegables?.length || 0}`);
        return estructura;
    }
    async detectarPorSlickSlider() {
        try {
            console.log('🔍 Detectando estructura por Slick Slider...');
            const resultado = await this.page.evaluate(() => {
                // DETECCIÓN ESPECÍFICA PARA SLICK-SLIDER (CORFO)
                const slickSliders = document.querySelectorAll('.slick-slider, .carousel.slick-initialized');
                for (const slider of Array.from(slickSliders)) {
                    // Buscar todos los elementos li con data-slick-index
                    const pasosSlick = slider.querySelectorAll('li[data-slick-index]');
                    if (pasosSlick.length > 0) {
                        // Contar todos los pasos (visibles y ocultos)
                        const totalPasos = pasosSlick.length;
                        // Detectar paso actual (elemento sin aria-hidden="true" o con clase active)
                        let pasoActual = 1;
                        for (let i = 0; i < pasosSlick.length; i++) {
                            const elemento = pasosSlick[i];
                            const ariaHidden = elemento.getAttribute('aria-hidden');
                            // Si no está oculto o tiene clase active, es el paso actual
                            if (ariaHidden !== 'true' ||
                                elemento.classList.contains('active') ||
                                elemento.classList.contains('current') ||
                                elemento.classList.contains('slick-current')) {
                                pasoActual = i + 1;
                                break;
                            }
                        }
                        // Extraer títulos de los pasos
                        const titulosPasos = Array.from(pasosSlick).map((paso, index) => {
                            const texto = paso.textContent?.trim() || '';
                            const id = paso.id || '';
                            if (texto.length > 0) {
                                return texto;
                            }
                            else if (id.includes('Paso') || id.includes('BotonPaso')) {
                                return `Paso ${index + 1}`;
                            }
                            else {
                                return `Paso ${index + 1}`;
                            }
                        });
                        return {
                            totalPasos: totalPasos,
                            pasoActual: pasoActual,
                            titulosPasos: titulosPasos,
                            tieneBarraProgreso: true,
                            esSlickSlider: true
                        };
                    }
                }
                return null;
            });
            if (resultado) {
                console.log(`   ✅ Slick Slider detectado: ${resultado.totalPasos} pasos`);
                console.log(`   📍 Paso actual: ${resultado.pasoActual}`);
                return {
                    ...resultado,
                    tipoDeteccion: 'barra_progreso',
                    confianza: 95
                };
            }
            else {
                console.log('   ⚠️ No se encontró Slick Slider');
            }
        }
        catch (error) {
            console.log('   ⚠️ Error en detección de Slick Slider:', error.message);
        }
        return { confianza: 0 };
    }
    async esPaginaConfirmacion() {
        return await this.page.evaluate(() => {
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            const url = window.location.href.toLowerCase();
            // 🔴 MEJORA: Contar solo campos EDITABLES (no readonly, no disabled)
            const camposEditables = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(campo => {
                const element = campo;
                // Select no tiene readOnly, solo verificar disabled
                const isReadOnly = element.readOnly || element.hasAttribute('readonly');
                return !isReadOnly && !element.disabled;
            });
            const tieneInputsEditables = camposEditables.length;
            // Si hay inputs editables, NO puede ser página de confirmación
            if (tieneInputsEditables > 0) {
                return false;
            }
            // Verificar contadores específicos
            const tieneContadoresCampos = textoCompleto.includes('campos obligatorios correctos') &&
                textoCompleto.includes('campos obligatorios incorrectos');
            // Si no tiene contadores, NO es confirmación
            if (!tieneContadoresCampos) {
                return false;
            }
            // Verificar que NO estamos en un formulario de pasos
            const tieneDesplegables = document.querySelectorAll('a[class*="collapsed"], a[class*="collapse"], a[data-toggle="collapse"]').length;
            if (tieneDesplegables > 0) {
                return false; // Si hay desplegables, es un formulario de pasos, no confirmación
            }
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
                url.includes('final') ||
                url.includes('review');
            // Verificar si hay botones de envío final
            const botonesEnvio = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
            const tieneBotonEnvio = Array.from(botonesEnvio).some(boton => {
                const texto = boton.textContent?.toLowerCase() || '';
                const value = boton.value?.toLowerCase() || '';
                return texto.includes('enviar') || texto.includes('finalizar') ||
                    value.includes('enviar') || value.includes('finalizar');
            });
            // Solo considerar confirmación si:
            // 1. URL específica de confirmación O
            // 2. Tiene texto específico de confirmación O
            // 3. Tiene contadores Y no tiene inputs editables Y tiene botón de envío
            const tieneTextoConfirmacion = indicadoresConfirmacion.some(indicador => textoCompleto.includes(indicador));
            return urlEsConfirmacion || tieneTextoConfirmacion || (tieneContadoresCampos && tieneInputsEditables === 0 && tieneBotonEnvio);
        });
    }
    async esPasoIntroduccion() {
        return await this.page.evaluate(() => {
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            // Indicadores específicos de pasos de introducción
            const indicadoresIntroduccion = [
                'introducción',
                'guía de postulación',
                'acepta condiciones',
                'autoriza notificaciones',
                'documentos de la convocatoria',
                'recomendaciones generales',
                'confirmación correo electrónico'
            ];
            // Verificar si tiene indicadores de introducción
            const tieneIndicadores = indicadoresIntroduccion.some(ind => textoCompleto.includes(ind));
            // Verificar si tiene radio buttons típicos de introducción
            const tieneRadioButtons = document.querySelectorAll('input[type="radio"]').length > 0;
            const tieneTextoSiNo = textoCompleto.includes('sí') || textoCompleto.includes('no');
            // Verificar si tiene campo de email (típico en pasos de introducción)
            const tieneCampoEmail = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]').length > 0;
            return tieneIndicadores || (tieneRadioButtons && tieneTextoSiNo) || tieneCampoEmail;
        });
    }
    async esPaginaBorradores() {
        return await this.page.evaluate(() => {
            const url = window.location.href;
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            // Verificar URL - PRINCIPAL INDICADOR
            const urlEsBorradores = url.includes('Borradores') ||
                url.includes('borradores') ||
                url.includes('PostuladorBorradores');
            // Si la URL indica borradores, es definitivamente página de borradores
            if (urlEsBorradores) {
                return true;
            }
            // Si la URL indica que estamos en el formulario real, NO es borradores
            if (url.includes('Postulador.aspx') && !url.includes('Borradores')) {
                return false;
            }
            // Verificar texto específico de borradores (más restrictivo)
            const tieneTextoBorradores = textoCompleto.includes('borradores de postulación') ||
                textoCompleto.includes('mis borradores') ||
                textoCompleto.includes('postulaciones guardadas');
            // Verificar botón "Nueva Postulación" - solo si está claramente en contexto de borradores
            const botonesNuevaPostulacion = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
            const tieneBotonNuevaPostulacion = Array.from(botonesNuevaPostulacion).some(boton => {
                const texto = boton.textContent?.toLowerCase() || '';
                const value = boton.value?.toLowerCase() || '';
                return (texto.includes('nueva postulación') || texto.includes('nueva postulacion') ||
                    value.includes('nueva postulación') || value.includes('nueva postulacion')) &&
                    // Solo considerar si hay contexto de borradores
                    (textoCompleto.includes('borradores') || textoCompleto.includes('guardadas'));
            });
            // Verificar tabla de borradores con indicadores más específicos
            const tieneTablaBorradores = !!document.querySelector('table') &&
                (textoCompleto.includes('identificador') ||
                    textoCompleto.includes('fecha inicio') ||
                    textoCompleto.includes('estado')) &&
                (textoCompleto.includes('borradores') ||
                    textoCompleto.includes('guardadas') ||
                    textoCompleto.includes('postulaciones'));
            return tieneTextoBorradores || tieneBotonNuevaPostulacion || tieneTablaBorradores;
        });
    }
    //  NUEVO: Detectar desplegables en el formulario - VERSIÓN FINAL (SOLO VISIBLES EN PASO ACTUAL)
    async detectarDesplegables() {
        console.log('🔍 Detectando desplegables (solo visibles en paso actual)...');
        try {
            const desplegables = await this.page.evaluate(() => {
                const desplegables = [];
                // Buscar TODOS los elementos que podrían ser desplegables
                const todosLosHeaders = document.querySelectorAll('a[class*="collapsed"], a[class*="collapse"], a[data-toggle="collapse"]');
                // Filtrar solo desplegables de PRIMER NIVEL (no anidados)
                const desplegablesPrimerNivel = Array.from(todosLosHeaders).filter(header => {
                    // Verificar que no esté dentro de otro desplegable
                    const parentDesplegable = header.closest('[class*="collapse"]:not(a)');
                    return !parentDesplegable;
                });
                // Filtrar solo desplegables VISIBLES en el paso actual
                const desplegablesVisibles = desplegablesPrimerNivel.filter(header => {
                    const text = header.textContent?.trim() || '';
                    const rect = header.getBoundingClientRect();
                    // Solo incluir desplegables que están en el área visible del paso actual
                    const isVisible = rect.top >= 0 && rect.top <= window.innerHeight;
                    return text &&
                        text.length > 5 &&
                        text.length < 100 &&
                        isVisible && // Solo desplegables visibles en el viewport
                        !text.includes('Siguiente') &&
                        !text.includes('Anterior') &&
                        !text.includes('Atrás') &&
                        !text.includes('Continuar') &&
                        !text.includes('Enviar') &&
                        !text.includes('Guardar') &&
                        !text.includes('Cerrar') &&
                        !text.includes('Cancelar') &&
                        !text.includes('Aceptar') &&
                        !text.includes('OK') &&
                        !text.includes('Sí') &&
                        !text.includes('No') &&
                        !text.match(/^\d+$/) && // No números solos
                        !text.match(/^[A-Z\s]+$/) && // No texto en mayúsculas (probablemente navegación)
                        !text.includes('PASO') &&
                        !text.includes('STEP') &&
                        !text.includes('PÁGINA') &&
                        !text.includes('PAGE');
                });
                console.log(`📊 Total desplegables encontrados: ${todosLosHeaders.length}`);
                console.log(`📊 Desplegables de primer nivel: ${desplegablesPrimerNivel.length}`);
                console.log(`📊 Desplegables visibles en paso actual: ${desplegablesVisibles.length}`);
                desplegablesVisibles.forEach(header => {
                    const text = header.textContent ? header.textContent.trim() : '';
                    // Verificar que realmente es un desplegable de contenido
                    const targetId = header.getAttribute('href') || header.getAttribute('data-target');
                    const contentDiv = targetId ? document.querySelector(targetId) : null;
                    // Solo incluir si tiene contenido asociado
                    if (contentDiv) {
                        // Contar sub-desplegables dentro del contenido
                        let subDesplegables = 0;
                        const subHeaders = contentDiv.querySelectorAll('a[class*="collapsed"], a[class*="collapse"], a[data-toggle="collapse"]');
                        subDesplegables = subHeaders.length;
                        desplegables.push({
                            titulo: text,
                            isOpen: !header.classList.contains('collapsed'),
                            hasSubDesplegables: subDesplegables > 0,
                            subDesplegablesCount: subDesplegables,
                            selector: targetId || '',
                            contenido: contentDiv.textContent?.substring(0, 200) || ''
                        });
                    }
                });
                return desplegables;
            });
            console.log(`   ✅ Desplegables detectados: ${desplegables.length}`);
            desplegables.forEach((d) => {
                console.log(`     📂 "${d.titulo}" - ${d.isOpen ? 'Abierto' : 'Cerrado'} - Sub-desplegables: ${d.subDesplegablesCount}`);
            });
            return desplegables;
        }
        catch (error) {
            console.log('   ⚠️ Error detectando desplegables:', error.message);
            return [];
        }
    }
    //  NUEVO: Validar completitud del paso actual
    async validarCompletitudPaso() {
        console.log('✅ Validando completitud del paso actual...');
        try {
            const validacion = await this.page.evaluate(() => {
                // Buscar todos los campos de entrada
                const campos = document.querySelectorAll('input, select, textarea');
                let camposObligatorios = 0;
                let camposCompletados = 0;
                let camposConError = 0;
                campos.forEach(campo => {
                    const element = campo;
                    // Verificar si es obligatorio
                    const esObligatorio = element.hasAttribute('required') ||
                        element.getAttribute('aria-required') === 'true' ||
                        element.classList.contains('required') ||
                        element.classList.contains('mandatory') ||
                        element.classList.contains('obligatorio');
                    if (esObligatorio) {
                        camposObligatorios++;
                        // Verificar si está completado
                        const tieneValor = element.value && element.value.trim() !== '';
                        if (tieneValor) {
                            camposCompletados++;
                        }
                        // Verificar si tiene error
                        const tieneError = element.classList.contains('error') ||
                            element.classList.contains('invalid') ||
                            element.getAttribute('aria-invalid') === 'true';
                        if (tieneError) {
                            camposConError++;
                        }
                    }
                });
                return {
                    camposObligatorios,
                    camposCompletados,
                    camposConError,
                    porcentajeCompletado: camposObligatorios > 0 ? Math.round((camposCompletados / camposObligatorios) * 100) : 100
                };
            });
            console.log(`   📊 Campos obligatorios: ${validacion.camposObligatorios}`);
            console.log(`   ✅ Campos completados: ${validacion.camposCompletados}`);
            console.log(`   ❌ Campos con error: ${validacion.camposConError}`);
            console.log(`   📈 Porcentaje completado: ${validacion.porcentajeCompletado}%`);
            return validacion.porcentajeCompletado === 100 && validacion.camposConError === 0;
        }
        catch (error) {
            console.log('   ⚠️ Error validando completitud:', error.message);
            return false;
        }
    }
}
exports.DetectorEstructura = DetectorEstructura;
class MVPHibrido {
    constructor(configuracion, headless = false, credenciales) {
        this.browser = null;
        this.page = null;
        this.tiempoInicio = 0;
        this.formUrl = '';
        this.archivosSubidosEnSesion = new Set(); // Para evitar subidas duplicadas
        this.camposProcesadosEnPasoActual = new Set(); // 🔴 NUEVO: Para trackear campos procesados en iteraciones
        this.headless = false; // Modo headless para ejecución desde interfaz
        this.credenciales = null; // Credenciales dinámicas
        this.configuracion = configuracion;
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
    async ejecutar() {
        console.log('🚀 INICIANDO MVP HÍBRIDO - ANÁLISIS + AUTOCOMPLETADO');
        console.log('='.repeat(60));
        console.log(' Objetivo: Completar formulario en 15-20 minutos');
        console.log('⚡ Estrategia: Extracción + Completado simultáneo');
        console.log('🛡️ Seguridad: NO envía formulario (solo testing)');
        console.log('');
        this.tiempoInicio = Date.now();
        try {
            // Solo pedir URL por consola si no fue configurada previamente
            if (!this.formUrl) {
                this.formUrl = await this.solicitarUrlPorConsola();
            }
            else {
                console.log(`📋 URL del formulario configurada: ${this.formUrl}`);
            }
            await this.inicializar();
            await this.loginYNavegacion();
            await this.procesarFormularioHibrido();
            this.resultado.exito = true;
            console.log('✅ MVP HÍBRIDO COMPLETADO EXITOSAMENTE');
        }
        catch (error) {
            this.resultado.errores = this.resultado.errores || [];
            this.resultado.errores.push(error.message);
            console.error('❌ Error en MVP híbrido:', error);
        }
        finally {
            await this.limpiarRecursos();
        }
        // Calcular estadísticas y tiempo total ANTES de finalizar
        this.resultado.tiempoTotal = Math.round((Date.now() - this.tiempoInicio) / 1000); // Convertir a segundos
        this.calcularEstadisticas();
        // Generar reporte final con estadísticas correctas
        await this.finalizar();
        return this.resultado;
    }
    async inicializar() {
        console.log('🔧 Inicializando navegador...');
        if (this.headless) {
            console.log('👻 Modo headless activado (navegador oculto)');
        }
        else {
            console.log('👁️ Modo visible activado (navegador visible)');
        }
        this.browser = await playwright_1.chromium.launch({
            headless: this.headless,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(30000);
        this.page.setDefaultNavigationTimeout(45000);
        console.log('✅ Navegador inicializado');
    }
    async solicitarUrlPorConsola() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            rl.question('\n Ingresa la URL del formulario CORFO que deseas validar: ', (respuesta) => {
                rl.close();
                const url = (respuesta || '').trim();
                if (url.startsWith('http'))
                    return resolve(url);
                reject(new Error('URL inválida. Debe comenzar con http o https'));
            });
        });
    }
    async loginYNavegacion() {
        console.log('🔑 Realizando login a CORFO...');
        // Prioridad: ir primero a la URL objetivo antes del login
        const urlEspecifica = this.formUrl || process.env.CORFO_URL;
        if (urlEspecifica && urlEspecifica !== 'https://ejemplo.corfo.cl/concurso/abc') {
            console.log(` Navegando primero a la URL objetivo: ${urlEspecifica}`);
            await this.navegarAURLEspecifica(urlEspecifica);
        }
        else {
            // Si no hay URL, pedirla directamente
            this.formUrl = await this.solicitarUrlPorConsola();
            await this.navegarAURLEspecifica(this.formUrl);
        }
        // Ahora realizar login desde el contexto actual (sin ir al home por defecto)
        await this.realizarLogin();
        // Asegurar que estemos en la URL objetivo autenticados (si la navegación de login nos movió)
        if (this.formUrl && !this.page.url().startsWith(this.formUrl)) {
            console.log(` Reafirmando URL objetivo autenticado: ${this.formUrl}`);
            // Solo navegar si realmente no estamos en la URL objetivo
            const urlActual = this.page.url();
            if (!urlActual.includes('Postulador.aspx') || urlActual.includes('Borradores')) {
                await this.navegarAURLEspecifica(this.formUrl);
            }
            else {
                console.log('✅ Ya estamos en el formulario real, no es necesario navegar nuevamente');
            }
        }
        // Esperar estado estable antes de leer título/URL para evitar "Execution context was destroyed"
        await this.page.waitForLoadState('domcontentloaded').catch(() => { });
        await this.page.waitForLoadState('networkidle').catch(() => { });
        // NO capturar título y URL aquí, se hará después de navegar al formulario real
    }
    async extraerInformacionProyecto() {
        try {
            console.log('🔍 Extrayendo información del proyecto...');
            const informacion = await this.page.evaluate(() => {
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
        }
        catch (error) {
            console.warn('⚠️ No se pudo extraer la información del proyecto:', error);
            this.resultado.tituloProyecto = 'No disponible';
            this.resultado.codigoProyecto = 'No disponible';
        }
    }
    async activarContenidoDinamico() {
        console.log('⏳ Activando contenido dinámico...');
        // Hacer scroll para activar contenido dinámico
        await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await this.page.waitForTimeout(1000);
        await this.page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        await this.page.waitForTimeout(1000);
        // Verificar si hay campos disponibles
        const camposDisponibles = await this.page.evaluate(() => {
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
            await this.page.waitForTimeout(3000);
        }
    }
    async procesarFormularioHibrido() {
        console.log('🔄 Iniciando procesamiento híbrido...');
        // Verificar si estamos en borradores o en el formulario real
        const detector = new DetectorEstructura(this.page);
        const esBorradores = await detector.esPaginaBorradores();
        if (esBorradores) {
            console.log('📁 PÁGINA DE BORRADORES DETECTADA - Navegando al formulario real...');
            await this.navegarDeBorradoresAFormulario();
        }
        else {
            console.log('✅ Ya estamos en el formulario real');
            // Espera adicional cuando no hay borradores para que se carguen los campos dinámicos
            console.log('⏳ Esperando carga de campos dinámicos...');
            await this.page.waitForTimeout(7000);
        }
        // Capturar título y URL del formulario real (no de borradores)
        this.resultado.urlInicial = this.page?.url() || '';
        this.resultado.titulo = await this.page?.title() || '';
        console.log(`📋 Formulario accedido: ${this.resultado.titulo}`);
        console.log(`🔗 URL: ${this.resultado.urlInicial}`);
        // Extraer información específica del proyecto
        await this.extraerInformacionProyecto();
        // Esperar carga completa y activar contenido dinámico
        await this.page.waitForLoadState('networkidle').catch(() => { });
        await this.activarContenidoDinamico();
        // Detectar estructura del formulario
        let estructura = await detector.detectarEstructuraCompleta();
        // Adaptar el MVP basado en la estructura detectada
        let pasoActual = estructura.pasoActual;
        let hayMasPasos = true;
        const tiempoLimitePorPaso = 3 * 60 * 1000; // 3 minutos máximo por paso
        const TOTAL_PASOS_ESPERADOS = estructura.totalPasos;
        console.log(`📊 ESTRUCTURA DETECTADA: ${TOTAL_PASOS_ESPERADOS} pasos, método: ${estructura.tipoDeteccion}`);
        if (estructura.esPaginaConfirmacion) {
            console.log('📋 PÁGINA DE CONFIRMACIÓN DETECTADA - Procesando verificación...');
            const detallesConfirmacion = await this.procesarPasoConfirmacion();
            // Agregar paso de confirmación a los resultados
            const pasoConfirmacion = {
                numero: 1,
                titulo: 'Confirmación Final',
                camposEncontrados: detallesConfirmacion.length,
                camposCompletados: detallesConfirmacion.filter(d => d.completado).length,
                tiempoTranscurrido: 0, // Confirmación es instantánea
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
                    // 🔴 NUEVO: procesarPasoActual ahora maneja la navegación internamente con sistema de iteraciones
                    const paso = await this.procesarPasoActual(pasoActual, tiempoInicioPaso);
                    this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
                    this.resultado.pasosCompletados.push(paso);
                    const tiempoTranscurrido = Date.now() - tiempoInicioPaso;
                    if (tiempoTranscurrido > tiempoLimitePorPaso) {
                        console.log('⚠️ Límite de tiempo por paso alcanzado, pasando al siguiente');
                    }
                    // Si procesarPasoActual completó exitosamente, avanzar al siguiente paso
                    pasoActual++;
                    await this.page.waitForTimeout(2000);
                    // Verificar si llegamos a una página especial
                    const estructuraActual = await detector.detectarEstructuraCompleta();
                    if (estructuraActual.esPaginaConfirmacion || estructuraActual.esPaginaBorradores) {
                        console.log('📋 Página especial detectada, finalizando loop...');
                        hayMasPasos = false;
                    }
                }
                catch (error) {
                    console.error(`❌ Error en paso ${pasoActual}:`, error.message);
                    this.resultado.errores = this.resultado.errores || [];
                    this.resultado.errores.push(`Paso ${pasoActual}: ${error.message}`);
                    // Intentar avanzar al siguiente paso en caso de error
                    const resultadoNavegacion = await this.navegarAlSiguientePaso();
                    if (resultadoNavegacion.navegoExitosamente) {
                        pasoActual++;
                    }
                    else {
                        hayMasPasos = false;
                    }
                }
            }
        }
        else {
            console.log(`ℹ️ Salteando bucle principal: página especial detectada`);
        }
        console.log(`\n✅ Procesamiento híbrido completado: ${(this.resultado.pasosCompletados?.length || 0)} pasos`);
    }
    /**
     * Procesa un paso del formulario con sistema de reintentos para campos faltantes
     * Implementa loop de hasta 3 iteraciones cuando el modal indica campos faltantes
     */
    async procesarPasoActual(numeroPaso, tiempoInicio) {
        const titulo = await this.obtenerTituloPaso();
        console.log(`📝 Paso ${numeroPaso}: "${titulo}"`);
        // 🔴 NUEVO: Limpiar Set de campos procesados para nuevo paso
        this.camposProcesadosEnPasoActual.clear();
        //  DETECCIÓN AUTOMÁTICA DE TIPO DE PASO
        const detector = new DetectorEstructura(this.page);
        const esConfirmacion = await detector.esPaginaConfirmacion();
        let todosCamposProcesados = [];
        if (esConfirmacion) {
            console.log(' PASO DE CONFIRMACIÓN DETECTADO AUTOMÁTICAMENTE - Realizando verificación final');
            todosCamposProcesados = await this.procesarPasoConfirmacion();
        }
        else {
            // 🔴 NUEVO: Sistema iterativo para completar campos faltantes
            console.log(`🔄 Procesando paso ${numeroPaso} - Autocompletando campos`);
            await this.expandirSeccionesAutomaticamente();
            // Primera iteración: Completar campos iniciales
            let camposIteracion = await this.extraerYCompletarCampos();
            todosCamposProcesados.push(...camposIteracion);
            console.log(`   📊 Primera iteración: ${camposIteracion.length} campos procesados`);
            // 🔴 NUEVO: Iteraciones ilimitadas basadas en aparición del modal
            // Ya no usamos MAX_ITERACIONES fijo, sino que iteramos hasta que el modal no aparezca
            const MAX_ITERACIONES_SEGURIDAD = 5; // Solo por seguridad para evitar loops infinitos
            let iteracionActual = 1;
            let hayMasCamposFaltantes = false;
            let navegoExitosamenteDentroDelLoop = false;
            do {
                console.log(`\n   ➡️ Verificando completitud del paso (Iteración ${iteracionActual})...`);
                // Intentar navegar al siguiente paso
                const resultadoNavegacion = await this.navegarAlSiguientePaso();
                if (!resultadoNavegacion.navegoExitosamente) {
                    console.log(`   ⚠️ No se pudo navegar al siguiente paso`);
                    break;
                }
                // 🔴 CLAVE: Verificar si el modal indicó campos faltantes
                if (resultadoNavegacion.resultadoModal.camposFaltantes) {
                    console.log(`\n   🔄 ITERACIÓN ${iteracionActual + 1}: Procesando campos faltantes detectados...`);
                    iteracionActual++;
                    // 🔴 NUEVO: Solo salir si alcanzamos límite de seguridad (prevenir loops infinitos)
                    if (iteracionActual > MAX_ITERACIONES_SEGURIDAD) {
                        console.log(`   ⚠️ Límite de seguridad alcanzado (${MAX_ITERACIONES_SEGURIDAD} iteraciones)`);
                        console.log(`   📝 Posible loop infinito detectado, forzando salida...`);
                        hayMasCamposFaltantes = false;
                        break;
                    }
                    // Esperar a que el sistema nos posicione en los campos faltantes
                    await this.page.waitForTimeout(2000);
                    // 🔴 CORRECCIÓN CRÍTICA: Procesar campos independientemente de si son "nuevos" o no
                    // El modal apareció = hay campos faltantes, debemos intentar completarlos
                    const camposFaltantes = await this.extraerYCompletarCampos();
                    console.log(`   📊 Campos procesados en esta iteración: ${camposFaltantes.length}`);
                    todosCamposProcesados.push(...camposFaltantes);
                    // 🔴 CAMBIO FUNDAMENTAL: Continuar iterando SIEMPRE que el modal aparezca
                    // No importa si encontramos campos nuevos o no, si el modal aparece = hay problemas
                    hayMasCamposFaltantes = true;
                    console.log(`   ⏭️ Modal apareció, continuando iteraciones...`);
                }
                else {
                    // Modal no apareció o se confirmó exitosamente dentro del loop
                    console.log(`   ✅ Paso completado exitosamente - Todos los campos obligatorios OK`);
                    navegoExitosamenteDentroDelLoop = true;
                    hayMasCamposFaltantes = false;
                }
            } while (hayMasCamposFaltantes && iteracionActual <= MAX_ITERACIONES_SEGURIDAD);
            console.log(`\n   📊 RESUMEN PASO ${numeroPaso}:`);
            console.log(`      🔄 Iteraciones realizadas: ${iteracionActual}`);
            console.log(`      📝 Total campos procesados: ${todosCamposProcesados.length}`);
            console.log(`      ✅ Campos completados: ${todosCamposProcesados.filter(c => c.completado).length}`);
            // 🔴 CRÍTICO: Solo intentar navegar si NO navegamos exitosamente dentro del loop
            if (!navegoExitosamenteDentroDelLoop) {
                console.log(`\n   ⚠️ FORZANDO AVANCE - Se alcanzó límite de iteraciones, intentando avanzar de todas formas...`);
                const navegacionFinal = await this.navegarAlSiguienteParaAvanzar();
                if (navegacionFinal) {
                    console.log(`   ✅ Navegación forzada exitosa (puede haber campos faltantes)`);
                }
                else {
                    console.log(`   ❌ No se pudo avanzar al siguiente paso después de ${iteracionActual} iteraciones`);
                }
            }
            else {
                console.log(`   ✅ Ya navegó exitosamente dentro del loop, continuando...`);
            }
        }
        const tiempoTranscurrido = Math.round((Date.now() - tiempoInicio) / 1000);
        const paso = {
            numero: numeroPaso,
            titulo: titulo,
            camposEncontrados: todosCamposProcesados.length,
            camposCompletados: todosCamposProcesados.filter(c => c.completado).length,
            tiempoTranscurrido: tiempoTranscurrido,
            exito: todosCamposProcesados.length > 0 || esConfirmacion,
            detalles: todosCamposProcesados
        };
        console.log(`   ⏱️ Tiempo total paso: ${tiempoTranscurrido}s`);
        if (esConfirmacion) {
            console.log('🎉 VERIFICACIÓN FINAL COMPLETADA');
        }
        return paso;
    }
    async procesarPasoConfirmacion() {
        console.log('📊 Analizando contadores de campos obligatorios...');
        const detalles = [];
        try {
            // Buscar los contadores de campos en la página de confirmación
            const contadores = await this.page.evaluate(() => {
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
                        if (match)
                            resultados.correctos = parseInt(match[1]);
                    }
                    if (texto.includes('obligatorios incorrectos')) {
                        const match = texto.match(/(\d+)/);
                        if (match)
                            resultados.incorrectos = parseInt(match[1]);
                    }
                    if (texto.includes('formatos incorrectos')) {
                        const match = texto.match(/(\d+)/);
                        if (match)
                            resultados.formatosIncorrectos = parseInt(match[1]);
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
            console.log(`    Porcentaje de éxito: ${porcentajeExito}%`);
            if (porcentajeExito >= 90) {
                console.log('🎉 ¡EXCELENTE! Formulario casi completamente correcto');
            }
            else if (porcentajeExito >= 70) {
                console.log('👍 BUENO: Formulario mayormente correcto');
            }
            else {
                console.log('⚠️ NECESITA MEJORAS: Muchos campos requieren corrección');
            }
        }
        catch (error) {
            console.error('❌ Error al procesar paso de confirmación:', error);
            detalles.push({
                etiqueta: 'Error en verificación',
                tipo: 'error',
                valorAsignado: error.message,
                completado: false,
                esObligatorio: false,
                razonFallo: 'No se pudo acceder a los contadores de verificación'
            });
        }
        return detalles;
    }
    /**
     * Extrae y completa campos del formulario
     * Usa this.camposProcesadosEnPasoActual para trackear campos entre iteraciones
     * @returns Array de detalles de campos procesados en esta iteración
     */
    async extraerYCompletarCampos() {
        const detalles = [];
        const camposYaProcesadosInicio = this.camposProcesadosEnPasoActual.size;
        if (camposYaProcesadosInicio > 0) {
            console.log(`   🔄 REINTENTANDO EXTRACCIÓN - Campos ya procesados: ${camposYaProcesadosInicio}`);
        }
        else {
            console.log(`   🔍 INICIANDO EXTRACCIÓN  DE CAMPOS...`);
        }
        //  PASO 1: Procesar desplegables primero (campos ocultos)
        console.log(`   📂 Procesando desplegables y campos ocultos...`);
        await this.expandirSeccionesAutomaticamente();
        //  PASO 2: Hacer scroll PROGRESIVO para activar contenido dinámico
        console.log(`   📜 Haciendo scroll progresivo para activar contenido dinámico...`);
        await this.scrollProgresivoParaActivarContenido();
        //  PASO 3: Buscar TODOS los campos de forma simplificada
        console.log(`   🔍 Buscando campos en el paso actual...`);
        let elementos = await this.obtenerTodosLosCampos();
        console.log(`   ✅ Campos encontrados: ${elementos.length}`);
        //  PASO 6: Procesar cada campo encontrado con detección dinámica
        console.log(`   🔍 Analizando ${elementos.length} elementos en total...`);
        // 🔴 NUEVO: Usar la propiedad de clase para mantener estado entre iteraciones
        const camposProcesados = this.camposProcesadosEnPasoActual;
        let intentos = 0;
        const maxIntentos = 3; // Máximo 3 iteraciones para detectar campos dinámicos
        while (intentos < maxIntentos) {
            intentos++;
            console.log(`   🔄 Iteración ${intentos}/${maxIntentos} - Detectando campos dinámicos...`);
            // Obtener elementos actuales en cada iteración
            if (intentos > 1) {
                elementos = await this.obtenerTodosLosCampos();
                console.log(`   🔍 Campos encontrados en iteración ${intentos}: ${elementos.length}`);
            }
            let camposNuevosEncontrados = 0;
            for (const elemento of elementos) {
                try {
                    // Verificar si el elemento es realmente interactuable
                    const info = await this.obtenerInfoCampoMejorada(elemento);
                    if (!info) {
                        console.log(`     ⚠️ Campo sin información válida, saltando`);
                        continue;
                    }
                    // Crear identificador único para el campo
                    const campoId = `${info.etiqueta}_${info.tipo}_${info.name || info.id}`;
                    // Si ya procesamos este campo, saltarlo
                    if (camposProcesados.has(campoId)) {
                        continue;
                    }
                    console.log(`     🔍 Procesando campo: "${info.etiqueta}" (tipo: ${info.tipo})`);
                    const valorAsignado = await this.completarCampo(elemento, info);
                    // Si el campo retorna null, no incluirlo en el reporte
                    if (valorAsignado === null) {
                        continue;
                    }
                    const detalle = {
                        etiqueta: info.etiqueta,
                        tipo: info.tipo,
                        valorAsignado: valorAsignado || '',
                        completado: !!valorAsignado,
                        esObligatorio: info.esObligatorio,
                        razonFallo: valorAsignado ? undefined : 'No se pudo determinar valor apropiado'
                    };
                    detalles.push(detalle);
                    camposProcesados.add(campoId);
                    camposNuevosEncontrados++;
                    console.log(`     ✅ Campo procesado: ${info.tipo} - "${info.etiqueta}" - Valor: "${valorAsignado || 'N/A'}"`);
                    //  NUEVO: Si completamos un select, esperar y re-escanear para campos dinámicos
                    if (info.tipo === 'select' && valorAsignado) {
                        console.log(`     🔄 Campo select completado, esperando campos dinámicos...`);
                        await this.esperarYCapturarCamposDinamicos();
                    }
                    await this.page.waitForTimeout(this.configuracion.tiempoEsperaEntreCampos);
                }
                catch (error) {
                    console.log(`     ⚠️ Error procesando campo:`, error.message);
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
                await this.page.waitForTimeout(1000);
            }
        }
        console.log(`    RESUMEN: ${detalles.length} campos procesados, ${detalles.filter(d => d.completado).length} completados exitosamente`);
        return detalles;
    }
    //  MÉTODO UNIFICADO: Obtener todos los campos (sin duplicación)
    async obtenerTodosLosCampos() {
        try {
            // Buscar todos los tipos de campos en una sola consulta
            const elementos = await this.page.$$('input:not([type="hidden"]), select, textarea');
            // Filtrar solo campos visibles e interactuables
            const camposValidos = [];
            const camposArchivoEncontrados = [];
            for (const elemento of elementos) {
                try {
                    const rect = await elemento.boundingBox();
                    const isVisible = await elemento.isVisible();
                    const isEnabled = await elemento.isEnabled();
                    const tipo = await elemento.evaluate((el) => el.type);
                    //  NUEVO: Verificar si es un botón "Subir Archivo" (no un campo real)
                    const esBotonSubirArchivo = await elemento.evaluate((el) => {
                        const texto = el.textContent?.trim().toLowerCase() || '';
                        const placeholder = el.placeholder?.toLowerCase() || '';
                        return texto.includes('subir archivo') || placeholder.includes('subir archivo');
                    });
                    if (esBotonSubirArchivo) {
                        continue; // Excluir botones "Subir Archivo"
                    }
                    // Los campos de archivo pueden estar ocultos pero son válidos
                    if (tipo === 'file') {
                        camposArchivoEncontrados.push(elemento);
                        camposValidos.push(elemento);
                        continue;
                    }
                    // Verificar visibilidad y posición para otros campos
                    if (rect && isVisible && isEnabled &&
                        rect.y >= -200 && rect.y <= 1500 &&
                        rect.x >= -200 && rect.x <= 1400) {
                        camposValidos.push(elemento);
                    }
                }
                catch (error) {
                    // Si hay error verificando, incluir el elemento
                    camposValidos.push(elemento);
                }
            }
            return camposValidos;
        }
        catch (error) {
            console.log('   ⚠️ Error obteniendo campos:', error.message);
            return [];
        }
    }
    /**
     * Realiza un scroll progresivo y suave para activar contenido dinámico
     * MEJORADO: Busca campos durante el scroll para no perderlos
     * MEJORADO: No scrollea bruscamente al top para mantener campos visibles
     */
    async scrollProgresivoParaActivarContenido() {
        console.log('     📜 Iniciando scroll progresivo con búsqueda simultánea de campos...');
        // Obtener altura inicial del documento
        let alturaDocumento = await this.page.evaluate(() => document.body.scrollHeight);
        const alturaVentana = await this.page.evaluate(() => window.innerHeight);
        let posicionActual = 0;
        const distanciaPorScroll = 150; // Distancia por cada scroll
        const delayEntreScrolls = 200; // Tiempo entre scrolls
        while (posicionActual < alturaDocumento) {
            // Hacer scroll suave
            await this.page.evaluate((distance) => {
                window.scrollBy({ top: distance, behavior: 'smooth' });
            }, distanciaPorScroll);
            posicionActual += distanciaPorScroll;
            // Esperar a que se active contenido dinámico
            await this.page.waitForTimeout(delayEntreScrolls);
            // 🔴 MEJORA: Buscar campos en esta posición del scroll
            // Cada 3 scrolls, buscar nuevos campos activados
            if (posicionActual % (distanciaPorScroll * 3) === 0 || posicionActual >= alturaDocumento - alturaVentana) {
                const camposEnPosicionActual = await this.page.evaluate(() => {
                    const campos = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                    return Array.from(campos).filter(campo => {
                        const element = campo;
                        const rect = element.getBoundingClientRect();
                        const style = window.getComputedStyle(element);
                        return style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            rect.height > 0;
                    }).length;
                });
                if (camposEnPosicionActual > 0) {
                    console.log(`     🔍 Scroll en posición ${posicionActual}px - ${camposEnPosicionActual} campos visibles`);
                }
            }
            // Recalcular altura por si se activó contenido nuevo
            const nuevaAltura = await this.page.evaluate(() => document.body.scrollHeight);
            if (nuevaAltura > alturaDocumento) {
                console.log(`     📏 Contenido dinámico detectado: altura ${alturaDocumento}px → ${nuevaAltura}px`);
                alturaDocumento = nuevaAltura;
            }
        }
        // 🔴 MEJORA CRÍTICA: NO volver al top bruscamente
        // En su lugar, hacer scroll suave al inicio DESPUÉS de procesar
        console.log('     ✅ Scroll progresivo completado - Campos activados y detectados');
        // Scroll muy suave de vuelta al inicio sin perder contexto
        await this.page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        // Esperar a que termine el scroll suave
        await this.page.waitForTimeout(500);
    }
    //  NUEVO: Método para esperar y capturar campos dinámicos
    async esperarYCapturarCamposDinamicos() {
        console.log(`     ⏳ Esperando campos dinámicos (2 segundos)...`);
        await this.page.waitForTimeout(2000);
        // Verificar si hay nuevos campos habilitados
        const nuevosCampos = await this.page.evaluate(() => {
            const campos = document.querySelectorAll('input, select, textarea');
            const camposHabilitados = Array.from(campos).filter(campo => {
                const element = campo;
                return !element.disabled && element.offsetParent !== null; // Visible y habilitado
            });
            return camposHabilitados.length;
        });
        console.log(`     📊 Campos habilitados detectados: ${nuevosCampos}`);
    }
    //  NUEVO: Procesar desplegables con lógica secuencial correcta
    async expandirSeccionesAutomaticamente() {
        console.log('📂 Procesando desplegables del paso actual...');
        try {
            //  PASO 1: Detectar desplegables del paso actual
            const desplegablesInfo = await this.detectarDesplegablesVisiblesEnPaso();
            if (desplegablesInfo.length === 0) {
                console.log('   ℹ️ No hay desplegables en el paso actual');
                return;
            }
            console.log(`   📊 Desplegables encontrados: ${desplegablesInfo.length}`);
            desplegablesInfo.forEach((d, index) => {
                const estado = d.isOpen ? 'ABIERTO' : 'CERRADO';
                console.log(`     ${index + 1}. "${d.titulo}" (${estado})`);
            });
            //  PASO 2: Procesar desplegables secuencialmente
            let totalCamposProcesados = 0;
            for (let i = 0; i < desplegablesInfo.length; i++) {
                const desplegable = desplegablesInfo[i];
                const estado = desplegable.isOpen ? 'ABIERTO' : 'CERRADO';
                console.log(`   🔄 Procesando "${desplegable.titulo}" (${estado})...`);
                //  LÓGICA CORRECTA: Solo abrir si está cerrado
                if (desplegable.isClosed) {
                    console.log(`     🔓 Abriendo desplegable cerrado...`);
                    await this.abrirDesplegable(desplegable.selector);
                    await this.page.waitForTimeout(1500); // Esperar a que se abra completamente
                }
                else {
                    console.log(`     ✅ Desplegable ya está abierto, procesando campos...`);
                }
                //  COMPLETAR TODOS LOS CAMPOS antes de pasar al siguiente
                const camposCompletados = await this.extraerYCompletarCamposEnDesplegable(desplegable);
                totalCamposProcesados += camposCompletados;
                console.log(`     ✅ Campos completados: ${camposCompletados}`);
                //  IMPORTANTE: NO cerrar desplegables abiertos por defecto
                // Solo cerrar si los abrimos nosotros y no es el último
                if (desplegable.isClosed && i < desplegablesInfo.length - 1) {
                    console.log(`     🔒 Cerrando desplegable para continuar con el siguiente...`);
                    await this.cerrarDesplegable(desplegable.selector);
                    await this.page.waitForTimeout(500);
                }
            }
            console.log(`    Total campos procesados: ${totalCamposProcesados}`);
        }
        catch (error) {
            console.log('   ⚠️ Error procesando desplegables:', error.message);
        }
    }
    //  NUEVO: Detectar desplegables del paso actual con estado correcto
    async detectarDesplegablesVisiblesEnPaso() {
        return await this.page.evaluate(() => {
            const desplegables = [];
            //  BUSCAR SOLO DESPLEGABLES EN EL PASO ACTUAL
            const todosLosHeaders = document.querySelectorAll('a[data-toggle="collapse"]');
            todosLosHeaders.forEach(header => {
                const text = header.textContent?.trim() || '';
                const href = header.getAttribute('href') || '';
                const dataParent = header.getAttribute('data-parent') || '';
                //  VERIFICACIÓN DE VISIBILIDAD EN PASO ACTUAL
                const rect = header.getBoundingClientRect();
                const style = window.getComputedStyle(header);
                const isVisible = style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    rect.width > 0 &&
                    rect.height > 0;
                //  SOLO DESPLEGABLES EN EL ÁREA PRINCIPAL DEL FORMULARIO
                const isInMainForm = header.closest('main, .main-content, .form-container, .content, .form-body, .panel-body') !== null ||
                    header.closest('[class*="form"], [class*="content"], [class*="main"], [class*="panel"]') !== null;
                //  FILTRO: Solo desplegables válidos del paso actual
                if (text &&
                    text.length > 5 &&
                    text.length < 100 &&
                    href.startsWith('#') &&
                    isVisible &&
                    isInMainForm &&
                    rect.top >= 0 && rect.top <= window.innerHeight &&
                    rect.left >= 0 && rect.left <= window.innerWidth &&
                    // Excluir navegación
                    !text.includes('Siguiente') &&
                    !text.includes('Anterior') &&
                    !text.includes('Atrás') &&
                    !text.includes('Continuar') &&
                    !text.includes('Enviar') &&
                    !text.includes('Guardar') &&
                    !text.includes('Cerrar') &&
                    !text.includes('Cancelar') &&
                    !text.includes('Aceptar') &&
                    !text.includes('OK') &&
                    !text.includes('Sí') &&
                    !text.includes('No') &&
                    !text.match(/^\d+$/) &&
                    !text.match(/^[A-Z\s]+$/) &&
                    !text.includes('PASO') &&
                    !text.includes('STEP') &&
                    !text.includes('PÁGINA') &&
                    !text.includes('PAGE')) {
                    //  DETECTAR ESTADO CORRECTO: Abierto vs Cerrado
                    const hasCollapsedClass = header.classList.contains('collapsed');
                    const ariaExpanded = header.getAttribute('aria-expanded');
                    // LÓGICA CORRECTA:
                    // - Si NO tiene clase 'collapsed' Y aria-expanded='true' = ABIERTO
                    // - Si SÍ tiene clase 'collapsed' Y aria-expanded='false' = CERRADO
                    const isOpen = !hasCollapsedClass && ariaExpanded === 'true';
                    const isClosed = hasCollapsedClass && ariaExpanded === 'false';
                    // Solo incluir si el estado está bien definido
                    if (isOpen || isClosed) {
                        desplegables.push({
                            titulo: text,
                            selector: href,
                            dataParent: dataParent,
                            isOpen: isOpen,
                            isClosed: isClosed,
                            hasCollapsedClass: hasCollapsedClass,
                            ariaExpanded: ariaExpanded,
                            header: header
                        });
                    }
                }
            });
            return desplegables;
        });
    }
    //  NUEVO: Abrir un desplegable específico
    async abrirDesplegable(selector) {
        try {
            // Escapar caracteres especiales manualmente (CSS.escape no está disponible en Node.js)
            const selectorEscapado = selector.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
            const header = await this.page.$(`a[href="${selectorEscapado}"]`);
            if (header) {
                await header.click();
                console.log(`     🔄 Abriendo desplegable: ${selector}`);
            }
        }
        catch (error) {
            console.log(`     ⚠️ Error abriendo desplegable ${selector}:`, error.message);
        }
    }
    //  NUEVO: Cerrar un desplegable específico
    async cerrarDesplegable(selector) {
        try {
            // Escapar caracteres especiales manualmente
            const selectorEscapado = selector.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
            const header = await this.page.$(`a[href="${selectorEscapado}"]`);
            if (header) {
                await header.click();
                console.log(`     🔒 Cerrando desplegable: ${selector}`);
            }
        }
        catch (error) {
            console.log(`     ⚠️ Error cerrando desplegable ${selector}:`, error.message);
        }
    }
    //  NUEVO: Extraer y completar campos dentro de un desplegable específico
    async extraerYCompletarCamposEnDesplegable(desplegable) {
        try {
            // Buscar campos dentro del contenido del desplegable
            const camposEnDesplegable = await this.page.evaluate((selector) => {
                const contenido = document.querySelector(selector);
                if (!contenido)
                    return [];
                const campos = contenido.querySelectorAll('input:not([type="hidden"]), select, textarea');
                return Array.from(campos).map(campo => {
                    const element = campo;
                    return {
                        id: element.id || '',
                        name: element.name || '',
                        type: element.type || element.tagName.toLowerCase(),
                        value: element.value || '',
                        selector: element.id ? `[id="${element.id}"]` : `[name="${element.name}"]`
                    };
                });
            }, desplegable.selector);
            console.log(`     🔍 Campos encontrados en "${desplegable.titulo}": ${camposEnDesplegable.length}`);
            // Completar cada campo encontrado
            let camposCompletados = 0;
            for (const campo of camposEnDesplegable) {
                try {
                    const elemento = await this.page.$(campo.selector);
                    if (elemento) {
                        const info = await this.obtenerInfoCampoMejorada(elemento);
                        if (info) {
                            const valor = await this.completarCampo(elemento, info);
                            if (valor) {
                                camposCompletados++;
                                console.log(`       ✅ Campo completado: ${info.etiqueta}`);
                            }
                        }
                    }
                }
                catch (error) {
                    console.log(`       ⚠️ Error completando campo:`, error.message);
                }
            }
            return camposCompletados;
        }
        catch (error) {
            console.log(`     ⚠️ Error procesando desplegable:`, error.message);
            return 0;
        }
    }
    async obtenerInfoCampoMejorada(elemento) {
        try {
            return await elemento.evaluate((el) => {
                const tagName = el.tagName.toLowerCase();
                let type = el.type || tagName;
                //  NORMALIZAR TIPOS DE SELECT
                if (type === 'select-one' || type === 'select-multiple') {
                    type = 'select';
                }
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';
                const value = el.value || '';
                const placeholder = el.placeholder || '';
                //  NUEVO: Atributos específicos de CORFO
                const dataCodigo = el.getAttribute('data-codigo') || '';
                const dataOriginalTitle = el.getAttribute('data-original-title') || '';
                const title = el.getAttribute('title') || '';
                const dataControlId = el.getAttribute('data-controlid') || '';
                //  NUEVO: Atributos específicos para campos de archivo
                const dataExtensiones = el.getAttribute('data-extensiones') || '';
                const dataTamanoMaximo = el.getAttribute('data-tamano-maximo') || '';
                const dataTipoControl = el.getAttribute('data-tipo-control') || '';
                const dataAdjuntoId = el.getAttribute('data-adjuntoid') || '';
                //  NUEVO: Atributo para detectar campos numéricos con inputmask
                const dataInputmask = el.getAttribute('data-inputmask') || '';
                //  NUEVO: Detectar campos de email basándose en contexto (solo para inputs de texto)
                if (type === 'text' || type === 'input') {
                    const contextoCompleto = `${id} ${name} ${placeholder} ${dataCodigo} ${dataOriginalTitle} ${title}`.toLowerCase();
                    if (contextoCompleto.includes('email') || contextoCompleto.includes('correo') ||
                        contextoCompleto.includes('mail') || contextoCompleto.includes('electrónico') ||
                        contextoCompleto.includes('electronico')) {
                        type = 'email';
                    }
                }
                //  NUEVO: Detectar campos numéricos con inputmask integer o decimal
                if (type === 'text' && dataInputmask && (dataInputmask.includes('integer') || dataInputmask.includes('decimal'))) {
                    type = 'number';
                }
                //  NUEVO: Detectar campos fecha con datepicker o inputmask de fecha
                if (type === 'text' && (className.includes('datepicker') ||
                    (dataInputmask && (dataInputmask.includes('dd/mm/yyyy') || dataInputmask.includes('dd/mm/aaaa'))))) {
                    type = 'date';
                }
                // Verificar si el elemento está realmente disponible
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isDisplayed = style.display !== 'none';
                const isVisible = style.visibility !== 'hidden';
                const hasSize = rect.width > 0 && rect.height > 0;
                const isInDocument = document.contains(el);
                //  CORRECCIÓN: Para campos de archivo, aceptar incluso si están ocultos
                const isInteractuable = isDisplayed && isVisible && (hasSize || type === 'hidden' || type === 'file') && isInDocument;
                if (!isInteractuable && type !== 'hidden' && type !== 'file')
                    return null;
                let etiqueta = '';
                //  ESTRATEGIA 1: data-codigo (específico de CORFO)
                if (dataCodigo) {
                    etiqueta = dataCodigo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                }
                //  ESTRATEGIA 2: data-original-title (específico de CORFO)
                if (!etiqueta && dataOriginalTitle) {
                    etiqueta = dataOriginalTitle;
                }
                //  ESTRATEGIA 3: title (específico de CORFO)
                if (!etiqueta && title) {
                    etiqueta = title;
                }
                //  ESTRATEGIA ESPECIAL PARA CAMPOS DE ARCHIVO: Buscar botón "Subir Archivo" cercano
                if (!etiqueta && type === 'file') {
                    // Buscar botón o span con texto "Subir Archivo" cerca del campo
                    const contenedor = el.closest('div, fieldset, .form-group, .field');
                    if (contenedor) {
                        const elementos = contenedor.querySelectorAll('span, button, a');
                        for (const elem of elementos) {
                            const texto = elem.textContent?.trim().toLowerCase() || '';
                            if (texto.includes('subir archivo') || texto.includes('subir') || texto.includes('archivo')) {
                                etiqueta = 'Campo de Archivo';
                                break;
                            }
                        }
                        // Si no se encontró botón específico, buscar texto general
                        if (!etiqueta) {
                            const textoContenedor = contenedor.textContent?.toLowerCase() || '';
                            if (textoContenedor.includes('archivo') || textoContenedor.includes('adjuntar') || textoContenedor.includes('documento')) {
                                etiqueta = 'Campo de Archivo';
                            }
                        }
                    }
                }
                // Estrategia 4: Label con atributo 'for'
                if (!etiqueta && id) {
                    const labelEl = document.querySelector(`label[for="${id}"]`);
                    if (labelEl)
                        etiqueta = labelEl.textContent?.trim() || '';
                }
                // Estrategia 5: Label padre
                if (!etiqueta) {
                    const parentLabel = el.closest('label');
                    if (parentLabel) {
                        etiqueta = parentLabel.textContent?.replace(value, '').trim() || '';
                    }
                }
                // Estrategia 6: Placeholder (solo si no es numérico)
                if (!etiqueta && placeholder && !placeholder.match(/^\d+$/) && !placeholder.includes('999999999')) {
                    etiqueta = placeholder;
                }
                // Estrategia 7: Texto anterior (hermanos anteriores)
                if (!etiqueta) {
                    let previous = el.previousElementSibling;
                    let attempts = 0;
                    while (previous && !etiqueta && attempts < 3) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 2 && text.length < 100 &&
                            !text.match(/^\d+$/) &&
                            !text.match(/^[^\w\s]+$/) &&
                            !text.match(/^[A-Z\s]+$/) &&
                            !text.includes('999999999')) {
                            etiqueta = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }
                // Estrategia 8: Contenedor padre
                if (!etiqueta) {
                    const container = el.closest('div, td, th, li, fieldset');
                    if (container) {
                        const allText = container.textContent?.trim() || '';
                        const lines = allText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
                        for (const line of lines) {
                            if (line.length > 2 && line.length < 100 &&
                                !line.match(/^\d+$/) &&
                                !line.match(/^[^\w\s]+$/) &&
                                !line.match(/^[A-Z\s]+$/) &&
                                !line.includes('999999999')) {
                                etiqueta = line;
                                break;
                            }
                        }
                    }
                }
                // Estrategia 9: Usar name o id como fallback (limpio)
                if (!etiqueta) {
                    const nameLimpio = name ? name.replace(/[^\w\s]/g, ' ').trim() : '';
                    const idLimpio = id ? id.replace(/[^\w\s]/g, ' ').trim() : '';
                    if (nameLimpio && nameLimpio.length > 2) {
                        etiqueta = nameLimpio;
                    }
                    else if (idLimpio && idLimpio.length > 2) {
                        etiqueta = idLimpio;
                    }
                    else {
                        etiqueta = `Campo ${tagName}`;
                    }
                }
                //  NUEVO: Obtener opciones para selects
                let opciones = [];
                if (tagName === 'select') {
                    const options = el.querySelectorAll('option');
                    opciones = Array.from(options).map((opt) => ({
                        value: opt.value,
                        text: opt.textContent?.trim() || '',
                        selected: opt.selected,
                        disabled: opt.disabled
                    }));
                }
                // 🔴 MEJORA: Detección más agresiva de campos obligatorios
                // Incluir verificación de validación de HTML5 y más patrones
                const esObligatorio = el.hasAttribute('required') ||
                    el.getAttribute('aria-required') === 'true' ||
                    el.getAttribute('aria-invalid') === 'true' ||
                    className.includes('required') ||
                    className.includes('mandatory') ||
                    className.includes('obligatorio') ||
                    className.includes('is-required') ||
                    className.includes('form-required') ||
                    className.includes('ng-invalid') || // Angular validation
                    className.includes('error') || // Generic error class
                    (etiqueta.includes('*') || etiqueta.includes('obligatorio')) ||
                    (etiqueta.includes('(requerido)') || etiqueta.includes('(obligatorio)')) ||
                    // 🔴 NUEVO: Campos de direcciones son típicamente obligatorios
                    (etiqueta.toLowerCase().includes('numero') && etiqueta.toLowerCase().includes('direcc')) ||
                    (etiqueta.toLowerCase().includes('departamento') && etiqueta.toLowerCase().includes('direcc')) ||
                    (etiqueta.toLowerCase().includes('codigo postal')) ||
                    (etiqueta.toLowerCase().includes('calle')) ||
                    // Verificar en el contenedor padre
                    (() => {
                        const contenedor = el.closest('div, fieldset, .form-group, .field');
                        if (contenedor) {
                            const textoContenedor = contenedor.textContent || '';
                            const classContenedor = contenedor.className || '';
                            return classContenedor.includes('required') ||
                                classContenedor.includes('mandatory') ||
                                classContenedor.includes('ng-invalid') ||
                                textoContenedor.includes('*') ||
                                textoContenedor.includes('obligatorio');
                        }
                        return false;
                    })() ||
                    // 🔴 NUEVO: Si el campo tiene validación de patrón, probablemente es obligatorio
                    el.hasAttribute('pattern') ||
                    el.hasAttribute('minlength') ||
                    el.hasAttribute('maxlength') ||
                    // 🔴 NUEVO: En contexto CORFO, asumir que campos numéricos son obligatorios por defecto
                    (type === 'number' && !el.readOnly && !el.disabled);
                return {
                    tipo: type,
                    etiqueta: etiqueta,
                    esObligatorio,
                    name: name,
                    id: id,
                    value: value,
                    className: className,
                    placeholder: placeholder,
                    dataCodigo: dataCodigo,
                    dataOriginalTitle: dataOriginalTitle,
                    title: title,
                    dataControlId: dataControlId,
                    //  NUEVO: Atributos específicos para campos de archivo
                    dataExtensiones: dataExtensiones,
                    dataTamanoMaximo: dataTamanoMaximo,
                    dataTipoControl: dataTipoControl,
                    dataAdjuntoId: dataAdjuntoId,
                    //  NUEVO: Atributo para detectar campos numéricos con inputmask
                    dataInputmask: dataInputmask,
                    opciones: opciones,
                    esMultiple: el.multiple || false,
                    debug: {
                        isDisplayed,
                        isVisible,
                        hasSize,
                        isInDocument,
                        isInteractuable
                    }
                };
            });
        }
        catch (error) {
            return null;
        }
    }
    async completarCampo(elemento, info) {
        try {
            const tipo = info.tipo.toLowerCase();
            const etiqueta = info.etiqueta || '';
            const opciones = info.opciones || [];
            const esMultiple = info.esMultiple || false;
            //  VERIFICAR SI EL CAMPO ES EDITABLE (NO READONLY/DISABLED)
            const esEditable = await elemento.evaluate((el) => {
                // Verificar atributos readonly y disabled
                const tieneReadonly = el.hasAttribute('readonly') || ('readOnly' in el && el.readOnly === true);
                const tieneDisabled = el.hasAttribute('disabled') || el.disabled === true;
                return !tieneReadonly && !tieneDisabled;
            });
            if (!esEditable) {
                console.log(`     ⏭️ Campo omitido (readonly/disabled): "${etiqueta}"`);
                return null;
            }
            //  MANEJO ESPECÍFICO DE SELECTS
            if (tipo === 'select') {
                return await this.completarSelectRobusto(elemento, info);
            }
            //  MANEJO DE INPUTS DE ARCHIVO
            if (tipo === 'file') {
                const resultadoArchivo = await this.subirArchivoPrueba(elemento, info);
                // Si el campo no tiene botón "Subir Archivo", no lo incluir en el reporte
                if (resultadoArchivo === 'sin_boton_subir_archivo') {
                    return null; // No incluir en el reporte
                }
                return resultadoArchivo;
            }
            //  GENERAR VALOR PARA OTROS TIPOS
            const valor = this.generarValorParaCampo(info);
            if (!valor)
                return null;
            //  MANEJO DE CHECKBOXES
            if (tipo === 'checkbox') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    await elemento.check();
                }
                return 'true';
            }
            //  MANEJO DE RADIO BUTTONS
            if (tipo === 'radio') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    // 🔴 MEJORA: Manejo robusto para radio buttons con tooltips
                    try {
                        // Intentar cerrar tooltips activos antes del click
                        await this.page.evaluate(() => {
                            // Cerrar todos los tooltips visibles
                            const tooltips = document.querySelectorAll('[role="tooltip"], .tooltip, [id^="tooltip"]');
                            tooltips.forEach(tooltip => {
                                if (tooltip instanceof HTMLElement) {
                                    tooltip.style.display = 'none';
                                    tooltip.remove();
                                }
                            });
                        });
                        await this.page.waitForTimeout(300);
                        // Intentar click normal primero
                        await elemento.click({ timeout: 5000 });
                    }
                    catch (error) {
                        // Si falla, usar force:true para forzar el click
                        console.log(`     ⚠️ Click normal falló, forzando click en radio button...`);
                        try {
                            await elemento.click({ force: true, timeout: 3000 });
                        }
                        catch (forceError) {
                            // Si aún falla, usar JavaScript click
                            console.log(`     ⚠️ Force click falló, usando JavaScript click...`);
                            await elemento.evaluate((el) => el.click());
                        }
                    }
                    // 🔴 NUEVO: Esperar a que aparezcan campos condicionales si existen
                    // Muchos formularios CORFO usan data-condicional que muestra/oculta campos
                    const tieneCondicional = await elemento.evaluate((el) => {
                        return el.hasAttribute('data-condicional') || el.hasAttribute('data-condicionalconfig');
                    });
                    if (tieneCondicional) {
                        console.log(`     ⏳ Radio con campos condicionales, esperando campos dinámicos...`);
                        await this.page.waitForTimeout(1500); // Esperar a que aparezcan campos condicionales
                    }
                }
                return 'seleccionado';
            }
            //  MANEJO DE INPUTS DE TEXTO
            if (['text', 'email', 'tel', 'url', 'password'].includes(tipo)) {
                await elemento.fill('');
                await elemento.fill(valor);
                return valor;
            }
            //  MANEJO DE TEXTAREAS
            if (tipo === 'textarea') {
                await elemento.fill('');
                await elemento.fill(valor);
                return valor;
            }
            //  MANEJO DE INPUTS NUMÉRICOS
            if (tipo === 'number') {
                const numeroValor = typeof valor === 'string' ? valor.replace(/[^\d]/g, '') : valor;
                // 🔴 MEJORA: Para campos con inputmask (integer o decimal), usar estrategia diferente
                const tieneInputmask = info.dataInputmask && (info.dataInputmask.includes('integer') || info.dataInputmask.includes('decimal'));
                const esDecimal = info.dataInputmask && info.dataInputmask.includes('decimal');
                if (tieneInputmask) {
                    // Estrategia para campos con inputmask:
                    // 1. Click para activar el campo
                    await elemento.click();
                    await this.page.waitForTimeout(100);
                    // 2. Limpiar con selectAll + delete
                    await elemento.press('Control+A');
                    await elemento.press('Backspace');
                    await this.page.waitForTimeout(100);
                    // 3. Escribir carácter por carácter con type() para que inputmask lo procese
                    // Para decimales, agregar coma y decimales
                    const valorFinal = esDecimal ? `${numeroValor},00` : numeroValor;
                    await elemento.type(valorFinal, { delay: 50 });
                    await this.page.waitForTimeout(200);
                    console.log(`     🔢 Campo inputmask ${esDecimal ? 'decimal' : 'integer'} completado: ${valorFinal}`);
                }
                else {
                    // Estrategia normal para campos sin inputmask
                    await elemento.fill('');
                    await elemento.fill(numeroValor);
                }
                return numeroValor;
            }
            //  MANEJO DE INPUTS DE FECHA
            if (tipo === 'date') {
                // 🔴 MEJORA: Para campos con datepicker e inputmask dd/mm/yyyy, usar estrategia especial
                const tieneInputmaskFecha = info.dataInputmask &&
                    (info.dataInputmask.includes('dd/mm/yyyy') || info.dataInputmask.includes('dd/mm/aaaa'));
                const tieneClaseDatepicker = info.className && info.className.includes('datepicker');
                if (tieneInputmaskFecha || tieneClaseDatepicker) {
                    // Estrategia para campos datepicker con inputmask:
                    // 1. Click para activar el campo
                    await elemento.click();
                    await this.page.waitForTimeout(100);
                    // 2. Limpiar con selectAll + delete
                    await elemento.press('Control+A');
                    await elemento.press('Backspace');
                    await this.page.waitForTimeout(100);
                    // 3. Escribir en formato dd/mm/yyyy carácter por carácter para que inputmask lo procese
                    const fechaFormato = '31/12/2024';
                    await elemento.type(fechaFormato, { delay: 50 });
                    await this.page.waitForTimeout(200);
                    console.log(`     📅 Campo datepicker completado: ${fechaFormato}`);
                    return fechaFormato;
                }
                else {
                    // Estrategia normal para campos date HTML5
                    await elemento.fill('');
                    await elemento.fill('2024-12-31');
                    return '2024-12-31';
                }
            }
            return null;
        }
        catch (error) {
            console.log(`     ⚠️ Error completando campo ${info.etiqueta}:`, error.message);
            return null;
        }
    }
    //  MÉTODO FLEXIBLE: Subir archivo PDF de prueba
    async subirArchivoPrueba(elemento, info) {
        try {
            const etiqueta = info.etiqueta || '';
            // 🔴 MEJORA: Generar ID único más robusto para el campo
            const campoId = `${info.dataCodigo || info.id || info.name || ''}__${etiqueta}`;
            //  NUEVO: Verificar si este campo de archivo está asociado con un botón "Subir Archivo" visible
            const tieneBotonSubirArchivo = await this.verificarBotonSubirArchivoVisible(elemento);
            if (!tieneBotonSubirArchivo) {
                console.log(`     ℹ️ Campo file sin botón visible, omitiendo: ${etiqueta}`);
                return 'sin_boton_subir_archivo';
            }
            // 🔴 MEJORA: Verificar si YA HAY un archivo subido mirando el DOM real
            const yaTieneArchivo = await this.verificarArchivoYaSubido(elemento);
            if (yaTieneArchivo) {
                console.log(`     ✅ Campo file ya tiene archivo subido: ${etiqueta}`);
                // Agregar al Set para no reprocesar
                this.archivosSubidosEnSesion.add(campoId);
                return 'archivo_ya_subido';
            }
            //  Verificar si ya subimos un archivo para este campo en esta sesión
            if (this.archivosSubidosEnSesion.has(campoId)) {
                console.log(`     ℹ️ Campo file ya procesado en esta sesión: ${etiqueta}`);
                return 'archivo_ya_subido_en_sesion';
            }
            // Buscar archivo PDF disponible
            const rutaArchivo = await this.obtenerArchivoPrueba();
            if (!rutaArchivo) {
                return 'archivo_no_encontrado';
            }
            // Subir el archivo PDF
            await elemento.setInputFiles(rutaArchivo);
            await this.page.waitForTimeout(1000);
            // Marcar como subido en esta sesión
            this.archivosSubidosEnSesion.add(campoId);
            const nombreArchivo = path.basename(rutaArchivo);
            console.log(`     ✅ Archivo PDF subido: ${nombreArchivo}`);
            return `archivo_subido: ${nombreArchivo}`;
        }
        catch (error) {
            return 'error_subida_archivo';
        }
    }
    //  NUEVO: Verificar si el campo de archivo está asociado con un botón "Subir Archivo" visible
    async verificarBotonSubirArchivoVisible(elemento) {
        try {
            // Buscar el contenedor del campo de archivo
            const contenedor = await elemento.evaluateHandle((el) => {
                return el.closest('div, fieldset, .form-group, .field, .input-group');
            });
            if (contenedor) {
                // Buscar botón "Subir Archivo" en el contenedor
                const tieneBotonSubirArchivo = await contenedor.evaluate((container) => {
                    // Buscar botones o spans con texto "Subir Archivo"
                    const botones = container.querySelectorAll('button, span, a, label');
                    for (const boton of Array.from(botones)) {
                        const texto = boton.textContent?.trim().toLowerCase() || '';
                        if (texto.includes('subir archivo') || texto.includes('subir') || texto.includes('upload')) {
                            // Verificar que el botón sea visible
                            const rect = boton.getBoundingClientRect();
                            const style = window.getComputedStyle(boton);
                            const isVisible = style.display !== 'none' &&
                                style.visibility !== 'hidden' &&
                                style.opacity !== '0' &&
                                rect.width > 0 &&
                                rect.height > 0;
                            if (isVisible) {
                                return true;
                            }
                        }
                    }
                    return false;
                });
                if (tieneBotonSubirArchivo) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    //  NUEVO: Verificar si ya hay un archivo subido
    async verificarArchivoYaSubido(elemento) {
        try {
            // Buscar el contenedor del campo de archivo
            const contenedor = await elemento.evaluateHandle((el) => {
                return el.closest('div, fieldset, .form-group, .field, .input-group');
            });
            if (contenedor) {
                // Buscar texto "Archivo adjunto:" en el contenedor
                const tieneArchivoAdjunto = await contenedor.evaluate((container) => {
                    const texto = container.textContent?.toLowerCase() || '';
                    return texto.includes('archivo adjunto:') ||
                        texto.includes('archivo adjunto') ||
                        texto.includes('documento_prueba.pdf') ||
                        texto.includes('fecha subida:');
                });
                if (tieneArchivoAdjunto) {
                    return true;
                }
            }
            //  NUEVO: Verificar también en toda la página por si el texto está fuera del contenedor
            const tieneArchivoEnPagina = await this.page.evaluate(() => {
                const textoCompleto = document.body.textContent?.toLowerCase() || '';
                return textoCompleto.includes('archivo adjunto:') ||
                    textoCompleto.includes('documento_prueba.pdf');
            });
            if (tieneArchivoEnPagina) {
                return true;
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    //  MÉTODO FLEXIBLE: Obtener archivo de prueba PDF
    async obtenerArchivoPrueba() {
        try {
            const directorioArchivos = path.join(__dirname, '..', 'archivos_prueba');
            // Buscar archivos PDF disponibles
            const archivosDisponibles = [
                'documento_prueba.pdf',
                'archivo_prueba.pdf',
                'test.pdf',
                'prueba.pdf'
            ];
            for (const archivo of archivosDisponibles) {
                const rutaCompleta = path.join(directorioArchivos, archivo);
                try {
                    await fs.access(rutaCompleta);
                    console.log(`     📄 Archivo PDF encontrado: ${archivo}`);
                    return rutaCompleta;
                }
                catch {
                    // Continuar con el siguiente archivo
                }
            }
            console.log(`     ⚠️ No se encontró archivo PDF en ${directorioArchivos}`);
            return null;
        }
        catch (error) {
            console.log(`     ⚠️ Error buscando archivo PDF:`, error.message);
            return null;
        }
    }
    //  NUEVO: Método específico para completar selects
    async completarSelectRobusto(elemento, info) {
        try {
            const opciones = info.opciones || [];
            const esMultiple = info.esMultiple || false;
            const etiqueta = info.etiqueta || '';
            const dataCodigo = info.dataCodigo || '';
            console.log(`     🔍 Select: "${etiqueta}" (${opciones.length} opciones, múltiple: ${esMultiple})`);
            if (opciones.length === 0) {
                console.log(`     ⚠️ Select sin opciones`);
                return null;
            }
            //  Filtrar opciones válidas (no placeholders)
            const opcionesValidas = opciones.filter((opt) => opt.value &&
                opt.value !== '' &&
                opt.text &&
                opt.text.length > 0 &&
                !opt.disabled &&
                !opt.text.toLowerCase().includes('seleccionar') &&
                !opt.text.toLowerCase().includes('--') &&
                !opt.text.toLowerCase().includes('ninguno') &&
                !opt.text.toLowerCase().includes('seleccione') &&
                !opt.text.toLowerCase().includes('elija') &&
                !opt.text.toLowerCase().includes('choose') &&
                !opt.text.toLowerCase().includes('select') &&
                !opt.text.toLowerCase().includes('por favor'));
            console.log(`     📋 Opciones válidas: ${opcionesValidas.length}`);
            if (opcionesValidas.length === 0) {
                console.log(`     ⚠️ No hay opciones válidas`);
                return null;
            }
            //  Selección inteligente basada en contexto
            let opcionSeleccionada = null;
            const contextoCompleto = `${etiqueta} ${dataCodigo}`.toLowerCase();
            // Selección por palabras clave específicas
            if (contextoCompleto.includes('región') || contextoCompleto.includes('region')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('metropolitana') ||
                    opt.text.toLowerCase().includes('santiago') ||
                    opt.text.toLowerCase().includes('valparaíso') ||
                    opt.text.toLowerCase().includes('biobío') ||
                    opt.text.toLowerCase().includes('araucanía'));
            }
            else if (contextoCompleto.includes('sector') && contextoCompleto.includes('aplicación')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('tecnología') ||
                    opt.text.toLowerCase().includes('innovación') ||
                    opt.text.toLowerCase().includes('medio ambiente') ||
                    opt.text.toLowerCase().includes('sustentabilidad') ||
                    opt.text.toLowerCase().includes('digital'));
            }
            else if (contextoCompleto.includes('sector') && contextoCompleto.includes('impacto')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('económico') ||
                    opt.text.toLowerCase().includes('social') ||
                    opt.text.toLowerCase().includes('ambiental') ||
                    opt.text.toLowerCase().includes('territorial'));
            }
            else if (contextoCompleto.includes('tamaño') || contextoCompleto.includes('tamano')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('mediana') ||
                    opt.text.toLowerCase().includes('pequeña') ||
                    opt.text.toLowerCase().includes('grande'));
            }
            else if (contextoCompleto.includes('tipo') && contextoCompleto.includes('documento')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('cédula') ||
                    opt.text.toLowerCase().includes('identidad'));
            }
            // Si no se encontró por contexto, usar la primera opción válida
            if (!opcionSeleccionada) {
                opcionSeleccionada = opcionesValidas[0];
            }
            //  Seleccionar la opción
            if (esMultiple) {
                // Para selects múltiples, seleccionar solo una opción
                await elemento.selectOption(opcionSeleccionada.value);
                console.log(`     ✅ Select múltiple completado: "${opcionSeleccionada.text}"`);
            }
            else {
                // Para selects simples
                await elemento.selectOption(opcionSeleccionada.value);
                console.log(`     ✅ Select completado: "${opcionSeleccionada.text}"`);
            }
            return opcionSeleccionada.text;
        }
        catch (error) {
            console.log(`     ⚠️ Error completando select:`, error.message);
            return null;
        }
    }
    generarValorParaCampo(info) {
        const etiqueta = info.etiqueta.toLowerCase();
        const tipo = info.tipo.toLowerCase();
        const dataCodigo = (info.dataCodigo || '').toLowerCase();
        const placeholder = (info.placeholder || '').toLowerCase();
        const dataInputmask = (info.dataInputmask || '').toLowerCase();
        //  Mapeo inteligente basado en etiqueta y data-codigo
        const contextoCompleto = `${etiqueta} ${dataCodigo} ${placeholder}`.toLowerCase();
        // Detección por palabras clave específicas
        if (contextoCompleto.includes('rut') || contextoCompleto.includes('run') || contextoCompleto.includes('identificador')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RUT;
        }
        else if (contextoCompleto.includes('email') || contextoCompleto.includes('correo') || contextoCompleto.includes('mail') ||
            contextoCompleto.includes('e-mail') || contextoCompleto.includes('electrónico') || contextoCompleto.includes('electronico')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.EMAIL;
        }
        else if (contextoCompleto.includes('teléfono') || contextoCompleto.includes('telefono') || contextoCompleto.includes('fono') || contextoCompleto.includes('celular')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TELEFONO;
        }
        else if (contextoCompleto.includes('nombre') && !contextoCompleto.includes('proyecto')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NOMBRE;
        }
        else if (contextoCompleto.includes('apellido')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.APELLIDO_PATERNO;
        }
        else if (contextoCompleto.includes('razón social') || contextoCompleto.includes('empresa') || contextoCompleto.includes('organización')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RAZON_SOCIAL;
        }
        else if (contextoCompleto.includes('título') && contextoCompleto.includes('proyecto')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
        }
        else if (contextoCompleto.includes('objetivo') && contextoCompleto.includes('general')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
        }
        else if (contextoCompleto.includes('descripción') && contextoCompleto.includes('proyecto')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
        }
        else if (contextoCompleto.includes('inversión') || contextoCompleto.includes('inversion')) {
            return '50000000'; // Valor específico para inversión
        }
        else if (contextoCompleto.includes('costos') || contextoCompleto.includes('operacion') || contextoCompleto.includes('operación')) {
            return '50000000'; // Valor específico para costos de operación
        }
        else if (contextoCompleto.includes('monto') || contextoCompleto.includes('costo') || contextoCompleto.includes('presupuesto') || contextoCompleto.includes('valor') || contextoCompleto.includes('total')) {
            return '50000000'; // Valor más realista para montos
        }
        else if (contextoCompleto.includes('duración') || contextoCompleto.includes('duracion') || contextoCompleto.includes('meses')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
        }
        // 🔴 NUEVO: Detección específica para campos de dirección (ANTES de la detección genérica de dirección)
        else if ((contextoCompleto.includes('numero') || contextoCompleto.includes('número')) && contextoCompleto.includes('direcc')) {
            return '100'; // Número de calle corto
        }
        else if (contextoCompleto.includes('departamento') && contextoCompleto.includes('direcc')) {
            return '100'; // Número de departamento corto
        }
        else if (contextoCompleto.includes('codigo') && contextoCompleto.includes('postal')) {
            return '8320000'; // Código postal realista de Chile
        }
        else if (contextoCompleto.includes('block') || contextoCompleto.includes('villa') || contextoCompleto.includes('población') || contextoCompleto.includes('poblacion')) {
            return 'Block A'; // Valor para block/villa
        }
        else if (contextoCompleto.includes('dirección') || contextoCompleto.includes('direccion') || contextoCompleto.includes('domicilio')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DIRECCION_CALLE;
        }
        else if (contextoCompleto.includes('comuna') || contextoCompleto.includes('ciudad')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.COMUNA;
        }
        else if (contextoCompleto.includes('región') || contextoCompleto.includes('region')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.REGION;
        }
        else if (contextoCompleto.includes('empleos') || contextoCompleto.includes('empleo') || contextoCompleto.includes('trabajos')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
        }
        else if (contextoCompleto.includes('año') || contextoCompleto.includes('año') || contextoCompleto.includes('year')) {
            return '2024';
        }
        else if (contextoCompleto.includes('fecha') || contextoCompleto.includes('date')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.FECHA;
        }
        else if (contextoCompleto.includes('porcentaje') || contextoCompleto.includes('porcentaje') || contextoCompleto.includes('%')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.PORCENTAJE;
        }
        else if (contextoCompleto.includes('cantidad') || contextoCompleto.includes('número') || contextoCompleto.includes('numero')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
        }
        else if (contextoCompleto.includes('observaciones') || contextoCompleto.includes('comentarios')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
        }
        else if (contextoCompleto.includes('justifique') || contextoCompleto.includes('justificar') || contextoCompleto.includes('justificación')) {
            return 'Este proyecto se basa en ciclos biológicos naturales para optimizar los procesos y minimizar el impacto ambiental, aprovechando los patrones naturales de crecimiento y desarrollo para crear soluciones más eficientes y sostenibles.';
        }
        else if (contextoCompleto.includes('ciclos biológicos') || contextoCompleto.includes('biologicos') || contextoCompleto.includes('biológicos')) {
            return 'El proyecto implementa principios de ciclos biológicos para mejorar la eficiencia y sostenibilidad de los procesos, utilizando patrones naturales de crecimiento y desarrollo.';
        }
        else if (contextoCompleto.includes('página web') || contextoCompleto.includes('sitio web') || contextoCompleto.includes('url')) {
            return 'https://www.ejemplo.cl';
        }
        else if (contextoCompleto.includes('linkedin') || contextoCompleto.includes('facebook') || contextoCompleto.includes('instagram')) {
            return 'https://www.ejemplo.com';
        }
        else if (contextoCompleto.includes('profesión') || contextoCompleto.includes('cargo') || contextoCompleto.includes('ocupación')) {
            return 'Ingeniero de Software';
        }
        else if (contextoCompleto.includes('nacionalidad')) {
            return 'Chilena';
        }
        else if (contextoCompleto.includes('género') || contextoCompleto.includes('sexo')) {
            return 'Masculino';
        }
        else if (contextoCompleto.includes('etnia')) {
            return 'No aplica';
        }
        else if (contextoCompleto.includes('pueblo originario')) {
            return 'No';
        }
        //  NUEVO: Detectar campos numéricos con inputmask integer
        if (dataInputmask && dataInputmask.includes('integer')) {
            return '50000000'; // Valor numérico para campos con inputmask integer
        }
        //  Mapeo por tipo de campo
        switch (tipo) {
            case 'email': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.EMAIL;
            case 'tel': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TELEFONO;
            case 'number': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
            case 'date': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.FECHA;
            case 'textarea': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
            case 'text': return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
            case 'url': return 'https://www.ejemplo.cl';
            case 'password': return 'password123';
            default: return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
        }
    }
    async realizarLogin() {
        // 1) Intentar interfaz nueva en la página actual
        try {
            const mostrarLink = await this.page.$('#mostrarCorfoLoginLink');
            const bloqueVisible = await this.page.$('#bloqueCorfoLogin');
            if (mostrarLink) {
                await mostrarLink.click();
                await this.page.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
            }
            else if (!bloqueVisible) {
                // nada visible aún, continuar a verificar iframe
            }
            const hayBloque = await this.page.$('#bloqueCorfoLogin');
            if (hayBloque) {
                await this.page.waitForSelector('#rut', { state: 'visible' });
                await this.page.waitForSelector('#pass', { state: 'visible' });
                await this.page.fill('#rut', process.env.CORFO_USER);
                await this.page.fill('#pass', process.env.CORFO_PASS);
                await this.page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
                    this.page.click('#ingresa_')
                ]);
                // Esperar a que se estabilice la red
                await this.page.waitForLoadState('networkidle').catch(() => { });
                console.log('Login con interfaz nueva completado');
                return;
            }
        }
        catch { }
        // 2) Intentar interfaz antigua via iframe en la página actual
        const frames = this.page.frames();
        const loginFrame = frames.find((frame) => frame.url().includes('login.corfo.cl'));
        if (loginFrame) {
            await loginFrame.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000);
            await loginFrame.fill('#rut', process.env.CORFO_USER);
            await loginFrame.fill('#pass', process.env.CORFO_PASS);
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
                loginFrame.click('#ingresa_')
            ]);
            await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => { });
            await this.page.waitForLoadState('networkidle').catch(() => { });
            console.log('Login con iframe completado');
            return;
        }
        // 3) Si existe un enlace textual a login en la misma página, usarlo (sin ir al home)
        try {
            const enlaceLogin = await this.page.$('a:has-text("¿Tienes clave Corfo?"), a:has-text("Inicia sesión"), a:has-text("Ingreso usuario")');
            if (enlaceLogin) {
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => { }),
                    enlaceLogin.click()
                ]);
                // Reintentar interfaz nueva o iframe tras navegar
                const mostrarLink2 = await this.page.$('#mostrarCorfoLoginLink');
                if (mostrarLink2) {
                    await mostrarLink2.click();
                    await this.page.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
                    await this.page.fill('#rut', process.env.CORFO_USER);
                    await this.page.fill('#pass', process.env.CORFO_PASS);
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
                        this.page.click('#ingresa_')
                    ]);
                    await this.page.waitForLoadState('networkidle').catch(() => { });
                    console.log('Login completado tras navegar al enlace de login');
                    return;
                }
                const frames2 = this.page.frames();
                const loginFrame2 = frames2.find((frame) => frame.url().includes('login.corfo.cl'));
                if (loginFrame2) {
                    await loginFrame2.waitForLoadState('networkidle');
                    await loginFrame2.fill('#rut', process.env.CORFO_USER);
                    await loginFrame2.fill('#pass', process.env.CORFO_PASS);
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => { }),
                        loginFrame2.click('#ingresa_')
                    ]);
                    await loginFrame2.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => { });
                    await this.page.waitForLoadState('networkidle').catch(() => { });
                    console.log('Login con iframe tras navegar al enlace de login');
                    return;
                }
            }
        }
        catch { }
        throw new Error('No se encontró interfaz de login en la página actual');
    }
    async navegarAURLEspecifica(url) {
        console.log(` Navegando directamente a la URL: ${url}`);
        try {
            // Verificar si ya estamos en la URL objetivo
            const urlActual = this.page.url();
            if (urlActual === url || (urlActual.includes('Postulador.aspx') && !urlActual.includes('Borradores'))) {
                console.log('✅ Ya estamos en la URL objetivo o en el formulario real');
                return;
            }
            await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await this.page.waitForTimeout(3000);
            // Verificar si necesitamos hacer clic en "Inicia tu postulación"
            const botonIniciar = await this.page.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación")');
            if (botonIniciar) {
                console.log('🚀 Haciendo clic en "Inicia tu postulación"...');
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { }),
                    botonIniciar.click()
                ]);
                await this.page.waitForTimeout(5000);
                // Verificar si estamos en la página de borradores
                const urlDespuesClic = this.page.url();
                console.log(`📍 URL después del clic: ${urlDespuesClic}`);
                if (urlDespuesClic.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                }
                else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            }
            else {
                console.log('✅ Ya estamos en el formulario');
            }
        }
        catch (error) {
            console.error(`❌ Error navegando a URL específica: ${error}`);
            throw error;
        }
    }
    async navegarDeBorradoresAFormulario() {
        console.log('🔄 Navegando desde borradores al formulario real...');
        // Eliminar postulaciones existentes primero
        //await this.eliminarPostulacionesExistentes();
        // Buscar botón "Nueva Postulación" con más selectores
        const selectoresNuevaPostulacion = [
            'button:has-text("Nueva Postulación")',
            'button:has-text("NUEVA POSTULACIÓN")',
            'button:has-text("Nueva Postulacion")',
            'a:has-text("Nueva Postulación")',
            'a:has-text("NUEVA POSTULACIÓN")',
            'a:has-text("Nueva Postulacion")',
            'input[value*="Nueva"]',
            'input[value*="nueva"]',
            '.btn:has-text("Nueva")',
            '.btn:has-text("NUEVA")',
            '[onclick*="nueva"]',
            '[onclick*="Nueva"]',
            'button[onclick*="nueva"]',
            'a[onclick*="nueva"]'
        ];
        let botonNuevaPostulacion = null;
        for (const selector of selectoresNuevaPostulacion) {
            try {
                botonNuevaPostulacion = await this.page.$(selector);
                if (botonNuevaPostulacion) {
                    const texto = await botonNuevaPostulacion.textContent();
                    console.log(`✅ Botón "Nueva Postulación" encontrado: ${selector} - Texto: "${texto}"`);
                    break;
                }
            }
            catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, error.message);
                continue;
            }
        }
        if (botonNuevaPostulacion) {
            console.log('🔄 Haciendo clic en "Nueva Postulación"...');
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación')),
                botonNuevaPostulacion.click()
            ]);
            await this.page.waitForTimeout(5000);
            const urlFinal = this.page.url();
            console.log(`📍 URL final del formulario: ${urlFinal}`);
            if (urlFinal.includes('Postulador.aspx') && !urlFinal.includes('Borradores')) {
                console.log('✅ Navegación exitosa al formulario real');
                // Buscar y hacer clic en el botón "Siguiente" o "Comenzar" para llegar al primer paso real
                await this.navegarAlPrimerPasoReal();
            }
            else {
                console.log('⚠️ Aún no estamos en el formulario real, intentando otras estrategias...');
            }
        }
        else {
            console.log('❌ No se encontró botón "Nueva Postulación"');
        }
    }
    // Eliminado: ya no se eliminan postulaciones existentes
    async navegarAlPrimerPasoReal() {
        console.log(' Navegando al primer paso real del formulario...');
        await this.page.waitForTimeout(3000); // Esperar que cargue completamente
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
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    console.log(`🔄 Haciendo clic en botón: ${selector}`);
                    await boton.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(500);
                    const urlAntes = this.page.url();
                    await boton.click();
                    await this.page.waitForTimeout(3000);
                    const urlDespues = this.page.url();
                    // Verificar si aparecieron campos reales
                    const camposReales = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
                    console.log(`   📝 Campos reales encontrados después del clic: ${camposReales.length}`);
                    if (camposReales.length > 0 || urlAntes !== urlDespues) {
                        console.log(`✅ Navegación exitosa al primer paso real`);
                        console.log(`📍 Nueva URL: ${urlDespues}`);
                        botonEncontrado = true;
                        break;
                    }
                    else {
                        console.log(`⚠️ No se encontraron campos reales después del clic`);
                    }
                }
            }
            catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, error.message);
                continue;
            }
        }
        if (!botonEncontrado) {
            console.log('ℹ️ No se encontró botón para navegar al primer paso, puede que ya estemos ahí');
            // Verificar si ya hay campos de formulario visibles
            const camposExistentes = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
            if (camposExistentes.length > 0) {
                console.log(`✅ Ya hay ${camposExistentes.length} campos reales disponibles`);
            }
            else {
                console.log('⚠️ No se encontraron campos reales en la página actual');
                // Hacer scroll adicional para activar contenido dinámico
                console.log('📜 Haciendo scroll adicional para activar contenido...');
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await this.page.waitForTimeout(3000);
                const camposPostScroll = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
                console.log(`📝 Campos encontrados después del scroll: ${camposPostScroll.length}`);
            }
        }
    }
    async obtenerTituloPaso() {
        try {
            const titulo = await this.page.$eval('h1, h2, h3', (el) => el.textContent?.trim());
            return titulo || `Paso ${Date.now()}`;
        }
        catch {
            return `Paso ${Date.now()}`;
        }
    }
    //  NUEVO: Reintentar autocompletado para campos faltantes - VERSIÓN AGRESIVA
    async reintentarAutocompletado() {
        console.log('🔄 Reintentando autocompletado de campos faltantes...');
        try {
            // Buscar solo campos visibles en el paso actual (no campos ocultos)
            const camposFaltantes = await this.page.evaluate(() => {
                const campos = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                const faltantes = [];
                campos.forEach(campo => {
                    const element = campo;
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
                            if (labelEl)
                                etiqueta = labelEl.textContent?.trim() || '';
                        }
                        if (!etiqueta) {
                            const parentLabel = element.closest('label');
                            if (parentLabel) {
                                etiqueta = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                            }
                        }
                        if (!etiqueta && 'placeholder' in element) {
                            etiqueta = element.placeholder || '';
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
                    const elemento = await this.page.$(campo.selector);
                    if (elemento) {
                        const valor = this.generarValorParaCampo({
                            etiqueta: campo.etiqueta,
                            tipo: campo.tipo
                        });
                        if (valor) {
                            if (campo.tipo === 'select') {
                                await elemento.selectOption({ index: 1 });
                            }
                            else if (campo.tipo === 'input') {
                                const tipoInput = await elemento.evaluate((el) => el.type);
                                if (tipoInput === 'checkbox' || tipoInput === 'radio') {
                                    await elemento.check();
                                }
                                else {
                                    await elemento.fill(valor);
                                }
                            }
                            else if (campo.tipo === 'textarea') {
                                await elemento.fill(valor);
                            }
                            console.log(`     ✅ Campo completado: ${campo.etiqueta}`);
                            await this.page.waitForTimeout(100);
                        }
                    }
                }
                catch (error) {
                    console.log(`     ⚠️ Error completando campo ${campo.etiqueta}:`, error.message);
                }
            }
        }
        catch (error) {
            console.log('   ⚠️ Error en reintento de autocompletado:', error.message);
        }
    }
    /**
     * Navega al siguiente paso de manera definitiva, presionando "Sí" si aparece modal
     * Este método se usa después de completar todas las iteraciones de campos faltantes
     * @returns true si navegó exitosamente
     */
    async navegarAlSiguienteParaAvanzar() {
        console.log('➡️ Navegación final: Avanzando al siguiente paso...');
        const selectores = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            'button:has-text("CONTINUAR")',
            'button:has-text("Continuar")',
            'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")',
            '.btn-next',
            '[class*="next"]'
        ];
        for (const selector of selectores) {
            try {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    const texto = await boton.textContent() || '';
                    const value = await boton.getAttribute('value') || '';
                    // Evitar botones de envío final
                    if (texto.toLowerCase().includes('enviar') ||
                        value.toLowerCase().includes('enviar') ||
                        texto.toLowerCase().includes('finalizar')) {
                        continue;
                    }
                    console.log(`   🖱️ Haciendo clic en: "${texto || value}"`);
                    await boton.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(500);
                    await boton.click();
                    await this.page.waitForTimeout(2000);
                    // 🔴 NUEVO: Si aparece modal, presionar "Sí, estoy seguro" para forzar avance
                    const modalConfirmado = await this.confirmarModalParaAvanzar();
                    if (modalConfirmado) {
                        await this.page.waitForTimeout(2000);
                    }
                    console.log('   ✅ Navegación final exitosa');
                    return true;
                }
            }
            catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, error.message);
                continue;
            }
        }
        console.log('   ❌ No se encontró botón para siguiente paso');
        return false;
    }
    /**
     * Intenta navegar al siguiente paso y retorna información sobre el modal si aparece
     * @returns ResultadoNavegacion con información sobre si navegó y el resultado del modal
     */
    async navegarAlSiguientePaso() {
        console.log('➡️ Intentando navegar al siguiente paso...');
        const selectores = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            'button:has-text("CONTINUAR")',
            'button:has-text("Continuar")',
            'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")',
            '.btn-next',
            '[class*="next"]'
        ];
        for (const selector of selectores) {
            try {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    const texto = await boton.textContent() || '';
                    const value = await boton.getAttribute('value') || '';
                    // Evitar botones de envío final
                    if (texto.toLowerCase().includes('enviar') ||
                        value.toLowerCase().includes('enviar') ||
                        texto.toLowerCase().includes('finalizar')) {
                        continue;
                    }
                    console.log(`   🖱️ Haciendo clic en: "${texto || value}"`);
                    // Hacer scroll al botón si es necesario
                    await boton.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(500);
                    await boton.click();
                    await this.page.waitForTimeout(2000);
                    // 🔴 NUEVO: Capturar resultado del modal
                    const resultadoModal = await this.manejarModalConfirmacion();
                    if (resultadoModal.aparecio) {
                        await this.page.waitForTimeout(2000);
                    }
                    console.log('   ✅ Navegación exitosa');
                    return {
                        navegoExitosamente: true,
                        resultadoModal: resultadoModal
                    };
                }
            }
            catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, error.message);
                continue;
            }
        }
        console.log('   ❌ No se encontró botón para siguiente paso');
        return {
            navegoExitosamente: false,
            resultadoModal: {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            }
        };
    }
    /**
     * Confirma el modal presionando "Sí, estoy seguro" para forzar avance al siguiente paso
     * Se usa después de completar todas las iteraciones de campos faltantes
     * @returns true si se confirmó el modal
     */
    async confirmarModalParaAvanzar() {
        try {
            await this.page.waitForTimeout(1000);
            const selectoresSi = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                'button:has-text("SI")',
                '.btn-primary:has-text("Sí")',
                '.btn-success:has-text("Sí")',
                '.swal2-confirm',
                'button[class*="confirm"]',
                'button[class*="primary"]'
            ];
            for (const selector of selectoresSi) {
                try {
                    const botonSi = await this.page.$(selector);
                    if (botonSi && await botonSi.isVisible()) {
                        const texto = await botonSi.textContent() || '';
                        console.log(`   ✅ Confirmando modal para avanzar: "${texto}"`);
                        await botonSi.click();
                        await this.page.waitForTimeout(1500);
                        return true;
                    }
                }
                catch (err) {
                    continue;
                }
            }
            // Si no hay modal, está bien (significa que no había campos faltantes)
            return false;
        }
        catch (error) {
            console.log('   ⚠️ Error confirmando modal:', error.message);
            return false;
        }
    }
    /**
     * Maneja el modal de confirmación que aparece cuando hay campos faltantes
     * CAMBIO IMPORTANTE: Ahora hace clic en "No" para que el sistema nos lleve a los campos faltantes
     * @returns ResultadoModal con información sobre si apareció el modal y qué botón se presionó
     */
    async manejarModalConfirmacion() {
        try {
            await this.page.waitForTimeout(1000);
            // 🔴 NUEVO: Primero buscar el botón "No" para identificar campos faltantes
            const selectoresNo = [
                'button:has-text("No")',
                'button:has-text("NO")',
                '.btn-secondary:has-text("No")',
                '.swal2-cancel',
                'button[class*="cancel"]',
                'button[class*="secondary"]'
            ];
            console.log('   🔍 Verificando si apareció modal de campos faltantes...');
            for (const selector of selectoresNo) {
                try {
                    const botonNo = await this.page.$(selector);
                    if (botonNo && await botonNo.isVisible()) {
                        const texto = await botonNo.textContent() || '';
                        console.log(`   ⚠️ MODAL DETECTADO - Campos obligatorios faltantes`);
                        console.log(`   🔄 Haciendo clic en "No" para procesar campos faltantes: "${texto}"`);
                        await botonNo.click();
                        await this.page.waitForTimeout(2000);
                        return {
                            aparecio: true,
                            botonPresionado: 'no',
                            camposFaltantes: true
                        };
                    }
                }
                catch (err) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }
            // Si no encontramos "No", buscar "Sí" (significa que todo está completo)
            const selectoresSi = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                '.btn-primary:has-text("Sí")',
                '.swal2-confirm'
            ];
            for (const selector of selectoresSi) {
                try {
                    const botonSi = await this.page.$(selector);
                    if (botonSi && await botonSi.isVisible()) {
                        console.log(`   ✅ Modal de confirmación - Todos los campos completos, avanzando...`);
                        await botonSi.click();
                        await this.page.waitForTimeout(2000);
                        return {
                            aparecio: true,
                            botonPresionado: 'si',
                            camposFaltantes: false
                        };
                    }
                }
                catch (err) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }
            // No apareció ningún modal
            console.log('   ℹ️ No se detectó modal de confirmación');
            return {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            };
        }
        catch (error) {
            console.log('   ⚠️ Error manejando modal:', error.message);
            return {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            };
        }
    }
    async finalizar() {
        console.log('\n📊 Generando reporte final...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rutaReporte = path.join(__dirname, '../data', `mvp_hibrido_${timestamp}.json`);
        await fs.writeFile(rutaReporte, JSON.stringify(this.resultado, null, 2), 'utf-8');
        console.log(`✅ Reporte guardado en: ${rutaReporte}`);
    }
    calcularEstadisticas() {
        const pasosCompletados = this.resultado.pasosCompletados || [];
        const tiempoTotal = this.resultado.tiempoTotal;
        // Calcular estadísticas basadas en pasosCompletados reales
        this.resultado.estadisticas.totalPasos = pasosCompletados.length;
        this.resultado.estadisticas.totalCampos = pasosCompletados.reduce((total, paso) => total + paso.camposEncontrados, 0);
        this.resultado.estadisticas.camposCompletados = pasosCompletados.reduce((total, paso) => total + paso.camposCompletados, 0);
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
    async limpiarRecursos() {
        try {
            if (this.page)
                await this.page.close();
            if (this.browser)
                await this.browser.close();
        }
        catch (error) {
            console.error('Error al limpiar recursos:', error);
        }
    }
}
exports.MVPHibrido = MVPHibrido;
async function ejecutarMVPHibrido(configuracionNombre = 'demo') {
    console.log(' INICIANDO MVP HÍBRIDO CORFO');
    console.log('============================');
    const configuracion = (0, configuraciones_1.obtenerConfiguracion)(configuracionNombre);
    const mvp = new MVPHibrido(configuracion);
    const resultado = await mvp.ejecutar();
    console.log('\n📈 RESUMEN FINAL MVP HÍBRIDO');
    console.log('===============================');
    console.log(`⏱️ Tiempo total: ${resultado.tiempoTotal} segundos (${(resultado.tiempoTotal / 60).toFixed(1)} minutos)`);
    console.log(`📊 Pasos completados: ${resultado.estadisticas.totalPasos}`);
    console.log(`📝 Campos encontrados: ${resultado.estadisticas.totalCampos}`);
    console.log(`✅ Campos completados: ${resultado.estadisticas.camposCompletados}`);
    console.log(` Porcentaje de éxito: ${resultado.estadisticas.porcentajeExito}%`);
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
        }
        else {
            console.log('\n❌ MVP HÍBRIDO FALLÓ');
            process.exit(1);
        }
    })
        .catch((error) => {
        console.error('❌ Error fatal en MVP híbrido:', error);
        process.exit(1);
    });
}

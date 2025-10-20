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
const cacheInteligente_1 = require("./cacheInteligente");
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
        // 🎯 DETECCIÓN POR SLICK-SLIDER (CORFO)
        const deteccionSlick = await this.detectarPorSlickSlider();
        if (deteccionSlick.confianza && deteccionSlick.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionSlick };
        }
        // Detectar tipos especiales de página
        estructura.esPaginaConfirmacion = await this.esPaginaConfirmacion();
        estructura.esPaginaBorradores = await this.esPaginaBorradores();
        // 🆕 NUEVO: Detectar desplegables
        estructura.desplegables = await this.detectarDesplegables();
        console.log(`📊 ESTRUCTURA DETECTADA:`);
        console.log(`   📈 Método: ${estructura.tipoDeteccion} (${estructura.confianza}% confianza)`);
        console.log(`   📋 Total pasos: ${estructura.totalPasos}`);
        console.log(`   📍 Paso actual: ${estructura.pasoActual}`);
        console.log(`   🎯 Es confirmación: ${estructura.esPaginaConfirmacion}`);
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
            // Verificar contadores específicos PERO solo si no estamos en un formulario normal
            const tieneContadoresCampos = textoCompleto.includes('campos obligatorios correctos') &&
                textoCompleto.includes('campos obligatorios incorrectos');
            // CRITERIO MUY ESTRICTO: Solo es confirmación si tiene contadores Y no tiene campos de entrada
            const tieneInputsActivos = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length > 20;
            // Si hay muchos inputs activos, NO puede ser página de confirmación
            if (tieneInputsActivos) {
                return false;
            }
            // Verificar que NO estamos en un formulario de pasos
            const tieneDesplegables = document.querySelectorAll('a[class*="collapsed"], a[class*="collapse"], a[data-toggle="collapse"]').length > 5;
            if (tieneDesplegables) {
                return false; // Si hay muchos desplegables, es un formulario de pasos, no confirmación
            }
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
            // 3. Tiene contadores Y no tiene inputs activos Y tiene botón de envío
            const tieneTextoConfirmacion = indicadoresConfirmacion.some(indicador => textoCompleto.includes(indicador));
            return urlEsConfirmacion || tieneTextoConfirmacion || (tieneContadoresCampos && !tieneInputsActivos && tieneBotonEnvio);
        });
    }
    async esPaginaBorradores() {
        return await this.page.evaluate(() => {
            const url = window.location.href;
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            // Verificar URL
            const urlEsBorradores = url.includes('Borradores') ||
                url.includes('borradores') ||
                url.includes('PostuladorBorradores');
            // Verificar texto específico
            const tieneTextoBorradores = textoCompleto.includes('borradores de postulación') ||
                textoCompleto.includes('nueva postulación') ||
                textoCompleto.includes('nueva postulacion');
            // Verificar botón "Nueva Postulación"
            const botonesNuevaPostulacion = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
            const tieneBotonNuevaPostulacion = Array.from(botonesNuevaPostulacion).some(boton => {
                const texto = boton.textContent?.toLowerCase() || '';
                const value = boton.value?.toLowerCase() || '';
                return texto.includes('nueva postulación') || texto.includes('nueva postulacion') ||
                    value.includes('nueva postulación') || value.includes('nueva postulacion');
            });
            // Verificar tabla de borradores
            const tieneTablaBorradores = !!document.querySelector('table') &&
                (textoCompleto.includes('identificador') ||
                    textoCompleto.includes('fecha inicio') ||
                    textoCompleto.includes('estado'));
            return urlEsBorradores || tieneTextoBorradores || tieneBotonNuevaPostulacion || tieneTablaBorradores;
        });
    }
    // 🆕 NUEVO: Detectar desplegables en el formulario - VERSIÓN FINAL (SOLO VISIBLES EN PASO ACTUAL)
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
            desplegables.forEach(d => {
                console.log(`     📂 "${d.titulo}" - ${d.isOpen ? 'Abierto' : 'Cerrado'} - Sub-desplegables: ${d.subDesplegablesCount}`);
            });
            return desplegables;
        }
        catch (error) {
            console.log('   ⚠️ Error detectando desplegables:', error.message);
            return [];
        }
    }
    // 🆕 NUEVO: Expandir secciones automáticamente - VERSIÓN FINAL (SOLO VISIBLES EN PASO ACTUAL)
    async expandirSeccionesAutomaticamente() {
        console.log('📂 Expandiendo secciones automáticamente (solo visibles en paso actual)...');
        try {
            const resultado = await this.page.evaluate(() => {
                let expandidas = 0;
                let yaAbiertas = 0;
                let totalDesplegables = 0;
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
                        !text.match(/^\d+$/) &&
                        !text.match(/^[A-Z\s]+$/) &&
                        !text.includes('PASO') &&
                        !text.includes('STEP') &&
                        !text.includes('PÁGINA') &&
                        !text.includes('PAGE');
                });
                totalDesplegables = desplegablesVisibles.length;
                // Solo expandir los que están cerrados (collapsed) - NO tocar los ya abiertos
                const headersCerrados = desplegablesVisibles.filter(header => header.classList.contains('collapsed'));
                headersCerrados.forEach(header => {
                    const text = header.textContent?.trim() || '';
                    if (text) {
                        // Hacer clic para expandir
                        header.click();
                        expandidas++;
                    }
                });
                // Contar los que ya están abiertos (NO hacer clic en estos)
                const headersAbiertos = desplegablesVisibles.filter(header => !header.classList.contains('collapsed'));
                headersAbiertos.forEach(header => {
                    const text = header.textContent?.trim() || '';
                    if (text) {
                        yaAbiertas++;
                    }
                });
                return { expandidas, yaAbiertas, totalDesplegables };
            });
            console.log(`   📊 Total desplegables detectados: ${resultado.totalDesplegables}`);
            console.log(`   ✅ Secciones ya abiertas (mantenidas): ${resultado.yaAbiertas}`);
            console.log(`   🔄 Secciones expandidas: ${resultado.expandidas}`);
            // Esperar a que se cargue el contenido expandido
            await this.page.waitForTimeout(2000);
            // Hacer scroll después de expandir para asegurar que todo esté visible
            console.log('   📜 Haciendo scroll después de expandir...');
            await this.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await this.page.waitForTimeout(1000);
            await this.page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await this.page.waitForTimeout(1000);
        }
        catch (error) {
            console.log('   ⚠️ Error expandiendo secciones:', error.message);
        }
    }
    // 🆕 NUEVO: Validar completitud del paso actual
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
    constructor(configuracion) {
        this.browser = null;
        this.page = null;
        this.tiempoInicio = 0;
        this.formularioCache = null;
        this.formUrl = '';
        this.configuracion = configuracion;
        this.cache = new cacheInteligente_1.CacheInteligente();
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
    async ejecutar() {
        console.log('🚀 INICIANDO MVP HÍBRIDO - ANÁLISIS + AUTOCOMPLETADO');
        console.log('='.repeat(60));
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
        }
        catch (error) {
            this.resultado.errores = this.resultado.errores || [];
            this.resultado.errores.push(error.message);
            console.error('❌ Error en MVP híbrido:', error);
        }
        finally {
            await this.limpiarRecursos();
        }
        this.resultado.tiempoTotal = Date.now() - this.tiempoInicio;
        this.calcularEstadisticas();
        return this.resultado;
    }
    async inicializar() {
        console.log('🔧 Inicializando navegador...');
        this.browser = await playwright_1.chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });
        this.page = await this.browser.newPage();
        this.page.setDefaultTimeout(60000); // Aumentar timeout
        this.page.setDefaultNavigationTimeout(90000); // Aumentar timeout de navegación
        // Configurar manejo de errores de página
        this.page.on('pageerror', (error) => {
            console.log('⚠️ Error de página:', error.message);
        });
        this.page.on('crash', () => {
            console.log('❌ La página se cerró inesperadamente');
        });
        console.log('✅ Navegador inicializado con configuración mejorada');
    }
    async solicitarUrlPorConsola() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        return new Promise((resolve, reject) => {
            rl.question('\n🎯 Ingresa la URL del formulario CORFO que deseas validar: ', (respuesta) => {
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
            console.log(`🎯 Navegando primero a la URL objetivo: ${urlEspecifica}`);
            await this.navegarAURLEspecifica(urlEspecifica);
        }
        else {
            // Si no hay URL, pedirla
            await this.mostrarConvocatoriasYSolicitar();
        }
        // Ahora realizar login desde el contexto actual (sin ir al home por defecto)
        await this.realizarLogin();
        // Asegurar que estemos en la URL objetivo autenticados (si la navegación de login nos movió)
        if (this.formUrl && !this.page.url().startsWith(this.formUrl)) {
            console.log(`🎯 Reafirmando URL objetivo autenticado: ${this.formUrl}`);
            await this.navegarAURLEspecifica(this.formUrl);
        }
        // Esperar estado estable antes de leer título/URL para evitar "Execution context was destroyed"
        await this.page.waitForLoadState('domcontentloaded').catch(() => { });
        await this.page.waitForLoadState('networkidle').catch(() => { });
        this.resultado.urlInicial = this.page?.url() || '';
        this.resultado.titulo = await this.page?.title() || '';
        console.log(`📋 Formulario accedido: ${this.resultado.titulo}`);
        console.log(`🔗 URL: ${this.resultado.urlInicial}`);
    }
    async procesarFormularioHibrido() {
        console.log('🔄 Iniciando procesamiento híbrido...');
        // 🎯 VERIFICAR PRIMERO SI ESTAMOS EN BORRADORES
        const detector = new DetectorEstructura(this.page);
        const esBorradores = await detector.esPaginaBorradores();
        if (esBorradores) {
            console.log('📁 PÁGINA DE BORRADORES DETECTADA - Navegando al formulario real...');
            console.log(`   🔗 URL actual: ${this.page.url()}`);
            await this.navegarDeBorradoresAFormulario();
            console.log(`   🔗 URL después de navegar: ${this.page.url()}`);
        }
        // 🎯 AHORA SÍ DETECTAR ESTRUCTURA EN EL FORMULARIO REAL
        console.log('🔍 DETECTANDO ESTRUCTURA DEL FORMULARIO REAL...');
        let estructura = await detector.detectarEstructuraCompleta();
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
        console.log(`   📂 Desplegables detectados: ${estructura.desplegables?.length || 0}`);
        // Debugging adicional para entender la detección
        if (estructura.esPaginaConfirmacion) {
            console.log(`⚠️ INVESTIGANDO DETECCIÓN DE CONFIRMACIÓN...`);
            const textoCompleto = await this.page.evaluate(() => document.body.textContent?.toLowerCase().substring(0, 800) || '');
            console.log(`   📄 Texto de la página (primeros 800 chars): "${textoCompleto}"`);
            console.log(`   🔗 URL completa: ${this.page.url()}`);
        }
        if (estructura.esPaginaConfirmacion) {
            // Verificación adicional: si hay muchos desplegables, NO es confirmación
            if (estructura.desplegables && estructura.desplegables.length > 10) {
                console.log('⚠️ CORRECCIÓN: Muchos desplegables detectados, NO es página de confirmación');
                estructura.esPaginaConfirmacion = false;
            }
            else {
                console.log('🎯 PÁGINA DE CONFIRMACIÓN DETECTADA - Procesando verificación...');
                console.log(`   🔗 URL: ${this.page.url()}`);
                console.log(`   📊 Desplegables: ${estructura.desplegables?.length || 0}`);
                console.log(`   📝 Total pasos: ${estructura.totalPasos}`);
                const detallesConfirmacion = await this.procesarPasoConfirmacion();
                // Agregar paso de confirmación a los resultados
                const pasoConfirmacion = {
                    numero: 1,
                    titulo: 'Confirmación Final',
                    url: this.page.url(),
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
        }
        // Solo procesar pasos si NO estamos en confirmación ni borradores
        if (!estructura.esPaginaConfirmacion && !estructura.esPaginaBorradores) {
            console.log(`🔄 INICIANDO BUCLE DE PROCESAMIENTO DE PASOS...`);
            while (hayMasPasos && pasoActual <= TOTAL_PASOS_ESPERADOS) {
                const tiempoInicioPaso = Date.now();
                console.log(`\n🔍 PROCESANDO PASO ${pasoActual}`);
                console.log('-'.repeat(40));
                try {
                    // Verificar que el navegador y página siguen activos
                    if (!this.browser || !this.page || this.page.isClosed()) {
                        console.log('❌ Navegador o página cerrados inesperadamente');
                        break;
                    }
                    // 🆕 NUEVO: Expandir secciones automáticamente antes de procesar
                    await detector.expandirSeccionesAutomaticamente();
                    const paso = await this.procesarPasoActual(pasoActual, tiempoInicioPaso);
                    this.resultado.pasosCompletados = this.resultado.pasosCompletados || [];
                    this.resultado.pasosCompletados.push(paso);
                    const tiempoTranscurrido = Date.now() - tiempoInicioPaso;
                    if (tiempoTranscurrido > tiempoLimitePorPaso) {
                        console.log('⚠️ Límite de tiempo por paso alcanzado, pasando al siguiente');
                    }
                    // 🆕 NUEVO: Validar completitud antes de avanzar
                    const esCompleto = await detector.validarCompletitudPaso();
                    if (!esCompleto) {
                        console.log('⚠️ Paso no completado al 100%, reintentando autocompletado...');
                        await this.reintentarAutocompletado();
                    }
                    hayMasPasos = await this.navegarAlSiguientePaso();
                    if (hayMasPasos) {
                        pasoActual++;
                        await this.page.waitForTimeout(2000);
                    }
                }
                catch (error) {
                    const errorMessage = error.message;
                    console.error(`❌ Error en paso ${pasoActual}:`, errorMessage);
                    // Verificar si es un error de navegador cerrado
                    if (errorMessage.includes('Target page, context or browser has been closed') ||
                        errorMessage.includes('Protocol error') ||
                        errorMessage.includes('Connection closed')) {
                        console.log('❌ Navegador cerrado inesperadamente, deteniendo procesamiento');
                        break;
                    }
                    this.resultado.errores = this.resultado.errores || [];
                    this.resultado.errores.push(`Paso ${pasoActual}: ${errorMessage}`);
                    // Intentar recuperación
                    try {
                        hayMasPasos = await this.navegarAlSiguientePaso();
                        if (hayMasPasos)
                            pasoActual++;
                    }
                    catch (recoveryError) {
                        console.log('❌ No se pudo recuperar, deteniendo procesamiento');
                        break;
                    }
                }
            }
        }
        else {
            console.log(`ℹ️ Salteando bucle principal: página especial detectada`);
        }
        console.log(`\n✅ Procesamiento híbrido completado: ${(this.resultado.pasosCompletados?.length || 0)} pasos`);
    }
    async procesarPasoActual(numeroPaso, tiempoInicio) {
        const titulo = await this.obtenerTituloPaso();
        const url = this.page.url();
        console.log(`📝 Paso ${numeroPaso}: "${titulo}"`);
        // 🎯 DETECCIÓN AUTOMÁTICA DE TIPO DE PASO
        const detector = new DetectorEstructura(this.page);
        const esConfirmacion = await detector.esPaginaConfirmacion();
        let campos = [];
        if (esConfirmacion) {
            console.log('🎯 PASO DE CONFIRMACIÓN DETECTADO AUTOMÁTICAMENTE - Realizando verificación final');
            campos = await this.procesarPasoConfirmacion();
        }
        else {
            console.log(`🔄 Procesando paso regular ${numeroPaso} - Autocompletando campos`);
            await this.expandirSeccionesAutomaticamente();
            campos = await this.extraerYCompletarCampos();
        }
        const tiempoTranscurrido = Date.now() - tiempoInicio;
        const paso = {
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
            console.log(`   🎯 Porcentaje de éxito: ${porcentajeExito}%`);
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
    async extraerYCompletarCampos() {
        const detalles = [];
        // Hacer scroll para activar contenido dinámico
        console.log(`   📜 Haciendo scroll para activar contenido dinámico...`);
        await this.page.evaluate(async () => {
            await new Promise((resolve) => {
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
        const frames = this.page.frames();
        console.log(`   🖼️ Frames encontrados: ${frames.length}`);
        let elementos = await this.page.$$('input, select, textarea');
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
                }
                catch (error) {
                    console.log(`   ⚠️ Error al acceder frame ${i + 1}:`, error.message);
                }
            }
        }
        // Buscar SOLO campos visibles e interactuables (NO hidden)
        if (elementos.length === 0) {
            console.log(`   🔍 Buscando campos visibles e interactuables...`);
            elementos = await this.page.$$('input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), input[type="tel"]:not([style*="display: none"]), input[type="number"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"]), input[type="radio"]:not([style*="display: none"]), input[type="checkbox"]:not([style*="display: none"])');
            console.log(`   📝 Campos visibles encontrados: ${elementos.length}`);
        }
        // Filtrar elementos que no son realmente visibles
        const elementosVisibles = [];
        for (const elemento of elementos) {
            try {
                const esVisible = await elemento.isVisible();
                const esInteractuable = await elemento.isEnabled();
                if (esVisible && esInteractuable) {
                    elementosVisibles.push(elemento);
                }
            }
            catch (error) {
                // Si hay error verificando visibilidad, incluir el elemento
                elementosVisibles.push(elemento);
            }
        }
        elementos = elementosVisibles;
        console.log(`   ✅ Campos realmente visibles e interactuables: ${elementos.length}`);
        console.log(`   🔍 Analizando ${elementos.length} elementos en total...`);
        for (const elemento of elementos) {
            try {
                // Verificar si el elemento es realmente interactuable
                const info = await this.obtenerInfoCampoMejorada(elemento);
                if (!info)
                    continue;
                const valorAsignado = await this.completarCampo(elemento, info);
                const detalle = {
                    etiqueta: info.etiqueta,
                    tipo: info.tipo,
                    valorAsignado: valorAsignado || '',
                    completado: !!valorAsignado,
                    esObligatorio: info.esObligatorio,
                    razonFallo: valorAsignado ? undefined : 'No se pudo determinar valor apropiado'
                };
                detalles.push(detalle);
                console.log(`     ✅ Campo procesado: ${info.tipo} - "${info.etiqueta}"`);
                await this.page.waitForTimeout(this.configuracion.tiempoEsperaEntreCampos);
            }
            catch (error) {
                continue;
            }
        }
        return detalles;
    }
    async obtenerInfoCampoMejorada(elemento) {
        try {
            return await elemento.evaluate((el) => {
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
                if (!isInteractuable && type !== 'hidden')
                    return null;
                let etiqueta = '';
                // Estrategia 1: Label con atributo 'for'
                if (id) {
                    const labelEl = document.querySelector(`label[for="${id}"]`);
                    if (labelEl)
                        etiqueta = labelEl.textContent?.trim() || '';
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
                // Estrategia 4: Texto anterior (hermanos anteriores) - MEJORADO
                if (!etiqueta) {
                    let previous = el.previousElementSibling;
                    let attempts = 0;
                    while (previous && !etiqueta && attempts < 5) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 200) {
                            // Filtrar texto que parece ser solo números o caracteres extraños
                            const esTextoValido = !text.match(/^\d+$/) && // No solo números
                                !text.match(/^[^\w\s]+$/) && // No solo símbolos
                                !text.match(/^[A-Z\s]+$/) && // No solo mayúsculas
                                text.length > 2 && // Mínimo 3 caracteres
                                !text.includes('*') && // No asteriscos
                                !text.includes('999999999999999'); // No números extraños
                            if (esTextoValido) {
                                etiqueta = text;
                                break;
                            }
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }
                // Estrategia 5: Contenedor padre - MEJORADO
                if (!etiqueta) {
                    const container = el.closest('div, td, th, li, fieldset');
                    if (container) {
                        const allText = container.textContent?.trim() || '';
                        const lines = allText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
                        if (lines.length > 0) {
                            // Buscar la primera línea que parezca una etiqueta válida
                            for (const line of lines) {
                                const esLineaValida = !line.match(/^\d+$/) && // No solo números
                                    !line.match(/^[^\w\s]+$/) && // No solo símbolos
                                    !line.match(/^[A-Z\s]+$/) && // No solo mayúsculas
                                    line.length > 2 && // Mínimo 3 caracteres
                                    line.length < 100 && // Máximo 100 caracteres
                                    !line.includes('*') && // No asteriscos
                                    !line.includes('999999999999999'); // No números extraños
                                if (esLineaValida) {
                                    etiqueta = line;
                                    break;
                                }
                            }
                        }
                    }
                }
                // Estrategia 6: Usar name o id como fallback - MEJORADO
                if (!etiqueta) {
                    // Limpiar name e id de caracteres extraños
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
                // Detección mejorada de campos obligatorios
                const esObligatorio = el.hasAttribute('required') ||
                    el.getAttribute('aria-required') === 'true' ||
                    el.getAttribute('aria-invalid') === 'true' ||
                    className.includes('required') ||
                    className.includes('mandatory') ||
                    className.includes('obligatorio') ||
                    className.includes('is-required') ||
                    className.includes('form-required') ||
                    (etiqueta.includes('*') || etiqueta.includes('obligatorio')) ||
                    (etiqueta.includes('(requerido)') || etiqueta.includes('(obligatorio)')) ||
                    // Verificar en el contenedor padre
                    (() => {
                        const contenedor = el.closest('div, fieldset, .form-group, .field');
                        if (contenedor) {
                            const textoContenedor = contenedor.textContent || '';
                            const classContenedor = contenedor.className || '';
                            return classContenedor.includes('required') ||
                                classContenedor.includes('mandatory') ||
                                textoContenedor.includes('*') ||
                                textoContenedor.includes('obligatorio');
                        }
                        return false;
                    })();
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
        }
        catch (error) {
            return null;
        }
    }
    async obtenerInfoCampo(elemento) {
        try {
            return await elemento.evaluate((el) => {
                const tagName = el.tagName.toLowerCase();
                const type = el.type || tagName;
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';
                let etiqueta = '';
                if (id) {
                    const label = document.querySelector(`label[for="${id}"]`);
                    if (label)
                        etiqueta = label.textContent?.trim() || '';
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
                // Detección mejorada de campos obligatorios
                const esObligatorio = el.hasAttribute('required') ||
                    el.getAttribute('aria-required') === 'true' ||
                    el.getAttribute('aria-invalid') === 'true' ||
                    className.includes('required') ||
                    className.includes('mandatory') ||
                    className.includes('obligatorio') ||
                    className.includes('is-required') ||
                    className.includes('form-required') ||
                    (etiqueta.includes('*') || etiqueta.includes('obligatorio')) ||
                    (etiqueta.includes('(requerido)') || etiqueta.includes('(obligatorio)')) ||
                    // Verificar en el contenedor padre
                    (() => {
                        const contenedor = el.closest('div, fieldset, .form-group, .field');
                        if (contenedor) {
                            const textoContenedor = contenedor.textContent || '';
                            const classContenedor = contenedor.className || '';
                            return classContenedor.includes('required') ||
                                classContenedor.includes('mandatory') ||
                                textoContenedor.includes('*') ||
                                textoContenedor.includes('obligatorio');
                        }
                        return false;
                    })();
                return {
                    tipo: type,
                    etiqueta: etiqueta || `Campo ${tagName}`,
                    esObligatorio
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
            // 🎯 DETECCIÓN DINÁMICA: Obtener información real del elemento
            const infoReal = await this.obtenerInfoRealElemento(elemento, info);
            const valor = this.generarValorDinamico(infoReal);
            if (!valor)
                return null;
            if (tipo === 'select' || tipo === 'select-one' || tipo === 'select-multiple') {
                return await this.manejarSelectDinamico(elemento, infoReal);
            }
            else if (tipo === 'checkbox') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    await elemento.check();
                }
                return 'true';
            }
            else if (tipo === 'radio') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    await elemento.click();
                }
                return 'seleccionado';
            }
            else if (['text', 'email', 'tel', 'url', 'password', 'textarea'].includes(tipo)) {
                // Limpiar campo antes de llenar
                await elemento.fill('');
                await elemento.fill(valor);
                return valor;
            }
            else if (tipo === 'number') {
                const numeroValor = typeof valor === 'string' ? valor.replace(/[^\d]/g, '') : valor;
                await elemento.fill('');
                await elemento.fill(numeroValor);
                return numeroValor;
            }
            else if (tipo === 'date') {
                await elemento.fill('');
                await elemento.fill('2024-12-31');
                return '2024-12-31';
            }
            return null;
        }
        catch (error) {
            console.log(`     ⚠️ Error completando campo ${info.etiqueta}:`, error.message);
            return null;
        }
    }
    // 🎯 NUEVO: Manejar selects dinámicamente
    async manejarSelectDinamico(elemento, infoReal) {
        try {
            const opciones = infoReal.opciones || [];
            const esMultiple = infoReal.esMultiple || false;
            const etiqueta = (infoReal.etiqueta || '').toLowerCase();
            const contexto = infoReal.contexto || {};
            console.log(`     🔍 Analizando select: "${etiqueta}" (${opciones.length} opciones, múltiple: ${esMultiple})`);
            if (opciones.length === 0) {
                console.log(`     ⚠️ Select sin opciones`);
                return null;
            }
            // Filtrar opciones válidas (no placeholders)
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
                !opt.text.toLowerCase().includes('seleccione una') &&
                !opt.text.toLowerCase().includes('por favor'));
            console.log(`     📋 Opciones válidas encontradas: ${opcionesValidas.length}`);
            if (opcionesValidas.length === 0) {
                console.log(`     ⚠️ No hay opciones válidas, intentando con todas las opciones`);
                // Si no hay opciones válidas, usar todas las disponibles
                const todasLasOpciones = opciones.filter((opt) => opt.value && opt.value !== '' && !opt.disabled);
                if (todasLasOpciones.length > 0) {
                    const opcionSeleccionada = todasLasOpciones[0];
                    await elemento.selectOption(opcionSeleccionada.value);
                    console.log(`     ✅ Select completado (fallback): "${opcionSeleccionada.text}"`);
                    return opcionSeleccionada.text;
                }
                return null;
            }
            // Selección inteligente basada en contexto
            let opcionSeleccionada = null;
            // 1. Buscar por palabras clave en el contexto
            const textoCompleto = `${etiqueta} ${contexto.textoAnterior} ${contexto.textoContenedor}`.toLowerCase();
            if (textoCompleto.includes('región') || textoCompleto.includes('region')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('metropolitana') ||
                    opt.text.toLowerCase().includes('santiago') ||
                    opt.text.toLowerCase().includes('valparaíso') ||
                    opt.text.toLowerCase().includes('biobío'));
            }
            else if (textoCompleto.includes('sector') || textoCompleto.includes('aplicación') || textoCompleto.includes('impacto')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('tecnología') ||
                    opt.text.toLowerCase().includes('innovación') ||
                    opt.text.toLowerCase().includes('medio ambiente') ||
                    opt.text.toLowerCase().includes('sustentabilidad'));
            }
            else if (textoCompleto.includes('tamaño') || textoCompleto.includes('tamano')) {
                opcionSeleccionada = opcionesValidas.find((opt) => opt.text.toLowerCase().includes('mediana') ||
                    opt.text.toLowerCase().includes('pequeña') ||
                    opt.text.toLowerCase().includes('grande'));
            }
            // 2. Si no se encontró por contexto, usar la primera opción válida
            if (!opcionSeleccionada) {
                opcionSeleccionada = opcionesValidas[0];
            }
            // 3. Seleccionar la opción
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
            console.log(`     ⚠️ Error manejando select:`, error.message);
            return null;
        }
    }
    // 🎯 NUEVO: Obtener información real del elemento dinámicamente
    async obtenerInfoRealElemento(elemento, info) {
        try {
            const infoReal = await elemento.evaluate((el) => {
                const tagName = el.tagName.toLowerCase();
                const type = el.type || tagName;
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';
                const placeholder = el.placeholder || '';
                // Obtener todas las opciones si es un select
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
                // Obtener contexto del elemento (texto alrededor)
                const contexto = {
                    textoAnterior: '',
                    textoPosterior: '',
                    textoContenedor: ''
                };
                // Texto anterior
                let prev = el.previousElementSibling;
                let attempts = 0;
                while (prev && !contexto.textoAnterior && attempts < 3) {
                    const text = prev.textContent?.trim();
                    if (text && text.length > 2 && text.length < 100) {
                        contexto.textoAnterior = text;
                    }
                    prev = prev.previousElementSibling;
                    attempts++;
                }
                // Texto del contenedor
                const container = el.closest('div, fieldset, td, th, li');
                if (container) {
                    contexto.textoContenedor = container.textContent?.trim() || '';
                }
                return {
                    tagName,
                    type,
                    id,
                    name,
                    className,
                    placeholder,
                    opciones,
                    contexto,
                    esMultiple: el.multiple || false,
                    esRequired: el.hasAttribute('required'),
                    esDisabled: el.disabled,
                    esReadonly: el.readOnly
                };
            });
            return {
                ...info,
                ...infoReal,
                etiquetaOriginal: info.etiqueta
            };
        }
        catch (error) {
            console.log(`     ⚠️ Error obteniendo info real del elemento:`, error.message);
            return info;
        }
    }
    // 🎯 NUEVO: Generar valor dinámico basado en información real
    generarValorDinamico(infoReal) {
        const etiqueta = (infoReal.etiqueta || '').toLowerCase();
        const tipo = infoReal.type?.toLowerCase() || '';
        const contexto = infoReal.contexto || {};
        const opciones = infoReal.opciones || [];
        // Para selects, retornar null para que se maneje en completarCampo
        if (tipo === 'select' || tipo === 'select-one' || tipo === 'select-multiple') {
            return null;
        }
        // Mapeo inteligente basado en contexto y etiqueta
        const textoCompleto = `${etiqueta} ${contexto.textoAnterior} ${contexto.textoContenedor}`.toLowerCase();
        // Detección por palabras clave
        if (textoCompleto.includes('rut') || textoCompleto.includes('run')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RUT;
        }
        else if (textoCompleto.includes('email') || textoCompleto.includes('correo') || textoCompleto.includes('mail')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.EMAIL;
        }
        else if (textoCompleto.includes('teléfono') || textoCompleto.includes('telefono') || textoCompleto.includes('fono')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TELEFONO;
        }
        else if (textoCompleto.includes('nombre') && !textoCompleto.includes('proyecto')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NOMBRE;
        }
        else if (textoCompleto.includes('apellido')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.APELLIDO_PATERNO;
        }
        else if (textoCompleto.includes('razón social') || textoCompleto.includes('empresa') || textoCompleto.includes('organización')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RAZON_SOCIAL;
        }
        else if (textoCompleto.includes('proyecto') || textoCompleto.includes('iniciativa')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
        }
        else if (textoCompleto.includes('descripción') || textoCompleto.includes('resumen') || textoCompleto.includes('detalle')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
        }
        else if (textoCompleto.includes('objetivo') || textoCompleto.includes('meta')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
        }
        else if (textoCompleto.includes('monto') || textoCompleto.includes('costo') || textoCompleto.includes('presupuesto') || textoCompleto.includes('valor')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
        }
        else if (textoCompleto.includes('duración') || textoCompleto.includes('duracion') || textoCompleto.includes('meses')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
        }
        else if (textoCompleto.includes('dirección') || textoCompleto.includes('direccion') || textoCompleto.includes('domicilio')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DIRECCION_CALLE;
        }
        else if (textoCompleto.includes('comuna') || textoCompleto.includes('ciudad')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.COMUNA;
        }
        else if (textoCompleto.includes('región') || textoCompleto.includes('region')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.REGION;
        }
        else if (textoCompleto.includes('empleos') || textoCompleto.includes('empleo') || textoCompleto.includes('trabajos')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
        }
        else if (textoCompleto.includes('año') || textoCompleto.includes('año') || textoCompleto.includes('year')) {
            return '2024';
        }
        else if (textoCompleto.includes('fecha') || textoCompleto.includes('date')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.FECHA;
        }
        else if (textoCompleto.includes('porcentaje') || textoCompleto.includes('porcentaje') || textoCompleto.includes('%')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.PORCENTAJE;
        }
        else if (textoCompleto.includes('cantidad') || textoCompleto.includes('número') || textoCompleto.includes('numero')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
        }
        // Mapeo por tipo de campo
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
    generarValorParaCampo(info) {
        const etiqueta = info.etiqueta.toLowerCase();
        const tipo = info.tipo.toLowerCase();
        // Mapeo más agresivo para asegurar 100% de completitud
        if (etiqueta.includes('rut') || etiqueta.includes('run')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RUT;
        }
        else if (etiqueta.includes('email') || etiqueta.includes('correo') || etiqueta.includes('mail')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.email;
        }
        else if (etiqueta.includes('teléfono') || etiqueta.includes('telefono') || etiqueta.includes('fono')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.telefono;
        }
        else if (etiqueta.includes('nombre') && !etiqueta.includes('proyecto')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.nombre;
        }
        else if (etiqueta.includes('apellido')) {
            return this.configuracion.preferenciasAutocompletado.datosPersonales.apellido;
        }
        else if (etiqueta.includes('razón social') || etiqueta.includes('empresa') || etiqueta.includes('organización')) {
            return this.configuracion.preferenciasAutocompletado.datosEmpresa.razonSocial;
        }
        else if (etiqueta.includes('proyecto') || etiqueta.includes('iniciativa')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
        }
        else if (etiqueta.includes('descripción') || etiqueta.includes('resumen') || etiqueta.includes('detalle')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
        }
        else if (etiqueta.includes('monto') || etiqueta.includes('costo') || etiqueta.includes('presupuesto') || etiqueta.includes('valor')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
        }
        else if (etiqueta.includes('dirección') || etiqueta.includes('direccion') || etiqueta.includes('domicilio')) {
            return 'Av. Principal 123, Santiago, Chile';
        }
        else if (etiqueta.includes('comuna') || etiqueta.includes('ciudad')) {
            return 'Santiago';
        }
        else if (etiqueta.includes('región') || etiqueta.includes('region')) {
            return 'Metropolitana';
        }
        else if (etiqueta.includes('objetivo') || etiqueta.includes('meta')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
        }
        else if (etiqueta.includes('duración') || etiqueta.includes('duracion') || etiqueta.includes('meses')) {
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
        }
        else if (etiqueta.includes('empleos') || etiqueta.includes('empleo') || etiqueta.includes('trabajos')) {
            return '5';
        }
        else if (etiqueta.includes('año') || etiqueta.includes('año') || etiqueta.includes('year')) {
            return '2024';
        }
        else if (etiqueta.includes('fecha') || etiqueta.includes('date')) {
            return '2024-12-31';
        }
        else if (etiqueta.includes('porcentaje') || etiqueta.includes('porcentaje') || etiqueta.includes('%')) {
            return '50';
        }
        else if (etiqueta.includes('cantidad') || etiqueta.includes('número') || etiqueta.includes('numero')) {
            return '10';
        }
        // Mapeo por tipo de campo - más agresivo
        switch (tipo) {
            case 'email': return this.configuracion.preferenciasAutocompletado.datosPersonales.email;
            case 'tel': return this.configuracion.preferenciasAutocompletado.datosPersonales.telefono;
            case 'number': return '100';
            case 'date': return '2024-12-31';
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
        const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
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
                const loginFrame2 = frames2.find(frame => frame.url().includes('login.corfo.cl'));
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
    async navegarAFormulario() {
        console.log('🔍 Navegando al formulario CORFO...');
        await this.page.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'domcontentloaded'
        });
        // Scroll para cargar formularios
        await this.page.evaluate(async () => {
            await new Promise((resolve) => {
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
        await this.page.waitForTimeout(3000);
        const masInfoLink = await this.page.$('div.foot-caja_result a');
        if (masInfoLink) {
            const href = await masInfoLink.getAttribute('href');
            const urlCompleta = href.startsWith('http') ? href : `https://www.corfo.cl${href}`;
            console.log(`📋 Accediendo a convocatoria: ${urlCompleta}`);
            await this.page.goto(urlCompleta, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(2000);
            // Buscar botón "Inicia tu postulación"
            const botonIniciar = await this.page.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación")');
            if (botonIniciar) {
                console.log('🚀 Haciendo clic en "Inicia tu postulación"...');
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { }),
                    botonIniciar.click()
                ]);
                await this.page.waitForTimeout(5000);
                // Verificar si estamos en la página de borradores
                const urlActual = this.page.url();
                console.log(`📍 URL después del login: ${urlActual}`);
                if (urlActual.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                }
                else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            }
        }
    }
    async navegarAURLEspecifica(url) {
        console.log(`🎯 Navegando directamente a la URL: ${url}`);
        try {
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
                const urlActual = this.page.url();
                console.log(`📍 URL después del clic: ${urlActual}`);
                if (urlActual.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                }
                else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            }
            else {
                console.log('✅ Ya estamos en el formulario (no se encontró botón de inicio)');
            }
        }
        catch (error) {
            console.error(`❌ Error navegando a URL específica: ${error}`);
            throw error;
        }
    }
    async mostrarConvocatoriasYSolicitar() {
        console.log('🔍 Esperando URL del formulario...');
        const url = await this.solicitarUrlPorConsola();
        console.log(`✅ URL ingresada: ${url}`);
        await this.navegarAURLEspecifica(url);
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
        console.log('🎯 Navegando al primer paso real del formulario...');
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
                    const camposReales = await this.page.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
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
            const camposExistentes = await this.page.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
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
                const camposPostScroll = await this.page.$$('input[type="radio"], input[type="text"], input[type="email"], select, textarea');
                console.log(`📝 Campos encontrados después del scroll: ${camposPostScroll.length}`);
            }
        }
    }
    async obtenerTituloPaso() {
        try {
            const titulo = await this.page.$eval('h1, h2, h3', el => el.textContent?.trim());
            return titulo || `Paso ${Date.now()}`;
        }
        catch {
            return `Paso ${Date.now()}`;
        }
    }
    async expandirSeccionesAutomaticamente() {
        const expandibles = await this.page.$$('[data-toggle="collapse"], .accordion-toggle, .collapse-toggle');
        for (const elemento of expandibles.slice(0, 5)) {
            try {
                await elemento.click();
                await this.page.waitForTimeout(500);
            }
            catch {
                continue;
            }
        }
    }
    // 🆕 NUEVO: Reintentar autocompletado para campos faltantes - VERSIÓN AGRESIVA
    async reintentarAutocompletado() {
        console.log('🔄 Reintentando autocompletado de campos faltantes...');
        try {
            // Buscar TODOS los campos visibles (no solo obligatorios)
            const camposFaltantes = await this.page.evaluate(() => {
                const campos = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
                const faltantes = [];
                campos.forEach(campo => {
                    const element = campo;
                    // Verificar si está vacío
                    const estaVacio = !element.value || element.value.trim() === '';
                    const tieneError = element.classList.contains('error') ||
                        element.classList.contains('invalid') ||
                        element.getAttribute('aria-invalid') === 'true';
                    // Incluir TODOS los campos vacíos o con error (no solo obligatorios)
                    if (estaVacio || tieneError) {
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
                        faltantes.push({
                            selector: element.id ? `#${element.id}` : `[name="${element.name}"]`,
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
                                const tipoInput = await elemento.evaluate(el => el.type);
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
                    // Manejar modal de confirmación si aparece
                    const modalManejado = await this.manejarModalConfirmacion();
                    if (modalManejado) {
                        await this.page.waitForTimeout(2000);
                    }
                    console.log('   ✅ Navegación exitosa');
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
    async manejarModalConfirmacion() {
        try {
            await this.page.waitForTimeout(1000);
            const selectoresConfirmar = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                'button:has-text("OK")',
                'button:has-text("Aceptar")',
                'button:has-text("Continuar")',
                '.btn-primary:has-text("Sí")',
                '.btn-success:has-text("Sí")',
                '.swal2-confirm',
                '.swal2-actions button'
            ];
            for (const selector of selectoresConfirmar) {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    console.log(`   ✅ Confirmando modal: ${selector}`);
                    await boton.click();
                    await this.page.waitForTimeout(2000);
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            console.log('   ⚠️ Error manejando modal:', error.message);
            return false;
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
        const tiempoTotal = this.resultado.tiempoTotal || 0;
        this.resultado.estadisticas.totalPasos = pasosCompletados.length;
        this.resultado.estadisticas.totalCampos = pasosCompletados.reduce((total, paso) => total + paso.camposEncontrados, 0);
        this.resultado.estadisticas.camposCompletados = pasosCompletados.reduce((total, paso) => total + paso.camposCompletados, 0);
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
    async limpiarRecursos() {
        try {
            console.log('🧹 Limpiando recursos...');
            if (this.page && !this.page.isClosed()) {
                await this.page.close().catch(() => {
                    console.log('⚠️ Error cerrando página (ya cerrada)');
                });
            }
            if (this.browser && this.browser.isConnected()) {
                await this.browser.close().catch(() => {
                    console.log('⚠️ Error cerrando navegador (ya cerrado)');
                });
            }
            console.log('✅ Recursos limpiados correctamente');
        }
        catch (error) {
            console.error('⚠️ Error al limpiar recursos:', error.message);
        }
    }
}
exports.MVPHibrido = MVPHibrido;
/**
 * Realiza el login a CORFO
 */
async function realizarLogin(page) {
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
    }
    catch (error) {
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
            const user = process.env.CORFO_USER;
            const pass = process.env.CORFO_PASS;
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
    }
    catch (error) {
        console.log('No se encontró el enlace de Clave Corfo, usando interfaz tradicional con iframe...');
        // Si no está la nueva interfaz, debe ser la interfaz antigua con iframe
        // Los campos están en un iframe, procedemos con la lógica antigua
        const frames = await page.frames();
        const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
        if (loginFrame) {
            await loginFrame.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
            await loginFrame.fill('#rut', process.env.CORFO_USER);
            await loginFrame.fill('#pass', process.env.CORFO_PASS);
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
        }
        else {
            throw new Error('No se encontró ni la nueva interfaz ni el iframe de login');
        }
    }
    // Si llegamos aquí, significa que hubo un error inesperado
    throw new Error('Error inesperado en el proceso de login');
}
/**
 * Implementa el flujo completo de análisis y autocompletado del formulario
 */
async function implementarFlujoCompleto(page, configuracion) {
    console.log('🚀 INICIANDO FLUJO COMPLETO MVP HÍBRIDO');
    const inicioTiempo = Date.now();
    let totalCamposProcesados = 0;
    let totalCamposAutocompletados = 0;
    const pasosProcesados = [];
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
                }
                else {
                    console.log(`   ℹ️ No hay más pasos disponibles o llegamos al final`);
                }
            }
            else {
                console.log(`   ℹ️ Límite de pasos alcanzado (${limitePasos})`);
                hayMasPasos = false;
            }
        }
        // Calcular tiempo total
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60; // en minutos
        const resultado = {
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
    }
    catch (error) {
        console.error('❌ Error en flujo completo:', error.message);
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60;
        return {
            exito: false,
            mensaje: `Error: ${error.message}`,
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
async function navegarAlFormularioReal(page) {
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
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { }),
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
    }
    catch (error) {
        console.error(`❌ Error navegando al formulario: ${error.message}`);
        return false;
    }
}
/**
 * Busca el primer enlace "Más Información" con scroll inteligente
 */
async function buscarPrimerMasInformacion(page) {
    // Hacer scroll para cargar contenido dinámico
    await page.evaluate(async () => {
        await new Promise((resolve) => {
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
async function buscarBotonIniciarPostulacion(page) {
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
async function crearNuevaPostulacion(page) {
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
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => { }),
                    botonNueva.click()
                ]);
                await page.waitForTimeout(3000);
                console.log('   ✅ Nueva postulación creada');
                return true;
            }
            else {
                console.log('   ⚠️ No se encontró botón "Nueva Postulación"');
                return false;
            }
        }
        else {
            console.log('   ℹ️ No estamos en página de borradores, continuando...');
            return true;
        }
    }
    catch (error) {
        console.error(`   ❌ Error creando nueva postulación: ${error.message}`);
        return false;
    }
}
/**
 * Elimina postulaciones existentes si las hay
 */
async function eliminarPostulacionesExistentes(page) {
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
        }
        else {
            console.log('   ℹ️ No hay postulaciones previas para eliminar');
        }
    }
    catch (error) {
        console.log(`   ⚠️ Error eliminando postulaciones: ${error.message}`);
    }
}
/**
 * Verifica que tenemos acceso al formulario real
 */
async function verificarAccesoFormulario(page) {
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
                    const element = el;
                    return element.type !== 'hidden' &&
                        !element.className.includes('search') &&
                        !element.name?.includes('search');
                }).length;
            });
            console.log(`   ✅ Campos relevantes: ${camposRelevantes}`);
            return camposRelevantes > 0;
        }
        return false;
    }
    catch (error) {
        console.error(`   ❌ Error verificando formulario: ${error.message}`);
        return false;
    }
}
/**
 * Obtiene el nombre del paso actual
 */
async function obtenerNombrePaso(page) {
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
    }
    catch (error) {
        return `Paso ${Date.now()}`;
    }
}
/**
 * Hace scroll completo de la página para cargar todo el contenido
 */
async function scrollCompletoPagina(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
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
async function extraerCamposPaso(page) {
    try {
        const campos = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el;
                // Verificar visibilidad
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    rect.width > 0 && rect.height > 0 &&
                    parseFloat(style.opacity) > 0;
                if (!isVisible || element.type === 'hidden')
                    return null;
                // Buscar etiqueta
                let label = '';
                // Por ID
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl)
                        label = labelEl.textContent?.trim() || '';
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
                    label = element.placeholder || '';
                }
                // Determinar tipo
                let tipo = element.tagName.toLowerCase();
                if (tipo === 'input') {
                    tipo = element.type || 'text';
                }
                // Opciones para selects
                let opciones = [];
                if (element.tagName.toLowerCase() === 'select') {
                    const selectEl = element;
                    opciones = Array.from(selectEl.options).map(option => option.text);
                }
                // Determinar si es requerido - Detección mejorada
                const required = element.hasAttribute('required') ||
                    element.getAttribute('aria-required') === 'true' ||
                    element.getAttribute('aria-invalid') === 'true' ||
                    element.classList.contains('required') ||
                    element.classList.contains('mandatory') ||
                    element.classList.contains('obligatorio') ||
                    element.classList.contains('is-required') ||
                    element.classList.contains('form-required') ||
                    (label.includes('*') || label.includes('obligatorio')) ||
                    (label.includes('(requerido)') || label.includes('(obligatorio)')) ||
                    // Verificar en el contenedor padre
                    (() => {
                        const contenedor = element.closest('div, fieldset, .form-group, .field');
                        if (contenedor) {
                            const textoContenedor = contenedor.textContent || '';
                            const classContenedor = contenedor.className || '';
                            return classContenedor.includes('required') ||
                                classContenedor.includes('mandatory') ||
                                textoContenedor.includes('*') ||
                                textoContenedor.includes('obligatorio');
                        }
                        return false;
                    })();
                return {
                    tipo,
                    label: label || `Campo ${element.tagName} sin etiqueta`,
                    nombre: element.name || element.id || `campo_${Date.now()}_${Math.random()}`,
                    requerido: required,
                    opciones: opciones.length > 0 ? opciones : undefined
                };
            }).filter(item => item !== null);
        });
        // Integrar detección dinámica de campos obligatorios (si está habilitada)
        let camposObligatoriosDinamicos = [];
        try {
            // Por defecto, la detección dinámica está habilitada para mejorar la detección
            // Se puede desactivar pasando deteccionDinamica: false en la configuración
            const habilitarDeteccionDinamica = true; // Valor por defecto
            if (habilitarDeteccionDinamica) {
                console.log('🔍 MVP: Iniciando detección dinámica de campos obligatorios...');
                camposObligatoriosDinamicos = await detectarCamposObligatoriosMVP(page, campos);
            }
            else {
                console.log('⚠️ MVP: Detección dinámica deshabilitada, usando solo detección estática');
            }
            // Marcar campos como obligatorios según la detección dinámica
            if (camposObligatoriosDinamicos.length > 0) {
                let camposMarcados = 0;
                campos.forEach(campo => {
                    const identificadores = [campo.nombre, campo.label].filter(Boolean);
                    const esObligatorioDinamico = identificadores.some(id => camposObligatoriosDinamicos.includes(id));
                    if (esObligatorioDinamico && !campo.requerido) {
                        console.log(`🎯 MVP: Campo "${campo.label || campo.nombre}" marcado como obligatorio por detección dinámica`);
                        campo.requerido = true;
                        camposMarcados++;
                    }
                });
                console.log(`✅ MVP: ${camposMarcados} campos adicionales marcados como obligatorios`);
            }
            // Estadísticas finales
            const totalObligatorios = campos.filter(c => c.requerido).length;
            const totalCampos = campos.length;
            const porcentajeObligatorios = totalCampos > 0 ? Math.round((totalObligatorios / totalCampos) * 100) : 0;
            console.log(`📊 MVP: ANÁLISIS DE CAMPOS OBLIGATORIOS COMPLETADO:`);
            console.log(`   📝 Total campos encontrados: ${totalCampos}`);
            console.log(`   ⚠️ Campos obligatorios detectados: ${totalObligatorios} (${porcentajeObligatorios}%)`);
            console.log(`   🔍 Detección dinámica encontró: ${camposObligatoriosDinamicos.length} adicionales`);
            if (porcentajeObligatorios > 50) {
                console.log('🎯 MVP: Alto porcentaje de campos obligatorios detectado');
            }
            else if (porcentajeObligatorios > 25) {
                console.log('📋 MVP: Porcentaje moderado de campos obligatorios');
            }
            else {
                console.log('📝 MVP: Pocos campos obligatorios detectados');
            }
        }
        catch (error) {
            console.error('MVP: Error en detección dinámica de campos obligatorios:', error);
        }
        return campos;
    }
    catch (error) {
        console.error('Error extrayendo campos:', error);
        return [];
    }
}
/**
 * Detecta campos obligatorios intentando avanzar sin llenar y viendo qué campos se marcan en rojo
 * Adaptado de extraerFormularios.ts pero optimizado para MVP
 */
async function detectarCamposObligatoriosMVP(page, campos) {
    console.log('🔍 MVP: Detectando campos obligatorios dinámicamente...');
    try {
        // Buscar el botón siguiente con múltiples estrategias
        let botonSiguiente = null;
        // Selectores específicos para botones de navegación
        const selectoresBotones = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'button:has-text("siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            '.btn-next',
            '[class*="next"]',
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Continuar")',
            'button:has-text("CONTINUAR")',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")',
            'button:has-text("Enviar")',
            'button:has-text("ENVIAR")'
        ];
        for (const selector of selectoresBotones) {
            try {
                botonSiguiente = await page.$(selector);
                if (botonSiguiente) {
                    console.log(`✅ MVP: Botón encontrado con selector: ${selector}`);
                    break;
                }
            }
            catch (error) {
                continue;
            }
        }
        // Si no encuentra con selectores, buscar por texto
        if (!botonSiguiente) {
            const todosLosBotones = await page.$$('button, input[type="submit"], input[type="button"], a');
            for (const boton of todosLosBotones) {
                try {
                    const texto = await boton.textContent();
                    const value = await boton.getAttribute('value');
                    const textoBuscar = (texto || value || '').toLowerCase();
                    if (textoBuscar.includes('siguiente') ||
                        textoBuscar.includes('continuar') ||
                        textoBuscar.includes('next') ||
                        textoBuscar.includes('submit') ||
                        textoBuscar.includes('enviar')) {
                        botonSiguiente = boton;
                        console.log(`✅ MVP: Botón encontrado por texto: "${texto || value}"`);
                        break;
                    }
                }
                catch (error) {
                    continue;
                }
            }
        }
        if (!botonSiguiente) {
            console.log('❌ MVP: No se encontró botón de navegación, usando detección estática únicamente');
            return [];
        }
        // Hacer scroll al botón si es necesario
        await botonSiguiente.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        // Verificar si el botón está visible
        const esVisible = await botonSiguiente.isVisible();
        if (!esVisible) {
            console.log('❌ MVP: El botón encontrado no es visible, usando detección estática únicamente');
            return [];
        }
        try {
            // Hacer clic en el botón sin llenar nada para provocar validación
            await page.evaluate((element) => {
                if (element && 'click' in element && typeof element.click === 'function') {
                    element.click();
                }
            }, botonSiguiente);
            await page.waitForTimeout(2000); // Esperar a que aparezcan los errores
        }
        catch (error) {
            console.log('⚠️ MVP: Error al hacer clic en botón, posible navegación:', error.message);
            return [];
        }
        // Buscar campos que ahora tienen indicadores de error
        const camposConError = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el;
                // Verificar diferentes formas de indicar error
                const tieneClaseError = element.classList.contains('error') ||
                    element.classList.contains('invalid') ||
                    element.classList.contains('has-error') ||
                    element.classList.contains('field-error') ||
                    element.classList.contains('is-invalid') ||
                    element.classList.contains('form-error');
                // Verificar si el campo o su contenedor tiene estilos de error
                const style = window.getComputedStyle(element);
                const borderRojo = style.borderColor.includes('rgb(255') ||
                    style.borderColor.includes('red') ||
                    style.borderColor.includes('#f') ||
                    style.borderColor.includes('#e') ||
                    style.borderColor.includes('#d') ||
                    style.outlineColor.includes('red');
                // Verificar si hay un mensaje de error cercano
                const contenedor = element.closest('div, fieldset, .form-group, .field') || element.parentElement;
                const hayMensajeError = contenedor?.querySelector('.error-message, .field-error, .invalid-feedback, [class*="error"], .help-block');
                // Verificar aria-invalid
                const ariaInvalid = element.getAttribute('aria-invalid') === 'true';
                if (tieneClaseError || borderRojo || hayMensajeError || ariaInvalid) {
                    return {
                        name: element.name || element.id || '',
                        id: element.id || '',
                        placeholder: element.placeholder || '',
                        type: element.type || element.tagName.toLowerCase()
                    };
                }
                return null;
            }).filter(el => el !== null);
        });
        // Extraer los nombres/identificadores de los campos con error
        const nombresCamposObligatorios = [];
        camposConError.forEach(campo => {
            if (campo) {
                // Buscar coincidencia con los campos que tenemos
                const campoCoincidente = campos.find(c => (c.name && c.name === campo.name) ||
                    (c.id && c.id === campo.id) ||
                    (campo.placeholder && c.etiqueta?.includes(campo.placeholder)) ||
                    (c.nombre && c.nombre === campo.name) ||
                    (c.nombre && c.nombre === campo.id));
                if (campoCoincidente) {
                    const identificador = campoCoincidente.name || campoCoincidente.id || campoCoincidente.nombre || campoCoincidente.etiqueta;
                    if (identificador && !nombresCamposObligatorios.includes(identificador)) {
                        nombresCamposObligatorios.push(identificador);
                    }
                }
            }
        });
        console.log(`✅ MVP: Campos obligatorios detectados dinámicamente: ${nombresCamposObligatorios.length}`);
        if (nombresCamposObligatorios.length > 0) {
            console.log(`   Campos: ${nombresCamposObligatorios.join(', ')}`);
        }
        return nombresCamposObligatorios;
    }
    catch (error) {
        console.error('MVP: Error al detectar campos obligatorios:', error);
        return [];
    }
}
/**
 * Autocompleta los campos de un paso
 */
/**
 * Obtiene el valor apropiado para un campo basado en su tipo y etiqueta
 */
function obtenerValorParaCampo(campo) {
    const label = campo.label?.toLowerCase() || '';
    const tipo = campo.tipo?.toLowerCase() || '';
    // Mapeo específico basado en la etiqueta
    if (label.includes('título') && label.includes('proyecto')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
    }
    else if (label.includes('resumen') && label.includes('proyecto')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
    }
    else if (label.includes('objetivo') && label.includes('general')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
    }
    else if (label.includes('rut')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.RUT;
    }
    else if (label.includes('teléfono') || label.includes('telefono')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TELEFONO;
    }
    else if (label.includes('mail') || label.includes('email') || label.includes('correo')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.EMAIL;
    }
    else if (label.includes('duración') && label.includes('mes')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
    }
    else if (label.includes('costo') || label.includes('monto')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
    }
    else if (label.includes('empleos') || label.includes('empleo')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
    }
    else if (label.includes('renta') || label.includes('salario')) {
        return extraerFormularios_1.CAMPOS_CORFO_MAPPING.MONEDA;
    }
    // Mapeo por tipo de campo
    switch (tipo) {
        case 'textarea':
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
        case 'text':
            if (label.includes('nombre'))
                return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NOMBRE;
            if (label.includes('apellido'))
                return extraerFormularios_1.CAMPOS_CORFO_MAPPING.APELLIDO_PATERNO;
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
        case 'email':
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.EMAIL;
        case 'tel':
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TELEFONO;
        case 'number':
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.NUMERO;
        case 'date':
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.FECHA;
        case 'select':
            return null; // Se maneja en completarCampo seleccionando primera opción
        case 'radio':
        case 'checkbox':
            return 'true'; // Se convertirá a check
        default:
            return extraerFormularios_1.CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
    }
}
async function autocompletarCamposPaso(page, campos, configuracion) {
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
        }
        catch (error) {
            console.log(`   ⚠️ Error completando campo ${campo.label}: ${error.message}`);
        }
    }
    return camposCompletados;
}
/**
 * Completa un campo específico
 */
async function completarCampo(page, campo, valor) {
    try {
        const selectores = [
            `[name="${campo.nombre}"]`,
            `#${campo.nombre}`,
            `[id="${campo.nombre}"]`
        ];
        let elemento = null;
        for (const selector of selectores) {
            elemento = await page.$(selector);
            if (elemento)
                break;
        }
        if (!elemento)
            return false;
        const tipoElemento = await elemento.evaluate(el => el.tagName.toLowerCase());
        if (tipoElemento === 'select') {
            // Para selects, elegir primera opción válida o por texto
            if (typeof valor === 'string' && campo.opciones) {
                const opcionCoincidente = campo.opciones.find(opt => opt.toLowerCase().includes(valor.toLowerCase()) ||
                    valor.toLowerCase().includes(opt.toLowerCase()));
                if (opcionCoincidente) {
                    await elemento.selectOption({ label: opcionCoincidente });
                }
                else {
                    await elemento.selectOption({ index: 1 }); // Primera opción válida
                }
            }
            else {
                await elemento.selectOption({ index: 1 });
            }
        }
        else if (tipoElemento === 'input') {
            const tipoInput = await elemento.evaluate(el => el.type);
            if (tipoInput === 'radio') {
                await elemento.check();
            }
            else if (tipoInput === 'checkbox') {
                await elemento.check();
            }
            else {
                await elemento.fill(String(valor));
            }
        }
        else if (tipoElemento === 'textarea') {
            await elemento.fill(String(valor));
        }
        await page.waitForTimeout(100); // Pequeña pausa entre campos
        return true;
    }
    catch (error) {
        return false;
    }
}
/**
 * Navega al siguiente paso del formulario
 */
async function navegarAlSiguientePaso(page) {
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
                }
                catch (error) {
                    console.log(`     ⚠️ Error en navegación: ${error.message}`);
                    return false;
                }
            }
        }
        console.log('     ℹ️ No se encontró botón para siguiente paso');
        return false;
    }
    catch (error) {
        console.log(`     ❌ Error navegando: ${error.message}`);
        return false;
    }
}
/**
 * Maneja modal de confirmación
 */
async function manejarModalConfirmacion(page) {
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
    }
    catch (error) {
        return false;
    }
}
async function ejecutarMVPHibrido(configuracionNombre = 'demo') {
    console.log('🎯 INICIANDO MVP HÍBRIDO CORFO');
    console.log('============================');
    const configuracion = (0, configuraciones_1.obtenerConfiguracion)(configuracionNombre);
    const mvp = new MVPHibrido(configuracion);
    const resultado = await mvp.ejecutar();
    console.log('\n📈 RESUMEN FINAL MVP HÍBRIDO');
    console.log('===============================');
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

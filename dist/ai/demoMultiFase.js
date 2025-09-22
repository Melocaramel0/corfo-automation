"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoAnalisisMultiFase = demoAnalisisMultiFase;
exports.demoSimplificado = demoSimplificado;
const agenteMultiFase_1 = require("./agenteMultiFase");
const extraerFormularios_1 = require("../scraping/extraerFormularios");
const configuraciones_1 = require("./configuraciones");
const path_1 = __importDefault(require("path"));
/**
 * Demo completo del sistema de análisis multi-fase de formularios CORFO
 * - Extrae el primer formulario disponible
 * - Navega por todas las fases
 * - Detecta campos obligatorios automáticamente
 * - Mide tiempos de autocompletado y validación
 * - Genera reporte detallado
 * - NO envía el formulario (solo testing)
 */
async function demoAnalisisMultiFase() {
    console.log('🎯 DEMO ANÁLISIS MULTI-FASE CORFO');
    console.log('=================================');
    console.log('Este demo demuestra las capacidades del agente para:');
    console.log('✅ Extraer formularios multi-fase automáticamente');
    console.log('✅ Detectar campos obligatorios por validación visual');
    console.log('✅ Autocompletar campos inteligentemente');
    console.log('✅ Validar y revisar cada fase');
    console.log('✅ Medir tiempos de procesamiento');
    console.log('✅ Generar reportes detallados');
    console.log('⚠️ NO envía el formulario (solo testing)\n');
    try {
        // Paso 1: Extraer formulario multi-fase
        console.log('🔄 PASO 1: Extrayendo formulario multi-fase de CORFO...');
        console.log('---------------------------------------------------');
        const formulario = await (0, extraerFormularios_1.extraerPrimerFormularioMultiFase)();
        if (!formulario) {
            console.error('❌ No se pudo extraer ningún formulario');
            return;
        }
        console.log('✅ Formulario extraído exitosamente');
        console.log(`📋 Título: ${formulario.titulo}`);
        console.log(`🔗 URL: ${formulario.url}`);
        console.log(`📊 Fases encontradas: ${formulario.totalFases}`);
        console.log(`📝 Total de campos: ${formulario.campos.length}`);
        console.log(`⚠️ Campos marcados como obligatorios: ${formulario.campos.filter(c => c.requerido).length}`);
        // Mostrar resumen de cada fase
        console.log('\n📋 RESUMEN POR FASES:');
        formulario.fases.forEach(fase => {
            const obligatorios = fase.campos.filter(c => c.requerido).length;
            console.log(`   Fase ${fase.numero}: "${fase.titulo}" - ${fase.campos.length} campos (${obligatorios} obligatorios)`);
        });
        // Paso 2: Configurar agente para demo
        console.log('\n🤖 PASO 2: Configurando agente para análisis...');
        console.log('----------------------------------------------');
        const configuracion = (0, configuraciones_1.obtenerConfiguracion)('demo');
        const agente = new agenteMultiFase_1.AgenteMultiFase(configuracion);
        console.log(`✅ Agente configurado en modo: demo`);
        console.log(`⚡ Debug habilitado: ${configuracion.modoDebug}`);
        console.log(`🎯 Configuración optimizada para: demostraciones balanceadas`);
        // Paso 3: Procesar formulario multi-fase
        console.log('\n🚀 PASO 3: Procesando formulario multi-fase...');
        console.log('==============================================');
        const resultado = await agente.procesarFormularioMultiFase(formulario);
        // Paso 4: Generar reporte JSON
        console.log('\n📄 PASO 4: Generando reporte detallado...');
        console.log('==========================================');
        const fechaHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const rutaReporte = path_1.default.join(__dirname, '../data', `reporte_multifase_${fechaHora}.json`);
        await agente.generarReporteJSON(resultado, rutaReporte);
        // Paso 5: Análisis final y conclusiones
        console.log('\n🎯 PASO 5: ANÁLISIS FINAL Y CONCLUSIONES');
        console.log('=======================================');
        // Calcular velocidad de procesamiento
        const velocidadCamposPorSegundo = (resultado.formulario.totalCampos / (resultado.tiempos.tiempoTotalProcesamiento / 1000)).toFixed(1);
        const velocidadFasesPorMinuto = (resultado.formulario.totalFases / (resultado.tiempos.tiempoTotalProcesamiento / 60000)).toFixed(1);
        console.log('\n📈 MÉTRICAS DE RENDIMIENTO:');
        console.log(`   🚀 Velocidad: ${velocidadCamposPorSegundo} campos/segundo`);
        console.log(`   📋 Velocidad: ${velocidadFasesPorMinuto} fases/minuto`);
        console.log(`   ⏱️ Tiempo total: ${(resultado.tiempos.tiempoTotalProcesamiento / 1000).toFixed(2)} segundos`);
        console.log(`   🎯 Éxito general: ${resultado.resumenGeneral.porcentajeExito}%`);
        console.log('\n🏆 CAPACIDADES DEMOSTRADAS:');
        console.log('   ✅ Extracción automática de formularios multi-fase');
        console.log('   ✅ Navegación inteligente entre fases');
        console.log('   ✅ Detección precisa de campos obligatorios');
        console.log('   ✅ Autocompletado contextual por tipo de campo');
        console.log('   ✅ Validación exhaustiva por fase');
        console.log('   ✅ Medición de rendimiento en tiempo real');
        console.log('   ✅ Generación de reportes detallados');
        console.log('   ✅ Análisis de optimización y recomendaciones');
        console.log('\n💡 VALOR PARA CORFO:');
        console.log('   🎯 Reducción significativa de tiempo de revisión');
        console.log('   📊 Análisis automático de calidad de formularios');
        console.log('   ⚡ Procesamiento rápido y eficiente');
        console.log('   🔍 Detección automática de patrones y errores');
        console.log('   📈 Métricas objetivas de rendimiento');
        console.log('   🛡️ Validación sin riesgo (no envía formularios)');
        console.log('\n✅ DEMO COMPLETADO EXITOSAMENTE');
        console.log(`📄 Reporte detallado guardado en: ${rutaReporte}`);
        console.log('🎉 El agente está listo para implementación en producción');
    }
    catch (error) {
        console.error('\n❌ ERROR EN EL DEMO:', error);
        console.log('\n🔧 POSIBLES SOLUCIONES:');
        console.log('   1. Verificar conexión a internet');
        console.log('   2. Revisar credenciales de acceso a CORFO');
        console.log('   3. Confirmar que el sitio de CORFO esté disponible');
        console.log('   4. Verificar que haya formularios disponibles');
        throw error;
    }
}
/**
 * Demo simplificado que usa un formulario de ejemplo (sin web scraping)
 * Útil para testing rápido del sistema de análisis
 */
async function demoSimplificado() {
    console.log('🎯 DEMO SIMPLIFICADO - SIN WEB SCRAPING');
    console.log('======================================');
    console.log('Este demo usa un formulario de ejemplo para mostrar capacidades\n');
    // Crear formulario de ejemplo multi-fase
    const formularioEjemplo = {
        titulo: 'Formulario de Ejemplo Multi-Fase',
        url: 'https://ejemplo.cl/formulario',
        descripcion: 'Formulario de demostración con múltiples fases',
        campos: [
            // Fase 1: Información básica
            { tipo: 'text', label: 'Nombre de la empresa', nombre: 'empresa', requerido: true },
            { tipo: 'text', label: 'RUT empresa', nombre: 'rut_empresa', requerido: true },
            { tipo: 'email', label: 'Email contacto', nombre: 'email', requerido: true },
            { tipo: 'tel', label: 'Teléfono', nombre: 'telefono', requerido: true },
            // Fase 2: Proyecto
            { tipo: 'text', label: 'Nombre del proyecto', nombre: 'proyecto', requerido: true },
            { tipo: 'textarea', label: 'Descripción del proyecto', nombre: 'descripcion', requerido: true },
            { tipo: 'number', label: 'Monto solicitado', nombre: 'monto', requerido: true },
            { tipo: 'date', label: 'Fecha inicio', nombre: 'fecha_inicio', requerido: true },
            // Fase 3: Documentación
            { tipo: 'file', label: 'Proyecto detallado', nombre: 'archivo_proyecto', requerido: true },
            { tipo: 'file', label: 'Estados financieros', nombre: 'estados_financieros', requerido: false },
            { tipo: 'checkbox', label: 'Acepto términos', nombre: 'acepta_terminos', requerido: true },
            { tipo: 'select', label: 'Región', nombre: 'region', requerido: true, opciones: ['Metropolitana', 'Valparaíso', 'Biobío'] }
        ],
        fases: [
            {
                numero: 1,
                titulo: 'Información Básica de la Empresa',
                campos: [
                    { tipo: 'text', label: 'Nombre de la empresa', nombre: 'empresa', requerido: true },
                    { tipo: 'text', label: 'RUT empresa', nombre: 'rut_empresa', requerido: true },
                    { tipo: 'email', label: 'Email contacto', nombre: 'email', requerido: true },
                    { tipo: 'tel', label: 'Teléfono', nombre: 'telefono', requerido: true }
                ],
                esUltimaFase: false
            },
            {
                numero: 2,
                titulo: 'Información del Proyecto',
                campos: [
                    { tipo: 'text', label: 'Nombre del proyecto', nombre: 'proyecto', requerido: true },
                    { tipo: 'textarea', label: 'Descripción del proyecto', nombre: 'descripcion', requerido: true },
                    { tipo: 'number', label: 'Monto solicitado', nombre: 'monto', requerido: true },
                    { tipo: 'date', label: 'Fecha inicio', nombre: 'fecha_inicio', requerido: true }
                ],
                esUltimaFase: false
            },
            {
                numero: 3,
                titulo: 'Documentación y Finalización',
                campos: [
                    { tipo: 'file', label: 'Proyecto detallado', nombre: 'archivo_proyecto', requerido: true },
                    { tipo: 'file', label: 'Estados financieros', nombre: 'estados_financieros', requerido: false },
                    { tipo: 'checkbox', label: 'Acepto términos', nombre: 'acepta_terminos', requerido: true },
                    { tipo: 'select', label: 'Región', nombre: 'region', requerido: true, opciones: ['Metropolitana', 'Valparaíso', 'Biobío'] }
                ],
                esUltimaFase: true
            }
        ],
        totalFases: 3
    };
    try {
        const configuracion = (0, configuraciones_1.obtenerConfiguracion)('demo');
        const agente = new agenteMultiFase_1.AgenteMultiFase(configuracion);
        console.log('🤖 Agente configurado en modo demo');
        console.log('🤖 Procesando formulario de ejemplo...');
        const resultado = await agente.procesarFormularioMultiFase(formularioEjemplo);
        // Generar reporte
        const fechaHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const rutaReporte = path_1.default.join(__dirname, '../data', `reporte_ejemplo_${fechaHora}.json`);
        await agente.generarReporteJSON(resultado, rutaReporte);
        console.log('\n✅ DEMO SIMPLIFICADO COMPLETADO');
        console.log(`📄 Reporte guardado en: ${rutaReporte}`);
    }
    catch (error) {
        console.error('❌ Error en demo simplificado:', error);
        throw error;
    }
}
// Función principal que permite elegir el tipo de demo
async function main() {
    const args = process.argv.slice(2);
    const tipoDemo = args[0] || 'completo';
    console.log('🎯 SISTEMA DE ANÁLISIS MULTI-FASE CORFO');
    console.log('======================================\n');
    if (tipoDemo === 'simple' || tipoDemo === 'simplificado') {
        await demoSimplificado();
    }
    else {
        await demoAnalisisMultiFase();
    }
}
// Ejecutar si se llama directamente
if (require.main === module) {
    main()
        .then(() => {
        console.log('\n🎉 Proceso completado exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    });
}

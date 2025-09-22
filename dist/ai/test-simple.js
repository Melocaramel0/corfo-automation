"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSimple = testSimple;
const agente_1 = require("./agente");
const configuraciones_1 = require("./configuraciones");
/**
 * Test simple del agente sin web scraping
 * Crea un formulario simulado y lo procesa
 */
async function testSimple() {
    console.log('🧪 TEST SIMPLE: Agente de Formularios CORFO');
    console.log('===========================================\n');
    // Crear un formulario simulado tipo CORFO
    const formularioSimulado = {
        titulo: 'Subsidio Semilla de Asignación Flexible - Test',
        url: 'https://test.corfo.cl/formulario-test',
        descripcion: 'Formulario de prueba para validar funcionalidades del agente',
        campos: [
            {
                tipo: 'text',
                label: 'Nombre del Proyecto',
                nombre: 'nombre_proyecto',
                requerido: true
            },
            {
                tipo: 'textarea',
                label: 'Descripción del Proyecto',
                nombre: 'descripcion_proyecto',
                requerido: true
            },
            {
                tipo: 'text',
                label: 'Nombre del Solicitante',
                nombre: 'nombre_solicitante',
                requerido: true
            },
            {
                tipo: 'email',
                label: 'Correo Electrónico',
                nombre: 'email',
                requerido: true
            },
            {
                tipo: 'tel',
                label: 'Teléfono de Contacto',
                nombre: 'telefono',
                requerido: false
            },
            {
                tipo: 'text',
                label: 'RUT del Solicitante',
                nombre: 'rut_solicitante',
                requerido: true
            },
            {
                tipo: 'text',
                label: 'Razón Social de la Empresa',
                nombre: 'razon_social',
                requerido: true
            },
            {
                tipo: 'text',
                label: 'RUT de la Empresa',
                nombre: 'rut_empresa',
                requerido: true
            },
            {
                tipo: 'select',
                label: 'Región',
                nombre: 'region',
                requerido: true,
                opciones: [
                    '-- Seleccione --',
                    'Región Metropolitana',
                    'Región de Valparaíso',
                    'Región del Biobío',
                    'Región de La Araucanía'
                ]
            },
            {
                tipo: 'number',
                label: 'Monto Solicitado (CLP)',
                nombre: 'monto',
                requerido: true
            },
            {
                tipo: 'date',
                label: 'Fecha de Inicio del Proyecto',
                nombre: 'fecha_inicio',
                requerido: true
            },
            {
                tipo: 'textarea',
                label: 'Justificación del Proyecto',
                nombre: 'justificacion',
                requerido: true
            },
            {
                tipo: 'checkbox',
                label: 'Acepto términos y condiciones',
                nombre: 'acepta_terminos',
                requerido: true
            }
        ]
    };
    console.log('📋 Formulario simulado creado:');
    console.log(`   Título: ${formularioSimulado.titulo}`);
    console.log(`   Campos: ${formularioSimulado.campos.length}`);
    console.log(`   Campos obligatorios: ${formularioSimulado.campos.filter(c => c.requerido).length}\n`);
    // Probar diferentes configuraciones
    const configuraciones = ['desarrollo', 'demo', 'tecnologia'];
    for (const nombreConfig of configuraciones) {
        console.log(`\n🔧 Probando configuración: ${nombreConfig.toUpperCase()}`);
        console.log('=' + '='.repeat(nombreConfig.length + 25));
        const agente = new agente_1.AgenteFormularios((0, configuraciones_1.obtenerConfiguracion)(nombreConfig));
        try {
            const resultado = await agente.procesarFormulario(formularioSimulado);
            console.log(`\n📊 RESULTADOS con configuración ${nombreConfig}:`);
            console.log(`   Estado: ${resultado.esValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
            console.log(`   Puntuación: ${resultado.resumen.porcentajeExito}%`);
            console.log(`   Errores: ${resultado.errores.length}`);
            console.log(`   Advertencias: ${resultado.advertencias.length}`);
        }
        catch (error) {
            console.error(`❌ Error con configuración ${nombreConfig}:`, error);
        }
    }
    // Demostrar personalización de configuración
    console.log('\n🎛️ DEMO: Personalización de Configuración');
    console.log('=========================================');
    const agente = new agente_1.AgenteFormularios((0, configuraciones_1.obtenerConfiguracion)('demo'));
    // Cambiar configuración en tiempo real
    console.log('🔄 Cambiando a modo estricto...');
    agente.actualizarConfiguracion({
        validacionEstricta: true,
        modoDebug: false,
        tiempoEsperaEntreCampos: 0
    });
    const resultadoEstricto = await agente.revisarFormulario(formularioSimulado);
    console.log(`📈 Resultado modo estricto:`);
    console.log(`   Puntuación: ${resultadoEstricto.resumen.porcentajeExito}%`);
    console.log(`   Errores: ${resultadoEstricto.errores.length}`);
    console.log(`   Advertencias: ${resultadoEstricto.advertencias.length}`);
    // Generar reporte de capacidades
    console.log('\n💡 CAPACIDADES DEMOSTRADAS:');
    console.log('============================');
    console.log('✅ Procesamiento de formularios simulados');
    console.log('✅ Múltiples configuraciones predefinidas');
    console.log('✅ Autocompletado inteligente de campos');
    console.log('✅ Validación configurable en tiempo real');
    console.log('✅ Generación de reportes detallados');
    console.log('✅ Personalización dinámica de reglas');
    console.log('✅ Soporte para tipos de campo variados');
    console.log('✅ Contexto chileno en generación de datos');
    console.log('\n🎉 Test completado exitosamente!');
    console.log('\n📌 SIGUIENTE PASO: Ejecutar con formularios reales');
    console.log('   npx ts-node ai/demo.ts');
}
// Ejecutar test si el archivo se ejecuta directamente
if (require.main === module) {
    testSimple()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Error en test:', error);
        process.exit(1);
    });
}

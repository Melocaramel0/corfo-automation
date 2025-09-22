"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ejecutarDemoCompleto = ejecutarDemoCompleto;
exports.mostrarCapacidadesMVP = mostrarCapacidadesMVP;
exports.mostrarEstadisticasCache = mostrarEstadisticasCache;
const mvpHibrido_1 = require("./mvpHibrido");
const cacheInteligente_1 = require("./cacheInteligente");
/**
 * DEMO DEL MVP HÍBRIDO CORFO
 *
 * Este demo muestra las capacidades del nuevo sistema híbrido
 * que combina análisis + autocompletado en una sola ejecución optimizada
 */
async function mostrarCapacidadesMVP() {
    console.log('🎯 DEMO MVP HÍBRIDO CORFO');
    console.log('='.repeat(50));
    console.log('');
    console.log('📋 CAPACIDADES DEL MVP:');
    console.log('✅ Análisis + Autocompletado simultáneo');
    console.log('✅ Login automático a CORFO');
    console.log('✅ Navegación inteligente entre fases');
    console.log('✅ Sistema de cache para acelerar futuras ejecuciones');
    console.log('✅ Manejo automático de modales de confirmación');
    console.log('✅ Reportes detallados en tiempo real');
    console.log('✅ NO envía formularios (solo testing)');
    console.log('');
    console.log('🎯 OBJETIVO: Completar formularios en 15-20 minutos');
    console.log('⚡ CON CACHE: 5-8 minutos para formularios conocidos');
    console.log('');
}
async function mostrarEstadisticasCache() {
    console.log('📊 ESTADÍSTICAS DEL CACHE INTELIGENTE');
    console.log('-'.repeat(40));
    try {
        const cache = new cacheInteligente_1.CacheInteligente();
        await cache.inicializar();
        const stats = cache.obtenerEstadisticas();
        if (stats.totalFormularios > 0) {
            console.log(`📁 Total formularios en cache: ${stats.totalFormularios}`);
            console.log(`⏱️ Tiempo promedio estimado: ${stats.tiempoPromedioEstimado.toFixed(1)} minutos`);
            console.log(`🎯 Tasa de éxito promedio: ${stats.tasaExitoPromedio.toFixed(1)}%`);
            if (stats.formulariosMasUsados.length > 0) {
                console.log('');
                console.log('🏆 FORMULARIOS MÁS USADOS:');
                stats.formulariosMasUsados.forEach((form, index) => {
                    console.log(`   ${index + 1}. ${form.titulo} (${form.usos} usos)`);
                });
            }
        }
        else {
            console.log('📁 Cache vacío - Primera ejecución');
            console.log('💡 Después de la primera ejecución, el cache acelerará futuras operaciones');
        }
        console.log('');
    }
    catch (error) {
        console.log('⚠️ No se pudo acceder al cache (normal en primera ejecución)');
        console.log('');
    }
}
async function ejecutarDemoCompleto() {
    console.clear();
    // Mostrar capacidades
    await mostrarCapacidadesMVP();
    // Mostrar estadísticas de cache
    await mostrarEstadisticasCache();
    // Preguntar al usuario si quiere continuar
    console.log('🚀 ¿EJECUTAR MVP HÍBRIDO?');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   • Asegúrate de tener credenciales CORFO en tu archivo .env');
    console.log('   • El proceso tomará aproximadamente 15-20 minutos');
    console.log('   • NO se enviarán formularios reales (solo testing)');
    console.log('   • Se generará un reporte detallado en /data/');
    console.log('');
    console.log('💡 CONFIGURACIONES DISPONIBLES:');
    console.log('   • demo: Configuración balanceada con debug (recomendado)');
    console.log('   • velocidad: Configuración de máxima velocidad');
    console.log('   • produccion: Configuración de producción con validación estricta');
    console.log('');
    // Obtener configuración del usuario (por defecto 'demo')
    const args = process.argv.slice(2);
    const configuracion = args[0] || 'demo';
    console.log(`🎯 Ejecutando con configuración: ${configuracion}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('INICIANDO EJECUCIÓN DEL MVP HÍBRIDO');
    console.log('='.repeat(60));
    console.log('');
    try {
        const tiempoInicio = Date.now();
        // Ejecutar MVP híbrido
        const resultado = await (0, mvpHibrido_1.ejecutarMVPHibrido)(configuracion);
        const tiempoTotal = Date.now() - tiempoInicio;
        // Mostrar resumen final
        console.log('');
        console.log('🎉 DEMO COMPLETADO EXITOSAMENTE');
        console.log('='.repeat(50));
        console.log('');
        console.log('📊 RESUMEN DE LA EJECUCIÓN:');
        console.log(`   ⏱️  Tiempo total: ${(tiempoTotal / 1000 / 60).toFixed(1)} minutos`);
        console.log(`   📋 Pasos completados: ${resultado.estadisticas.totalPasos}`);
        console.log(`   📝 Campos procesados: ${resultado.estadisticas.totalCampos}`);
        console.log(`   ✅ Campos completados: ${resultado.estadisticas.camposCompletados}`);
        console.log(`   🎯 Tasa de éxito: ${resultado.estadisticas.porcentajeExito}%`);
        console.log(`   ⚡ Velocidad: ${resultado.estadisticas.velocidadCamposPorSegundo} campos/segundo`);
        console.log('');
        if (resultado.errores && resultado.errores.length > 0) {
            console.log('⚠️ ERRORES ENCONTRADOS:');
            resultado.errores.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            console.log('');
        }
        console.log('💾 ARCHIVOS GENERADOS:');
        console.log(`   📄 Reporte detallado: /data/mvp_hibrido_${(resultado.fechaEjecucion || new Date().toISOString()).replace(/[:.]/g, '-')}.json`);
        console.log(`   💾 Cache actualizado: /data/cache/`);
        console.log('');
        console.log('🔄 PRÓXIMAS EJECUCIONES:');
        console.log('   • Serán más rápidas gracias al cache inteligente');
        console.log('   • El sistema aprende de cada ejecución');
        console.log('   • Los formularios similares se procesarán en 5-8 minutos');
        console.log('');
        console.log('📈 VALOR DEMOSTRADO:');
        console.log('   ✅ Reducción significativa de tiempo vs análisis profundo');
        console.log('   ✅ Procesamiento inteligente y adaptativo');
        console.log('   ✅ Sistema de cache que mejora con el uso');
        console.log('   ✅ Reportes detallados para análisis posterior');
        console.log('   ✅ Seguridad: no envía formularios reales');
        console.log('');
        // Mostrar estadísticas actualizadas del cache
        console.log('📊 CACHE ACTUALIZADO:');
        await mostrarEstadisticasCache();
        console.log('🎯 ¡MVP HÍBRIDO LISTO PARA PRODUCCIÓN!');
        console.log('');
    }
    catch (error) {
        console.error('');
        console.error('❌ ERROR EN LA DEMOSTRACIÓN:');
        console.error(`   ${error.message}`);
        console.error('');
        console.error('🔧 POSIBLES SOLUCIONES:');
        console.error('   1. Verificar credenciales en archivo .env');
        console.error('   2. Comprobar conexión a internet');
        console.error('   3. Verificar que CORFO esté disponible');
        console.error('   4. Reintentar en unos minutos');
        console.error('');
        process.exit(1);
    }
}
async function mostrarAyuda() {
    console.log('MVP HÍBRIDO CORFO - COMANDOS DISPONIBLES');
    console.log('='.repeat(45));
    console.log('');
    console.log('🚀 EJECUTAR MVP:');
    console.log('   npm run mvp-hibrido                    # Configuración demo (recomendado)');
    console.log('   npm run mvp-hibrido-velocidad          # Configuración de velocidad máxima');
    console.log('   npm run mvp-hibrido-produccion         # Configuración de producción');
    console.log('');
    console.log('📊 DEMOS Y ANÁLISIS:');
    console.log('   npm run demo-mvp                       # Este demo completo');
    console.log('   npm run analisis-profundo              # Análisis profundo (60+ min)');
    console.log('   npm run demo                           # Demo del sistema anterior');
    console.log('');
    console.log('⚙️ CONFIGURACIÓN:');
    console.log('   • Asegurar credenciales CORFO en .env');
    console.log('   • CORFO_USER=tu_rut');
    console.log('   • CORFO_PASS=tu_contraseña');
    console.log('');
    console.log('💡 COMPARACIÓN DE SISTEMAS:');
    console.log('   📊 Análisis Profundo:    60+ minutos, análisis completo');
    console.log('   ⚡ MVP Híbrido:          15-20 minutos, análisis + completado');
    console.log('   🚀 MVP con Cache:        5-8 minutos, para formularios conocidos');
    console.log('');
}
// Función principal
async function main() {
    const args = process.argv.slice(2);
    // Si se pasa --help, mostrar ayuda
    if (args.includes('--help') || args.includes('-h')) {
        await mostrarAyuda();
        return;
    }
    // Ejecutar demo completo
    await ejecutarDemoCompleto();
}
// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch((error) => {
        console.error('Error fatal en demo MVP:', error);
        process.exit(1);
    });
}

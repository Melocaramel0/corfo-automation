import { extraerPrimerFormulario } from '../scraping/extraerFormularios';
import { AgenteFormularios } from './agente';

/**
 * Demostración del agente de formularios CORFO
 * Extrae el primer formulario disponible y lo procesa con el agente
 */
async function demo() {
    console.log('🚀 DEMO: Agente de Formularios CORFO');
    console.log('=====================================\n');
    
    try {
        // Paso 1: Extraer el primer formulario de CORFO
        console.log('📥 Paso 1: Extrayendo el primer formulario disponible...');
        const formulario = await extraerPrimerFormulario();
        
        if (!formulario) {
            console.log('❌ No se pudo extraer ningún formulario. Terminando demo.');
            return;
        }
        
        console.log(`✅ Formulario extraído: ${formulario.titulo}`);
        console.log(`📊 Campos encontrados: ${formulario.campos.length}\n`);
        
        // Paso 2: Configurar el agente
        console.log('⚙️ Paso 2: Configurando el agente...');
        const agente = new AgenteFormularios({
            modoDebug: true,
            tiempoEsperaEntreCampos: 1000, // 1 segundo entre campos para demo
            validacionEstricta: false,
            generarDatosFicticios: true,
            idioma: 'es',
            reglas: {
                camposObligatorios: true,
                formatoEmail: true,
                formatoTelefono: true,
                formatoRut: true,
                longitudMinima: true,
                valorNumericoEnRango: true
            },
            preferenciasAutocompletado: {
                usarDatosReales: false, // Usar datos de prueba
                datosPersonales: {
                    nombre: 'María Elena',
                    apellido: 'González Silva',
                    email: 'maria.gonzalez@empresa.cl',
                    telefono: '+56987654321',
                    rut: '15.234.567-8'
                },
                datosEmpresa: {
                    razonSocial: 'Innovación Tecnológica SpA',
                    rut: '76.555.777-9',
                    giro: 'Desarrollo de software y consultoría en innovación',
                    direccion: 'Av. Las Condes 5500, Oficina 1201, Las Condes, Santiago'
                }
            }
        });
        
        console.log('✅ Agente configurado correctamente\n');
        
        // Paso 3: Procesar el formulario completo
        console.log('🔄 Paso 3: Procesando formulario (autocompletar + revisar)...');
        const resultado = await agente.procesarFormulario(formulario);
        
        // Paso 4: Mostrar resultados finales
        console.log('\n📈 RESULTADOS FINALES');
        console.log('======================');
        console.log(`Estado del formulario: ${resultado.esValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
        console.log(`Puntuación: ${resultado.resumen.porcentajeExito}% de éxito`);
        console.log(`Campos procesados: ${resultado.resumen.camposValidados}/${resultado.resumen.totalCampos}`);
        
        if (resultado.errores.length > 0) {
            console.log(`\n⚠️ Se encontraron ${resultado.errores.length} errores que requieren atención`);
        }
        
        if (resultado.advertencias.length > 0) {
            console.log(`\n💡 Se generaron ${resultado.advertencias.length} recomendaciones de mejora`);
        }
        
        // Paso 5: Demostrar flexibilidad del agente
        console.log('\n🔧 Paso 5: Demostrando configurabilidad del agente...');
        
        // Cambiar configuración para ser más estricto
        agente.actualizarConfiguracion({
            validacionEstricta: true,
            tiempoEsperaEntreCampos: 0,
            preferenciasAutocompletado: {
                ...agente.obtenerConfiguracion().preferenciasAutocompletado,
                usarDatosReales: true
            }
        });
        
        console.log('⚙️ Configuración actualizada a modo estricto');
        console.log('🔄 Reprocesando con nueva configuración...');
        
        const resultadoEstricto = await agente.revisarFormulario(formulario);
        
        console.log(`\n📊 Resultado con validación estricta:`);
        console.log(`   Puntuación: ${resultadoEstricto.resumen.porcentajeExito}%`);
        console.log(`   Errores: ${resultadoEstricto.errores.length}`);
        console.log(`   Advertencias: ${resultadoEstricto.advertencias.length}`);
        
        console.log('\n🎉 Demo completada exitosamente!');
        console.log('\n💡 CARACTERÍSTICAS DESTACADAS:');
        console.log('   ✅ Extracción automática del primer formulario disponible');
        console.log('   ✅ Autocompletado inteligente basado en contexto chileno');
        console.log('   ✅ Validación configurable con reglas específicas para CORFO');
        console.log('   ✅ Generación de reportes detallados');
        console.log('   ✅ Configuración flexible adaptable a diferentes necesidades');
        console.log('   ✅ Preparado para escalabilidad futura');
        
    } catch (error) {
        console.error('❌ Error durante la demo:', error);
        console.log('\n📝 NOTAS:');
        console.log('   - Asegúrate de tener las credenciales CORFO configuradas en .env');
        console.log('   - Verifica tu conexión a internet');
        console.log('   - Algunos formularios pueden requerir autenticación adicional');
    }
}

// Ejecutar demo si el archivo se ejecuta directamente
if (require.main === module) {
    demo()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}

export { demo }; 
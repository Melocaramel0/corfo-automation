import { CampoFormulario, Formulario } from '../scraping/extraerFormularios';
import { ConfiguracionAgente, ReglasValidacion, ResultadoValidacion, ErrorValidacion, AdvertenciaValidacion } from './tipos';
import { generarValorCampo } from './generadorDatos';
import { validarFormulario } from './validador';

/**
 * Agente flexible para autocompletar y revisar formularios de CORFO
 */
export class AgenteFormularios {
    private configuracion: ConfiguracionAgente;
    
    constructor(configuracion?: Partial<ConfiguracionAgente>) {
        this.configuracion = {
            // Configuración por defecto
            modoDebug: true,
            tiempoEsperaEntreCampos: 500,
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
                usarDatosReales: false,
                datosPersonales: {
                    nombre: 'Juan',
                    apellido: 'Pérez',
                    email: 'juan.perez@ejemplo.cl',
                    telefono: '+56912345678',
                    rut: '12345678-9'
                },
                datosEmpresa: {
                    razonSocial: 'Empresa de Prueba SpA',
                    rut: '76123456-7',
                    giro: 'Servicios de consultoría',
                    direccion: 'Av. Providencia 1234, Santiago'
                }
            },
            ...configuracion
        };
    }

    /**
     * Autocompleta un formulario con datos generados automáticamente
     * @param formulario Datos del formulario a completar
     * @returns Promise<void>
     */
    async autocompletarFormulario(formulario: Formulario): Promise<void> {
        console.log(`\n🤖 Iniciando autocompletado del formulario: ${formulario.titulo}`);
        
        for (const campo of formulario.campos) {
            try {
                const valor = await generarValorCampo(campo, this.configuracion);
                
                if (this.configuracion.modoDebug) {
                    console.log(`📝 Campo: ${campo.label || campo.nombre} (${campo.tipo})`);
                    console.log(`   Valor generado: ${valor}`);
                    console.log(`   Requerido: ${campo.requerido ? 'Sí' : 'No'}`);
                }
                
                // Simular tiempo de escritura humana
                if (this.configuracion.tiempoEsperaEntreCampos > 0) {
                    await this.esperar(this.configuracion.tiempoEsperaEntreCampos);
                }
                
            } catch (error) {
                console.error(`❌ Error al procesar campo ${campo.label || campo.nombre}:`, error);
            }
        }
        
        console.log(`✅ Autocompletado completado para: ${formulario.titulo}`);
    }

    /**
     * Revisa y valida un formulario según las reglas configuradas
     * @param formulario Datos del formulario a revisar
     * @returns Promise<ResultadoValidacion> Resultado de la validación
     */
    async revisarFormulario(formulario: Formulario): Promise<ResultadoValidacion> {
        console.log(`\n🔍 Iniciando revisión del formulario: ${formulario.titulo}`);
        
        const resultado = await validarFormulario(formulario, this.configuracion.reglas);
        
        if (this.configuracion.modoDebug) {
            console.log(`📊 Resultado de la validación:`);
            console.log(`   Válido: ${resultado.esValido ? 'Sí' : 'No'}`);
            console.log(`   Errores encontrados: ${resultado.errores.length}`);
            console.log(`   Advertencias: ${resultado.advertencias.length}`);
            
            if (resultado.errores.length > 0) {
                console.log(`\n❌ Errores:`);
                resultado.errores.forEach((error: ErrorValidacion, index: number) => {
                    console.log(`   ${index + 1}. ${error.campo}: ${error.mensaje}`);
                });
            }
            
            if (resultado.advertencias.length > 0) {
                console.log(`\n⚠️ Advertencias:`);
                resultado.advertencias.forEach((advertencia: AdvertenciaValidacion, index: number) => {
                    console.log(`   ${index + 1}. ${advertencia.campo}: ${advertencia.mensaje}`);
                });
            }
        }
        
        return resultado;
    }

    /**
     * Procesa un formulario: lo autocompleta y luego lo revisa
     * @param formulario Datos del formulario a procesar
     * @returns Promise<ResultadoValidacion> Resultado del procesamiento
     */
    async procesarFormulario(formulario: Formulario): Promise<ResultadoValidacion> {
        console.log(`\n🚀 Procesando formulario completo: ${formulario.titulo}`);
        
        // Paso 1: Autocompletar
        await this.autocompletarFormulario(formulario);
        
        // Paso 2: Revisar
        const resultado = await this.revisarFormulario(formulario);
        
        // Paso 3: Generar reporte
        this.generarReporte(formulario, resultado);
        
        return resultado;
    }

    /**
     * Actualiza la configuración del agente
     * @param nuevaConfiguracion Configuración parcial a aplicar
     */
    actualizarConfiguracion(nuevaConfiguracion: Partial<ConfiguracionAgente>): void {
        this.configuracion = {
            ...this.configuracion,
            ...nuevaConfiguracion
        };
        
        if (this.configuracion.modoDebug) {
            console.log('🔧 Configuración del agente actualizada');
        }
    }

    /**
     * Obtiene la configuración actual del agente
     * @returns ConfiguracionAgente Configuración actual
     */
    obtenerConfiguracion(): ConfiguracionAgente {
        return { ...this.configuracion };
    }

    /**
     * Genera un reporte del procesamiento del formulario
     * @param formulario Formulario procesado
     * @param resultado Resultado de la validación
     */
    private generarReporte(formulario: Formulario, resultado: ResultadoValidacion): void {
        console.log(`\n📋 REPORTE DE PROCESAMIENTO`);
        console.log(`===============================`);
        console.log(`Formulario: ${formulario.titulo}`);
        console.log(`URL: ${formulario.url}`);
        console.log(`Campos procesados: ${formulario.campos.length}`);
        console.log(`Estado: ${resultado.esValido ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
        console.log(`Errores: ${resultado.errores.length}`);
        console.log(`Advertencias: ${resultado.advertencias.length}`);
        console.log(`Fecha: ${new Date().toLocaleString('es-CL')}`);
        console.log(`===============================\n`);
    }

    /**
     * Utilidad para esperar un tiempo determinado
     * @param ms Milisegundos a esperar
     */
    private async esperar(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 
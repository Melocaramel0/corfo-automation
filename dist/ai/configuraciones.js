"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfiguracionesDisponibles = exports.ConfiguracionManufactura = exports.ConfiguracionTecnologia = exports.ConfiguracionVelocidad = exports.ConfiguracionDemo = exports.ConfiguracionProduccion = exports.ConfiguracionDesarrollo = void 0;
exports.obtenerConfiguracion = obtenerConfiguracion;
exports.personalizarConfiguracion = personalizarConfiguracion;
/**
 * Configuraciones predefinidas para diferentes escenarios de uso del agente
 */
/**
 * Configuración para desarrollo y pruebas
 * - Debug activado
 * - Datos ficticios
 * - Validación no estricta
 * - Tiempos de espera largos para observar el proceso
 */
exports.ConfiguracionDesarrollo = {
    modoDebug: true,
    tiempoEsperaEntreCampos: 1500,
    validacionEstricta: false,
    generarDatosFicticios: true,
    idioma: 'es',
    reglas: {
        camposObligatorios: true,
        formatoEmail: false, // Menos estricto en desarrollo
        formatoTelefono: false,
        formatoRut: false,
        longitudMinima: false,
        valorNumericoEnRango: false
    },
    preferenciasAutocompletado: {
        usarDatosReales: false,
        datosPersonales: {
            nombre: 'Usuario',
            apellido: 'De Prueba',
            email: 'usuario.prueba@ejemplo.cl',
            telefono: '+56912345678',
            rut: '12.345.678-9'
        },
        datosEmpresa: {
            razonSocial: 'Empresa de Prueba Ltda',
            rut: '76.123.456-7',
            giro: 'Servicios de prueba y desarrollo',
            direccion: 'Calle Falsa 123, Santiago'
        }
    }
};
/**
 * Configuración para producción
 * - Debug desactivado
 * - Validación estricta
 * - Tiempos optimizados
 * - Todas las reglas activas
 */
exports.ConfiguracionProduccion = {
    modoDebug: false,
    tiempoEsperaEntreCampos: 300,
    validacionEstricta: true,
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
            nombre: 'Juan Carlos',
            apellido: 'Empresario González',
            email: 'jc.empresario@innovacion.cl',
            telefono: '+56987654321',
            rut: '15.234.567-8'
        },
        datosEmpresa: {
            razonSocial: 'Innovación y Desarrollo SpA',
            rut: '76.555.888-2',
            giro: 'Investigación y desarrollo en tecnología',
            direccion: 'Av. Innovación 2500, Oficina 1205, Providencia, Santiago'
        }
    }
};
/**
 * Configuración para demostración
 * - Debug activado para mostrar el proceso
 * - Datos realistas pero ficticios
 * - Velocidad media
 * - Validación balanceada
 */
exports.ConfiguracionDemo = {
    modoDebug: true,
    tiempoEsperaEntreCampos: 800,
    validacionEstricta: false,
    generarDatosFicticios: true,
    idioma: 'es',
    reglas: {
        camposObligatorios: true,
        formatoEmail: true,
        formatoTelefono: true,
        formatoRut: true,
        longitudMinima: true,
        valorNumericoEnRango: false
    },
    preferenciasAutocompletado: {
        usarDatosReales: false,
        datosPersonales: {
            nombre: 'María Elena',
            apellido: 'González Silva',
            email: 'maria.gonzalez@tecnoinnovacion.cl',
            telefono: '+56987123456',
            rut: '16.345.789-2'
        },
        datosEmpresa: {
            razonSocial: 'TecnoInnovación Sustentable SpA',
            rut: '76.777.999-1',
            giro: 'Desarrollo de tecnologías limpias y sustentables',
            direccion: 'Av. Sustentabilidad 1800, Torre Verde, Piso 15, Las Condes, Santiago'
        }
    }
};
/**
 * Configuración para velocidad máxima
 * - Sin debug
 * - Sin tiempos de espera
 * - Validación mínima
 * - Para procesamiento rápido de múltiples formularios
 */
exports.ConfiguracionVelocidad = {
    modoDebug: false,
    tiempoEsperaEntreCampos: 0,
    validacionEstricta: false,
    generarDatosFicticios: true,
    idioma: 'es',
    reglas: {
        camposObligatorios: true,
        formatoEmail: false,
        formatoTelefono: false,
        formatoRut: false,
        longitudMinima: false,
        valorNumericoEnRango: false
    },
    preferenciasAutocompletado: {
        usarDatosReales: false,
        datosPersonales: {
            nombre: 'Fast',
            apellido: 'User',
            email: 'fast@speed.cl',
            telefono: '+56900000000',
            rut: '11.111.111-1'
        },
        datosEmpresa: {
            razonSocial: 'Speed Corp',
            rut: '70.000.000-0',
            giro: 'Servicios rápidos',
            direccion: 'Speed St 1'
        }
    }
};
/**
 * Configuración para sector tecnológico
 * Especializada en empresas de tecnología
 */
exports.ConfiguracionTecnologia = {
    modoDebug: true,
    tiempoEsperaEntreCampos: 500,
    validacionEstricta: true,
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
            nombre: 'Alejandro',
            apellido: 'Tech Innovador',
            email: 'alejandro@techstartup.cl',
            telefono: '+56912345678',
            rut: '17.888.999-3'
        },
        datosEmpresa: {
            razonSocial: 'TechStartup Innovación Ltda',
            rut: '76.999.111-4',
            giro: 'Desarrollo de software, aplicaciones móviles y soluciones cloud',
            direccion: 'Hub Tecnológico, Av. Digital 3000, Oficina 502, Vitacura, Santiago'
        }
    }
};
/**
 * Configuración para sector manufacturero
 * Especializada en empresas manufactureras
 */
exports.ConfiguracionManufactura = {
    modoDebug: true,
    tiempoEsperaEntreCampos: 500,
    validacionEstricta: true,
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
            nombre: 'Carmen',
            apellido: 'Industrial López',
            email: 'carmen.lopez@manufactura.cl',
            telefono: '+56987654321',
            rut: '14.567.890-5'
        },
        datosEmpresa: {
            razonSocial: 'Manufactura Sustentable S.A.',
            rut: '96.222.333-8',
            giro: 'Fabricación de productos manufacturados con procesos sustentables',
            direccion: 'Parque Industrial Sur, Av. Manufactura 1500, Puente Alto, Santiago'
        }
    }
};
/**
 * Mapa de configuraciones disponibles
 */
exports.ConfiguracionesDisponibles = {
    desarrollo: exports.ConfiguracionDesarrollo,
    produccion: exports.ConfiguracionProduccion,
    demo: exports.ConfiguracionDemo,
    velocidad: exports.ConfiguracionVelocidad,
    tecnologia: exports.ConfiguracionTecnologia,
    manufactura: exports.ConfiguracionManufactura
};
/**
 * Función helper para obtener una configuración por nombre
 * @param nombre Nombre de la configuración
 * @returns ConfiguracionAgente La configuración solicitada
 */
function obtenerConfiguracion(nombre) {
    return exports.ConfiguracionesDisponibles[nombre];
}
/**
 * Función para crear una configuración personalizada basada en una existente
 * @param base Configuración base
 * @param personalizacion Cambios a aplicar
 * @returns ConfiguracionAgente Nueva configuración personalizada
 */
function personalizarConfiguracion(base, personalizacion) {
    const configBase = typeof base === 'string' ? obtenerConfiguracion(base) : base;
    return {
        ...configBase,
        ...personalizacion,
        reglas: {
            ...configBase.reglas,
            ...(personalizacion.reglas || {})
        },
        preferenciasAutocompletado: {
            ...configBase.preferenciasAutocompletado,
            ...(personalizacion.preferenciasAutocompletado || {}),
            datosPersonales: {
                ...configBase.preferenciasAutocompletado.datosPersonales,
                ...(personalizacion.preferenciasAutocompletado?.datosPersonales || {})
            },
            datosEmpresa: {
                ...configBase.preferenciasAutocompletado.datosEmpresa,
                ...(personalizacion.preferenciasAutocompletado?.datosEmpresa || {})
            }
        }
    };
}

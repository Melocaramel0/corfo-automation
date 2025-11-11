/**
 * Tipos e interfaces para el Agente Orquestador
 */

/**
 * Interfaz para la estructura detectada del formulario
 */
export interface EstructuraFormularioDetectada {
    totalPasos: number;
    pasoActual: number;
    esPaginaConfirmacion: boolean;
    esPaginaBorradores: boolean;
    tieneBarraProgreso: boolean;
    esSlickSlider?: boolean;
    titulosPasos: string[];
    urlActual: string;
    tipoDeteccion: 'barra_progreso' | 'fallback';
    confianza: number; // 0-100%
}

export interface ResultadoAgente {
    exito: boolean;
    mensaje: string;
    estadisticas: EstadisticasEjecucion;
    titulo?: string;
    tituloProyecto?: string;
    codigoProyecto?: string;
    urlInicial?: string;
    urlFormularioEnviado?: string;
    fechaEjecucion?: string;
    tiempoTotal: number;
    pasosCompletados?: PasoEjecucion[];
    errores?: string[];
    erroresValidacion?: ResultadoErroresValidacion;
}

export interface PasoEjecucion {
    numero: number;
    titulo: string;
    camposEncontrados: number;
    camposCompletados: number;
    tiempoTranscurrido: number;
    exito: boolean;
    detalles: DetallePaso[];
}

export interface DetallePaso {
    etiqueta: string;
    tipo: string;
    valorAsignado: string;
    completado: boolean;
    esObligatorio: boolean;
    razonFallo?: string;
}

/**
 * Interfaz para el resultado del manejo de modal de confirmación
 */
export interface ResultadoModal {
    aparecio: boolean;
    botonPresionado: 'no' | 'si' | 'ninguno';
    camposFaltantes: boolean; // true si se presionó "No" (hay campos faltantes)
}

/**
 * Interfaz para el resultado de la navegación al siguiente paso
 */
export interface ResultadoNavegacion {
    navegoExitosamente: boolean;
    resultadoModal: ResultadoModal;
}

export interface EstadisticasEjecucion {
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

/**
 * Interfaz para el resultado de la detección del modal de errores de validación
 */
export interface ResultadoErroresValidacion {
    detectado: boolean;
    camposFaltantes: string[];
    rutaScreenshot?: string;
}




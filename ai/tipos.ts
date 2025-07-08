/**
 * Configuración del agente de formularios
 */
export interface ConfiguracionAgente {
    modoDebug: boolean;
    tiempoEsperaEntreCampos: number;
    validacionEstricta: boolean;
    generarDatosFicticios: boolean;
    idioma: 'es' | 'en';
    reglas: ReglasValidacion;
    preferenciasAutocompletado: PreferenciasAutocompletado;
}

/**
 * Reglas de validación para formularios
 */
export interface ReglasValidacion {
    camposObligatorios: boolean;
    formatoEmail: boolean;
    formatoTelefono: boolean;
    formatoRut: boolean;
    longitudMinima: boolean;
    valorNumericoEnRango: boolean;
}

/**
 * Preferencias para el autocompletado de formularios
 */
export interface PreferenciasAutocompletado {
    usarDatosReales: boolean;
    datosPersonales: DatosPersonales;
    datosEmpresa: DatosEmpresa;
}

/**
 * Datos personales para autocompletado
 */
export interface DatosPersonales {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    rut: string;
}

/**
 * Datos de empresa para autocompletado
 */
export interface DatosEmpresa {
    razonSocial: string;
    rut: string;
    giro: string;
    direccion: string;
}

/**
 * Resultado de validación de un formulario
 */
export interface ResultadoValidacion {
    esValido: boolean;
    errores: ErrorValidacion[];
    advertencias: AdvertenciaValidacion[];
    resumen: ResumenValidacion;
}

/**
 * Error de validación
 */
export interface ErrorValidacion {
    campo: string;
    tipo: TipoError;
    mensaje: string;
}

/**
 * Advertencia de validación
 */
export interface AdvertenciaValidacion {
    campo: string;
    tipo: TipoAdvertencia;
    mensaje: string;
}

/**
 * Resumen de la validación
 */
export interface ResumenValidacion {
    totalCampos: number;
    camposValidados: number;
    camposConErrores: number;
    camposConAdvertencias: number;
    porcentajeExito: number;
}

/**
 * Tipos de errores de validación
 */
export enum TipoError {
    CAMPO_OBLIGATORIO = 'campo_obligatorio',
    FORMATO_INVALIDO = 'formato_invalido',
    LONGITUD_INVALIDA = 'longitud_invalida',
    VALOR_FUERA_DE_RANGO = 'valor_fuera_de_rango',
    FORMATO_EMAIL = 'formato_email',
    FORMATO_TELEFONO = 'formato_telefono',
    FORMATO_RUT = 'formato_rut'
}

/**
 * Tipos de advertencias de validación
 */
export enum TipoAdvertencia {
    CAMPO_OPCIONAL_VACIO = 'campo_opcional_vacio',
    LONGITUD_RECOMENDADA = 'longitud_recomendada',
    FORMATO_RECOMENDADO = 'formato_recomendado',
    VALOR_INUSUAL = 'valor_inusual'
}

/**
 * Contexto para generación de datos
 */
export interface ContextoGeneracion {
    tipoFormulario?: string;
    sector?: string;
    region?: string;
    tamaño?: 'micro' | 'pequeña' | 'mediana' | 'grande';
} 
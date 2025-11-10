import { CAMPOS_CORFO_MAPPING } from '../constants';

/**
 * Generador de valores para campos del formulario
 */
export class FieldValueGenerator {
    constructor(private constants: typeof CAMPOS_CORFO_MAPPING) {}

    /**
     * Genera un valor apropiado para un campo basado en su información
     */
    generateValueForField(info: any): string {
        const etiqueta = info.etiqueta.toLowerCase();
        const tipo = info.tipo.toLowerCase();
        const dataCodigo = (info.dataCodigo || '').toLowerCase();
        const placeholder = (info.placeholder || '').toLowerCase();
        const dataInputmask = (info.dataInputmask || '').toLowerCase();
        
        //  Mapeo inteligente basado en etiqueta y data-codigo
        const contextoCompleto = `${etiqueta} ${dataCodigo} ${placeholder}`.toLowerCase();
        
        // Detección por palabras clave específicas
        if (contextoCompleto.includes('rut') || contextoCompleto.includes('run') || 
            contextoCompleto.includes('identificador') || contextoCompleto.includes('recurso')) {
            return this.constants.RUT;
        } else if (contextoCompleto.includes('email') || contextoCompleto.includes('correo') || contextoCompleto.includes('mail') || 
                   contextoCompleto.includes('e-mail') || contextoCompleto.includes('electrónico') || contextoCompleto.includes('electronico')) {
            return this.constants.EMAIL;
        } else if (contextoCompleto.includes('teléfono') || contextoCompleto.includes('telefono') || contextoCompleto.includes('fono') || contextoCompleto.includes('celular')) {
            return this.constants.TELEFONO;
        } else if (contextoCompleto.includes('nombre') && !contextoCompleto.includes('proyecto')) {
            return this.constants.NOMBRE;
        } else if (contextoCompleto.includes('apellido')) {
            return this.constants.APELLIDO_PATERNO;
        } else if (contextoCompleto.includes('razón social') || contextoCompleto.includes('empresa') || contextoCompleto.includes('organización')) {
            return this.constants.RAZON_SOCIAL;
        } else if (contextoCompleto.includes('título') && contextoCompleto.includes('proyecto')) {
            return this.constants.TITULO_PROYECTO;
        } else if (contextoCompleto.includes('objetivo') && contextoCompleto.includes('general')) {
            return this.constants.OBJETIVO_GENERAL;
        } else if (contextoCompleto.includes('descripción') && contextoCompleto.includes('proyecto')) {
            return this.constants.RESUMEN_PROYECTO;
        } else if (contextoCompleto.includes('inversión') || contextoCompleto.includes('inversion')) {
            return this.constants.INVERSION;
        } else if (contextoCompleto.includes('costos') || contextoCompleto.includes('operacion') || contextoCompleto.includes('operación')) {
            return this.constants.COSTOS_OPERACION;
        } else if (contextoCompleto.includes('monto') || contextoCompleto.includes('costo') || contextoCompleto.includes('presupuesto') || contextoCompleto.includes('valor') || contextoCompleto.includes('total')) {
            return this.constants.MONTO_GENERICO;
        } else if (contextoCompleto.includes('duración') || contextoCompleto.includes('duracion') || contextoCompleto.includes('meses')) {
            return this.constants.DURACION_PROYECTO;
        } 
        //  NUEVO: Detección específica para campos de dirección (ANTES de la detección genérica de dirección)
        else if ((contextoCompleto.includes('numero') || contextoCompleto.includes('número')) && contextoCompleto.includes('direcc')) {
            return this.constants.DIRECCION_NUMERO_CORTO;
        } else if (contextoCompleto.includes('departamento') && contextoCompleto.includes('direcc')) {
            return this.constants.DIRECCION_DEPTO_CORTO;
        } else if (contextoCompleto.includes('codigo') && contextoCompleto.includes('postal')) {
            return this.constants.CODIGO_POSTAL_CHILE;
        } else if (contextoCompleto.includes('block') || contextoCompleto.includes('villa') || contextoCompleto.includes('población') || contextoCompleto.includes('poblacion')) {
            return this.constants.BLOCK_VILLA;
        }
        else if (contextoCompleto.includes('dirección') || contextoCompleto.includes('direccion') || contextoCompleto.includes('domicilio')) {
            return this.constants.DIRECCION_CALLE;
        } else if (contextoCompleto.includes('comuna') || contextoCompleto.includes('ciudad')) {
            return this.constants.COMUNA;
        } else if (contextoCompleto.includes('región') || contextoCompleto.includes('region')) {
            return this.constants.REGION;
        } else if (contextoCompleto.includes('empleos') || contextoCompleto.includes('empleo') || contextoCompleto.includes('trabajos')) {
            return this.constants.NUMERO;
        } else if (contextoCompleto.includes('año') || contextoCompleto.includes('año') || contextoCompleto.includes('year')) {
            return this.constants.AÑO;
        } else if (contextoCompleto.includes('fecha') || contextoCompleto.includes('date')) {
            return this.constants.FECHA;
        } else if (contextoCompleto.includes('porcentaje') || contextoCompleto.includes('porcentaje') || contextoCompleto.includes('%')) {
            return this.constants.PORCENTAJE;
        } else if (contextoCompleto.includes('cantidad') || contextoCompleto.includes('número') || contextoCompleto.includes('numero')) {
            return this.constants.NUMERO;
        } else if (contextoCompleto.includes('observaciones') || contextoCompleto.includes('comentarios')) {
            return this.constants.TEXTO_LARGO;
        } else if (contextoCompleto.includes('justifique') || contextoCompleto.includes('justificar') || contextoCompleto.includes('justificación')) {
            return this.constants.JUSTIFICACION_GENERICA;
        } else if (contextoCompleto.includes('ciclos biológicos') || contextoCompleto.includes('biologicos') || contextoCompleto.includes('biológicos')) {
            return this.constants.CICLOS_BIOLOGICOS;
        } else if (contextoCompleto.includes('página web') || contextoCompleto.includes('sitio web') || contextoCompleto.includes('url')) {
            return this.constants.URL_EJEMPLO;
        } else if (contextoCompleto.includes('linkedin') || contextoCompleto.includes('facebook') || contextoCompleto.includes('instagram')) {
            return this.constants.URL_REDES_SOCIALES;
        } else if (contextoCompleto.includes('profesión') || contextoCompleto.includes('cargo') || contextoCompleto.includes('ocupación')) {
            return this.constants.PROFESION;
        } else if (contextoCompleto.includes('nacionalidad')) {
            return this.constants.NACIONALIDAD;
        } else if (contextoCompleto.includes('género') || contextoCompleto.includes('sexo')) {
            return this.constants.GENERO;
        } else if (contextoCompleto.includes('etnia')) {
            return this.constants.ETNIA;
        } else if (contextoCompleto.includes('pueblo originario')) {
            return this.constants.PUEBLO_ORIGINARIO;
        }
        
        //  NUEVO: Detectar campos numéricos con inputmask integer
        if (dataInputmask && dataInputmask.includes('integer')) {
            return this.constants.MONTO_GENERICO;
        }
        
        //  Mapeo por tipo de campo
        switch (tipo) {
            case 'email': return this.constants.EMAIL;
            case 'tel': return this.constants.TELEFONO;
            case 'number': return this.constants.NUMERO;
            case 'date': return this.constants.FECHA;
            case 'textarea': return this.constants.TEXTO_LARGO;
            case 'text': return this.constants.TEXTO_CORTO;
            case 'url': return this.constants.URL_EJEMPLO;
            case 'password': return this.constants.PASSWORD;
            default: return this.constants.TEXTO_CORTO;
        }
    }

    /**
     * Obtiene un valor por defecto basado en el tipo de campo
     */
    getDefaultValue(type: string): string {
        const tipoLower = type.toLowerCase();
        
        switch(tipoLower) {
            case 'number':
                return '0';
            case 'textarea':
                return this.constants.TEXTO_LARGO;
            case 'text':
            case 'email':
            case 'tel':
            case 'url':
            case 'password':
                return this.constants.TEXTO_CORTO;
            case 'select':
                return this.constants.OPCION_POR_DEFECTO;
            case 'checkbox':
                return 'true';
            case 'radio':
                return 'seleccionado';
            case 'date':
                return this.constants.FECHA_FORMATO_DDMMYYYY;
            case 'file':
                return this.constants.ARCHIVO_PRUEBA;
            default:
                return this.constants.TEXTO_CORTO;
        }
    }
}


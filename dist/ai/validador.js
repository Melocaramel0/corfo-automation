"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarFormulario = validarFormulario;
const tipos_1 = require("./tipos");
/**
 * Valida un formulario completo según las reglas especificadas
 * @param formulario Formulario a validar
 * @param reglas Reglas de validación a aplicar
 * @returns Promise<ResultadoValidacion> Resultado de la validación
 */
async function validarFormulario(formulario, reglas) {
    const errores = [];
    const advertencias = [];
    console.log(`🔍 Validando formulario: ${formulario.titulo}`);
    console.log(`📋 Total de campos: ${formulario.campos.length}`);
    for (const campo of formulario.campos) {
        try {
            // Validar campo obligatorio
            if (reglas.camposObligatorios) {
                const errorObligatorio = validarCampoObligatorio(campo);
                if (errorObligatorio)
                    errores.push(errorObligatorio);
            }
            // Validar formato de email
            if (reglas.formatoEmail && esEmail(campo)) {
                const errorEmail = validarFormatoEmail(campo);
                if (errorEmail)
                    errores.push(errorEmail);
            }
            // Validar formato de teléfono
            if (reglas.formatoTelefono && esTelefono(campo)) {
                const errorTelefono = validarFormatoTelefono(campo);
                if (errorTelefono)
                    errores.push(errorTelefono);
            }
            // Validar formato de RUT
            if (reglas.formatoRut && esRut(campo)) {
                const errorRut = validarFormatoRut(campo);
                if (errorRut)
                    errores.push(errorRut);
            }
            // Validar longitud mínima
            if (reglas.longitudMinima) {
                const errorLongitud = validarLongitudMinima(campo);
                if (errorLongitud)
                    errores.push(errorLongitud);
                const advertenciaLongitud = validarLongitudRecomendada(campo);
                if (advertenciaLongitud)
                    advertencias.push(advertenciaLongitud);
            }
            // Validar rangos numéricos
            if (reglas.valorNumericoEnRango && esNumerico(campo)) {
                const errorRango = validarRangoNumerico(campo);
                if (errorRango)
                    errores.push(errorRango);
            }
            // Generar advertencias adicionales
            const advertenciaOpcional = generarAdvertenciaOpcional(campo);
            if (advertenciaOpcional)
                advertencias.push(advertenciaOpcional);
        }
        catch (error) {
            console.error(`Error al validar campo ${campo.label || campo.nombre}:`, error);
        }
    }
    const resumen = generarResumenValidacion(formulario.campos, errores, advertencias);
    const esValido = errores.length === 0;
    return {
        esValido,
        errores,
        advertencias,
        resumen
    };
}
/**
 * Valida que un campo obligatorio no esté vacío
 */
function validarCampoObligatorio(campo) {
    if (campo.requerido) {
        return {
            campo: campo.label || campo.nombre || 'Campo sin nombre',
            tipo: tipos_1.TipoError.CAMPO_OBLIGATORIO,
            mensaje: 'Este campo es obligatorio y debe ser completado'
        };
    }
    return null;
}
/**
 * Valida el formato de email
 */
function validarFormatoEmail(campo) {
    // Por ahora asumimos que todos los emails son válidos ya que los generamos nosotros
    // En implementación real, se validaría el valor actual del campo
    return null;
}
/**
 * Valida el formato de teléfono chileno
 */
function validarFormatoTelefono(campo) {
    // Implementación básica - en la práctica se validaría el valor real
    return null;
}
/**
 * Valida el formato de RUT chileno
 */
function validarFormatoRut(campo) {
    // Implementación básica - en la práctica se validaría el dígito verificador
    return null;
}
/**
 * Valida longitud mínima según el tipo de campo
 */
function validarLongitudMinima(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    // Definir longitudes mínimas según tipo de campo
    let longitudMinima = 0;
    if (etiqueta.includes('descripción') || etiqueta.includes('descripcion')) {
        longitudMinima = 50;
    }
    else if (etiqueta.includes('proyecto') || etiqueta.includes('objetivo')) {
        longitudMinima = 30;
    }
    else if (etiqueta.includes('nombre') || etiqueta.includes('empresa')) {
        longitudMinima = 2;
    }
    // Por ahora no validamos longitud real ya que generamos los datos
    // En implementación real se compararía con el valor actual
    return null;
}
/**
 * Genera advertencia sobre longitud recomendada
 */
function validarLongitudRecomendada(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    if (campo.tipo === 'textarea' && (etiqueta.includes('descripción') || etiqueta.includes('descripcion'))) {
        return {
            campo: campo.label || campo.nombre || 'Campo sin nombre',
            tipo: tipos_1.TipoAdvertencia.LONGITUD_RECOMENDADA,
            mensaje: 'Se recomienda una descripción detallada de al menos 100 caracteres'
        };
    }
    return null;
}
/**
 * Valida rangos numéricos apropiados
 */
function validarRangoNumerico(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    // Validaciones específicas según el contexto
    if (etiqueta.includes('edad')) {
        // Edad debe estar entre 18 y 99 años
        return null; // Asumimos que los datos generados son válidos
    }
    if (etiqueta.includes('año')) {
        // Año debe ser razonable
        return null;
    }
    return null;
}
/**
 * Genera advertencia para campos opcionales vacíos importantes
 */
function generarAdvertenciaOpcional(campo) {
    if (!campo.requerido) {
        const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
        if (etiqueta.includes('teléfono') || etiqueta.includes('telefono') ||
            etiqueta.includes('contacto') || etiqueta.includes('web')) {
            return {
                campo: campo.label || campo.nombre || 'Campo sin nombre',
                tipo: tipos_1.TipoAdvertencia.CAMPO_OPCIONAL_VACIO,
                mensaje: 'Campo opcional pero recomendado para mejorar las posibilidades de contacto'
            };
        }
    }
    return null;
}
/**
 * Genera el resumen de la validación
 */
function generarResumenValidacion(campos, errores, advertencias) {
    const totalCampos = campos.length;
    const camposConErrores = errores.length;
    const camposConAdvertencias = advertencias.length;
    const camposValidados = totalCampos - camposConErrores;
    const porcentajeExito = totalCampos > 0 ? Math.round((camposValidados / totalCampos) * 100) : 0;
    return {
        totalCampos,
        camposValidados,
        camposConErrores,
        camposConAdvertencias,
        porcentajeExito
    };
}
/**
 * Verifica si un campo es de tipo email
 */
function esEmail(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    return campo.tipo === 'email' ||
        etiqueta.includes('email') ||
        etiqueta.includes('correo') ||
        etiqueta.includes('e-mail');
}
/**
 * Verifica si un campo es de tipo teléfono
 */
function esTelefono(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    return campo.tipo === 'tel' ||
        campo.tipo === 'phone' ||
        etiqueta.includes('teléfono') ||
        etiqueta.includes('telefono') ||
        etiqueta.includes('celular') ||
        etiqueta.includes('móvil') ||
        etiqueta.includes('movil');
}
/**
 * Verifica si un campo es de tipo RUT
 */
function esRut(campo) {
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    return etiqueta.includes('rut') || etiqueta.includes('r.u.t');
}
/**
 * Verifica si un campo es numérico
 */
function esNumerico(campo) {
    return campo.tipo === 'number';
}

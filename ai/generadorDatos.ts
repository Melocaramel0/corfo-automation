import { CampoFormulario } from '../scraping/extraerFormularios';
import { ConfiguracionAgente, ContextoGeneracion } from './tipos';

/**
 * Genera un valor apropiado para un campo específico del formulario
 * @param campo Campo del formulario a completar
 * @param configuracion Configuración del agente
 * @param contexto Contexto adicional para la generación
 * @returns string Valor generado para el campo
 */
export async function generarValorCampo(
    campo: CampoFormulario, 
    configuracion: ConfiguracionAgente,
    contexto?: ContextoGeneracion
): Promise<string> {
    
    const etiqueta = (campo.label || campo.nombre || '').toLowerCase();
    
    // Si el campo tiene opciones predefinidas, seleccionar una
    if (campo.opciones && campo.opciones.length > 0) {
        return seleccionarOpcion(campo.opciones, etiqueta);
    }
    
    // Generar según el tipo de campo y su etiqueta
    switch (campo.tipo) {
        case 'email':
            return generarEmail(configuracion);
            
        case 'tel':
        case 'phone':
            return generarTelefono(configuracion);
            
        case 'number':
            return generarNumero(etiqueta);
            
        case 'date':
            return generarFecha(etiqueta);
            
        case 'url':
            return generarUrl(etiqueta);
            
        case 'checkbox':
            return generarCheckbox(campo.requerido);
            
        case 'radio':
            return generarRadio(campo.opciones || []);
            
        case 'text':
        case 'textarea':
        default:
            return generarTexto(etiqueta, configuracion, campo.tipo === 'textarea');
    }
}

/**
 * Selecciona una opción apropiada de una lista
 */
function seleccionarOpcion(opciones: string[], etiqueta: string): string {
    // Filtrar opciones vacías o de placeholder
    const opcionesValidas = opciones.filter(op => 
        op.trim() !== '' && 
        !op.toLowerCase().includes('seleccione') &&
        !op.toLowerCase().includes('elige') &&
        op !== '-- Seleccione --'
    );
    
    if (opcionesValidas.length === 0) {
        return opciones[0] || '';
    }
    
    // Para regiones, preferir Santiago
    if (etiqueta.includes('region') || etiqueta.includes('región')) {
        const santiago = opcionesValidas.find(op => op.toLowerCase().includes('metropolitana') || op.toLowerCase().includes('santiago'));
        if (santiago) return santiago;
    }
    
    // Seleccionar la primera opción válida por defecto
    return opcionesValidas[0];
}

/**
 * Genera un email basado en la configuración
 */
function generarEmail(configuracion: ConfiguracionAgente): string {
    if (configuracion.preferenciasAutocompletado.usarDatosReales) {
        return configuracion.preferenciasAutocompletado.datosPersonales.email;
    }
    return 'usuario.prueba@ejemplo.cl';
}

/**
 * Genera un número de teléfono
 */
function generarTelefono(configuracion: ConfiguracionAgente): string {
    if (configuracion.preferenciasAutocompletado.usarDatosReales) {
        return configuracion.preferenciasAutocompletado.datosPersonales.telefono;
    }
    return '+56912345678';
}

/**
 * Genera un número apropiado según la etiqueta
 */
function generarNumero(etiqueta: string): string {
    if (etiqueta.includes('edad')) {
        return '35';
    }
    if (etiqueta.includes('empleado') || etiqueta.includes('trabajador')) {
        return '50';
    }
    if (etiqueta.includes('año') || etiqueta.includes('año')) {
        return '2024';
    }
    if (etiqueta.includes('monto') || etiqueta.includes('precio') || etiqueta.includes('valor')) {
        return '1000000';
    }
    if (etiqueta.includes('porcentaje')) {
        return '25';
    }
    return '100';
}

/**
 * Genera una fecha apropiada
 */
function generarFecha(etiqueta: string): string {
    const hoy = new Date();
    
    if (etiqueta.includes('nacimiento')) {
        // Fecha de nacimiento: hace 35 años
        const fechaNacimiento = new Date(hoy.getFullYear() - 35, 5, 15);
        return fechaNacimiento.toISOString().split('T')[0];
    }
    
    if (etiqueta.includes('inicio') || etiqueta.includes('creación') || etiqueta.includes('constitución')) {
        // Fecha de inicio: hace 5 años
        const fechaInicio = new Date(hoy.getFullYear() - 5, 2, 10);
        return fechaInicio.toISOString().split('T')[0];
    }
    
    if (etiqueta.includes('término') || etiqueta.includes('fin') || etiqueta.includes('finalización')) {
        // Fecha futura: en 1 año
        const fechaFin = new Date(hoy.getFullYear() + 1, 11, 31);
        return fechaFin.toISOString().split('T')[0];
    }
    
    // Fecha por defecto: hoy
    return hoy.toISOString().split('T')[0];
}

/**
 * Genera una URL apropiada
 */
function generarUrl(etiqueta: string): string {
    if (etiqueta.includes('web') || etiqueta.includes('sitio')) {
        return 'https://www.ejemplo.cl';
    }
    if (etiqueta.includes('linkedin')) {
        return 'https://www.linkedin.com/in/usuario-ejemplo';
    }
    if (etiqueta.includes('facebook')) {
        return 'https://www.facebook.com/usuario.ejemplo';
    }
    return 'https://www.ejemplo.cl';
}

/**
 * Genera valor para checkbox
 */
function generarCheckbox(requerido: boolean): string {
    // Si es requerido, marcar como verdadero
    return requerido ? 'true' : 'false';
}

/**
 * Genera valor para radio button
 */
function generarRadio(opciones: string[]): string {
    if (opciones.length > 0) {
        return opciones[0];
    }
    return 'true';
}

/**
 * Genera texto apropiado según la etiqueta del campo
 */
function generarTexto(etiqueta: string, configuracion: ConfiguracionAgente, esTextarea: boolean = false): string {
    const datosPersonales = configuracion.preferenciasAutocompletado.datosPersonales;
    const datosEmpresa = configuracion.preferenciasAutocompletado.datosEmpresa;
    const usarDatosReales = configuracion.preferenciasAutocompletado.usarDatosReales;
    
    // Campos de persona
    if (etiqueta.includes('nombre') && !etiqueta.includes('empresa') && !etiqueta.includes('razón')) {
        return usarDatosReales ? datosPersonales.nombre : 'Juan';
    }
    
    if (etiqueta.includes('apellido')) {
        return usarDatosReales ? datosPersonales.apellido : 'Pérez González';
    }
    
    if (etiqueta.includes('rut') && !etiqueta.includes('empresa')) {
        return usarDatosReales ? datosPersonales.rut : '12.345.678-9';
    }
    
    // Campos de empresa
    if (etiqueta.includes('empresa') || etiqueta.includes('razón social') || etiqueta.includes('razón_social')) {
        return usarDatosReales ? datosEmpresa.razonSocial : 'Empresa de Prueba SpA';
    }
    
    if (etiqueta.includes('rut') && (etiqueta.includes('empresa') || etiqueta.includes('organización'))) {
        return usarDatosReales ? datosEmpresa.rut : '76.123.456-7';
    }
    
    if (etiqueta.includes('giro') || etiqueta.includes('actividad')) {
        return usarDatosReales ? datosEmpresa.giro : 'Servicios de consultoría y asesoría empresarial';
    }
    
    if (etiqueta.includes('dirección') || etiqueta.includes('direccion')) {
        return usarDatosReales ? datosEmpresa.direccion : 'Av. Providencia 1234, Oficina 567, Providencia, Santiago';
    }
    
    // Campos específicos de formularios CORFO
    if (etiqueta.includes('proyecto')) {
        return esTextarea ? 
            'Proyecto de desarrollo tecnológico orientado a la mejora de procesos productivos mediante la implementación de soluciones digitales innovadoras.' :
            'Proyecto de Desarrollo Tecnológico';
    }
    
    if (etiqueta.includes('descripción') || etiqueta.includes('descripcion')) {
        return esTextarea ?
            'Descripción detallada del proyecto que busca implementar mejoras significativas en los procesos actuales, incorporando tecnologías emergentes y metodologías ágiles para optimizar la eficiencia operacional.' :
            'Descripción del proyecto';
    }
    
    if (etiqueta.includes('objetivo') || etiqueta.includes('meta')) {
        return esTextarea ?
            'Nuestro objetivo principal es incrementar la productividad en un 30% mediante la implementación de nuevas tecnologías, reduciendo costos operacionales y mejorando la calidad de nuestros productos y servicios.' :
            'Incrementar la productividad y eficiencia';
    }
    
    if (etiqueta.includes('beneficio')) {
        return esTextarea ?
            'Los beneficios esperados incluyen la mejora en la eficiencia operacional, reducción de costos, creación de empleos de calidad, y el fortalecimiento de la competitividad empresarial en el mercado nacional e internacional.' :
            'Mejora en eficiencia y competitividad';
    }
    
    if (etiqueta.includes('justificación') || etiqueta.includes('justificacion')) {
        return esTextarea ?
            'La justificación de este proyecto radica en la necesidad de modernizar nuestros procesos para mantenernos competitivos en un mercado cada vez más exigente, cumpliendo con estándares internacionales de calidad.' :
            'Modernización y competitividad empresarial';
    }
    
    // Campos generales
    if (etiqueta.includes('cargo') || etiqueta.includes('puesto')) {
        return 'Gerente General';
    }
    
    if (etiqueta.includes('profesión') || etiqueta.includes('titulo')) {
        return 'Ingeniero Comercial';
    }
    
    if (etiqueta.includes('experiencia')) {
        return esTextarea ?
            'Más de 10 años de experiencia en gestión empresarial, liderazgo de equipos, y desarrollo de proyectos de innovación en el sector tecnológico.' :
            'Más de 10 años en gestión empresarial';
    }
    
    if (etiqueta.includes('comentario') || etiqueta.includes('observación') || etiqueta.includes('observacion')) {
        return esTextarea ?
            'Comentarios adicionales sobre el proyecto y su implementación. Estamos comprometidos con el desarrollo sostenible y la generación de impacto positivo en la comunidad.' :
            'Sin comentarios adicionales';
    }
    
    // Valor por defecto
    if (esTextarea) {
        return 'Información detallada correspondiente a este campo del formulario, completada con datos de prueba para verificar el funcionamiento del sistema.';
    }
    
    return 'Información de prueba';
} 
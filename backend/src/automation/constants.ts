/**
 * Constantes y configuraciones para el Agente Orquestador
 */

/**
 * Mapeo de campos CORFO para autocompletado inteligente
 */
export const CAMPOS_CORFO_MAPPING = {
    // Datos de Persona Jurídica
    'RUT': '254462950',
    'RAZON_SOCIAL': 'Empresa de Prueba SpA',
    'OBJETO_SOCIAL': 'Desarrollo de tecnologías innovadoras para el sector agrícola',
    'TELEFONO': '+56912345678',
    'EMAIL': 'contacto@empresaprueba.cl',
    'DIRECCION_CALLE': 'Av. Providencia',
    'DIRECCION_NUMERO': '1234',
    'DIRECCION_DEPTO': 'Of. 567',
    'CODIGO_POSTAL': '7500000',
    'COMUNA': 'Providencia',
    'PROVINCIA': 'Santiago',
    'REGION': 'Región Metropolitana',
    
    // Datos de Persona Natural
    'NOMBRE': 'Juan Carlos',
    'APELLIDO_PATERNO': 'González',
    'APELLIDO_MATERNO': 'López',
    'NACIONALIDAD': 'Chilena',
    'GENERO': 'Masculino',
    'PUEBLO_INDIGENA': 'No pertenece',
    
    // Datos del Proyecto
    'TITULO_PROYECTO': 'Desarrollo de Sistema de Monitoreo Ambiental Inteligente',
    'OBJETIVO_GENERAL': 'Desarrollar una solución tecnológica innovadora para el monitoreo ambiental en tiempo real',
    'RESUMEN_PROYECTO': 'Este proyecto busca crear una plataforma integral de monitoreo ambiental que utilice sensores IoT y algoritmos de machine learning para proporcionar datos precisos sobre la calidad del aire, agua y suelo.',
    'DURACION_PROYECTO': '5',
    'COSTO_TOTAL': '5000000',
    'MONTO_SOLICITADO': '3000000',
    'APORTE_BENEFICIARIO': '2000000',
    'SECTOR_ECONOMICO': 'Tecnología',
    'SECTOR_APLICACION': 'Medio Ambiente',
    
    // Valores por defecto para diferentes tipos
    'FECHA': '2024-12-31',
    'NUMERO': '100',
    'PORCENTAJE': '25',
    'MONEDA': '1000000',
    'TEXTO_LARGO': 'Este es un texto de prueba para campos que requieren descripción detallada.',
    'TEXTO_CORTO': 'Texto de prueba',
    'BOOLEAN': true,
    'SELECT_DEFAULT': 'primera_opcion',
    
    // Valores específicos para campos financieros
    'INVERSION': '5000000',
    'COSTOS_OPERACION': '5000000',
    'MONTO_GENERICO': '5000000',
    
    // Valores específicos para dirección
    'DIRECCION_NUMERO_CORTO': '100',
    'DIRECCION_DEPTO_CORTO': '100',
    'CODIGO_POSTAL_CHILE': '8320000',
    'BLOCK_VILLA': 'Block A',
    
    // Valores específicos para fechas y años
    'AÑO': '2024',
    'FECHA_FORMATO_DDMMYYYY': '31/12/2024',
    
    // Valores para URLs y redes sociales
    'URL_EJEMPLO': 'https://www.ejemplo.cl',
    'URL_REDES_SOCIALES': 'https://www.ejemplo.com',
    
    // Valores para profesión y ocupación
    'PROFESION': 'Ingeniero de Software',
    
    // Valores para etnia y pueblo originario
    'ETNIA': 'No aplica',
    'PUEBLO_ORIGINARIO': 'No',
    
    // Valores para passwords
    'PASSWORD': 'password123',
    
    // Textos específicos para justificaciones
    'JUSTIFICACION_GENERICA': 'Este proyecto se basa en ciclos biológicos naturales para optimizar los procesos y minimizar el impacto ambiental, aprovechando los patrones naturales de crecimiento y desarrollo para crear soluciones más eficientes y sostenibles.',
    'CICLOS_BIOLOGICOS': 'El proyecto implementa principios de ciclos biológicos para mejorar la eficiencia y sostenibilidad de los procesos, utilizando patrones naturales de crecimiento y desarrollo.',
    
    // Valores por defecto para campos genéricos
    'OPCION_POR_DEFECTO': 'Opción por defecto',
    'ARCHIVO_PRUEBA': 'archivo_prueba.pdf',
    'SIN_OPCIONES_DISPONIBLES': 'Sin opciones disponibles',
    'PRIMERA_OPCION': 'Primera opción'
};

/**
 * Configuración por defecto del agente
 */
export const DEFAULT_CONFIG = {
    tiempoEsperaEntreCampos: 300, // milisegundos
    GENERAR_PDF_DEBUGGING: false
};




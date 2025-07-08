# 🔍 ANÁLISIS PROFUNDO DE FORMULARIOS CORFO

## 📋 Descripción

El sistema de análisis profundo es una nueva funcionalidad que permite extraer **todos** los campos de **todos** los pasos del formulario CORFO, incluyendo secciones expandibles y campos ocultos.

## 🚀 Cómo usar

### Ejecutar Análisis Profundo
```bash
npm run analisis-profundo
```

### Ejecutar Extracción Básica (anterior)
```bash
npm run scraping
```

## 🎯 Qué hace el Análisis Profundo

### 1. **Navegación Completa**
- Recorre **todos** los pasos del formulario secuencialmente
- Detecta automáticamente cuántos pasos tiene el formulario
- Navega usando botones "Siguiente", "Continuar", etc.

### 2. **Expansión de Secciones**
- Encuentra y hace clic en **todas** las secciones expandibles
- Detecta secciones como:
  - "RECOMENDACIONES Y AUTORIZACIÓN"
  - "DOCUMENTOS DE POSTULACIÓN"
  - "BASES Y FOCALIZACIÓN"
  - Cualquier accordion o collapsible

### 3. **Scroll Inteligente**
- Hace scroll completo en cada paso para cargar todo el contenido
- Detecta campos que solo aparecen después del scroll

### 4. **Detección Avanzada de Campos**
- **Todos los tipos**: text, select, textarea, checkbox, radio, date, number
- **Etiquetas inteligentes**: Busca labels asociados de múltiples formas
- **Campos requeridos**: Detecta automáticamente campos obligatorios
- **Opciones de select**: Extrae todas las opciones disponibles

## 📊 Reporte Generado

El análisis genera un archivo de texto detallado en `./data/` con:

### Información General
- Total de pasos analizados
- Total de campos encontrados
- Distribución por tipo de campo
- Fecha y hora del análisis

### Desglose por Pasos
```
PASO 1: Guía de Postulación
   - Campos directos: 5
   - Secciones expandibles: 2
   - Total campos: 12

PASO 2: Beneficiario
   - Campos directos: 15
   - Secciones expandibles: 1
   - Total campos: 20
```

### Detalle Completo de Campos
```
1. [TEXT] RUT Empresa
   Nombre: rut_empresa
   Requerido: Sí

2. [SELECT] Región
   Nombre: region
   Requerido: Sí
   Opciones: Metropolitana, Valparaíso, O'Higgins...

3. [TEXTAREA] Descripción del Proyecto
   Nombre: descripcion_proyecto
   Requerido: Sí
```

## 🛠️ Mapeo de Campos CORFO

El sistema incluye un mapeo inteligente basado en tu listado de campos CORFO:

- **Datos de Persona Jurídica**: RUT, Razón Social, Dirección
- **Datos de Persona Natural**: Nombre, Apellidos, Género
- **Datos del Proyecto**: Título, Objetivo, Duración, Montos
- **Valores por defecto**: Para diferentes tipos de campos

## 📁 Archivos Generados

- `analisis_formulario_YYYY-MM-DD-HH-mm-ss.txt`: Reporte completo
- Ubicación: `./data/`

## 🔧 Configuración

### Variables de Entorno (`.env`)
```
CORFO_USER=tu_rut
CORFO_PASS=tu_contraseña
```

### Límites de Seguridad
- Máximo 20 pasos (evita bucles infinitos)
- Timeout de 30 segundos por navegación
- Reintentos automáticos en errores temporales

## 🎯 Diferencias con Extracción Básica

| Característica | Básica | Profunda |
|---|---|---|
| Pasos analizados | 1-2 | Todos |
| Secciones expandibles | No | Sí |
| Scroll automático | Básico | Completo |
| Detección de campos | Básica | Avanzada |
| Reporte | JSON | Texto detallado |
| Navegación | Limitada | Completa |

## 🚧 Próximas Funcionalidades

### Fase 2: Autocompletado Inteligente
- Llenado automático de campos detectados
- Mapeo con datos CORFO específicos
- Validación de campos obligatorios
- Navegación hasta envío final

## ⚠️ Consideraciones

- **Tiempo de ejecución**: 5-15 minutos dependiendo del formulario
- **Conexión estable**: Requiere conexión a internet estable
- **Credenciales válidas**: Debe tener acceso válido a CORFO
- **Navegador visible**: Se ejecuta en modo no-headless para debugging

## 🐛 Solución de Problemas

### Error de credenciales
```bash
Error: Las credenciales CORFO_USER y CORFO_PASS deben estar definidas
```
**Solución**: Verificar archivo `.env`

### Timeout en navegación
```bash
Error: Timeout al navegar al siguiente paso
```
**Solución**: Verificar conexión a internet y estado del sitio CORFO

### No encuentra formularios
```bash
No se encontró ningún enlace "Más Información"
```
**Solución**: Verificar que hay convocatorias activas en CORFO

## 📞 Soporte

Si encuentras problemas o necesitas ajustes específicos, proporciona:
1. Log completo del error
2. Captura de pantalla del formulario
3. URL específica del formulario (si es diferente) 
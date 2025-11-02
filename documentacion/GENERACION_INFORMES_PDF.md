# 📄 Sistema de Generación de Informes PDF con IA

## 🎯 Descripción General

Este sistema genera automáticamente informes PDF profesionales usando **Azure OpenAI** a partir de los reportes JSON generados por el sistema de automatización de formularios CORFO.

## 📋 Características

- ✅ **Generación Automática**: Los PDFs se generan automáticamente después de completar cada ejecución
- 🤖 **Análisis con IA**: Azure OpenAI analiza los datos y genera un informe comprensivo
- 📊 **Informe Mixto**: Combina resumen ejecutivo con detalles técnicos
- 🔄 **Funciona en Todos los Modos**: Web UI y ejecución desde terminal
- 📁 **Almacenamiento Centralizado**: Todos los PDFs en `data/informes/`
- 🌐 **Endpoint de Descarga**: API REST para descargar los informes

## 🔧 Configuración Inicial

### 1. Variables de Entorno

Configura las variables de Azure OpenAI en tu archivo `.env`:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=tu-clave-api-aqui
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo
```

**¿Dónde obtener estos valores?**

1. **API Key**: Azure Portal → Tu recurso OpenAI → "Keys and Endpoint" → Key 1 o Key 2
2. **Endpoint**: Azure Portal → Tu recurso OpenAI → "Keys and Endpoint" → Endpoint
3. **Deployment Name**: Azure OpenAI Studio → Deployments → Nombre del modelo desplegado

### 2. Instalar Dependencias

```bash
npm install openai md-to-pdf
```

## 📂 Estructura de Archivos

```
corfo-automation/
├── ai/
│   └── generadorInforme.ts       # Módulo principal de generación
├── server/
│   ├── routes/
│   │   └── informes.ts            # Endpoints API para informes
│   └── services/
│       └── processService.ts      # Integración con ejecuciones UI
├── data/
│   ├── execution_results/         # JSONs de ejecuciones desde UI (exec_X.json)
│   ├── debugg_results/            # JSONs de ejecuciones desde terminal (report_X.json)
│   └── informes/                  # PDFs generados (exec_X.pdf, report_X.pdf)
└── .env                           # Variables de entorno (NO subir a git)
```

## 🚀 Uso

### Generación Automática

Los informes PDF se generan **automáticamente** en los siguientes escenarios:

#### 1️⃣ Desde la UI Web

Cuando ejecutas un proceso desde la interfaz web:

```bash
npm run start
```

**Flujo**:
1. Usuario ejecuta proceso → Sistema completa formulario
2. Se guarda `data/execution_results/exec_X.json`
3. Se genera **automáticamente** `data/informes/exec_X.pdf`
4. Usuario puede descargar el PDF desde el botón en la UI

#### 2️⃣ Desde Terminal

Cuando ejecutas el agente orquestador directamente:

```bash
npm run agente-orquestador
# o
npm run agente-orquestador-produccion
```

**Flujo**:
1. Agente completa formulario
2. Se guarda `data/debugg_results/report_X.json`
3. Se genera **automáticamente** `data/informes/report_X.pdf`

### Generación Manual

Si necesitas generar un informe PDF desde un JSON existente:

```bash
npm run generar-informe data/debugg_results/report_6.json data/informes/report_6.pdf
```

O directamente:

```bash
npx ts-node ai/generadorInforme.ts <ruta-json> <ruta-pdf-salida>
```

**Ejemplos**:

```bash
# Generar desde un reporte de debugging
npx ts-node ai/generadorInforme.ts data/debugg_results/report_6.json data/informes/mi_informe.pdf

# Generar desde un reporte de ejecución UI
npx ts-node ai/generadorInforme.ts data/execution_results/exec_1.json data/informes/exec_1_custom.pdf
```

## 🌐 API Endpoints

### 1. Descargar Informe

**Endpoint**: `GET /api/informes/descargar/:nombreArchivo`

**Descripción**: Descarga un archivo PDF de informe

**Parámetros**:
- `nombreArchivo`: Nombre del PDF (ej: `report_6.pdf`, `exec_1.pdf`)

**Ejemplo de uso desde JavaScript**:

```javascript
// Descargar un informe
fetch('http://localhost:3001/api/informes/descargar/report_6.pdf')
  .then(response => response.blob())
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report_6.pdf';
    a.click();
  });
```

**Respuestas**:
- `200`: Descarga exitosa del archivo PDF
- `400`: Formato de archivo inválido
- `404`: Archivo no encontrado
- `500`: Error del servidor

### 2. Listar Informes

**Endpoint**: `GET /api/informes/listar`

**Descripción**: Lista todos los informes PDF disponibles con metadata

**Ejemplo de uso**:

```javascript
fetch('http://localhost:3001/api/informes/listar')
  .then(response => response.json())
  .then(informes => {
    console.log(informes);
    // [
    //   {
    //     nombre: "exec_1.pdf",
    //     tamano: 245678,
    //     fechaCreacion: "2025-10-31T20:44:36.356Z",
    //     fechaModificacion: "2025-10-31T20:44:36.356Z"
    //   },
    //   ...
    // ]
  });
```

## 📊 Estructura del Informe Generado

El informe PDF incluye las siguientes secciones:

### 1. RESUMEN EJECUTIVO
- Introducción sobre el proceso
- Resultado general (éxito/fallo)
- Métricas clave destacadas

### 2. ESTADÍSTICAS CLAVE
- Tabla con estadísticas principales
- Tiempo de ejecución
- Porcentaje de éxito

### 3. ANÁLISIS POR PASOS
- Detalle de cada paso del formulario
- Campos completados vs encontrados
- Tiempo de ejecución por paso
- Estado de cada paso

### 4. CAMPOS PROBLEMÁTICOS
- Lista de campos no completados
- Indicación de obligatoriedad
- Razón del fallo
- Recomendaciones específicas

### 5. CONCLUSIONES Y RECOMENDACIONES
- Evaluación general
- Patrones identificados
- Recomendaciones técnicas
- Próximos pasos

## 🎨 Formato del Informe

- **Formato**: PDF (A4)
- **Márgenes**: 20mm en todos los lados
- **Estilo**: Markdown profesional convertido a PDF
- **Características**:
  - Encabezados jerárquicos
  - Tablas para estadísticas
  - Listas organizadas
  - Emojis para mejorar legibilidad (✅, ❌, ⚠️, 📊)

## 🔍 Solución de Problemas

### Error: "Faltan variables de entorno de Azure OpenAI"

**Causa**: No has configurado las variables de Azure OpenAI en `.env`

**Solución**:
1. Crea o edita el archivo `.env` en la raíz del proyecto
2. Agrega las 3 variables requeridas (ver sección "Configuración Inicial")
3. Reinicia el servidor: `npm run start`

### Error: "La IA no generó contenido para el informe"

**Causa**: Azure OpenAI no respondió correctamente

**Soluciones**:
- Verifica que tu API Key sea válida
- Verifica que el endpoint sea correcto
- Revisa que el deployment name exista en tu recurso Azure
- Verifica tu cuota de Azure OpenAI

### Error: "No se pudo generar el archivo PDF"

**Causa**: Problema con la conversión Markdown → PDF

**Soluciones**:
- Verifica que la carpeta `data/informes/` exista
- Verifica permisos de escritura en la carpeta
- Revisa los logs del servidor para más detalles

### El PDF no se genera pero el JSON sí

**Causa**: Error en la generación del PDF (pero el proceso principal continúa)

**Soluciones**:
- Revisa los logs del servidor (verás un mensaje específico del error)
- Puedes regenerar el PDF manualmente usando el script:
  ```bash
  npm run generar-informe data/execution_results/exec_X.json data/informes/exec_X.pdf
  ```

## 💡 Tips y Buenas Prácticas

1. **Monitorea los Logs**: La generación del PDF incluye logs detallados en consola
2. **Verifica la Cuota de Azure**: Asegúrate de tener cuota disponible en tu recurso Azure OpenAI
3. **Personaliza el Prompt**: Puedes modificar el prompt en `ai/generadorInforme.ts` línea ~133
4. **Ajusta Parámetros de IA**: Temperature y max_tokens en `ai/generadorInforme.ts` línea ~234
5. **Respaldo**: Los JSONs siempre se guardan, incluso si falla la generación del PDF

## 🔗 Integración con la UI

Para integrar el botón de descarga en tu interfaz:

```typescript
// En tu componente React/Vue/etc
const descargarInforme = async (nombreArchivo: string) => {
  try {
    const response = await fetch(`/api/informes/descargar/${nombreArchivo}`);
    
    if (!response.ok) {
      throw new Error('Error al descargar el informe');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error descargando informe:', error);
    alert('No se pudo descargar el informe');
  }
};

// Uso
<button onClick={() => descargarInforme('exec_1.pdf')}>
  📄 Descargar Informe PDF
</button>
```

## 📝 Notas Adicionales

- Los PDFs se nombran siguiendo el mismo patrón que los JSONs: `exec_X.pdf` o `report_X.pdf`
- La carpeta `data/informes/` se crea automáticamente al iniciar el servidor
- El sistema maneja errores gracefully: si falla la generación del PDF, el reporte JSON se guarda de todas formas
- La generación de PDF es asíncrona y no bloquea el flujo principal

## 🚧 Limitaciones Conocidas

1. **Dependencia de Azure**: Requiere conexión a internet y acceso a Azure OpenAI
2. **Tiempo de Generación**: Puede tomar 5-15 segundos dependiendo de la complejidad
3. **Cuota de API**: Consumo de tokens de Azure OpenAI por cada informe
4. **Idioma**: El informe se genera en español (configurable en el prompt)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa esta documentación
2. Verifica los logs del servidor
3. Revisa el archivo `.env`
4. Verifica tu configuración de Azure OpenAI

---

**Última actualización**: Noviembre 2025


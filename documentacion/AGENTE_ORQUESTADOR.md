# AGENTE ORQUESTADOR CORFO - Documentación

## 🎯 Objetivo del Agente Orquestador

El **Agente Orquestador** combina análisis + autocompletado en una sola ejecución, optimizado para completar formularios CORFO en **15-20 minutos** (vs 60+ minutos del análisis profundo). El sistema procesa formularios de forma inteligente, detectando automáticamente la estructura y completando todos los campos requeridos.

## 🚀 Características Principales

### ✅ Lo que hace el Agente Orquestador:
- **Extracción + Completado simultáneo** de campos de formulario
- **Login automático** a CORFO con múltiples estrategias (interfaz nueva, iframe, enlaces)
- **Navegación inteligente** entre fases del formulario con detección automática de estructura
- **Manejo automático** de modales de confirmación y campos faltantes
- **Detección precisa** de campos obligatorios basada en estándares HTML5
- **Generación automática de informes PDF** usando Azure OpenAI
- **Sistema de iteraciones** para completar campos faltantes detectados por modales
- **Procesamiento especial** de pasos complejos (Presupuesto con tabs, modales AGREGAR+, confirmación)
- **Envío automático** de formularios completados
- **Reporte detallado** de progreso y resultados (JSON + PDF)

### ⚡ Optimizaciones clave:
- **Detección automática de estructura**: Slick Slider, barra de progreso, pasos dinámicos
- **Extracción por demanda**: Solo analiza lo necesario para completar
- **Navegación optimizada**: Selectores específicos de CORFO con múltiples fallbacks
- **Timeouts inteligentes**: 3 minutos máximo por paso
- **Scroll progresivo**: Activa contenido dinámico de forma eficiente
- **Sistema de cache**: Reutiliza conocimiento de formularios similares (cuando está disponible)

## 📁 Archivos del Sistema

### 1. `ai/agenteOrquestador.ts` - Sistema Principal
```typescript
// Clases principales
export class AgenteOrquestador       // Orquestador principal
export interface ResultadoAgente    // Resultado completo
export interface PasoEjecucion      // Resultado por paso
export interface DetallePaso        // Detalle por campo
export interface EstadisticasEjecucion // Métricas de rendimiento
export interface EstructuraFormularioDetectada // Estructura detectada
export interface Desplegable         // Desplegables detectados
export class DetectorEstructura     // Detector de estructura del formulario
```

**Funcionalidades:**
- Login automatizado a CORFO (múltiples estrategias)
- Navegación desde borradores al formulario real
- Detección automática de estructura del formulario (Slick Slider, pasos, etc.)
- Procesamiento híbrido paso a paso con sistema de iteraciones
- Manejo inteligente de modales de confirmación
- Detección y procesamiento de pasos especiales:
  - **Paso Presupuesto**: Procesamiento de tabs dinámicos
  - **Paso con AGREGAR+**: Manejo de modales para agregar actividades
  - **Paso de Confirmación**: Verificación final y envío
- Generación de reportes JSON detallados
- **Generación automática de PDF** (opcional para debugging)
- Envío automático de formularios completados

### 2. `ai/generadorInforme.ts` - Generador de Informes PDF con IA
```typescript
export async function generarInformePDF(
  rutaJsonReporte: string, 
  rutaPdfSalida: string
)
```

**Funcionalidades:**
- Generación de informes ejecutivos usando Azure OpenAI
- Conversión automática de Markdown a PDF
- Incluye estadísticas clave, campos obligatorios, URL del formulario enviado
- Control de costos con límites de tokens y estimaciones

### 3. `ai/cacheInteligente.ts` - Sistema de Cache (Opcional)
```typescript
export class CacheInteligente         // Gestor de cache
export interface FormularioCache     // Cache de formulario
export interface EstructuraFormulario // Estructura optimizada
export interface EstrategiaAutocompletado // Estrategias aprendidas
```

**Funcionalidades:**
- Almacenamiento de estructuras de formularios
- Búsqueda por similitud de títulos y URLs
- Estrategias de autocompletado optimizadas
- Estadísticas de uso y rendimiento

## 🛠 Comandos Disponibles

```bash
# Ejecutar Agente Orquestador con configuración demo (recomendado)
npm run agente-orquestador

# Generar informe PDF manualmente (para debugging)
npm run generar-informe
```


## 🔄 Flujo de Ejecución

### Fase 1: Inicialización
1. Inicializar navegador Chromium (headless o visible según configuración)
2. Configurar timeouts optimizados (30s navegación, 45s por defecto)
3. Inicializar sistema de tracking de campos procesados

### Fase 2: Login y Navegación
1. Navegación a URL objetivo del formulario
2. Login automático a CORFO (múltiples estrategias):
   - Interfaz nueva (`#bloqueCorfoLogin`)
   - Iframe de login (`login.corfo.cl`)
   - Enlaces de login en la página
3. Detección de página de borradores
4. Navegación desde borradores al formulario real (si es necesario)
5. Acceso al formulario de postulación

### Fase 3: Detección de Estructura
1. **Detección por Slick Slider**: Identifica pasos en carruseles CORFO
2. **Detección de barra de progreso**: Identifica estructura de pasos
3. **Detección de tipos especiales**:
   - Página de confirmación (botón "Enviar")
   - Página de borradores
   - Paso de introducción
   - Paso con botón AGREGAR+
   - Paso Presupuesto (tabs dinámicos)
4. **Detección de desplegables**: Identifica secciones colapsables

### Fase 4: Procesamiento Híbrido
Para cada paso del formulario:
1. **Validar tipo de paso**:
   - Normal: Procesamiento estándar
   - Presupuesto: Procesar tabs dinámicos
   - AGREGAR+: Abrir modal y procesar
   - Confirmación: Verificación final y envío
2. **Sistema de iteraciones**:
   - Primera iteración: Completar campos iniciales
   - Intentar navegar al siguiente paso
   - Si aparece modal "No" (campos faltantes):
     - Procesar campos faltantes detectados
     - Reiterar hasta completar todos los obligatorios
   - Máximo 5 iteraciones por seguridad
3. **Scroll progresivo**: Activar contenido dinámico
4. **Extracción y completado simultáneo**:
   - Detección precisa de campos obligatorios (HTML5 estándar)
   - Completado inteligente según tipo de campo
   - Manejo especial para: selects, archivos, números con inputmask, fechas con datepicker
5. **Navegación al siguiente paso** con confirmaciones automáticas
6. **Límite de 3 minutos** por paso

### Fase 5: Envío y Finalización
1. **Paso de Confirmación**: Verificación final
2. **Envío automático**: Clic en botón "Enviar"
3. **Manejo de modales**: Confirmación de éxito, encuestas
4. **Extracción de URL final**: Captura de `urlFormularioEnviado`
5. **Generación de reportes**:
   - JSON detallado (`exec_X.json` o `report_X.json`)
   - PDF ejecutivo automático (`exec_X.pdf` o `report_X.pdf`)
6. Limpiar recursos del navegador

## 📈 Métricas Generadas

### Estadísticas por Ejecución:
- **Tiempo total** de ejecución (segundos)
- **Pasos completados** vs total de pasos detectados
- **Campos encontrados** vs campos completados
- **Campos obligatorios** totales y completados
- **Porcentaje de éxito** general
- **Velocidad** (campos por segundo)
- **Errores encontrados** con detalles
- **URL del formulario enviado** (si se completó exitosamente)

### Detalles por Paso:
- Título del paso
- Campos encontrados y completados
- Tiempo transcurrido
- Estado de éxito
- Detalles de cada campo procesado:
  - Etiqueta
  - Tipo de campo
  - Valor asignado
  - Estado de completado
  - Si es obligatorio

### Estadísticas del Cache (si está habilitado):
- Total formularios almacenados
- Formularios más usados
- Tiempo promedio estimado
- Tasa de éxito promedio

## 🎯 Beneficios del Agente Orquestador

### ⚡ Velocidad
- **15-20 minutos** vs 60+ del análisis profundo
- **5-8 minutos** con cache para formularios conocidos
- **Sin análisis previo** requerido
- **Procesamiento en paralelo** de campos dinámicos

### 🧠 Inteligencia
- **Detección automática** de estructura del formulario
- **Sistema de iteraciones** para campos faltantes
- **Detección precisa** de campos obligatorios (HTML5)
- **Manejo especializado** de pasos complejos
- **Aprendizaje automático** de patrones CORFO (con cache)

### 🛡 Seguridad y Control
- **Generación de PDF desactivable** para debugging (config: `GENERAR_PDF_DEBUGGING`)
- **Modo headless** disponible para producción
- **Control de costos** en generación de PDF con IA
- **Datos ficticios** realistas para testing
- **Validación antes de enviar** formularios

### 📊 Observabilidad
- **Reportes detallados** por paso (JSON)
- **Informes ejecutivos** en PDF con IA
- **Métricas de rendimiento** en tiempo real
- **Debugging** visual opcional
- **Logs detallados** de cada operación

## 🔧 Características Técnicas Avanzadas

### Detección de Campos Obligatorios
El sistema usa **solo criterios válidos de HTML5**:
- Atributos: `required`, `aria-required="true"`
- Clases CSS: `required`, `mandatory`, `obligatorio`, `is-required`, `form-required`
- Indicadores en etiqueta: asterisco (*), texto "obligatorio", "(requerido)"
- Verificación en contenedor padre (solo indicadores válidos)

**Criterios eliminados** (no confiables):
- `aria-invalid` (solo indica error, no obligatoriedad)
- `ng-invalid` (solo validación Angular)
- `error` class (solo indica error)
- `pattern`, `minlength`, `maxlength` (solo validación, no obligatoriedad)
- Asumir que todos los campos numéricos son obligatorios

### Manejo de Pasos Especiales

#### Paso Presupuesto
- Detección automática de tabs dinámicos (`ul[id*="ul_tb_cuentas_"]`)
- Procesamiento secuencial de cada tab
- Manejo de modales AGREGAR+ dentro de cada tab
- Guardado automático después de cada tab
- Navegación al siguiente paso solo después de procesar todos los tabs

#### Paso con Botón AGREGAR+
- Detección automática por label "Duración" + botón "AGREGAR+"
- Apertura automática del modal
- Procesamiento de campos del modal
- Guardado y cierre de modal
- Navegación automática al siguiente paso

#### Paso de Confirmación
- Detección automática por presencia de botón "Enviar" (`#BotonEnviar`)
- Verificación final (sin extracción de campos)
- Envío automático del formulario
- Manejo de modales de éxito y encuestas
- Captura de URL final del formulario enviado

### Sistema de Iteraciones
El sistema implementa un **bucle inteligente** para completar campos faltantes:
1. Completar campos iniciales
2. Intentar navegar al siguiente paso
3. Si aparece modal "No" (campos faltantes):
   - El sistema nos posiciona en los campos faltantes
   - Procesar campos faltantes (sin duplicar campos ya procesados)
   - Iterar hasta que el modal no aparezca más
4. Máximo 5 iteraciones por seguridad (previene loops infinitos)

## 🔧 Configuración y Personalización

### Variables de Entorno (.env)
```env
# Credenciales CORFO
CORFO_USER=tu_rut
CORFO_PASS=tu_password

# Azure OpenAI (para generación de PDF)
AZURE_OPENAI_API_KEY=tu_clave_api
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

### Configuración de Generación de PDF
En `ai/agenteOrquestador.ts`:
```typescript
// Configuración: Desactivar generación de PDF para ejecuciones de debugging
private static readonly GENERAR_PDF_DEBUGGING = false; // Cambiar a true para habilitar
```

- `false`: Solo guarda JSON (`report_X.json`), no genera PDF
- `true`: Guarda JSON y genera PDF (`report_X.pdf`)

**Nota**: La generación de PDF para ejecuciones desde la web (`exec_X.pdf`) siempre está activa y se controla en `processService.ts`.

## 📋 Estructura de Reportes

### Reporte JSON (`exec_X.json` o `report_X.json`)
```json
{
  "exito": true,
  "mensaje": "...",
  "titulo": "Título del formulario",
  "tituloProyecto": "...",
  "codigoProyecto": "...",
  "urlInicial": "...",
  "urlFormularioEnviado": "...",
  "fechaEjecucion": "2024-...",
  "tiempoTotal": 1234,
  "estadisticas": {
    "totalPasos": 10,
    "totalCampos": 150,
    "camposCompletados": 145,
    "porcentajeExito": 97,
    "velocidadCamposPorSegundo": 0.12,
    "tiempoPromedioPorPaso": 123
  },
  "pasosCompletados": [...],
  "errores": []
}
```

### Informe PDF (`exec_X.pdf` o `report_X.pdf`)
- Generado automáticamente usando Azure OpenAI
- Incluye resumen ejecutivo
- Estadísticas clave (total campos, campos obligatorios, porcentaje de éxito)
- URL del formulario enviado
- Detalles por paso
- Campos problemáticos

## 🚨 Consideraciones Importantes

### Limitaciones Actuales:
- **Dependiente de estructura** actual de CORFO
- **No maneja CAPTCHAs** automáticamente
- **Requiere credenciales** válidas en .env
- **Selectores específicos** de CORFO (pueden cambiar)

### Recomendaciones de Uso:
- **Usar en entorno de testing** únicamente
- **No ejecutar en producción** sin supervisión
- **Revisar reportes** antes de confiar en resultados
- **Monitorear costos** de generación de PDF con IA
- **Configurar límites** de tokens en Azure OpenAI

### Mantenimiento:
- **Actualizar selectores** si CORFO cambia su interfaz
- **Ajustar detección de campos obligatorios** si cambian estándares
- **Limpiar cache** periódicamente (si está habilitado)
- **Monitorear tasas de éxito** y ajustar según sea necesario
- **Verificar logs** para identificar problemas

## 📋 Próximos Pasos

### Inmediatos:
1. **Probar el Agente Orquestador** con diferentes formularios CORFO
2. **Refinar algoritmos** de detección de campos obligatorios
3. **Optimizar tiempos** de navegación
4. **Ajustar sistema de iteraciones** según resultados

### Corto plazo:
1. **Mejorar detección** de estructura del formulario
2. **Agregar más estrategias** de autocompletado
3. **Mejorar manejo de errores** específicos de CORFO
4. **Optimizar generación de PDF** (reducir costos)

### Mediano plazo:
1. **APIs REST** para uso programático
2. **Dashboard web** para monitoreo visual
3. **Integración con n8n** para workflows automatizados
4. **Exportación/importación** de cache

---

## 🎉 ¡El Agente Orquestador está listo para usar!

```bash
# Comando para empezar:
npm run agente-orquestador
```

### Salidas del Sistema:
- **Ejecución desde terminal**: `data/debugg_results/report_X.json` (+ PDF opcional)
- **Ejecución desde web**: `data/execution_results/exec_X.json` + `data/informes/exec_X.pdf`

El sistema generará reportes completos con todos los detalles de la ejecución, incluyendo métricas de rendimiento, campos procesados, y un informe ejecutivo en PDF generado con IA.
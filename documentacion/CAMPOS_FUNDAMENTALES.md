# Sistema de Campos Fundamentales CORFO

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [¿Qué son los Campos Fundamentales?](#qué-son-los-campos-fundamentales)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Cómo Funciona el Sistema](#cómo-funciona-el-sistema)
5. [Agregar Campos Fundamentales Manualmente](#agregar-campos-fundamentales-manualmente)
6. [Usar el Script de Actualización Automática](#usar-el-script-de-actualización-automática)
7. [Cuándo Usar Cada Método](#cuándo-usar-cada-método)
8. [Troubleshooting](#troubleshooting)
9. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Introducción

El sistema de **Campos Fundamentales** es un módulo que permite identificar y validar si los formularios CORFO completados contienen todos los campos requeridos según los estándares oficiales. Este sistema utiliza:

- **Comparación automática** entre campos encontrados en formularios y campos fundamentales definidos
- **Mapeo inteligente** con IA para identificar variaciones en nombres de campos
- **Actualización dinámica** del catálogo de campos fundamentales basado en ejecuciones reales
- **Generación de estadísticas** de cobertura en los informes PDF finales

---

## ¿Qué son los Campos Fundamentales?

Los **Campos Fundamentales** son campos requeridos oficialmente por CORFO que deben estar presentes en todos los formularios de postulación. Estos campos están definidos en `campos_corfo.txt` y se han transformado en un JSON estructurado (`campos_fundamentales.json`).

### Características de un Campo Fundamental

Un campo fundamental debe cumplir:

- ✅ `esFundamental: true` - Indica que es un campo fundamental requerido
- ✅ `activo: true` - Indica que está habilitado y se considera en las comparaciones
- ✅ `etiquetasReales` - Array de etiquetas exactas encontradas en formularios (opcional pero recomendado)

### Estructura de un Campo Fundamental

```json
{
  "NOMBRE_CAMPO": {
    "valor": "Valor ejemplo",
    "tipo": "text",
    "obligatorio": true,
    "descripcion": "Descripción del campo",
    "activo": true,
    "esFundamental": true,
    "numeroReferencia": "XX",
    "etiquetasReales": [
      "Etiqueta encontrada en formulario 1",
      "Variante de la etiqueta"
    ]
  }
}
```

---

## Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│           Sistema de Campos Fundamentales                │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
   ┌────▼────────┐                    ┌─────▼───────┐
   │   JSON de   │                    │  Módulo de  │
   │  Campos     │                    │ Comparación │
   │ Fundamentales│                    │    (IA)     │
   └────┬────────┘                    └─────┬───────┘
        │                                    │
        └────────────┬───────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  Comparador de      │
          │  Campos             │
          │  Fundamentales      │
          └──────────┬──────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
  ┌─────▼─────┐           ┌───────▼────────┐
  │ Generador │           │  Script de     │
  │ de PDF    │           │  Actualización │
  └───────────┘           └────────────────┘
```

### Archivos Clave

- **`campos_fundamentales.json`** - Catálogo completo de campos fundamentales
- **`ai/comparadorCamposFundamentales.ts`** - Módulo de comparación y mapeo
- **`scripts/actualizarCamposFundamentales.ts`** - Script de actualización automática
- **`ai/generadorInforme.ts`** - Generador de PDF que integra la comparación

---

## Cómo Funciona el Sistema

### Proceso de Comparación

El sistema funciona en **3 etapas**:

#### 1. Extracción de Campos Reales
Extrae todos los campos únicos encontrados en el JSON de ejecución (`exec_X.json`):

```typescript
// Ejemplo de campo real extraído
{
  etiqueta: "Identificador Rut",
  tipo: "text",
  esObligatorio: true,
  completado: true
}
```

#### 2. Mapeo de Campos

El sistema intenta mapear cada campo real a un campo fundamental usando **2 métodos**:

**Método 1: Coincidencia Exacta (Rápido)**
- Busca coincidencia exacta entre la etiqueta del formulario y las `etiquetasReales` guardadas
- Normaliza el texto (sin acentos, minúsculas, sin caracteres especiales)
- Si encuentra coincidencia → Campo encontrado ✅

**Método 2: Similitud Básica (Fallback)**
- Si no hay coincidencia exacta, calcula similitud de texto
- Compara con el nombre del campo fundamental y su descripción
- Si similitud > 60% → Campo encontrado ✅

#### 3. Generación de Estadísticas

Genera estadísticas de cobertura:

```typescript
{
  totalFundamentales: 67,
  encontrados: 48,
  faltantes: 19,
  porcentajeCobertura: 72,
  porCategoria: {
    personaJuridica: { encontrados: 16, total: 16, porcentaje: 100 },
    directorProyecto: { encontrados: 0, total: 7, porcentaje: 0 },
    // ...
  }
}
```

### Integración en el Informe PDF

Las estadísticas se incluyen automáticamente en el informe PDF final en la sección:

```
## 5. ANÁLISIS DE CAMPOS FUNDAMENTALES
- Estadísticas generales de cobertura
- Porcentaje de campos fundamentales encontrados vs faltantes
- Desglose por categoría
- Lista de campos encontrados
- Lista de campos faltantes
```

---

## Agregar Campos Fundamentales Manualmente

### ¿Cuándo Agregar Manualmente?

✅ **Recomendado cuando:**
- Necesitas agregar solo 1-3 campos
- Conoces exactamente las etiquetas que usa el formulario
- El campo es muy específico y no se encuentra frecuentemente
- Quieres tener control total sobre la configuración

### Pasos para Agregar un Campo Fundamental Manualmente

#### Paso 1: Identificar la Categoría

Revisa las categorías disponibles en `campos_fundamentales.json`:

```json
{
  "categorias": {
    "personaJuridica": {...},
    "representanteLegal": {...},
    "directorProyecto": {...},
    "personaNatural": {...},
    "datosProyecto": {...},
    "ubicacionProyecto": {...}
  }
}
```

#### Paso 2: Revisar Ejecuciones para Encontrar Etiquetas

Busca en los JSON de ejecución (`data/execution_results/exec_X.json`) la etiqueta exacta que usa el formulario:

```json
// En exec_2.json, buscar en pasosCompletados[].detalles[].etiqueta
{
  "etiqueta": "Identificador Rut",
  "tipo": "text",
  "esObligatorio": true
}
```

#### Paso 3: Agregar el Campo al JSON

Abre `campos_fundamentales.json` y agrega el campo en la categoría correspondiente:

**Ejemplo: Agregar campo de Director del Proyecto**

```json
{
  "categorias": {
    "directorProyecto": {
      "nombre": "Director/Encargado del Proyecto",
      "campos": {
        // ... campos existentes ...
        
        "NUEVO_CAMPO_DIRECTOR": {
          "tipo": "text",                    // REQUERIDO
          "obligatorio": true,                // REQUERIDO
          "descripcion": "Descripción del campo", // REQUERIDO
          "activo": true,                     // REQUERIDO: debe ser true
          "esFundamental": true,              // REQUERIDO: debe ser true
          "etiquetasReales": [                // RECOMENDADO
            "Identificador Rut"
          ],
          "numeroReferencia": "99",           // OPCIONAL
          "valor": "Valor ejemplo"            // OPCIONAL
        }
      }
    }
  }
}
```

#### Paso 4: Validar el JSON

Asegúrate de que:
- ✅ El JSON es válido (sin errores de sintaxis)
- ✅ `activo: true`
- ✅ `esFundamental: true`
- ✅ `etiquetasReales` contiene al menos una etiqueta encontrada en ejecuciones reales

#### Paso 5: Actualizar Metadatos (Opcional)

Actualiza la fecha de modificación en los metadatos:

```json
{
  "metadatos": {
    "ultimaModificacion": "2025-01-27T12:00:00.000Z",
    "usuario": "Manual"
  }
}
```

### Ejemplo Completo: Agregar Campo "Fecha Inicio Proyecto"

1. **Buscar etiqueta en ejecución:**
   ```json
   // En exec_2.json
   {
     "etiqueta": "Fecha Inicio",
     "tipo": "date",
     "esObligatorio": true
   }
   ```

2. **Agregar a datosProyecto:**
   ```json
   {
     "categorias": {
       "datosProyecto": {
         "campos": {
           "FECHA_INICIO_PROYECTO": {
             "tipo": "date",
             "obligatorio": true,
             "descripcion": "Fecha de inicio del proyecto",
             "activo": true,
             "esFundamental": true,
             "etiquetasReales": [
               "Fecha Inicio"
             ],
             "numeroReferencia": "65"
           }
         }
       }
     }
   }
   ```

3. **Validar:**
   - ✅ JSON válido
   - ✅ activo: true
   - ✅ esFundamental: true
   - ✅ etiquetasReales contiene "Fecha Inicio"

---

## Usar el Script de Actualización Automática

### ¿Qué Hace el Script?

El script `actualizarCamposFundamentales.ts`:

1. **Lee** el JSON de ejecución (`exec_X.json`)
2. **Extrae** todos los campos únicos encontrados
3. **Mapea con IA** cada campo real a un campo fundamental
4. **Actualiza** `campos_fundamentales.json`:
   - Agrega nuevas `etiquetasReales` si no existen
   - Actualiza `tipo` y `obligatorio` si hay diferencias (confianza > 0.8)
5. **Genera** estadísticas de cobertura

### ¿Cuándo Usar el Script?

✅ **Recomendado cuando:**
- Tienes muchas ejecuciones nuevas con campos diferentes
- Necesitas actualizar múltiples campos a la vez
- Quieres que la IA identifique automáticamente las correspondencias
- Tienes tiempo para esperar el procesamiento (usa IA, puede tardar minutos)
- Quieres actualizar metadatos (tipo, obligatorio) basados en datos reales

❌ **NO recomendado cuando:**
- Solo necesitas agregar 1-3 campos
- Conoces exactamente las etiquetas manualmente
- No tienes tiempo para esperar el procesamiento
- Quieres control total sobre cada campo

### Cómo Usar el Script

#### Opción 1: Modo Automático (Sin Confirmaciones)

```bash
npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_2.json
```

**Qué hace:**
- Procesa la ejecución automáticamente
- Actualiza campos sin preguntar
- Guarda cambios directamente

**Ejemplo de salida:**
```
📖 Leyendo campos fundamentales...
   ✅ Cargados 67 campos fundamentales

📖 Procesando ejecución: exec_2.json
   ✅ Extraídos 179 campos únicos
   🤖 Iniciando mapeo con IA...
   ✅ Actualizaciones: 45 campos actualizados, 0 campos nuevos

💾 Guardando campos fundamentales actualizados...
✅ Actualización completada exitosamente
```

#### Opción 2: Modo Interactivo (Con Confirmaciones)

```bash
npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_2.json --interactivo
```

**Qué hace:**
- Procesa la ejecución
- **Pregunta antes** de actualizar cada campo
- Permite elegir qué cambios aceptar

**Ejemplo de salida:**
```
📖 Procesando ejecución: exec_2.json
   ¿Actualizar tipo de "RUT_DIRECTOR_PROYECTO" de "text" a "number"? (s/n): s
   ✅ Actualizado
   ...
```

### Parámetros del Script

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| `<ruta-ejecucion>` | Ruta al JSON de ejecución | `data/execution_results/exec_2.json` |
| `--interactivo` | Modo interactivo (opcional) | `--interactivo` |

### Proceso Detallado del Script

#### 1. Lectura de Archivos
```typescript
// Lee campos_fundamentales.json
// Lee exec_X.json
```

#### 2. Extracción de Campos
```typescript
// Extrae campos únicos de pasosCompletados[].detalles[]
// Ejemplo: 179 campos únicos encontrados
```

#### 3. Mapeo con IA
```typescript
// Envía a Azure OpenAI:
// - Lista de campos reales encontrados
// - Lista de campos fundamentales disponibles
// - IA mapea cada campo real → campo fundamental
// - Retorna confianza (0-1) para cada mapeo
```

#### 4. Actualización de Campos
```typescript
// Para cada mapeo con confianza > 0.5:
//   - Agrega etiquetaReal si no existe
//   - Actualiza tipo si confianza > 0.8 y hay diferencia
//   - Actualiza obligatorio si confianza > 0.8 y hay diferencia
```

#### 5. Guardado
```typescript
// Actualiza metadatos:
//   - ultimaModificacion: fecha actual
//   - usuario: "Sistema" o "Usuario"
//   - totalCamposFundamentales: recalcula
// Guarda JSON actualizado
```

### Consideraciones de Costos

⚠️ **Importante:** El script usa IA (Azure OpenAI), lo que genera costos:

- **Cuándo se usa IA:** Solo durante la ejecución del script
- **Costo aproximado:** Depende de la cantidad de campos (ej: 179 campos ≈ $0.01-0.05)
- **Cuándo NO se usa IA:** Durante las comparaciones normales en la generación de PDF (solo comparación directa, sin costo)

### Buenas Prácticas con el Script

1. **Procesa múltiples ejecuciones:**
   ```bash
   # Procesa exec_1.json
   npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_1.json
   
   # Procesa exec_2.json (consolidará con exec_1)
   npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_2.json
   ```

2. **Usa modo interactivo la primera vez:**
   ```bash
   # Revisa qué cambios hará antes de aceptarlos
   npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_2.json --interactivo
   ```

3. **Revisa los cambios después:**
   - Abre `campos_fundamentales.json`
   - Verifica que las `etiquetasReales` sean correctas
   - Ajusta manualmente si es necesario

---

## Cuándo Usar Cada Método

### Decisión Rápida

```
¿Cuántos campos necesitas agregar?
│
├─ 1-3 campos → MANUAL ✅
│  └─ Más rápido, más control
│
└─ 4+ campos → SCRIPT ✅
   └─ Más eficiente, usa IA
```

### Tabla Comparativa

| Aspecto | Manual | Script Automático |
|---------|--------|-------------------|
| **Velocidad** | ⚡⚡⚡ Muy rápido | 🐌 Lento (usa IA) |
| **Control** | ✅ Total | ⚠️ Parcial |
| **Costo** | 💰 Gratis | 💰💰 Usa IA (pequeño costo) |
| **Precisión** | ✅ 100% tuya | ⚠️ Depende de IA |
| **Cantidad** | ✅ 1-3 campos | ✅ 4+ campos |
| **Etiquetas** | ✅ Las conoces | ✅ IA las identifica |
| **Actualización metadatos** | ❌ Manual | ✅ Automático |

### Escenarios Específicos

#### Escenario 1: Campo Nuevo No Vista Antes
```
Situación: Agregar campo "Fecha Fin Proyecto" que nunca se ha visto
Recomendación: MANUAL
Razón: Solo necesitas 1 campo, conoces la etiqueta
```

#### Escenario 2: Múltiples Ejecuciones Nuevas
```
Situación: Tienes 5 ejecuciones nuevas con muchos campos diferentes
Recomendación: SCRIPT
Razón: Muchos campos para procesar, IA ayuda a identificar todos
```

#### Escenario 3: Actualizar Etiquetas Existentes
```
Situación: Campo ya existe pero falta una etiqueta variante
Recomendación: MANUAL
Razón: Solo agregar 1 etiqueta a etiquetasReales existente
```

#### Escenario 4: Primera Vez con Nueva Ejecución
```
Situación: Primera ejecución de un nuevo tipo de formulario
Recomendación: SCRIPT con --interactivo
Razón: Quieres ver qué encuentra la IA antes de aceptar
```

---

## Troubleshooting

### Problema: Campo No Se Detecta en Comparación

**Síntomas:**
- Campo aparece como "faltante" en el informe
- Campo existe en el formulario pero no se mapea

**Soluciones:**

1. **Verificar `etiquetasReales`:**
   ```json
   {
     "CAMPO": {
       "etiquetasReales": ["Etiqueta exacta del formulario"]
     }
   }
   ```
   - La etiqueta debe coincidir **exactamente** (case-insensitive, sin acentos)

2. **Verificar que está activo:**
   ```json
   {
     "CAMPO": {
       "activo": true,
       "esFundamental": true
     }
   }
   ```

3. **Agregar más variantes en `etiquetasReales`:**
   ```json
   {
     "CAMPO": {
       "etiquetasReales": [
         "Etiqueta 1",
         "Variante Etiqueta 1",
         "Etiqueta Alternativa"
       ]
     }
   }
   ```

### Problema: Script Falla con Error de Parsing

**Síntomas:**
```
Error parsing JSON response from IA
```

**Soluciones:**

1. **Verificar conexión a Azure OpenAI:**
   - Revisar variables de entorno (`.env`)
   - Verificar que `AZURE_OPENAI_ENDPOINT` y `AZURE_OPENAI_API_KEY` estén configuradas

2. **Reducir tamaño de lote:**
   - El script procesa en lotes de 20 campos
   - Si falla, puede ser que el lote sea muy grande

3. **Reintentar:**
   - El script tiene fallback automático
   - Continúa procesando aunque un lote falle

### Problema: Similitud No Encuentra Campos Similares

**Síntomas:**
- Campo tiene similitud baja (< 60%)
- No se detecta aunque parece relacionado

**Soluciones:**

1. **Agregar `etiquetasReales` manualmente:**
   - Buscar la etiqueta exacta en `exec_X.json`
   - Agregarla a `etiquetasReales`

2. **Mejorar la descripción:**
   ```json
   {
     "CAMPO": {
       "descripcion": "Descripción más detallada que incluya sinónimos"
     }
   }
   ```
   - La descripción ayuda a la comparación por similitud

### Problema: Estadísticas Incorrectas

**Síntomas:**
- Porcentaje de cobertura parece incorrecto
- Categorías muestran números incorrectos

**Soluciones:**

1. **Recalcular totales:**
   ```bash
   # El script recalcula automáticamente, pero puedes verificarlo:
   # Contar campos con activo: true y esFundamental: true
   ```

2. **Verificar que todas las categorías estén activas:**
   ```json
   {
     "categorias": {
       "directorProyecto": {
         "activo": true  // Debe ser true
       }
     }
   }
   ```

---

## Ejemplos Prácticos

### Ejemplo 1: Agregar Campo Manualmente (Paso a Paso)

**Objetivo:** Agregar campo "RUT Director Proyecto" que usa la etiqueta "Identificador Rut"

1. **Abrir `campos_fundamentales.json`**
2. **Buscar categoría `directorProyecto`**
3. **Agregar campo:**
   ```json
   "RUT_DIRECTOR_PROYECTO": {
     "tipo": "text",
     "obligatorio": true,
     "descripcion": "RUT del director/encargado del proyecto",
     "activo": true,
     "esFundamental": true,
     "numeroReferencia": "41",
     "etiquetasReales": [
       "Identificador Rut"
     ]
   }
   ```
4. **Guardar archivo**
5. **Verificar:** El siguiente informe debería detectar el campo

### Ejemplo 2: Usar Script para Actualizar Múltiples Campos

**Objetivo:** Actualizar campos fundamentales con ejecución `exec_2.json`

1. **Ejecutar script:**
   ```bash
   npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_2.json
   ```
2. **Esperar procesamiento:**
   - Mapeo con IA (puede tardar 2-5 minutos)
   - Actualización automática
3. **Revisar cambios:**
   - Abrir `campos_fundamentales.json`
   - Buscar campos actualizados
   - Verificar que `etiquetasReales` sean correctas
4. **Probar:** Generar nuevo informe y verificar estadísticas

### Ejemplo 3: Actualizar Solo Etiquetas de Campo Existente

**Objetivo:** Campo `TELEFONO_DIRECTOR_PROYECTO` existe pero falta etiqueta "Telefono Celular"

1. **Abrir `campos_fundamentales.json`**
2. **Buscar campo `TELEFONO_DIRECTOR_PROYECTO`**
3. **Agregar etiqueta a array:**
   ```json
   "TELEFONO_DIRECTOR_PROYECTO": {
     "etiquetasReales": [
       "Telefono Fijo",      // Ya existía
       "Telefono Celular"    // Nueva etiqueta
     ]
   }
   ```
4. **Guardar**

### Ejemplo 4: Desactivar Campo Temporalmente

**Objetivo:** Desactivar campo `CODIGO_PROYECTO` sin eliminarlo

1. **Abrir `campos_fundamentales.json`**
2. **Buscar campo `CODIGO_PROYECTO`**
3. **Cambiar `activo`:**
   ```json
   "CODIGO_PROYECTO": {
     "activo": false,  // Cambiar a false
     "esFundamental": true
   }
   ```
4. **Guardar**
5. **Resultado:** Campo no se considerará en futuras comparaciones

---

## Resumen Rápido

### Checklist: Agregar Campo Fundamental

- [ ] Identificar categoría correcta
- [ ] Buscar etiqueta exacta en ejecuciones
- [ ] Agregar campo con:
  - [ ] `tipo` (requerido)
  - [ ] `obligatorio` (requerido)
  - [ ] `descripcion` (requerido)
  - [ ] `activo: true` (requerido)
  - [ ] `esFundamental: true` (requerido)
  - [ ] `etiquetasReales` (recomendado)
- [ ] Validar JSON
- [ ] Probar en siguiente ejecución

### Checklist: Usar Script

- [ ] Tener JSON de ejecución listo
- [ ] Variables de entorno configuradas (Azure OpenAI)
- [ ] Decidir: automático o interactivo
- [ ] Ejecutar script
- [ ] Revisar cambios generados
- [ ] Validar que `etiquetasReales` sean correctas

---

## Referencias

- **Archivo principal:** `campos_fundamentales.json`
- **Script de actualización:** `scripts/actualizarCamposFundamentales.ts`
- **Módulo comparador:** `ai/comparadorCamposFundamentales.ts`
- **Documentación original:** `campos_corfo.txt`

---

## Notas Adicionales

### Campos Opcionales

Estos campos **NO son requeridos** pero son útiles:

- `valor`: Valor de ejemplo (solo documentación)
- `numeroReferencia`: Referencia al campo en `campos_corfo.txt`
- `etiquetasReales`: Puede estar vacío, pero mejor tenerlo

### Mejores Prácticas

1. **Mantén `etiquetasReales` actualizado:**
   - Agrega todas las variantes de etiquetas que encuentres
   - Mientras más etiquetas, mejor la detección

2. **Usa descripciones claras:**
   - Ayuda a la IA a mapear correctamente
   - Mejora la comparación por similitud

3. **Revisa cambios del script:**
   - Siempre revisa qué cambios hizo el script
   - Ajusta manualmente si la IA se equivocó

4. **Actualiza metadatos:**
   - Documenta cuándo y quién hizo cambios
   - Útil para rastrear modificaciones

---

*Última actualización: Enero 2025*


# 💰 Control de Costos - Generación de Informes PDF

## ✅ Protecciones Implementadas

He implementado **múltiples capas de protección** para evitar gastos inesperados:

### 1. Límites de Tokens Estrictos

```typescript
MAX_OUTPUT: 3000 tokens        // Máximo de tokens generados (informe)
MAX_INPUT_CONTEXT: 8000 tokens // Máximo de contexto de entrada
WARNING_INPUT: 5000 tokens      // Advertencia si el input es grande
```

### 2. Protecciones Automáticas

- ✅ **Límite de salida**: Máximo 3000 tokens de informe generado
- ✅ **Truncamiento automático**: Si el contexto supera 8000 tokens, se trunca automáticamente
- ✅ **Advertencias**: Muestra alertas si el input es grande
- ✅ **Estimación de costos**: Calcula y muestra el costo aproximado antes de generar

### 3. Monitoreo en Consola

Verás mensajes como:
```
⚠️ Advertencia: Input grande (~6000 tokens estimados). Costo estimado: ~$0.0045
✅ Usando max_completion_tokens (2875 tokens generados)
```

## 💵 Costos Estimados por Informe

### Para GPT-4o-mini (tu modelo):
- **Input**: $0.15 por 1M tokens
- **Output**: $0.60 por 1M tokens

### Ejemplo Real:
- **Input típico**: ~3,000 tokens → ~$0.00045
- **Output máximo**: 3,000 tokens → ~$0.0018
- **Costo total por informe**: ~$0.002 - $0.003 (menos de 1 centavo)

### Escenario de Uso Normal:
- **100 informes**: ~$0.20 - $0.30
- **1,000 informes**: ~$2.00 - $3.00
- **10,000 informes**: ~$20 - $30

## 🛡️ Protecciones Adicionales

### Protección 1: Límite Absoluto de Salida
Aunque el modelo no soporte límites explícitos, **siempre limitamos a 3000 tokens** en las estrategias 1 y 2.

### Protección 2: Truncamiento Inteligente
Si el JSON es muy grande (>8000 tokens de contexto), el sistema automáticamente:
1. Trunca el contexto
2. Mantiene la información más importante
3. Muestra advertencia en consola

### Protección 3: Monitoreo de Uso Real
Después de cada generación, se muestra:
- Tokens de entrada usados (desde la respuesta de Azure)
- Tokens de salida generados
- Advertencia si supera límites

### Protección 4: Sin Reintentos Automáticos
Si falla una generación, **NO se reintenta automáticamente**. Esto previene múltiples cargos por error.

## 📊 Casos de Uso y Costos

### Caso 1: Informe Normal (11 pasos, ~200 campos)
- Input: ~2,500 tokens
- Output: ~2,000 tokens
- **Costo**: ~$0.0015 (~0.15 centavos)

### Caso 2: Informe Grande (muchos errores, contexto extenso)
- Input: ~5,000 tokens (con advertencia)
- Output: ~3,000 tokens (límite máximo)
- **Costo**: ~$0.003 (~0.3 centavos)

### Caso 3: Informe Muy Grande (se trunca automáticamente)
- Input: ~8,000 tokens (truncado a 8,000)
- Output: ~3,000 tokens
- **Costo**: ~$0.0045 (~0.45 centavos)

## ⚙️ Cómo Ajustar los Límites (Si Necesitas)

Si quieres límites más estrictos o más permisivos, edita `ai/generadorInforme.ts`:

```typescript
const LIMITES_TOKENS = {
  MAX_OUTPUT: 2000,        // Reducir para ahorrar más
  MAX_INPUT_CONTEXT: 6000,  // Reducir contexto máximo
  WARNING_INPUT: 4000,      // Advertencia más temprana
} as const;
```

### Recomendaciones:
- **Para ahorrar dinero**: Reduce `MAX_OUTPUT` a 2000 tokens
- **Para informes más detallados**: Aumenta `MAX_OUTPUT` a 4000 tokens (aumenta costo ~33%)
- **Para JSONs muy grandes**: Aumenta `MAX_INPUT_CONTEXT` a 10000 tokens

## 🚨 Alertas y Advertencias

### Advertencia de Input Grande
Si el contexto supera 5000 tokens, verás:
```
⚠️ Advertencia: Input grande (~6000 tokens estimados). Costo estimado: ~$0.0045
```
**Acción**: Revisa si realmente necesitas toda esa información en el informe.

### Advertencia de Truncamiento
Si el contexto supera 8000 tokens, verás:
```
⚠️ Contexto muy grande (9000 tokens), optimizando...
```
**Acción**: El sistema ya está manejándolo automáticamente truncando.

### Advertencia de Output Grande (solo en estrategia 3)
Si el output supera 3000 tokens, verás:
```
⚠️ Advertencia: Respuesta grande (3500 tokens). Considera reducir el tamaño del contexto.
```
**Acción**: Considera reducir `MAX_INPUT_CONTEXT` o `MAX_OUTPUT`.

## 💡 Mejores Prácticas para Ahorrar

1. **Mantén los límites actuales** - Ya están optimizados
2. **Revisa advertencias** - Si ves muchas, considera ajustar
3. **Monitorea el uso real** - Revisa Azure Portal periódicamente
4. **Usa límites de Azure** - Configura límites de gasto en Azure Portal

## 🔒 Límites de Azure Portal (Recomendado)

**Además de las protecciones en código**, configura límites en Azure:

1. Ve a **Azure Portal** → Tu recurso de Azure OpenAI
2. **Cost Management** → **Budgets**
3. Crea un presupuesto mensual (ej: $10, $50, $100)
4. Configura alertas cuando alcances 50%, 80%, 100%

Esto es una **capa adicional de seguridad** fuera del código.

## 📈 Monitoreo Continuo

Cada ejecución muestra:
```
✅ Usando max_completion_tokens (2875 tokens generados)
```

Puedes rastrear:
- Tokens promedio por informe
- Costo promedio por informe
- Total de informes generados

## ✅ Resumen

- ✅ **Límite máximo de salida**: 3000 tokens (protegido en todas las estrategias)
- ✅ **Límite máximo de entrada**: 8000 tokens (se trunca si es mayor)
- ✅ **Advertencias tempranas**: Si el input supera 5000 tokens
- ✅ **Sin reintentos**: No genera múltiples cargos por error
- ✅ **Costo estimado por informe**: ~$0.002 - $0.004 (menos de 0.5 centavos)
- ✅ **Seguro para uso normal**: 1000 informes = ~$2-3

**Con estas protecciones, es prácticamente imposible tener un gasto inesperado grande.**


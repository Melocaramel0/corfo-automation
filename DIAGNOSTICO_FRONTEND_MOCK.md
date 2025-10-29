# 🔍 Diagnóstico: Frontend Usando Datos MOCK

## 📋 Problema Identificado

Tu frontend está mostrando **procesos MOCK** (datos fake) en lugar de los procesos reales del backend. Por eso cuando intentas ejecutar un proceso, el backend no lo encuentra.

### Evidencia:
- **Proceso en el backend**: `process_1761749151758` (ID largo)
- **Procesos en el frontend**: `'1'`, `'2'`, `'3'` (IDs cortos) ← Estos son MOCK

### ¿Por Qué Pasa Esto?

El código tiene un **fallback a datos MOCK** cuando no puede conectarse al backend:

```typescript
// ui/src/services/processes.ts
try {
  return await apiService.getPaginated<ValidationProcess>('/processes', params)
} catch (error) {
  // ❌ Si falla, usa datos MOCK
  return [...MOCK_PROCESSES]  // IDs: '1', '2', '3'
}
```

---

## 🎯 Pasos para Resolver

### Paso 1: Verificar que el Backend Esté Corriendo

```bash
# En la terminal del backend deberías ver:
> npm run dev
Server running on port 3001
```

**Si NO ves esto**:
```bash
# Ir al directorio raíz del proyecto
cd C:\Users\henry.vines\OneDrive - corfo.cl\Documentos\GitHub\corfo-automation

# Iniciar el backend
npm run dev
```

### Paso 2: Verificar la Consola del Navegador

1. Abre el frontend: `http://localhost:5173/processes`
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Recarga la página (F5)

**Busca estos mensajes**:

#### ✅ Si el backend funciona:
```
🌐 [API] Llamando a GET /processes con params: {...}
✅ [API] Procesos obtenidos del backend: 1 procesos
```

#### ❌ Si el backend NO funciona:
```
❌ [API] Error obteniendo procesos desde API: ...
⚠️ [API] USANDO DATOS MOCK - El backend puede no estar disponible
🔍 [API] Detalles del error: {...}
```

Y también verás:
```
⚠️ [Frontend] ADVERTENCIA: Mostrando datos MOCK - Backend no está disponible
💡 [Frontend] Verifica que el backend esté corriendo en puerto 3001
```

### Paso 3: Verificar las Peticiones de Red (Network)

1. En DevTools, ve a la pestaña **Network**
2. Recarga la página (F5)
3. Busca la petición a `processes?page=1&limit=100`

**Posibles resultados**:

| Status | Significado | Solución |
|--------|-------------|----------|
| **200 OK** | ✅ Backend funciona | Debería mostrar datos reales |
| **500 Error** | ❌ Backend tiene un error | Revisar logs del backend |
| **Failed (net::ERR_CONNECTION_REFUSED)** | ❌ Backend no está corriendo | Iniciar backend con `npm run dev` |
| **404 Not Found** | ❌ Ruta incorrecta | Verificar rutas en `server/routes/processes.ts` |

### Paso 4: Probar el Backend Directamente

Abre una nueva pestaña del navegador y ve a:
```
http://localhost:3001/api/processes?page=1&limit=100
```

**Resultado esperado**:
```json
{
  "data": [
    {
      "id": "process_1761749151758",
      "nombreConcurso": "tecnologica",
      ...
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 100,
  "totalPages": 1
}
```

**Si ves esto**:
```
Cannot GET /api/processes
```
→ El backend NO está sirviendo la ruta correctamente

**Si ves esto**:
```
This site can't be reached
```
→ El backend NO está corriendo

---

## 🔧 Soluciones Según el Problema

### Problema A: Backend No Está Corriendo

```bash
# Terminal 1: Iniciar Backend
cd C:\Users\henry.vines\OneDrive - corfo.cl\Documentos\GitHub\corfo-automation
npm run dev

# Esperar a ver:
# "Server running on port 3001"

# Terminal 2: Verificar que el frontend esté corriendo
cd ui
npm run dev

# Esperar a ver:
# "Local: http://localhost:5173"
```

### Problema B: Backend Devuelve Error 500

Revisa los logs del backend (terminal donde corre `npm run dev`). Busca líneas rojas con errores.

**Errores comunes**:
- Error leyendo `data/processes.json` → Verificar que el archivo existe
- Error de OneDrive → Ya está solucionado con reintentos
- Error de sintaxis → Verificar cambios recientes

### Problema C: Frontend No Se Actualiza

```bash
# Reiniciar el frontend
# En la terminal del frontend (donde corre Vite):
Ctrl + C  # Detener
npm run dev  # Reiniciar
```

### Problema D: Puerto 3001 Ya Está en Uso

```bash
# Verificar qué proceso está usando el puerto
netstat -ano | findstr :3001

# Matar el proceso (reemplaza PID con el número que aparece)
taskkill /PID <PID> /F

# Reiniciar el backend
npm run dev
```

---

## 📊 Verificación Final

Una vez que el backend esté corriendo correctamente:

### 1. Verifica la consola del navegador (F12)

Deberías ver:
```
🌐 [API] Llamando a GET /processes con params: {...}
✅ [API] Procesos obtenidos del backend: 1 procesos
```

**NO deberías ver**:
```
❌ [API] Error obteniendo procesos desde API
⚠️ [API] USANDO DATOS MOCK
```

### 2. Verifica los procesos en la UI

Los procesos deberían tener:
- ✅ IDs largos: `process_1761749151758`
- ✅ Nombres reales: "tecnologica"
- ✅ Fechas reales

**NO deberías ver**:
- ❌ IDs cortos: `'1'`, `'2'`, `'3'`
- ❌ Nombres mock: "Validación Formulario Semilla Inicia"

### 3. Intenta ejecutar el proceso

1. Haz clic en el botón Play (▶️) del proceso "tecnologica"
2. Deberías ver:
   - ✅ Barra de progreso aparece
   - ✅ Progreso se actualiza (0% → 5% → 10% → ...)
   - ✅ Logs aparecen en tiempo real

**NO deberías ver**:
- ❌ Error: "Proceso no encontrado"
- ❌ Error: "Backend no disponible y proceso no encontrado en mock"

---

## 🎨 Cómo Identificar si Estás Usando MOCK

### Visual (en la UI):

| Mock | Real |
|------|------|
| IDs cortos: `1`, `2`, `3` | IDs largos: `process_1761749151758` |
| Nombres genéricos: "Validación Formulario Semilla Inicia" | Nombres reales: "tecnologica" |
| Fechas antiguas: "2024-01-15" | Fechas recientes: "2025-10-29" |
| Estado: "En configuración", "Cerrado" | Estado: "Ejecutado", "Creado" |

### En la Consola (F12):

**Usando Mock**:
```
❌ [API] Error obteniendo procesos desde API
⚠️ [API] USANDO DATOS MOCK
⚠️ [Frontend] ADVERTENCIA: Mostrando datos MOCK
```

**Usando Backend Real**:
```
🌐 [API] Llamando a GET /processes
✅ [API] Procesos obtenidos del backend: 1 procesos
```

---

## 📈 Mejoras Implementadas

He agregado **logs detallados** para que sea más fácil identificar el problema:

### En `ui/src/services/processes.ts`:
```typescript
console.log('🌐 [API] Llamando a GET /processes con params:', params)
console.log('✅ [API] Procesos obtenidos del backend:', result.data.length, 'procesos')

// Si hay error:
console.error('❌ [API] Error obteniendo procesos desde API:', error)
console.error('⚠️ [API] USANDO DATOS MOCK - El backend puede no estar disponible')
console.error('🔍 [API] Detalles del error:', {...})
```

### En `ui/src/pages/ValidationProcesses.tsx`:
```typescript
// Detecta automáticamente si son datos mock
if (response.data[0].id.length < 5) {
  console.warn('⚠️ [Frontend] ADVERTENCIA: Mostrando datos MOCK')
  console.warn('💡 [Frontend] Verifica que el backend esté corriendo en puerto 3001')
}
```

---

## 🆘 Si Aún No Funciona

### Checklist Completo:

- [ ] Backend está corriendo (ves "Server running on port 3001")
- [ ] Frontend está corriendo (ves "Local: http://localhost:5173")
- [ ] No hay errores en la consola del backend
- [ ] No hay errores rojos en la consola del navegador (F12)
- [ ] La petición a `/processes` en Network devuelve 200 OK
- [ ] Puedes abrir `http://localhost:3001/api/processes` y ver JSON
- [ ] Los IDs de los procesos son largos (`process_XXXXX`)
- [ ] No ves advertencias de "USANDO DATOS MOCK"

### Información para Soporte:

Si después de verificar todo sigue sin funcionar, comparte:

1. **Logs del backend** (toda la salida de la terminal)
2. **Consola del navegador** (F12 > Console > captura de pantalla)
3. **Network tab** (F12 > Network > filtrar `processes` > captura)
4. **URL directa**: Qué ves en `http://localhost:3001/api/processes`

---

## 🎯 Resumen Rápido

```bash
# 1. Verificar backend corriendo
# Terminal Backend → debería mostrar "Server running on port 3001"

# 2. Abrir frontend
# http://localhost:5173/processes

# 3. Abrir consola (F12)
# Buscar: "✅ [API] Procesos obtenidos del backend"
# NO ver: "⚠️ [API] USANDO DATOS MOCK"

# 4. Verificar IDs de procesos
# ✅ Largos: process_1761749151758
# ❌ Cortos: 1, 2, 3

# 5. Ejecutar proceso
# Debería aparecer barra de progreso
```

---

**Fecha**: 29 de Octubre de 2025  
**Estado**: Diagnóstico Completo y Soluciones Implementadas  
**Próximo Paso**: Verificar logs y confirmar conexión backend-frontend


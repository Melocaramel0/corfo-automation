# 🔍 Diagnóstico de Problemas

## ✅ Pasos para Resolver los Errores

### 1. Verificar que Backend y Frontend estén corriendo

**Debes tener DOS procesos ejecutándose simultáneamente:**

#### Opción A: Un solo comando (Recomendado)
```bash
npm start
```

#### Opción B: Dos terminales separadas

**Terminal 1 - Backend:**
```bash
npm run server:dev
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

---

### 2. Verificar que el Backend responde

Abre en tu navegador:
```
http://localhost:3001/api/health
```

**Deberías ver:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T...",
  "service": "CORFO Automation Backend"
}
```

**Si NO ves esto**, el backend NO está corriendo. Vuelve al paso 1.

---

### 3. Crear un Proceso Correctamente

1. **Abre el frontend**: http://localhost:5173
2. **Haz clic en "Crear Nuevo Concurso"**
3. **Llena TODOS los campos obligatorios:**
   - ✅ **Nombre del Concurso**: "Prueba Transición Tecnológica"
   - ✅ **Ruta del Formulario**: `https://postulador.corfo.cl/...` (URL completa del formulario)
   - ✅ **Usuario de Acceso**: Tu RUT de CORFO
   - ✅ **Contraseña**: Tu contraseña de CORFO
4. **Guarda el proceso**

---

### 4. Verificar que el Proceso se Guardó

En tu IDE, abre el archivo:
```
data/processes.json
```

**Deberías ver algo como:**
```json
[
  {
    "id": "process_1730...",
    "nombreConcurso": "Prueba Transición Tecnológica",
    "rutaFormulario": "https://postulador.corfo.cl/...",
    "credencialesAcceso": {
      "usuario": "12345678-9",
      "password": "tu_password"
    },
    "fechaCreacion": "2025-10-27T...",
    "estado": "Creado"
  }
]
```

**Si el archivo está vacío `[]`**, el backend NO está guardando. Revisa los logs del backend.

---

### 5. Ejecutar el Proceso

1. **En la lista de procesos**, busca el que acabas de crear
2. **Haz clic en el botón ▶️ (Play verde)**
3. **Espera 2-3 segundos**
4. **Deberías ver** una barra de progreso apareciendo

---

## 🐛 Errores Comunes y Soluciones

### ❌ Error: "ECONNREFUSED"

**Causa**: Backend NO está corriendo

**Solución**:
```bash
# Detener todo (Ctrl+C en todas las terminales)
# Ejecutar:
npm start
```

---

### ❌ Error: "Proceso no encontrado"

**Causa**: El proceso no se guardó en `data/processes.json`

**Solución**:
1. Verifica que el backend esté corriendo
2. Crea el proceso nuevamente
3. Abre `data/processes.json` y verifica que esté ahí

---

### ❌ Error: "Error al ejecutar el proceso"

**Causa**: Múltiples posibles causas

**Solución**:
1. Verifica los logs del backend (terminal donde corre `npm run server:dev`)
2. Busca mensajes de error en rojo
3. Copia el error y compártelo

---

## 📊 Logs Esperados (Backend funcionando correctamente)

Cuando ejecutas un proceso, deberías ver en la terminal del backend:

```
🚀 Iniciando ejecución exec_1730... para proceso process_1730...
📋 URL del formulario: https://postulador.corfo.cl/...
🚀 INICIANDO MVP HÍBRIDO - ANÁLISIS + AUTOCOMPLETADO
👻 Modo headless activado (navegador oculto)
🔧 Inicializando navegador...
✅ Navegador inicializado
🔑 Realizando login a CORFO...
```

---

## ✅ Estado Correcto del Sistema

**Backend (Terminal 1):**
```
🚀 Servidor backend iniciado en http://localhost:3001
📊 Health check disponible en http://localhost:3001/api/health
```

**Frontend (Terminal 2):**
```
VITE v4.5.14 ready in 296 ms
➜  Local:   http://localhost:5173/
```

---

## 🔧 Reiniciar Desde Cero

Si nada funciona:

```bash
# 1. Detener todo (Ctrl+C en todas las terminales)

# 2. Recompilar
npm run build

# 3. Limpiar caché (opcional)
rm -rf node_modules
npm install

# 4. Iniciar todo
npm start
```

---

## 📞 Si Sigues con Problemas

Comparte:
1. ✅ Logs de la terminal del backend
2. ✅ Logs de la consola del navegador (F12 → Console)
3. ✅ Contenido de `data/processes.json`
4. ✅ El error exacto que aparece


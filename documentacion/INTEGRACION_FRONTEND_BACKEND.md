# Integración Frontend - Backend

## 📋 Descripción

Este documento describe la integración entre el frontend (UI React) y el backend (servidor Express + MVP Híbrido).

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Usuario Final                         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Frontend (React)     │
                │   Puerto: 5173        │
                │   - Interfaz visual   │
                │   - Manejo de estado  │
                └───────────┬────────────┘
                            │
                  HTTP REST API (/api/*)
                            │
                ┌───────────▼────────────┐
                │   Backend (Express)    │
                │   Puerto: 3001        │
                │   - API REST          │
                │   - Gestión procesos  │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │   MVP Híbrido          │
                │   - Playwright        │
                │   - Automatización    │
                │   - Formularios CORFO │
                └────────────────────────┘
```

## 🚀 Inicio Rápido

### Opción 1: Iniciar todo con un solo comando

```bash
# Instalar dependencias (solo la primera vez)
npm install
cd ui && npm install && cd ..

# Iniciar frontend + backend simultáneamente
npm start
```

Esto iniciará:
- ✅ Backend en `http://localhost:3001`
- ✅ Frontend en `http://localhost:5173`

### Opción 2: Iniciar componentes por separado

**Terminal 1 - Backend:**
```bash
npm run server:dev
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

## 📁 Estructura del Proyecto

```
corfo-automation/
├── server/                      # 🔧 Backend Express
│   ├── index.ts                 # Servidor principal
│   ├── routes/                  # Rutas API
│   │   ├── processes.ts         # CRUD de procesos
│   │   ├── executions.ts        # Estado de ejecuciones
│   │   └── results.ts           # Resultados
│   └── services/                # Lógica de negocio
│       ├── processService.ts    # Gestión de procesos
│       ├── executionService.ts  # Gestión de ejecuciones
│       └── resultsService.ts    # Gestión de resultados
│
├── ai/                          # 🤖 Lógica MVP Híbrido
│   ├── mvpHibrido.ts           # Automatización CORFO
│   ├── configuraciones.ts       # Configuraciones
│   └── tipos.ts                # Tipos TypeScript
│
├── ui/                          # 🎨 Frontend React
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   ├── services/           # Servicios API
│   │   │   ├── api.ts         # Cliente HTTP
│   │   │   └── processes.ts   # Servicio de procesos
│   │   └── pages/             # Páginas
│   └── vite.config.ts         # Configuración Vite + Proxy
│
└── data/                        # 💾 Almacenamiento
    ├── processes.json           # Procesos guardados
    ├── executions.json          # Ejecuciones activas
    ├── execution_results/       # Reportes de ejecuciones desde UI (exec_1.json, exec_2.json...)
    └── debugg_results/          # Reportes de debugging desde terminal (report_1.json, report_2.json...)
```

## 📊 Sistema de Reportes

El sistema mantiene **dos tipos de reportes** con propósitos diferentes:

### 1. Reportes de UI (`data/execution_results/`)

**Propósito**: Ejecuciones monitoreadas desde la interfaz web

**Características**:
- Se generan al ejecutar procesos desde la UI
- Incluyen metadata del servidor y tracking completo
- Formato de nombres: `exec_1.json`, `exec_2.json`, `exec_3.json`...
- IDs incrementales que se reinician al eliminar la carpeta
- Carpeta se crea automáticamente si no existe

**Cuándo se usan**: 
- Ejecución desde botón "Ejecutar" en la interfaz
- Monitoreo en tiempo real con logs y progreso
- Gestión de múltiples ejecuciones simultáneas

### 2. Reportes de Debugging (`data/debugg_results/`)

**Propósito**: Ejecuciones manuales desde terminal para debugging

**Características**:
- Se generan **SOLO** al ejecutar MVP directamente desde terminal (modo no-headless)
- **NO se generan** cuando se ejecuta desde la UI (para evitar duplicados)
- Útiles para desarrollo y pruebas locales
- Formato de nombres: `report_1.json`, `report_2.json`, `report_3.json`...
- IDs incrementales independientes del sistema UI
- Carpeta se crea automáticamente si no existe

**Cuándo se usan**:
- Desarrollo y testing local desde terminal
- Debugging de problemas específicos
- Pruebas rápidas sin interfaz
- Scripts de automatización personalizados

### Contadores Incrementales

Cada carpeta mantiene su propio contador independiente:

- Al ejecutar la primera vez → `exec_1.json` / `report_1.json`
- Segunda ejecución → `exec_2.json` / `report_2.json`
- Si se elimina la carpeta → contador se reinicia desde 1

**Ejemplo**:
```bash
# Carpeta execution_results/
exec_1.json   # Primera ejecución desde UI
exec_2.json   # Segunda ejecución desde UI
exec_3.json   # Tercera ejecución desde UI

# Carpeta debugg_results/
report_1.json   # Primera ejecución desde terminal
report_2.json   # Segunda ejecución desde terminal
report_3.json   # Tercera ejecución desde terminal
```

### Auto-creación de Almacenamiento

El sistema crea automáticamente todas las carpetas y archivos necesarios:

| Elemento | Se crea cuando |
|----------|----------------|
| `data/` | Inicio del servidor |
| `data/debugg_results/` | Primera ejecución desde terminal |
| `data/execution_results/` | Primera ejecución desde UI |
| `data/processes.json` | Inicio del servidor |
| `data/executions.json` | Inicio del servidor |

✅ **Puedes eliminar estas carpetas/archivos sin problema**: el sistema los recreará automáticamente.

## 🔌 API Endpoints

### Procesos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/processes` | Listar procesos (paginado) |
| GET | `/api/processes/:id` | Obtener proceso específico |
| POST | `/api/processes` | Crear nuevo proceso |
| PUT | `/api/processes/:id` | Actualizar proceso |
| DELETE | `/api/processes/:id` | Eliminar proceso |
| POST | `/api/processes/:id/execute-monitored` | Ejecutar con monitoreo |
| GET | `/api/processes/:id/results` | Obtener resultados |
| GET | `/api/processes/:id/logs` | Obtener logs |
| GET | `/api/processes/:id/export` | Exportar resultados (CSV/JSON) |

### Ejecuciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/executions/:id/status` | Estado de ejecución |
| POST | `/api/executions/:id/cancel` | Cancelar ejecución |
| GET | `/api/executions/:id/logs` | Logs de ejecución |

### Resultados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/results/:processId` | Todos los resultados |
| GET | `/api/results/:processId/summary` | Resumen de resultados |

## 🔄 Flujo de Ejecución

### 1. Crear Proceso

**Frontend:**
```typescript
await processService.createProcess({
  nombreConcurso: "Semilla Inicia 2024",
  rutaFormulario: "https://postulador.corfo.cl/...",
  descripcion: "Validación automática",
  estado: "Creado"
})
```

**Backend:**
- Guarda el proceso en `data/processes.json`
- Retorna el proceso creado con ID único

### 2. Ejecutar Proceso

**Frontend:**
```typescript
const executionId = await processService.executeProcessWithMonitoring(processId)
```

**Backend:**
1. Crea registro de ejecución
2. Inicia `MVPHibrido` en background
3. Retorna `executionId` inmediatamente

**MVP Híbrido:**
1. Abre Playwright
2. Navega al formulario
3. Realiza login
4. Detecta estructura
5. Completa campos automáticamente
6. Genera reporte

### 3. Monitorear Ejecución

**Frontend:**
```typescript
// Polling cada 1 segundo
const status = await processService.getExecutionStatus(executionId)
console.log(status.progress) // 0-100
console.log(status.currentStep) // "Completando paso 3/7..."
```

**Backend:**
- Captura logs de `console.log` del MVP
- Analiza logs para extraer progreso
- Actualiza estado en tiempo real

### 4. Obtener Resultados

**Frontend:**
```typescript
const results = await processService.getProcessResults(processId)
```

**Backend:**
- Lee archivo de resultados del MVP
- Convierte formato `ResultadoMVP` a formato frontend
- Retorna array de resultados por campo

## 🎯 Características Principales

### ✅ Implementado

- ✅ CRUD completo de procesos
- ✅ Ejecución de MVP Híbrido desde frontend
- ✅ Monitoreo en tiempo real con progreso
- ✅ Captura de logs en vivo
- ✅ Almacenamiento persistente
- ✅ Fallback a mock en caso de error
- ✅ Exportación de resultados (CSV/JSON)
- ✅ Proxy configurado en Vite

### 🔄 En Progreso

- 🔄 WebSocket para actualizaciones en tiempo real
- 🔄 Autenticación y autorización
- 🔄 Múltiples ejecuciones simultáneas

### 📝 Por Implementar

- 📝 Dashboard con estadísticas
- 📝 Historial completo de ejecuciones
- 📝 Notificaciones push
- 📝 Comparación de resultados

## 🛠️ Desarrollo

### Agregar nueva ruta API

1. Crear archivo en `server/routes/`
2. Implementar endpoint
3. Registrar en `server/index.ts`

```typescript
// server/routes/miNuevaRuta.ts
import { Router } from 'express';
export const router = Router();

router.get('/mi-endpoint', async (req, res) => {
  // ...lógica
  res.json({ success: true });
});

// server/index.ts
import { router as miNuevaRuta } from './routes/miNuevaRuta';
app.use('/api/mi-ruta', miNuevaRuta);
```

### Agregar nuevo servicio frontend

1. Crear método en `ui/src/services/processes.ts`
2. Usar desde componentes

```typescript
// ui/src/services/processes.ts
export const processService = {
  async miNuevoMetodo(param: string) {
    const response = await apiService.get(`/mi-ruta/mi-endpoint?param=${param}`)
    return response.data
  }
}

// ui/src/components/MiComponente.tsx
const data = await processService.miNuevoMetodo('valor')
```

## 🐛 Debug y Troubleshooting

### Backend no inicia

```bash
# Verificar puerto 3001 disponible
lsof -i :3001

# Ver logs del servidor
npm run server:dev
```

### Frontend no conecta con backend

1. Verificar proxy en `ui/vite.config.ts`
2. Verificar CORS en `server/index.ts`
3. Abrir DevTools → Network → verificar llamadas a `/api/*`

### MVP Híbrido no ejecuta

1. Verificar credenciales en `.env`:
```bash
CORFO_USER=tu_usuario
CORFO_PASS=tu_password
```

2. Verificar logs del servidor
3. Verificar Playwright instalado:
```bash
npx playwright install
```

## 📊 Variables de Entorno

Crear archivo `.env` en la raíz:

```bash
# Backend
PORT=3001

# CORFO Credentials
CORFO_USER=tu_usuario
CORFO_PASS=tu_password
CORFO_URL=https://postulador.corfo.cl/...

# Configuración
NODE_ENV=development
```

## 📝 Scripts Disponibles

```bash
# 🚀 Desarrollo completo
npm start                    # Backend + Frontend simultáneo

# 🔧 Backend
npm run server              # Iniciar servidor (producción)
npm run server:dev          # Iniciar con hot-reload

# 🎨 Frontend
npm run client              # Iniciar frontend

# 🤖 MVP Híbrido (directo)
npm run mvp-hibrido         # Ejecutar desde consola
```

## 🎉 ¡Listo!

Ahora tienes el frontend completamente integrado con el backend. Puedes:

1. ✅ Crear procesos desde la interfaz
2. ✅ Ejecutar validaciones automáticas
3. ✅ Monitorear el progreso en tiempo real
4. ✅ Ver resultados y exportarlos

**URL Frontend:** http://localhost:5173  
**URL Backend:** http://localhost:3001

---

**Autor:** Sistema de Automatización CORFO  
**Versión:** 1.0.0  
**Fecha:** Octubre 2025


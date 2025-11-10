# 🚀 Inicio Rápido - Integración Frontend Backend

## ✅ Antes de comenzar

Asegúrate de tener instalado:
- Node.js (v16 o superior)
- npm o yarn

## 📦 Instalación

```bash
# Opción 1: Instalar todo (recomendado)
npm run install:all

# Opción 2: Instalar por separado
# 1. Instalar dependencias del backend
cd backend
npm install

# 2. Instalar dependencias del frontend
cd ../frontend
npm install

# 3. Instalar Playwright (para automatización)
cd ../backend
npx playwright install
```

## 🔐 Configuración

Crea un archivo `.env` en la carpeta `/backend/`:

```bash
# Puerto del servidor backend
PORT=3001

# Credenciales CORFO
CORFO_USER=tu_usuario_corfo
CORFO_PASS=tu_password_corfo

# URL del formulario (opcional)
CORFO_URL=https://postulador.corfo.cl/...

# Azure OpenAI Configuration (opcional, para generación de reportes)
AZURE_OPENAI_API_KEY=tu-clave-api-aqui
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo
```

## 🎯 Ejecutar la Aplicación

### Opción 1: Todo en uno (Recomendado)

```bash
npm start
```

Esto iniciará:
- ✅ **Backend** en http://localhost:3001
- ✅ **Frontend** en http://localhost:5173

### Opción 2: Por separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run server:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Mock users:

1. Administrador
RUT: 15124928-0
Contraseña: Admin#2025
Permisos: Acceso completo
------------------------

2. Usuario QA
RUT: 11111111-1
Contraseña: Qa#2025
Permisos: Todo excepto administración
------------------------

3. Usuario Final
RUT: 22222222-2
Contraseña: User#2025
Permisos: Solo ver y ejecutar procesos



## 🎉 Ejecutar Procesos

### Opción 1: Desde la Aplicación Web (Recomendado)

1. Abre tu navegador en: **http://localhost:5173**
2. Inicia sesión con tus credenciales
3. Crea un nuevo proceso desde la interfaz
4. Ingresa la URL del formulario CORFO
5. Haz clic en ▶️ "Ejecutar" y observa el progreso en tiempo real

### Opción 2: Desde la Terminal (CLI)

Ejecuta el agente directamente desde la terminal para debugging o ejecuciones rápidas:

```bash
cd backend
npm run agente-orquestador
```

**Flujo de ejecución desde terminal:**
1. El agente te pedirá ingresar la URL del formulario CORFO
2. Se abrirá un navegador (visible por defecto)
3. El agente realizará login automáticamente usando las credenciales de `backend/.env`
4. Procesará el formulario paso a paso
5. Al finalizar, generará un reporte JSON en `data/debugg_results/report_N.json` (raíz del proyecto)
6. Si está habilitado, también generará un PDF en `data/informes/report_N.pdf` (raíz del proyecto)

**Nota:** Los reportes generados desde terminal se guardan localmente y no se sincronizan con la base de datos de la aplicación web.

### 📁 Ubicación de Archivos Generados

Todos los archivos generados se guardan en la carpeta `data/` en la **raíz del proyecto**:

- **Reportes desde terminal**: `data/debugg_results/report_N.json` y `data/informes/report_N.pdf`
- **Reportes desde UI**: `data/execution_results/exec_N.json` y `data/informes/exec_N.pdf`
- **Datos del sistema**: `data/processes.json`, `data/executions.json`, `data/system_logs.json`

> 💡 **Tip**: La carpeta `data/` se crea automáticamente. Puedes eliminarla en cualquier momento para limpiar todos los datos y se recreará al ejecutar el sistema nuevamente.

## 📖 Más Información

Para detalles técnicos completos, consulta:
- `documentacion/INTEGRACION_FRONTEND_BACKEND.md` - API y comunicación
- `README.md` - Documentación completa del proyecto

## ❓ Problemas Comunes

### Error: Puerto 3001 en uso
```bash
# Cambiar puerto en backend/.env
PORT=3002
```

### Error: Credenciales incorrectas
Verifica que `CORFO_USER` y `CORFO_PASS` sean correctos en `backend/.env`

### Frontend no conecta con backend
Reinicia ambos servidores:
```bash
# Ctrl+C en ambas terminales
npm start
```


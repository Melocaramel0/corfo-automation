# 🚀 Inicio Rápido - Integración Frontend Backend

## ✅ Antes de comenzar

Asegúrate de tener instalado:
- Node.js (v16 o superior)
- npm o yarn

## 📦 Instalación

```bash
# 1. Instalar dependencias del backend
npm install

# 2. Instalar dependencias del frontend
cd ui
npm install
cd ..

# 3. Instalar Playwright (para automatización)
npx playwright install
```

## 🔐 Configuración

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Puerto del servidor backend
PORT=3001

# Credenciales CORFO
CORFO_USER=tu_usuario_corfo
CORFO_PASS=tu_password_corfo

# URL del formulario (opcional)
CORFO_URL=https://postulador.corfo.cl/...
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
npm run server:dev
```

**Terminal 2 - Frontend:**
```bash
npm run client
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







## 🎉 ¡Listo!

1. Abre tu navegador en: **http://localhost:5173**
2. Crea un nuevo proceso desde la interfaz
3. Ingresa la URL del formulario CORFO
4. Haz clic en ▶️ "Ejecutar" y observa el progreso en tiempo real

## 📖 Más Información

Para detalles técnicos completos, consulta: `INTEGRACION_FRONTEND_BACKEND.md`

## ❓ Problemas Comunes

### Error: Puerto 3001 en uso
```bash
# Cambiar puerto en .env
PORT=3002
```

### Error: Credenciales incorrectas
Verifica que `CORFO_USER` y `CORFO_PASS` sean correctos en `.env`

### Frontend no conecta con backend
Reinicia ambos servidores:
```bash
# Ctrl+C en ambas terminales
npm start
```


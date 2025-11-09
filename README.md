# CORFO Automation - Sistema Automatizado de Formularios

Sistema automatizado para procesamiento de formularios CORFO con análisis multi-fase y agente orquestador inteligente.

## 📁 Estructura del Proyecto (Refactorizada)

```
corfo-automation/
├── backend/               # Backend Node.js + Express + Playwright
│   ├── src/
│   │   ├── ai/           # Agente Orquestador y módulos IA
│   │   │   ├── agenteOrquestador.ts  # Agente principal
│   │   │   ├── detector.ts           # Detección de estructura
│   │   │   ├── constants.ts          # Constantes y mapeos
│   │   │   ├── types.ts              # Interfaces TypeScript
│   │   │   ├── generadorInforme.ts   # Generación de PDFs
│   │   │   └── comparadorCamposFundamentales.ts
│   │   ├── server/       # API REST Express
│   │   │   ├── index.ts
│   │   │   ├── routes/   # Rutas API
│   │   │   ├── services/ # Lógica de negocio
│   │   │   └── utils/    # Utilidades
│   │   └── scripts/      # Scripts de mantenimiento
│   ├── data/             # Datos y reportes generados
│   ├── package.json      # Dependencias backend
│   └── tsconfig.json     # Config TypeScript backend
│
├── frontend/             # Frontend React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── pages/        # Páginas principales
│   │   ├── services/     # Servicios API
│   │   └── types/        # Tipos TypeScript
│   ├── package.json      # Dependencias frontend
│   └── vite.config.ts    # Config Vite
│
├── archivos_prueba/      # Archivos para testing
├── documentacion/        # Documentación técnica
├── package.json          # Root (scripts monorepo)
└── README.md
```

## 🚀 Instalación

### Opción 1: Instalar todo (monorepo)
```bash
npm run install:all
```

### Opción 2: Instalar por separado
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

## ⚙️ Configuración

Crear archivo `.env` en `/backend/`:

```env
# Credenciales CORFO
CORFO_USER=tu_usuario
CORFO_PASS=tu_contraseña
CORFO_URL=https://ejemplo.corfo.cl/concurso/abc

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=tu-clave-api-aqui
AZURE_OPENAI_ENDPOINT=https://tu-recurso.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo
```

## 🎯 Uso

### Modo Desarrollo (Ambos servicios)
```bash
npm start
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### Solo Backend
```bash
cd backend
npm run server:dev
```

### Solo Frontend
```bash
cd frontend
npm run dev
```

### Ejecutar Agente desde CLI
```bash
cd backend
npm run agente-orquestador
```

## 📊 Features Principales

- ✅ **Agente Orquestador Inteligente** - Autocompletado automático de formularios
- ✅ **Detección Automática** - Identifica estructura multi-paso
- ✅ **Sistema de Reintentos** - Completa campos faltantes automáticamente
- ✅ **Manejo de Modales** - Confirmaciones automáticas
- ✅ **Pasos Especiales** - Soporta tabs, presupuesto, AGREGAR+
- ✅ **Generación de Reportes** - JSON + PDF automáticos
- ✅ **UI React Moderna** - Dashboard con estado en tiempo real
- ✅ **API REST** - Endpoints para gestión de procesos

## 🏗️ Arquitectura

### Backend (Node.js + TypeScript)
- **Express**: API REST
- **Playwright**: Automatización browser
- **TypeScript**: Tipado estático

### Frontend (React + TypeScript)
- **React 18**: UI components
- **Vite**: Build tool ultra-rápido
- **Tailwind CSS**: Styling moderno
- **Fetch API**: Comunicación con backend

### Modularización
El código está organizado en módulos especializados:
- `detector.ts`: Detección de estructura del formulario
- `constants.ts`: Mapeos y configuraciones
- `types.ts`: Interfaces TypeScript compartidas
- Separación clara entre backend y frontend

## 📝 Scripts Disponibles

### Root (Monorepo)
- `npm start` - Ejecutar backend + frontend
- `npm run install:all` - Instalar dependencias
- `npm run build` - Build completo

### Backend
- `npm run server` - Servidor producción
- `npm run server:dev` - Servidor con auto-reload
- `npm run build` - Compilar TypeScript
- `npm run agente-orquestador` - Ejecutar agente CLI

### Frontend
- `npm run dev` - Servidor desarrollo
- `npm run build` - Build producción
- `npm run preview` - Preview build

## 🧪 Flujo de Ejecución

1. **Inicio**: Usuario crea proceso en UI
2. **Login**: Agente se autentica en CORFO
3. **Navegación**: Detecta estructura del formulario
4. **Procesamiento**: Por cada paso:
   - Extrae campos visibles
   - Completa con datos de prueba
   - Intenta navegar al siguiente
   - Si aparece modal de campos faltantes → reintenta
5. **Confirmación**: Envía formulario final
6. **Reporte**: Genera JSON + PDF con resultados

## 📖 Documentación Adicional

Ver carpeta `/documentacion/` para guías detalladas:
- `AGENTE_ORQUESTADOR.md` - Arquitectura del agente
- `INTEGRACION_FRONTEND_BACKEND.md` - API y comunicación
- `INICIO_RAPIDO.md` - Guía de inicio
- `CONTROL_COSTOS.md` - Optimización de recursos

## 🤝 Contribuir

Este es un proyecto privado. Para contribuir, contacta al equipo de desarrollo.

## 📄 Licencia

ISC

---

**Versión**: 2.0.0 (Refactorizada)  
**Última actualización**: Noviembre 2025

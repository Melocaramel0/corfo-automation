# CORFO Automation - Sistema Automatizado de Formularios

Sistema automatizado para procesamiento de formularios CORFO con análisis multi-fase y agente orquestador inteligente.

## 📁 Estructura del Proyecto (Refactorizada)

```
corfo-automation/
├── backend/               # Backend Node.js + Express + Playwright
│   ├── src/
│   │   ├── automation/   # Módulo de automatización 
│   │   │   ├── core/     # Núcleo del agente
│   │   │   │   ├── agenteOrquestador.ts  # Agente principal (orquestación)
│   │   │   │   └── types.ts              # Interfaces TypeScript
│   │   │   ├── navigation/  # Navegación y detección
│   │   │   │   ├── detector.ts      # Detección de estructura
│   │   │   │   ├── navigator.ts     # Navegación entre pasos
│   │   │   │   └── modalHandler.ts  # Manejo de modales
│   │   │   ├── fields/   # Manejo de campos
│   │   │   │   ├── fieldExtractor.ts      # Extracción de campos
│   │   │   │   ├── fieldCompleter.ts      # Completado de campos
│   │   │   │   └── fieldValueGenerator.ts # Generación de valores
│   │   │   ├── auth/     # Autenticación
│   │   │   │   └── loginService.ts  # Servicio de login
│   │   │   ├── utils/    # Utilidades
│   │   │   │   └── waitUtils.ts     # Utilidades de espera
│   │   │   └── constants.ts         # Constantes y mapeos
│   │   ├── services/     # Servicios de análisis/reportes
│   │   │   ├── report/   # Generación de reportes
│   │   │   │   └── reportGenerator.ts  # Generación de PDFs
│   │   │   └── analysis/ # Análisis de campos
│   │   │       └── fieldComparator.ts  # Comparación de campos
│   │   ├── server/       # API REST Express
│   │   │   ├── index.ts
│   │   │   ├── routes/   # Rutas API
│   │   │   ├── services/ # Lógica de negocio
│   │   │   └── utils/    # Utilidades
│   │   └── scripts/      # Scripts de mantenimiento
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
├── data/                 # 💾 Datos y reportes generados (raíz del proyecto)
│   ├── debugg_results/   # Reportes desde terminal (report_N.json)
│   ├── execution_results/# Reportes desde UI (exec_N.json)
│   ├── informes/         # PDFs generados (report_N.pdf, exec_N.pdf)
│   ├── processes.json    # Procesos guardados
│   ├── executions.json   # Ejecuciones activas
│   ├── system_logs.json  # Logs del sistema
│   └── ai_consumption.json # Consumo de recursos IA
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

### Ejecutar Agente desde CLI / Terminal para debugg
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
El código está organizado en módulos especializados siguiendo el principio de responsabilidad única:

**Automation Core:**
- `agenteOrquestador.ts`: Orquestación principal 
- `types.ts`: Interfaces TypeScript compartidas

**Navigation:**
- `detector.ts`: Detección de estructura del formulario
- `navigator.ts`: Navegación entre pasos y URLs
- `modalHandler.ts`: Manejo de modales de confirmación

**Fields:**
- `fieldExtractor.ts`: Extracción de campos del formulario
- `fieldCompleter.ts`: Completado de campos (text, select, radio, file, etc.)
- `fieldValueGenerator.ts`: Generación inteligente de valores

**Auth:**
- `loginService.ts`: Autenticación en CORFO (múltiples interfaces)

**Services:**
- `reportGenerator.ts`: Generación de reportes PDF
- `fieldComparator.ts`: Comparación y análisis de campos

**Utils:**
- `waitUtils.ts`: Utilidades de espera optimizadas
- `constants.ts`: Mapeos y configuraciones centralizadas

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
6. **Reporte**: Genera JSON + PDF con resultados en `data/` (raíz del proyecto)

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

**Versión**: 2.1.0 (Refactorizada - Arquitectura Modular)  
**Última actualización**: Nov 2025

### 🎯 Mejoras de la Refactorización

- ✅ **Reducción de código**: `agenteOrquestador.ts` reducido de ~3,125 a 1,386 líneas (56% menos)
- ✅ **Arquitectura modular**: Servicios especializados por responsabilidad
- ✅ **Mejor mantenibilidad**: Código más fácil de entender y modificar
- ✅ **Separación de concerns**: Navegación, campos, autenticación, etc. en módulos independientes
- ✅ **Reutilización**: Servicios pueden ser utilizados independientemente
- ✅ **Organización de datos**: Carpeta `data/` centralizada en la raíz del proyecto para fácil acceso

## 💾 Almacenamiento de Datos

Todos los datos generados por el sistema se guardan en la carpeta `data/` en la **raíz del proyecto**:

- **`data/debugg_results/`**: Reportes JSON generados desde terminal (`report_1.json`, `report_2.json`, ...)
- **`data/execution_results/`**: Reportes JSON generados desde la UI (`exec_1.json`, `exec_2.json`, ...)
- **`data/informes/`**: PDFs generados automáticamente (`report_N.pdf`, `exec_N.pdf`)
- **`data/processes.json`**: Procesos de validación guardados
- **`data/executions.json`**: Estado de ejecuciones activas
- **`data/system_logs.json`**: Logs de acciones del sistema
- **`data/ai_consumption.json`**: Estadísticas de consumo de recursos IA

> **Nota**: La carpeta `data/` se crea automáticamente al iniciar el servidor. Si necesitas limpiar los datos, simplemente elimina la carpeta y se recreará automáticamente.

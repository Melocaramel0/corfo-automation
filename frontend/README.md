# CORFO Automation - Interfaz de Usuario

Sistema de validación automática de formularios CORFO con interfaz web moderna.

## 🚀 Características

- **Autenticación por roles**: Admin, QA User, User
- **Gestión de procesos**: Crear, editar, ejecutar y monitorear validaciones
- **Validación con IA**: Reglas personalizadas con prompts de IA
- **Dashboard intuitivo**: Estadísticas y actividad en tiempo real
- **Responsive**: Funciona en desktop, tablet y móvil
- **Exportación**: Resultados en CSV y JSON

## 📋 Requisitos

- Node.js 18+
- npm o yarn

## 🛠️ Instalación

```bash
# Navegar al directorio UI
cd ui

# Instalar dependencias
npm install

# Copiar variables de entorno (opcional)
cp .env.example .env
```

## 🚀 Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# El servidor estará disponible en http://localhost:5173
```

## 🏗️ Construcción

```bash
# Construir para producción
npm run build

# Vista previa de la construcción
npm run preview
```

## 👥 Credenciales de Prueba

### Administrador
- **RUT**: 15124928-0
- **Contraseña**: Admin#2025
- **Permisos**: Acceso completo, incluyendo administración

### Usuario QA
- **RUT**: 11111111-1
- **Contraseña**: Qa#2025
- **Permisos**: Todo excepto administración

### Usuario Final
- **RUT**: 22222222-2
- **Contraseña**: User#2025
- **Permisos**: Solo ver y ejecutar procesos disponibles

## 🏗️ Arquitectura

```
ui/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── auth/           # Autenticación
│   │   ├── layout/         # Layout principal
│   │   └── ui/             # Componentes UI base
│   ├── contexts/           # Contextos React
│   ├── pages/              # Páginas principales
│   ├── services/           # Servicios API
│   ├── types/              # Tipos TypeScript
│   └── utils/              # Utilidades
├── public/                 # Archivos estáticos
└── dist/                   # Build de producción
```

## 🔧 Tecnologías

- **React 18** - Framework frontend
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Framework CSS
- **React Router** - Enrutamiento
- **React Query** - Estado del servidor
- **React Hook Form** - Formularios
- **Zod** - Validación de esquemas
- **Headless UI** - Componentes accesibles
- **Driver.js** - Sistema de tours guiados
- **React Hot Toast** - Notificaciones
- **Axios** - Cliente HTTP

## 🌐 Integración con Backend

La aplicación está configurada para integrarse con el backend existente:

```typescript
// Proxy configurado en vite.config.ts
'/api' -> 'http://localhost:3001'
```

Para conectar con el backend:

1. El backend expone endpoints REST en puerto 3001
2. Los servicios en `src/services/` están completamente integrados
3. La comunicación se realiza mediante Axios con manejo de errores

## 🐳 Docker

El frontend incluye soporte Docker con Nginx para producción:

```bash
# Construir imagen
docker build -t corfo-frontend .

# O usar docker-compose desde la raíz del proyecto
docker-compose up --build
```

El frontend se sirve en el puerto 5173 (mapeado al puerto 80 de Nginx en el contenedor).

## 🎓 Tours Guiados

El sistema incluye tours interactivos implementados con Driver.js para guiar a los usuarios:

- **Dashboard**: Tour del panel principal
- **Procesos de Validación**: Tour de la página de procesos
- **Campos Fundamentales**: Tour de gestión de campos
- **Administración**: Tour del panel de administración (solo admins)

Ver `TOURS_GUIDE.md` para más información sobre cómo crear nuevos tours.

## 📱 Funcionalidades

### Dashboard
- Estadísticas generales
- Actividad reciente
- Acceso rápido a módulos
- Tour guiado interactivo

### Procesos de Validación
- ✅ Lista de procesos con filtros y búsqueda
- ✅ Crear/editar procesos con builder de reglas
- ✅ Ejecutar validaciones
- ✅ Ver resultados con filtros
- ✅ Exportar resultados (CSV/JSON)
- ✅ Eliminar procesos
- ✅ Tour guiado interactivo

### Campos Fundamentales
- ✅ Gestión completa de campos fundamentales CORFO
- ✅ Crear, editar y eliminar campos
- ✅ Organización por categorías
- ✅ Búsqueda y filtrado avanzado
- ✅ Activar/desactivar campos
- ✅ Gestión de etiquetas reales
- ✅ Tour guiado interactivo

### Administración (Solo Admin)
- ✅ Consumo de recursos IA
- ✅ Parámetros del sistema
- ✅ Logs globales
- ✅ Tour guiado interactivo

## 🔒 Seguridad

- Autenticación basada en JWT (simulada)
- Control de acceso por roles
- Validación de RUT chileno
- Rutas protegidas
- Sesión persistente

## 🚧 Estado Actual

### ✅ Completado
- [x] Configuración base del proyecto
- [x] Sistema de autenticación
- [x] Layout principal (sidebar, topbar)
- [x] Dashboard con estadísticas
- [x] Servicios y tipos TypeScript
- [x] Componentes UI base
- [x] Módulo completo de Procesos de Validación
- [x] Módulo de Campos Fundamentales
- [x] Módulo de Administración
- [x] Sistema de tours guiados (Driver.js)
- [x] Notificaciones en tiempo real
- [x] Integración completa con backend
- [x] Soporte Docker

### 🔄 En Desarrollo
- [ ] Builder de reglas de validación avanzado
- [ ] Historial de ejecuciones mejorado

### 📅 Próximas Funcionalidades
- [ ] Métricas avanzadas
- [ ] Exportación de configuraciones
- [ ] Temas personalizables

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Para soporte y preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

---

**CORFO Automation** - Sistema de Validación Automática de Formularios

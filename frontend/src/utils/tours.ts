import { TourStep } from '../hooks/useTour'

// Tour para el Dashboard
export const dashboardTourSteps: TourStep[] = [
  {
    element: '[data-tour="welcome"]',
    popover: {
      title: '¡Bienvenido al Sistema CORFO!',
      description: 'Este es tu panel principal donde podrás ver un resumen de todos tus procesos y estadísticas importantes.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="stats-total"]',
    popover: {
      title: 'Total de Procesos',
      description: 'Aquí puedes ver el número total de procesos que has creado en el sistema.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="stats-ejecutados"]',
    popover: {
      title: 'Procesos Ejecutados',
      description: 'Muestra cuántos procesos se han ejecutado exitosamente.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="stats-configuracion"]',
    popover: {
      title: 'En Configuración',
      description: 'Procesos que están siendo configurados o están pendientes de ejecución.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="stats-errores"]',
    popover: {
      title: 'Procesos con Errores',
      description: 'Procesos que han fallado durante la ejecución. Puedes revisar los detalles para corregirlos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="procesos-validacion"]',
    popover: {
      title: 'Procesos de Validación',
      description: 'Accede a la gestión completa de tus procesos de validación. Aquí puedes crear, ejecutar y monitorear tus procesos.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="actividad-reciente"]',
    popover: {
      title: 'Actividad Reciente',
      description: 'Mantente al día con las últimas acciones realizadas en el sistema.',
      side: 'top',
      align: 'start',
    },
  },
]

// Tour para la página de Procesos de Validación
export const processesTourSteps: TourStep[] = [
  {
    element: '[data-tour="create-process"]',
    popover: {
      title: 'Crear Nuevo Proceso',
      description: 'Haz clic aquí para crear un nuevo proceso de validación. Podrás configurar todos los parámetros necesarios.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="process-list"]',
    popover: {
      title: 'Lista de Procesos',
      description: 'Aquí verás todos tus procesos con su estado actual. Puedes filtrar, buscar y ordenar según tus necesidades.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="process-actions"]',
    popover: {
      title: 'Acciones Disponibles',
      description: 'Para cada proceso puedes ejecutarlo, ver resultados, editar configuración o eliminarlo.',
      side: 'left',
      align: 'start',
    },
  },
]

// Tour para Campos Fundamentales
export const camposFundamentalesTourSteps: TourStep[] = [
  {
    element: '[data-tour="campos-list"]',
    popover: {
      title: 'Campos Fundamentales',
      description: 'Aquí puedes gestionar los campos fundamentales que se utilizarán en la validación automática de formularios.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-campo"]',
    popover: {
      title: 'Agregar Campo',
      description: 'Agrega nuevos campos fundamentales que el sistema debe reconocer y completar automáticamente.',
      side: 'bottom',
      align: 'start',
    },
  },
]

// Tour para Administración (solo para admins)
export const adminTourSteps: TourStep[] = [
  {
    element: '[data-tour="admin-tabs"]',
    popover: {
      title: 'Panel de Administración',
      description: 'Como administrador, tienes acceso a diferentes secciones para gestionar el sistema.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="ai-consumption"]',
    popover: {
      title: 'Consumo de IA',
      description: 'Monitorea el consumo de recursos de IA para mantener un control de costos.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="system-logs"]',
    popover: {
      title: 'Logs del Sistema',
      description: 'Revisa los logs del sistema para diagnosticar problemas y monitorear la actividad.',
      side: 'bottom',
      align: 'start',
    },
  },
]

// Tour general de navegación
export const navigationTourSteps: TourStep[] = [
  {
    element: '[data-tour="sidebar"]',
    popover: {
      title: 'Menú de Navegación',
      description: 'Usa este menú para navegar entre las diferentes secciones del sistema.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="topbar"]',
    popover: {
      title: 'Barra Superior',
      description: 'Accede a tu perfil, notificaciones y otras opciones desde aquí.',
      side: 'bottom',
      align: 'end',
    },
  },
]


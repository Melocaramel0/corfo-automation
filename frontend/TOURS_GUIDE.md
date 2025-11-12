# Guía de Tours con Driver.js

Esta guía explica cómo usar el sistema de tours implementado con driver.js en el proyecto.

## Estructura

El sistema de tours está compuesto por:

1. **Hook personalizado** (`src/hooks/useTour.ts`): Maneja la lógica de los tours
2. **Configuraciones de tours** (`src/utils/tours.ts`): Define los pasos de cada tour
3. **Componente TourButton** (`src/components/ui/TourButton.tsx`): Botón para iniciar tours

## Cómo agregar un tour a una página

### 1. Definir los pasos del tour

En `src/utils/tours.ts`, agrega una nueva configuración de pasos:

```typescript
export const miNuevaPaginaTourSteps: TourStep[] = [
  {
    element: '[data-tour="elemento-1"]',
    popover: {
      title: 'Título del paso',
      description: 'Descripción detallada del elemento',
      side: 'bottom', // 'top' | 'right' | 'bottom' | 'left'
      align: 'start', // 'start' | 'center' | 'end'
    },
  },
  // ... más pasos
]
```

### 2. Agregar atributos data-tour a los elementos

En tu componente, agrega el atributo `data-tour` a los elementos que quieres destacar:

```tsx
<div className="card" data-tour="elemento-1">
  {/* Contenido */}
</div>
```

### 3. Integrar el hook y el botón

En tu componente de página:

```tsx
import { useTour } from '../hooks/useTour'
import { miNuevaPaginaTourSteps } from '../utils/tours'
import { TourButton } from '../components/ui/TourButton'

const MiNuevaPagina: React.FC = () => {
  // Configurar el tour
  const { start: startTour } = useTour({
    steps: miNuevaPaginaTourSteps,
    showProgress: true,
    allowClose: true,
    overlayColor: '#221E7C',
  })

  return (
    <div>
      {/* Botón para iniciar el tour */}
      <TourButton onClick={startTour} variant="icon" />
      
      {/* Elementos con data-tour */}
      <div data-tour="elemento-1">
        {/* Contenido */}
      </div>
    </div>
  )
}
```

## Variantes del TourButton

El componente `TourButton` tiene tres variantes:

- **`default`**: Botón completo con texto e icono
- **`icon`**: Solo icono (útil para headers)
- **`text`**: Texto con icono (útil para enlaces)

```tsx
<TourButton onClick={startTour} variant="icon" />
<TourButton onClick={startTour} variant="text" label="Iniciar Tour" />
<TourButton onClick={startTour} variant="default" label="Iniciar Tour Guiado" />
```

## Personalización

### Colores

Los tours usan los colores de CORFO por defecto:
- Overlay: `#221E7C` (azul CORFO)
- Botones: `#221E7C` (azul CORFO)
- Títulos: `#221E7C` (azul CORFO)

Puedes personalizar estos colores en la configuración del tour:

```tsx
const { start: startTour } = useTour({
  steps: miTourSteps,
  overlayColor: '#tu-color-personalizado',
})
```

### Callbacks

Puedes agregar callbacks para reaccionar a eventos del tour:

```tsx
const { start: startTour } = useTour({
  steps: miTourSteps,
  onHighlightStarted: (element, step) => {
    console.log('Iniciando paso:', step.popover.title)
  },
  onHighlighted: (element, step) => {
    console.log('Elemento destacado:', element)
  },
  onDestroyed: () => {
    console.log('Tour finalizado')
  },
})
```

## Ejemplo completo

Ver `src/pages/Dashboard.tsx` para un ejemplo completo de implementación.

## Tours disponibles

- **Dashboard**: Tour del panel principal
- **Procesos de Validación**: Tour de la página de procesos
- **Campos Fundamentales**: Tour de gestión de campos
- **Administración**: Tour del panel de administración (solo admins)
- **Navegación**: Tour general de navegación

## Mejores prácticas

1. **Mantén los tours cortos**: Máximo 5-7 pasos
2. **Usa descripciones claras**: Explica qué hace cada elemento
3. **Ordena lógicamente**: Sigue el flujo natural de uso
4. **Posiciona bien los popovers**: Usa `side` y `align` para mejor UX
5. **Permite cerrar**: Siempre permite que el usuario cierre el tour


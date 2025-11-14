import { useEffect, useRef, useMemo } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import type { Driver } from 'driver.js'

export interface TourStep {
  element: string
  popover: {
    title: string
    description: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
  }
}

export interface TourConfig {
  steps: TourStep[]
  onHighlightStarted?: (element: HTMLElement, step: TourStep) => void
  onHighlighted?: (element: HTMLElement, step: TourStep) => void
  onDeselected?: (element: HTMLElement, step: TourStep) => void
  onDestroyed?: () => void
  allowClose?: boolean
  overlayColor?: string
  showProgress?: boolean
  showButtons?: ('next' | 'previous' | 'close')[]
  disableActiveInteraction?: boolean
}

// Estilos personalizados - solo se agregan una vez
let stylesAdded = false

const addCustomStyles = () => {
  if (stylesAdded) return
  
  const styleId = 'driver-custom-styles'
  if (document.getElementById(styleId)) return
  
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    .driver-popover-custom {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .driver-popover-custom .driver-popover-title {
      color: #221E7C;
      font-weight: 600;
      font-size: 1.125rem;
    }
    .driver-popover-custom .driver-popover-description {
      color: #4B5563;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .driver-popover-custom .driver-popover-footer button {
      background-color: #221E7C;
      color: white;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .driver-popover-custom .driver-popover-footer button:hover {
      background-color: #1a175f;
    }
    .driver-popover-custom .driver-popover-footer button.driver-prev-btn {
      background-color: #6B7280;
    }
    .driver-popover-custom .driver-popover-footer button.driver-prev-btn:hover {
      background-color: #4B5563;
    }
  `
  document.head.appendChild(style)
  stylesAdded = true
}

export const useTour = (config: TourConfig) => {
  const driverRef = useRef<Driver | null>(null)
  const configRef = useRef(config)

  // Actualizar la referencia de config cuando cambia
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Memoizar los steps para evitar recreaciones innecesarias
  const steps = useMemo(() => config.steps, [config.steps])

  useEffect(() => {
    // Agregar estilos personalizados una sola vez
    addCustomStyles()

    // Destruir driver anterior si existe
    if (driverRef.current) {
      driverRef.current.destroy()
    }

    // Crear nuevo driver
    driverRef.current = driver({
      showProgress: config.showProgress ?? true,
      allowClose: config.allowClose ?? true,
      overlayColor: config.overlayColor ?? '#221E7C',
      showButtons: config.showButtons ?? ['next', 'previous', 'close'],
      disableActiveInteraction: config.disableActiveInteraction ?? false,
      steps: steps.map(step => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side ?? 'bottom',
          align: step.popover.align ?? 'start',
          className: 'driver-popover-custom',
        },
        onHighlightStarted: (element) => {
          configRef.current.onHighlightStarted?.(element as HTMLElement, step)
        },
        onHighlighted: (element) => {
          configRef.current.onHighlighted?.(element as HTMLElement, step)
        },
        onDeselected: (element) => {
          configRef.current.onDeselected?.(element as HTMLElement, step)
        },
      })),
      onDestroyed: () => {
        configRef.current.onDestroyed?.()
      },
    })

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [steps, config.showProgress, config.allowClose, config.overlayColor, config.showButtons, config.disableActiveInteraction])

  const start = () => {
    if (driverRef.current) {
      driverRef.current.drive()
    }
  }

  const highlight = (stepIndex: number) => {
    if (driverRef.current) {
      driverRef.current.moveTo(stepIndex)
    }
  }

  const destroy = () => {
    if (driverRef.current) {
      driverRef.current.destroy()
    }
  }

  return {
    start,
    highlight,
    destroy,
    driver: driverRef.current,
  }
}


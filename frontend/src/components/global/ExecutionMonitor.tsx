import React, { useEffect, useRef } from 'react'
import { processService } from '../../services/processes'
import { useNotifications } from '../../contexts/NotificationContext'
import { ExecutionStatus } from '../../types'

interface ExecutionState {
  executionId: string
  processId: string
  status: ExecutionStatus
}

// Set global para rastrear ejecuciones ya notificadas
const notifiedExecutions = new Set<string>()

export const ExecutionMonitor: React.FC = () => {
  const { addNotification } = useNotifications()
  const previousExecutionsRef = useRef<Map<string, ExecutionState>>(new Map())

  // Cargar ejecuciones activas al montar
  useEffect(() => {
    loadActiveExecutions()
  }, [])

  const loadActiveExecutions = async () => {
    try {
      const executions = await processService.getActiveExecutions()
      const executionsMap = new Map<string, ExecutionState>()

      executions.forEach((exec: ExecutionStatus) => {
        const executionId = exec.executionId || ''
        const processId = exec.processId || ''
        
        if (executionId && processId && exec.isRunning) {
          executionsMap.set(executionId, {
            executionId,
            processId,
            status: exec
          })
        }
      })

      previousExecutionsRef.current = new Map(executionsMap)
    } catch (error) {
      console.error('[ExecutionMonitor] Error cargando ejecuciones activas:', error)
    }
  }

  // Polling simple
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const currentActive = await processService.getActiveExecutions()
        const newExecutions = new Map<string, ExecutionState>()
        const previousExecutions = previousExecutionsRef.current

        // Procesar ejecuciones activas
        currentActive.forEach((exec: ExecutionStatus) => {
          const executionId = exec.executionId || ''
          const processId = exec.processId || ''
          
          if (executionId && processId && exec.isRunning) {
            newExecutions.set(executionId, {
              executionId,
              processId,
              status: exec
            })
          }
        })

        // Detectar ejecuciones que terminaron
        previousExecutions.forEach(({ executionId, processId, status: prevStatus }) => {
          if (!newExecutions.has(executionId) && prevStatus.isRunning) {
            // Verificar que no hayamos notificado ya esta ejecución
            if (!notifiedExecutions.has(executionId)) {
              // Marcar como notificada inmediatamente
              notifiedExecutions.add(executionId)
              
              // Obtener estado final y notificar
              processService.getExecutionStatus(executionId).then(finalStatus => {
                if (finalStatus && !finalStatus.isRunning) {
                  triggerNotification(processId, finalStatus)
                }
              }).catch(() => {
                triggerNotification(processId, { ...prevStatus, isRunning: false } as ExecutionStatus)
              })
            }
          }
        })

        previousExecutionsRef.current = newExecutions
      } catch (error) {
        console.error('[ExecutionMonitor] Error en polling:', error)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  const triggerNotification = async (processId: string, status: ExecutionStatus) => {
    try {
      const process = await processService.getProcess(processId)
      const processName = process?.nombreConcurso || 'Proceso desconocido'

      if (status.error) {
        addNotification({
          type: 'error',
          title: 'Proceso Fallido',
          message: `El proceso "${processName}" ha finalizado con errores.`,
          processId,
          processName
        }, true)
      } else if (status.progress === 100) {
        addNotification({
          type: 'success',
          title: 'Proceso Completado',
          message: `El proceso "${processName}" se ha completado exitosamente.`,
          processId,
          processName
        }, true)
      } else {
        addNotification({
          type: 'info',
          title: 'Proceso Finalizado',
          message: `El proceso "${processName}" ha finalizado.`,
          processId,
          processName
        }, true)
      }
    } catch (error) {
      addNotification({
        type: status.error ? 'error' : 'info',
        title: status.error ? 'Proceso Fallido' : 'Proceso Finalizado',
        message: `Una ejecución ha finalizado.`,
        processId
      }, true)
    }
  }

  return null
}

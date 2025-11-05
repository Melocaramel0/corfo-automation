import React from 'react'
import { Clock, X, AlertCircle } from 'lucide-react'
import { ExecutionStatus } from '../../types'

interface ExecutionProgressBarProps {
  executionStatus: ExecutionStatus
  onCancel: () => void
}

export const ExecutionProgressBar: React.FC<ExecutionProgressBarProps> = ({
  executionStatus,
  onCancel
}) => {
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${remainingSeconds}s`
  }

  const getProgressColor = () => {
    if (executionStatus.error) return 'bg-corfoRed-500'
    if (!executionStatus.isRunning && executionStatus.progress === 100) return 'bg-corfoAqua-100'
    return 'bg-corfo-500'
  }

  const getStatusText = () => {
    if (executionStatus.error) return 'Error en la ejecución'
    if (!executionStatus.isRunning && executionStatus.progress === 100) return 'Proceso completado exitosamente'
    return executionStatus.currentStep || 'Procesando...'
  }

  return (
    <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {executionStatus.error ? (
              <AlertCircle className="w-5 h-5 text-corfoRed-500" />
            ) : (
              <div className={`w-3 h-3 rounded-full ${executionStatus.isRunning ? 'animate-pulse bg-corfo-500' : 'bg-corfoAqua-100'}`} />
            )}
            <h3 className="text-lg font-semibold text-corfoGray-90">
              Ejecución del Proceso MVP
            </h3>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-corfoGray-60">
            <Clock className="w-4 h-4" />
            <span>{formatTime(executionStatus.elapsedTime)}</span>
          </div>
        </div>

        {executionStatus.isRunning && (
          <button
            onClick={onCancel}
            className="flex items-center px-3 py-1 text-corfoRed-500 hover:text-corfoRed-600 hover:bg-corfoRed-20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-corfoGray-60 mb-1">
          <span>{getStatusText()}</span>
          <span>{executionStatus.progress}%</span>
        </div>
        <div className="w-full bg-corfoGray-40 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${executionStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Logs recientes */}
      {executionStatus.logs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-corfoGray-80 mb-2">Últimos eventos:</h4>
          <div className="bg-corfoGray-10 rounded-lg p-3 max-h-32 overflow-y-auto">
            {executionStatus.logs.slice(-5).map((log, index) => {
              // Formatear fecha de manera segura
              let fechaFormateada = ''
              try {
                if (log.fecha) {
                  const fecha = new Date(log.fecha)
                  if (!isNaN(fecha.getTime())) {
                    fechaFormateada = fecha.toLocaleTimeString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  }
                }
              } catch (e) {
                // Si falla, usar número de evento
                fechaFormateada = `Evento ${index + 1}`
              }

              // Si no hay fecha válida, usar timestamp relativo
              if (!fechaFormateada) {
                fechaFormateada = `Hace ${Math.max(1, executionStatus.logs.length - index)}s`
              }

              return (
                <div key={log.id} className="text-xs text-corfoGray-60 mb-1 last:mb-0 flex items-start">
                  <span className="text-corfoGray-50 font-medium min-w-[60px]">
                    {fechaFormateada}
                  </span>
                  <span className="text-corfoGray-50 mx-2">-</span>
                  <div className="flex-1">
                    {log.accion && (
                      <span className="text-corfoGray-70 font-medium">{log.accion}: </span>
                    )}
                    <span className="text-corfoGray-60">{log.descripcion || 'Evento sin descripción'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error message */}
      {executionStatus.error && (
        <div className="mt-3 p-3 bg-corfoRed-20 border border-corfoRed-75 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-corfoRed-500 mr-2" />
            <span className="text-sm text-corfoRed-500">{executionStatus.error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

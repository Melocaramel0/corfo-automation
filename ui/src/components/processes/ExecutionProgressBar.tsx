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
    if (executionStatus.error) return 'bg-red-500'
    if (!executionStatus.isRunning && executionStatus.progress === 100) return 'bg-green-500'
    return 'bg-corfo-600'
  }

  const getStatusText = () => {
    if (executionStatus.error) return 'Error en la ejecución'
    if (!executionStatus.isRunning && executionStatus.progress === 100) return 'Proceso completado exitosamente'
    return executionStatus.currentStep || 'Procesando...'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {executionStatus.error ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : (
              <div className={`w-3 h-3 rounded-full ${executionStatus.isRunning ? 'animate-pulse bg-corfo-600' : 'bg-green-500'}`} />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              Ejecución del Proceso MVP
            </h3>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{formatTime(executionStatus.elapsedTime)}</span>
          </div>
        </div>

        {executionStatus.isRunning && (
          <button
            onClick={onCancel}
            className="flex items-center px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{getStatusText()}</span>
          <span>{executionStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${executionStatus.progress}%` }}
          />
        </div>
      </div>

      {/* Logs recientes */}
      {executionStatus.logs.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Últimos eventos:</h4>
          <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {executionStatus.logs.slice(-5).map((log) => (
              <div key={log.id} className="text-xs text-gray-600 mb-1 last:mb-0">
                <span className="text-gray-400">
                  {new Date(log.fecha).toLocaleTimeString('es-CL')}
                </span>
                {' - '}
                <span>{log.descripcion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {executionStatus.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
            <span className="text-sm text-red-700">{executionStatus.error}</span>
          </div>
        </div>
      )}
    </div>
  )
}

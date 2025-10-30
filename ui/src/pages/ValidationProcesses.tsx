import React, { useState, useEffect } from 'react'
import { 
  Play, 
  Plus, 
  Edit, 
  BarChart3, 
  Trash2, 
  Search,
  Filter,
  Download,
  User,
  Calendar,
  StopCircle
} from 'lucide-react'
import { ValidationProcess, ExecutionStatus } from '../types'
import { processService } from '../services/processes'
import { Badge } from '../components/ui/Badge'
import { CreateProcessModal } from '../components/processes/CreateProcessModal'
import { ResultsModal } from '../components/processes/ResultsModal'
import { ExecutionProgressBar } from '../components/processes/ExecutionProgressBar'

export const ValidationProcesses: React.FC = () => {
  const [processes, setProcesses] = useState<ValidationProcess[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProcess, setSelectedProcess] = useState<ValidationProcess | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null)
  const [executingProcessId, setExecutingProcessId] = useState<string | null>(null) // ID del proceso en ejecución

  // Cargar procesos al montar el componente
  useEffect(() => {
    loadProcesses()
  }, [])

  // Polling para actualizar estado de ejecución
  useEffect(() => {
    if (currentExecutionId && executionStatus?.isRunning) {
      const interval = setInterval(async () => {
        try {
          const status = await processService.getExecutionStatus(currentExecutionId)
          setExecutionStatus(status)
          
          if (status && !status.isRunning) {
            setCurrentExecutionId(null)
            setExecutingProcessId(null) // Limpiar el proceso en ejecución
            loadProcesses() // Recargar procesos cuando termine
          }
        } catch (error) {
          console.error('Error obteniendo estado de ejecución:', error)
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [currentExecutionId, executionStatus?.isRunning])

  const loadProcesses = async () => {
    try {
      setLoading(true)
      const response = await processService.getProcesses({ 
        page: 1, 
        limit: 100,
        search: searchTerm 
      })
      setProcesses(response.data)
      
      // Verificar si son datos mock (IDs simples como '1', '2', '3')
      if (response.data.length > 0 && response.data[0].id.length < 5) {
        console.warn('⚠️ [Frontend] ADVERTENCIA: Mostrando datos MOCK - Backend no está disponible')
        console.warn('💡 [Frontend] Verifica que el backend esté corriendo en puerto 3001')
      }
    } catch (error) {
      console.error('Error cargando procesos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadProcesses()
  }

  const handleExecuteProcess = async (process: ValidationProcess) => {
    console.log(`🎯 [Frontend] Ejecutando proceso:`, { id: process.id, nombre: process.nombreConcurso })
    
    try {
      // Actualizar estado del proceso inmediatamente a "Procesando" en la UI
      setProcesses(prevProcesses => 
        prevProcesses.map(p => 
          p.id === process.id ? { ...p, estado: 'Procesando' } : p
        )
      )
      
      // Marcar este proceso como el que se está ejecutando
      setExecutingProcessId(process.id)
      
      const executionId = await processService.executeProcessWithMonitoring(process.id)
      console.log(`✅ [Frontend] Execution ID recibido:`, executionId)
      
      setCurrentExecutionId(executionId)
      
      // Obtener estado inicial (con pequeño delay para que el backend inicialice)
      await new Promise(resolve => setTimeout(resolve, 500))
      const status = await processService.getExecutionStatus(executionId)
      setExecutionStatus(status)
      
      console.log('✅ [Frontend] Ejecución iniciada correctamente:', executionId)
    } catch (error) {
      console.error('❌ [Frontend] Error ejecutando proceso:', error)
      
      // Limpiar estado de ejecución en caso de error
      setExecutingProcessId(null)
      
      // Extraer mensaje de error detallado
      const errorMessage = (error as any)?.response?.data?.error || (error as Error).message
      
      console.error('❌ [Frontend] Mensaje de error:', errorMessage)
      console.error('❌ [Frontend] Proceso que intentó ejecutar:', { id: process.id, nombre: process.nombreConcurso })
      
      // Recargar la lista de procesos en caso de que esté desactualizada
      console.log('🔄 [Frontend] Recargando lista de procesos...')
      await loadProcesses()
      
      // Mostrar error al usuario con mensaje más amigable
      alert(`Error al ejecutar el proceso:\n\n${errorMessage}\n\n💡 La lista de procesos se ha actualizado. Por favor, selecciona un proceso válido e intenta nuevamente.`)
    }
  }

  const handleCancelExecution = async () => {
    if (!currentExecutionId) return
    
    try {
      console.log(`🛑 [Frontend] Cancelando ejecución:`, currentExecutionId)
      await processService.cancelExecution(currentExecutionId)
      
      setExecutionStatus(null)
      setCurrentExecutionId(null)
      setExecutingProcessId(null) // Limpiar el proceso en ejecución
      
      console.log('✅ [Frontend] Ejecución cancelada correctamente')
      
      // Recargar procesos para actualizar estados
      await loadProcesses()
    } catch (error) {
      console.error('❌ [Frontend] Error cancelando ejecución:', error)
      alert('Error al cancelar la ejecución')
    }
  }

  const handleCreateProcess = () => {
    setSelectedProcess(null)
    setShowCreateModal(true)
  }

  const handleEditProcess = (process: ValidationProcess) => {
    setSelectedProcess(process)
    setShowCreateModal(true)
  }

  const handleViewResults = (process: ValidationProcess) => {
    setSelectedProcess(process)
    setShowResultsModal(true)
  }

  const handleDeleteProcess = async (process: ValidationProcess) => {
    if (window.confirm(`¿Estás seguro de eliminar el concurso "${process.nombreConcurso}"?`)) {
      try {
        await processService.deleteProcess(process.id)
        loadProcesses()
      } catch (error) {
        console.error('Error eliminando proceso:', error)
        alert('Error al eliminar el proceso')
      }
    }
  }

  const handleExportResults = async (process: ValidationProcess) => {
    try {
      await processService.exportResults(process.id, 'json')
    } catch (error) {
      console.error('Error exportando resultados:', error)
      alert('Error al exportar los resultados')
    }
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      'Creado': 'bg-blue-100 text-blue-800',
      'En configuración': 'bg-yellow-100 text-yellow-800',
      'Ejecutado': 'bg-green-100 text-green-800',
      'Cerrado': 'bg-gray-100 text-gray-800',
      'Anulado': 'bg-red-100 text-red-800',
      'Borrado': 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL')
  }

  const filteredProcesses = processes.filter(process => 
    process.estado !== 'Borrado'
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Procesos de Validación</h1>
        <button
          onClick={handleCreateProcess}
          className="flex items-center px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Concurso
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre del concurso, descripción o creador..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progreso de ejecución */}
      {executionStatus && executionStatus.isRunning && (
        <ExecutionProgressBar 
          executionStatus={executionStatus}
          onCancel={() => {
            if (currentExecutionId) {
              processService.cancelExecution(currentExecutionId)
              setCurrentExecutionId(null)
              setExecutionStatus(null)
              setExecutingProcessId(null)
            }
          }}
        />
      )}

      {/* Tabla de procesos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Concurso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Creador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de Creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Cargando procesos...
                </td>
              </tr>
            ) : filteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron procesos
                </td>
              </tr>
            ) : (
              filteredProcesses.map((process) => (
                <tr key={process.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {process.nombreConcurso}
                      </div>
                      {process.descripcion && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {process.descripcion}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {process.usuarioCreacion.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {formatDate(process.fechaCreacion)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(process.estado)}>
                      {process.estado}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {/* Ejecutar o Detener */}
                      {executionStatus?.isRunning && executingProcessId === process.id ? (
                        <button
                          onClick={handleCancelExecution}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                          title="Detener proceso"
                        >
                          <StopCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExecuteProcess(process)}
                          disabled={executionStatus?.isRunning && executingProcessId !== process.id}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Ejecutar proceso"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Editar */}
                      <button
                        onClick={() => handleEditProcess(process)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar concurso"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      {/* Ver resultados */}
                      <button
                        onClick={() => handleViewResults(process)}
                        className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Ver resultados"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      
                      {/* Descargar resultados */}
                      <button
                        onClick={() => handleExportResults(process)}
                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
                        title="Descargar resultados"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {/* Eliminar */}
                      <button
                        onClick={() => handleDeleteProcess(process)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                        title="Eliminar concurso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateProcessModal
          process={selectedProcess}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedProcess(null)
          }}
          onSave={() => {
            loadProcesses()
            setShowCreateModal(false)
            setSelectedProcess(null)
          }}
        />
      )}

      {showResultsModal && selectedProcess && (
        <ResultsModal
          process={selectedProcess}
          onClose={() => {
            setShowResultsModal(false)
            setSelectedProcess(null)
          }}
        />
      )}
    </div>
  )
}

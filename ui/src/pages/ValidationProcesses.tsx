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
  // Rastrear múltiples ejecuciones simultáneas: Map<processId, { executionId: string, status: ExecutionStatus }>
  const [executions, setExecutions] = useState<Map<string, { executionId: string; status: ExecutionStatus }>>(new Map())

  // Cargar procesos al montar el componente y restaurar ejecuciones activas
  useEffect(() => {
    loadProcesses()
    restoreActiveExecutions()
  }, [])

  // Restaurar ejecuciones activas desde el backend al cargar la página
  const restoreActiveExecutions = async () => {
    try {
      console.log('[restoreActiveExecutions] Verificando ejecuciones activas...')
      
      // Obtener todas las ejecuciones activas desde el backend
      const activeExecutions = await processService.getActiveExecutions()
      console.log(`[restoreActiveExecutions] Ejecuciones activas encontradas:`, activeExecutions.length)
      
      if (activeExecutions.length === 0) {
        // Si no hay ejecuciones activas en el backend, limpiar localStorage
        localStorage.removeItem('activeExecutions')
        return
      }
      
      // Restaurar ejecuciones en el estado
      const restoredExecutions = new Map<string, { executionId: string; status: ExecutionStatus }>()
      
      activeExecutions.forEach((execStatus: ExecutionStatus & { executionId?: string }) => {
        // El backend puede retornar executionId en el objeto o necesitamos buscarlo
        // Normalmente executionId está en el objeto ExecutionStatus
        const executionId = (execStatus as any).executionId || execStatus.executionId || ''
        const processId = (execStatus as any).processId || ''
        
        if (executionId && processId && execStatus.isRunning) {
          restoredExecutions.set(processId, {
            executionId,
            status: execStatus
          })
          console.log(`[restoreActiveExecutions] Restaurada ejecución ${executionId} para proceso ${processId}`)
        }
      })
      
      // Actualizar estado con ejecuciones restauradas
      if (restoredExecutions.size > 0) {
        console.log(`[restoreActiveExecutions] Restaurando ${restoredExecutions.size} ejecuciones activas`)
        setExecutions(restoredExecutions)
        
        // Actualizar localStorage
        const stored: Record<string, any> = {}
        restoredExecutions.forEach((exec, pid) => {
          stored[pid] = exec
        })
        localStorage.setItem('activeExecutions', JSON.stringify(stored))
      }
    } catch (error) {
      console.error('[restoreActiveExecutions] Error restaurando ejecuciones:', error)
      // Si falla, intentar restaurar desde localStorage como fallback
      const storedExecutions = localStorage.getItem('activeExecutions')
      if (storedExecutions) {
        try {
          const parsed = JSON.parse(storedExecutions)
          const restoredExecutions = new Map<string, { executionId: string; status: ExecutionStatus }>()
          
          await Promise.all(
            Object.entries(parsed).map(async ([pid, exec]: [string, any]) => {
              if (exec.status?.isRunning && exec.executionId) {
                // Verificar que sigue activa en el backend
                try {
                  const status = await processService.getExecutionStatus(exec.executionId)
                  if (status && status.isRunning) {
                    restoredExecutions.set(pid, { executionId: exec.executionId, status })
                  }
                } catch {
                  // Si no existe, no restaurar
                }
              }
            })
          )
          
          if (restoredExecutions.size > 0) {
            setExecutions(restoredExecutions)
          } else {
            // Si ninguna sigue activa, limpiar localStorage
            localStorage.removeItem('activeExecutions')
          }
        } catch {
          // Ignorar errores de parseo
        }
      }
    }
  }

  // Polling para actualizar estado de todas las ejecuciones activas
  useEffect(() => {
    const activeExecutions = Array.from(executions.values()).filter(exec => exec.status?.isRunning)
    
    if (activeExecutions.length === 0) return

    const interval = setInterval(async () => {
      try {
        // Actualizar estado de todas las ejecuciones activas
        const updates = await Promise.all(
          activeExecutions.map(async ({ executionId }) => {
            try {
              const status = await processService.getExecutionStatus(executionId)
              return { executionId, status }
            } catch (error) {
              console.error(`Error obteniendo estado de ejecución ${executionId}:`, error)
              return null
            }
          })
        )

        // Actualizar el estado de las ejecuciones
        setExecutions(prev => {
          const newMap = new Map(prev)
          let shouldReloadProcesses = false

          updates.forEach(update => {
            if (!update) return
            
            // Encontrar el processId correspondiente a este executionId
            let processIdToUpdate: string | null = null
            for (const [pid, exec] of prev.entries()) {
              if (exec.executionId === update.executionId) {
                processIdToUpdate = pid
                break
              }
            }

            if (processIdToUpdate) {
              // Asegurar que siempre tenemos un status válido (no null)
              const existingExec = prev.get(processIdToUpdate)
              const newStatus = update.status || existingExec?.status
              
              if (newStatus) {
                newMap.set(processIdToUpdate, {
                  executionId: update.executionId,
                  status: newStatus
                })

                // Si la ejecución terminó, removerla y recargar procesos
                if (!newStatus.isRunning) {
                  newMap.delete(processIdToUpdate)
                  shouldReloadProcesses = true
                }
              }
            }
          })

          // Actualizar localStorage con el estado actual
          const stored: Record<string, any> = {}
          newMap.forEach((exec, pid) => {
            stored[pid] = exec
          })
          localStorage.setItem('activeExecutions', JSON.stringify(stored))

          // Recargar procesos si alguna ejecución terminó (usando función loadProcesses del scope)
          if (shouldReloadProcesses) {
            setTimeout(async () => {
              try {
                const response = await processService.getProcesses({ 
                  page: 1, 
                  limit: 100,
                  search: searchTerm 
                })
                setProcesses(response.data)
              } catch (error) {
                console.error('Error recargando procesos:', error)
              }
            }, 500)
          }

          return newMap
        })
      } catch (error) {
        console.error('Error actualizando estados de ejecución:', error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [executions, searchTerm])

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
    
    // Verificar si este proceso ya está ejecutándose
    if (executions.has(process.id)) {
      const existingExec = executions.get(process.id)!
      if (existingExec.status?.isRunning) {
        console.log('⚠️ Este proceso ya está ejecutándose')
        return
      }
    }
    
    try {
      // Actualizar estado del proceso inmediatamente a "Procesando" en la UI
      setProcesses(prevProcesses => 
        prevProcesses.map(p => 
          p.id === process.id ? { ...p, estado: 'Procesando' } : p
        )
      )
      
      const executionId = await processService.executeProcessWithMonitoring(process.id)
      console.log(`✅ [Frontend] Execution ID recibido:`, executionId)
      
      // Obtener estado inicial (con pequeño delay para que el backend inicialice)
      await new Promise(resolve => setTimeout(resolve, 500))
      const status = await processService.getExecutionStatus(executionId)
      
      // Agregar esta ejecución al Map de ejecuciones activas
      setExecutions(prev => {
        const newMap = new Map(prev)
        const executionData = { executionId, status: status || { isRunning: true } as ExecutionStatus }
        newMap.set(process.id, executionData)
        
        // Guardar en localStorage como backup
        const stored: Record<string, any> = {}
        newMap.forEach((exec, pid) => {
          stored[pid] = exec
        })
        localStorage.setItem('activeExecutions', JSON.stringify(stored))
        
        return newMap
      })
      
      console.log('✅ [Frontend] Ejecución iniciada correctamente:', executionId)
    } catch (error) {
      console.error('❌ [Frontend] Error ejecutando proceso:', error)
      
      // Remover ejecución fallida del Map
      setExecutions(prev => {
        const newMap = new Map(prev)
        newMap.delete(process.id)
        return newMap
      })
      
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

  const handleCancelExecution = async (processId: string) => {
    const execution = executions.get(processId)
    if (!execution || !execution.status?.isRunning) return
    
    try {
      console.log(`🛑 [Frontend] Cancelando ejecución:`, execution.executionId)
      await processService.cancelExecution(execution.executionId)
      
      // Remover ejecución del Map
      setExecutions(prev => {
        const newMap = new Map(prev)
        newMap.delete(processId)
        return newMap
      })
      
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
      await processService.downloadPdfReport(process.id)
    } catch (error: any) {
      console.error('Error descargando informe PDF:', error)
      alert(`Error al descargar el informe PDF:\n\n${error.message || 'Error desconocido'}`)
    }
  }

  const getStatusColor = (status: string, processId?: string) => {
    // Si el proceso está ejecutándose, mostrar amarillo
    if (processId) {
      const execution = executions.get(processId)
      if (execution?.status?.isRunning) {
        return 'bg-corfoYellow-25 text-corfoYellow-100'
      }
    }
    
    const statusColors = {
      'Creado': 'bg-corfoGray-20 text-corfoGray-80',
      'En configuración': 'bg-corfoYellow-25 text-corfoYellow-100',
      'Ejecutado': 'bg-corfoAqua-50 text-corfoAqua-100', // Verde más visible de la paleta CORFO
      'Cerrado': 'bg-corfoGray-20 text-corfoGray-80',
      'Anulado': 'bg-corfoRed-20 text-corfoRed-500',
      'Borrado': 'bg-corfoRed-20 text-corfoRed-500'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-corfoGray-20 text-corfoGray-80'
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
        <h1 className="text-2xl font-bold text-corfoGray-90">Procesos de Validación</h1>
        <button
          onClick={handleCreateProcess}
          className="flex items-center px-4 py-2 bg-corfo-500 text-white rounded-lg hover:bg-corfo-600 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Concurso
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-corfoGray-60 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por nombre del concurso, descripción o creador..."
            className="w-full pl-10 pr-4 py-2 border border-corfoGray-40 rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-corfoGray-20 text-corfoGray-80 rounded-lg hover:bg-corfoGray-40 transition-colors"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Barra de progreso de ejecución - mostrar solo la primera ejecución activa para no saturar la UI */}
      {(() => {
        const firstRunningExec = Array.from(executions.values()).find(exec => exec.status?.isRunning)
        const firstRunningStatus = firstRunningExec?.status
        
        return firstRunningStatus ? (
          <ExecutionProgressBar 
            executionStatus={firstRunningStatus}
            onCancel={() => {
              const firstRunning = Array.from(executions.entries()).find(([_, exec]) => exec.status?.isRunning)
              if (firstRunning) {
                handleCancelExecution(firstRunning[0])
              }
            }}
          />
        ) : null
      })()}

      {/* Tabla de procesos */}
      <div className="bg-corfoGray-0 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-corfoGray-20">
          <thead className="bg-corfoGray-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                Concurso
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                Creador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                Fecha de Creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-corfoGray-0 divide-y divide-corfoGray-20">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-corfoGray-60">
                  Cargando procesos...
                </td>
              </tr>
            ) : filteredProcesses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-corfoGray-60">
                  No se encontraron procesos
                </td>
              </tr>
            ) : (
              filteredProcesses.map((process) => (
                <tr key={process.id} className="hover:bg-corfoGray-10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-corfoGray-90">
                        {process.nombreConcurso}
                      </div>
                      {process.descripcion && (
                        <div className="text-sm text-corfoGray-60 truncate max-w-xs">
                          {process.descripcion}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-corfoGray-60 mr-2" />
                      <span className="text-sm text-corfoGray-90">
                        {process.usuarioCreacion.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-corfoGray-60 mr-2" />
                      <span className="text-sm text-corfoGray-90">
                        {formatDate(process.fechaCreacion)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={getStatusColor(process.estado, process.id)}>
                      {(() => {
                        const execution = executions.get(process.id)
                        return execution?.status?.isRunning ? 'Ejecutando...' : process.estado
                      })()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {/* Ejecutar o Detener */}
                      {(() => {
                        const execution = executions.get(process.id)
                        const isRunning = execution?.status?.isRunning
                        
                        return isRunning ? (
                          <button
                            onClick={() => handleCancelExecution(process.id)}
                            className="p-2 text-corfoRed-500 hover:text-corfoRed-600 hover:bg-corfoRed-20 rounded-lg transition-colors"
                            title="Detener proceso"
                          >
                            <StopCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteProcess(process)}
                            className="p-2 text-corfoAqua-100 hover:text-corfoAqua-90 hover:bg-corfoAqua-25 rounded-lg transition-colors"
                            title="Ejecutar proceso"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )
                      })()}
                      
                      {/* Editar */}
                      <button
                        onClick={() => handleEditProcess(process)}
                        className="p-2 text-corfo-500 hover:text-corfo-600 hover:bg-corfo-20 rounded-lg transition-colors"
                        title="Editar concurso"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      
                      {/* Ver resultados */}
                      <button
                        onClick={() => handleViewResults(process)}
                        className="p-2 text-corfoCyan-100 hover:text-corfoCyan-90 hover:bg-corfoCyan-25 rounded-lg transition-colors"
                        title="Ver resultados"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      
                      {/* Descargar resultados */}
                      <button
                        onClick={() => handleExportResults(process)}
                        className="p-2 text-corfo-500 hover:text-corfo-600 hover:bg-corfo-20 rounded-lg transition-colors"
                        title="Descargar resultados"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {/* Eliminar */}
                      <button
                        onClick={() => handleDeleteProcess(process)}
                        className="p-2 text-corfoRed-500 hover:text-corfoRed-600 hover:bg-corfoRed-20 rounded-lg transition-colors"
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

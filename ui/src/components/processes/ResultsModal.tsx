import React, { useState, useEffect } from 'react'
import { X, ArrowLeft, Download, Filter, Calendar, Clock } from 'lucide-react'
import { ValidationProcess, ValidationProcessResult, ProcessLog, ValidationTestType, ValidationResult } from '../../types'
import { processService } from '../../services/processes'
import { Badge } from '../ui/Badge'

interface ResultsModalProps {
  process: ValidationProcess
  onClose: () => void
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  process,
  onClose
}) => {
  const [results, setResults] = useState<ValidationProcessResult[]>([])
  const [logs, setLogs] = useState<ProcessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<ValidationTestType | 'Todas'>('Todas')
  const [activeTab, setActiveTab] = useState<'logs' | 'results'>('logs')

  useEffect(() => {
    loadData()
  }, [process.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [resultsData, logsData] = await Promise.all([
        processService.getProcessResults(process.id),
        processService.getProcessLogs(process.id)
      ])
      setResults(resultsData)
      setLogs(logsData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      await processService.exportResults(process.id, 'json')
    } catch (error) {
      console.error('Error exportando:', error)
      alert('Error al exportar los resultados')
    }
  }

  const getResultBadgeColor = (result: ValidationResult) => {
    const colors = {
      'OK': 'bg-green-100 text-green-800',
      'FAIL': 'bg-red-100 text-red-800',
      'WARN': 'bg-yellow-100 text-yellow-800'
    }
    return colors[result] || 'bg-gray-100 text-gray-800'
  }

  const getTestTypeDisplayName = (type: ValidationTestType) => {
    const names = {
      'obligatorio': 'Campo Obligatorio',
      'tipo_dato': 'Tipo de Dato',
      'regex': 'Formato/Regex',
      'rango_numerico': 'Rango Numérico',
      'opcion_valida': 'Opción Válida',
      'longitud': 'Longitud',
      'coherencia_cruzada': 'Coherencia Cruzada',
      'custom_ia': 'Validación con IA'
    }
    return names[type] || type
  }

  const filteredResults = filterType === 'Todas' 
    ? results 
    : results.filter(result => result.tipoPrueba === filterType)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL')
  }

  const uniqueTestTypes = Array.from(new Set(results.map(r => r.tipoPrueba)))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              Resultados de: {process.nombreConcurso}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-corfo-600 hover:text-corfo-800 hover:bg-corfo-50 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'border-corfo-600 text-corfo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Logs del Proceso
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-corfo-600 text-corfo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Resultados de Pruebas
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Cargando datos...</div>
            </div>
          ) : (
            <>
              {/* Logs del Proceso */}
              {activeTab === 'logs' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Logs del Proceso</h3>
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay logs disponibles para este proceso
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Descripción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {log.accion}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                {log.descripcion}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  {log.fecha}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Resultados de Pruebas */}
              {activeTab === 'results' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Resultados de Pruebas</h3>
                    
                    {/* Filtro */}
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <label className="text-sm text-gray-700">Filtrar por tipo de prueba:</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as ValidationTestType | 'Todas')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-corfo-500 focus:border-transparent"
                      >
                        <option value="Todas">Todas</option>
                        {uniqueTestTypes.map(type => (
                          <option key={type} value={type}>
                            {getTestTypeDisplayName(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay resultados de pruebas disponibles
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Campo Validado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Prueba Efectuada
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Resultado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valores Ingresados
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredResults.map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {result.campoValidado}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {getTestTypeDisplayName(result.tipoPrueba)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={getResultBadgeColor(result.resultado)}>
                                  {result.resultado}
                                </Badge>
                                {result.detalleMensaje && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {result.detalleMensaje}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-700">
                                <div className="max-w-xs truncate" title={result.valorIngresado}>
                                  {result.valorIngresado}
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mt-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {result.tiempoEjecucion}s
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

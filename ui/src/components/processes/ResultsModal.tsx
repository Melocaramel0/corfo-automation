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
  const [activeTab, setActiveTab] = useState<'logs' | 'results' | 'json'>('logs')
  const [jsonReport, setJsonReport] = useState<string>('')
  const [executionJson, setExecutionJson] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [process.id])

  // Función para generar resultados de pruebas desde el JSON de ejecución
  const generateResultsFromExecution = (executionData: any, processId: string): ValidationProcessResult[] => {
    const results: ValidationProcessResult[] = []
    
    if (!executionData.pasosCompletados || !Array.isArray(executionData.pasosCompletados)) {
      return results
    }
    
    executionData.pasosCompletados.forEach((paso: any) => {
      if (!paso.detalles || !Array.isArray(paso.detalles)) {
        return
      }
      
      paso.detalles.forEach((detalle: any, detalleIndex: number) => {
        // Determinar tipo de prueba basado en el tipo de campo
        let tipoPrueba: ValidationTestType = 'obligatorio'
        if (detalle.tipo === 'number') tipoPrueba = 'tipo_dato'
        else if (detalle.tipo === 'email' || detalle.tipo === 'tel') tipoPrueba = 'regex'
        else if (detalle.tipo === 'select') tipoPrueba = 'opcion_valida'
        else if (detalle.tipo === 'textarea') tipoPrueba = 'longitud'
        
        // Determinar resultado
        let resultado: ValidationResult = 'OK'
        if (!detalle.completado) {
          resultado = 'FAIL'
        } else if (detalle.razonFallo || (detalle.esObligatorio && !detalle.valorAsignado)) {
          resultado = 'WARN'
        }
        
        // Calcular tiempo de ejecución promedio por campo
        const tiempoEjecucion = paso.detalles.length > 0 
          ? (paso.tiempoTranscurrido / paso.detalles.length).toFixed(2)
          : '0'
        
        results.push({
          id: `${paso.numero}_${detalleIndex}_${detalle.etiqueta}`,
          procesoId: processId,
          campoValidado: detalle.etiqueta || 'Campo sin etiqueta',
          tipoPrueba: tipoPrueba,
          resultado: resultado,
          valorIngresado: detalle.valorAsignado || 'N/A',
          detalleMensaje: detalle.razonFallo || (detalle.completado ? 'Campo completado correctamente' : 'Campo no completado'),
          timestamp: executionData.fechaEjecucion || new Date().toISOString(),
          tiempoEjecucion: parseFloat(tiempoEjecucion)
        })
      })
    })
    
    return results
  }

  // Función para generar logs coherentes desde el JSON de ejecución
  const generateLogsFromExecution = (executionData: any, process: ValidationProcess): ProcessLog[] => {
    const logs: ProcessLog[] = []
    let logId = 1
    
    // Inicio de ejecución
    logs.push({
      id: `log_${logId++}`,
      accion: 'Inicio de Ejecución',
      descripcion: `Inicio de validación del proceso "${process.nombreConcurso}"`,
      fecha: executionData.fechaEjecucion || new Date().toISOString(),
      procesoId: process.id
    })
    
    // Si hay estadísticas, agregar log de inicio de procesamiento
    if (executionData.estadisticas) {
      const stats = executionData.estadisticas
      logs.push({
        id: `log_${logId++}`,
        accion: 'Análisis de Formulario',
        descripcion: `Formulario detectado: "${executionData.titulo}". Total de pasos identificados: ${stats.totalPasos}, Campos encontrados: ${stats.totalCampos}`,
        fecha: executionData.fechaEjecucion || new Date().toISOString(),
        procesoId: process.id
      })
    }
    
    // Logs de cada paso completado
    if (executionData.pasosCompletados && Array.isArray(executionData.pasosCompletados)) {
      executionData.pasosCompletados.forEach((paso: any) => {
        const tiempoAcumulado = paso.tiempoTranscurrido || 0
        const fechaPaso = executionData.fechaEjecucion 
          ? new Date(new Date(executionData.fechaEjecucion).getTime() + tiempoAcumulado * 1000).toISOString()
          : new Date().toISOString()
        
        logs.push({
          id: `log_${logId++}`,
          accion: `Paso ${paso.numero}: ${paso.titulo}`,
          descripcion: `Completados ${paso.camposCompletados} de ${paso.camposEncontrados} campos en ${paso.tiempoTranscurrido}s. ${paso.exito ? 'Éxito' : 'Con advertencias'}`,
          fecha: fechaPaso,
          procesoId: process.id
        })
      })
    }
    
    // Log de errores si existen
    if (executionData.errores && Array.isArray(executionData.errores) && executionData.errores.length > 0) {
      executionData.errores.forEach((error: any) => {
        logs.push({
          id: `log_${logId++}`,
          accion: 'Error Detectado',
          descripcion: error.mensaje || error.toString(),
          fecha: executionData.fechaEjecucion || new Date().toISOString(),
          procesoId: process.id
        })
      })
    }
    
    // Resumen final con estadísticas
    if (executionData.estadisticas) {
      const stats = executionData.estadisticas
      const minutos = Math.floor((executionData.tiempoTotal || 0) / 60)
      const segundos = (executionData.tiempoTotal || 0) % 60
      
      logs.push({
        id: `log_${logId++}`,
        accion: 'Resumen de Ejecución',
        descripcion: `⏱️ Tiempo total: ${minutos}m ${segundos}s | 📊 Pasos: ${stats.totalPasos} | 📝 Campos: ${stats.totalCampos} | ✅ Completados: ${stats.camposCompletados} (${stats.porcentajeExito}%) | ⚡ Velocidad: ${stats.velocidadCamposPorSegundo?.toFixed(2)} campos/seg`,
        fecha: executionData.fechaEjecucion || new Date().toISOString(),
        procesoId: process.id
      })
    }
    
    // Finalización
    const fechaFin = executionData.fechaEjecucion 
      ? new Date(new Date(executionData.fechaEjecucion).getTime() + (executionData.tiempoTotal || 0) * 1000).toISOString()
      : new Date().toISOString()
    
    logs.push({
      id: `log_${logId++}`,
      accion: executionData.exito ? 'Ejecución Completada' : 'Ejecución Finalizada',
      descripcion: executionData.exito 
        ? `Proceso "${process.nombreConcurso}" completado exitosamente. Reporte JSON generado.`
        : `Proceso "${process.nombreConcurso}" finalizado con advertencias o errores.`,
      fecha: fechaFin,
      procesoId: process.id
    })
    
    return logs
  }

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('[ResultsModal] Cargando datos para proceso:', process.id)
      
      const [resultsData, logsData, executionData] = await Promise.all([
        processService.getProcessResults(process.id),
        processService.getProcessLogs(process.id),
        processService.getExecutionJson(process.id)
      ])
      
      console.log('[ResultsModal] Datos cargados:', {
        resultsCount: Array.isArray(resultsData) ? resultsData.length : 0,
        logsCount: Array.isArray(logsData) ? logsData.length : 0,
        hasExecutionJson: !!executionData,
        executionJsonKeys: executionData ? Object.keys(executionData) : []
      })
      
      // Generar resultados desde executionJson si está disponible
      let processedResults: ValidationProcessResult[] = []
      if (executionData && executionData.pasosCompletados) {
        // Generar resultados desde pasosCompletados del JSON de ejecución
        processedResults = generateResultsFromExecution(executionData, process.id)
        console.log('[ResultsModal] Resultados generados desde executionJson:', processedResults.length)
      } else {
        // Fallback a resultados del servicio
        processedResults = Array.isArray(resultsData) ? resultsData : []
      }
      setResults(processedResults)
      
      // Generar logs desde executionJson si está disponible
      let processedLogs: ProcessLog[] = []
      if (executionData) {
        processedLogs = generateLogsFromExecution(executionData, process)
      } else {
        // Fallback a logs de la BD si no hay executionJson
        processedLogs = Array.isArray(logsData) ? logsData : []
      }
      setLogs(processedLogs)
      
      setExecutionJson(executionData)
    } catch (error) {
      console.error('[ResultsModal] Error cargando datos:', error)
      // En caso de error, asegurar arrays vacíos
      setResults([])
      setLogs([])
      setExecutionJson(null)
    } finally {
      setLoading(false)
    }
  }

  // Usar el JSON completo de ejecución si está disponible, sino crear uno básico
  useEffect(() => {
    if (executionJson) {
      // Usar el JSON completo de ejecución
      const jsonString = JSON.stringify(executionJson, null, 2)
      console.log('[ResultsModal] JSON generado, longitud:', jsonString.length, 'líneas:', jsonString.split('\n').length)
      setJsonReport(jsonString)
    } else {
      // Fallback: crear un JSON básico si no hay archivo de ejecución
      const report = {
        proceso: {
          id: process.id,
          nombreConcurso: process.nombreConcurso,
          rutaFormulario: process.rutaFormulario,
          descripcion: process.descripcion,
          usuarioCreacion: process.usuarioCreacion,
          fechaCreacion: process.fechaCreacion,
          fechaModificacion: process.fechaModificacion,
          estado: process.estado
        },
        resultados: results,
        logs: logs,
        resumen: {
          totalPruebas: (results || []).length,
          exitosas: (results || []).filter(r => r.resultado === 'OK').length,
          fallidas: (results || []).filter(r => r.resultado === 'FAIL').length,
          advertencias: (results || []).filter(r => r.resultado === 'WARN').length
        }
      }
      const jsonString = JSON.stringify(report, null, 2)
      console.log('[ResultsModal] JSON básico generado, longitud:', jsonString.length, 'líneas:', jsonString.split('\n').length)
      setJsonReport(jsonString)
    }
  }, [executionJson, results, logs, process.id, process.nombreConcurso, process.rutaFormulario, process.descripcion, process.usuarioCreacion, process.fechaCreacion, process.fechaModificacion, process.estado])

  const handleExport = async () => {
    try {
      // Si tenemos el JSON cargado, usarlo directamente
      if (executionJson) {
        console.log('[handleExport] Usando JSON cargado en memoria')
        const jsonContent = JSON.stringify(executionJson, null, 2)
        const blob = new Blob([jsonContent], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `exec_${process.id}_${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        return
      }
      
      // Si no hay JSON cargado, intentar cargarlo
      console.log('[handleExport] No hay JSON en memoria, intentando cargar...')
      const jsonData = await processService.getExecutionJson(process.id)
      if (!jsonData) {
        throw new Error('No se encontró archivo de ejecución para descargar')
      }
      
      const jsonContent = JSON.stringify(jsonData, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `exec_${process.id}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[handleExport] Error exportando:', error)
      alert('Error al exportar los resultados: ' + ((error as Error).message || 'Error desconocido'))
    }
  }

  const getResultBadgeColor = (result: ValidationResult) => {
    const colors = {
      'OK': 'bg-corfoAqua-50 text-corfoAqua-100', // Verde más visible
      'FAIL': 'bg-corfoRed-20 text-corfoRed-500',
      'WARN': 'bg-corfoYellow-25 text-corfoYellow-100'
    }
    return colors[result] || 'bg-corfoGray-20 text-corfoGray-80'
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
    ? (results || []) 
    : (results || []).filter(result => result.tipoPrueba === filterType)

  const uniqueTestTypes = Array.from(new Set((results || []).map(r => r.tipoPrueba)))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-corfoGray-0 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-corfoGray-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-corfoGray-20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-corfoGray-80" />
            </button>
            <h2 className="text-xl font-semibold text-corfoGray-90">
              Resultados de: {process.nombreConcurso}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 text-corfo-500 hover:text-corfo-600 hover:bg-corfo-20 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-corfoGray-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-corfoGray-80" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-corfoGray-20">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'border-corfo-500 text-corfo-500'
                  : 'border-transparent text-corfoGray-60 hover:text-corfoGray-80'
              }`}
            >
              Logs del Proceso
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-corfo-500 text-corfo-500'
                  : 'border-transparent text-corfoGray-60 hover:text-corfoGray-80'
              }`}
            >
              Resultados de Pruebas
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'json'
                  ? 'border-corfo-500 text-corfo-500'
                  : 'border-transparent text-corfoGray-60 hover:text-corfoGray-80'
              }`}
            >
              Reporte JSON
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-corfoGray-60">Cargando datos...</div>
            </div>
          ) : (
            <>
              {/* Logs del Proceso */}
              {activeTab === 'logs' && (
                <div>
                  <h3 className="text-lg font-semibold text-corfoGray-90 mb-4">Logs del Proceso</h3>
                  {(!logs || logs.length === 0) ? (
                    <div className="text-center py-8 text-corfoGray-60">
                      No hay logs disponibles para este proceso
                    </div>
                  ) : (
                    <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-corfoGray-20">
                        <thead className="bg-corfoGray-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Acción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Descripción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Fecha
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-corfoGray-0 divide-y divide-corfoGray-20">
                          {(logs || []).map((log) => {
                            // Determinar color de fila según tipo de acción
                            const getRowColor = () => {
                              if (log.accion.includes('Error') || log.accion.includes('Fallido')) {
                                return 'bg-corfoRed-20/30'
                              }
                              if (log.accion.includes('Completada') || log.accion.includes('Éxito') || log.accion.includes('Resumen')) {
                                return 'bg-corfoAqua-25/30'
                              }
                              if (log.accion.includes('Paso')) {
                                return 'bg-corfoGray-10'
                              }
                              return ''
                            }
                            
                            // Formatear fecha
                            const fechaObj = new Date(log.fecha)
                            const fechaFormateada = fechaObj.toLocaleString('es-CL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })
                            
                            return (
                              <tr key={log.id} className={`hover:bg-corfoGray-10 ${getRowColor()}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-corfoGray-90">
                                  {log.accion}
                                </td>
                                <td className="px-6 py-4 text-sm text-corfoGray-80">
                                  {log.descripcion}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-60">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {fechaFormateada}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
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
                    <h3 className="text-lg font-semibold text-corfoGray-90">Resultados de Pruebas</h3>
                    
                    {/* Filtro */}
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-corfoGray-60" />
                      <label className="text-sm text-corfoGray-80">Filtrar por tipo:</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as ValidationTestType | 'Todas')}
                        className="px-3 py-1 border border-corfoGray-40 rounded-lg text-sm focus:ring-2 focus:ring-corfo-500 focus:border-transparent"
                      >
                        <option value="Todas">Todas</option>
                        {(uniqueTestTypes || []).map(type => (
                          <option key={type} value={type}>
                            {getTestTypeDisplayName(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Resumen Estadístico */}
                  {results && results.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-corfo-20 flex items-center justify-center">
                            <span className="text-sm font-bold text-corfo-500">📊</span>
                          </div>
                          <div>
                            <p className="text-xs text-corfoGray-60">Total Pruebas</p>
                            <p className="text-lg font-semibold text-corfoGray-90">{results.length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-corfoAqua-50 flex items-center justify-center">
                            <span className="text-sm font-bold text-corfoAqua-100">✓</span>
                          </div>
                          <div>
                            <p className="text-xs text-corfoGray-60">Exitosas (OK)</p>
                            <p className="text-lg font-semibold text-corfoGray-90">
                              {results.filter(r => r.resultado === 'OK').length} 
                              ({Math.round((results.filter(r => r.resultado === 'OK').length / results.length) * 100)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-corfoYellow-25 flex items-center justify-center">
                            <span className="text-sm font-bold text-corfoYellow-100">⚠</span>
                          </div>
                          <div>
                            <p className="text-xs text-corfoGray-60">Advertencias (WARN)</p>
                            <p className="text-lg font-semibold text-corfoGray-90">
                              {results.filter(r => r.resultado === 'WARN').length}
                              ({Math.round((results.filter(r => r.resultado === 'WARN').length / results.length) * 100)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-corfoRed-20 flex items-center justify-center">
                            <span className="text-sm font-bold text-corfoRed-500">✗</span>
                          </div>
                          <div>
                            <p className="text-xs text-corfoGray-60">Fallidas (FAIL)</p>
                            <p className="text-lg font-semibold text-corfoGray-90">
                              {results.filter(r => r.resultado === 'FAIL').length}
                              ({Math.round((results.filter(r => r.resultado === 'FAIL').length / results.length) * 100)}%)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Desglose por tipo de prueba */}
                  {results && results.length > 0 && uniqueTestTypes.length > 0 && (
                    <div className="mb-6 bg-corfoGray-0 border border-corfoGray-20 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-corfoGray-90 mb-3">Desglose por Tipo de Prueba</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {uniqueTestTypes.map(type => {
                          const pruebasTipo = results.filter(r => r.tipoPrueba === type)
                          const ok = pruebasTipo.filter(r => r.resultado === 'OK').length
                          const fail = pruebasTipo.filter(r => r.resultado === 'FAIL').length
                          const warn = pruebasTipo.filter(r => r.resultado === 'WARN').length
                          
                          return (
                            <div key={type} className="bg-corfoGray-10 rounded-lg p-3">
                              <p className="text-xs font-medium text-corfoGray-80 mb-1">
                                {getTestTypeDisplayName(type)}
                              </p>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-corfoAqua-100">✓ {ok}</span>
                                {warn > 0 && <span className="text-corfoYellow-100">⚠ {warn}</span>}
                                {fail > 0 && <span className="text-corfoRed-500">✗ {fail}</span>}
                                <span className="text-corfoGray-60 ml-auto">Total: {pruebasTipo.length}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(!filteredResults || filteredResults.length === 0) ? (
                    <div className="text-center py-8 text-corfoGray-60">
                      No hay resultados de pruebas disponibles
                    </div>
                  ) : (
                    <div className="bg-corfoGray-0 border border-corfoGray-20 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-corfoGray-20">
                        <thead className="bg-corfoGray-10">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Campo Validado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Prueba Efectuada
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Resultado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                              Valores Ingresados
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-corfoGray-0 divide-y divide-corfoGray-20">
                          {(filteredResults || []).map((result) => {
                            // Color de fila según resultado
                            const getRowBgColor = () => {
                              if (result.resultado === 'OK') return 'bg-corfoAqua-25/20'
                              if (result.resultado === 'FAIL') return 'bg-corfoRed-20/30'
                              if (result.resultado === 'WARN') return 'bg-corfoYellow-25/20'
                              return ''
                            }
                            
                            return (
                              <tr key={result.id} className={`hover:bg-corfoGray-10 ${getRowBgColor()}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-corfoGray-90">
                                  {result.campoValidado}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-80">
                                  {getTestTypeDisplayName(result.tipoPrueba)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    {result.resultado === 'OK' && <span className="text-corfoAqua-100">✓</span>}
                                    {result.resultado === 'FAIL' && <span className="text-corfoRed-500">✗</span>}
                                    {result.resultado === 'WARN' && <span className="text-corfoYellow-100">⚠</span>}
                                    <Badge className={getResultBadgeColor(result.resultado)}>
                                      {result.resultado}
                                    </Badge>
                                  </div>
                                  {result.detalleMensaje && (
                                    <div className="text-xs text-corfoGray-60 mt-1 max-w-md">
                                      {result.detalleMensaje}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm text-corfoGray-80">
                                  <div className="max-w-xs truncate" title={result.valorIngresado}>
                                    {result.valorIngresado || 'N/A'}
                                  </div>
                                  <div className="flex items-center text-xs text-corfoGray-60 mt-1">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {result.tiempoEjecucion}s
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Reporte JSON */}
              {activeTab === 'json' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-corfoGray-90">Reporte JSON Completo</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(jsonReport)
                          alert('JSON copiado al portapapeles')
                        }}
                        className="px-3 py-1 text-sm text-corfo-500 hover:text-corfo-600 hover:bg-corfo-20 rounded-lg transition-colors"
                      >
                        Copiar JSON
                      </button>
                      {executionJson && (
                        <span className="text-xs text-corfoGray-60">
                          {jsonReport.split('\n').length} líneas
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {jsonReport ? (
                    <div 
                      className="bg-corfoGray-10 border border-corfoGray-20 rounded-lg p-4" 
                      style={{ 
                        maxHeight: 'calc(90vh - 300px)',
                        overflowY: 'auto',
                        overflowX: 'auto'
                      }}
                    >
                      <pre 
                        className="text-xs text-corfoGray-90 font-mono whitespace-pre"
                        style={{ 
                          margin: 0,
                          whiteSpace: 'pre',
                          wordBreak: 'normal',
                          overflowWrap: 'normal'
                        }}
                      >
                        {jsonReport}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-corfoGray-60">
                      No hay reporte JSON disponible
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

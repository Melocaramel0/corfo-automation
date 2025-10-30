import { apiService } from './api'
import { 
  ValidationProcess, 
  ValidationProcessResult, 
  PaginatedResponse, 
  PaginationParams,
  ExecutionStatus,
  ProcessLog
} from '../types'

// Mock data para desarrollo
const MOCK_PROCESSES: ValidationProcess[] = [
  {
    id: '1',
    nombreConcurso: 'Validación Formulario Semilla Inicia',
    rutaFormulario: 'https://postulador.corfo.cl/GOS/Plataformapostulacionfront/Modules/Postulador/Postulador.aspx',
    credencialesAcceso: {
      usuario: 'test_user',
      password: 'test_pass'
    },
    descripcion: 'Validación automática del formulario de postulación Semilla Inicia con reglas específicas de CORFO',
    usuarioCreacion: 'admin@corfo.cl',
    fechaCreacion: '2024-01-15T10:30:00Z',
    fechaModificacion: '2024-01-20T14:45:00Z',
    estado: 'Ejecutado',
    reglas: [
      {
        id: '1',
        nombreRegla: 'RUT Obligatorio',
        campoObjetivo: 'rut_representante',
        tipoPrueba: 'obligatorio',
        parametros: {},
        severidad: 'error',
        activa: true
      },
      {
        id: '2',
        nombreRegla: 'Monto en Rango',
        campoObjetivo: 'monto_solicitado',
        tipoPrueba: 'rango_numerico',
        parametros: { min: 1000000, max: 100000000 },
        severidad: 'error',
        activa: true
      }
    ],
    configuracion: {
      modoEjecucion: 'secuencial',
      tiempoMaxPorCampo: 30,
      reintentos: 3
    }
  },
  {
    id: '2',
    nombreConcurso: 'Validación Formulario Desarrollo Productivo',
    rutaFormulario: 'https://postulador.corfo.cl/GOS/Plataformapostulacionfront/Modules/Postulador/Postulador.aspx',
    descripcion: 'Proceso de validación para formularios de desarrollo productivo con IA avanzada',
    usuarioCreacion: 'qa@corfo.cl',
    fechaCreacion: '2024-01-10T09:15:00Z',
    estado: 'En configuración',
    reglas: [
      {
        id: '3',
        nombreRegla: 'Descripción con IA',
        campoObjetivo: 'descripcion_proyecto',
        tipoPrueba: 'custom_ia',
        parametros: {},
        promptIA: 'Valida que la descripción explique el problema, la solución y el aporte de innovación en ≤ 150 palabras. Devuelve: {ok:boolean, razones:string}',
        severidad: 'warning',
        activa: true
      }
    ],
    configuracion: {
      modoEjecucion: 'paralelo',
      tiempoMaxPorCampo: 45,
      reintentos: 2
    }
  },
  {
    id: '3',
    nombreConcurso: 'Formulario Innovación Tecnológica',
    rutaFormulario: 'https://postulador.corfo.cl/GOS/Plataformapostulacionfront/Modules/Postulador/Postulador.aspx',
    descripcion: 'Validación completa para proyectos de innovación tecnológica',
    usuarioCreacion: 'admin@corfo.cl',
    fechaCreacion: '2024-01-05T16:20:00Z',
    estado: 'Cerrado',
    reglas: [],
    configuracion: {
      modoEjecucion: 'secuencial',
      tiempoMaxPorCampo: 60,
      reintentos: 5
    }
  }
]

const MOCK_RESULTS: ValidationProcessResult[] = [
  {
    id: '1',
    procesoId: '1',
    campoValidado: 'rut_representante',
    tipoPrueba: 'obligatorio',
    resultado: 'OK',
    valorIngresado: '15124928-0',
    detalleMensaje: 'Campo obligatorio completado correctamente',
    timestamp: '2024-01-20T14:45:30Z',
    tiempoEjecucion: 1.2
  },
  {
    id: '2',
    procesoId: '1',
    campoValidado: 'monto_solicitado',
    tipoPrueba: 'rango_numerico',
    resultado: 'FAIL',
    valorIngresado: '150000000',
    detalleMensaje: 'El monto excede el límite máximo permitido (100.000.000)',
    timestamp: '2024-01-20T14:45:32Z',
    tiempoEjecucion: 0.8
  },
  {
    id: '3',
    procesoId: '1',
    campoValidado: 'email_contacto',
    tipoPrueba: 'regex',
    resultado: 'WARN',
    valorIngresado: 'test@domain',
    detalleMensaje: 'Formato de email incompleto, falta dominio',
    timestamp: '2024-01-20T14:45:34Z',
    tiempoEjecucion: 0.5
  }
]

// Mock data para logs de procesos
const MOCK_PROCESS_LOGS: ProcessLog[] = [
  {
    id: '1',
    accion: 'Creación de Concurso',
    descripcion: "Se creó el concurso 'Innovacion 2'",
    fecha: '2025-09-21',
    procesoId: '1'
  },
  {
    id: '2', 
    accion: 'Eliminación de Concurso',
    descripcion: "Concurso 'Innovacion 2' marcado como 'borrado'",
    fecha: '2025-09-21',
    procesoId: '1'
  }
]

// Estado de ejecución simulado
let currentExecution: ExecutionStatus | null = null

export const processService = {
  // Obtener lista paginada de procesos
  async getProcesses(params?: PaginationParams): Promise<PaginatedResponse<ValidationProcess>> {
    // Usar API real
    try {
      console.log('🌐 [API] Llamando a GET /processes con params:', params)
      const result = await apiService.getPaginated<ValidationProcess>('/processes', params)
      console.log('✅ [API] Procesos obtenidos del backend:', result.data.length, 'procesos')
      return result
    } catch (error) {
      console.error('❌ [API] Error obteniendo procesos desde API:', error)
      console.error('⚠️ [API] USANDO DATOS MOCK - El backend puede no estar disponible')
      console.error('🔍 [API] Detalles del error:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        response: (error as any)?.response?.data
      })
      
      // Fallback a mock en caso de error
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let filteredProcesses = [...MOCK_PROCESSES]
      
      if (params?.search) {
        const searchTerm = params.search.toLowerCase()
        filteredProcesses = filteredProcesses.filter(process =>
          process.nombreConcurso.toLowerCase().includes(searchTerm) ||
          process.descripcion?.toLowerCase().includes(searchTerm) ||
          process.usuarioCreacion.toLowerCase().includes(searchTerm)
        )
      }
      
      const page = params?.page || 1
      const limit = params?.limit || 10
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedData = filteredProcesses.slice(startIndex, endIndex)
      
      return {
        data: paginatedData,
        total: filteredProcesses.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProcesses.length / limit)
      }
    }
  },

  // Obtener un proceso por ID
  async getProcess(id: string): Promise<ValidationProcess | null> {
    try {
      const response = await apiService.get<ValidationProcess>(`/processes/${id}`)
      return response.data
    } catch (error) {
      console.error('Error obteniendo proceso desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 300))
      const process = MOCK_PROCESSES.find(p => p.id === id)
      return process || null
    }
  },

  // Crear nuevo proceso
  async createProcess(processData: Omit<ValidationProcess, 'id' | 'fechaCreacion' | 'usuarioCreacion'>): Promise<ValidationProcess> {
    try {
      const response = await apiService.post<ValidationProcess>('/processes', processData)
      return response.data
    } catch (error) {
      console.error('Error creando proceso desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newProcess: ValidationProcess = {
        ...processData,
        id: `${Date.now()}`,
        fechaCreacion: new Date().toISOString(),
        usuarioCreacion: 'current_user@corfo.cl'
      }
      
      MOCK_PROCESSES.unshift(newProcess)
      return newProcess
    }
  },

  // Actualizar proceso existente
  async updateProcess(id: string, processData: Partial<ValidationProcess>): Promise<ValidationProcess> {
    try {
      const response = await apiService.put<ValidationProcess>(`/processes/${id}`, processData)
      return response.data
    } catch (error) {
      console.error('Error actualizando proceso desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const index = MOCK_PROCESSES.findIndex(p => p.id === id)
      if (index === -1) {
        throw new Error('Proceso no encontrado')
      }
      
      MOCK_PROCESSES[index] = {
        ...MOCK_PROCESSES[index],
        ...processData,
        fechaModificacion: new Date().toISOString()
      }
      
      return MOCK_PROCESSES[index]
    }
  },

  // Eliminar proceso (marcar como borrado)
  async deleteProcess(id: string): Promise<void> {
    try {
      await apiService.delete(`/processes/${id}`)
    } catch (error) {
      console.error('Error eliminando proceso desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = MOCK_PROCESSES.findIndex(p => p.id === id)
      if (index !== -1) {
        MOCK_PROCESSES[index].estado = 'Borrado'
      }
    }
  },

  // Ejecutar proceso de validación
  async executeProcess(id: string): Promise<{ message: string; executionId: string }> {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const process = MOCK_PROCESSES.find(p => p.id === id)
    if (!process) {
      throw new Error('Proceso no encontrado')
    }
    
    // Actualizar estado a ejecutado
    process.estado = 'Ejecutado'
    process.fechaModificacion = new Date().toISOString()
    
    return {
      message: 'Proceso ejecutado exitosamente',
      executionId: `exec_${Date.now()}`
    }
    
    // En producción:
    // const response = await apiService.post<{ message: string; executionId: string }>(`/processes/${id}/execute`)
    // return response.data
  },

  // Obtener resultados de un proceso
  async getProcessResults(processId: string): Promise<ValidationProcessResult[]> {
    try {
      const response = await apiService.get<ValidationProcessResult[]>(`/processes/${processId}/results`)
      return response.data
    } catch (error) {
      console.error('Error obteniendo resultados desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 400))
      return MOCK_RESULTS.filter(result => result.procesoId === processId)
    }
  },

  // Exportar resultados
  async exportResults(processId: string, format: 'csv' | 'json' = 'csv'): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const results = await this.getProcessResults(processId)
    const process = await this.getProcess(processId)
    
    if (format === 'csv') {
      const csvContent = this.convertToCSV(results)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `resultados_${process?.nombreConcurso || processId}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } else {
      const jsonContent = JSON.stringify(results, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `resultados_${process?.nombreConcurso || processId}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
    
    // En producción:
    // await apiService.downloadFile(`/processes/${processId}/export?format=${format}`, `resultados_${processId}.${format}`)
  },

  // Convertir resultados a CSV
  convertToCSV(results: ValidationProcessResult[]): string {
    const headers = [
      'Campo Validado',
      'Tipo de Prueba',
      'Resultado',
      'Valor Ingresado',
      'Detalle/Mensaje',
      'Timestamp',
      'Tiempo Ejecución (s)'
    ]
    
    const rows = results.map(result => [
      result.campoValidado,
      result.tipoPrueba,
      result.resultado,
      result.valorIngresado,
      result.detalleMensaje,
      result.timestamp,
      result.tiempoEjecucion.toString()
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    return csvContent
  },

  // Obtener logs de un proceso específico
  async getProcessLogs(processId: string): Promise<ProcessLog[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return MOCK_PROCESS_LOGS.filter(log => log.procesoId === processId)
    
    // En producción:
    // const response = await apiService.get<ProcessLog[]>(`/processes/${processId}/logs`)
    // return response.data
  },

  // Ejecutar proceso con monitoreo en tiempo real
  async executeProcessWithMonitoring(processId: string): Promise<string> {
    try {
      console.log(`🌐 [API] Llamando a /processes/${processId}/execute-monitored`)
      const response = await apiService.post<{executionId: string}>(`/processes/${processId}/execute-monitored`)
      console.log(`✅ [API] Respuesta recibida:`, response)
      // El backend retorna directamente { executionId: string }, no dentro de ApiResponse
      return (response as any).executionId
    } catch (error) {
      // Si el error tiene una respuesta del servidor, propagarlo directamente
      if ((error as any)?.response?.data?.error) {
        console.error('❌ [API] Error del servidor:', (error as any).response.data.error)
        throw new Error((error as any).response.data.error)
      }
      
      // Solo usar mock si NO hay backend disponible (error de red)
      console.error('⚠️ [API] Error de conexión, intentando mock:', error)
      const process = MOCK_PROCESSES.find(p => p.id === processId)
      if (!process) {
        throw new Error('Backend no disponible y proceso no encontrado en mock')
      }

      // Fallback a simulación solo si no hay backend
      const executionId = `exec_${Date.now()}`
      currentExecution = {
        isRunning: true,
        progress: 0,
        startTime: new Date(),
        elapsedTime: 0,
        currentStep: 'Iniciando proceso...',
        logs: [],
        error: undefined
      }

      this.simulateMVPExecution(processId, executionId)
      return executionId
    }
  },

  // Obtener estado actual de ejecución
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    try {
      const response = await apiService.get<ExecutionStatus>(`/executions/${executionId}/status`)
      // El backend retorna directamente el objeto ExecutionStatus, no dentro de ApiResponse
      return response as any as ExecutionStatus
    } catch (error) {
      console.error('Error obteniendo estado de ejecución desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (currentExecution) {
        if (currentExecution.startTime) {
          currentExecution.elapsedTime = Date.now() - currentExecution.startTime.getTime()
        }
      }
      
      return currentExecution
    }
  },

  // Simular ejecución del MVP híbrido (solo para desarrollo)
  simulateMVPExecution(processId: string, _executionId: string) {
    const steps = [
      'Iniciando navegador...',
      'Navegando a formulario CORFO...',
      'Realizando login...',
      'Detectando estructura del formulario...',
      'Extrayendo campos paso 1/7...',
      'Completando campos paso 1/7...',
      'Extrayendo campos paso 2/7...',
      'Completando campos paso 2/7...',
      'Extrayendo campos paso 3/7...',
      'Completando campos paso 3/7...',
      'Extrayendo campos paso 4/7...',
      'Completando campos paso 4/7...',
      'Extrayendo campos paso 5/7...',
      'Completando campos paso 5/7...',
      'Extrayendo campos paso 6/7...',
      'Completando campos paso 6/7...',
      'Extrayendo campos paso 7/7...',
      'Completando campos paso 7/7...',
      'Verificando página de confirmación...',
      'Generando reporte final...',
      'Proceso completado exitosamente'
    ]

    let currentStepIndex = 0
    
    const interval = setInterval(() => {
      if (!currentExecution || currentStepIndex >= steps.length) {
        clearInterval(interval)
        if (currentExecution) {
          currentExecution.isRunning = false
          currentExecution.progress = 100
          currentExecution.currentStep = 'Completado'
          
          // Actualizar estado del proceso
          const process = MOCK_PROCESSES.find(p => p.id === processId)
          if (process) {
            process.estado = 'Ejecutado'
            process.fechaModificacion = new Date().toISOString()
          }
        }
        return
      }

      const step = steps[currentStepIndex]
      const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100)

      if (currentExecution) {
        currentExecution.progress = progress
        currentExecution.currentStep = step
        
        // Agregar log
        const log: ProcessLog = {
          id: `log_${Date.now()}_${currentStepIndex}`,
          accion: 'Ejecución MVP',
          descripcion: step,
          fecha: new Date().toISOString(),
          procesoId: processId
        }
        currentExecution.logs.push(log)
      }

      currentStepIndex++
    }, 2000) // Actualizar cada 2 segundos
  },

  // Cancelar ejecución
  async cancelExecution(executionId: string): Promise<void> {
    try {
      await apiService.post(`/executions/${executionId}/cancel`)
    } catch (error) {
      console.error('Error cancelando ejecución desde API, usando mock:', error)
      await new Promise(resolve => setTimeout(resolve, 200))
      
      if (currentExecution) {
        currentExecution.isRunning = false
        currentExecution.error = 'Ejecución cancelada por el usuario'
      }
    }
  }
}

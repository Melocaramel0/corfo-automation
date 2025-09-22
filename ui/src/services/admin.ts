import { 
  AIResourceConsumption, 
  SystemParameters, 
  SystemLog, 
  LogFilters,
  PaginatedResponse,
  PaginationParams
} from '../types'

// Mock data para Consumo de Recursos de IA
const MOCK_AI_CONSUMPTION: AIResourceConsumption = {
  nlpApi: {
    name: 'API de Procesamiento de Lenguaje Natural',
    requests: 15200,
    description: 'solicitudes'
  },
  sentimentAnalysis: {
    name: 'Componente de Análisis de Sentimientos',
    executions: 4500,
    description: 'ejecuciones'
  },
  topicDetection: {
    name: 'Modelo de Detección de Temas',
    uses: 2100,
    description: 'usos'
  }
}

// Mock data para Parámetros del Sistema
const MOCK_SYSTEM_PARAMETERS: SystemParameters = {
  userProfiles: {
    admin: true,
    qaUser: true,
    finalUser: true
  },
  database: {
    connection: 'postgres-corfo-2025',
    name: 'postgres-corfo-2025'
  },
  version: '1.0.2'
}

// Mock data para Logs del Sistema
const MOCK_SYSTEM_LOGS: SystemLog[] = [
  {
    id: '1',
    action: 'Creación de Concurso',
    description: "Se creó el concurso 'Fomento a la Innovación'",
    date: '2024-10-25',
    user: 'admin',
    contest: 'Fomento a la Innovación',
    ipHost: '192.168.1.10',
    timestamp: new Date('2024-10-25T10:30:00')
  },
  {
    id: '2',
    action: 'Validación Automática',
    description: "Proceso de validación iniciado para 'Fomento a la Innovación'",
    date: '2024-10-26',
    user: 'qa-user',
    contest: 'Fomento a la Innovación',
    ipHost: '192.168.1.12',
    timestamp: new Date('2024-10-26T14:15:00')
  },
  {
    id: '3',
    action: 'Edición de Parámetros',
    description: 'Parámetros del sistema actualizados por el administrador',
    date: '2024-10-27',
    user: 'admin',
    contest: '-',
    ipHost: '192.168.1.10',
    timestamp: new Date('2024-10-27T09:45:00')
  },
  {
    id: '4',
    action: 'Eliminación de Concurso',
    description: "Concurso 'Proyectos Verdes' marcado como 'borrado'",
    date: '2024-10-28',
    user: 'admin',
    contest: 'Proyectos Verdes',
    ipHost: '192.168.1.10',
    timestamp: new Date('2024-10-28T16:20:00')
  },
  {
    id: '5',
    action: 'Creación de Concurso',
    description: "Se creó el concurso 'innovacion 2'",
    date: '2025-09-21',
    user: 'admin',
    contest: 'innovacion 2',
    ipHost: '192.168.1.10',
    timestamp: new Date('2025-09-21T11:30:00')
  },
  {
    id: '6',
    action: 'Eliminación de Concurso',
    description: "Concurso 'innovacion 2' marcado como 'borrado'",
    date: '2025-09-21',
    user: 'admin',
    contest: 'innovacion 2',
    ipHost: '192.168.1.10',
    timestamp: new Date('2025-09-21T11:35:00')
  }
]

export const adminService = {
  // Obtener consumo de recursos de IA
  async getAIResourceConsumption(): Promise<AIResourceConsumption> {
    await new Promise(resolve => setTimeout(resolve, 500))
    return MOCK_AI_CONSUMPTION
  },

  // Obtener parámetros del sistema
  async getSystemParameters(): Promise<SystemParameters> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return MOCK_SYSTEM_PARAMETERS
  },

  // Actualizar parámetros del sistema
  async updateSystemParameters(params: Partial<SystemParameters>): Promise<SystemParameters> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    return { ...MOCK_SYSTEM_PARAMETERS, ...params }
  },

  // Obtener logs del sistema con paginación y filtros
  async getSystemLogs(
    pagination: PaginationParams,
    filters?: LogFilters
  ): Promise<PaginatedResponse<SystemLog>> {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    let filteredLogs = [...MOCK_SYSTEM_LOGS]

    // Aplicar filtros
    if (filters) {
      if (filters.user) {
        filteredLogs = filteredLogs.filter(log => 
          log.user.toLowerCase().includes(filters.user!.toLowerCase())
        )
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(filters.action!.toLowerCase())
        )
      }
      if (filters.contest && filters.contest !== '-') {
        filteredLogs = filteredLogs.filter(log => 
          log.contest.toLowerCase().includes(filters.contest!.toLowerCase())
        )
      }
      if (filters.dateFrom) {
        filteredLogs = filteredLogs.filter(log => 
          log.date >= filters.dateFrom!
        )
      }
      if (filters.dateTo) {
        filteredLogs = filteredLogs.filter(log => 
          log.date <= filters.dateTo!
        )
      }
    }

    // Aplicar búsqueda general
    if (pagination.search) {
      const searchTerm = pagination.search.toLowerCase()
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchTerm) ||
        log.description.toLowerCase().includes(searchTerm) ||
        log.user.toLowerCase().includes(searchTerm) ||
        log.contest.toLowerCase().includes(searchTerm)
      )
    }

    // Ordenar
    filteredLogs.sort((a, b) => {
      if (pagination.sortBy === 'date') {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return pagination.sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      }
      return 0
    })

    // Paginación
    const startIndex = (pagination.page - 1) * pagination.limit
    const endIndex = startIndex + pagination.limit
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

    return {
      data: paginatedLogs,
      total: filteredLogs.length,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(filteredLogs.length / pagination.limit)
    }
  },

  // Exportar logs (simulado)
  async exportLogs(filters?: LogFilters): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return 'logs_export_' + new Date().toISOString().slice(0, 10) + '.csv'
  }
}

// Tipos de usuario y autenticación
export type UserRole = 'Admin' | 'QA User' | 'User'

export interface User {
  id: string
  rut: string
  name: string
  role: UserRole
  email?: string
  createdAt: string
  isActive: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Estados de procesos
export type ProcessStatus = 
  | 'Creado' 
  | 'En configuración' 
  | 'Ejecutado' 
  | 'Cerrado' 
  | 'Anulado' 
  | 'Borrado'

// Tipos de pruebas de validación
export type ValidationTestType = 
  | 'obligatorio'
  | 'tipo_dato'
  | 'regex'
  | 'rango_numerico'
  | 'opcion_valida'
  | 'longitud'
  | 'coherencia_cruzada'
  | 'custom_ia'

// Severidad de reglas
export type RuleSeverity = 'error' | 'warning'

// Resultados de validación
export type ValidationResult = 'OK' | 'FAIL' | 'WARN'

// Modo de ejecución
export type ExecutionMode = 'secuencial' | 'paralelo'

// Interfaz para reglas de validación
export interface ValidationRule {
  id: string
  nombreRegla: string
  campoObjetivo: string
  tipoPrueba: ValidationTestType
  parametros: Record<string, any>
  promptIA?: string
  severidad: RuleSeverity
  activa: boolean
}

// Interfaz para procesos de validación
export interface ValidationProcess {
  id: string
  nombreConcurso: string
  rutaFormulario: string
  credencialesAcceso?: {
    usuario: string
    password: string
  }
  descripcion?: string
  usuarioCreacion: string
  fechaCreacion: string
  fechaModificacion?: string
  estado: ProcessStatus
  reglas: ValidationRule[]
  configuracion: {
    modoEjecucion: ExecutionMode
    tiempoMaxPorCampo: number
    reintentos: number
  }
  resultados?: ValidationProcessResult[]
}

// Interfaz para resultados de validación
export interface ValidationProcessResult {
  id: string
  procesoId: string
  campoValidado: string
  tipoPrueba: ValidationTestType
  resultado: ValidationResult
  valorIngresado: string
  detalleMensaje: string
  timestamp: string
  tiempoEjecucion: number
}

// Interfaz para logs del sistema
export interface SystemLog {
  id: string
  accion: string
  descripcion: string
  fecha: string
  usuario: string
  concurso?: string
  ip: string
  host: string
  nivel: 'info' | 'warn' | 'error'
}

// Interfaz para logs específicos del proceso
export interface ProcessLog {
  id: string
  accion: string
  descripcion: string
  fecha: string
  procesoId: string
}

// Estado de ejecución en tiempo real
export interface ExecutionStatus {
  isRunning: boolean
  progress: number
  startTime?: Date
  elapsedTime: number
  currentStep?: string
  logs: ProcessLog[]
  error?: string
}

// Interfaz para recursos del sistema
export interface SystemResource {
  id: string
  nombre: string
  tipo: 'API' | 'LLM' | 'Scraper' | 'Database'
  consumoMes: number
  costoEstimado: number
  limite: number
  ultimaActualizacion: string
  estado: 'activo' | 'inactivo' | 'error'
}

// Interfaz para parámetros del sistema
export interface SystemParameter {
  id: string
  categoria: string
  nombre: string
  valor: string | number | boolean
  descripcion: string
  tipo: 'string' | 'number' | 'boolean' | 'json'
  ultimaModificacion: string
  modificadoPor: string
}

// Filtros para resultados
export interface ResultsFilters {
  tipoPrueba?: ValidationTestType[]
  estadoResultado?: ValidationResult[]
  fechaInicio?: string
  fechaFin?: string
  campoValidado?: string
}

// Estadísticas de resultados
export interface ResultsStats {
  totalPruebas: number
  porcentajeOK: number
  porcentajeFAIL: number
  porcentajeWARN: number
  tiempoTotal: number
  promedioTiempoPorCampo: number
}

// Respuesta de la API
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: string[]
}

// Paginación
export interface PaginationParams {
  page: number
  limit: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// TIPOS PARA MÓDULO DE ADMINISTRACIÓN
// ============================================================================

// Consumo de Recursos de IA
export interface AIResourceConsumption {
  nlpApi: {
    name: string
    requests: number
    description: string
  }
  sentimentAnalysis: {
    name: string
    executions: number
    description: string
  }
  topicDetection: {
    name: string
    uses: number
    description: string
  }
}

// Parámetros del Sistema
export interface SystemParameters {
  userProfiles: {
    admin: boolean
    qaUser: boolean
    finalUser: boolean
  }
  database: {
    connection: string
    name: string
  }
  version: string
}

// Log de Acciones del Sistema
export interface SystemLog {
  id: string
  action: string
  description: string
  date: string
  user: string
  contest: string
  ipHost: string
  timestamp: Date
}

// Filtros para logs
export interface LogFilters {
  dateFrom?: string
  dateTo?: string
  user?: string
  action?: string
  contest?: string
}

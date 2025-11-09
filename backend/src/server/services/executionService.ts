import * as fs from 'fs/promises';
import * as path from 'path';

interface ProcessLog {
  id: string;
  accion: string;
  descripcion: string;
  fecha: string;
  procesoId: string;
}

interface ExecutionStatus {
  executionId: string;
  processId: string;
  isRunning: boolean;
  progress: number;
  startTime: Date;
  endTime?: Date;
  elapsedTime: number;
  currentStep: string;
  logs: ProcessLog[];
  error?: string;
  resultado?: any;
}

export class ExecutionService {
  private executionsFile: string;
  private executions: Map<string, ExecutionStatus> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private pendingSave: boolean = false;

  constructor() {
    // SOLUCIÓN 3: Usar directorio alternativo si está en OneDrive
    this.executionsFile = this.getSecureDataPath();
    this.initializeStorage();
    this.loadExecutionsFromDisk();
  }

  /**
   * Obtiene una ruta segura para guardar datos, evitando OneDrive si es posible
   * SOLUCIÓN 3: Detectar OneDrive y usar ruta alternativa
   */
  private getSecureDataPath(): string {
    const defaultPath = path.join(__dirname, '../../../data/logs.json');
    
    // Verificar si estamos en OneDrive (Windows)
    if (process.platform === 'win32' && defaultPath.includes('OneDrive')) {
      console.warn('⚠️ Detectado OneDrive en la ruta. Usando directorio temporal para evitar conflictos...');
      
      // Usar el directorio TEMP de Windows que NO está sincronizado
      const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Temp';
      const alternativePath = path.join(tempDir, 'corfo-automation-data', 'executions.json');
      
      console.log(`📂 Usando ruta alternativa: ${alternativePath}`);
      return alternativePath;
    }
    
    return defaultPath;
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Asegurar que el directorio data/ existe
      await fs.mkdir(path.dirname(this.executionsFile), { recursive: true });
      
      // Verificar si el archivo existe
      await fs.access(this.executionsFile);
    } catch {
      // Si el archivo no existe, crearlo con array vacío
      await fs.writeFile(this.executionsFile, JSON.stringify([], null, 2));
    }
  }

  private async loadExecutionsFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.executionsFile, 'utf-8');
      const executions: ExecutionStatus[] = JSON.parse(data);
      
      executions.forEach(exec => {
        // Convertir strings de fecha a objetos Date
        exec.startTime = new Date(exec.startTime);
        if (exec.endTime) exec.endTime = new Date(exec.endTime);
        
        this.executions.set(exec.executionId, exec);
      });
    } catch {
      // Si no existe o hay error, iniciar con mapa vacío
    }
  }

  /**
   * Guarda las ejecuciones en disco con reintentos y debouncing
   * SOLUCIÓN 1: Reintentos con backoff exponencial para manejar bloqueos de OneDrive
   * SOLUCIÓN 2: Debouncing para reducir escrituras frecuentes
   */
  private async saveExecutionsToDisk(): Promise<void> {
    // Implementar debouncing: esperar 500ms antes de guardar
    this.pendingSave = true;
    
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(async () => {
      if (!this.pendingSave) return;
      
      this.pendingSave = false;
      await this.saveExecutionsToDiskWithRetry();
    }, 500);
  }

  /**
   * Guarda en disco con reintentos (hasta 5 intentos con backoff exponencial)
   */
  private async saveExecutionsToDiskWithRetry(attempt: number = 1): Promise<void> {
    const maxAttempts = 5;
    const executionsArray = Array.from(this.executions.values());
    
    try {
      // Asegurar que el directorio existe antes de guardar
      await fs.mkdir(path.dirname(this.executionsFile), { recursive: true });
      
      // Intentar escribir el archivo
      await fs.writeFile(
        this.executionsFile, 
        JSON.stringify(executionsArray, null, 2),
        { encoding: 'utf-8', flag: 'w' }
      );
    } catch (error: any) {
      // Si es error de OneDrive/acceso y aún tenemos intentos
      if (attempt < maxAttempts && (error.code === 'UNKNOWN' || error.code === 'EBUSY' || error.code === 'EPERM')) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial, máximo 5s
        console.warn(`⚠️ Error guardando executions.json (intento ${attempt}/${maxAttempts}), reintentando en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.saveExecutionsToDiskWithRetry(attempt + 1);
      } else {
        // Si agotamos los intentos o es otro tipo de error, solo loguear (no crashear)
        console.error(`❌ Error guardando executions.json después de ${attempt} intentos:`, error.message);
        console.error(`   Nota: Los datos en memoria están actualizados, solo falló la persistencia en disco`);
        // NO lanzar el error para evitar crashear el proceso principal
      }
    }
  }

  async initializeExecution(executionId: string, processId: string): Promise<void> {
    const execution: ExecutionStatus = {
      executionId,
      processId,
      isRunning: true,
      progress: 0,
      startTime: new Date(),
      elapsedTime: 0,
      currentStep: 'Iniciando proceso...',
      logs: []
    };

    this.executions.set(executionId, execution);
    await this.saveExecutionsToDisk();
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    const execution = this.executions.get(executionId);
    
    if (execution && execution.isRunning) {
      // Actualizar tiempo transcurrido
      execution.elapsedTime = Date.now() - execution.startTime.getTime();
    }

    return execution || null;
  }

  async updateExecutionProgress(executionId: string, progress: number, step: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.progress = progress;
      execution.currentStep = step;
      execution.elapsedTime = Date.now() - execution.startTime.getTime();
      await this.saveExecutionsToDisk();
    }
  }

  async addLog(executionId: string, message: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      // Crear log estructurado
      const logEntry: ProcessLog = {
        id: `${executionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accion: this.extractActionFromMessage(message),
        descripcion: message,
        fecha: new Date().toISOString(),
        procesoId: execution.processId
      };
      
      execution.logs.push(logEntry);
      
      // Analizar el mensaje para extraer progreso
      this.analyzeLogForProgress(execution, message);
      
      // 🔴 MEJORA: Usar debounce para evitar escrituras excesivas
      // Guardar después de 500ms de inactividad en lugar de por cada log
      this.debounceSave();
    }
  }

  /**
   * Extrae la acción principal de un mensaje de log
   */
  private extractActionFromMessage(message: string): string {
    // Detectar emojis comunes y sus acciones
    if (message.includes('🚀')) return 'Inicio';
    if (message.includes('🔍')) return 'Análisis';
    if (message.includes('✅')) return 'Completado';
    if (message.includes('❌')) return 'Error';
    if (message.includes('📝')) return 'Procesamiento';
    if (message.includes('🔑')) return 'Login';
    if (message.includes('🌐')) return 'Navegación';
    if (message.includes('⚠️')) return 'Advertencia';
    if (message.includes('📊')) return 'Estadísticas';
    if (message.includes('🎯')) return 'Paso';
    
    // Detectar por palabras clave
    if (message.toLowerCase().includes('login')) return 'Login';
    if (message.toLowerCase().includes('navegando')) return 'Navegación';
    if (message.toLowerCase().includes('procesando')) return 'Procesamiento';
    if (message.toLowerCase().includes('completado')) return 'Completado';
    if (message.toLowerCase().includes('error')) return 'Error';
    if (message.toLowerCase().includes('paso')) return 'Paso';
    
    return 'Evento';
  }

  private debounceSave(): void {
    // Limpiar timeout anterior
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Programar guardado después de 500ms de inactividad
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveExecutionsToDisk().catch(err => {
        console.error('⚠️ Error guardando logs:', err);
      });
    }, 500);
  }

  private analyzeLogForProgress(execution: ExecutionStatus, message: string): void {
    // Detectar pasos del MVP
    if (message.includes('PROCESANDO PASO')) {
      const match = message.match(/PASO (\d+)(?: de (\d+))?/);
      if (match) {
        const currentStep = parseInt(match[1]);
        const totalSteps = match[2] ? parseInt(match[2]) : 7; // Fallback a 7 si no se detecta
        execution.progress = Math.round((currentStep / totalSteps) * 90); // 90% para los pasos
        execution.currentStep = message;
      }
    } else if (message.includes('Iniciando navegador')) {
      execution.progress = 5;
      execution.currentStep = 'Iniciando navegador...';
    } else if (message.includes('Realizando login')) {
      execution.progress = 10;
      execution.currentStep = 'Realizando login...';
    } else if (message.includes('Detectando estructura')) {
      execution.progress = 15;
      execution.currentStep = 'Detectando estructura del formulario...';
    } else if (message.includes('Verificando página de confirmación')) {
      execution.progress = 95;
      execution.currentStep = 'Verificando resultados...';
    } else if (message.includes('COMPLETADO EXITOSAMENTE')) {
      execution.progress = 100;
      execution.currentStep = 'Proceso completado';
    }
  }

  async completeExecution(executionId: string, resultado: any): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.isRunning = false;
      execution.progress = 100;
      execution.currentStep = 'Completado';
      execution.endTime = new Date();
      execution.elapsedTime = execution.endTime.getTime() - execution.startTime.getTime();
      execution.resultado = resultado;
      
      // Forzar guardado inmediato al completar (sin debounce)
      await this.forceSave();
    }
  }

  /**
   * Fuerza el guardado inmediato sin debouncing
   * Se usa cuando el proceso termina para evitar pérdida de datos
   */
  private async forceSave(): Promise<void> {
    // Limpiar todos los timers pendientes
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.pendingSave = false;
    await this.saveExecutionsToDiskWithRetry();
  }

  async failExecution(executionId: string, errorMessage: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.isRunning = false;
      execution.currentStep = 'Error';
      execution.error = errorMessage;
      execution.endTime = new Date();
      execution.elapsedTime = execution.endTime.getTime() - execution.startTime.getTime();
      
      // Forzar guardado inmediato al fallar (sin debounce)
      await this.forceSave();
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.isRunning = false;
      execution.currentStep = 'Cancelado';
      execution.error = 'Ejecución cancelada por el usuario';
      execution.endTime = new Date();
      execution.elapsedTime = execution.endTime.getTime() - execution.startTime.getTime();
      
      // Forzar guardado inmediato al cancelar (sin debounce)
      await this.forceSave();
    }
  }

  async getExecutionLogs(executionId: string): Promise<ProcessLog[]> {
    const execution = this.executions.get(executionId);
    return execution?.logs || [];
  }

  async getExecutionsByProcess(processId: string): Promise<ExecutionStatus[]> {
    return Array.from(this.executions.values())
      .filter(exec => exec.processId === processId);
  }

  async getAllActiveExecutions(): Promise<ExecutionStatus[]> {
    return Array.from(this.executions.values())
      .filter(exec => exec.isRunning);
  }
}

// Singleton: exportar una única instancia compartida
export const executionService = new ExecutionService();


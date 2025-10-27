import * as fs from 'fs/promises';
import * as path from 'path';

interface ExecutionStatus {
  executionId: string;
  processId: string;
  isRunning: boolean;
  progress: number;
  startTime: Date;
  endTime?: Date;
  elapsedTime: number;
  currentStep: string;
  logs: string[];
  error?: string;
  resultado?: any;
}

export class ExecutionService {
  private executionsFile = path.join(__dirname, '../../data/executions.json');
  private executions: Map<string, ExecutionStatus> = new Map();

  constructor() {
    this.initializeStorage();
    this.loadExecutionsFromDisk();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.access(this.executionsFile);
    } catch {
      await fs.mkdir(path.dirname(this.executionsFile), { recursive: true });
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

  private async saveExecutionsToDisk(): Promise<void> {
    const executionsArray = Array.from(this.executions.values());
    await fs.writeFile(this.executionsFile, JSON.stringify(executionsArray, null, 2));
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
      execution.logs.push(message);
      
      // Analizar el mensaje para extraer progreso
      this.analyzeLogForProgress(execution, message);
      
      await this.saveExecutionsToDisk();
    }
  }

  private analyzeLogForProgress(execution: ExecutionStatus, message: string): void {
    // Detectar pasos del MVP
    if (message.includes('PROCESANDO PASO')) {
      const match = message.match(/PASO (\d+)/);
      if (match) {
        const currentStep = parseInt(match[1]);
        const estimatedTotal = 7; // Típicamente hay 7 pasos
        execution.progress = Math.round((currentStep / estimatedTotal) * 90); // 90% para los pasos
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
      await this.saveExecutionsToDisk();
    }
  }

  async failExecution(executionId: string, errorMessage: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.isRunning = false;
      execution.currentStep = 'Error';
      execution.error = errorMessage;
      execution.endTime = new Date();
      execution.elapsedTime = execution.endTime.getTime() - execution.startTime.getTime();
      await this.saveExecutionsToDisk();
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
      await this.saveExecutionsToDisk();
    }
  }

  async getExecutionLogs(executionId: string): Promise<string[]> {
    const execution = this.executions.get(executionId);
    return execution?.logs || [];
  }

  async getExecutionsByProcess(processId: string): Promise<ExecutionStatus[]> {
    return Array.from(this.executions.values())
      .filter(exec => exec.processId === processId);
  }
}


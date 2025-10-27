import * as fs from 'fs/promises';
import * as path from 'path';
import { MVPHibrido, ResultadoMVP } from '../../ai/mvpHibrido';
import { obtenerConfiguracion } from '../../ai/configuraciones';
import { ExecutionService } from './executionService';

interface ValidationProcess {
  id: string;
  nombreConcurso: string;
  rutaFormulario: string;
  credencialesAcceso?: {
    usuario?: string;
    password?: string;
  };
  descripcion?: string;
  usuarioCreacion: string;
  fechaCreacion: string;
  fechaModificacion?: string;
  estado: string;
  reglas?: any[];
  configuracion?: any;
}

interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProcessService {
  private processesFile = path.join(__dirname, '../../data/processes.json');
  private executionService: ExecutionService;

  constructor() {
    this.executionService = new ExecutionService();
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.access(this.processesFile);
    } catch {
      // Si no existe, crear archivo con array vacío
      await fs.mkdir(path.dirname(this.processesFile), { recursive: true });
      await fs.writeFile(this.processesFile, JSON.stringify([], null, 2));
    }
  }

  private async loadProcesses(): Promise<ValidationProcess[]> {
    try {
      const data = await fs.readFile(this.processesFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async saveProcesses(processes: ValidationProcess[]): Promise<void> {
    await fs.writeFile(this.processesFile, JSON.stringify(processes, null, 2));
  }

  async getProcesses(params: PaginationParams): Promise<PaginatedResponse<ValidationProcess>> {
    let processes = await this.loadProcesses();

    // Filtrar procesos borrados (no mostrarlos en la lista)
    processes = processes.filter(p => p.estado !== 'Borrado');

    // Filtrar por búsqueda si existe
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      processes = processes.filter(p =>
        p.nombreConcurso.toLowerCase().includes(searchTerm) ||
        p.descripcion?.toLowerCase().includes(searchTerm) ||
        p.usuarioCreacion.toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar paginación
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedData = processes.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: processes.length,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(processes.length / params.limit)
    };
  }

  async getProcess(id: string): Promise<ValidationProcess | null> {
    const processes = await this.loadProcesses();
    return processes.find(p => p.id === id) || null;
  }

  async createProcess(processData: Omit<ValidationProcess, 'id' | 'fechaCreacion' | 'usuarioCreacion'>): Promise<ValidationProcess> {
    const processes = await this.loadProcesses();

    const newProcess: ValidationProcess = {
      ...processData,
      id: `process_${Date.now()}`,
      fechaCreacion: new Date().toISOString(),
      usuarioCreacion: 'system@corfo.cl', // TODO: Obtener del contexto de autenticación
      estado: 'Creado'
    };

    processes.unshift(newProcess);
    await this.saveProcesses(processes);

    return newProcess;
  }

  async updateProcess(id: string, processData: Partial<ValidationProcess>): Promise<ValidationProcess> {
    const processes = await this.loadProcesses();
    const index = processes.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Proceso no encontrado');
    }

    processes[index] = {
      ...processes[index],
      ...processData,
      fechaModificacion: new Date().toISOString()
    };

    await this.saveProcesses(processes);
    return processes[index];
  }

  async deleteProcess(id: string): Promise<void> {
    const processes = await this.loadProcesses();
    const index = processes.findIndex(p => p.id === id);

    if (index !== -1) {
      processes[index].estado = 'Borrado';
      await this.saveProcesses(processes);
    }
  }

  async executeProcess(id: string): Promise<{ message: string; executionId: string }> {
    const process = await this.getProcess(id);
    if (!process) {
      throw new Error('Proceso no encontrado');
    }

    // Actualizar estado a ejecutado
    await this.updateProcess(id, { estado: 'Ejecutado' });

    return {
      message: 'Proceso ejecutado exitosamente',
      executionId: `exec_${Date.now()}`
    };
  }

  async executeProcessWithMonitoring(processId: string): Promise<string> {
    console.log(`🔍 [executeProcessWithMonitoring] Buscando proceso: ${processId}`);
    
    const process = await this.getProcess(processId);
    
    if (!process) {
      console.error(`❌ [executeProcessWithMonitoring] Proceso no encontrado: ${processId}`);
      const allProcesses = await this.loadProcesses();
      console.log(`📋 Procesos disponibles:`, allProcesses.map(p => ({ id: p.id, nombre: p.nombreConcurso, estado: p.estado })));
      throw new Error('Proceso no encontrado');
    }

    console.log(`✅ [executeProcessWithMonitoring] Proceso encontrado: ${process.nombreConcurso}`);
    
    // Crear ejecución y obtener ID
    const executionId = `exec_${Date.now()}`;
    console.log(`🆔 [executeProcessWithMonitoring] Execution ID creado: ${executionId}`);

    // Iniciar ejecución en background (no esperar respuesta)
    this.runMVPHibridoInBackground(processId, executionId, process)
      .catch(error => {
        console.error(`❌ Error en ejecución background ${executionId}:`, error);
      });

    console.log(`🚀 [executeProcessWithMonitoring] Retornando execution ID: ${executionId}`);
    return executionId;
  }

  private async runMVPHibridoInBackground(
    processId: string, 
    executionId: string, 
    process: ValidationProcess
  ): Promise<void> {
    try {
      // Inicializar estado de ejecución
      await this.executionService.initializeExecution(executionId, processId);

      // Configurar MVPHibrido con la URL del proceso
      const configuracion = obtenerConfiguracion('demo');
      
      // Credenciales dinámicas del proceso
      const credenciales = process.credencialesAcceso ? {
        usuario: process.credencialesAcceso.usuario || '',
        password: process.credencialesAcceso.password || ''
      } : undefined;
      
      // Modo headless (navegador oculto == true) cuando se ejecuta desde interfaz
      const mvp = new MVPHibrido(configuracion, true, credenciales);

      // Inyectar URL del formulario
      (mvp as any).formUrl = process.rutaFormulario;

      console.log(`🚀 Iniciando ejecución ${executionId} para proceso ${processId}`);
      console.log(`📋 URL del formulario: ${process.rutaFormulario}`);

      // Ejecutar MVP y capturar logs en tiempo real
      this.captureLogs(executionId, async () => {
        const resultado: ResultadoMVP = await mvp.ejecutar();

        // Guardar resultado
        await this.saveExecutionResult(executionId, resultado);

        // Actualizar estado del proceso
        await this.updateProcess(processId, { 
          estado: resultado.exito ? 'Ejecutado' : 'Fallido',
          fechaModificacion: new Date().toISOString()
        });

        // Finalizar ejecución
        await this.executionService.completeExecution(executionId, resultado);
      });

    } catch (error) {
      console.error(`❌ Error en ejecución ${executionId}:`, error);
      await this.executionService.failExecution(executionId, (error as Error).message);
    }
  }

  private async captureLogs(executionId: string, executeFunc: () => Promise<void>): Promise<void> {
    // Interceptar console.log para capturar logs
    const originalLog = console.log;
    const logs: string[] = [];

    console.log = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      logs.push(message);
      
      // Actualizar logs en tiempo real
      this.executionService.addLog(executionId, message);
      
      // Llamar al log original
      originalLog(...args);
    };

    try {
      await executeFunc();
    } finally {
      // Restaurar console.log original
      console.log = originalLog;
    }
  }

  private async saveExecutionResult(executionId: string, resultado: ResultadoMVP): Promise<void> {
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    await fs.mkdir(resultsDir, { recursive: true });

    const resultFile = path.join(resultsDir, `${executionId}.json`);
    await fs.writeFile(resultFile, JSON.stringify(resultado, null, 2));
  }

  async getProcessResults(processId: string): Promise<any[]> {
    // Buscar el último resultado de ejecución para este proceso
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    
    try {
      const files = await fs.readdir(resultsDir);
      const processFiles = files.filter(f => f.includes(processId));
      
      if (processFiles.length === 0) {
        return [];
      }

      // Obtener el archivo más reciente
      const latestFile = processFiles.sort().reverse()[0];
      const data = await fs.readFile(path.join(resultsDir, latestFile), 'utf-8');
      const resultado: ResultadoMVP = JSON.parse(data);

      // Convertir ResultadoMVP a formato de resultados esperado por el frontend
      const results = resultado.pasosCompletados?.flatMap(paso => 
        paso.detalles.map(detalle => ({
          id: `${paso.numero}_${detalle.etiqueta}`,
          procesoId: processId,
          campoValidado: detalle.etiqueta,
          tipoPrueba: detalle.tipo,
          resultado: detalle.completado ? 'OK' : 'FAIL',
          valorIngresado: detalle.valorAsignado,
          detalleMensaje: detalle.razonFallo || 'Campo completado correctamente',
          timestamp: new Date().toISOString(),
          tiempoEjecucion: paso.tiempoTranscurrido / paso.detalles.length
        }))
      ) || [];

      return results;
    } catch {
      return [];
    }
  }

  async getProcessLogs(processId: string): Promise<any[]> {
    // Buscar logs de ejecuciones de este proceso
    const executions = await this.executionService.getExecutionsByProcess(processId);
    
    return executions.flatMap(exec => 
      exec.logs.map((log: string, index: number) => ({
        id: `${exec.executionId}_${index}`,
        accion: 'Ejecución MVP',
        descripcion: log,
        fecha: new Date().toISOString(),
        procesoId: processId
      }))
    );
  }

  async exportResults(processId: string, format: 'csv' | 'json'): Promise<string> {
    const results = await this.getProcessResults(processId);

    if (format === 'csv') {
      const headers = ['Campo Validado', 'Tipo', 'Resultado', 'Valor', 'Mensaje', 'Tiempo (s)'];
      const rows = results.map(r => [
        r.campoValidado,
        r.tipoPrueba,
        r.resultado,
        r.valorIngresado,
        r.detalleMensaje,
        r.tiempoEjecucion.toFixed(2)
      ]);

      return [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    } else {
      return JSON.stringify(results, null, 2);
    }
  }
}


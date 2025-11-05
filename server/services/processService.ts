import * as fs from 'fs/promises';
import * as path from 'path';
import { AgenteOrquestador, ResultadoAgente } from '../../ai/agenteOrquestador';
import { obtenerConfiguracion } from '../../ai/configuraciones';
import { executionService } from './executionService';
import { getNextReportId } from '../utils/getNextReportId';
import { generarInformePDF } from '../../ai/generadorInforme';
import { SystemLogService } from './systemLogService';

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
  private static instance: ProcessService;
  private processesFile = path.join(__dirname, '../../data/processes.json');
  private activeMVPInstances: Map<string, AgenteOrquestador> = new Map(); // Guardar instancias activas

  private constructor() {
    this.initializeStorage();
  }

  // Singleton: siempre retorna la misma instancia
  public static getInstance(): ProcessService {
    if (!ProcessService.instance) {
      ProcessService.instance = new ProcessService();
    }
    return ProcessService.instance;
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Asegurar que el directorio data/ existe
      await fs.mkdir(path.dirname(this.processesFile), { recursive: true });
      
      // Verificar si el archivo existe
      await fs.access(this.processesFile);
    } catch {
      // Si el archivo no existe, crearlo con array vacío
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
    // Asegurar que el directorio existe antes de guardar
    await fs.mkdir(path.dirname(this.processesFile), { recursive: true });
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

    // Registrar log
    const systemLogService = SystemLogService.getInstance();
    await systemLogService.logAction(
      'Creación de Concurso',
      `Se creó el concurso '${newProcess.nombreConcurso}'`,
      newProcess.usuarioCreacion,
      newProcess.nombreConcurso,
      'localhost'
    );

    return newProcess;
  }

  async updateProcess(id: string, processData: Partial<ValidationProcess>): Promise<ValidationProcess> {
    const processes = await this.loadProcesses();
    const index = processes.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Proceso no encontrado');
    }

    const oldProcess = processes[index];
    processes[index] = {
      ...processes[index],
      ...processData,
      fechaModificacion: new Date().toISOString()
    };

    await this.saveProcesses(processes);

    // Registrar log
    const systemLogService = SystemLogService.getInstance();
    await systemLogService.logAction(
      'Edición de Concurso',
      `Concurso '${oldProcess.nombreConcurso}' actualizado`,
      oldProcess.usuarioCreacion,
      oldProcess.nombreConcurso,
      'localhost'
    );

    return processes[index];
  }

  async deleteProcess(id: string): Promise<void> {
    const processes = await this.loadProcesses();
    const index = processes.findIndex(p => p.id === id);

    if (index !== -1) {
      const process = processes[index];
      processes[index].estado = 'Borrado';
      await this.saveProcesses(processes);

      // Registrar log
      const systemLogService = SystemLogService.getInstance();
      await systemLogService.logAction(
        'Eliminación de Concurso',
        `Concurso '${process.nombreConcurso}' marcado como 'borrado'`,
        process.usuarioCreacion,
        process.nombreConcurso,
        'localhost'
      );
    }
  }

  async executeProcess(id: string): Promise<{ message: string; executionId: string }> {
    const process = await this.getProcess(id);
    if (!process) {
      throw new Error('Proceso no encontrado');
    }

    // Actualizar estado a ejecutado
    await this.updateProcess(id, { estado: 'Ejecutado' });

    // Registrar log de ejecución
    const systemLogService = SystemLogService.getInstance();
    await systemLogService.logAction(
      'Validación Automática',
      `Proceso de validación iniciado para '${process.nombreConcurso}'`,
      process.usuarioCreacion,
      process.nombreConcurso,
      'localhost'
    );

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
      throw new Error(`Proceso no encontrado. Por favor recarga la página y selecciona un proceso válido.`);
    }

    // Verificar que el proceso no esté borrado
    if (process.estado === 'Borrado' || process.estado === 'Anulado') {
      console.error(`❌ [executeProcessWithMonitoring] Proceso está ${process.estado}: ${processId}`);
      throw new Error(`No se puede ejecutar un proceso con estado "${process.estado}". Por favor recarga la página.`);
    }

    console.log(`✅ [executeProcessWithMonitoring] Proceso encontrado: ${process.nombreConcurso}`);
    
    // Crear ejecución y obtener ID
    const executionId = `exec_${Date.now()}`;
    console.log(`🆔 [executeProcessWithMonitoring] Execution ID creado: ${executionId}`);

    // Inicializar estado de ejecución ANTES de retornar (para que el frontend pueda consultarlo inmediatamente)
    await executionService.initializeExecution(executionId, processId);
    console.log(`✅ [executeProcessWithMonitoring] Ejecución inicializada en ExecutionService`);

    // Iniciar ejecución en background (no esperar respuesta)
    this.runAgenteOrquestadorInBackground(processId, executionId, process)
      .catch(error => {
        console.error(`❌ Error en ejecución background ${executionId}:`, error);
      });

    console.log(`🚀 [executeProcessWithMonitoring] Retornando execution ID: ${executionId}`);
    return executionId;
  }

  private async runAgenteOrquestadorInBackground(
    processId: string, 
    executionId: string, 
    process: ValidationProcess
  ): Promise<void> {
    try {
      // La ejecución ya fue inicializada antes de retornar el ID al frontend
      
      // Configurar AgenteOrquestador con la URL del proceso
      const configuracion = obtenerConfiguracion('demo');
      
      // Credenciales dinámicas del proceso
      const credenciales = process.credencialesAcceso ? {
        usuario: process.credencialesAcceso.usuario || '',
        password: process.credencialesAcceso.password || ''
      } : undefined;
      
      // Modo headless (navegador oculto == true) cuando se ejecuta desde interfaz
      const agente = new AgenteOrquestador(configuracion, true, credenciales);

      // Guardar instancia activa para poder cancelarla después
      this.activeMVPInstances.set(executionId, agente);
      console.log(`✅ [ProcessService] Instancia Agente Orquestador guardada para ${executionId}. Total activas: ${this.activeMVPInstances.size}`);

      // Inyectar URL del formulario
      (agente as any).formUrl = process.rutaFormulario;

      console.log(`🚀 Iniciando ejecución ${executionId} para proceso ${processId}`);
      console.log(`📋 URL del formulario: ${process.rutaFormulario}`);

      // Ejecutar Agente Orquestador y capturar logs en tiempo real
      await this.captureLogs(executionId, async () => {
        const resultado: ResultadoAgente = await agente.ejecutar();

        // Guardar resultado
        await this.saveExecutionResult(executionId, processId, resultado);

        // Actualizar estado del proceso
        await this.updateProcess(processId, { 
          estado: resultado.exito ? 'Ejecutado' : 'Fallido',
          fechaModificacion: new Date().toISOString()
        });

        // Registrar log de finalización
        const systemLogService = SystemLogService.getInstance();
        await systemLogService.logAction(
          resultado.exito ? 'Validación Automática Completada' : 'Validación Automática Fallida',
          resultado.exito 
            ? `Proceso de validación completado exitosamente para '${process.nombreConcurso}'. ${resultado.estadisticas?.camposCompletados || 0} campos completados de ${resultado.estadisticas?.totalCampos || 0} total.`
            : `Proceso de validación fallido para '${process.nombreConcurso}'. ${resultado.mensaje || 'Error desconocido'}`,
          process.usuarioCreacion,
          process.nombreConcurso,
          'localhost'
        );

        // Finalizar ejecución
        await executionService.completeExecution(executionId, resultado);
        
        // Limpiar instancia activa
        this.activeMVPInstances.delete(executionId);
      });

    } catch (error) {
      console.error(`❌ Error en ejecución ${executionId}:`, error);
      await executionService.failExecution(executionId, (error as Error).message);
      
      // Actualizar estado del proceso a Fallido
      await this.updateProcess(processId, { 
        estado: 'Fallido',
        fechaModificacion: new Date().toISOString()
      });
      
      // Limpiar instancia activa en caso de error
      this.activeMVPInstances.delete(executionId);
    }
  }

  /**
   * Cancela una ejecución activa y detiene el navegador
   */
  async cancelExecution(executionId: string): Promise<void> {
    console.log(`🛑 [ProcessService] Cancelando ejecución: ${executionId}`);
    console.log(`🛑 [ProcessService] Instancias activas: ${this.activeMVPInstances.size}`);
    console.log(`🛑 [ProcessService] IDs activos:`, Array.from(this.activeMVPInstances.keys()));
    
    // Obtener el estado de ejecución para encontrar el processId
    const executionStatus = await executionService.getExecutionStatus(executionId);
    const processId = executionStatus?.processId;
    
    // Obtener la instancia activa del Agente Orquestador
    const agenteInstance = this.activeMVPInstances.get(executionId);
    
    if (agenteInstance) {
      console.log(`🛑 [ProcessService] Deteniendo navegador...`);
      // Detener el navegador de Playwright
      await (agenteInstance as any).detener();
      
      // Limpiar instancia
      this.activeMVPInstances.delete(executionId);
      console.log(`✅ [ProcessService] Navegador detenido y limpiado`);
    } else {
      console.log(`⚠️ [ProcessService] No se encontró instancia activa para ${executionId}`);
    }
    
    // Marcar ejecución como cancelada en el servicio
    await executionService.cancelExecution(executionId);
    
    // Actualizar estado del proceso a Creado (vuelve al estado inicial)
    if (processId) {
      await this.updateProcess(processId, { 
        estado: 'Creado',
        fechaModificacion: new Date().toISOString()
      });
      console.log(`✅ [ProcessService] Estado del proceso ${processId} actualizado a "Creado"`);
    }
  }

  private async captureLogs(executionId: string, executeFunc: () => Promise<void>): Promise<void> {
    // Interceptar console.log para capturar logs
    const originalLog = console.log;
    const logs: string[] = [];

    console.log = (...args: any[]) => {
      const message = args.map(arg => String(arg)).join(' ');
      logs.push(message);
      
      // SOLUCIÓN 4: Actualizar logs de forma segura (sin crashear si falla)
      executionService.addLog(executionId, message).catch(err => {
        originalLog(`⚠️ Advertencia: No se pudo guardar log en disco (el proceso continúa): ${err.message}`);
      });
      
      // Llamar al log original
      originalLog(...args);
    };

    try {
      await executeFunc();
    } catch (error) {
      // SOLUCIÓN 4: Capturar errores del Agente Orquestador y continuar con el flujo de finalización
      originalLog(`❌ Error durante la ejecución del Agente Orquestador:`, error);
      throw error; // Re-lanzar para que el catch externo lo maneje
    } finally {
      // Restaurar console.log original
      console.log = originalLog;
    }
  }

  /**
   * Guarda el resultado de una ejecución desde la UI
   * Este reporte se guarda en data/execution_results/ con metadata del servidor
   * para ejecuciones monitoreadas desde la interfaz web
   */
  private async saveExecutionResult(executionId: string, processId: string, resultado: ResultadoAgente): Promise<void> {
    try {
      const resultsDir = path.join(__dirname, '../../data/execution_results');
      await fs.mkdir(resultsDir, { recursive: true });

      // Obtener siguiente ID incremental para reportes de UI
      const nextId = await getNextReportId(resultsDir, 'exec_');
      const resultFile = path.join(resultsDir, `exec_${nextId}.json`);
      
      // Agregar metadata con processId y executionId al resultado
      const resultadoConMetadata = {
        ...resultado,
        metadata: {
          processId,
          executionId,
          fechaGuardado: new Date().toISOString()
        }
      };
      
      // Guardar resultado con reintentos para manejar bloqueos de OneDrive
      await this.saveFileWithRetry(resultFile, JSON.stringify(resultadoConMetadata, null, 2));
      
      console.log(`✅ Resultado de ejecución guardado: exec_${nextId}.json`);

      // Generar PDF automáticamente después de guardar el JSON
      try {
        const informesDir = path.join(__dirname, '../../data/informes');
        const pdfPath = path.join(informesDir, `exec_${nextId}.pdf`);
        
        await generarInformePDF(resultFile, pdfPath);
        console.log(`✅ Informe PDF generado: exec_${nextId}.pdf`);
      } catch (pdfError: any) {
        console.error(`❌ Error generando PDF para exec_${nextId}:`, pdfError.message);
        console.error(`   Nota: El reporte JSON está guardado, solo falló la generación del PDF`);
        // No lanzar error para no interrumpir el flujo principal
      }
    } catch (error) {
      console.error(`❌ Error guardando resultado de ejecución ${executionId}:`, error);
      console.error(`   Nota: El resultado está disponible en memoria pero no se pudo persistir en disco`);
      // No lanzar error para no interrumpir el flujo
    }
  }

  /**
   * Guarda un archivo con reintentos para manejar bloqueos de OneDrive
   */
  private async saveFileWithRetry(filePath: string, content: string, attempt: number = 1): Promise<void> {
    const maxAttempts = 3;
    
    try {
      await fs.writeFile(filePath, content, { encoding: 'utf-8', flag: 'w' });
    } catch (error: any) {
      if (attempt < maxAttempts && (error.code === 'UNKNOWN' || error.code === 'EBUSY' || error.code === 'EPERM')) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.warn(`⚠️ Error guardando archivo (intento ${attempt}/${maxAttempts}), reintentando en ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.saveFileWithRetry(filePath, content, attempt + 1);
      } else {
        throw error; // Re-lanzar si agotamos intentos
      }
    }
  }

  async getProcessResults(processId: string): Promise<any[]> {
    // Buscar el último resultado de ejecución para este proceso filtrando por processId en el contenido JSON
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    
    try {
      const files = await fs.readdir(resultsDir);
      const jsonFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        return [];
      }

      // Cargar todos los archivos y filtrar por processId leyendo el contenido JSON
      const filesWithData = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const filePath = path.join(resultsDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const jsonData = JSON.parse(data);
            
            // Verificar si tiene metadata y si el processId coincide
            const fileProcessId = jsonData.metadata?.processId || jsonData.processId; // Soporte retrocompatibilidad
            
            // Si no tiene metadata, saltar este archivo
            if (!fileProcessId) {
              return null;
            }
            
            // Filtrar solo archivos que pertenezcan a este proceso
            if (fileProcessId !== processId) {
              return null;
            }
            
            const fechaEjecucion = jsonData.fechaEjecucion ? new Date(jsonData.fechaEjecucion).getTime() : 0;
            const stats = await fs.stat(filePath);
            const mtime = stats.mtime.getTime();
            
            return {
              file,
              fechaEjecucion: fechaEjecucion || mtime,
              data: jsonData
            };
          } catch (error) {
            console.error(`[getProcessResults] Error leyendo archivo ${file}:`, error);
            return null;
          }
        })
      );

      const validFiles = filesWithData.filter(f => f !== null) as Array<{
        file: string;
        fechaEjecucion: number;
        data: any;
      }>;

      if (validFiles.length === 0) {
        return [];
      }

      // Obtener el archivo más reciente de este proceso
      const latest = validFiles.sort((a, b) => b.fechaEjecucion - a.fechaEjecucion)[0];
      const resultado: ResultadoAgente = latest.data;

      // Convertir ResultadoAgente a formato de resultados esperado por el frontend
      const results = resultado.pasosCompletados?.flatMap(paso => 
        paso.detalles.map(detalle => ({
          id: `${paso.numero}_${detalle.etiqueta}`,
          procesoId: processId,
          campoValidado: detalle.etiqueta,
          tipoPrueba: detalle.tipo,
          resultado: detalle.completado ? 'OK' : 'FAIL',
          valorIngresado: detalle.valorAsignado,
          detalleMensaje: detalle.razonFallo || 'Campo completado correctamente',
          timestamp: resultado.fechaEjecucion || new Date().toISOString(),
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
    const executions = await executionService.getExecutionsByProcess(processId);
    
    // Obtener fecha de ejecución del archivo JSON si está disponible para usar timestamps reales
    let fechaEjecucionBase: string | null = null;
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    try {
      const files = await fs.readdir(resultsDir);
      const jsonFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
      
      // Buscar el archivo JSON más reciente para este proceso
      for (const file of jsonFiles.sort().reverse()) {
        try {
          const filePath = path.join(resultsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(data);
          
          // Verificar si tiene metadata y si el processId coincide
          const fileProcessId = jsonData.metadata?.processId || jsonData.processId;
          
          if (fileProcessId === processId) {
            fechaEjecucionBase = jsonData.fechaEjecucion || null;
            break;
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Si no hay archivo, continuar sin fecha base
    }
    
    // Usar fecha de ejecución del JSON si está disponible, de lo contrario usar fecha actual
    const fechaBase = fechaEjecucionBase ? new Date(fechaEjecucionBase) : new Date();
    
    const executionLogs = executions.flatMap(exec => 
      exec.logs.map((log: string, index: number) => ({
        id: `${exec.executionId}_${index}`,
        accion: 'Ejecución Agente Orquestador',
        descripcion: log,
        fecha: fechaBase.toISOString(),
        procesoId: processId
      }))
    );

    // Agregar logs del resumen final desde el JSON de ejecución filtrando por processId
    try {
      const files = await fs.readdir(resultsDir);
      const jsonFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
      
      // Buscar el archivo JSON más reciente para este proceso
      let resultado: ResultadoAgente | null = null;
      for (const file of jsonFiles.sort().reverse()) {
        try {
          const filePath = path.join(resultsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(data);
          
          // Verificar si tiene metadata y si el processId coincide
          const fileProcessId = jsonData.metadata?.processId || jsonData.processId;
          
          if (fileProcessId === processId) {
            resultado = jsonData;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (resultado) {
        // Agregar resumen final como log usando fecha real del JSON
        if (resultado.estadisticas) {
          const resumenLog = {
            id: `${processId}_resumen_final`,
            accion: 'Resumen Final',
            descripcion: `⏱️ Tiempo total: ${Math.round(resultado.tiempoTotal / 60)} minutos | 📊 Pasos completados: ${resultado.estadisticas.totalPasos} | 📝 Campos encontrados: ${resultado.estadisticas.totalCampos} | ✅ Campos completados: ${resultado.estadisticas.camposCompletados} | 🎯 Porcentaje de éxito: ${resultado.estadisticas.porcentajeExito}% | ⚡ Velocidad: ${resultado.estadisticas.velocidadCamposPorSegundo.toFixed(2)} campos/segundo`,
            fecha: resultado.fechaEjecucion || new Date().toISOString(),
            procesoId: processId
          };
          executionLogs.push(resumenLog);
        }
      }
    } catch {
      // Si no hay archivo, continuar sin resumen
    }

    return executionLogs;
  }

  async getProcessExecutionJson(processId: string): Promise<any> {
    // Obtener el JSON completo del archivo exec_*.json
    // Estrategia: filtrar por processId leyendo el contenido JSON y retornar el más reciente de ese proceso
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    
    try {
      const files = await fs.readdir(resultsDir);
      const jsonFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        console.log(`[getProcessExecutionJson] No se encontraron archivos JSON en ${resultsDir}`);
        return null;
      }

      console.log(`[getProcessExecutionJson] Encontrados ${jsonFiles.length} archivos JSON, filtrando por processId: ${processId}`);

      // Cargar todos los archivos y filtrar por processId
      const filesWithData = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const filePath = path.join(resultsDir, file);
            const data = await fs.readFile(filePath, 'utf-8');
            const jsonData = JSON.parse(data);
            
            // Verificar si tiene metadata y si el processId coincide
            const fileProcessId = jsonData.metadata?.processId || jsonData.processId; // Soporte retrocompatibilidad
            
            // Si no tiene metadata, intentar usar el processId del archivo (para archivos antiguos)
            if (!fileProcessId) {
              console.log(`[getProcessExecutionJson] Archivo ${file} no tiene metadata.processId, saltando`);
              return null;
            }
            
            // Filtrar solo archivos que pertenezcan a este proceso
            if (fileProcessId !== processId) {
              return null;
            }
            
            const fechaEjecucion = jsonData.fechaEjecucion ? new Date(jsonData.fechaEjecucion).getTime() : 0;
            
            // Obtener fecha de modificación del archivo como fallback
            const stats = await fs.stat(filePath);
            const mtime = stats.mtime.getTime();
            
            return {
              file,
              fechaEjecucion: fechaEjecucion || mtime,
              data: jsonData
            };
          } catch (error) {
            console.error(`[getProcessExecutionJson] Error leyendo archivo ${file}:`, error);
            return null;
          }
        })
      );

      const validFiles = filesWithData.filter(f => f !== null) as Array<{
        file: string;
        fechaEjecucion: number;
        data: any;
      }>;

      if (validFiles.length === 0) {
        console.log(`[getProcessExecutionJson] No se encontraron archivos JSON válidos para processId: ${processId}`);
        return null;
      }

      // Ordenar por fecha de ejecución (más reciente primero) y retornar el primero de este proceso
      const latest = validFiles.sort((a, b) => b.fechaEjecucion - a.fechaEjecucion)[0];
      console.log(`[getProcessExecutionJson] Usando archivo más reciente para processId ${processId}: ${latest.file}`);
      return latest.data;
    } catch (error) {
      console.error('[getProcessExecutionJson] Error obteniendo JSON de ejecución:', error);
      return null;
    }
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

  /**
   * Obtiene estadísticas globales de todas las ejecuciones
   * Retorna última ejecución y tiempo promedio
   */
  async getExecutionStatistics(): Promise<{
    ultimaEjecucion: string | null;
    tiempoPromedio: number;
    totalEjecuciones: number;
  }> {
    const resultsDir = path.join(__dirname, '../../data/execution_results');
    
    try {
      // Verificar si el directorio existe
      try {
        await fs.access(resultsDir);
      } catch {
        return {
          ultimaEjecucion: null,
          tiempoPromedio: 0,
          totalEjecuciones: 0
        };
      }

      const files = await fs.readdir(resultsDir);
      const jsonFiles = files.filter(f => f.startsWith('exec_') && f.endsWith('.json'));
      
      if (jsonFiles.length === 0) {
        return {
          ultimaEjecucion: null,
          tiempoPromedio: 0,
          totalEjecuciones: 0
        };
      }

      let ultimaEjecucion: Date | null = null;
      let tiemposEjecucion: number[] = [];

      // Leer todos los archivos de ejecución
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(resultsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(data);
          
          // Extraer fecha de ejecución
          if (jsonData.fechaEjecucion) {
            const fecha = new Date(jsonData.fechaEjecucion);
            if (!ultimaEjecucion || fecha > ultimaEjecucion) {
              ultimaEjecucion = fecha;
            }
          }
          
          // Extraer tiempo total
          if (jsonData.tiempoTotal && typeof jsonData.tiempoTotal === 'number') {
            tiemposEjecucion.push(jsonData.tiempoTotal);
          }
        } catch (error) {
          console.error(`Error leyendo archivo ${file} para estadísticas:`, error);
          // Continuar con el siguiente archivo
        }
      }

      // Calcular tiempo promedio
      const tiempoPromedio = tiemposEjecucion.length > 0
        ? tiemposEjecucion.reduce((a, b) => a + b, 0) / tiemposEjecucion.length
        : 0;

      return {
        ultimaEjecucion: ultimaEjecucion ? ultimaEjecucion.toISOString() : null,
        tiempoPromedio: Math.round(tiempoPromedio),
        totalEjecuciones: jsonFiles.length
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de ejecuciones:', error);
      return {
        ultimaEjecucion: null,
        tiempoPromedio: 0,
        totalEjecuciones: 0
      };
    }
  }
}


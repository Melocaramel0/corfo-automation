import { Router, Request, Response } from 'express';
import { ProcessService } from '../services/processService';

const router = Router();
const processService = new ProcessService();

/**
 * GET /api/processes
 * Obtener lista paginada de procesos
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await processService.getProcesses({ page, limit, search });
    res.json(result);
  } catch (error) {
    console.error('Error obteniendo procesos:', error);
    res.status(500).json({ error: 'Error obteniendo procesos' });
  }
});

/**
 * GET /api/processes/:id
 * Obtener un proceso por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const process = await processService.getProcess(id);

    if (!process) {
      return res.status(404).json({ error: 'Proceso no encontrado' });
    }

    res.json(process);
  } catch (error) {
    console.error('Error obteniendo proceso:', error);
    res.status(500).json({ error: 'Error obteniendo proceso' });
  }
});

/**
 * POST /api/processes
 * Crear nuevo proceso
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const processData = req.body;
    const newProcess = await processService.createProcess(processData);
    res.status(201).json(newProcess);
  } catch (error) {
    console.error('Error creando proceso:', error);
    res.status(500).json({ error: 'Error creando proceso' });
  }
});

/**
 * PUT /api/processes/:id
 * Actualizar proceso existente
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const processData = req.body;
    const updatedProcess = await processService.updateProcess(id, processData);
    res.json(updatedProcess);
  } catch (error) {
    console.error('Error actualizando proceso:', error);
    res.status(500).json({ error: 'Error actualizando proceso' });
  }
});

/**
 * DELETE /api/processes/:id
 * Eliminar proceso (marcar como borrado)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await processService.deleteProcess(id);
    res.json({ message: 'Proceso eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando proceso:', error);
    res.status(500).json({ error: 'Error eliminando proceso' });
  }
});

/**
 * POST /api/processes/:id/execute
 * Ejecutar proceso de validación
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await processService.executeProcess(id);
    res.json(result);
  } catch (error) {
    console.error('Error ejecutando proceso:', error);
    res.status(500).json({ error: 'Error ejecutando proceso' });
  }
});

/**
 * POST /api/processes/:id/execute-monitored
 * Ejecutar proceso con monitoreo en tiempo real
 */
router.post('/:id/execute-monitored', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📨 [POST /execute-monitored] Recibida petición para proceso ID: ${id}`);
    
    const executionId = await processService.executeProcessWithMonitoring(id);
    
    console.log(`✅ [POST /execute-monitored] Respondiendo con execution ID: ${executionId}`);
    res.json({ executionId });
  } catch (error) {
    console.error('❌ [POST /execute-monitored] Error ejecutando proceso monitoreado:', error);
    const errorMessage = (error as Error).message || 'Error ejecutando proceso';
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/processes/:id/results
 * Obtener resultados de un proceso
 */
router.get('/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = await processService.getProcessResults(id);
    res.json(results);
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ error: 'Error obteniendo resultados' });
  }
});

/**
 * GET /api/processes/:id/logs
 * Obtener logs de un proceso
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await processService.getProcessLogs(id);
    res.json(logs);
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error obteniendo logs' });
  }
});

/**
 * GET /api/processes/:id/export
 * Exportar resultados de un proceso
 */
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'json';
    
    const exportData = await processService.exportResults(id, format as 'csv' | 'json');
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=resultados_${id}.csv`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=resultados_${id}.json`);
    }
    
    res.send(exportData);
  } catch (error) {
    console.error('Error exportando resultados:', error);
    res.status(500).json({ error: 'Error exportando resultados' });
  }
});

export { router as processRouter };


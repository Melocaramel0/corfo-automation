import { Router, Request, Response } from 'express';
import { ExecutionService } from '../services/executionService';

const router = Router();
const executionService = new ExecutionService();

/**
 * GET /api/executions/:id/status
 * Obtener estado de una ejecución
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    console.log(`📊 [GET /executions/${id}/status] Consultando estado...`);
    
    const status = await executionService.getExecutionStatus(id);

    if (!status) {
      console.log(`❌ [GET /executions/${id}/status] Ejecución no encontrada`);
      return res.status(404).json({ error: 'Ejecución no encontrada' });
    }

    console.log(`✅ [GET /executions/${id}/status] Estado:`, {
      isRunning: status.isRunning,
      progress: status.progress,
      currentStep: status.currentStep,
      logsCount: status.logs.length
    });
    
    res.json(status);
  } catch (error) {
    console.error(`❌ [GET /executions/${id}/status] Error:`, error);
    res.status(500).json({ error: 'Error obteniendo estado de ejecución' });
  }
});

/**
 * POST /api/executions/:id/cancel
 * Cancelar una ejecución en curso
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await executionService.cancelExecution(id);
    res.json({ message: 'Ejecución cancelada exitosamente' });
  } catch (error) {
    console.error('Error cancelando ejecución:', error);
    res.status(500).json({ error: 'Error cancelando ejecución' });
  }
});

/**
 * GET /api/executions/:id/logs
 * Obtener logs de una ejecución en tiempo real
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await executionService.getExecutionLogs(id);
    res.json(logs);
  } catch (error) {
    console.error('Error obteniendo logs de ejecución:', error);
    res.status(500).json({ error: 'Error obteniendo logs de ejecución' });
  }
});

export { router as executionRouter };


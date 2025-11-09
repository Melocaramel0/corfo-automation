import { Router, Request, Response } from 'express';
import { executionService } from '../services/executionService';
import { ProcessService } from '../services/processService';

const router = Router();
const processService = ProcessService.getInstance(); // Usar singleton

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
 * Cancelar una ejecución en curso y detener el navegador
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    console.log(`🛑 [POST /executions/${id}/cancel] Recibida solicitud de cancelación`);
    
    // Cancelar en ProcessService (esto detiene el navegador)
    await processService.cancelExecution(id);
    
    console.log(`✅ [POST /executions/${id}/cancel] Ejecución cancelada exitosamente`);
    res.json({ message: 'Ejecución cancelada exitosamente' });
  } catch (error) {
    console.error(`❌ [POST /executions/${id}/cancel] Error:`, error);
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

/**
 * GET /api/executions/active
 * Obtener todas las ejecuciones activas
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const activeExecutions = await executionService.getAllActiveExecutions();
    console.log(`📊 [GET /executions/active] ${activeExecutions.length} ejecuciones activas encontradas`);
    res.json(activeExecutions);
  } catch (error) {
    console.error('❌ [GET /executions/active] Error:', error);
    res.status(500).json({ error: 'Error obteniendo ejecuciones activas' });
  }
});

export { router as executionRouter };


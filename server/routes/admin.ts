import { Router, Request, Response } from 'express';
import { SystemLogService } from '../services/systemLogService';
import { AIConsumptionService } from '../services/aiConsumptionService';

const router = Router();
const systemLogService = SystemLogService.getInstance();
const aiConsumptionService = AIConsumptionService.getInstance();

/**
 * GET /api/admin/logs
 * Obtener logs del sistema con paginación y filtros
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    
    const filters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      user: req.query.user as string,
      action: req.query.action as string,
      contest: req.query.contest as string
    };

    const result = await systemLogService.getLogs(page, limit, search, filters);
    res.json(result);
  } catch (error: any) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error obteniendo logs', mensaje: error.message });
  }
});

/**
 * GET /api/admin/ai-consumption
 * Obtener consumo de recursos de IA
 */
router.get('/ai-consumption', async (req: Request, res: Response) => {
  try {
    const consumption = await aiConsumptionService.getConsumption();
    res.json(consumption);
  } catch (error: any) {
    console.error('Error obteniendo consumo de IA:', error);
    res.status(500).json({ error: 'Error obteniendo consumo de IA', mensaje: error.message });
  }
});

/**
 * GET /api/admin/logs/export
 * Exportar logs a CSV
 */
router.get('/logs/export', async (req: Request, res: Response) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      user: req.query.user as string,
      action: req.query.action as string,
      contest: req.query.contest as string
    };

    const csvContent = await systemLogService.exportLogs(filters);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Error exportando logs:', error);
    res.status(500).json({ error: 'Error exportando logs', mensaje: error.message });
  }
});

export { router as adminRouter };


import { Router, Request, Response } from 'express';
import { ResultsService } from '../services/resultsService';

const router = Router();
const resultsService = new ResultsService();

/**
 * GET /api/results/:processId
 * Obtener todos los resultados de un proceso
 */
router.get('/:processId', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;
    const results = await resultsService.getResults(processId);
    res.json(results);
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ error: 'Error obteniendo resultados' });
  }
});

/**
 * GET /api/results/:processId/summary
 * Obtener resumen de resultados de un proceso
 */
router.get('/:processId/summary', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;
    const summary = await resultsService.getResultsSummary(processId);
    res.json(summary);
  } catch (error) {
    console.error('Error obteniendo resumen de resultados:', error);
    res.status(500).json({ error: 'Error obteniendo resumen' });
  }
});

export { router as resultsRouter };


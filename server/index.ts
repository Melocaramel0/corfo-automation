import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processRouter } from './routes/processes';
import { resultsRouter } from './routes/results';
import { executionRouter } from './routes/executions';
import { informesRouter } from './routes/informes';
import { initStorage } from './utils/initStorage';

dotenv.config();

// Inicializar almacenamiento
initStorage().catch(console.error);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'CORFO Automation Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      processes: '/api/processes',
      executions: '/api/executions',
      results: '/api/results',
      informes: '/api/informes'
    }
  });
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'CORFO Automation Backend'
  });
});

// Routes
app.use('/api/processes', processRouter);
app.use('/api/results', resultsRouter);
app.use('/api/executions', executionRouter);
app.use('/api/informes', informesRouter);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend iniciado en http://localhost:${PORT}`);
  console.log(`📊 Health check disponible en http://localhost:${PORT}/api/health`);
});

export default app;


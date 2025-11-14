import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generarInformePDF, configurarClienteAzure } from '../reportGenerator';
import * as fs from 'fs/promises';
import type { ResultadoAgente } from '../../../automation/core/types';

// Mock de módulos externos
vi.mock('fs/promises');
vi.mock('openai', () => ({
  AzureOpenAI: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));
vi.mock('md-to-pdf', () => ({
  mdToPdf: vi.fn(),
}));
vi.mock('../../server/services/aiConsumptionService', () => ({
  AIConsumptionService: {
    getInstance: vi.fn(() => ({
      recordNLPRequest: vi.fn(),
      recordSentimentAnalysis: vi.fn(),
      recordTopicDetection: vi.fn(),
    })),
  },
}));

describe('reportGenerator', () => {
  const mockResultado: ResultadoAgente = {
    exito: true,
    mensaje: 'Ejecución completada exitosamente',
    estadisticas: {
      totalPasos: 5,
      totalCampos: 50,
      camposCompletados: 48,
      porcentajeExito: 96,
      velocidadCamposPorSegundo: 2.5,
      tiempoPromedioPorPaso: 120,
    },
    titulo: 'Formulario CORFO Test',
    tituloProyecto: 'Proyecto de Prueba',
    codigoProyecto: 'Código Proyecto: TEST-001',
    urlInicial: 'https://test.corfo.cl/formulario',
    fechaEjecucion: '2024-12-01T10:00:00Z',
    tiempoTotal: 600,
    pasosCompletados: [
      {
        numero: 1,
        titulo: 'Datos Personales',
        camposEncontrados: 10,
        camposCompletados: 10,
        tiempoTranscurrido: 120,
        exito: true,
        detalles: [
          {
            etiqueta: 'RUT',
            tipo: 'text',
            valorAsignado: '12345678-9',
            completado: true,
            esObligatorio: true,
          },
          {
            etiqueta: 'Nombre',
            tipo: 'text',
            valorAsignado: 'Juan Pérez',
            completado: true,
            esObligatorio: true,
          },
        ],
      },
    ],
    errores: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock de variables de entorno
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'test-deployment';
  });

  describe('configurarClienteAzure', () => {
    it('debe configurar cliente correctamente con variables de entorno válidas', () => {
      const cliente = configurarClienteAzure();
      
      expect(cliente).toBeDefined();
    });

    it('debe lanzar error si faltan variables de entorno', () => {
      delete process.env.AZURE_OPENAI_API_KEY;
      
      expect(() => configurarClienteAzure()).toThrow();
    });
  });

  describe('generarInformePDF', () => {
    it('debe leer el archivo JSON correctamente', async () => {
      const rutaJson = 'test/report.json';
      const rutaPdf = 'test/report.pdf';
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockResultado));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      
      const { mdToPdf } = await import('md-to-pdf');
      vi.mocked(mdToPdf).mockResolvedValue({
        filename: rutaPdf,
      } as any);

      const { AzureOpenAI } = await import('openai');
      const mockCliente = new AzureOpenAI({} as any);
      vi.mocked(mockCliente.chat.completions.create).mockResolvedValue({
        choices: [{
          message: {
            content: '# Informe de Prueba\n\nContenido del informe',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      } as any);

      await generarInformePDF(rutaJson, rutaPdf);

      expect(fs.readFile).toHaveBeenCalledWith(rutaJson, 'utf-8');
    });

    it('debe generar PDF con contenido correcto', async () => {
      const rutaJson = 'test/report.json';
      const rutaPdf = 'test/report.pdf';
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockResultado));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      
      const { mdToPdf } = await import('md-to-pdf');
      vi.mocked(mdToPdf).mockResolvedValue({
        filename: rutaPdf,
      } as any);

      const { AzureOpenAI } = await import('openai');
      const mockCliente = new AzureOpenAI({} as any);
      vi.mocked(mockCliente.chat.completions.create).mockResolvedValue({
        choices: [{
          message: {
            content: '# Informe\n\nContenido',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      } as any);

      await generarInformePDF(rutaJson, rutaPdf);

      expect(mdToPdf).toHaveBeenCalled();
      const callArgs = vi.mocked(mdToPdf).mock.calls[0];
      expect(callArgs[0].content).toContain('Informe');
    });

    it('debe manejar errores de validación con screenshot', async () => {
      const resultadoConErrores: ResultadoAgente = {
        ...mockResultado,
        erroresValidacion: {
          detectado: true,
          camposFaltantes: ['Campo 1', 'Campo 2'],
          rutaScreenshot: 'test/screenshot.png',
        },
      };

      const rutaJson = 'test/report.json';
      const rutaPdf = 'test/report.pdf';
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(resultadoConErrores));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(resultadoConErrores))
        .mockResolvedValueOnce(Buffer.from('fake-image-data'));
      
      const { mdToPdf } = await import('md-to-pdf');
      vi.mocked(mdToPdf).mockResolvedValue({
        filename: rutaPdf,
      } as any);

      const { AzureOpenAI } = await import('openai');
      const mockCliente = new AzureOpenAI({} as any);
      vi.mocked(mockCliente.chat.completions.create).mockResolvedValue({
        choices: [{
          message: {
            content: '## 5. ERRORES DE VALIDACIÓN\n\nContenido',
          },
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      } as any);

      await generarInformePDF(rutaJson, rutaPdf);

      expect(fs.readFile).toHaveBeenCalled();
    });

    it('debe lanzar error si el JSON es inválido', async () => {
      const rutaJson = 'test/report.json';
      const rutaPdf = 'test/report.pdf';
      
      vi.mocked(fs.readFile).mockResolvedValue('invalid json');

      await expect(generarInformePDF(rutaJson, rutaPdf)).rejects.toThrow();
    });

    it('debe lanzar error si la IA no genera contenido', async () => {
      const rutaJson = 'test/report.json';
      const rutaPdf = 'test/report.pdf';
      
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockResultado));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      
      const { AzureOpenAI } = await import('openai');
      const mockCliente = new AzureOpenAI({} as any);
      vi.mocked(mockCliente.chat.completions.create).mockResolvedValue({
        choices: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 0,
        },
      } as any);

      await expect(generarInformePDF(rutaJson, rutaPdf)).rejects.toThrow();
    });
  });
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FieldExtractor } from '../fieldExtractor';
import type { Page } from 'playwright';

describe('FieldExtractor', () => {
  let mockPage: any;
  let fieldExtractor: FieldExtractor;

  beforeEach(() => {
    // Mock de Page de Playwright
    mockPage = {
      $$: vi.fn(),
      evaluate: vi.fn(),
      waitForTimeout: vi.fn(),
    };

    fieldExtractor = new FieldExtractor(mockPage as unknown as Page);
  });

  describe('obtenerTodosLosCampos', () => {
    it('debe retornar array vacío si no hay campos', async () => {
      mockPage.$$.mockResolvedValue([]);

      const campos = await fieldExtractor.obtenerTodosLosCampos();

      expect(campos).toEqual([]);
      expect(mockPage.$$).toHaveBeenCalledWith(
        'input:not([type="hidden"]), select, textarea'
      );
    });

    it('debe filtrar campos no visibles', async () => {
      const mockElemento1 = {
        isVisible: vi.fn().mockResolvedValue(true),
        isEnabled: vi.fn().mockResolvedValue(true),
        evaluate: vi.fn().mockResolvedValue('text'),
      };

      const mockElemento2 = {
        isVisible: vi.fn().mockResolvedValue(false),
        isEnabled: vi.fn().mockResolvedValue(true),
        evaluate: vi.fn().mockResolvedValue('text'),
      };

      mockPage.$$.mockResolvedValue([mockElemento1, mockElemento2]);

      const campos = await fieldExtractor.obtenerTodosLosCampos();

      expect(campos).toHaveLength(1);
      expect(campos[0]).toBe(mockElemento1);
    });

    it('debe excluir botones "Subir Archivo"', async () => {
      const mockElemento = {
        isVisible: vi.fn().mockResolvedValue(true),
        isEnabled: vi.fn().mockResolvedValue(true),
        evaluate: vi.fn().mockResolvedValueOnce('text').mockResolvedValueOnce(true), // tipo y esBotonSubirArchivo
      };

      mockPage.$$.mockResolvedValue([mockElemento]);

      const campos = await fieldExtractor.obtenerTodosLosCampos();

      expect(campos).toHaveLength(0);
    });
  });

  describe('obtenerInfoCampoMejorada', () => {
    it('debe detectar campo obligatorio con atributo required', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue({
          tipo: 'text',
          etiqueta: 'Nombre',
          esObligatorio: true,
          name: 'nombre',
          id: 'nombre',
          value: '',
          className: '',
          placeholder: '',
          dataCodigo: '',
          dataOriginalTitle: '',
          title: '',
          dataControlId: '',
          dataExtensiones: '',
          dataTamanoMaximo: '',
          dataTipoControl: '',
          dataAdjuntoId: '',
          dataInputmask: '',
          opciones: [],
          esMultiple: false,
        }),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).not.toBeNull();
      expect(info?.esObligatorio).toBe(true);
    });

    it('debe detectar campo obligatorio por asterisco en etiqueta', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue({
          tipo: 'text',
          etiqueta: 'Email *',
          esObligatorio: true,
          name: 'email',
          id: 'email',
          value: '',
          className: '',
          placeholder: '',
          dataCodigo: '',
          dataOriginalTitle: '',
          title: '',
          dataControlId: '',
          dataExtensiones: '',
          dataTamanoMaximo: '',
          dataTipoControl: '',
          dataAdjuntoId: '',
          dataInputmask: '',
          opciones: [],
          esMultiple: false,
        }),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).not.toBeNull();
      expect(info?.esObligatorio).toBe(true);
    });

    it('debe detectar campo no obligatorio', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue({
          tipo: 'text',
          etiqueta: 'Observaciones',
          esObligatorio: false,
          name: 'observaciones',
          id: 'observaciones',
          value: '',
          className: '',
          placeholder: '',
          dataCodigo: '',
          dataOriginalTitle: '',
          title: '',
          dataControlId: '',
          dataExtensiones: '',
          dataTamanoMaximo: '',
          dataTipoControl: '',
          dataAdjuntoId: '',
          dataInputmask: '',
          opciones: [],
          esMultiple: false,
        }),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).not.toBeNull();
      expect(info?.esObligatorio).toBe(false);
    });

    it('debe extraer opciones de un select', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue({
          tipo: 'select',
          etiqueta: 'Región',
          esObligatorio: true,
          name: 'region',
          id: 'region',
          value: '',
          className: '',
          placeholder: '',
          dataCodigo: '',
          dataOriginalTitle: '',
          title: '',
          dataControlId: '',
          dataExtensiones: '',
          dataTamanoMaximo: '',
          dataTipoControl: '',
          dataAdjuntoId: '',
          dataInputmask: '',
          opciones: [
            { value: '1', text: 'Región Metropolitana', selected: false, disabled: false },
            { value: '2', text: 'Valparaíso', selected: false, disabled: false },
          ],
          esMultiple: false,
        }),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).not.toBeNull();
      expect(info?.tipo).toBe('select');
      expect(info?.opciones).toHaveLength(2);
      expect(info?.opciones[0].text).toBe('Región Metropolitana');
    });

    it('debe detectar campo email por contexto', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue({
          tipo: 'email',
          etiqueta: 'Correo Electrónico',
          esObligatorio: true,
          name: 'email',
          id: 'email',
          value: '',
          className: '',
          placeholder: 'correo@ejemplo.com',
          dataCodigo: '',
          dataOriginalTitle: '',
          title: '',
          dataControlId: '',
          dataExtensiones: '',
          dataTamanoMaximo: '',
          dataTipoControl: '',
          dataAdjuntoId: '',
          dataInputmask: '',
          opciones: [],
          esMultiple: false,
        }),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).not.toBeNull();
      expect(info?.tipo).toBe('email');
    });

    it('debe retornar null si el elemento no es interactuable', async () => {
      const mockElemento = {
        evaluate: vi.fn().mockResolvedValue(null),
      };

      const info = await fieldExtractor.obtenerInfoCampoMejorada(mockElemento);

      expect(info).toBeNull();
    });
  });

  describe('scrollProgresivoParaActivarContenido', () => {
    it('debe hacer scroll progresivo', async () => {
      mockPage.evaluate
        .mockResolvedValueOnce(1000) // altura inicial
        .mockResolvedValueOnce(undefined) // scrollBy
        .mockResolvedValueOnce(1000) // nueva altura
        .mockResolvedValueOnce(undefined); // scrollTo

      await fieldExtractor.scrollProgresivoParaActivarContenido();

      expect(mockPage.evaluate).toHaveBeenCalled();
      expect(mockPage.waitForTimeout).toHaveBeenCalled();
    });
  });

  describe('esperarYCapturarCamposDinamicos', () => {
    it('debe esperar y verificar campos dinámicos', async () => {
      mockPage.evaluate.mockResolvedValue(5);

      await fieldExtractor.esperarYCapturarCamposDinamicos();

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FieldCompleter } from '../fieldCompleter';
import type { Page } from 'playwright';
import type { FieldInfo } from '../fieldExtractor';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock de módulos de sistema
vi.mock('fs/promises');
vi.mock('path');

describe('FieldCompleter', () => {
  let mockPage: any;
  let fieldCompleter: FieldCompleter;
  let mockElemento: any;

  beforeEach(() => {
    mockPage = {
      evaluate: vi.fn(),
      waitForTimeout: vi.fn(),
      $: vi.fn(),
    };

    mockElemento = {
      evaluate: vi.fn(),
      fill: vi.fn(),
      click: vi.fn(),
      check: vi.fn(),
      isChecked: vi.fn(),
      selectOption: vi.fn(),
      setInputFiles: vi.fn(),
      press: vi.fn(),
      type: vi.fn(),
      getAttribute: vi.fn(),
      isVisible: vi.fn(),
    };

    fieldCompleter = new FieldCompleter(mockPage as unknown as Page);
  });

  describe('completarCampo', () => {
    it('debe omitir campos readonly', async () => {
      const info: FieldInfo = {
        tipo: 'text',
        etiqueta: 'Campo Readonly',
        esObligatorio: false,
        name: 'readonly',
        id: 'readonly',
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
      };

      mockElemento.evaluate.mockResolvedValue(false); // esEditable = false

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBeNull();
      expect(mockElemento.fill).not.toHaveBeenCalled();
    });

    it('debe completar campo de texto', async () => {
      const info: FieldInfo = {
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
      };

      mockElemento.evaluate.mockResolvedValue(true); // esEditable = true

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBeTruthy();
      expect(mockElemento.fill).toHaveBeenCalled();
    });

    it('debe completar checkbox', async () => {
      const info: FieldInfo = {
        tipo: 'checkbox',
        etiqueta: 'Acepto términos',
        esObligatorio: false,
        name: 'acepto',
        id: 'acepto',
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
      };

      mockElemento.evaluate.mockResolvedValue(true);
      mockElemento.isChecked.mockResolvedValue(false);

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBe('true');
      expect(mockElemento.check).toHaveBeenCalled();
    });

    it('debe completar select', async () => {
      const info: FieldInfo = {
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
      };

      mockElemento.evaluate.mockResolvedValue(true);

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBeTruthy();
      expect(mockElemento.selectOption).toHaveBeenCalled();
    });

    it('debe completar campo numérico con inputmask', async () => {
      const info: FieldInfo = {
        tipo: 'number',
        etiqueta: 'Monto',
        esObligatorio: true,
        name: 'monto',
        id: 'monto',
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
        dataInputmask: 'integer',
        opciones: [],
        esMultiple: false,
      };

      mockElemento.evaluate.mockResolvedValue(true);

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBeTruthy();
      expect(mockElemento.click).toHaveBeenCalled();
      expect(mockElemento.press).toHaveBeenCalledWith('Control+A');
      expect(mockElemento.type).toHaveBeenCalled();
    });

    it('debe completar campo de fecha con datepicker', async () => {
      const info: FieldInfo = {
        tipo: 'date',
        etiqueta: 'Fecha Inicio',
        esObligatorio: true,
        name: 'fecha',
        id: 'fecha',
        value: '',
        className: 'datepicker',
        placeholder: '',
        dataCodigo: '',
        dataOriginalTitle: '',
        title: '',
        dataControlId: '',
        dataExtensiones: '',
        dataTamanoMaximo: '',
        dataTipoControl: '',
        dataAdjuntoId: '',
        dataInputmask: 'dd/mm/yyyy',
        opciones: [],
        esMultiple: false,
      };

      mockElemento.evaluate.mockResolvedValue(true);

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBeTruthy();
      expect(mockElemento.click).toHaveBeenCalled();
      expect(mockElemento.type).toHaveBeenCalled();
    });

    it('debe manejar radio button con label', async () => {
      const info: FieldInfo = {
        tipo: 'radio',
        etiqueta: 'Género',
        esObligatorio: true,
        name: 'genero',
        id: 'genero_m',
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
      };

      mockElemento.evaluate
        .mockResolvedValueOnce(true) // esEditable
        .mockResolvedValueOnce(false) // tieneCondicional
        .mockResolvedValueOnce(true); // labelClickExitoso
      mockElemento.isChecked.mockResolvedValue(false).mockResolvedValue(true);
      mockElemento.getAttribute.mockResolvedValue('genero');

      const resultado = await fieldCompleter.completarCampo(mockElemento, info);

      expect(resultado).toBe('seleccionado');
    });
  });

  describe('completarSelectRobusto', () => {
    it('debe seleccionar primera opción válida cuando no hay contexto específico', async () => {
      const info: FieldInfo = {
        tipo: 'select',
        etiqueta: 'Campo Genérico',
        esObligatorio: false,
        name: 'campo',
        id: 'campo',
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
          { value: '', text: 'Seleccione...', selected: false, disabled: true },
          { value: '1', text: 'Opción 1', selected: false, disabled: false },
          { value: '2', text: 'Opción 2', selected: false, disabled: false },
        ],
        esMultiple: false,
      };

      const resultado = await fieldCompleter.completarSelectRobusto(mockElemento, info);

      expect(resultado).toBe('Opción 1');
      expect(mockElemento.selectOption).toHaveBeenCalledWith('1');
    });

    it('debe seleccionar Región Metropolitana cuando el contexto es región', async () => {
      const info: FieldInfo = {
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
      };

      const resultado = await fieldCompleter.completarSelectRobusto(mockElemento, info);

      expect(resultado).toBe('Región Metropolitana');
      expect(mockElemento.selectOption).toHaveBeenCalledWith('1');
    });

    it('debe retornar valor por defecto cuando no hay opciones', async () => {
      const info: FieldInfo = {
        tipo: 'select',
        etiqueta: 'Campo Vacío',
        esObligatorio: false,
        name: 'campo',
        id: 'campo',
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
      };

      const resultado = await fieldCompleter.completarSelectRobusto(mockElemento, info);

      expect(resultado).toBeTruthy();
    });
  });

  describe('subirArchivoPrueba', () => {
    beforeEach(() => {
      // Mock de path
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
      vi.mocked(path.basename).mockImplementation((p) => p.split('/').pop() || '');
    });

    it('debe retornar null si no hay botón de subir archivo', async () => {
      const info: FieldInfo = {
        tipo: 'file',
        etiqueta: 'Archivo',
        esObligatorio: true,
        name: 'archivo',
        id: 'archivo',
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
      };

      mockElemento.evaluate.mockResolvedValue(true);
      mockElemento.evaluate.mockResolvedValueOnce(true).mockResolvedValueOnce(false); // yaTieneArchivo, tieneBotonSubirArchivo

      const resultado = await fieldCompleter.subirArchivoPrueba(mockElemento, info);

      expect(resultado).toBe('sin_boton_subir_archivo');
    });

    it('debe subir archivo si existe y hay botón', async () => {
      const info: FieldInfo = {
        tipo: 'file',
        etiqueta: 'Documento',
        esObligatorio: true,
        name: 'documento',
        id: 'documento',
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
      };

      mockElemento.evaluate
        .mockResolvedValueOnce(false) // yaTieneArchivo
        .mockResolvedValueOnce(true); // tieneBotonSubirArchivo
      mockElemento.evaluate.mockResolvedValueOnce(false); // verificarArchivoYaSubido

      // Mock de fs.access para simular archivo encontrado
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const resultado = await fieldCompleter.subirArchivoPrueba(mockElemento, info);

      expect(resultado).toContain('archivo_subido');
      expect(mockElemento.setInputFiles).toHaveBeenCalled();
    });
  });
});


/**
 * Helpers para tests de campos
 */

import { vi } from 'vitest';
import type { FieldInfo } from '../fieldExtractor';

/**
 * Crea un FieldInfo mock básico para tests
 */
export function crearFieldInfoMock(overrides: Partial<FieldInfo> = {}): FieldInfo {
  return {
    tipo: 'text',
    etiqueta: 'Campo de Prueba',
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
    ...overrides,
  };
}

/**
 * Crea un mock de elemento de Playwright básico
 */
export function crearMockElemento() {
  return {
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
    isEnabled: vi.fn(),
  };
}


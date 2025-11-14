# Guía de Testing

Este proyecto utiliza **Vitest** como framework de testing para pruebas unitarias.

## Instalación

Primero, instala las dependencias de desarrollo:

```bash
npm install
```

## Estructura de Tests

Los tests están organizados en carpetas `__tests__` junto a los módulos que prueban:

```
backend/
├── src/
│   ├── automation/
│   │   └── fields/
│   │       ├── __tests__/
│   │       │   ├── fieldExtractor.test.ts
│   │       │   ├── fieldCompleter.test.ts
│   │       │   └── helpers.ts
│   │       ├── fieldExtractor.ts
│   │       └── fieldCompleter.ts
│   └── services/
│       └── report/
│           ├── __tests__/
│           │   └── reportGenerator.test.ts
│           └── reportGenerator.ts
└── vitest.config.ts
```

## Scripts Disponibles

### Ejecutar todos los tests
```bash
npm run test
```

### Ejecutar tests una vez (sin watch mode)
```bash
npm run test:run
```

### Ejecutar tests en modo watch (re-ejecuta al cambiar archivos)
```bash
npm run test:watch
```

### Ejecutar tests con cobertura
```bash
npm run test:coverage
```

### Ejecutar tests específicos por módulo
```bash
# Tests de FieldExtractor
npm run test:fieldExtractor

# Tests de FieldCompleter
npm run test:fieldCompleter

# Tests de ReportGenerator
npm run test:reportGenerator
```

## Módulos con Tests

### 1. FieldExtractor (`fieldExtractor.test.ts`)

Prueba la extracción de información de campos del formulario:

- ✅ Detección de campos visibles e interactuables
- ✅ Filtrado de campos ocultos o deshabilitados
- ✅ Exclusión de botones "Subir Archivo"
- ✅ Detección de campos obligatorios (required, aria-required, asterisco, etc.)
- ✅ Extracción de opciones de selects
- ✅ Detección de tipos de campo (email, number, date)
- ✅ Scroll progresivo para activar contenido dinámico

**Ejemplo de uso:**
```typescript
const extractor = new FieldExtractor(mockPage);
const campos = await extractor.obtenerTodosLosCampos();
const info = await extractor.obtenerInfoCampoMejorada(elemento);
```

### 2. FieldCompleter (`fieldCompleter.test.ts`)

Prueba el completado de campos en el formulario:

- ✅ Omitir campos readonly/disabled
- ✅ Completar campos de texto
- ✅ Completar checkboxes
- ✅ Completar selects con selección inteligente
- ✅ Completar campos numéricos con inputmask
- ✅ Completar campos de fecha con datepicker
- ✅ Manejo de radio buttons con labels
- ✅ Subida de archivos (con verificación de botones)

**Ejemplo de uso:**
```typescript
const completer = new FieldCompleter(mockPage);
const resultado = await completer.completarCampo(elemento, fieldInfo);
```

### 3. ReportGenerator (`reportGenerator.test.ts`)

Prueba la generación de informes PDF:

- ✅ Configuración de cliente Azure OpenAI
- ✅ Lectura y parsing de archivos JSON
- ✅ Generación de contexto del reporte
- ✅ Llamadas a API de Azure OpenAI
- ✅ Conversión de Markdown a PDF
- ✅ Manejo de errores de validación con screenshots
- ✅ Manejo de errores (JSON inválido, IA sin respuesta, etc.)

**Ejemplo de uso:**
```typescript
await generarInformePDF('ruta/report.json', 'ruta/report.pdf');
```

## Estrategias de Mocking

### Mocking de Playwright Page

Los tests mockean la instancia de `Page` de Playwright para evitar necesidad de un navegador real:

```typescript
const mockPage = {
  $$: vi.fn(),
  evaluate: vi.fn(),
  waitForTimeout: vi.fn(),
  $: vi.fn(),
};
```

### Mocking de Módulos del Sistema

Para `reportGenerator`, se mockean módulos como `fs/promises` y `openai`:

```typescript
vi.mock('fs/promises');
vi.mock('openai');
```

## Cobertura de Tests

Para ver la cobertura de código:

```bash
npm run test:coverage
```

Esto generará un reporte HTML en `coverage/` con detalles de qué líneas están cubiertas por tests.

## Mejores Prácticas

1. **Aislamiento**: Cada test debe ser independiente y no depender de otros tests
2. **Mocking**: Mockea dependencias externas (Playwright, APIs, sistema de archivos)
3. **Nombres descriptivos**: Usa nombres claros que describan qué se está probando
4. **Arrange-Act-Assert**: Estructura tus tests en estas tres fases
5. **Casos edge**: Prueba casos límite y errores, no solo el happy path

## Ejecutar Tests en CI/CD

Para ejecutar tests en pipelines de CI/CD:

```bash
npm run test:run
```

Este comando ejecuta los tests una vez y termina (sin modo watch), ideal para CI/CD.

## Troubleshooting

### Error: "Cannot find module 'vitest'"
```bash
npm install
```

### Error: "Module not found" en imports
Verifica que los paths en `vitest.config.ts` coincidan con tu estructura de carpetas.

### Tests fallan por timeouts
Aumenta el timeout en `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000, // 10 segundos
}
```

## Próximos Pasos

- [ ] Agregar tests de integración para flujos completos
- [ ] Agregar tests E2E con Playwright real
- [ ] Aumentar cobertura de código al 80%+
- [ ] Agregar tests de performance


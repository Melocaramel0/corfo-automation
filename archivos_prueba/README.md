# Archivos de Prueba para CORFO

Este directorio contiene archivos de prueba que se utilizan para completar automáticamente los campos de subida de archivos en los formularios CORFO.

## Archivos Disponibles

- `documento_prueba.pdf` - Archivo PDF de prueba para documentos generales (604B)
- `documento_word.docx` - Archivo Word de prueba para documentos de texto (2.0B)
- `planilla_excel.xlsx` - Archivo Excel de prueba para hojas de cálculo (2.0B)

## Funcionalidad Implementada

### Detección Inteligente de Campos de Archivo

El sistema detecta automáticamente campos de archivo con las siguientes características:

1. **Inputs de tipo file** - Incluso si están ocultos visualmente
2. **Verificación de botón "Subir Archivo"** - Solo procesa campos que tienen un botón visible asociado
3. **Atributos específicos de CORFO**:
   - `data-codigo` - Código identificador del campo
   - `data-extensiones` - Extensiones permitidas
   - `data-tamano-maximo` - Tamaño máximo en KB
   - `data-tipo-control` - Tipo de control
   - `data-adjuntoid` - ID del adjunto

### Lógica de Subida Robusta

#### 1. Verificación de Botón "Subir Archivo"
- El sistema busca un botón visible con texto "Subir Archivo" en el contenedor del campo
- Solo procesa campos que tienen este botón visible
- Evita procesar campos que no son realmente para subir archivos

#### 2. Prevención de Duplicados
- **Sesión actual**: Rastrea archivos ya subidos en la sesión actual
- **Verificación en página**: Busca texto "Archivo adjunto: documento_prueba.pdf" o "fecha subida:"
- **Identificador único**: Usa `data-codigo`, `name` o `id` para identificar campos únicos

#### 3. Selección de Archivo
- **Prioridad PDF**: Busca `documento_prueba.pdf` como primera opción
- **Archivos alternativos**: `archivo_prueba.pdf`, `test.pdf`, `prueba.pdf`
- **Fallback**: Si no encuentra PDF, no sube archivo

### Flujo de Procesamiento

```
1. Detectar campo input[type="file"]
2. Verificar botón "Subir Archivo" visible en contenedor
3. Verificar si ya se subió archivo en esta sesión
4. Verificar si ya hay archivo subido en la página
5. Buscar archivo PDF disponible
6. Subir archivo con setInputFiles()
7. Marcar como subido en sesión
8. Retornar resultado
```

### Estados de Resultado

- `archivo_subido: documento_prueba.pdf` - Subida exitosa
- `sin_boton_subir_archivo` - Campo sin botón visible (excluido del reporte)
- `archivo_ya_subido_en_sesion` - Ya subido en esta sesión
- `archivo_ya_subido` - Ya subido previamente
- `archivo_no_encontrado` - No se encontró archivo PDF
- `error_subida_archivo` - Error durante la subida

## Uso

La funcionalidad se ejecuta automáticamente cuando el MVP híbrido detecta campos de archivo en los formularios CORFO. No requiere configuración adicional.

### Requisitos

1. **Archivo PDF disponible**: Debe existir `documento_prueba.pdf` en este directorio
2. **Botón visible**: El campo debe tener un botón "Subir Archivo" visible
3. **Campo único**: Cada campo se identifica por `data-codigo`, `name` o `id`

## Logs Simplificados

El sistema proporciona logs esenciales durante el proceso:

```
🔍 Procesando campo: "Campo de Archivo" (tipo: file)
✅ Archivo PDF subido: documento_prueba.pdf
✅ Campo procesado: file - "Campo de Archivo" - Valor: "archivo_subido: documento_prueba.pdf"
```

### Logs Eliminados (para reducir ruido)

- ❌ Logs de detección de campos de archivo
- ❌ Logs de verificación de botón "Subir Archivo"
- ❌ Logs de verificación de archivo ya subido
- ❌ Logs de errores de subida
- ❌ Logs de campos excluidos del reporte

## Compatibilidad

Esta funcionalidad es compatible con todos los formularios CORFO que utilicen:

- Estructura estándar de campos de archivo con atributos `data-*`
- Botones "Subir Archivo" visibles
- Inputs de tipo `file` (incluso ocultos)
- Sistema de verificación de archivos subidos

## Características Técnicas

- **Detección dinámica**: No requiere configuración previa
- **Prevención de duplicados**: Múltiples capas de verificación
- **Logs limpios**: Solo información esencial
- **Manejo de errores**: Graceful degradation
- **Identificación única**: Evita procesar el mismo campo múltiples veces
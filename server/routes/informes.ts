import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';
import { executionService } from '../services/executionService';
import { ProcessService } from '../services/processService';

const router = Router();
const processService = ProcessService.getInstance();

/**
 * GET /api/informes/descargar/:nombreArchivo
 * Descarga un archivo PDF de informe
 * 
 * @param nombreArchivo - Nombre del archivo PDF (ej: report_6.pdf, exec_1.pdf)
 * 
 * Ejemplo de uso desde el frontend:
 * fetch('/api/informes/descargar/report_6.pdf')
 */
router.get('/descargar/:nombreArchivo', async (req: Request, res: Response) => {
  try {
    const { nombreArchivo } = req.params;

    // Validar que el nombre del archivo tenga extensión .pdf
    if (!nombreArchivo.endsWith('.pdf')) {
      return res.status(400).json({
        error: 'Formato de archivo inválido',
        mensaje: 'El archivo debe tener extensión .pdf',
      });
    }

    // Validar que el nombre del archivo siga el patrón esperado (report_X.pdf o exec_X.pdf)
    const patronValido = /^(report|exec)_\d+\.pdf$/;
    if (!patronValido.test(nombreArchivo)) {
      return res.status(400).json({
        error: 'Nombre de archivo inválido',
        mensaje: 'El archivo debe seguir el formato report_X.pdf o exec_X.pdf',
      });
    }

    // Construir ruta al archivo
    const informesDir = path.join(__dirname, '../../data/informes');
    const filePath = path.join(informesDir, nombreArchivo);

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'Archivo no encontrado',
        mensaje: `El archivo ${nombreArchivo} no existe o aún no ha sido generado`,
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Enviar archivo
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error enviando archivo ${nombreArchivo}:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error al enviar el archivo',
            mensaje: 'Ocurrió un error al intentar descargar el archivo',
          });
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error en endpoint de descarga de informes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message || 'No se pudo procesar la solicitud',
    });
  }
});

/**
 * GET /api/informes/listar
 * Lista todos los informes PDF disponibles
 * 
 * Devuelve un array con los nombres de archivos y metadata básica
 */
router.get('/listar', async (req: Request, res: Response) => {
  try {
    const informesDir = path.join(__dirname, '../../data/informes');

    // Verificar que el directorio existe
    try {
      await fs.access(informesDir);
    } catch {
      // Si el directorio no existe, retornar array vacío
      return res.json([]);
    }

    // Leer archivos del directorio
    const archivos = await fs.readdir(informesDir);

    // Filtrar solo archivos PDF y obtener metadata
    const informes = await Promise.all(
      archivos
        .filter((archivo) => archivo.endsWith('.pdf'))
        .map(async (archivo) => {
          const filePath = path.join(informesDir, archivo);
          const stats = await fs.stat(filePath);

          return {
            nombre: archivo,
            tamano: stats.size,
            fechaCreacion: stats.birthtime,
            fechaModificacion: stats.mtime,
          };
        })
    );

    // Ordenar por fecha de creación (más reciente primero)
    informes.sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());

    res.json(informes);
  } catch (error: any) {
    console.error('❌ Error listando informes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message || 'No se pudo listar los informes',
    });
  }
});

/**
 * Función helper para encontrar el PDF relacionado con un processId
 * Estrategia multi-nivel:
 * 1. Intentar usar executions.json para relación directa processId -> executionId -> PDF
 * 2. Si no está, buscar por relación temporal (fecha de creación del proceso vs fecha de ejecución)
 * 3. Si solo hay un PDF, retornarlo como fallback
 */
async function encontrarPdfPorProcessId(processId: string): Promise<string | null> {
  try {
    // 1. Obtener el proceso
    const proceso = await processService.getProcess(processId);
    if (!proceso) {
      return null;
    }

    // 2. Intentar buscar ejecuciones relacionadas desde ExecutionService
    try {
      const ejecuciones = await executionService.getExecutionsByProcess(processId);
      
      if (ejecuciones.length > 0) {
        // Ordenar por fecha de finalización (más reciente primero)
        const ejecucionesCompletadas = ejecuciones
          .filter(exec => exec.endTime && !exec.isRunning)
          .sort((a, b) => {
            const timeA = a.endTime?.getTime() || 0;
            const timeB = b.endTime?.getTime() || 0;
            return timeB - timeA;
          });

        if (ejecucionesCompletadas.length > 0) {
          // Usar la ejecución más reciente y buscar PDF por fecha temporal
          const ejecucionMasReciente = ejecucionesCompletadas[0];
          const endTime = ejecucionMasReciente.endTime!.getTime();
          
          const pdfEncontrado = await buscarPdfPorFecha(endTime);
          if (pdfEncontrado) {
            return pdfEncontrado;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error buscando ejecuciones:', error);
      // Continuar con otros métodos
    }

    // 3. Estrategia alternativa: Buscar por relación temporal usando fecha de creación del proceso
    // La fecha de creación es más confiable porque es cuando se creó el proceso antes de ejecutarse
    if (proceso.fechaCreacion) {
      const fechaCreacionTime = new Date(proceso.fechaCreacion).getTime();
      const pdfEncontrado = await buscarPdfPorFecha(fechaCreacionTime);
      if (pdfEncontrado) {
        console.log(`✅ PDF encontrado por fecha de creación para proceso ${processId}: ${pdfEncontrado}`);
        return pdfEncontrado;
      }
    }

    // También intentar con fechaModificacion (puede ser cuando se actualizó el estado a "Ejecutado")
    if (proceso.fechaModificacion && proceso.fechaModificacion !== proceso.fechaCreacion) {
      const fechaModificacionTime = new Date(proceso.fechaModificacion).getTime();
      const pdfEncontrado = await buscarPdfPorFecha(fechaModificacionTime);
      if (pdfEncontrado) {
        console.log(`✅ PDF encontrado por fecha de modificación para proceso ${processId}: ${pdfEncontrado}`);
        return pdfEncontrado;
      }
    }

    // 4. Fallback: Retornar el PDF más reciente si el proceso está "Ejecutado"
    if (proceso.estado === 'Ejecutado') {
      const informesDir = path.join(__dirname, '../../data/informes');
      try {
        await fs.access(informesDir);
        const archivos = await fs.readdir(informesDir);
        const pdfsExec = archivos.filter(archivo => /^exec_\d+\.pdf$/.test(archivo));
        
        if (pdfsExec.length > 0) {
          // Obtener el PDF más reciente
          const pdfsConFecha = await Promise.all(
            pdfsExec.map(async (nombreArchivo) => {
              const filePath = path.join(informesDir, nombreArchivo);
              const stats = await fs.stat(filePath);
              return {
                nombreArchivo,
                fechaModificacion: stats.mtime.getTime()
              };
            })
          );
          
          pdfsConFecha.sort((a, b) => b.fechaModificacion - a.fechaModificacion);
          const pdfMasReciente = pdfsConFecha[0].nombreArchivo;
          console.log(`⚠️ No se encontró relación exacta, retornando PDF más reciente: ${pdfMasReciente}`);
          return pdfMasReciente;
        }
      } catch {
        // Directorio no existe
      }
    }

    return null; // No se encontró coincidencia
  } catch (error) {
    console.error(`❌ Error buscando PDF para processId ${processId}:`, error);
    return null;
  }
}

/**
 * Busca un PDF cuya fecha de modificación esté cerca de una fecha de referencia
 */
async function buscarPdfPorFecha(fechaReferencia: number): Promise<string | null> {
  try {
    const informesDir = path.join(__dirname, '../../data/informes');
    
    try {
      await fs.access(informesDir);
    } catch {
      return null;
    }

    const archivos = await fs.readdir(informesDir);
    const pdfsExec = archivos.filter(archivo => /^exec_\d+\.pdf$/.test(archivo));

    if (pdfsExec.length === 0) {
      return null;
    }

    // Obtener fechas de modificación de cada PDF
    const pdfsConFecha = await Promise.all(
      pdfsExec.map(async (nombreArchivo) => {
        const filePath = path.join(informesDir, nombreArchivo);
        const stats = await fs.stat(filePath);
        const fechaModificacion = stats.mtime.getTime();
        const diferenciaTemporal = Math.abs(fechaModificacion - fechaReferencia);
        
        return {
          nombreArchivo,
          fechaModificacion,
          diferenciaTemporal
        };
      })
    );

    // Ordenar por diferencia temporal (más cercano primero)
    pdfsConFecha.sort((a, b) => a.diferenciaTemporal - b.diferenciaTemporal);
    
    // Usar el PDF más cercano si está dentro de 30 minutos (1800000 ms)
    const mejorMatch = pdfsConFecha[0];
    const margenTolerancia = 30 * 60 * 1000; // 30 minutos
    
    if (mejorMatch.diferenciaTemporal <= margenTolerancia) {
      return mejorMatch.nombreArchivo;
    }

    return null;
  } catch (error) {
    console.warn('⚠️ Error buscando PDF por fecha:', error);
    return null;
  }
}

/**
 * GET /api/informes/proceso/:processId
 * Obtiene información del PDF asociado a un proceso
 * 
 * @param processId - ID del proceso
 * 
 * Retorna el nombre del archivo PDF o error 404 si no se encuentra
 */
router.get('/proceso/:processId', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;
    
    const nombrePdf = await encontrarPdfPorProcessId(processId);
    
    if (!nombrePdf) {
      return res.status(404).json({
        error: 'PDF no encontrado',
        mensaje: `No se encontró un PDF generado para el proceso ${processId}. Asegúrate de que el proceso haya sido ejecutado y completado exitosamente.`,
      });
    }

    res.json({
      processId,
      nombreArchivo: nombrePdf,
      mensaje: 'PDF encontrado exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error en endpoint de consulta de PDF por proceso:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message || 'No se pudo procesar la solicitud',
    });
  }
});

/**
 * GET /api/informes/proceso/:processId/descargar
 * Descarga el PDF asociado a un proceso con nombre personalizado
 * 
 * @param processId - ID del proceso
 * 
 * Descarga el archivo PDF con nombre personalizado: {nombreConcurso}_informe.pdf
 */
router.get('/proceso/:processId/descargar', async (req: Request, res: Response) => {
  try {
    const { processId } = req.params;
    
    // Obtener información del proceso para el nombre del archivo
    const proceso = await processService.getProcess(processId);
    if (!proceso) {
      return res.status(404).json({
        error: 'Proceso no encontrado',
        mensaje: `El proceso ${processId} no existe`,
      });
    }

    // Encontrar el PDF relacionado
    const nombrePdf = await encontrarPdfPorProcessId(processId);
    
    if (!nombrePdf) {
      return res.status(404).json({
        error: 'PDF no encontrado',
        mensaje: `No se encontró un PDF generado para el proceso ${processId}. Asegúrate de que el proceso haya sido ejecutado y completado exitosamente.`,
      });
    }

    // Construir ruta al archivo PDF
    const informesDir = path.join(__dirname, '../../data/informes');
    const filePath = path.join(informesDir, nombrePdf);

    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'Archivo no encontrado',
        mensaje: `El archivo PDF ${nombrePdf} no existe en el servidor`,
      });
    }

    // Generar nombre personalizado para la descarga
    const nombreConcursoLimpio = proceso.nombreConcurso
      .replace(/[^a-zA-Z0-9\s]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .substring(0, 50); // Limitar longitud
    
    const nombreDescarga = `${nombreConcursoLimpio}_informe.pdf`;

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreDescarga}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Enviar archivo
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error enviando archivo PDF para proceso ${processId}:`, err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error al enviar el archivo',
            mensaje: 'Ocurrió un error al intentar descargar el archivo PDF',
          });
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Error en endpoint de descarga de PDF por proceso:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      mensaje: error.message || 'No se pudo procesar la solicitud',
    });
  }
});

export { router as informesRouter };


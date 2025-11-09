import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SystemLogService } from '../services/systemLogService';

const router = Router();

const RUTA_CAMPOS_FUNDAMENTALES = path.join(__dirname, '../../../campos_fundamentales.json');

/**
 * GET /api/campos-fundamentales
 * Obtiene todos los campos fundamentales
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const contenido = await fs.readFile(RUTA_CAMPOS_FUNDAMENTALES, 'utf-8');
    const camposFundamentales = JSON.parse(contenido);
    res.json(camposFundamentales);
  } catch (error: any) {
    console.error('Error leyendo campos fundamentales:', error);
    res.status(500).json({ error: 'Error al leer campos fundamentales', mensaje: error.message });
  }
});

/**
 * GET /api/campos-fundamentales/:categoria/:nombre
 * Obtiene un campo específico
 */
router.get('/:categoria/:nombre', async (req: Request, res: Response) => {
  try {
    const { categoria, nombre } = req.params;
    const contenido = await fs.readFile(RUTA_CAMPOS_FUNDAMENTALES, 'utf-8');
    const camposFundamentales: any = JSON.parse(contenido);

    const campo = camposFundamentales.categorias[categoria]?.campos[nombre];
    if (!campo) {
      return res.status(404).json({ error: 'Campo no encontrado' });
    }

    res.json(campo);
  } catch (error: any) {
    console.error('Error leyendo campo:', error);
    res.status(500).json({ error: 'Error al leer campo', mensaje: error.message });
  }
});

/**
 * PUT /api/campos-fundamentales/:categoria/:nombre
 * Actualiza un campo existente
 */
router.put('/:categoria/:nombre', async (req: Request, res: Response) => {
  try {
    const { categoria, nombre } = req.params;
    const campoActualizado = req.body;

    const contenido = await fs.readFile(RUTA_CAMPOS_FUNDAMENTALES, 'utf-8');
    const camposFundamentales: any = JSON.parse(contenido);

    if (!camposFundamentales.categorias[categoria]) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    if (!camposFundamentales.categorias[categoria].campos[nombre]) {
      return res.status(404).json({ error: 'Campo no encontrado' });
    }

    // Actualizar campo
    camposFundamentales.categorias[categoria].campos[nombre] = {
      ...camposFundamentales.categorias[categoria].campos[nombre],
      ...campoActualizado,
    };

    // Actualizar metadatos
    camposFundamentales.metadatos.ultimaModificacion = new Date().toISOString();
    camposFundamentales.metadatos.usuario = req.body.usuario || 'Sistema';

    // Recalcular total
    let total = 0;
    Object.values(camposFundamentales.categorias).forEach((cat: any) => {
      if (cat.activo) {
        Object.values(cat.campos).forEach((campo: any) => {
          if (campo.activo && campo.esFundamental) {
            total++;
          }
        });
      }
    });
    camposFundamentales.metadatos.totalCamposFundamentales = total;

    // Guardar
    await fs.writeFile(RUTA_CAMPOS_FUNDAMENTALES, JSON.stringify(camposFundamentales, null, 2), 'utf-8');

    // Registrar log
    const systemLogService = SystemLogService.getInstance();
    await systemLogService.logAction(
      'Edición de Campo Fundamental',
      `Campo '${nombre}' actualizado en categoría '${categoria}'`,
      campoActualizado.usuario || 'Sistema',
      '-',
      req.ip || 'localhost'
    );

    res.json(camposFundamentales.categorias[categoria].campos[nombre]);
  } catch (error: any) {
    console.error('Error actualizando campo:', error);
    res.status(500).json({ error: 'Error al actualizar campo', mensaje: error.message });
  }
});

/**
 * POST /api/campos-fundamentales/:categoria
 * Crea un nuevo campo en una categoría
 */
router.post('/:categoria', async (req: Request, res: Response) => {
  try {
    const { categoria } = req.params;
    const nuevoCampo = req.body;

    if (!nuevoCampo.nombre) {
      return res.status(400).json({ error: 'El nombre del campo es requerido' });
    }

    const contenido = await fs.readFile(RUTA_CAMPOS_FUNDAMENTALES, 'utf-8');
    const camposFundamentales: any = JSON.parse(contenido);

    if (!camposFundamentales.categorias[categoria]) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const nombreCampo = nuevoCampo.nombre;

    // Verificar si ya existe
    if (camposFundamentales.categorias[categoria].campos[nombreCampo]) {
      return res.status(409).json({ error: 'El campo ya existe' });
    }

    // Crear campo
    camposFundamentales.categorias[categoria].campos[nombreCampo] = {
      valor: nuevoCampo.valor || '',
      tipo: nuevoCampo.tipo || 'text',
      obligatorio: nuevoCampo.obligatorio ?? false,
      descripcion: nuevoCampo.descripcion || nombreCampo,
      activo: nuevoCampo.activo ?? true,
      esFundamental: nuevoCampo.esFundamental ?? true,
      numeroReferencia: nuevoCampo.numeroReferencia,
      etiquetasReales: nuevoCampo.etiquetasReales || [],
    };

    // Actualizar metadatos
    camposFundamentales.metadatos.ultimaModificacion = new Date().toISOString();
    camposFundamentales.metadatos.usuario = nuevoCampo.usuario || 'Sistema';

    // Recalcular total
    let total = 0;
    Object.values(camposFundamentales.categorias).forEach((cat: any) => {
      if (cat.activo) {
        Object.values(cat.campos).forEach((campo: any) => {
          if (campo.activo && campo.esFundamental) {
            total++;
          }
        });
      }
    });
    camposFundamentales.metadatos.totalCamposFundamentales = total;

    // Guardar
    await fs.writeFile(RUTA_CAMPOS_FUNDAMENTALES, JSON.stringify(camposFundamentales, null, 2), 'utf-8');

    // Registrar log
    const systemLogService = SystemLogService.getInstance();
    await systemLogService.logAction(
      'Creación de Campo Fundamental',
      `Campo '${nombreCampo}' creado en categoría '${categoria}'`,
      nuevoCampo.usuario || 'Sistema',
      '-',
      req.ip || 'localhost'
    );

    res.status(201).json(camposFundamentales.categorias[categoria].campos[nombreCampo]);
  } catch (error: any) {
    console.error('Error creando campo:', error);
    res.status(500).json({ error: 'Error al crear campo', mensaje: error.message });
  }
});

/**
 * DELETE /api/campos-fundamentales/:categoria/:nombre
 * Elimina un campo (lo marca como inactivo por defecto, o elimina permanentemente si ?permanente=true)
 */
router.delete('/:categoria/:nombre', async (req: Request, res: Response) => {
  try {
    const { categoria, nombre } = req.params;
    const permanente = req.query.permanente === 'true';

    const contenido = await fs.readFile(RUTA_CAMPOS_FUNDAMENTALES, 'utf-8');
    const camposFundamentales: any = JSON.parse(contenido);

    if (!camposFundamentales.categorias[categoria]?.campos[nombre]) {
      return res.status(404).json({ error: 'Campo no encontrado' });
    }

    if (permanente) {
      // Eliminación física (hard delete)
      delete camposFundamentales.categorias[categoria].campos[nombre];
    } else {
      // Marcar como inactivo (soft delete)
      camposFundamentales.categorias[categoria].campos[nombre].activo = false;
    }

    // Actualizar metadatos
    camposFundamentales.metadatos.ultimaModificacion = new Date().toISOString();
    camposFundamentales.metadatos.usuario = req.body.usuario || 'Sistema';

    // Recalcular total
    let total = 0;
    Object.values(camposFundamentales.categorias).forEach((cat: any) => {
      if (cat.activo) {
        Object.values(cat.campos).forEach((campo: any) => {
          if (campo.activo && campo.esFundamental) {
            total++;
          }
        });
      }
    });
    camposFundamentales.metadatos.totalCamposFundamentales = total;

    // Guardar
      await fs.writeFile(RUTA_CAMPOS_FUNDAMENTALES, JSON.stringify(camposFundamentales, null, 2), 'utf-8');

      // Registrar log
      const systemLogService = SystemLogService.getInstance();
      await systemLogService.logAction(
        permanente ? 'Eliminación de Campo Fundamental' : 'Desactivación de Campo Fundamental',
        `Campo '${nombre}' ${permanente ? 'eliminado permanentemente' : 'marcado como inactivo'} en categoría '${categoria}'`,
        'Sistema',
        '-',
        req.ip || 'localhost'
      );

      if (permanente) {
        res.json({ mensaje: 'Campo eliminado permanentemente' });
      } else {
        res.json({ mensaje: 'Campo marcado como inactivo', campo: camposFundamentales.categorias[categoria].campos[nombre] });
      }
  } catch (error: any) {
    console.error('Error eliminando campo:', error);
    res.status(500).json({ error: 'Error al eliminar campo', mensaje: error.message });
  }
});

/**
 * POST /api/campos-fundamentales/actualizar-desde-ejecucion
 * Actualiza campos fundamentales desde una ejecución usando IA
 */
router.post('/actualizar-desde-ejecucion', async (req: Request, res: Response) => {
  try {
    const { rutaEjecucion } = req.body;

    if (!rutaEjecucion) {
      return res.status(400).json({ error: 'La ruta de ejecución es requerida' });
    }

    // TODO: Implementar funcionalidad para actualizar desde ejecución
    // Esta funcionalidad requiere ejecutar el script de actualización directamente
    // o crear funciones reutilizables del script que puedan ser llamadas desde aquí
    res.status(501).json({ 
      error: 'Funcionalidad en desarrollo',
      mensaje: 'Esta funcionalidad requiere ejecutar el script de actualización directamente'
    });
  } catch (error: any) {
    console.error('Error actualizando desde ejecución:', error);
    res.status(500).json({ error: 'Error al actualizar desde ejecución', mensaje: error.message });
  }
});

export { router as camposFundamentalesRouter };


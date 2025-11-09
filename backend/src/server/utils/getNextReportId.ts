import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Obtiene el siguiente ID incremental para un reporte
 * basándose en los archivos existentes en la carpeta especificada
 * 
 * @param directory - Ruta de la carpeta donde se guardan los reportes
 * @param prefix - Prefijo del nombre del archivo (ej: 'exec_', 'report_')
 * @returns El siguiente ID disponible (empieza en 1 si la carpeta está vacía)
 * 
 * @example
 * // Si existen exec_1.json, exec_2.json, exec_3.json
 * await getNextReportId('/path/to/execution_results', 'exec_') // retorna 4
 * 
 * // Si la carpeta está vacía o no existe
 * await getNextReportId('/path/to/data', 'report_') // retorna 1
 */
export async function getNextReportId(
  directory: string,
  prefix: string = 'report_'
): Promise<number> {
  try {
    // Verificar si el directorio existe
    await fs.access(directory);
    
    // Leer todos los archivos en el directorio
    const files = await fs.readdir(directory);
    
    // Filtrar archivos que coincidan con el patrón {prefix}{numero}.json
    const pattern = new RegExp(`^${escapeRegex(prefix)}(\\d+)\\.json$`);
    const ids: number[] = [];
    
    for (const file of files) {
      const match = file.match(pattern);
      if (match) {
        const id = parseInt(match[1], 10);
        if (!isNaN(id)) {
          ids.push(id);
        }
      }
    }
    
    // Si no hay archivos, retornar 1
    if (ids.length === 0) {
      return 1;
    }
    
    // Retornar el ID más alto + 1
    const maxId = Math.max(...ids);
    return maxId + 1;
    
  } catch (error: any) {
    // Si el directorio no existe o hay error al leer, retornar 1
    if (error.code === 'ENOENT') {
      return 1;
    }
    
    // Para otros errores, loguear y retornar 1 como fallback
    console.warn(`⚠️ Error al obtener siguiente ID de reporte: ${error.message}`);
    return 1;
  }
}

/**
 * Escapa caracteres especiales de regex en una cadena
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


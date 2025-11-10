import * as path from 'path';

/**
 * Obtiene la ruta a la carpeta data en la raíz del proyecto
 * Funciona tanto en desarrollo (src/) como en producción (dist/)
 */
export function getDataPath(): string {
  // __dirname apunta a la ubicación del archivo compilado o fuente
  // Desde backend/dist/src/server/utils/ o backend/src/server/utils/
  // Necesitamos subir hasta la raíz del proyecto (donde está backend/)
  
  // Intentar detectar si estamos en dist/ o src/
  const currentDir = __dirname;
  
  // Si estamos en dist/, subimos 5 niveles: dist/src/server/utils/ -> raíz
  // Si estamos en src/, subimos 4 niveles: src/server/utils/ -> raíz
  if (currentDir.includes(path.join('dist', 'src'))) {
    // Estamos en modo compilado (dist/)
    return path.join(__dirname, '../../../../../data');
  } else {
    // Estamos en modo desarrollo (src/)
    return path.join(__dirname, '../../../../data');
  }
}

/**
 * Obtiene la ruta a un subdirectorio dentro de data/
 */
export function getDataSubPath(subPath: string): string {
  return path.join(getDataPath(), subPath);
}


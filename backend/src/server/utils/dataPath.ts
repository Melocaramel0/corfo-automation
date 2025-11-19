import * as path from 'path';

/**
 * Obtiene la ruta a la carpeta data en la raíz del proyecto
 * Funciona tanto en desarrollo (src/) como en producción (dist/) y Docker
 */
export function getDataPath(): string {
  // CRÍTICO: En Docker, el volumen está mapeado a /app/data
  // Verificar si estamos en Docker (código compilado en /app/dist/)
  const currentDir = __dirname;
  
  // Si estamos en Docker (ruta comienza con /app/), usar /app/data directamente
  if (currentDir.startsWith('/app/')) {
    return '/app/data';
  }
  
  // Si estamos en desarrollo local, calcular la ruta relativa
  // __dirname apunta a la ubicación del archivo compilado o fuente
  // Desde backend/dist/src/server/utils/ o backend/src/server/utils/
  // Necesitamos subir hasta la raíz del proyecto (donde está backend/)
  
  // Intentar detectar si estamos en dist/ o src/
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

/**
 * Obtiene la ruta a la carpeta archivos_prueba
 * Funciona tanto en desarrollo (src/) como en producción (dist/) y Docker
 */
export function getArchivosPruebaPath(): string {
  const currentDir = __dirname;
  
  // Si estamos en Docker (ruta comienza con /app/), usar /app/archivos_prueba directamente
  if (currentDir.startsWith('/app/')) {
    return '/app/archivos_prueba';
  }
  
  // Si estamos en desarrollo local, calcular la ruta relativa
  if (currentDir.includes(path.join('dist', 'src'))) {
    // Estamos en modo compilado (dist/)
    return path.join(__dirname, '../../../../../archivos_prueba');
  } else {
    // Estamos en modo desarrollo (src/)
    return path.join(__dirname, '../../../../archivos_prueba');
  }
}


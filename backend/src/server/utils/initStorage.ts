import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Inicializa los directorios y archivos de almacenamiento necesarios
 */
export async function initStorage(): Promise<void> {
  const dataDir = path.join(__dirname, '../../../data');
  const executionResultsDir = path.join(dataDir, 'execution_results');
  const informesDir = path.join(dataDir, 'informes');
  
  // Crear directorios
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(executionResultsDir, { recursive: true });
  await fs.mkdir(informesDir, { recursive: true });
  
  // Crear archivo de procesos si no existe
  const processesFile = path.join(dataDir, 'processes.json');
  try {
    await fs.access(processesFile);
  } catch {
    await fs.writeFile(processesFile, JSON.stringify([], null, 2));
    console.log('✅ Archivo processes.json creado');
  }
  
  // Crear archivo de ejecuciones si no existe
  const executionsFile = path.join(dataDir, 'executions.json');
  try {
    await fs.access(executionsFile);
  } catch {
    await fs.writeFile(executionsFile, JSON.stringify([], null, 2));
    console.log('✅ Archivo executions.json creado');
  }
  
  console.log('📁 Almacenamiento inicializado correctamente');
}


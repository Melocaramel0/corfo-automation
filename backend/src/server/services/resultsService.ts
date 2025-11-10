import * as fs from 'fs/promises';
import * as path from 'path';
import { getDataSubPath } from '../utils/dataPath';

export class ResultsService {
  private resultsDir = getDataSubPath('execution_results');

  async getResults(processId: string): Promise<any[]> {
    try {
      const files = await fs.readdir(this.resultsDir);
      const processFiles = files.filter(f => f.includes(processId));

      if (processFiles.length === 0) {
        return [];
      }

      // Obtener todos los resultados
      const results = await Promise.all(
        processFiles.map(async file => {
          const data = await fs.readFile(path.join(this.resultsDir, file), 'utf-8');
          return JSON.parse(data);
        })
      );

      return results;
    } catch {
      return [];
    }
  }

  async getResultsSummary(processId: string): Promise<any> {
    const results = await this.getResults(processId);

    if (results.length === 0) {
      return {
        totalEjecuciones: 0,
        totalCampos: 0,
        camposCompletados: 0,
        camposFallidos: 0,
        porcentajeExito: 0
      };
    }

    // Tomar el resultado más reciente
    const latestResult = results[results.length - 1];

    return {
      totalEjecuciones: results.length,
      totalCampos: latestResult.estadisticas?.totalCampos || 0,
      camposCompletados: latestResult.estadisticas?.camposCompletados || 0,
      camposFallidos: (latestResult.estadisticas?.totalCampos || 0) - (latestResult.estadisticas?.camposCompletados || 0),
      porcentajeExito: latestResult.estadisticas?.porcentajeExito || 0,
      tiempoTotal: latestResult.tiempoTotal || 0,
      ultimaEjecucion: latestResult.fechaEjecucion || null
    };
  }
}


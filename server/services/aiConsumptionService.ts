import * as fs from 'fs/promises';
import * as path from 'path';

interface AIConsumptionData {
  nlpApi: {
    requests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    lastUpdated: string;
  };
  sentimentAnalysis: {
    executions: number;
    lastUpdated: string;
  };
  topicDetection: {
    uses: number;
    lastUpdated: string;
  };
}

export class AIConsumptionService {
  private static instance: AIConsumptionService;
  private consumptionFile: string;
  private consumption: AIConsumptionData;

  private constructor() {
    this.consumptionFile = path.join(__dirname, '../../data/ai_consumption.json');
    this.consumption = {
      nlpApi: {
        requests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        lastUpdated: new Date().toISOString()
      },
      sentimentAnalysis: {
        executions: 0,
        lastUpdated: new Date().toISOString()
      },
      topicDetection: {
        uses: 0,
        lastUpdated: new Date().toISOString()
      }
    };
    this.loadConsumption();
  }

  static getInstance(): AIConsumptionService {
    if (!AIConsumptionService.instance) {
      AIConsumptionService.instance = new AIConsumptionService();
    }
    return AIConsumptionService.instance;
  }

  private async loadConsumption(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.consumptionFile), { recursive: true });
      const data = await fs.readFile(this.consumptionFile, 'utf-8');
      this.consumption = JSON.parse(data);
    } catch {
      // Si no existe, usar valores por defecto
      await this.saveConsumption();
    }
  }

  private async saveConsumption(): Promise<void> {
    try {
      await fs.writeFile(this.consumptionFile, JSON.stringify(this.consumption, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error guardando consumo de IA:', error);
    }
  }

  /**
   * Registra una llamada a la API de NLP (Azure OpenAI)
   */
  async recordNLPRequest(inputTokens: number = 0, outputTokens: number = 0): Promise<void> {
    this.consumption.nlpApi.requests++;
    this.consumption.nlpApi.totalInputTokens += inputTokens;
    this.consumption.nlpApi.totalOutputTokens += outputTokens;
    this.consumption.nlpApi.lastUpdated = new Date().toISOString();
    await this.saveConsumption();
  }

  /**
   * Registra una ejecución de análisis de sentimientos
   * (Por ahora se usa cuando se genera un informe PDF, que incluye análisis)
   */
  async recordSentimentAnalysis(): Promise<void> {
    this.consumption.sentimentAnalysis.executions++;
    this.consumption.sentimentAnalysis.lastUpdated = new Date().toISOString();
    await this.saveConsumption();
  }

  /**
   * Registra un uso de detección de temas
   * (Por ahora se usa cuando se mapean campos fundamentales con IA)
   */
  async recordTopicDetection(): Promise<void> {
    this.consumption.topicDetection.uses++;
    this.consumption.topicDetection.lastUpdated = new Date().toISOString();
    await this.saveConsumption();
  }

  /**
   * Obtiene el consumo actual de recursos de IA
   */
  async getConsumption(): Promise<{
    nlpApi: {
      name: string;
      requests: number;
      description: string;
    };
    sentimentAnalysis: {
      name: string;
      executions: number;
      description: string;
    };
    topicDetection: {
      name: string;
      uses: number;
      description: string;
    };
  }> {
    await this.loadConsumption();
    
    return {
      nlpApi: {
        name: 'API de Procesamiento de Lenguaje Natural',
        requests: this.consumption.nlpApi.requests,
        description: 'solicitudes'
      },
      sentimentAnalysis: {
        name: 'Componente de Análisis de Sentimientos',
        executions: this.consumption.sentimentAnalysis.executions,
        description: 'ejecuciones'
      },
      topicDetection: {
        name: 'Modelo de Detección de Temas',
        uses: this.consumption.topicDetection.uses,
        description: 'usos'
      }
    };
  }

  /**
   * Obtiene estadísticas detalladas de consumo
   */
  async getDetailedConsumption(): Promise<AIConsumptionData> {
    await this.loadConsumption();
    return { ...this.consumption };
  }
}


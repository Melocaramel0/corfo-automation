import * as fs from 'fs/promises';
import * as path from 'path';
import { getDataPath } from '../utils/dataPath';

interface SystemLogEntry {
  id: string;
  action: string;
  description: string;
  date: string;
  user: string;
  contest: string;
  ipHost: string;
  timestamp: string;
}

export class SystemLogService {
  private static instance: SystemLogService;
  private logsFile: string;
  private logs: SystemLogEntry[] = [];
  private saveTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.logsFile = path.join(getDataPath(), 'system_logs.json');
    this.loadLogs();
  }

  static getInstance(): SystemLogService {
    if (!SystemLogService.instance) {
      SystemLogService.instance = new SystemLogService();
    }
    return SystemLogService.instance;
  }

  private async loadLogs(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.logsFile), { recursive: true });
      const data = await fs.readFile(this.logsFile, 'utf-8');
      this.logs = JSON.parse(data);
    } catch {
      // Si no existe, iniciar con array vacío
      this.logs = [];
    }
  }

  private async saveLogs(): Promise<void> {
    try {
      await fs.writeFile(this.logsFile, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error guardando logs del sistema:', error);
    }
  }

  private debounceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveLogs();
    }, 500);
  }

  /**
   * Registra una acción en el sistema
   */
  async logAction(
    action: string,
    description: string,
    user: string = 'system',
    contest: string = '-',
    ipHost: string = 'localhost'
  ): Promise<void> {
    const now = new Date();
    const logEntry: SystemLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      description,
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      user,
      contest,
      ipHost,
      timestamp: now.toISOString()
    };

    this.logs.unshift(logEntry); // Agregar al inicio
    
    // Mantener solo los últimos 1000 logs para evitar que el archivo crezca demasiado
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    this.debounceSave();
  }

  /**
   * Obtiene logs con filtros y paginación
   */
  async getLogs(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      user?: string;
      action?: string;
      contest?: string;
    }
  ): Promise<{
    data: SystemLogEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.loadLogs(); // Recargar logs antes de filtrar
    
    let filteredLogs = [...this.logs];

    // Aplicar filtros
    if (filters) {
      if (filters.user) {
        filteredLogs = filteredLogs.filter(log =>
          log.user.toLowerCase().includes(filters.user!.toLowerCase())
        );
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log =>
          log.action.toLowerCase().includes(filters.action!.toLowerCase())
        );
      }
      if (filters.contest && filters.contest !== '-') {
        filteredLogs = filteredLogs.filter(log =>
          log.contest.toLowerCase().includes(filters.contest!.toLowerCase())
        );
      }
      if (filters.dateFrom) {
        filteredLogs = filteredLogs.filter(log => log.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filteredLogs = filteredLogs.filter(log => log.date <= filters.dateTo!);
      }
    }

    // Aplicar búsqueda general
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchTerm) ||
        log.description.toLowerCase().includes(searchTerm) ||
        log.user.toLowerCase().includes(searchTerm) ||
        log.contest.toLowerCase().includes(searchTerm)
      );
    }

    // Ordenar por fecha (más recientes primero)
    filteredLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // Paginación
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      data: paginatedLogs,
      total: filteredLogs.length,
      page,
      limit,
      totalPages: Math.ceil(filteredLogs.length / limit)
    };
  }

  /**
   * Exporta logs a CSV
   */
  async exportLogs(filters?: {
    dateFrom?: string;
    dateTo?: string;
    user?: string;
    action?: string;
    contest?: string;
  }): Promise<string> {
    await this.loadLogs();
    
    let filteredLogs = [...this.logs];

    // Aplicar filtros
    if (filters) {
      if (filters.user) {
        filteredLogs = filteredLogs.filter(log =>
          log.user.toLowerCase().includes(filters.user!.toLowerCase())
        );
      }
      if (filters.action) {
        filteredLogs = filteredLogs.filter(log =>
          log.action.toLowerCase().includes(filters.action!.toLowerCase())
        );
      }
      if (filters.contest && filters.contest !== '-') {
        filteredLogs = filteredLogs.filter(log =>
          log.contest.toLowerCase().includes(filters.contest!.toLowerCase())
        );
      }
      if (filters.dateFrom) {
        filteredLogs = filteredLogs.filter(log => log.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filteredLogs = filteredLogs.filter(log => log.date <= filters.dateTo!);
      }
    }

    // Ordenar por fecha
    filteredLogs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    // Generar CSV
    const headers = ['Acción', 'Descripción', 'Fecha', 'Usuario', 'Concurso', 'IP/Host'];
    const rows = filteredLogs.map(log => [
      log.action,
      log.description,
      log.date,
      log.user,
      log.contest,
      log.ipHost
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}


import { apiService } from './api'

export interface CampoFundamental {
  valor?: string
  tipo: string
  obligatorio: boolean
  descripcion: string
  activo: boolean
  esFundamental: boolean
  numeroReferencia?: string
  etiquetasReales?: string[]
}

export interface CategoriaFundamental {
  nombre: string
  descripcion: string
  activo: boolean
  campos: { [key: string]: CampoFundamental }
}

export interface CamposFundamentalesData {
  metadatos: {
    version: string
    ultimaModificacion: string
    usuario: string
    totalCamposFundamentales: number
    descripcion: string
    fuente: string
  }
  categorias: {
    [categoria: string]: CategoriaFundamental
  }
}

export const camposFundamentalesService = {
  /**
   * Obtiene todos los campos fundamentales
   */
  async getAll(): Promise<CamposFundamentalesData> {
    const response = await apiService.get<CamposFundamentalesData>('/campos-fundamentales')
    return response.data || response
  },

  /**
   * Obtiene un campo específico
   */
  async getCampo(categoria: string, nombre: string): Promise<CampoFundamental> {
    const response = await apiService.get<CampoFundamental>(`/campos-fundamentales/${categoria}/${nombre}`)
    return response.data || response
  },

  /**
   * Actualiza un campo existente
   */
  async updateCampo(
    categoria: string,
    nombre: string,
    campo: Partial<CampoFundamental>
  ): Promise<CampoFundamental> {
    const response = await apiService.put<CampoFundamental>(
      `/campos-fundamentales/${categoria}/${nombre}`,
      campo
    )
    return response.data || response
  },

  /**
   * Crea un nuevo campo
   */
  async createCampo(
    categoria: string,
    campo: Partial<CampoFundamental> & { nombre: string }
  ): Promise<CampoFundamental> {
    const response = await apiService.post<CampoFundamental>(
      `/campos-fundamentales/${categoria}`,
      campo
    )
    return response.data || response
  },

  /**
   * Elimina un campo (lo marca como inactivo)
   */
  async deleteCampo(categoria: string, nombre: string): Promise<void> {
    await apiService.delete(`/campos-fundamentales/${categoria}/${nombre}`)
  },

  /**
   * Elimina un campo permanentemente (hard delete)
   */
  async deleteCampoPermanente(categoria: string, nombre: string): Promise<void> {
    await apiService.delete(`/campos-fundamentales/${categoria}/${nombre}?permanente=true`)
  },
}


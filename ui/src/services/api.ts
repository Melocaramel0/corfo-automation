import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { ApiResponse, PaginatedResponse } from '../types'

// Configuración base de Axios
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Funciones auxiliares para las peticiones
export const apiService = {
  // GET request
  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await api.get(url, { params })
    return response.data
  },

  // GET request con paginación
  async getPaginated<T>(url: string, params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    const response = await api.get(url, { params })
    return response.data
  },

  // POST request
  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await api.post(url, data)
    return response.data
  },

  // PUT request
  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await api.put(url, data)
    return response.data
  },

  // PATCH request
  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await api.patch(url, data)
    return response.data
  },

  // DELETE request
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await api.delete(url)
    return response.data
  },

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await api.get(url, { responseType: 'blob' })
    
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(downloadUrl)
  }
}

export default api

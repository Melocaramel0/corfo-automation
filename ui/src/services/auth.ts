import { apiService } from './api'
import { User, AuthState } from '../types'
import { cleanRut } from '../utils/rut'

export interface LoginCredentials {
  rut: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

// Mock data para desarrollo - datos de prueba según el diseño
const MOCK_USERS: User[] = [
  {
    id: '1',
    rut: '15124928-0',
    name: 'Administrador Sistema',
    role: 'Admin',
    email: 'admin@corfo.cl',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: '2',
    rut: '11111111-1',
    name: 'Usuario QA',
    role: 'QA User',
    email: 'qa@corfo.cl',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  },
  {
    id: '3',
    rut: '22222222-2',
    name: 'Usuario Final',
    role: 'User',
    email: 'user@corfo.cl',
    createdAt: '2024-01-01T00:00:00Z',
    isActive: true
  }
]

const MOCK_PASSWORDS = {
  '15124928-0': 'Admin#2025',
  '11111111-1': 'Qa#2025',
  '22222222-2': 'User#2025'
}

export const authService = {
  // Login del usuario
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Limpiar el RUT de puntos y guiones para comparar
    const cleanedRut = cleanRut(credentials.rut)
    
    console.log('🔍 Debug Login:', {
      rutIngresado: credentials.rut,
      rutLimpio: cleanedRut,
      passwordIngresado: credentials.password,
      usuariosDisponibles: MOCK_USERS.map(u => u.rut)
    })
    
    // Buscar usuario por RUT (comparando con RUT limpio)
    const user = MOCK_USERS.find(u => cleanRut(u.rut) === cleanedRut && u.isActive)
    
    if (!user) {
      console.log('❌ Usuario no encontrado para RUT:', credentials.rut)
      throw new Error('Usuario no encontrado o inactivo')
    }
    
    // Verificar contraseña (usar RUT formateado para buscar la contraseña)
    const expectedPassword = MOCK_PASSWORDS[user.rut as keyof typeof MOCK_PASSWORDS]
    if (credentials.password !== expectedPassword) {
      throw new Error('Contraseña incorrecta')
    }
    
    // Generar token mock
    const token = `mock_token_${user.id}_${Date.now()}`
    
    return {
      user,
      token
    }
    
    // En producción, usar la API real:
    // return apiService.post<LoginResponse>('/auth/login', credentials)
  },

  // Logout del usuario
  async logout(): Promise<void> {
    // Limpiar localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    
    // En producción, notificar al servidor:
    // await apiService.post('/auth/logout')
  },

  // Verificar token y obtener usuario actual
  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')
    
    if (!token || !userStr) {
      return null
    }
    
    try {
      const user = JSON.parse(userStr)
      
      // Verificar que el usuario sigue siendo válido
      const validUser = MOCK_USERS.find(u => u.id === user.id && u.isActive)
      return validUser || null
      
      // En producción, verificar con el servidor:
      // const response = await apiService.get<User>('/auth/me')
      // return response.data
    } catch {
      return null
    }
  },

  // Refrescar token
  async refreshToken(): Promise<string | null> {
    try {
      const currentUser = await this.getCurrentUser()
      if (!currentUser) return null
      
      // Generar nuevo token mock
      const newToken = `mock_token_${currentUser.id}_${Date.now()}`
      localStorage.setItem('auth_token', newToken)
      
      return newToken
      
      // En producción:
      // const response = await apiService.post<{ token: string }>('/auth/refresh')
      // return response.data.token
    } catch {
      return null
    }
  },

  // Verificar permisos
  hasPermission(user: User | null, permission: string): boolean {
    if (!user || !user.isActive) return false
    
    switch (permission) {
      case 'admin':
        return user.role === 'Admin'
      case 'qa':
        return user.role === 'Admin' || user.role === 'QA User'
      case 'user':
        return true // Todos los usuarios autenticados
      case 'create_process':
        return user.role === 'Admin' || user.role === 'QA User'
      case 'edit_process':
        return user.role === 'Admin' || user.role === 'QA User'
      case 'delete_process':
        return user.role === 'Admin' || user.role === 'QA User'
      case 'execute_process':
        return true // Todos pueden ejecutar
      case 'view_admin':
        return user.role === 'Admin'
      default:
        return false
    }
  }
}

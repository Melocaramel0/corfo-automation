import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { User, AuthState } from '../types'
import { authService, LoginCredentials } from '../services/auth'
import toast from 'react-hot-toast'

// Tipos para el contexto
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

// Estado inicial
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
}

// Tipos de acciones del reducer
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: User | null }

// Reducer para manejar el estado de autenticación
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      }
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
      }
    default:
      return state
  }
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Props del provider
interface AuthProviderProps {
  children: ReactNode
}

// Provider del contexto de autenticación
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Función para hacer login
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await authService.login(credentials)
      
      // Guardar en localStorage
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('auth_user', JSON.stringify(response.user))
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      })
      
      toast.success(`¡Bienvenido, ${response.user.name}!`)
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' })
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al iniciar sesión'
      
      toast.error(errorMessage)
      throw error
    }
  }

  // Función para hacer logout
  const logout = async () => {
    try {
      await authService.logout()
      dispatch({ type: 'LOGOUT' })
      toast.success('Sesión cerrada correctamente')
    } catch (error) {
      console.error('Error during logout:', error)
      // Forzar logout local aunque falle el servidor
      dispatch({ type: 'LOGOUT' })
    }
  }

  // Función para verificar permisos
  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(state.user, permission)
  }

  // Efecto para verificar el estado de autenticación al cargar
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const user = await authService.getCurrentUser()
        dispatch({ type: 'SET_USER', payload: user })
      } catch (error) {
        console.error('Error checking auth status:', error)
        dispatch({ type: 'SET_USER', payload: null })
      }
    }

    checkAuthStatus()
  }, [])

  // Efecto para refrescar token periódicamente
  useEffect(() => {
    if (!state.isAuthenticated) return

    const refreshInterval = setInterval(async () => {
      try {
        const newToken = await authService.refreshToken()
        if (newToken) {
          localStorage.setItem('auth_token', newToken)
        }
      } catch (error) {
        console.error('Error refreshing token:', error)
      }
    }, 15 * 60 * 1000) // 15 minutos

    return () => clearInterval(refreshInterval)
  }, [state.isAuthenticated])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    hasPermission,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import { 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Bell,
  Search
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { UserRole } from '../../types'
import clsx from 'clsx'

interface TopBarProps {
  onMenuClick: () => void
}

// Función para obtener el color del badge según el rol
const getRoleBadgeColor = (role: UserRole): string => {
  switch (role) {
    case 'Admin':
      return 'badge-error'
    case 'QA User':
      return 'badge-warning'
    case 'User':
      return 'badge-info'
    default:
      return 'badge-gray'
  }
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    await logout()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-4">
          {/* Botón menú para móvil */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          {/* Título de la página actual */}
          <div className="hidden sm:block">
            <h1 className="text-xl font-semibold text-gray-900">
              Procesos de Validación
            </h1>
            <p className="text-sm text-gray-500">
              Gestiona y ejecuta validaciones automáticas
            </p>
          </div>
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-4">
          {/* Barra de búsqueda (oculta en móvil) */}
          <div className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar procesos..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corfo-500 focus:border-corfo-500"
              />
            </div>
          </div>

          {/* Notificaciones */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400"></span>
          </button>

          {/* Información del usuario */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-corfo-500"
            >
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-corfo-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">
                      {user?.rut}
                    </p>
                    <span className={clsx('badge text-xs', getRoleBadgeColor(user?.role || 'User'))}>
                      {user?.role}
                    </span>
                  </div>
                </div>
                <ChevronDown className={clsx(
                  'h-4 w-4 text-gray-400 transition-transform',
                  isDropdownOpen && 'transform rotate-180'
                )} />
              </div>
            </button>

            {/* Dropdown del usuario */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.email}
                  </p>
                  <div className="mt-1">
                    <span className={clsx('badge text-xs', getRoleBadgeColor(user?.role || 'User'))}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="py-2">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings className="h-4 w-4 mr-3 text-gray-400" />
                    Configuración
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-3 text-red-400" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar

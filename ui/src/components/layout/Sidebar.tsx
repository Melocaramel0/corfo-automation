import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  CheckCircle2, 
  Settings, 
  Home, 
  Shield,
  ChevronRight 
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'

interface SidebarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  permission?: string
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Menú Principal',
    icon: Home,
    path: '/',
  },
  {
    id: 'processes',
    label: 'Procesos de Validación',
    icon: CheckCircle2,
    path: '/processes',
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    path: '/admin',
    permission: 'view_admin',
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasPermission } = useAuth()
  const location = useLocation()

  // Filtrar items según permisos
  const visibleItems = sidebarItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  )

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Header del sidebar */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-corfo-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">CORFO</h1>
                <p className="text-xs text-gray-500">Automation</p>
              </div>
            </div>
            
            {/* Botón cerrar para móvil */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path || 
                              (item.path !== '/' && location.pathname.startsWith(item.path))
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => onClose()}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-corfo-100 text-corfo-700 border-r-2 border-corfo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={clsx(
                      'h-5 w-5',
                      isActive ? 'text-corfo-600' : 'text-gray-400'
                    )} />
                    <span>{item.label}</span>
                  </div>
                  
                  {item.badge && (
                    <span className="badge badge-info">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer del sidebar */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">
                Sistema de Validación
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Automatización de formularios CORFO
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar

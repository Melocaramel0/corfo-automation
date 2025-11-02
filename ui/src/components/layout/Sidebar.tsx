import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  CheckCircle2, 
  Settings, 
  Home, 
  ChevronRight,
  ChevronRight as ArrowRight
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
  const { hasPermission, user } = useAuth()
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
      <div 
        className={clsx(
          'fixed top-16 left-0 bottom-0 z-30 w-64 shadow-lg transition-transform duration-300 ease-in-out',
          'lg:static lg:top-auto lg:h-full',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ backgroundColor: '#221E7C' }}
      >
        <div className="flex flex-col h-full">
          {/* Botón cerrar para móvil */}
          <div className="px-4 py-3 lg:hidden border-b border-white/10">
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/10 text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Navegación */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path || 
                              (item.path !== '/' && location.pathname.startsWith(item.path))
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => onClose()}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className={clsx(
                      'h-5 w-5',
                      isActive ? 'text-corfo-500' : 'text-white'
                    )} />
                    <span>{item.label}</span>
                  </div>
                  
                  {isActive && (
                    <ArrowRight className="h-4 w-4 text-white" />
                  )}
                  
                  {item.badge && (
                    <span className="badge badge-info">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer del sidebar con información del usuario */}
          <div className="p-4 border-t border-white/10">
            {user && (
              <div className="space-y-3">
                <p className="text-xs text-white/70 font-medium">
                  {user.role || 'Usuario'}
                </p>
                <div className="flex items-center space-x-3">
                  {/* Círculo con iniciales */}
                  <div className="h-10 w-10 rounded-full bg-corfo-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-corfoDark-sidebar">
                      {user.name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {user.name || 'Usuario'}
                    </p>
                    {user.email && (
                      <p className="text-xs text-white/70 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar

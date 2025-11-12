import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Menu, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Bell,
  Search,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { UserRole, ValidationProcess } from '../../types'
import { processService } from '../../services/processes'
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
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [recentExecutions, setRecentExecutions] = useState<ValidationProcess[]>([])
  const [loadingExecutions, setLoadingExecutions] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationDropdownRef = useRef<HTMLDivElement>(null)
  const wasDropdownOpenRef = useRef(false) // Ref para rastrear si el dropdown estaba abierto

  // Cargar últimas ejecuciones cuando se abre el dropdown
  useEffect(() => {
    if (isNotificationDropdownOpen) {
      loadRecentExecutions()
    }
  }, [isNotificationDropdownOpen])

  const loadRecentExecutions = async () => {
    try {
      setLoadingExecutions(true)
      const response = await processService.getProcesses({ 
        page: 1, 
        limit: 10 
      })
      
      // Filtrar procesos ejecutados o fallidos y ordenar por fecha de modificación
      const executed = response.data
        .filter(p => p.estado === 'Ejecutado' || p.estado === 'Fallido')
        .sort((a, b) => {
          const dateA = new Date(a.fechaModificacion || a.fechaCreacion).getTime()
          const dateB = new Date(b.fechaModificacion || b.fechaCreacion).getTime()
          return dateB - dateA
        })
        .slice(0, 10)
      
      setRecentExecutions(executed)
    } catch (error) {
      console.error('Error cargando ejecuciones recientes:', error)
    } finally {
      setLoadingExecutions(false)
    }
  }

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        // Si el dropdown estaba abierto, marcar como leídas solo cuando se cierra por clic fuera
        if (isNotificationDropdownOpen) {
          markAllAsRead()
          wasDropdownOpenRef.current = false
        }
        setIsNotificationDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isNotificationDropdownOpen, markAllAsRead])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/processes?search=${encodeURIComponent(searchTerm.trim())}`)
    } else {
      navigate('/processes')
    }
  }

  const handleNotificationClick = () => {
    const wasOpen = isNotificationDropdownOpen
    setIsNotificationDropdownOpen(!wasOpen)
    
    if (wasOpen) {
      // El dropdown se está cerrando - marcar todas como leídas
      wasDropdownOpenRef.current = false
      markAllAsRead()
    } else {
      // El dropdown se está abriendo - marcar que está abierto
      wasDropdownOpenRef.current = true
    }
  }

  const handleLogout = async () => {
    setIsDropdownOpen(false)
    await logout()
  }

  return (
    <header className="bg-corfoGray-0 shadow-sm border-b border-corfoGray-20 h-16" data-tour="topbar">
      <div className="flex items-center h-full">
        {/* Logo CORFO - alineado con el inicio del sidebar */}
        <div className="w-64 px-6 flex items-center justify-center lg:justify-start border-r border-corfoGray-20">
          <img 
            src="/images/logo_corfo2024_azul_min.png" 
            alt="CORFO Logo" 
            className="h-14 object-contain"
          />
        </div>
        
        {/* Contenido del header */}
        <div className="flex-1 flex items-center justify-between h-full px-4 lg:px-6">
          {/* Lado izquierdo */}
          <div className="flex items-center space-x-4">
            {/* Botón menú para móvil */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-corfoGray-20"
            >
              <Menu className="h-5 w-5 text-corfoGray-80" />
            </button>

            {/* Título de la página actual */}
            <div>
              <h1 className="text-xl font-semibold text-corfoGray-90">
                Procesos de Validación
              </h1>
              <p className="text-sm text-corfoGray-60">
                Gestiona y ejecuta validaciones automáticas
              </p>
            </div>
          </div>

          {/* Lado derecho */}
          <div className="flex items-center space-x-4">
            {/* Barra de búsqueda (oculta en móvil) */}
            <div className="hidden md:block">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-corfoGray-60" />
                  <input
                    type="text"
                    placeholder="Buscar procesos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-64 border border-corfoGray-40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corfo-500 focus:border-corfo-500"
                  />
                </div>
              </form>
            </div>

            {/* Notificaciones */}
            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={handleNotificationClick}
                className="relative p-2 text-corfoGray-60 hover:text-corfoGray-80 focus:outline-none focus:text-corfoGray-80"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-corfoRed-500 border-2 border-white"></span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              {isNotificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-corfoGray-0 rounded-lg shadow-lg border border-corfoGray-20 z-50 max-h-[600px] flex flex-col">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-corfoGray-20 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-corfoGray-90">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-corfo-500 hover:text-corfo-600"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                  </div>

                  {/* Lista de notificaciones */}
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 && recentExecutions.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-corfoGray-60">
                        No hay notificaciones
                      </div>
                    ) : (
                      <>
                        {/* Notificaciones recientes */}
                        {notifications.slice(0, 5).map(notif => (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 border-b border-corfoGray-20 hover:bg-corfoGray-10 cursor-pointer ${
                              !notif.read ? 'bg-corfoBlue-5' : ''
                            }`}
                            onClick={() => {
                              markAsRead(notif.id)
                              if (notif.processId) {
                                navigate(`/processes`)
                                setIsNotificationDropdownOpen(false)
                              }
                            }}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mt-0.5">
                                {notif.type === 'success' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {notif.type === 'error' && (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                {notif.type === 'info' && (
                                  <Clock className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                              <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-corfoGray-90">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-corfoGray-60 mt-1">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-corfoGray-50 mt-1">
                                  {new Date(notif.timestamp).toLocaleString('es-CL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="flex-shrink-0 ml-2">
                                  <div className="h-2 w-2 rounded-full bg-corfo-500"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Separador */}
                        {notifications.length > 0 && recentExecutions.length > 0 && (
                          <div className="px-4 py-2 border-b border-corfoGray-20">
                            <h4 className="text-xs font-semibold text-corfoGray-60 uppercase">
                              Últimas Ejecuciones
                            </h4>
                          </div>
                        )}

                        {/* Últimas ejecuciones */}
                        {loadingExecutions ? (
                          <div className="px-4 py-8 text-center text-sm text-corfoGray-60">
                            Cargando...
                          </div>
                        ) : (
                          recentExecutions.map(process => (
                            <div
                              key={process.id}
                              className="px-4 py-3 border-b border-corfoGray-20 hover:bg-corfoGray-10 cursor-pointer"
                              onClick={() => {
                                navigate('/processes')
                                setIsNotificationDropdownOpen(false)
                              }}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                  {process.estado === 'Ejecutado' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                  <p className="text-sm font-medium text-corfoGray-90 truncate">
                                    {process.nombreConcurso}
                                  </p>
                                  <p className="text-xs text-corfoGray-60 mt-1">
                                    Estado: {process.estado}
                                  </p>
                                  <p className="text-xs text-corfoGray-50 mt-1">
                                    {new Date(process.fechaModificacion || process.fechaCreacion).toLocaleString('es-CL', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  {(notifications.length > 0 || recentExecutions.length > 0) && (
                    <div className="px-4 py-2 border-t border-corfoGray-20">
                      <button
                        onClick={() => {
                          navigate('/processes')
                          setIsNotificationDropdownOpen(false)
                        }}
                        className="w-full text-xs text-center text-corfo-500 hover:text-corfo-600"
                      >
                        Ver todos los procesos
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Información del usuario */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-corfoGray-10 focus:outline-none focus:ring-2 focus:ring-corfo-500"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-corfo-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-corfoGray-90">
                      {user?.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-corfoGray-60">
                        {user?.rut}
                      </p>
                      <span className={clsx('badge text-xs', getRoleBadgeColor(user?.role || 'User'))}>
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={clsx(
                    'h-4 w-4 text-corfoGray-60 transition-transform',
                    isDropdownOpen && 'transform rotate-180'
                  )} />
                </div>
              </button>

              {/* Dropdown del usuario */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-corfoGray-0 rounded-lg shadow-lg border border-corfoGray-20 py-2 z-50">
                  <div className="px-4 py-3 border-b border-corfoGray-20">
                    <p className="text-sm font-medium text-corfoGray-90">
                      {user?.name}
                    </p>
                    <p className="text-xs text-corfoGray-60">
                      {user?.email}
                    </p>
                    <div className="mt-1">
                      <span className={clsx('badge text-xs', getRoleBadgeColor(user?.role || 'User'))}>
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <div className="py-2">
                    <button className="flex items-center w-full px-4 py-2 text-sm text-corfoGray-80 hover:bg-corfoGray-10">
                      <Settings className="h-4 w-4 mr-3 text-corfoGray-60" />
                      Configuración
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-corfoRed-500 hover:bg-corfoRed-20"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-corfoRed-75" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default TopBar

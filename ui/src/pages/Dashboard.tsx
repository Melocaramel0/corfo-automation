import React from 'react'
import { Link } from 'react-router-dom'
import { 
  CheckCircle2, 
  Settings, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Users,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth()

  // Estadísticas mock
  const stats = {
    totalProcesos: 12,
    procesosEjecutados: 8,
    procesosEnConfiguracion: 3,
    procesosConErrores: 1,
    ultimaEjecucion: '2024-01-20 14:45',
    tiempoPromedioEjecucion: '12.5 min'
  }

  const recentActivity = [
    {
      id: '1',
      action: 'Proceso ejecutado',
      process: 'Validación Formulario Semilla Inicia',
      user: 'admin@corfo.cl',
      time: 'Hace 2 horas',
      status: 'success'
    },
    {
      id: '2',
      action: 'Nuevo proceso creado',
      process: 'Formulario Innovación Tecnológica',
      user: 'qa@corfo.cl',
      time: 'Hace 4 horas',
      status: 'info'
    },
    {
      id: '3',
      action: 'Error en validación',
      process: 'Desarrollo Productivo',
      user: 'sistema',
      time: 'Hace 6 horas',
      status: 'error'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-corfoGray-90">
          ¡Bienvenido, {user?.name}!
        </h1>
        <p className="mt-1 text-sm text-corfoGray-60">
          Sistema de Validación Automática de Formularios CORFO
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle2 className="h-8 w-8 text-corfo-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-corfoGray-60">Total Procesos</p>
              <p className="text-2xl font-semibold text-corfoGray-90">{stats.totalProcesos}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-corfoAqua-100" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-corfoGray-60">Ejecutados</p>
              <p className="text-2xl font-semibold text-corfoGray-90">{stats.procesosEjecutados}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-corfoYellow-100" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-corfoGray-60">En Configuración</p>
              <p className="text-2xl font-semibold text-corfoGray-90">{stats.procesosEnConfiguracion}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-corfoRed-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-corfoGray-60">Con Errores</p>
              <p className="text-2xl font-semibold text-corfoGray-90">{stats.procesosConErrores}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Procesos de Validación */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-6 w-6 text-corfo-500" />
              <h3 className="text-lg font-medium text-corfoGray-90">
                Procesos de Validación
              </h3>
            </div>
            <Link
              to="/processes"
              className="text-corfo-500 hover:text-corfo-600 text-sm font-medium flex items-center space-x-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <p className="text-corfoGray-60 mb-4">
            Gestiona y ejecuta validaciones automáticas de formularios CORFO
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-corfoGray-60">Última ejecución:</span>
              <span className="text-corfoGray-90">{stats.ultimaEjecucion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-corfoGray-60">Tiempo promedio:</span>
              <span className="text-corfoGray-90">{stats.tiempoPromedioEjecucion}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <Link
              to="/processes"
              className="btn-primary w-full"
            >
              Ir a Procesos
            </Link>
          </div>
        </div>

        {/* Administración */}
        {hasPermission('view_admin') && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Administración
                </h3>
              </div>
              <Link
                to="/admin"
                className="text-corfo-600 hover:text-corfo-700 text-sm font-medium flex items-center space-x-1"
              >
                <span>Administrar</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <p className="text-gray-600 mb-4">
              Gestiona recursos, parámetros del sistema y visualiza logs
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2" />
                <span>Gestión de usuarios y roles</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span>Monitoreo de recursos</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Link
                to="/admin"
                className="btn-secondary w-full"
              >
                Panel de Administración
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Actividad reciente */}
      <div className="card">
        <h3 className="text-lg font-medium text-corfoGray-90 mb-4">
          Actividad Reciente
        </h3>
        
        <div className="space-y-4">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-4 p-3 bg-corfoGray-10 rounded-lg">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                activity.status === 'success' ? 'bg-corfoAqua-100' :
                activity.status === 'error' ? 'bg-corfoRed-500' : 'bg-corfo-500'
              }`} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-corfoGray-90">
                  {activity.action}
                </p>
                <p className="text-sm text-corfoGray-60 truncate">
                  {activity.process}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-corfoGray-60">{activity.user}</p>
                <p className="text-xs text-corfoGray-60">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <Link
            to="/admin/logs"
            className="text-corfo-600 hover:text-corfo-700 text-sm font-medium"
          >
            Ver todos los logs →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

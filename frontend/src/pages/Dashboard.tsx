import React, { useState, useEffect } from 'react'
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
import { processService } from '../services/processes'
import { useTour } from '../hooks/useTour'
import { dashboardTourSteps } from '../utils/tours'
import { TourButton } from '../components/ui/TourButton'
// import { ValidationProcess } from '../types' // No usado actualmente

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // Configurar tour del dashboard
  const { start: startTour } = useTour({
    steps: dashboardTourSteps,
    showProgress: true,
    allowClose: true,
    overlayColor: '#221E7C',
  })
  const [stats, setStats] = useState({
    totalProcesos: 0,
    procesosEjecutados: 0,
    procesosEnConfiguracion: 0,
    procesosConErrores: 0,
    ultimaEjecucion: 'N/A',
    tiempoPromedioEjecucion: 'N/A'
  })
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    action: string
    process: string
    user: string
    time: string
    status: 'success' | 'info' | 'error'
  }>>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Obtener todos los procesos
      const response = await processService.getProcesses({ 
        page: 1, 
        limit: 1000 // Obtener todos para calcular estadísticas
      })
      
      const processes = response.data

      // Calcular estadísticas
      const totalProcesos = processes.length
      const procesosEjecutados = processes.filter(p => p.estado === 'Ejecutado').length
      const procesosEnConfiguracion = processes.filter(p => 
        p.estado === 'En configuración' || p.estado === 'Creado'
      ).length
      const procesosConErrores = processes.filter(p => p.estado === 'Fallido').length

      // Obtener estadísticas de ejecuciones desde archivos exec_*.json
      const executionStats = await processService.getExecutionStatistics()

      // Formatear última ejecución
      let ultimaEjecucionStr = 'N/A'
      if (executionStats.ultimaEjecucion) {
        const fecha = new Date(executionStats.ultimaEjecucion)
        ultimaEjecucionStr = fecha.toLocaleString('es-CL', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }

      // Formatear tiempo promedio
      let tiempoPromedioStr = 'N/A'
      if (executionStats.tiempoPromedio > 0) {
        const minutos = Math.floor(executionStats.tiempoPromedio / 60)
        const segundos = Math.round(executionStats.tiempoPromedio % 60)
        tiempoPromedioStr = minutos > 0 ? `${minutos} min ${segundos}s` : `${segundos}s`
      }

      setStats({
        totalProcesos,
        procesosEjecutados,
        procesosEnConfiguracion,
        procesosConErrores,
        ultimaEjecucion: ultimaEjecucionStr,
        tiempoPromedioEjecucion: tiempoPromedioStr
      })

      // Generar actividad reciente desde procesos
      const activity: typeof recentActivity = []
      
      // Ordenar procesos por fecha de modificación o creación (más recientes primero)
      const sortedProcesses = [...processes].sort((a, b) => {
        const fechaA = a.fechaModificacion ? new Date(a.fechaModificacion) : new Date(a.fechaCreacion)
        const fechaB = b.fechaModificacion ? new Date(b.fechaModificacion) : new Date(b.fechaCreacion)
        return fechaB.getTime() - fechaA.getTime()
      })

      // Tomar los 3 más recientes
      sortedProcesses.slice(0, 3).forEach((process) => {
        const fechaModificacion = process.fechaModificacion 
          ? new Date(process.fechaModificacion) 
          : new Date(process.fechaCreacion)
        const ahora = new Date()
        const diffMs = ahora.getTime() - fechaModificacion.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        let timeAgo = ''
        if (diffHours < 1) {
          timeAgo = 'Hace menos de una hora'
        } else if (diffHours < 24) {
          timeAgo = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
        } else {
          timeAgo = `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
        }

        let action = ''
        let status: 'success' | 'info' | 'error' = 'info'
        
        if (process.estado === 'Ejecutado') {
          action = 'Proceso ejecutado'
          status = 'success'
        } else if (process.estado === 'Fallido') {
          action = 'Error en validación'
          status = 'error'
        } else if (process.estado === 'Creado' || process.estado === 'En configuración') {
          action = 'Nuevo proceso creado'
          status = 'info'
        } else {
          action = `Proceso ${process.estado.toLowerCase()}`
          status = 'info'
        }

        activity.push({
          id: process.id,
          action,
          process: process.nombreConcurso,
          user: process.usuarioCreacion,
          time: timeAgo,
          status
        })
      })

      setRecentActivity(activity)
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corfo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-corfoGray-90" data-tour="welcome">
            ¡Bienvenido, {user?.name}!
          </h1>
          <p className="mt-1 text-sm text-corfoGray-60">
            Sistema de Validación Automática de Formularios CORFO
          </p>
        </div>
        <TourButton onClick={startTour} variant="icon" />
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card" data-tour="stats-total">
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

        <div className="card" data-tour="stats-ejecutados">
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

        <div className="card" data-tour="stats-configuracion">
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

        <div className="card" data-tour="stats-errores">
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
        <div className="card" data-tour="procesos-validacion">
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
      <div className="card" data-tour="actividad-reciente">
        <h3 className="text-lg font-medium text-corfoGray-90 mb-4">
          Actividad Reciente
        </h3>
        
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-corfoGray-60">
              No hay actividad reciente
            </div>
          ) : (
            recentActivity.map((activity) => (
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
            ))
          )}
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

import { useEffect, useState } from 'react'
import { SystemParameters as SystemParametersType } from '../../types'
import { adminService } from '../../services/admin'
import { Check, X, Database, Users, Info } from 'lucide-react'

export function SystemParameters() {
  const [data, setData] = useState<SystemParametersType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const parameters = await adminService.getSystemParameters()
        setData(parameters)
      } catch (error) {
        console.error('Error fetching system parameters:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSave = async () => {
    if (!data) return
    
    setSaving(true)
    try {
      const updated = await adminService.updateSystemParameters(data)
      setData(updated)
      // Aquí podrías mostrar un toast de éxito
    } catch (error) {
      console.error('Error updating parameters:', error)
      // Aquí podrías mostrar un toast de error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-corfoGray-0 rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-corfoGray-40 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-corfoGray-40 rounded"></div>
            <div className="h-4 bg-corfoGray-40 rounded w-3/4"></div>
            <div className="h-4 bg-corfoGray-40 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-corfoGray-0 rounded-lg shadow-sm border p-6">
        <p className="text-corfoGray-60">Error al cargar los parámetros del sistema</p>
      </div>
    )
  }

  return (
    <div className="bg-corfoGray-0 rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-corfoGray-90 mb-2">
          Parámetros del Sistema
        </h2>
        <p className="text-corfoGray-60 mb-6">
          Configuración de perfiles de usuario y bases de datos.
        </p>

        <div className="space-y-8">
          {/* Perfiles de Usuario */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-corfoGray-60" />
              <h3 className="font-medium text-corfoGray-90">Perfiles de Usuario:</h3>
            </div>
            
            <div className="space-y-3 ml-7">
              <div className="flex items-center justify-between">
                <span className="text-corfoGray-80">Administrador</span>
                <div className="flex items-center space-x-2">
                  {data.userProfiles.admin ? (
                    <Check className="w-5 h-5 text-corfoAqua-100" />
                  ) : (
                    <X className="w-5 h-5 text-corfoRed-500" />
                  )}
                  <span className="text-sm text-corfoGray-60">
                    {data.userProfiles.admin ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-corfoGray-80">Usuario de QA</span>
                <div className="flex items-center space-x-2">
                  {data.userProfiles.qaUser ? (
                    <Check className="w-5 h-5 text-corfoAqua-100" />
                  ) : (
                    <X className="w-5 h-5 text-corfoRed-500" />
                  )}
                  <span className="text-sm text-corfoGray-60">
                    {data.userProfiles.qaUser ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-corfoGray-80">Usuario Final</span>
                <div className="flex items-center space-x-2">
                  {data.userProfiles.finalUser ? (
                    <Check className="w-5 h-5 text-corfoAqua-100" />
                  ) : (
                    <X className="w-5 h-5 text-corfoRed-500" />
                  )}
                  <span className="text-sm text-corfoGray-60">
                    {data.userProfiles.finalUser ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuración de Base de Datos */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Database className="w-5 h-5 text-corfoGray-60" />
              <h3 className="font-medium text-corfoGray-90">Configuración de BD:</h3>
            </div>
            
            <div className="space-y-3 ml-7">
              <div className="flex items-center justify-between">
                <span className="text-corfoGray-80">Conexión a</span>
                <span className="font-mono text-sm bg-corfoGray-20 px-2 py-1 rounded">
                  '{data.database.connection}'
                </span>
              </div>
            </div>
          </div>

          {/* Versión del Sistema */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Info className="w-5 h-5 text-corfoGray-60" />
              <h3 className="font-medium text-corfoGray-90">Versión del Sistema:</h3>
            </div>
            
            <div className="ml-7">
              <span className="text-lg font-semibold text-corfo-500">
                {data.version}
              </span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-8 pt-6 border-t border-corfoGray-20">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-corfoGray-80 bg-corfoGray-0 border border-corfoGray-40 rounded-md hover:bg-corfoGray-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corfo-500"
            >
              Recargar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-corfo-500 border border-transparent rounded-md hover:bg-corfo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-corfo-500 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

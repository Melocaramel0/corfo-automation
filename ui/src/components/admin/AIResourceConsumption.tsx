import { useEffect, useState } from 'react'
import { AIResourceConsumption as AIResourceConsumptionType } from '../../types'
import { adminService } from '../../services/admin'

export function AIResourceConsumption() {
  const [data, setData] = useState<AIResourceConsumptionType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const consumption = await adminService.getAIResourceConsumption()
        setData(consumption)
      } catch (error) {
        console.error('Error fetching AI consumption:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-gray-500">Error al cargar los datos de consumo</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Consumo de Recursos de IA
        </h2>
        <p className="text-gray-600 mb-6">
          Aquí se muestra el consumo de las APIs y componentes de inteligencia artificial.
        </p>

        <div className="space-y-6">
          {/* API de Procesamiento de Lenguaje Natural */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {data.nlpApi.name}
                </h3>
                <span className="text-lg font-semibold text-blue-600">
                  {data.nlpApi.requests.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {data.nlpApi.description}
              </p>
            </div>
          </div>

          {/* Componente de Análisis de Sentimientos */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {data.sentimentAnalysis.name}
                </h3>
                <span className="text-lg font-semibold text-green-600">
                  {data.sentimentAnalysis.executions.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {data.sentimentAnalysis.description}
              </p>
            </div>
          </div>

          {/* Modelo de Detección de Temas */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {data.topicDetection.name}
                </h3>
                <span className="text-lg font-semibold text-purple-600">
                  {data.topicDetection.uses.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {data.topicDetection.description}
              </p>
            </div>
          </div>
        </div>

        {/* Resumen visual */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.nlpApi.requests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Solicitudes NLP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.sentimentAnalysis.executions.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Análisis de Sentimientos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.topicDetection.uses.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">Detección de Temas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

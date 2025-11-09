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
        <p className="text-corfoGray-60">Error al cargar los datos de consumo</p>
      </div>
    )
  }

  return (
    <div className="bg-corfoGray-0 rounded-lg shadow-sm border">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-corfoGray-90 mb-2">
          Consumo de Recursos de IA
        </h2>
        <p className="text-corfoGray-60 mb-6">
          Aquí se muestra el consumo de las APIs y componentes de inteligencia artificial.
        </p>

        <div className="space-y-6">
          {/* API de Procesamiento de Lenguaje Natural */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-corfo-500 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-corfoGray-90">
                  {data.nlpApi.name}
                </h3>
                <span className="text-lg font-semibold text-corfo-500">
                  {data.nlpApi.requests.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-corfoGray-60">
                {data.nlpApi.description}
              </p>
            </div>
          </div>

          {/* Componente de Análisis de Sentimientos */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-corfoAqua-100 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-corfoGray-90">
                  {data.sentimentAnalysis.name}
                </h3>
                <span className="text-lg font-semibold text-corfoAqua-100">
                  {data.sentimentAnalysis.executions.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-corfoGray-60">
                {data.sentimentAnalysis.description}
              </p>
            </div>
          </div>

          {/* Modelo de Detección de Temas */}
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-corfoCyan-100 rounded-full mt-2"></div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-corfoGray-90">
                  {data.topicDetection.name}
                </h3>
                <span className="text-lg font-semibold text-corfoCyan-100">
                  {data.topicDetection.uses.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-corfoGray-60">
                {data.topicDetection.description}
              </p>
            </div>
          </div>
        </div>

        {/* Resumen visual */}
        <div className="mt-8 pt-6 border-t border-corfoGray-20">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-corfo-500">
                {data.nlpApi.requests.toLocaleString()}
              </div>
              <div className="text-sm text-corfoGray-60">Solicitudes NLP</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-corfoAqua-100">
                {data.sentimentAnalysis.executions.toLocaleString()}
              </div>
              <div className="text-sm text-corfoGray-60">Análisis de Sentimientos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-corfoCyan-100">
                {data.topicDetection.uses.toLocaleString()}
              </div>
              <div className="text-sm text-corfoGray-60">Detección de Temas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

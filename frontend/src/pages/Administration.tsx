import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { AIResourceConsumption } from '../components/admin/AIResourceConsumption'
import { SystemParameters } from '../components/admin/SystemParameters'
import { LogVisualization } from '../components/admin/LogVisualization'

export function Administration() {
  const [activeTab, setActiveTab] = useState('consumption')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="text-gray-600 mt-1">
          Panel de control y configuración del sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consumption">
            Consumo de Recursos
          </TabsTrigger>
          <TabsTrigger value="parameters">
            Parámetros del Sistema
          </TabsTrigger>
          <TabsTrigger value="logs">
            Visualización de Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumption" className="mt-6">
          <AIResourceConsumption />
        </TabsContent>

        <TabsContent value="parameters" className="mt-6">
          <SystemParameters />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <LogVisualization />
        </TabsContent>
      </Tabs>
    </div>
  )
}

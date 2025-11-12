import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { NotificationContainer } from '../ui/NotificationContainer'
import { ExecutionMonitor } from '../global/ExecutionMonitor'

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="flex flex-col h-screen bg-corfoGray-10">
      {/* Monitor global de ejecuciones - monitorea desde cualquier página */}
      <ExecutionMonitor />
      
      {/* TopBar - debe estar arriba de todo */}
      <TopBar onMenuClick={handleMenuClick} />
      
      {/* Layout inferior con Sidebar y contenido */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
        
        {/* Contenido principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Área de contenido */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-corfoGray-10">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      
      {/* Contenedor de notificaciones toast */}
      <NotificationContainer />
    </div>
  )
}

export default AppLayout

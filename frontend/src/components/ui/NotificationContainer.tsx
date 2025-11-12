import React from 'react'
import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationToast } from './NotificationToast'

export const NotificationContainer: React.FC = () => {
  const { notifications } = useNotifications()

  // Mostrar solo las últimas 3 notificaciones no leídas
  // NO eliminar notificaciones cuando desaparecen, solo ocultarlas
  const recentNotifications = notifications
    .filter(n => !n.read)
    .slice(0, 3)

  if (recentNotifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse">
      {recentNotifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => {}} // No hacer nada cuando desaparece - el badge se mantiene
          duration={5000}
        />
      ))}
    </div>
  )
}


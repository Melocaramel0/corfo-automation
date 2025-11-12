import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'info'
  title: string
  message: string
  processId?: string
  processName?: string
  timestamp: Date
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, playSound?: boolean) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

// Flag simple global para evitar sonidos duplicados
let isSoundPlaying = false
let lastSoundTime = 0
const SOUND_COOLDOWN = 3000 // 3 segundos entre sonidos

const playNotificationSound = () => {
  const now = Date.now()
  
  // Si ya está reproduciéndose o no ha pasado el cooldown, no hacer nada
  if (isSoundPlaying || (now - lastSoundTime < SOUND_COOLDOWN)) {
    return
  }

  // Marcar como reproduciéndose inmediatamente
  isSoundPlaying = true
  lastSoundTime = now

  try {
    // Intentar archivo de sonido
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    
    audio.play().then(() => {
      audio.addEventListener('ended', () => {
        isSoundPlaying = false
      }, { once: true })
    }).catch(() => {
      // Si falla, usar Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
        
        setTimeout(() => {
          isSoundPlaying = false
        }, 300)
      } catch (error) {
        isSoundPlaying = false
      }
    })
  } catch (error) {
    isSoundPlaying = false
  }
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  // Cargar notificaciones desde localStorage al inicializar
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem('notifications')
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }))
      }
    } catch (error) {
      console.error('Error cargando notificaciones desde localStorage:', error)
    }
    return []
  })

  // Guardar notificaciones en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    } catch (error) {
      console.error('Error guardando notificaciones en localStorage:', error)
    }
  }, [notifications])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>, playSound: boolean = false) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev].slice(0, 50))

    // Reproducir sonido solo si se solicita
    if (playSound) {
      playNotificationSound()
    }
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

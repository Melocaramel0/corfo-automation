import React from 'react'
import clsx from 'clsx'
import { ProcessStatus, ValidationResult } from '../../types'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gray'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}

// Función para obtener el color según el estado del proceso
export const getProcessStatusBadge = (status: ProcessStatus): string => {
  switch (status) {
    case 'Creado':
      return 'badge-gray'
    case 'En configuración':
      return 'badge-warning'
    case 'Ejecutado':
      return 'badge-success'
    case 'Cerrado':
      return 'badge-info'
    case 'Anulado':
      return 'badge-error'
    case 'Borrado':
      return 'badge-gray'
    default:
      return 'badge-gray'
  }
}

// Función para obtener el color según el resultado de validación
export const getValidationResultBadge = (result: ValidationResult): string => {
  switch (result) {
    case 'OK':
      return 'badge-success'
    case 'FAIL':
      return 'badge-error'
    case 'WARN':
      return 'badge-warning'
    default:
      return 'badge-gray'
  }
}

const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  size = 'md', 
  children, 
  className 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  }
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }
  
  return (
    <span className={clsx(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </span>
  )
}

export { Badge }
export default Badge

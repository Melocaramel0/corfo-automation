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
    default: 'bg-corfoGray-20 text-corfoGray-80',
    success: 'bg-corfoAqua-25 text-corfoAqua-100',
    warning: 'bg-corfoYellow-25 text-corfoYellow-100',
    error: 'bg-corfoRed-20 text-corfoRed-500',
    info: 'bg-corfo-20 text-corfo-500',
    gray: 'bg-corfoGray-20 text-corfoGray-80',
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

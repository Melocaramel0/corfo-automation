import React from 'react'
import { HelpCircle } from 'lucide-react'
import clsx from 'clsx'

interface TourButtonProps {
  onClick: () => void
  className?: string
  variant?: 'default' | 'icon' | 'text'
  label?: string
}

export const TourButton: React.FC<TourButtonProps> = ({
  onClick,
  className,
  variant = 'default',
  label = 'Iniciar Tour',
}) => {
  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'p-2 rounded-lg hover:bg-corfoGray-20 text-corfoGray-60 hover:text-corfo-600 transition-colors',
          className
        )}
        title="Iniciar tour guiado"
        aria-label="Iniciar tour guiado"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    )
  }

  if (variant === 'text') {
    return (
      <button
        onClick={onClick}
        className={clsx(
          'text-sm text-corfo-600 hover:text-corfo-700 font-medium flex items-center space-x-1 transition-colors',
          className
        )}
        aria-label="Iniciar tour guiado"
      >
        <HelpCircle className="h-4 w-4" />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={clsx(
        'btn-secondary flex items-center space-x-2',
        className
      )}
      aria-label="Iniciar tour guiado"
    >
      <HelpCircle className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}


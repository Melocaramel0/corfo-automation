import React from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 className="h-6 w-6 text-corfoRed-500" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-corfoYellow-100" />
      default:
        return <AlertTriangle className="h-6 w-6 text-corfo-500" />
    }
  }

  const getIconBgColor = () => {
    switch (type) {
      case 'danger':
        return 'bg-corfoRed-20'
      case 'warning':
        return 'bg-corfoYellow-25'
      default:
        return 'bg-corfo-20'
    }
  }

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'btn-danger'
      case 'warning':
        return 'btn-primary'
      default:
        return 'btn-primary'
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-corfoGray-0 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start space-x-4">
                  <div className={`flex-shrink-0 rounded-full p-2 ${getIconBgColor()}`}>
                    {getIcon()}
                  </div>
                  
                  <div className="flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-corfoGray-90"
                    >
                      {title}
                    </Dialog.Title>
                    
                    <div className="mt-2">
                      <p className="text-sm text-corfoGray-60">
                        {message}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="flex-shrink-0 text-corfoGray-60 hover:text-corfoGray-80"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-6 flex space-x-3 justify-end">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {cancelText}
                  </button>
                  
                  <button
                    type="button"
                    className={`${getConfirmButtonClass()} disabled:opacity-50`}
                    onClick={onConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default ConfirmDialog

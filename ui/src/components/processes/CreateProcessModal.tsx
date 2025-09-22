import React, { useState, useEffect } from 'react'
import { X, ArrowLeft } from 'lucide-react'
import { ValidationProcess, ValidationRule, ProcessStatus } from '../../types'
import { processService } from '../../services/processes'

interface CreateProcessModalProps {
  process?: ValidationProcess | null
  onClose: () => void
  onSave: () => void
}

export const CreateProcessModal: React.FC<CreateProcessModalProps> = ({
  process,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    nombreConcurso: '',
    rutaFormulario: '',
    usuarioAcceso: '',
    passwordAcceso: '',
    reglasValidacion: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Cargar datos del proceso si es edición
  useEffect(() => {
    if (process) {
      setFormData({
        nombreConcurso: process.nombreConcurso,
        rutaFormulario: process.rutaFormulario,
        usuarioAcceso: process.credencialesAcceso?.usuario || '',
        passwordAcceso: process.credencialesAcceso?.password || '',
        reglasValidacion: process.reglas.map(rule => rule.promptIA || rule.nombreRegla).join('\n') || ''
      })
    }
  }, [process])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombreConcurso.trim()) {
      newErrors.nombreConcurso = 'El nombre del concurso es obligatorio'
    }

    if (!formData.rutaFormulario.trim()) {
      newErrors.rutaFormulario = 'La ruta del sistema de postulación es obligatoria'
    } else if (!formData.rutaFormulario.startsWith('http')) {
      newErrors.rutaFormulario = 'La ruta debe ser una URL válida'
    }

    if (!formData.usuarioAcceso.trim()) {
      newErrors.usuarioAcceso = 'El usuario de acceso es obligatorio'
    }

    if (!formData.passwordAcceso.trim()) {
      newErrors.passwordAcceso = 'La contraseña de acceso es obligatoria'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setLoading(true)

      // Procesar reglas de validación
      const rules: ValidationRule[] = formData.reglasValidacion
        .split('\n')
        .filter(rule => rule.trim())
        .map((rule, index) => ({
          id: `rule_${index + 1}`,
          nombreRegla: `Regla ${index + 1}`,
          campoObjetivo: 'campo_generico',
          tipoPrueba: 'custom_ia' as const,
          parametros: {},
          promptIA: rule.trim(),
          severidad: 'error' as const,
          activa: true
        }))

      const processData: Omit<ValidationProcess, 'id' | 'fechaCreacion' | 'usuarioCreacion'> = {
        nombreConcurso: formData.nombreConcurso,
        rutaFormulario: formData.rutaFormulario,
        credencialesAcceso: {
          usuario: formData.usuarioAcceso,
          password: formData.passwordAcceso
        },
        descripcion: `Proceso de validación para ${formData.nombreConcurso}`,
        estado: 'Creado' as ProcessStatus,
        reglas: rules,
        configuracion: {
          modoEjecucion: 'secuencial',
          tiempoMaxPorCampo: 30,
          reintentos: 3
        },
        fechaModificacion: new Date().toISOString()
      }

      if (process) {
        // Actualizar proceso existente
        await processService.updateProcess(process.id, processData)
      } else {
        // Crear nuevo proceso
        await processService.createProcess(processData)
      }

      onSave()
    } catch (error) {
      console.error('Error guardando proceso:', error)
      alert('Error al guardar el proceso')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {process ? 'Editar Concurso' : 'Crear Nuevo Concurso'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre del Concurso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Concurso
              </label>
              <input
                type="text"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent ${
                  errors.nombreConcurso ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.nombreConcurso}
                onChange={(e) => handleInputChange('nombreConcurso', e.target.value)}
                placeholder="Ej: Innovación Tecnológica 2025"
              />
              {errors.nombreConcurso && (
                <p className="mt-1 text-sm text-red-600">{errors.nombreConcurso}</p>
              )}
            </div>

            {/* Ruta del Sistema de Postulación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ruta del Sistema de Postulación
              </label>
              <input
                type="url"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent ${
                  errors.rutaFormulario ? 'border-red-300' : 'border-gray-300'
                }`}
                value={formData.rutaFormulario}
                onChange={(e) => handleInputChange('rutaFormulario', e.target.value)}
                placeholder="https://ejemplo.corfo.cl/concurso/abc"
              />
              {errors.rutaFormulario && (
                <p className="mt-1 text-sm text-red-600">{errors.rutaFormulario}</p>
              )}
            </div>

            {/* Credenciales de Acceso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuario de Acceso
                </label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent ${
                    errors.usuarioAcceso ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.usuarioAcceso}
                  onChange={(e) => handleInputChange('usuarioAcceso', e.target.value)}
                  placeholder="Usuario para el concurso"
                />
                {errors.usuarioAcceso && (
                  <p className="mt-1 text-sm text-red-600">{errors.usuarioAcceso}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña de Acceso
                </label>
                <input
                  type="password"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent ${
                    errors.passwordAcceso ? 'border-red-300' : 'border-gray-300'
                  }`}
                  value={formData.passwordAcceso}
                  onChange={(e) => handleInputChange('passwordAcceso', e.target.value)}
                  placeholder="Contraseña para el concurso"
                />
                {errors.passwordAcceso && (
                  <p className="mt-1 text-sm text-red-600">{errors.passwordAcceso}</p>
                )}
              </div>
            </div>

            {/* Reglas de Validación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reglas de Validación (Prompts/Instrucciones)
              </label>
              <textarea
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-transparent"
                value={formData.reglasValidacion}
                onChange={(e) => handleInputChange('reglasValidacion', e.target.value)}
                placeholder="Escriba aquí las reglas para el modelo de IA. Ej: 'Verificar que la descripción del proyecto tenga al menos 200 palabras y que no contenga lenguaje ofensivo. Asegurar que la categoría de innovación seleccionada coincida con la descripción proporcionada.'"
              />
              <p className="mt-2 text-sm text-gray-500">
                Escriba cada regla en una línea separada. Estas reglas se utilizarán para validar los campos del formulario.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : (process ? 'Guardar Concurso' : 'Crear Concurso')}
          </button>
        </div>
      </div>
    </div>
  )
}

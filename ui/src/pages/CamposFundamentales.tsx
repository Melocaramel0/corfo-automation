import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Edit, 
  Save, 
  X, 
  Plus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Power,
  PowerOff
} from 'lucide-react'
import { 
  camposFundamentalesService, 
  CamposFundamentalesData, 
  CategoriaFundamental,
  CampoFundamental 
} from '../services/camposFundamentales'
import { Badge } from '../components/ui/Badge'

export const CamposFundamentales: React.FC = () => {
  const [data, setData] = useState<CamposFundamentalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategorias, setExpandedCategorias] = useState<Set<string>>(new Set())
  const [editingField, setEditingField] = useState<{ categoria: string; nombre: string } | null>(null)
  const [editForm, setEditForm] = useState<Partial<CampoFundamental>>({})
  const [saving, setSaving] = useState(false)
  const [creatingField, setCreatingField] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState<{
    nombreLegible: string
    nombreJson: string
    tipo: string
    obligatorio: boolean
    descripcion: string
    esFundamental: boolean
    etiquetasReales: string[]
  }>({
    nombreLegible: '',
    nombreJson: '',
    tipo: 'text',
    obligatorio: false,
    descripcion: '',
    esFundamental: true,
    etiquetasReales: []
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoria: string; nombre: string } | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await camposFundamentalesService.getAll()
      setData(result)
      // Expandir todas las categorías por defecto
      if (result && result.categorias) {
        setExpandedCategorias(new Set(Object.keys(result.categorias)))
      }
    } catch (err: any) {
      console.error('Error cargando campos fundamentales:', err)
      setError(err.message || 'Error al cargar campos fundamentales')
    } finally {
      setLoading(false)
    }
  }

  const toggleCategoria = (categoria: string) => {
    const newExpanded = new Set(expandedCategorias)
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria)
    } else {
      newExpanded.add(categoria)
    }
    setExpandedCategorias(newExpanded)
  }

  const startEditing = (categoria: string, nombre: string, campo: CampoFundamental) => {
    setEditingField({ categoria, nombre })
    setEditForm({ ...campo })
  }

  const cancelEditing = () => {
    setEditingField(null)
    setEditForm({})
  }

  const saveField = async () => {
    if (!editingField || !data) return

    try {
      setSaving(true)
      await camposFundamentalesService.updateCampo(
        editingField.categoria,
        editingField.nombre,
        editForm
      )
      
      // Recargar datos desde el servidor
      await loadData()
      
      setSuccessMessage('Campo actualizado correctamente')
      setEditingField(null)
      setEditForm({})
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error guardando campo:', err)
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  // Funciones helper
  const generarNombreJSON = (nombreLegible: string): string => {
    return nombreLegible
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9\s]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
  }

  const generarDescripcion = (nombreLegible: string): string => {
    return nombreLegible
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Funciones para crear campos
  const startCreating = (categoria: string) => {
    setCreatingField(categoria)
    setCreateForm({
      nombreLegible: '',
      nombreJson: '',
      tipo: 'text',
      obligatorio: false,
      descripcion: '',
      esFundamental: true,
      etiquetasReales: []
    })
  }

  const cancelCreating = () => {
    setCreatingField(null)
    setCreateForm({
      nombreLegible: '',
      nombreJson: '',
      tipo: 'text',
      obligatorio: false,
      descripcion: '',
      esFundamental: true,
      etiquetasReales: []
    })
  }

  const handleNombreLegibleChange = (value: string) => {
    setCreateForm({
      ...createForm,
      nombreLegible: value,
      nombreJson: generarNombreJSON(value),
      descripcion: generarDescripcion(value)
    })
  }

  const saveNewField = async () => {
    if (!creatingField || !data) return

    // Validación
    if (!createForm.nombreJson.trim()) {
      alert('El nombre del campo es requerido')
      return
    }

    // Verificar duplicados
    if (data.categorias[creatingField].campos[createForm.nombreJson]) {
      alert('Ya existe un campo con ese nombre en esta categoría')
      return
    }

    try {
      setSaving(true)
      await camposFundamentalesService.createCampo(creatingField, {
        nombre: createForm.nombreJson,
        tipo: createForm.tipo,
        obligatorio: createForm.obligatorio,
        descripcion: createForm.descripcion,
        esFundamental: createForm.esFundamental,
        activo: true,
        etiquetasReales: createForm.etiquetasReales
      })

      // Recargar datos desde el servidor
      await loadData()
      
      setSuccessMessage('Campo creado correctamente')
      cancelCreating()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error creando campo:', err)
      alert(`Error al crear campo: ${err.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  // Funciones para eliminar campos
  const desactivarCampo = async (categoria: string, nombre: string) => {
    if (!confirm('¿Deseas desactivar este campo? (Podrás reactivarlo editándolo después)')) {
      return
    }

    try {
      await camposFundamentalesService.deleteCampo(categoria, nombre)
      await loadData()
      setSuccessMessage('Campo desactivado correctamente')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error desactivando campo:', err)
      alert(`Error al desactivar campo: ${err.message || 'Error desconocido'}`)
    }
  }

  const confirmarEliminacion = (categoria: string, nombre: string) => {
    setDeleteConfirm({ categoria, nombre })
  }

  const cancelarEliminacion = () => {
    setDeleteConfirm(null)
  }

  const eliminarCampoPermanente = async () => {
    if (!deleteConfirm || !data) return

    try {
      await camposFundamentalesService.deleteCampoPermanente(deleteConfirm.categoria, deleteConfirm.nombre)
      await loadData()
      setSuccessMessage('Campo eliminado permanentemente')
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error eliminando campo:', err)
      alert(`Error al eliminar campo: ${err.message || 'Error desconocido'}`)
    }
  }

  const agregarEtiqueta = () => {
    const etiqueta = prompt('Ingresa la etiqueta:')
    if (etiqueta && etiqueta.trim()) {
      setCreateForm({
        ...createForm,
        etiquetasReales: [...createForm.etiquetasReales, etiqueta.trim()]
      })
    }
  }

  const eliminarEtiqueta = (index: number) => {
    setCreateForm({
      ...createForm,
      etiquetasReales: createForm.etiquetasReales.filter((_, i) => i !== index)
    })
  }

  const filteredCategorias = () => {
    if (!data || !searchTerm) return data?.categorias || {}

    const term = searchTerm.toLowerCase()
    const filtered: { [key: string]: CategoriaFundamental } = {}

    Object.entries(data.categorias).forEach(([catKey, categoria]) => {
      const camposFiltrados: { [key: string]: CampoFundamental } = {}
      
      Object.entries(categoria.campos).forEach(([campoKey, campo]) => {
        const matchCampo = 
          campoKey.toLowerCase().includes(term) ||
          campo.descripcion?.toLowerCase().includes(term) ||
          campo.etiquetasReales?.some(et => et.toLowerCase().includes(term))
        
        if (matchCampo) {
          camposFiltrados[campoKey] = campo
        }
      })

      if (Object.keys(camposFiltrados).length > 0 || categoria.nombre.toLowerCase().includes(term)) {
        filtered[catKey] = {
          ...categoria,
          campos: Object.keys(camposFiltrados).length > 0 ? camposFiltrados : categoria.campos
        }
      }
    })

    return filtered
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corfo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const categorias = filteredCategorias()
  const totalCampos = Object.values(data.categorias).reduce(
    (sum, cat) => sum + Object.keys(cat.campos).length, 
    0
  )
  const camposFundamentales = Object.values(data.categorias).reduce(
    (sum, cat) => sum + Object.values(cat.campos).filter(c => c.esFundamental).length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campos Fundamentales CORFO</h1>
          <p className="text-gray-600 mt-1">
            Gestiona y edita los campos fundamentales requeridos para formularios CORFO
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Campos</p>
              <p className="text-2xl font-bold text-gray-900">{totalCampos}</p>
            </div>
            <FileText className="h-8 w-8 text-corfo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Campos Fundamentales</p>
              <p className="text-2xl font-bold text-corfo-600">{camposFundamentales}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-corfo-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categorías</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(data.categorias).length}</p>
            </div>
            <FileText className="h-8 w-8 text-corfo-600" />
          </div>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campos por nombre, descripción o etiquetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500 focus:border-corfo-500"
          />
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="space-y-4">
        {Object.entries(categorias).map(([catKey, categoria]) => {
          const isExpanded = expandedCategorias.has(catKey)
          const camposKeys = Object.keys(categoria.campos)
          const camposFundamentalesCount = Object.values(categoria.campos).filter(c => c.esFundamental).length

          return (
            <div key={catKey} className="bg-white rounded-lg shadow">
              {/* Header de categoría */}
              <div className="px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => toggleCategoria(catKey)}
                  className="flex items-center space-x-3 flex-1 hover:bg-gray-50 -mx-6 px-6 py-4 transition-colors rounded-l-lg"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{categoria.nombre}</h3>
                    <p className="text-sm text-gray-600">{categoria.descripcion}</p>
                  </div>
                </button>
                <div className="flex items-center space-x-4">
                  <Badge variant="info">
                    {camposKeys.length} campos
                  </Badge>
                  {camposFundamentalesCount > 0 && (
                    <Badge variant="success">
                      {camposFundamentalesCount} fundamentales
                    </Badge>
                  )}
                  {!categoria.activo && (
                    <Badge variant="warning">Inactiva</Badge>
                  )}
                  {isExpanded && !creatingField && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startCreating(catKey)
                      }}
                      className="ml-2 px-3 py-1.5 bg-corfo-600 text-white text-sm rounded-lg hover:bg-corfo-700 transition-colors flex items-center space-x-1.5"
                      title="Agregar campo"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Agregar Campo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Campos de la categoría */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {creatingField === catKey && (
                    <div className="px-6 py-6 border-b border-gray-200 bg-blue-50">
                      <h4 className="font-semibold text-gray-900 mb-4">Agregar Nuevo Campo</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre Legible (como en campos_corfo.txt)
                          </label>
                          <input
                            type="text"
                            value={createForm.nombreLegible}
                            onChange={(e) => handleNombreLegibleChange(e.target.value)}
                            placeholder="Ej: RUT PERSONA JURIDICA"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre JSON (generado automáticamente, editable)
                          </label>
                          <input
                            type="text"
                            value={createForm.nombreJson}
                            onChange={(e) => setCreateForm({ ...createForm, nombreJson: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                            placeholder="Ej: RUT_PERSONA_JURIDICA"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tipo
                            </label>
                            <select
                              value={createForm.tipo}
                              onChange={(e) => setCreateForm({ ...createForm, tipo: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                            >
                              <option value="text">text</option>
                              <option value="textarea">textarea</option>
                              <option value="select">select</option>
                              <option value="checkbox">checkbox</option>
                              <option value="number">number</option>
                              <option value="date">date</option>
                              <option value="email">email</option>
                              <option value="tel">tel</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Obligatorio
                            </label>
                            <select
                              value={createForm.obligatorio.toString()}
                              onChange={(e) => setCreateForm({ ...createForm, obligatorio: e.target.value === 'true' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                            >
                              <option value="false">No</option>
                              <option value="true">Sí</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción (generada automáticamente, editable)
                          </label>
                          <textarea
                            value={createForm.descripcion}
                            onChange={(e) => setCreateForm({ ...createForm, descripcion: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`create-fundamental-${catKey}`}
                            checked={createForm.esFundamental}
                            onChange={(e) => setCreateForm({ ...createForm, esFundamental: e.target.checked })}
                            className="h-4 w-4 text-corfo-600 focus:ring-corfo-500"
                          />
                          <label htmlFor={`create-fundamental-${catKey}`} className="text-sm text-gray-700">
                            Campo Fundamental
                          </label>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Etiquetas Reales (opcional)
                          </label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {createForm.etiquetasReales.map((etiqueta, idx) => (
                              <Badge key={idx} variant="gray" className="text-xs flex items-center space-x-1">
                                <span>{etiqueta}</span>
                                <button
                                  onClick={() => eliminarEtiqueta(idx)}
                                  className="hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <button
                            onClick={agregarEtiqueta}
                            className="text-sm text-corfo-600 hover:text-corfo-700 flex items-center space-x-1"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Agregar etiqueta</span>
                          </button>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelCreating}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <X className="h-4 w-4 inline mr-1" />
                            Cancelar
                          </button>
                          <button
                            onClick={saveNewField}
                            disabled={saving || !createForm.nombreJson.trim()}
                            className="px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors disabled:opacity-50"
                          >
                            <Save className="h-4 w-4 inline mr-1" />
                            {saving ? 'Guardando...' : 'Crear Campo'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {camposKeys.length === 0 && !creatingField ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No hay campos en esta categoría
                      <button
                        onClick={() => startCreating(catKey)}
                        className="mt-4 block mx-auto px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Agregar Campo</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {camposKeys.map((campoKey) => {
                        const campo = categoria.campos[campoKey]
                        const isEditing = editingField?.categoria === catKey && editingField?.nombre === campoKey

                        return (
                          <div key={campoKey} className="px-6 py-4 hover:bg-gray-50">
                            {isEditing ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Tipo
                                    </label>
                                    <select
                                      value={editForm.tipo || ''}
                                      onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                                    >
                                      <option value="text">text</option>
                                      <option value="textarea">textarea</option>
                                      <option value="select">select</option>
                                      <option value="checkbox">checkbox</option>
                                      <option value="number">number</option>
                                      <option value="date">date</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Obligatorio
                                    </label>
                                    <select
                                      value={editForm.obligatorio?.toString() || 'false'}
                                      onChange={(e) => setEditForm({ ...editForm, obligatorio: e.target.value === 'true' })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                                    >
                                      <option value="true">Sí</option>
                                      <option value="false">No</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción
                                  </label>
                                  <textarea
                                    value={editForm.descripcion || ''}
                                    onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-corfo-500"
                                    rows={3}
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`fundamental-${campoKey}`}
                                    checked={editForm.esFundamental || false}
                                    onChange={(e) => setEditForm({ ...editForm, esFundamental: e.target.checked })}
                                    className="h-4 w-4 text-corfo-600 focus:ring-corfo-500"
                                  />
                                  <label htmlFor={`fundamental-${campoKey}`} className="text-sm text-gray-700">
                                    Campo Fundamental
                                  </label>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={cancelEditing}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    <X className="h-4 w-4 inline mr-1" />
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={saveField}
                                    disabled={saving}
                                    className="px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors disabled:opacity-50"
                                  >
                                    <Save className="h-4 w-4 inline mr-1" />
                                    {saving ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <h4 className="font-medium text-gray-900">{campoKey}</h4>
                                    {campo.esFundamental && (
                                      <Badge variant="success">Fundamental</Badge>
                                    )}
                                    {campo.obligatorio && (
                                      <Badge variant="warning">Obligatorio</Badge>
                                    )}
                                    <Badge variant="info">{campo.tipo}</Badge>
                                    {!campo.activo && (
                                      <Badge variant="gray">Inactivo</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{campo.descripcion}</p>
                                  {campo.etiquetasReales && campo.etiquetasReales.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-500 mb-1">Etiquetas encontradas:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {campo.etiquetasReales.map((etiqueta, idx) => (
                                          <Badge key={idx} variant="gray" className="text-xs">
                                            {etiqueta}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {campo.numeroReferencia && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Ref: {campo.numeroReferencia}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => startEditing(catKey, campoKey, campo)}
                                    className="px-3 py-2 text-corfo-600 hover:bg-corfo-50 rounded-lg transition-colors"
                                    title="Editar"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  {campo.activo ? (
                                    <button
                                      onClick={() => desactivarCampo(catKey, campoKey)}
                                      className="px-3 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                      title="Desactivar"
                                    >
                                      <PowerOff className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await camposFundamentalesService.updateCampo(catKey, campoKey, { activo: true })
                                          await loadData()
                                          setSuccessMessage('Campo activado correctamente')
                                          setTimeout(() => setSuccessMessage(null), 3000)
                                        } catch (err: any) {
                                          alert(`Error al activar campo: ${err.message || 'Error desconocido'}`)
                                        }
                                      }}
                                      className="px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Activar"
                                    >
                                      <Power className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => confirmarEliminacion(catKey, campoKey)}
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar permanentemente"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {!creatingField && (
                        <div className="px-6 py-4 border-t border-gray-200">
                          <button
                            onClick={() => startCreating(catKey)}
                            className="w-full px-4 py-2 bg-corfo-600 text-white rounded-lg hover:bg-corfo-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Agregar Campo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ¿Eliminar permanentemente?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. El campo <strong>{deleteConfirm.nombre}</strong> será eliminado permanentemente del sistema.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelarEliminacion}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarCampoPermanente}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 inline mr-1" />
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <p>
          <strong>Última modificación:</strong> {new Date(data.metadatos.ultimaModificacion).toLocaleString()}
        </p>
        <p>
          <strong>Versión:</strong> {data.metadatos.version}
        </p>
        <p>
          <strong>Fuente:</strong> {data.metadatos.fuente}
        </p>
      </div>
    </div>
  )
}


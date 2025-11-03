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
  FileText
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
      
      // Actualizar datos locales
      const updatedData = { ...data }
      updatedData.categorias[editingField.categoria].campos[editingField.nombre] = {
        ...updatedData.categorias[editingField.categoria].campos[editingField.nombre],
        ...editForm
      }
      setData(updatedData)
      
      setEditingField(null)
      setEditForm({})
    } catch (err: any) {
      console.error('Error guardando campo:', err)
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
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
              <button
                onClick={() => toggleCategoria(catKey)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{categoria.nombre}</h3>
                    <p className="text-sm text-gray-600">{categoria.descripcion}</p>
                  </div>
                </div>
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
                </div>
              </button>

              {/* Campos de la categoría */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {camposKeys.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No hay campos en esta categoría
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
                                <button
                                  onClick={() => startEditing(catKey, campoKey, campo)}
                                  className="ml-4 px-3 py-2 text-corfo-600 hover:bg-corfo-50 rounded-lg transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

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


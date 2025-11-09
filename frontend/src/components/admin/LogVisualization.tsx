import { useEffect, useState } from 'react'
import { SystemLog, LogFilters, PaginationParams } from '../../types'
import { adminService } from '../../services/admin'
import { Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

export function LogVisualization() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 10,
    search: '',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  const [filters, setFilters] = useState<LogFilters>({
    dateFrom: '',
    dateTo: '',
    user: '',
    action: '',
    contest: ''
  })

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await adminService.getSystemLogs(pagination, filters)
      setLogs(response.data)
      setTotal(response.total)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination, filters])

  const handleSearch = (searchTerm: string) => {
    setPagination(prev => ({ ...prev, search: searchTerm, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const filename = await adminService.exportLogs(filters)
      // Aquí podrías mostrar un toast de éxito con el nombre del archivo
      console.log('Archivo exportado:', filename)
    } catch (error) {
      console.error('Error exporting logs:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      user: '',
      action: '',
      contest: ''
    })
    setPagination(prev => ({ ...prev, page: 1, search: '' }))
  }

  const totalPages = Math.ceil(total / pagination.limit)

  return (
    <div className="bg-corfoGray-0 rounded-lg shadow-sm border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-corfoGray-90">
              Visualización de Logs
            </h2>
            <p className="text-corfoGray-60 mt-1">
              Historial de acciones del sistema.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-corfoGray-80 bg-corfoGray-0 border border-corfoGray-40 rounded-md hover:bg-corfoGray-10"
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white bg-corfo-500 border border-transparent rounded-md hover:bg-corfo-600 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Exportando...' : 'Exportar'}</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mb-6 p-4 bg-corfoGray-10 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-corfoGray-80 mb-1">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-corfoGray-80 mb-1">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-corfoGray-80 mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  placeholder="admin, qa-user..."
                  value={filters.user || ''}
                  onChange={(e) => handleFilterChange('user', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-corfoGray-80 mb-1">
                  Acción
                </label>
                <input
                  type="text"
                  placeholder="Creación, Validación..."
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-corfoGray-80 mb-1">
                  Concurso
                </label>
                <input
                  type="text"
                  placeholder="Nombre del concurso..."
                  value={filters.contest || ''}
                  onChange={(e) => handleFilterChange('contest', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm font-medium text-corfoGray-80 bg-corfoGray-0 border border-corfoGray-40 rounded-md hover:bg-corfoGray-10"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Búsqueda */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-corfoGray-60 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={pagination.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-corfoGray-40 rounded-md focus:outline-none focus:ring-2 focus:ring-corfo-500"
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-corfoGray-20">
            <thead className="bg-corfoGray-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  Concurso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-corfoGray-60 uppercase tracking-wider">
                  IP/Host
                </th>
              </tr>
            </thead>
            <tbody className="bg-corfoGray-0 divide-y divide-corfoGray-20">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-corfoGray-40 rounded animate-pulse"></div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-corfoGray-60">
                    No se encontraron logs
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-corfoGray-10">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-corfoGray-90">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-corfoGray-60 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-60">
                      {log.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-60">
                      {log.user}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-60">
                      {log.contest}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-corfoGray-60">
                      {log.ipHost}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!loading && logs.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-corfoGray-80">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
              {Math.min(pagination.page * pagination.limit, total)} de {total} resultados
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-corfoGray-60 hover:text-corfoGray-60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-sm text-corfoGray-80">
                Página {pagination.page} de {totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="p-2 text-corfoGray-60 hover:text-corfoGray-60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

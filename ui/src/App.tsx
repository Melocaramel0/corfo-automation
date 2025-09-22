// React import is needed for JSX
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginForm from './components/auth/LoginForm'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Dashboard from './pages/Dashboard'
import { ValidationProcesses } from './pages/ValidationProcesses'
import { Administration } from './pages/Administration'

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corfo-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Ruta de login */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />
        } 
      />
      
      {/* Rutas protegidas */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } 
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        
        {/* Procesos de validación */}
        <Route path="processes" element={<ValidationProcesses />} />
        
        {/* Administración (solo Admin) */}
        <Route 
          path="admin/*" 
          element={
            <ProtectedRoute requiredPermission="view_admin" fallbackPath="/">
              <Administration />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatRut, validateRut, getRutErrorMessage } from '../../utils/rut'

// Schema de validación con Zod
const loginSchema = z.object({
  rut: z.string()
    .min(1, 'El RUT es obligatorio')
    .refine(validateRut, 'El RUT ingresado no es válido'),
  password: z.string()
    .min(1, 'La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const rutValue = watch('rut')

  // Manejar formato del RUT mientras se escribe
  const handleRutChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const formattedRut = formatRut(value)
    setValue('rut', formattedRut)
  }

  // Manejar envío del formulario
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data)
    } catch (error) {
      // El error ya se maneja en el contexto con toast
      console.error('Login error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-corfo-100 to-corfo-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center">
            <img 
              src="/images/Logo_Corfo.png" 
              alt="CORFO Logo" 
              className="h-16 object-contain"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-corfoGray-90">
            Sistema CORFO
          </h2>
          <p className="mt-2 text-sm text-corfoGray-60">
            Validador de Formularios
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="card">
            <div className="space-y-4">
              {/* Campo RUT */}
              <div>
                <label htmlFor="rut" className="label">
                  RUT
                </label>
                <input
                  {...register('rut')}
                  type="text"
                  id="rut"
                  placeholder="12345678-9"
                  className={`input ${errors.rut ? 'input-error' : ''}`}
                  onChange={handleRutChange}
                  maxLength={12}
                />
                {errors.rut && (
                  <p className="mt-1 text-sm text-corfoRed-500">
                    {errors.rut.message}
                  </p>
                )}
              </div>

              {/* Campo Contraseña */}
              <div>
                <label htmlFor="password" className="label">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    placeholder="Ingresa tu contraseña"
                    className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-corfoGray-60" />
                    ) : (
                      <Eye className="h-5 w-5 text-corfoGray-60" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-corfoRed-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* Botón de envío */}
            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginForm

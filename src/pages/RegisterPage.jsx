import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    const { data, error } = await signUp(email, password)
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    if (data.session) {
      navigate('/dashboard', { replace: true })
      return
    }
    setSuccess(true)
    setMessage(
      'Revisa tu correo para confirmar la cuenta si tu proyecto Supabase lo requiere.'
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Crear cuenta</h1>
        <p className="mt-1 text-sm text-stone-600">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-stone-700">
            Contraseña
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </div>
        {message && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              success ? 'bg-brand-50 text-brand-900' : 'bg-red-50 text-red-800'
            }`}
          >
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creando…' : 'Registrarme'}
        </button>
      </form>
    </div>
  )
}

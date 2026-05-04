import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { safeInternalPath } from '../utils/safeInternalPath'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = safeInternalPath(location.state?.from?.pathname)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) {
      setMessage(error.message)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Entrar</h1>
        <p className="mt-1 text-sm text-stone-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </div>
        {message && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

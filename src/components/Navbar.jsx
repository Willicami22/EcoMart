import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-brand-100 text-brand-900'
      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { itemCount } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-brand-900">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            E
          </span>
          <span>EcoMart</span>
        </Link>

        <nav className="flex flex-1 items-center justify-end gap-1 sm:justify-center sm:gap-2">
          <NavLink to="/" className={linkClass} end>
            Tienda
          </NavLink>
          <NavLink to="/cart" className={linkClass}>
            Carrito
            {itemCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs text-white">
                {itemCount}
              </span>
            )}
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={linkClass}>
              Panel
            </NavLink>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Salir
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:inline"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
              >
                Registro
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

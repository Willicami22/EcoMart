import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { createOrder } from '../services/ordersApi'
import { formatCurrency } from '../utils/formatCurrency'

export default function CartPage() {
  const location = useLocation()
  const { user } = useAuth()
  const { lines, removeItem, setQuantity, clearCart, total } = useCart()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutMsg, setCheckoutMsg] = useState(null)

  async function handleCheckout() {
    if (!user) {
      setCheckoutMsg('Debes iniciar sesión para finalizar el pedido.')
      return
    }
    if (lines.length === 0) return
    setCheckoutMsg(null)
    setCheckoutLoading(true)
    const payload = lines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
    }))
    const { error } = await createOrder(payload)
    setCheckoutLoading(false)
    if (error) {
      setCheckoutMsg(error.message ?? 'No se pudo crear el pedido.')
      return
    }
    clearCart()
    setCheckoutMsg('¡Pedido registrado! Puedes verlo en tu panel.')
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
        <p className="text-stone-600">Tu carrito está vacío.</p>
        <Link
          to="/"
          className="mt-4 inline-block font-medium text-brand-700 hover:underline"
        >
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-stone-900">Carrito</h1>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {lines.map(({ product, quantity }) => (
          <li
            key={product.id}
            className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div>
                <p className="font-medium text-stone-900">{product.name}</p>
                <p className="text-sm text-stone-500">{product.category}</p>
                <p className="mt-1 text-brand-800">
                  {formatCurrency(Number(product.price))}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(product.id, e.target.value)}
                className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-center text-sm"
                aria-label="Cantidad"
              />
              <button
                type="button"
                onClick={() => removeItem(product.id)}
                className="text-sm text-red-600 hover:underline"
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold text-stone-900">
          Total:{' '}
          <span className="text-brand-800">{formatCurrency(total)}</span>
        </p>
        <div className="flex flex-col gap-2 sm:items-end">
          {!user && (
            <p className="text-sm text-stone-600">
              <Link
                to="/login"
                state={{ from: location }}
                className="font-medium text-brand-700 hover:underline"
              >
                Inicia sesión
              </Link>{' '}
              para confirmar el pedido.
            </p>
          )}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading || !user}
            className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading ? 'Procesando…' : 'Simular pedido (Supabase)'}
          </button>
          {checkoutMsg && (
            <p className="text-sm text-stone-700">{checkoutMsg}</p>
          )}
        </div>
      </div>
    </div>
  )
}

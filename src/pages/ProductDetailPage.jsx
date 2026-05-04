import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useCart } from '../context/CartContext'
import { fetchProductById } from '../services/productsApi'
import { formatCurrency } from '../utils/formatCurrency'

export default function ProductDetailPage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let cancelled = false
    if (!id) return undefined
    fetchProductById(id).then(({ data, error: err }) => {
      if (cancelled) return
      if (err) setError(err.message ?? 'Error')
      else {
        setError(null)
        setProduct(data)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-10" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
        <p className="text-stone-700">No encontramos este producto.</p>
        <Link to="/" className="mt-4 inline-block text-brand-700 hover:underline">
          Volver a la tienda
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="aspect-square w-full object-cover"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-stone-400">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-brand-700">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold text-stone-900">{product.name}</h1>
          <p className="mt-4 text-2xl font-semibold text-brand-800">
            {formatCurrency(Number(product.price))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="qty" className="text-sm text-stone-600">
            Cantidad
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 rounded-lg border border-stone-200 px-3 py-2 text-center"
          />
          <button
            type="button"
            onClick={() => addItem(product, qty)}
            className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Añadir al carrito
          </button>
        </div>
        <Link to="/" className="text-sm text-brand-700 hover:underline">
          ← Seguir comprando
        </Link>
      </div>
    </div>
  )
}

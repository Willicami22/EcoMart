import { useEffect, useState } from 'react'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { fetchOrdersWithItems } from '../services/ordersApi'
import { formatCurrency } from '../utils/formatCurrency'

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [itemsByOrderId, setItemsByOrderId] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user?.id) return undefined
    let cancelled = false
    fetchOrdersWithItems(user.id).then(({ data, error: err, itemsByOrderId: map }) => {
      if (cancelled) return
      if (err) setError(err.message ?? 'Error al cargar pedidos')
      else {
        setError(null)
        setOrders(data ?? [])
        setItemsByOrderId(map ?? {})
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Tu panel</h1>
        <p className="mt-1 text-stone-600">
          Sesión: <span className="font-medium">{user?.email}</span>
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-stone-900">Mis pedidos</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="size-10" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-red-700">{error}</p>
        ) : orders.length === 0 ? (
          <p className="mt-4 text-stone-600">Aún no tienes pedidos registrados.</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {orders.map((order) => {
              const items = itemsByOrderId[order.id] ?? []
              return (
                <li
                  key={order.id}
                  className="rounded-xl border border-stone-100 bg-stone-50/80 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-stone-500">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="font-semibold text-brand-800">
                      {formatCurrency(Number(order.total))}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-stone-700">
                    {items.map((row) => {
                      const name =
                        row.products?.name ?? row.products?.[0]?.name ?? 'Producto'
                      const lineTotal =
                        Number(row.unit_price) * Number(row.quantity)
                      return (
                        <li key={row.id}>
                          {name} × {row.quantity}
                          {Number.isFinite(lineTotal) ? (
                            <span className="text-stone-500">
                              {' '}
                              ({formatCurrency(lineTotal)})
                            </span>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'
import { useProducts } from '../hooks/useProducts'

export default function HomePage() {
  const { products, loading, error, categories } = useProducts()
  const [category, setCategory] = useState('Todas')

  const filtered = useMemo(() => {
    if (category === 'Todas') return products
    return products.filter((p) => p.category === category)
  }, [products, category])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Spinner className="size-10" />
        <p className="text-stone-600">Cargando catálogo…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p className="font-medium">No se pudieron cargar los productos.</p>
        <p className="mt-2 text-sm">{error}</p>
        <p className="mt-2 text-sm">
          Revisa las variables de entorno de Supabase y que la tabla{' '}
          <code className="rounded bg-red-100 px-1">products</code> exista con
          RLS de lectura.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Productos sostenibles
        </h1>
        <p className="text-stone-600">
          Selección curada con materiales responsables y envases reutilizables.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-500">Categoría:</span>
        <button
          type="button"
          onClick={() => setCategory('Todas')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            category === 'Todas'
              ? 'bg-brand-600 text-white'
              : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
          }`}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === c
                ? 'bg-brand-600 text-white'
                : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-500">No hay productos en esta categoría.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

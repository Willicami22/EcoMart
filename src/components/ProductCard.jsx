import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/formatCurrency'

/** @param {{ product: object }} props */
export default function ProductCard({ product }) {
  const { addItem } = useCart()

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md">
      <Link to={`/products/${product.id}`} className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">
            Sin imagen
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-brand-800 shadow-sm">
          {product.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link to={`/products/${product.id}`}>
          <h2 className="font-semibold text-stone-900 hover:text-brand-700">
            {product.name}
          </h2>
        </Link>
        <p className="text-lg font-medium text-brand-700">
          {formatCurrency(Number(product.price))}
        </p>
        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => addItem(product, 1)}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Añadir
          </button>
          <Link
            to={`/products/${product.id}`}
            className="rounded-xl border border-stone-200 px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Ver
          </Link>
        </div>
      </div>
    </article>
  )
}

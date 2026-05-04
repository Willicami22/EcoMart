import { useEffect, useMemo, useState } from 'react'
import { fetchProducts } from '../services/productsApi'

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchProducts().then(({ data, error: err }) => {
      if (cancelled) return
      if (err) setError(err.message ?? 'Error al cargar productos')
      else {
        setError(null)
        setProducts(data ?? [])
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean))
    return Array.from(set).sort()
  }, [products])

  return { products, loading, error, categories }
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { CART_STORAGE_KEY } from '../utils/constants'

/** @typedef {{ id: string, name: string, price: number, image_url: string | null, category: string }} CartProduct */

/**
 * @typedef {object} CartLine
 * @property {CartProduct} product
 * @property {number} quantity
 */

function readStoredCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() =>
    typeof window === 'undefined' ? [] : readStoredCart()
  )

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
  }, [lines])

  const addItem = useCallback((product, quantity = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === product.id)
      if (i === -1) {
        return [...prev, { product, quantity }]
      }
      const next = [...prev]
      next[i] = {
        ...next[i],
        quantity: next[i].quantity + quantity,
      }
      return next
    })
  }, [])

  const removeItem = useCallback((productId) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId))
  }, [])

  const setQuantity = useCallback((productId, quantity) => {
    const q = Math.max(0, Math.floor(Number(quantity)) || 0)
    setLines((prev) => {
      if (q <= 0) return prev.filter((l) => l.product.id !== productId)
      return prev.map((l) =>
        l.product.id === productId ? { ...l, quantity: q } : l
      )
    })
  }, [])

  const clearCart = useCallback(() => setLines([]), [])

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => sum + Number(l.product.price) * l.quantity, 0),
    [lines]
  )

  const itemCount = useMemo(
    () => lines.reduce((n, l) => n + l.quantity, 0),
    [lines]
  )

  const value = useMemo(
    () => ({
      lines,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      total,
      itemCount,
    }),
    [lines, addItem, removeItem, setQuantity, clearCart, total, itemCount]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return ctx
}

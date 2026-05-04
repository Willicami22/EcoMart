const DEFAULT = '/dashboard'

const ALLOWED_EXACT = new Set([
  '/',
  '/cart',
  '/dashboard',
  '/login',
  '/register',
])

/**
 * Evita redirección abierta tras login (rutas externas o //).
 * @param {unknown} pathname
 * @returns {string}
 */
export function safeInternalPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return DEFAULT
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return DEFAULT
  if (ALLOWED_EXACT.has(pathname)) return pathname
  if (/^\/products\/[^/]+$/.test(pathname)) return pathname
  return DEFAULT
}

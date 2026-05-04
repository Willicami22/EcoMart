export default function Spinner({ className = '' }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent ${className}`}
    />
  )
}

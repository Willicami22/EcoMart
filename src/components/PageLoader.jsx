import Spinner from './Spinner'

export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-stone-600">
      <Spinner />
      <p className="text-sm">Cargando…</p>
    </div>
  )
}

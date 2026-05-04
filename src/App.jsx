import { Suspense } from 'react'
import PageLoader from './components/PageLoader.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
    </Suspense>
  )
}

import { lazy } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import ProtectedRoute from '../components/ProtectedRoute.jsx'

const HomePage = lazy(() => import('../pages/HomePage.jsx'))
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage.jsx'))
const CartPage = lazy(() => import('../pages/CartPage.jsx'))
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'))
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'))

function ProductDetailRoute() {
  const { id } = useParams()
  return <ProductDetailPage key={id} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products/:id" element={<ProductDetailRoute />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

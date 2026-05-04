import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
        EcoMart — comercio consciente · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const missing = !supabaseUrl || !supabaseAnonKey

if (missing && import.meta.env.PROD) {
  throw new Error(
    '[EcoMart] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY (variables de entorno en build).'
  )
}

if (missing) {
  console.warn(
    '[EcoMart] Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

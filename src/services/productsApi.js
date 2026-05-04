import { supabase } from './supabaseClient'

/** @returns {Promise<{ data: object[] | null, error: object | null }>} */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,price,image_url,category')
    .order('name')

  return { data, error }
}

/**
 * @param {string} id
 */
export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,price,image_url,category')
    .eq('id', id)
    .maybeSingle()

  return { data, error }
}

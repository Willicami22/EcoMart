import { supabase } from './supabaseClient'

/**
 * Crea el pedido en el servidor: total y precios unitarios salen de `products`.
 * @param {{ productId: string, quantity: number }[]} lines
 */
export async function createOrder(lines) {
  const items = lines.map((l) => ({
    product_id: l.productId,
    quantity: l.quantity,
  }))

  const { data: orderId, error } = await supabase.rpc('create_order_from_cart', {
    items,
  })

  if (error || orderId == null) {
    return { data: null, error }
  }

  return { data: { orderId }, error: null }
}

/** @param {string} userId */
export async function fetchOrdersWithItems(userId) {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id,total,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (ordersError || !orders?.length) {
    return { data: orders ?? [], error: ordersError, itemsByOrderId: {} }
  }

  const ids = orders.map((o) => o.id)
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id,order_id,product_id,quantity,unit_price, products(name)')
    .in('order_id', ids)

  if (itemsError) {
    return { data: orders, error: itemsError, itemsByOrderId: {} }
  }

  /** @type {Record<string, object[]>} */
  const itemsByOrderId = {}
  for (const row of items ?? []) {
    const key = row.order_id
    if (!itemsByOrderId[key]) itemsByOrderId[key] = []
    itemsByOrderId[key].push(row)
  }

  return { data: orders, error: null, itemsByOrderId }
}

import type { AdminOrder, AdminOrderStatus, AdminPost, AdminReview, AdminReviewStatus, StoreSettings } from './adminData'
import { defaultStoreSettings } from './adminData'
import type { CatalogProduct } from './catalog'
import type { Product } from './data'
import { requireSupabase } from './supabaseClient'
import type { AccountActivity, AdminSnapshot, CartInput, CartSnapshot, StorefrontSnapshot } from './storeApi'

type Row = Record<string, unknown>

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback)
}

function jsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed as T[] : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

function productFromRow(row: Row): CatalogProduct {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    summary: String(row.summary ?? ''),
    description: String(row.description ?? ''),
    price: Number(row.price ?? 0),
    compareAtPrice: Number(row.compare_at_price ?? 0),
    stock: Number(row.stock ?? 0),
    status: row.status as CatalogProduct['status'],
    featured: Boolean(row.featured),
    art: row.art as CatalogProduct['art'],
    palette: jsonArray<string>(row.palette_json, ['#f3eee6', '#ddd0bf']).slice(0, 2) as [string, string],
    accent: String(row.accent ?? '#7a5e45'),
    imageUrl: String(row.image_url ?? ''),
    options: jsonArray<string>(row.options_json, []),
    details: jsonArray<string>(row.details_json, []),
    createdAt: String(row.created_at),
  }
}

function productToRow(product: CatalogProduct) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    summary: product.summary,
    description: product.description,
    price: Math.round(product.price),
    compare_at_price: Math.round(product.compareAtPrice),
    stock: Math.max(0, Math.round(product.stock)),
    status: product.status,
    featured: product.featured,
    art: product.art,
    palette_json: product.palette,
    accent: product.accent,
    image_url: product.imageUrl || null,
    options_json: product.options,
    details_json: product.details,
    created_at: product.createdAt,
    updated_at: new Date().toISOString(),
  }
}

function postFromRow(row: Row): AdminPost {
  return {
    id: String(row.id),
    title: String(row.title),
    category: row.category as AdminPost['category'],
    excerpt: String(row.excerpt ?? ''),
    content: String(row.content ?? ''),
    status: row.status as AdminPost['status'],
    pinned: Boolean(row.pinned),
    coverImage: String(row.cover_image ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function postToRow(post: AdminPost) {
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    excerpt: post.excerpt,
    content: post.content,
    status: post.status,
    pinned: post.pinned,
    cover_image: post.coverImage || null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  }
}

function orderFromRow(row: Row): AdminOrder {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    option: String(row.option_name),
    quantity: Number(row.quantity),
    total: Number(row.total),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    address: String(row.address),
    paymentMethod: row.payment_method as AdminOrder['paymentMethod'],
    deliveryNote: String(row.delivery_note ?? ''),
    status: row.status as AdminOrder['status'],
    createdAt: String(row.created_at),
  }
}

function reviewFromRow(row: Row): AdminReview {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    author: String(row.author),
    rating: Number(row.rating),
    option: String(row.option_name),
    body: String(row.body),
    status: row.status as AdminReview['status'],
    createdAt: String(row.created_at),
  }
}

function settingsFromRow(row: Row | null): StoreSettings {
  if (!row) return defaultStoreSettings
  return {
    storeName: String(row.store_name),
    announcement: String(row.announcement ?? ''),
    shippingNotice: String(row.shipping_notice ?? ''),
    supportEmail: String(row.support_email ?? ''),
    supportPhone: String(row.support_phone ?? ''),
    footerDescription: String(row.footer_description ?? ''),
    maintenanceMode: Boolean(row.maintenance_mode),
  }
}

function settingsToRow(settings: StoreSettings) {
  return {
    id: 1,
    store_name: settings.storeName,
    announcement: settings.announcement,
    shipping_notice: settings.shippingNotice,
    support_email: settings.supportEmail,
    support_phone: settings.supportPhone,
    footer_description: settings.footerDescription,
    maintenance_mode: settings.maintenanceMode,
    updated_at: new Date().toISOString(),
  }
}

async function requireUserId() {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw new Error('로그인이 필요합니다.')
  return data.user.id
}

async function persistManagedImage(imageUrl: string | undefined, folder: string) {
  if (!imageUrl?.startsWith('data:image/')) return imageUrl || ''
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  const extension = blob.type === 'image/png' ? 'png'
    : blob.type === 'image/webp' ? 'webp'
      : blob.type === 'image/gif' ? 'gif'
        : 'jpg'
  const path = `${folder}/${crypto.randomUUID()}.${extension}`
  const client = requireSupabase()
  const { error } = await client.storage.from('product-images').upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) fail(error, '이미지를 업로드하지 못했습니다.')
  return client.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

async function loadCommonSnapshot(isAdmin: boolean) {
  const client = requireSupabase()
  let productsQuery = client.from('products').select('*').order('featured', { ascending: false }).order('created_at', { ascending: false })
  let postsQuery = client.from('posts').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false })
  let reviewsQuery = client.from('reviews').select('*').order('created_at', { ascending: false })

  if (!isAdmin) {
    productsQuery = productsQuery.in('status', ['active', 'soldout'])
    postsQuery = postsQuery.eq('status', 'published')
    reviewsQuery = reviewsQuery.eq('status', 'visible')
  }

  const [products, posts, reviews, settings, importedProducts] = await Promise.all([
    productsQuery,
    postsQuery,
    reviewsQuery,
    client.from('store_settings').select('*').eq('id', 1).maybeSingle(),
    client.from('imported_products').select('payload').order('created_at', { ascending: false }).limit(50),
  ])

  if (products.error) fail(products.error, '상품을 불러오지 못했습니다.')
  if (posts.error) fail(posts.error, '게시글을 불러오지 못했습니다.')
  if (reviews.error) fail(reviews.error, '리뷰를 불러오지 못했습니다.')
  if (settings.error) fail(settings.error, '스토어 설정을 불러오지 못했습니다.')
  if (importedProducts.error) fail(importedProducts.error, '가져온 상품을 불러오지 못했습니다.')

  return {
    products: (products.data as Row[]).map(productFromRow),
    posts: (posts.data as Row[]).map(postFromRow),
    reviews: (reviews.data as Row[]).map(reviewFromRow),
    settings: settingsFromRow(settings.data as Row | null),
    importedProducts: (importedProducts.data as Array<{ payload: Product }>).map((row) => row.payload).filter(Boolean),
  }
}

export async function loadSupabaseStorefrontSnapshot(): Promise<StorefrontSnapshot> {
  return loadCommonSnapshot(false)
}

export async function loadSupabaseAdminSnapshot(): Promise<AdminSnapshot> {
  const [common, orders] = await Promise.all([
    loadCommonSnapshot(true),
    requireSupabase().from('orders').select('*').order('created_at', { ascending: false }),
  ])
  if (orders.error) fail(orders.error, '주문을 불러오지 못했습니다.')
  return { ...common, orders: (orders.data as Row[]).map(orderFromRow) }
}

export async function upsertSupabaseProduct(product: CatalogProduct) {
  const storedProduct = { ...product, imageUrl: await persistManagedImage(product.imageUrl, 'products') }
  const { data, error } = await requireSupabase().from('products').upsert(productToRow(storedProduct)).select('*').single()
  if (error) fail(error, '상품을 저장하지 못했습니다.')
  return productFromRow(data as Row)
}

export async function deleteSupabaseProduct(productId: string) {
  const { error } = await requireSupabase().from('products').delete().eq('id', productId)
  if (error) fail(error, '상품을 삭제하지 못했습니다.')
  return { ok: true as const }
}

export async function upsertSupabasePost(post: AdminPost) {
  const storedPost = { ...post, coverImage: await persistManagedImage(post.coverImage, 'posts') }
  const { data, error } = await requireSupabase().from('posts').upsert(postToRow(storedPost)).select('*').single()
  if (error) fail(error, '게시글을 저장하지 못했습니다.')
  return postFromRow(data as Row)
}

export async function deleteSupabasePost(postId: string) {
  const { error } = await requireSupabase().from('posts').delete().eq('id', postId)
  if (error) fail(error, '게시글을 삭제하지 못했습니다.')
  return { ok: true as const }
}

export async function createSupabaseOrder(order: AdminOrder) {
  await requireUserId()
  const { data, error } = await requireSupabase().rpc('create_store_order', { p_order: order })
  if (error) fail(error, '주문을 생성하지 못했습니다.')
  const payload = data as { order: Row; product: Row }
  return { order: orderFromRow(payload.order), product: productFromRow(payload.product) }
}

export async function loadSupabaseAccountOrders(): Promise<AdminOrder[]> {
  const userId = await requireUserId()
  const { data, error } = await requireSupabase()
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) fail(error, '주문과 배송 정보를 불러오지 못했습니다.')
  return (data as Row[]).map(orderFromRow)
}

export async function updateSupabaseOrderStatus(orderId: string, status: AdminOrderStatus) {
  const { data, error } = await requireSupabase().rpc('update_store_order_status', { p_order_id: orderId, p_status: status })
  if (error) fail(error, '주문 상태를 변경하지 못했습니다.')
  const payload = data as { order: Row; product: Row | null }
  return { order: orderFromRow(payload.order), product: payload.product ? productFromRow(payload.product) : null }
}

export async function updateSupabaseReviewStatus(reviewId: string, status: AdminReviewStatus) {
  const { data, error } = await requireSupabase().from('reviews').update({ status }).eq('id', reviewId).select('*').single()
  if (error) fail(error, '리뷰 상태를 변경하지 못했습니다.')
  return reviewFromRow(data as Row)
}

export async function deleteSupabaseReview(reviewId: string) {
  const { error } = await requireSupabase().from('reviews').delete().eq('id', reviewId)
  if (error) fail(error, '리뷰를 삭제하지 못했습니다.')
  return { ok: true as const }
}

export async function updateSupabaseSettings(settings: StoreSettings) {
  const { data, error } = await requireSupabase().from('store_settings').upsert(settingsToRow(settings)).select('*').single()
  if (error) fail(error, '스토어 설정을 저장하지 못했습니다.')
  return settingsFromRow(data as Row)
}

export async function saveSupabaseImportedProduct(product: Product) {
  await requireUserId()
  const now = new Date().toISOString()
  const { data, error } = await requireSupabase().from('imported_products').upsert({
    id: product.id,
    owner_id: (await requireSupabase().auth.getUser()).data.user?.id,
    payload: product,
    created_at: now,
    updated_at: now,
  }).select('payload').single()
  if (error) fail(error, '가져온 상품을 저장하지 못했습니다.')
  return (data as { payload: Product }).payload
}

export async function loadSupabaseAccountActivity(): Promise<AccountActivity> {
  await requireUserId()
  const client = requireSupabase()
  const [cart, wishlist, restock] = await Promise.all([
    client.from('cart_items').select('quantity'),
    client.from('wishlists').select('product_id').order('created_at', { ascending: false }),
    client.from('restock_requests').select('product_id').order('created_at', { ascending: false }),
  ])
  if (cart.error) fail(cart.error, '장바구니를 불러오지 못했습니다.')
  if (wishlist.error) fail(wishlist.error, '찜 목록을 불러오지 못했습니다.')
  if (restock.error) fail(restock.error, '재입고 요청을 불러오지 못했습니다.')
  return {
    cartCount: (cart.data as Array<{ quantity: number }>).reduce((sum, item) => sum + item.quantity, 0),
    wishlistProductIds: (wishlist.data as Array<{ product_id: string }>).map((item) => item.product_id),
    restockProductIds: (restock.data as Array<{ product_id: string }>).map((item) => item.product_id),
  }
}

export async function addSupabaseCartItems(items: CartInput[]) {
  await requireUserId()
  const { error } = await requireSupabase().rpc('add_cart_items', { p_items: items })
  if (error) fail(error, '장바구니에 상품을 담지 못했습니다.')
  return loadSupabaseAccountActivity()
}

export async function loadSupabaseCart(): Promise<CartSnapshot> {
  await requireUserId()
  const { data, error } = await requireSupabase()
    .from('cart_items')
    .select('product_id, option_name, quantity, products(*)')
    .order('updated_at', { ascending: false })
  if (error) fail(error, '장바구니를 불러오지 못했습니다.')

  const lines = (data as Array<Row & { products: Row | Row[] | null }>).flatMap((row) => {
    const productRow = Array.isArray(row.products) ? row.products[0] : row.products
    if (!productRow) return []
    return [{
      productId: String(row.product_id),
      option: String(row.option_name),
      quantity: Number(row.quantity),
      product: productFromRow(productRow),
    }]
  })

  return { lines, activity: await loadSupabaseAccountActivity() }
}

export async function updateSupabaseCartItemQuantity(productId: string, option: string, quantity: number) {
  await requireUserId()
  const { error } = await requireSupabase().rpc('set_cart_item_quantity', {
    p_product_id: productId,
    p_option: option,
    p_quantity: quantity,
  })
  if (error) fail(error, '장바구니 수량을 변경하지 못했습니다.')
  return loadSupabaseCart()
}

export async function removeSupabaseCartItem(productId: string, option: string) {
  const userId = await requireUserId()
  const { error } = await requireSupabase().from('cart_items').delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('option_name', option)
  if (error) fail(error, '장바구니 상품을 삭제하지 못했습니다.')
  return loadSupabaseCart()
}

export async function setSupabaseWishlist(productId: string, liked: boolean) {
  const userId = await requireUserId()
  const query = liked
    ? requireSupabase().from('wishlists').upsert({ user_id: userId, product_id: productId })
    : requireSupabase().from('wishlists').delete().eq('user_id', userId).eq('product_id', productId)
  const { error } = await query
  if (error) fail(error, '찜 목록을 변경하지 못했습니다.')
  return loadSupabaseAccountActivity()
}

export async function requestSupabaseRestock(productId: string) {
  const userId = await requireUserId()
  const { error } = await requireSupabase().from('restock_requests').upsert({ user_id: userId, product_id: productId })
  if (error) fail(error, '재입고 알림을 신청하지 못했습니다.')
  return loadSupabaseAccountActivity()
}

export async function createSupabasePurchaseRequest(input: { productId: string; option: string; note: string; estimatedTotal: number }) {
  const userId = await requireUserId()
  const { data: imported, error: importedError } = await requireSupabase().from('imported_products').select('payload').eq('id', input.productId).single()
  if (importedError) fail(importedError, '가져온 상품을 찾지 못했습니다.')
  const product = (imported as { payload: Product }).payload
  const id = `req-${crypto.randomUUID()}`
  const { data, error } = await requireSupabase().from('purchase_requests').insert({
    id,
    user_id: userId,
    imported_product_id: input.productId,
    product_name: product.name,
    option_name: input.option,
    request_note: input.note,
    estimated_total: Math.round(input.estimatedTotal),
  }).select('id, status').single()
  if (error) fail(error, '구매 요청을 저장하지 못했습니다.')
  return { id: String(data.id), status: String(data.status) }
}

import type { AdminOrder, AdminOrderStatus, AdminPost, AdminReview, AdminReviewStatus, StoreSettings } from './adminData'
import type { CatalogProduct } from './catalog'
import type { Product } from './data'
import { isSupabaseConfigured } from './supabaseClient'
import {
  addSupabaseCartItems,
  createSupabaseOrder,
  createSupabasePurchaseRequest,
  deleteSupabasePost,
  deleteSupabaseProduct,
  deleteSupabaseReview,
  loadSupabaseAccountActivity,
  loadSupabaseAccountOrders,
  loadSupabaseCart,
  loadSupabaseAdminSnapshot,
  loadSupabaseStorefrontSnapshot,
  requestSupabaseRestock,
  removeSupabaseCartItem,
  saveSupabaseImportedProduct,
  setSupabaseWishlist,
  updateSupabaseOrderStatus,
  updateSupabaseCartItemQuantity,
  updateSupabaseReviewStatus,
  updateSupabaseSettings,
  upsertSupabasePost,
  upsertSupabaseProduct,
} from './supabaseStore'

export interface StorefrontSnapshot {
  products: CatalogProduct[]
  posts: AdminPost[]
  reviews: AdminReview[]
  settings: StoreSettings
  importedProducts: Product[]
}

export interface AdminSnapshot extends StorefrontSnapshot {
  orders: AdminOrder[]
}

export interface AccountActivity {
  cartCount: number
  wishlistProductIds: string[]
  restockProductIds: string[]
}

export interface CartInput {
  productId: string
  option: string
  quantity: number
}

export interface CartLine extends CartInput {
  product: CatalogProduct
}

export interface CartSnapshot {
  lines: CartLine[]
  activity: AccountActivity
}

export interface LegacyStoreData extends AdminSnapshot {}

class StoreApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new StoreApiError('스토어 서버에 연결할 수 없습니다.', 0)
  }

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new StoreApiError(String(payload.error || '스토어 요청을 처리하지 못했습니다.'), response.status)
  }
  return payload as T
}

export function bootstrapStoreData(data: LegacyStoreData) {
  if (isSupabaseConfigured) return Promise.resolve({ ok: true as const })
  return request<{ ok: true }>('/api/store/bootstrap', { method: 'POST', body: JSON.stringify(data) })
}

export async function loadStorefrontSnapshot() {
  if (isSupabaseConfigured) return loadSupabaseStorefrontSnapshot()
  const result = await request<{ snapshot: StorefrontSnapshot }>('/api/storefront')
  return result.snapshot
}

export async function loadAdminSnapshot() {
  if (isSupabaseConfigured) return loadSupabaseAdminSnapshot()
  const result = await request<{ snapshot: AdminSnapshot }>('/api/admin/snapshot')
  return result.snapshot
}

export async function upsertServerProduct(product: CatalogProduct) {
  if (isSupabaseConfigured) return upsertSupabaseProduct(product)
  const result = await request<{ product: CatalogProduct }>(`/api/admin/products/${encodeURIComponent(product.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ product }),
  })
  return result.product
}

export function deleteServerProduct(productId: string) {
  if (isSupabaseConfigured) return deleteSupabaseProduct(productId)
  return request<{ ok: true }>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
}

export async function upsertServerPost(post: AdminPost) {
  if (isSupabaseConfigured) return upsertSupabasePost(post)
  const result = await request<{ post: AdminPost }>(`/api/admin/posts/${encodeURIComponent(post.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ post }),
  })
  return result.post
}

export function deleteServerPost(postId: string) {
  if (isSupabaseConfigured) return deleteSupabasePost(postId)
  return request<{ ok: true }>(`/api/admin/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' })
}

export async function createServerOrder(order: AdminOrder) {
  if (isSupabaseConfigured) return createSupabaseOrder(order)
  return request<{ order: AdminOrder; product: CatalogProduct }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ order }),
  })
}

export async function loadServerOrders() {
  if (isSupabaseConfigured) return loadSupabaseAccountOrders()
  const result = await request<{ orders: AdminOrder[] }>('/api/account/orders')
  return result.orders
}

export async function updateServerOrderStatus(orderId: string, status: AdminOrderStatus) {
  if (isSupabaseConfigured) return updateSupabaseOrderStatus(orderId, status)
  return request<{ order: AdminOrder; product: CatalogProduct | null }>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function updateServerReviewStatus(reviewId: string, status: AdminReviewStatus) {
  if (isSupabaseConfigured) return updateSupabaseReviewStatus(reviewId, status)
  const result = await request<{ review: AdminReview }>(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return result.review
}

export function deleteServerReview(reviewId: string) {
  if (isSupabaseConfigured) return deleteSupabaseReview(reviewId)
  return request<{ ok: true }>(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE' })
}

export async function updateServerSettings(settings: StoreSettings) {
  if (isSupabaseConfigured) return updateSupabaseSettings(settings)
  const result = await request<{ settings: StoreSettings }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  })
  return result.settings
}

export async function saveServerImportedProduct(product: Product) {
  if (isSupabaseConfigured) return saveSupabaseImportedProduct(product)
  const result = await request<{ product: Product }>('/api/imported-products', {
    method: 'POST',
    body: JSON.stringify({ product }),
  })
  return result.product
}

export async function loadAccountActivity() {
  if (isSupabaseConfigured) return loadSupabaseAccountActivity()
  const result = await request<{ activity: AccountActivity }>('/api/account/activity')
  return result.activity
}

export async function addServerCartItems(items: CartInput[]) {
  if (isSupabaseConfigured) return addSupabaseCartItems(items)
  const result = await request<{ activity: AccountActivity }>('/api/account/cart/items', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  return result.activity
}

export async function loadServerCart() {
  if (isSupabaseConfigured) return loadSupabaseCart()
  const result = await request<{ cart: CartSnapshot }>('/api/account/cart')
  return result.cart
}

export async function updateServerCartItemQuantity(productId: string, option: string, quantity: number) {
  if (isSupabaseConfigured) return updateSupabaseCartItemQuantity(productId, option, quantity)
  const result = await request<{ cart: CartSnapshot }>(`/api/account/cart/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ option, quantity }),
  })
  return result.cart
}

export async function removeServerCartItem(productId: string, option: string) {
  if (isSupabaseConfigured) return removeSupabaseCartItem(productId, option)
  const result = await request<{ cart: CartSnapshot }>(`/api/account/cart/items/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ option }),
  })
  return result.cart
}

export async function setServerWishlist(productId: string, liked: boolean) {
  if (isSupabaseConfigured) return setSupabaseWishlist(productId, liked)
  const result = await request<{ activity: AccountActivity }>(`/api/account/wishlist/${encodeURIComponent(productId)}`, {
    method: liked ? 'PUT' : 'DELETE',
  })
  return result.activity
}

export async function requestServerRestock(productId: string) {
  if (isSupabaseConfigured) return requestSupabaseRestock(productId)
  const result = await request<{ activity: AccountActivity }>(`/api/account/restock/${encodeURIComponent(productId)}`, {
    method: 'PUT',
  })
  return result.activity
}

export async function createServerPurchaseRequest(input: { productId: string; option: string; note: string; estimatedTotal: number }) {
  if (isSupabaseConfigured) return createSupabasePurchaseRequest(input)
  const result = await request<{ request: { id: string; status: string } }>('/api/purchase-requests', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.request
}

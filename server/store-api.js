import { randomUUID } from 'node:crypto'
import { getAccountByRequest } from './auth-api.js'
import { getDatabase } from './database.js'

const PRODUCT_STATUSES = new Set(['active', 'draft', 'soldout'])
const POST_CATEGORIES = new Set(['notice', 'journal', 'event'])
const POST_STATUSES = new Set(['draft', 'published'])
const ORDER_STATUSES = new Set(['paid', 'preparing', 'shipping', 'delivered', 'cancelled'])
const REVIEW_STATUSES = new Set(['visible', 'hidden'])
const PAYMENT_METHODS = new Set(['card', 'kakao', 'naver'])

class StoreApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req, limit = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = ''
    let rejected = false

    req.on('data', (chunk) => {
      if (rejected) return
      raw += chunk
      if (raw.length > limit) {
        rejected = true
        reject(new StoreApiError(413, '업로드할 데이터가 너무 큽니다.'))
      }
    })

    req.on('end', () => {
      if (rejected) return
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new StoreApiError(400, '올바른 JSON 요청이 아닙니다.'))
      }
    })

    req.on('error', reject)
  })
}

function text(value, maxLength = 1000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function integer(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return minimum
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)))
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function productFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    summary: row.summary,
    description: row.description,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    stock: row.stock,
    status: row.status,
    featured: Boolean(row.featured),
    art: row.art,
    palette: parseJson(row.palette_json, ['#f3eee6', '#ddd0bf']),
    accent: row.accent,
    imageUrl: row.image_url ?? '',
    options: parseJson(row.options_json, []),
    details: parseJson(row.details_json, []),
    createdAt: row.created_at,
  }
}

function postFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status,
    pinned: Boolean(row.pinned),
    coverImage: row.cover_image ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function orderFromRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    option: row.option_name,
    quantity: row.quantity,
    total: row.total,
    customerName: row.customer_name,
    phone: row.phone,
    address: row.address,
    paymentMethod: row.payment_method,
    deliveryNote: row.delivery_note,
    status: row.status,
    createdAt: row.created_at,
  }
}

function reviewFromRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    author: row.author,
    rating: row.rating,
    option: row.option_name,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
  }
}

function settingsFromRow(row) {
  if (!row) return null
  return {
    storeName: row.store_name,
    announcement: row.announcement,
    shippingNotice: row.shipping_notice,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    footerDescription: row.footer_description,
    maintenanceMode: Boolean(row.maintenance_mode),
  }
}

function importedProductFromRow(row) {
  return parseJson(row.payload_json, null)
}

function normalizeProduct(input) {
  const id = text(input?.id, 160)
  const name = text(input?.name, 200)
  const status = PRODUCT_STATUSES.has(input?.status) ? input.status : 'draft'
  const palette = Array.isArray(input?.palette) ? input.palette.slice(0, 2).map((item) => text(item, 30)) : []

  if (!id || !name) throw new StoreApiError(400, '상품 ID와 상품명을 입력해 주세요.')

  return {
    id,
    name,
    category: text(input.category, 100) || '기타',
    summary: text(input.summary, 2000),
    description: text(input.description, 10000),
    price: integer(input.price),
    compareAtPrice: integer(input.compareAtPrice),
    stock: integer(input.stock, 0, 1_000_000),
    status,
    featured: Boolean(input.featured),
    art: text(input.art, 30) || 'box',
    palette: palette.length === 2 ? palette : ['#f3eee6', '#ddd0bf'],
    accent: text(input.accent, 30) || '#7a5e45',
    imageUrl: text(input.imageUrl, 8_000_000),
    options: Array.isArray(input.options) ? input.options.map((item) => text(item, 200)).filter(Boolean).slice(0, 100) : [],
    details: Array.isArray(input.details) ? input.details.map((item) => text(item, 2000)).filter(Boolean).slice(0, 100) : [],
    createdAt: text(input.createdAt, 40) || new Date().toISOString(),
  }
}

function normalizePost(input) {
  const id = text(input?.id, 160)
  const title = text(input?.title, 300)
  if (!id || !title) throw new StoreApiError(400, '게시글 ID와 제목을 입력해 주세요.')
  return {
    id,
    title,
    category: POST_CATEGORIES.has(input.category) ? input.category : 'notice',
    excerpt: text(input.excerpt, 2000),
    content: text(input.content, 100_000),
    status: POST_STATUSES.has(input.status) ? input.status : 'draft',
    pinned: Boolean(input.pinned),
    coverImage: text(input.coverImage, 8_000_000),
    createdAt: text(input.createdAt, 40) || new Date().toISOString(),
    updatedAt: text(input.updatedAt, 40) || new Date().toISOString(),
  }
}

function normalizeReview(input) {
  const id = text(input?.id, 160)
  const productId = text(input?.productId, 160)
  if (!id || !productId) throw new StoreApiError(400, '리뷰 ID와 상품 정보가 필요합니다.')
  return {
    id,
    productId,
    productName: text(input.productName, 200),
    author: text(input.author, 100),
    rating: integer(input.rating, 1, 5),
    option: text(input.option, 200),
    body: text(input.body, 10_000),
    status: REVIEW_STATUSES.has(input.status) ? input.status : 'hidden',
    createdAt: text(input.createdAt, 40) || new Date().toISOString(),
  }
}

function normalizeSettings(input) {
  return {
    storeName: text(input?.storeName, 100) || 'TO YOU',
    announcement: text(input?.announcement, 1000),
    shippingNotice: text(input?.shippingNotice, 2000),
    supportEmail: text(input?.supportEmail, 320),
    supportPhone: text(input?.supportPhone, 60),
    footerDescription: text(input?.footerDescription, 3000),
    maintenanceMode: Boolean(input?.maintenanceMode),
  }
}

function insertProduct(db, input, mode = 'replace') {
  const product = normalizeProduct(input)
  const verb = mode === 'ignore' ? 'INSERT OR IGNORE' : 'INSERT'
  const conflictClause = mode === 'ignore' ? '' : `ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    summary = excluded.summary,
    description = excluded.description,
    price = excluded.price,
    compare_at_price = excluded.compare_at_price,
    stock = excluded.stock,
    status = excluded.status,
    featured = excluded.featured,
    art = excluded.art,
    palette_json = excluded.palette_json,
    accent = excluded.accent,
    image_url = excluded.image_url,
    options_json = excluded.options_json,
    details_json = excluded.details_json,
    updated_at = excluded.updated_at`
  const now = new Date().toISOString()
  db.prepare(`${verb} INTO products (
    id, name, category, summary, description, price, compare_at_price, stock, status, featured,
    art, palette_json, accent, image_url, options_json, details_json, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${conflictClause}`)
    .run(product.id, product.name, product.category, product.summary, product.description, product.price,
      product.compareAtPrice, product.stock, product.status, product.featured ? 1 : 0, product.art,
      JSON.stringify(product.palette), product.accent, product.imageUrl || null, JSON.stringify(product.options),
      JSON.stringify(product.details), product.createdAt, now)
  return product
}

function insertPost(db, input, mode = 'replace') {
  const post = normalizePost(input)
  const verb = mode === 'ignore' ? 'INSERT OR IGNORE' : 'INSERT OR REPLACE'
  db.prepare(`${verb} INTO posts (
    id, title, category, excerpt, content, status, pinned, cover_image, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(post.id, post.title, post.category, post.excerpt, post.content, post.status, post.pinned ? 1 : 0,
      post.coverImage || null, post.createdAt, post.updatedAt)
  return post
}

function insertReview(db, input, mode = 'replace') {
  const review = normalizeReview(input)
  const verb = mode === 'ignore' ? 'INSERT OR IGNORE' : 'INSERT OR REPLACE'
  db.prepare(`${verb} INTO reviews (
    id, product_id, product_name, author, rating, option_name, body, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(review.id, review.productId, review.productName, review.author, review.rating, review.option,
      review.body, review.status, review.createdAt)
  return review
}

function upsertSettings(db, input) {
  const settings = normalizeSettings(input)
  db.prepare(`INSERT INTO store_settings (
    id, store_name, announcement, shipping_notice, support_email, support_phone, footer_description, maintenance_mode, updated_at
  ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    store_name = excluded.store_name,
    announcement = excluded.announcement,
    shipping_notice = excluded.shipping_notice,
    support_email = excluded.support_email,
    support_phone = excluded.support_phone,
    footer_description = excluded.footer_description,
    maintenance_mode = excluded.maintenance_mode,
    updated_at = excluded.updated_at`)
    .run(settings.storeName, settings.announcement, settings.shippingNotice, settings.supportEmail,
      settings.supportPhone, settings.footerDescription, settings.maintenanceMode ? 1 : 0, new Date().toISOString())
  return settings
}

function getStorefrontSnapshot() {
  const db = getDatabase()
  return {
    products: db.prepare("SELECT * FROM products WHERE status IN ('active', 'soldout') ORDER BY featured DESC, created_at DESC").all().map(productFromRow),
    posts: db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY pinned DESC, updated_at DESC").all().map(postFromRow),
    reviews: db.prepare("SELECT * FROM reviews WHERE status = 'visible' ORDER BY created_at DESC").all().map(reviewFromRow),
    settings: settingsFromRow(db.prepare('SELECT * FROM store_settings WHERE id = 1').get()),
    importedProducts: db.prepare('SELECT * FROM imported_products ORDER BY created_at DESC').all().map(importedProductFromRow).filter(Boolean),
  }
}

function getAdminSnapshot() {
  const db = getDatabase()
  return {
    products: db.prepare('SELECT * FROM products ORDER BY created_at DESC').all().map(productFromRow),
    posts: db.prepare('SELECT * FROM posts ORDER BY pinned DESC, updated_at DESC').all().map(postFromRow),
    orders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(orderFromRow),
    reviews: db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all().map(reviewFromRow),
    settings: settingsFromRow(db.prepare('SELECT * FROM store_settings WHERE id = 1').get()),
    importedProducts: db.prepare('SELECT * FROM imported_products ORDER BY created_at DESC').all().map(importedProductFromRow).filter(Boolean),
    purchaseRequests: db.prepare('SELECT * FROM purchase_requests ORDER BY created_at DESC').all(),
  }
}

function requireMember(req) {
  const account = getAccountByRequest(req)
  if (!account) throw new StoreApiError(401, '로그인이 필요합니다.')
  return account
}

function getAccountActivity(userId) {
  const db = getDatabase()
  return {
    cartCount: db.prepare('SELECT COALESCE(SUM(quantity), 0) AS count FROM cart_items WHERE user_id = ?').get(userId).count,
    wishlistProductIds: db.prepare('SELECT product_id FROM wishlists WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((row) => row.product_id),
    restockProductIds: db.prepare('SELECT product_id FROM restock_requests WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((row) => row.product_id),
  }
}

function addCartItem(db, userId, input) {
  const productId = text(input?.productId, 160)
  const option = text(input?.option, 200)
  const quantity = integer(input?.quantity, 1, 99)
  const productRow = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").get(productId)
  if (!productRow) throw new StoreApiError(404, '장바구니에 담을 상품을 찾을 수 없습니다.')
  const product = productFromRow(productRow)
  if (product.options.length && !product.options.includes(option)) throw new StoreApiError(400, '상품 옵션을 다시 선택해 주세요.')
  const current = db.prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND option_name = ?').get(userId, productId, option)
  const nextQuantity = Math.min(product.stock, (current?.quantity ?? 0) + quantity)
  if (nextQuantity < 1) throw new StoreApiError(409, '주문 가능한 재고가 없습니다.')
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO cart_items (user_id, product_id, option_name, quantity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, product_id, option_name) DO UPDATE SET quantity = excluded.quantity, updated_at = excluded.updated_at`)
    .run(userId, productId, option, nextQuantity, now, now)
}

function requireAdmin(req) {
  const account = getAccountByRequest(req)
  if (!account) throw new StoreApiError(401, '관리자 로그인이 필요합니다.')
  if (!account.is_admin) throw new StoreApiError(403, '관리자 권한이 없습니다.')
  return account
}

async function bootstrapStore(req) {
  const body = await readJsonBody(req)
  const db = getDatabase()
  const counts = {
    products: db.prepare('SELECT COUNT(*) AS count FROM products').get().count,
    posts: db.prepare('SELECT COUNT(*) AS count FROM posts').get().count,
    reviews: db.prepare('SELECT COUNT(*) AS count FROM reviews').get().count,
    orders: db.prepare('SELECT COUNT(*) AS count FROM orders').get().count,
    importedProducts: db.prepare('SELECT COUNT(*) AS count FROM imported_products').get().count,
    settings: db.prepare('SELECT COUNT(*) AS count FROM store_settings').get().count,
  }

  db.exec('BEGIN IMMEDIATE')
  try {
    if (!counts.products && Array.isArray(body.products)) body.products.forEach((item) => insertProduct(db, item, 'ignore'))
    if (!counts.posts && Array.isArray(body.posts)) body.posts.forEach((item) => insertPost(db, item, 'ignore'))
    if (!counts.reviews && Array.isArray(body.reviews)) body.reviews.forEach((item) => insertReview(db, item, 'ignore'))
    if (!counts.orders && Array.isArray(body.orders)) {
      for (const order of body.orders) {
        if (!db.prepare('SELECT id FROM products WHERE id = ?').get(text(order.productId, 160))) continue
        db.prepare(`INSERT OR IGNORE INTO orders (
          id, user_id, product_id, product_name, option_name, quantity, total, customer_name,
          phone, address, payment_method, delivery_note, status, created_at
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(text(order.id, 160), text(order.productId, 160), text(order.productName, 200), text(order.option, 200),
            integer(order.quantity, 1, 999), integer(order.total), text(order.customerName, 100), text(order.phone, 40),
            text(order.address, 1000), PAYMENT_METHODS.has(order.paymentMethod) ? order.paymentMethod : 'card',
            text(order.deliveryNote, 1000), ORDER_STATUSES.has(order.status) ? order.status : 'paid',
            text(order.createdAt, 40) || new Date().toISOString())
      }
    }
    if (!counts.settings && body.settings) upsertSettings(db, body.settings)
    if (!counts.importedProducts && Array.isArray(body.importedProducts)) {
      const now = new Date().toISOString()
      for (const product of body.importedProducts) {
        const id = text(product?.id, 160)
        if (!id) continue
        db.prepare('INSERT OR IGNORE INTO imported_products (id, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .run(id, JSON.stringify(product), now, now)
      }
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

async function createOrder(req) {
  const body = await readJsonBody(req)
  const input = body.order ?? body
  const productId = text(input.productId, 160)
  const quantity = integer(input.quantity, 1, 99)
  const paymentMethod = PAYMENT_METHODS.has(input.paymentMethod) ? input.paymentMethod : 'card'
  const customerName = text(input.customerName, 100)
  const phone = text(input.phone, 40)
  const address = text(input.address, 1000)

  if (customerName.length < 2 || phone.replace(/\D/g, '').length < 9 || address.length < 5) {
    throw new StoreApiError(400, '주문자와 배송지 정보를 확인해 주세요.')
  }

  const db = getDatabase()
  const productRow = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'active'").get(productId)
  if (!productRow) throw new StoreApiError(404, '판매 중인 상품을 찾을 수 없습니다.')
  if (productRow.stock < quantity) throw new StoreApiError(409, '주문 가능한 재고가 부족합니다.')
  const product = productFromRow(productRow)
  const option = text(input.option, 200)
  if (product.options.length && !product.options.includes(option)) throw new StoreApiError(400, '상품 옵션을 다시 선택해 주세요.')

  const subtotal = product.price * quantity
  const total = subtotal + (subtotal >= 70_000 ? 0 : 3_000)
  const id = `ord-${randomUUID()}`
  const createdAt = new Date().toISOString()
  const account = getAccountByRequest(req)
  const nextStock = product.stock - quantity

  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(`INSERT INTO orders (
      id, user_id, product_id, product_name, option_name, quantity, total, customer_name,
      phone, address, payment_method, delivery_note, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`)
      .run(id, account?.id ?? null, product.id, product.name, option, quantity, total, customerName, phone, address,
        paymentMethod, text(input.deliveryNote, 1000), createdAt)
    db.prepare("UPDATE products SET stock = ?, status = CASE WHEN ? = 0 THEN 'soldout' ELSE status END, updated_at = ? WHERE id = ?")
      .run(nextStock, nextStock, createdAt, product.id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  const order = orderFromRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(id))
  const updatedProduct = productFromRow(db.prepare('SELECT * FROM products WHERE id = ?').get(product.id))
  return { order, product: updatedProduct }
}

export function createStoreApiMiddleware() {
  return async (req, res, next) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')
    const { pathname } = requestUrl

    if (!pathname.startsWith('/api/store') && !pathname.startsWith('/api/admin')
      && !pathname.startsWith('/api/orders') && !pathname.startsWith('/api/imported-products')
      && !pathname.startsWith('/api/account') && !pathname.startsWith('/api/purchase-requests')) {
      next()
      return
    }

    try {
      if (pathname === '/api/store/bootstrap' && req.method === 'POST') {
        await bootstrapStore(req)
        sendJson(res, 200, { ok: true })
        return
      }

      if (pathname === '/api/storefront' && req.method === 'GET') {
        sendJson(res, 200, { snapshot: getStorefrontSnapshot() })
        return
      }

      if (pathname === '/api/admin/snapshot' && req.method === 'GET') {
        requireAdmin(req)
        sendJson(res, 200, { snapshot: getAdminSnapshot() })
        return
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const result = await createOrder(req)
        sendJson(res, 201, result)
        return
      }

      if (pathname === '/api/account/activity' && req.method === 'GET') {
        const account = requireMember(req)
        sendJson(res, 200, { activity: getAccountActivity(account.id) })
        return
      }

      if (pathname === '/api/account/cart/items' && req.method === 'POST') {
        const account = requireMember(req)
        const body = await readJsonBody(req)
        const items = Array.isArray(body.items) ? body.items : [body.item ?? body]
        const db = getDatabase()
        db.exec('BEGIN IMMEDIATE')
        try {
          items.forEach((item) => addCartItem(db, account.id, item))
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }
        sendJson(res, 200, { activity: getAccountActivity(account.id) })
        return
      }

      const wishlistMatch = pathname.match(/^\/api\/account\/wishlist\/([^/]+)$/)
      if (wishlistMatch && ['PUT', 'DELETE'].includes(req.method ?? '')) {
        const account = requireMember(req)
        const productId = decodeURIComponent(wishlistMatch[1])
        const db = getDatabase()
        if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) throw new StoreApiError(404, '상품을 찾을 수 없습니다.')
        if (req.method === 'PUT') {
          db.prepare('INSERT OR IGNORE INTO wishlists (user_id, product_id, created_at) VALUES (?, ?, ?)')
            .run(account.id, productId, new Date().toISOString())
        } else {
          db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(account.id, productId)
        }
        sendJson(res, 200, { activity: getAccountActivity(account.id) })
        return
      }

      const restockMatch = pathname.match(/^\/api\/account\/restock\/([^/]+)$/)
      if (restockMatch && req.method === 'PUT') {
        const account = requireMember(req)
        const productId = decodeURIComponent(restockMatch[1])
        const db = getDatabase()
        if (!db.prepare('SELECT id FROM products WHERE id = ?').get(productId)) throw new StoreApiError(404, '상품을 찾을 수 없습니다.')
        db.prepare('INSERT OR IGNORE INTO restock_requests (user_id, product_id, created_at) VALUES (?, ?, ?)')
          .run(account.id, productId, new Date().toISOString())
        sendJson(res, 200, { activity: getAccountActivity(account.id) })
        return
      }

      if (pathname === '/api/purchase-requests' && req.method === 'POST') {
        const account = requireMember(req)
        const body = await readJsonBody(req)
        const productId = text(body.productId, 160)
        const importedRow = getDatabase().prepare('SELECT payload_json FROM imported_products WHERE id = ?').get(productId)
        if (!importedRow) throw new StoreApiError(404, '구매 요청 상품을 찾을 수 없습니다.')
        const importedProduct = parseJson(importedRow.payload_json, {})
        const request = {
          id: `req-${randomUUID()}`,
          productId,
          productName: text(importedProduct.name, 200),
          option: text(body.option, 200),
          note: text(body.note, 3000),
          estimatedTotal: integer(body.estimatedTotal),
          status: 'requested',
          createdAt: new Date().toISOString(),
        }
        getDatabase().prepare(`INSERT INTO purchase_requests (
          id, user_id, imported_product_id, product_name, option_name, request_note, estimated_total, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?)`)
          .run(request.id, account.id, request.productId, request.productName, request.option, request.note, request.estimatedTotal, request.createdAt)
        sendJson(res, 201, { request })
        return
      }

      if (pathname === '/api/imported-products' && req.method === 'POST') {
        const body = await readJsonBody(req)
        const product = body.product ?? body
        const id = text(product?.id, 160)
        if (!id) throw new StoreApiError(400, '저장할 상품 ID가 필요합니다.')
        const now = new Date().toISOString()
        getDatabase().prepare(`INSERT INTO imported_products (id, payload_json, created_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`)
          .run(id, JSON.stringify(product), now, now)
        sendJson(res, 200, { product })
        return
      }

      const productMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/)
      if (productMatch) {
        requireAdmin(req)
        const id = decodeURIComponent(productMatch[1])
        if (req.method === 'PUT') {
          const body = await readJsonBody(req)
          const product = insertProduct(getDatabase(), { ...(body.product ?? body), id })
          sendJson(res, 200, { product })
          return
        }
        if (req.method === 'DELETE') {
          try {
            getDatabase().prepare('DELETE FROM products WHERE id = ?').run(id)
          } catch (error) {
            if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) {
              throw new StoreApiError(409, '주문 내역이 있는 상품은 삭제할 수 없습니다. 판매 상태를 변경해 주세요.')
            }
            throw error
          }
          sendJson(res, 200, { ok: true })
          return
        }
      }

      const postMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/)
      if (postMatch) {
        requireAdmin(req)
        const id = decodeURIComponent(postMatch[1])
        if (req.method === 'PUT') {
          const body = await readJsonBody(req)
          const post = insertPost(getDatabase(), { ...(body.post ?? body), id })
          sendJson(res, 200, { post })
          return
        }
        if (req.method === 'DELETE') {
          getDatabase().prepare('DELETE FROM posts WHERE id = ?').run(id)
          sendJson(res, 200, { ok: true })
          return
        }
      }

      const orderStatusMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)\/status$/)
      if (orderStatusMatch && req.method === 'PATCH') {
        requireAdmin(req)
        const body = await readJsonBody(req)
        if (!ORDER_STATUSES.has(body.status)) throw new StoreApiError(400, '올바른 주문 상태가 아닙니다.')
        const id = decodeURIComponent(orderStatusMatch[1])
        const db = getDatabase()
        const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
        if (!currentOrder) throw new StoreApiError(404, '주문을 찾을 수 없습니다.')

        db.exec('BEGIN IMMEDIATE')
        try {
          if (currentOrder.status !== 'cancelled' && body.status === 'cancelled') {
            db.prepare(`UPDATE products
              SET stock = stock + ?, status = CASE WHEN status = 'soldout' THEN 'active' ELSE status END, updated_at = ?
              WHERE id = ?`)
              .run(currentOrder.quantity, new Date().toISOString(), currentOrder.product_id)
          } else if (currentOrder.status === 'cancelled' && body.status !== 'cancelled') {
            const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(currentOrder.product_id)
            if (!product || product.stock < currentOrder.quantity) {
              throw new StoreApiError(409, '주문을 복구할 재고가 부족합니다.')
            }
            const nextStock = product.stock - currentOrder.quantity
            db.prepare("UPDATE products SET stock = ?, status = CASE WHEN ? = 0 THEN 'soldout' ELSE status END, updated_at = ? WHERE id = ?")
              .run(nextStock, nextStock, new Date().toISOString(), currentOrder.product_id)
          }
          db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(body.status, id)
          db.exec('COMMIT')
        } catch (error) {
          db.exec('ROLLBACK')
          throw error
        }

        const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id)
        if (!row) throw new StoreApiError(404, '주문을 찾을 수 없습니다.')
        const productRow = db.prepare('SELECT * FROM products WHERE id = ?').get(row.product_id)
        sendJson(res, 200, { order: orderFromRow(row), product: productRow ? productFromRow(productRow) : null })
        return
      }

      const reviewMatch = pathname.match(/^\/api\/admin\/reviews\/([^/]+)$/)
      if (reviewMatch) {
        requireAdmin(req)
        const id = decodeURIComponent(reviewMatch[1])
        if (req.method === 'PATCH') {
          const body = await readJsonBody(req)
          if (!REVIEW_STATUSES.has(body.status)) throw new StoreApiError(400, '올바른 리뷰 상태가 아닙니다.')
          getDatabase().prepare('UPDATE reviews SET status = ? WHERE id = ?').run(body.status, id)
          const row = getDatabase().prepare('SELECT * FROM reviews WHERE id = ?').get(id)
          if (!row) throw new StoreApiError(404, '리뷰를 찾을 수 없습니다.')
          sendJson(res, 200, { review: reviewFromRow(row) })
          return
        }
        if (req.method === 'DELETE') {
          getDatabase().prepare('DELETE FROM reviews WHERE id = ?').run(id)
          sendJson(res, 200, { ok: true })
          return
        }
      }

      if (pathname === '/api/admin/settings' && req.method === 'PUT') {
        requireAdmin(req)
        const body = await readJsonBody(req)
        const settings = upsertSettings(getDatabase(), body.settings ?? body)
        sendJson(res, 200, { settings })
        return
      }

      sendJson(res, 405, { error: '지원하지 않는 요청입니다.' })
    } catch (error) {
      const statusCode = error instanceof StoreApiError ? error.statusCode : 500
      const message = error instanceof StoreApiError ? error.message : '스토어 데이터를 처리하지 못했습니다.'
      if (statusCode === 500) console.error(error)
      if (!res.headersSent) sendJson(res, statusCode, { error: message })
    }
  }
}

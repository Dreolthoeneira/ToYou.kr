import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import test from 'node:test'

const databasePath = resolve('data/toyou-store-api-test.sqlite')
process.env.TOYOU_DB_PATH = databasePath
process.env.TOYOU_SEED_DEMO = 'true'
rmSync(databasePath, { force: true })
rmSync(`${databasePath}-shm`, { force: true })
rmSync(`${databasePath}-wal`, { force: true })

const { createAuthApiMiddleware } = await import('./auth-api.js')
const { createStoreApiMiddleware } = await import('./store-api.js')
const { closeDatabase } = await import('./database.js')

function startTestServer() {
  const auth = createAuthApiMiddleware()
  const store = createStoreApiMiddleware()
  const server = createServer((req, res) => {
    auth(req, res, () => store(req, res, () => {
      res.statusCode = 404
      res.end('Not found')
    }))
  })

  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolveServer({ server, baseUrl: `http://127.0.0.1:${address.port}` })
    })
  })
}

const seedProduct = {
  id: 'backend-product',
  name: 'Backend Product',
  category: '테크',
  summary: 'SQL test product',
  description: 'Stored by the backend integration suite.',
  price: 10_000,
  compareAtPrice: 12_000,
  stock: 5,
  status: 'active',
  featured: true,
  art: 'case',
  palette: ['#ffffff', '#dddddd'],
  accent: '#111111',
  imageUrl: '',
  options: ['Black'],
  details: ['Server persisted'],
  createdAt: '2026-07-18T00:00:00.000Z',
}

test('TO YOU store data API', async (t) => {
  const { server, baseUrl } = await startTestServer()
  let cookie = ''

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...options.headers,
      },
    })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';')[0]
    const payload = await response.json()
    return { response, payload }
  }

  await t.test('legacy bootstrap seeds every store domain once', async () => {
    const result = await request('/api/store/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        products: [seedProduct],
        posts: [
          { id: 'published-post', title: 'Published', category: 'notice', excerpt: '', content: 'Body', status: 'published', pinned: false, createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z' },
          { id: 'draft-post', title: 'Draft', category: 'journal', excerpt: '', content: 'Body', status: 'draft', pinned: false, createdAt: '2026-07-18T00:00:00.000Z', updatedAt: '2026-07-18T00:00:00.000Z' },
        ],
        orders: [],
        reviews: [
          { id: 'visible-review', productId: seedProduct.id, productName: seedProduct.name, author: '김**', rating: 5, option: 'Black', body: '좋아요', status: 'visible', createdAt: '2026-07-18T00:00:00.000Z' },
          { id: 'hidden-review', productId: seedProduct.id, productName: seedProduct.name, author: '이**', rating: 3, option: 'Black', body: '검수중', status: 'hidden', createdAt: '2026-07-18T00:00:00.000Z' },
        ],
        settings: { storeName: 'TO YOU', announcement: 'SQL OPEN', shippingNotice: '당일 출고', supportEmail: 'hello@toyou.kr', supportPhone: '02-0000-0000', footerDescription: 'Backend store', maintenanceMode: false },
        importedProducts: [{ id: 'imported-seed', name: 'Imported Seed', originalUrl: 'https://example.com/seed' }],
      }),
    })
    assert.equal(result.response.status, 200)

    const storefront = await request('/api/storefront')
    assert.equal(storefront.payload.snapshot.products.length, 1)
    assert.deepEqual(storefront.payload.snapshot.posts.map((post) => post.id), ['published-post'])
    assert.deepEqual(storefront.payload.snapshot.reviews.map((review) => review.id), ['visible-review'])
    assert.equal(storefront.payload.snapshot.importedProducts[0].id, 'imported-seed')
  })

  await t.test('admin data is protected and available after admin login', async () => {
    const blocked = await request('/api/admin/snapshot')
    assert.equal(blocked.response.status, 401)

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@toyou.kr', password: 'test1234' }),
    })
    assert.equal(login.response.status, 200)
    assert.equal(login.payload.account.session.role, 'admin')

    const admin = await request('/api/admin/snapshot')
    assert.equal(admin.response.status, 200)
    assert.equal(admin.payload.snapshot.posts.length, 2)
    assert.equal(admin.payload.snapshot.reviews.length, 2)
  })

  await t.test('admin product, post, settings, order and review mutations persist', async () => {
    const productUpdate = await request(`/api/admin/products/${seedProduct.id}`, {
      method: 'PUT',
      body: JSON.stringify({ product: { ...seedProduct, price: 11_000, stock: 6 } }),
    })
    assert.equal(productUpdate.response.status, 200)
    assert.equal(productUpdate.payload.product.price, 11_000)

    const postUpdate = await request('/api/admin/posts/new-post', {
      method: 'PUT',
      body: JSON.stringify({ post: { id: 'new-post', title: 'New Story', category: 'event', excerpt: 'Event', content: 'Details', status: 'published', pinned: true, createdAt: '2026-07-18T01:00:00.000Z', updatedAt: '2026-07-18T01:00:00.000Z' } }),
    })
    assert.equal(postUpdate.response.status, 200)

    const settingsUpdate = await request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: { storeName: 'TO YOU SQL', announcement: 'UPDATED', shippingNotice: '내일 출고', supportEmail: 'sql@toyou.kr', supportPhone: '02-1111-2222', footerDescription: 'Persisted', maintenanceMode: true } }),
    })
    assert.equal(settingsUpdate.payload.settings.storeName, 'TO YOU SQL')

    const orderResult = await request('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ order: { productId: seedProduct.id, option: 'Black', quantity: 2, customerName: '김승우', phone: '010-1234-5678', address: '[06236] 서울시 강남구', paymentMethod: 'card', deliveryNote: '문 앞' } }),
    })
    assert.equal(orderResult.response.status, 201)
    assert.equal(orderResult.payload.order.total, 25_000)
    assert.equal(orderResult.payload.product.stock, 4)

    const statusResult = await request(`/api/admin/orders/${encodeURIComponent(orderResult.payload.order.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'shipping' }),
    })
    assert.equal(statusResult.payload.order.status, 'shipping')

    const cancelResult = await request(`/api/admin/orders/${encodeURIComponent(orderResult.payload.order.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    })
    assert.equal(cancelResult.payload.product.stock, 6)

    const restoreResult = await request(`/api/admin/orders/${encodeURIComponent(orderResult.payload.order.id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'preparing' }),
    })
    assert.equal(restoreResult.payload.product.stock, 4)

    const reviewResult = await request('/api/admin/reviews/hidden-review', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'visible' }),
    })
    assert.equal(reviewResult.payload.review.status, 'visible')

    const importedResult = await request('/api/imported-products', {
      method: 'POST',
      body: JSON.stringify({ product: { id: 'imported-live', name: 'Imported Live', originalUrl: 'https://example.com/live' } }),
    })
    assert.equal(importedResult.response.status, 200)

    const admin = await request('/api/admin/snapshot')
    assert.equal(admin.payload.snapshot.orders.length, 1)
    assert.equal(admin.payload.snapshot.settings.storeName, 'TO YOU SQL')
    assert.equal(admin.payload.snapshot.importedProducts.some((product) => product.id === 'imported-live'), true)
  })

  await t.test('cart, wishlist, restock alerts and purchase requests persist per member', async () => {
    const cart = await request('/api/account/cart/items', {
      method: 'POST',
      body: JSON.stringify({ items: [{ productId: seedProduct.id, option: 'Black', quantity: 2 }] }),
    })
    assert.equal(cart.response.status, 200)
    assert.equal(cart.payload.activity.cartCount, 2)

    const cartView = await request('/api/account/cart')
    assert.equal(cartView.response.status, 200)
    assert.equal(cartView.payload.cart.lines.length, 1)
    assert.equal(cartView.payload.cart.lines[0].product.id, seedProduct.id)
    assert.equal(cartView.payload.cart.lines[0].option, 'Black')
    assert.equal(cartView.payload.cart.lines[0].quantity, 2)

    const cartQuantity = await request(`/api/account/cart/items/${seedProduct.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ option: 'Black', quantity: 3 }),
    })
    assert.equal(cartQuantity.response.status, 200)
    assert.equal(cartQuantity.payload.cart.activity.cartCount, 3)
    assert.equal(cartQuantity.payload.cart.lines[0].quantity, 3)

    const cartDelete = await request(`/api/account/cart/items/${seedProduct.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ option: 'Black' }),
    })
    assert.equal(cartDelete.response.status, 200)
    assert.equal(cartDelete.payload.cart.activity.cartCount, 0)
    assert.deepEqual(cartDelete.payload.cart.lines, [])

    const wishlist = await request(`/api/account/wishlist/${seedProduct.id}`, { method: 'PUT' })
    assert.deepEqual(wishlist.payload.activity.wishlistProductIds, [seedProduct.id])

    const restock = await request(`/api/account/restock/${seedProduct.id}`, { method: 'PUT' })
    assert.deepEqual(restock.payload.activity.restockProductIds, [seedProduct.id])

    const purchaseRequest = await request('/api/purchase-requests', {
      method: 'POST',
      body: JSON.stringify({ productId: 'imported-live', option: 'Default', note: '포장 확인', estimatedTotal: 42_000 }),
    })
    assert.equal(purchaseRequest.response.status, 201)
    assert.equal(purchaseRequest.payload.request.status, 'requested')

    const admin = await request('/api/admin/snapshot')
    assert.equal(admin.payload.snapshot.purchaseRequests.length, 1)
  })

  await t.test('non-admin sessions cannot mutate admin data', async () => {
    cookie = ''
    const social = await request('/api/auth/social-demo', { method: 'POST', body: JSON.stringify({ provider: 'Google' }) })
    assert.equal(social.payload.account.session.role, 'customer')
    const blocked = await request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: { storeName: 'HACKED' } }),
    })
    assert.equal(blocked.response.status, 403)
  })

  await new Promise((resolveClose) => server.close(resolveClose))
  closeDatabase()
  rmSync(databasePath, { force: true })
  rmSync(`${databasePath}-shm`, { force: true })
  rmSync(`${databasePath}-wal`, { force: true })
})

export type AppRoute =
  | { page: 'home' }
  | { page: 'collection'; season: 'spring' | 'summer' | 'winter' }
  | { page: 'import' }
  | { page: 'import-product'; productId: string }
  | { page: 'product'; productId: string }
  | { page: 'checkout'; productId: string }
  | { page: 'cart' }
  | { page: 'admin-products' }
  | { page: 'login' }
  | { page: 'signup' }
  | { page: 'profile' }
  | { page: 'orders' }
  | { page: 'posts' }
  | { page: 'post'; postId: string }

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  const normalized = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return normalized || '/'
}

const appBasePath = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '')

export function getAppPathname(browserPathname: string) {
  if (appBasePath === '/') return browserPathname
  if (browserPathname === appBasePath) return '/'
  if (browserPathname.startsWith(`${appBasePath}/`)) {
    return browserPathname.slice(appBasePath.length) || '/'
  }
  return browserPathname
}

export function getBrowserPath(appPath: string) {
  if (appBasePath === '/') return appPath
  return `${appBasePath}/${appPath.replace(/^\//, '')}`
}

export function parseRoute(pathname: string): AppRoute {
  const normalized = normalizePathname(pathname)
  const importProductMatch = normalized.match(/^\/import\/products\/([^/]+)$/)
  const productMatch = normalized.match(/^\/products\/([^/]+)$/)
  const checkoutMatch = normalized.match(/^\/checkout\/([^/]+)$/)
  const collectionMatch = normalized.match(/^\/collections\/(spring|summer|winter)-2026$/)
  const postMatch = normalized.match(/^\/posts\/([^/]+)$/)

  if (postMatch) {
    return { page: 'post', postId: decodeURIComponent(postMatch[1]) }
  }

  if (normalized === '/posts') {
    return { page: 'posts' }
  }

  if (normalized === '/account/profile') {
    return { page: 'profile' }
  }

  if (normalized === '/account/orders') {
    return { page: 'orders' }
  }

  if (normalized === '/cart') {
    return { page: 'cart' }
  }

  if (collectionMatch) {
    return { page: 'collection', season: collectionMatch[1] as 'spring' | 'summer' | 'winter' }
  }

  if (checkoutMatch) {
    return {
      page: 'checkout',
      productId: decodeURIComponent(checkoutMatch[1]),
    }
  }

  if (importProductMatch) {
    return {
      page: 'import-product',
      productId: decodeURIComponent(importProductMatch[1]),
    }
  }

  if (productMatch) {
    return {
      page: 'product',
      productId: decodeURIComponent(productMatch[1]),
    }
  }

  if (normalized === '/login') {
    return { page: 'login' }
  }

  if (normalized === '/import') {
    return { page: 'import' }
  }

  if (normalized === '/admin/products') {
    return { page: 'admin-products' }
  }

  if (normalized === '/signup') {
    return { page: 'signup' }
  }

  return { page: 'home' }
}

export function getProductPath(productId: string) {
  return `/products/${encodeURIComponent(productId)}`
}

export function getCollectionPath(season: 'spring' | 'summer' | 'winter') {
  return `/collections/${season}-2026`
}

export function getCheckoutPath(productId: string, quantity: number, option: string) {
  const params = new URLSearchParams({ quantity: String(quantity) })
  if (option) params.set('option', option)
  return `/checkout/${encodeURIComponent(productId)}?${params.toString()}`
}

export function getCartPath() {
  return '/cart'
}

export function getOrdersPath() {
  return '/account/orders'
}

export function getImportedProductPath(productId: string) {
  return `/import/products/${encodeURIComponent(productId)}`
}

export function getPostsPath() {
  return '/posts'
}

export function getPostPath(postId: string) {
  return `/posts/${encodeURIComponent(postId)}`
}

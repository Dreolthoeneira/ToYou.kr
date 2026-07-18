import { products, type ArtType } from './data'

export type CatalogProductStatus = 'active' | 'draft' | 'soldout'

export type CatalogProduct = {
  id: string
  name: string
  category: string
  summary: string
  description: string
  price: number
  compareAtPrice: number
  stock: number
  status: CatalogProductStatus
  featured: boolean
  art: ArtType
  palette: [string, string]
  accent: string
  imageUrl?: string
  options: string[]
  details: string[]
  createdAt: string
}

const stockByIndex = [24, 11, 38, 7, 16, 20]

export const seedCatalog: CatalogProduct[] = products.map((product, index) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  summary: product.caption,
  description: product.overview,
  price: product.price,
  compareAtPrice: product.originalPrice,
  stock: stockByIndex[index] ?? 12,
  status: 'active',
  featured: index === 1 || index === 4,
  art: product.art,
  palette: product.palette,
  accent: product.accent,
  imageUrl: product.imageUrl,
  options: product.options,
  details: product.detailPoints,
  createdAt: new Date(2026, 6, 12 - index).toISOString(),
}))

const CATALOG_STORAGE_KEY = 'toyou-owned-store-catalog-v1'

function isCatalogProduct(value: unknown): value is CatalogProduct {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<CatalogProduct>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.price === 'number' &&
    typeof candidate.stock === 'number' &&
    Array.isArray(candidate.options)
  )
}

export function loadCatalog() {
  if (typeof window === 'undefined') return seedCatalog

  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY)
    if (!stored) return seedCatalog

    const parsed = JSON.parse(stored) as unknown
    if (!Array.isArray(parsed)) return seedCatalog

    const validProducts = parsed.filter(isCatalogProduct)
    return validProducts.length > 0 ? validProducts : seedCatalog
  } catch {
    return seedCatalog
  }
}

export function saveCatalog(catalog: CatalogProduct[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalog))
  } catch {
    // A very large uploaded image can exceed localStorage. The current catalog
    // remains usable in memory and can be saved again with a smaller image.
  }
}

export function createCatalogProductId(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'product'}-${Date.now().toString(36)}`
}


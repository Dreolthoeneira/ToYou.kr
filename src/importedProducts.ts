import { products, type Product, type ProductSpec } from './data'
import type { Locale } from './i18n'

const STORAGE_KEY = 'onda-imported-products'
let serverImportedProducts: Product[] | null = null
const SUPPORTED_ARTS: Product['art'][] = ['case', 'bag', 'drop', 'buds', 'cap', 'jar']
const PALETTES: Array<{ palette: [string, string]; accent: string }> = [
  { palette: ['#ffe8ef', '#f7bfd0'], accent: '#ad2347' },
  { palette: ['#ebf4ff', '#b4d0ff'], accent: '#2458c5' },
  { palette: ['#fff6e8', '#f7ddb2'], accent: '#9b5c14' },
  { palette: ['#f2eeff', '#d7c8ff'], accent: '#6240c8' },
  { palette: ['#fff3ea', '#ffd2b8'], accent: '#ba5428' },
  { palette: ['#eefce9', '#c4edb7'], accent: '#4f8c1f' },
]

export interface ScrapedProductPayload {
  sourceUrl: string
  sourceHost: string
  marketplace: string
  siteKey?: string | null
  siteProfile?: string | null
  productName: string
  price: number
  originalPrice?: number | null
  priceCurrency?: string | null
  description?: string | null
  imageUrl?: string | null
  imageUrls?: string[] | null
  importantInfo?: ProductSpec[] | null
  options?: string[] | null
  tags?: string[] | null
  notices?: string[] | null
  brand?: string | null
  sellerName?: string | null
  category?: string | null
}

function normalizeImageUrls(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const imageUrls: string[] = []

  for (const value of values) {
    const imageUrl = String(value ?? '').trim()

    if (!imageUrl || seen.has(imageUrl)) {
      continue
    }

    seen.add(imageUrl)
    imageUrls.push(imageUrl)
  }

  return imageUrls
}

function normalizeTextList(values: Array<string | null | undefined> | null | undefined, limit = 10) {
  const seen = new Set<string>()
  const results: string[] = []

  if (!Array.isArray(values)) {
    return results
  }

  for (const value of values) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim()

    if (!text || seen.has(text)) {
      continue
    }

    seen.add(text)
    results.push(text)

    if (results.length >= limit) {
      break
    }
  }

  return results
}

function normalizeInfoItems(values: ProductSpec[] | null | undefined, limit = 12) {
  const seen = new Set<string>()
  const results: ProductSpec[] = []

  if (!Array.isArray(values)) {
    return results
  }

  for (const item of values) {
    const label = String(item?.label ?? '').replace(/\s+/g, ' ').trim()
    const value = String(item?.value ?? '').replace(/\s+/g, ' ').trim()
    const key = `${label.toLowerCase()}:${value.toLowerCase()}`

    if (!label || !value || seen.has(key)) {
      continue
    }

    seen.add(key)
    results.push({ label, value })

    if (results.length >= limit) {
      break
    }
  }

  return results
}

function mergeSpecs(values: ProductSpec[], limit = 16) {
  const seen = new Set<string>()
  const results: ProductSpec[] = []

  for (const item of values) {
    const label = item.label.replace(/\s+/g, ' ').trim()
    const value = item.value.replace(/\s+/g, ' ').trim()
    const key = `${label.toLowerCase()}:${value.toLowerCase()}`

    if (!label || !value || seen.has(key)) {
      continue
    }

    seen.add(key)
    results.push({ label, value })

    if (results.length >= limit) {
      break
    }
  }

  return results
}

function infoItemsToDetailPoints(items: ProductSpec[]) {
  return items.slice(0, 3).map((item) => `${item.label}: ${item.value}`)
}

function hashText(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function clipText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`
}

function isKreamPayload(payload: ScrapedProductPayload) {
  return /(^|\.)kream\.co\.kr$/i.test(payload.sourceHost) || /kream/i.test(payload.marketplace)
}

function isBookMarketplace(marketplace: string) {
  return /YES24|ALADIN/i.test(marketplace)
}

function isUsedMarketplace(marketplace: string) {
  return /BUNJANG|JOONGNA|FLEAMARKET/i.test(marketplace)
}

function normalizeImportedMarketplace(payload: ScrapedProductPayload) {
  const source = `${payload.marketplace} ${payload.sourceHost} ${payload.siteKey ?? ''}`

  if (/yes24|\uc608\uc2a424/i.test(source)) {
    return 'YES24'
  }

  if (/aladin|\uc54c\ub77c\ub518/i.test(source)) {
    return 'ALADIN'
  }

  if (/olive\s*young|\uc62c\ub9ac\ube0c\uc601/i.test(source)) {
    return 'OLIVE YOUNG'
  }

  if (/smartstore|naver smart|brand\.naver|NAVER_SMARTSTORE|\uc2a4\ub9c8\ud2b8\uc2a4\ud1a0\uc5b4/i.test(source)) {
    return 'NAVER SMARTSTORE'
  }

  if (/shopping\.naver|naver shopping|\ub124\uc774\ubc84\s*\uc1fc\ud551/i.test(source)) {
    return 'NAVER SHOPPING'
  }

  if (/kream/i.test(source)) {
    return 'KREAM'
  }

  if (/musinsa|\ubb34\uc2e0\uc0ac/i.test(source)) {
    return 'MUSINSA'
  }

  if (/coupang|\ucfe0\ud321/i.test(source)) {
    return 'COUPANG'
  }

  if (/bunjang|\ubc88\uac1c\uc7a5\ud130/i.test(source)) {
    return 'BUNJANG'
  }

  if (/alpha|\uc54c\ud30c/i.test(source)) {
    return 'ALPHA'
  }

  if (/joongna|\uc911\uace0\ub098\ub77c/i.test(source)) {
    return 'JOONGNA'
  }

  if (/fleamarket|n\s*\ud50c\ub9ac\ub9c8\ucf13|\ud50c\ub9ac\ub9c8\ucf13/i.test(source)) {
    return 'NAVER FLEAMARKET'
  }

  return payload.marketplace
}

function inferKreamKind(source: string) {
  const lowered = source.toLowerCase()

  if (
    /(shoe|shoes|sneaker|sneakers|nike|adidas|jordan|salomon|asics|new balance|문 슈|러너|덩크)/i.test(lowered)
  ) {
    return 'sneakers'
  }

  if (/(hoodie|tee|shirt|jacket|pants|후드|티셔츠|자켓|팬츠)/i.test(lowered)) {
    return 'apparel'
  }

  if (/(cap|hat|bag|wallet|모자|볼캡|가방|백팩)/i.test(lowered)) {
    return 'accessory'
  }

  return 'one-size'
}

function createKreamOptions(payload: ScrapedProductPayload, locale: Locale) {
  const kind = inferKreamKind(`${payload.productName} ${payload.description ?? ''}`)

  if (kind === 'sneakers') {
    return ['240', '245', '250', '255', '260', '265', '270', '275', '280', '285']
  }

  if (kind === 'apparel') {
    return ['S', 'M', 'L', 'XL']
  }

  if (kind === 'accessory') {
    return ['OS', 'M/L']
  }

  return [locale === 'ko' ? 'ONE SIZE' : 'ONE SIZE']
}

function createKreamTags(payload: ScrapedProductPayload, locale: Locale) {
  const kind = inferKreamKind(`${payload.productName} ${payload.description ?? ''}`)

  if (locale === 'ko') {
    if (kind === 'sneakers') return ['KREAM', '스니커즈', '실시간 시세']
    if (kind === 'apparel') return ['KREAM', '의류', '사이즈 보드']
    if (kind === 'accessory') return ['KREAM', '액세서리', '실시간 시세']
    return ['KREAM', 'ONE SIZE', '리셀 보드']
  }

  if (kind === 'sneakers') return ['KREAM', 'Sneakers', 'Live market']
  if (kind === 'apparel') return ['KREAM', 'Apparel', 'Size board']
  if (kind === 'accessory') return ['KREAM', 'Accessories', 'Live market']
  return ['KREAM', 'One size', 'Resale board']
}

function createKreamCategory(locale: Locale) {
  if (locale === 'ko') return 'KREAM 셀렉션'
  if (locale === 'ja') return 'KREAMセレクション'
  if (locale === 'zh') return 'KREAM 选品'
  if (locale === 'es') return 'Selección KREAM'
  if (locale === 'fr') return 'Sélection KREAM'
  return 'KREAM Selection'
}

function extractKreamModelNumber(payload: ScrapedProductPayload) {
  const source = `${payload.description ?? ''} ${payload.productName}`
  return source.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+/)?.[0] ?? ''
}

function buildKreamCaption(payload: ScrapedProductPayload, locale: Locale) {
  if (locale === 'ko') {
    return 'KREAM 상품 상세에서 가져온 아이템입니다. 선택한 사이즈 기준 시세와 요청 메모를 함께 정리해 보세요.'
  }

  return 'Imported from a KREAM product detail page. Review size-based pricing and leave handling notes in one flow.'
}

function buildKreamOverview(payload: ScrapedProductPayload, locale: Locale) {
  const base = payload.description?.replace(/\s+/g, ' ').trim()

  if (base) {
    return clipText(base, 220)
  }

  if (locale === 'ko') {
    return 'KREAM 링크에서 불러온 상품입니다. 선택한 사이즈를 중심으로 즉시 구매가, 입찰 보드, 검수 요청 메모를 함께 관리합니다.'
  }

  return 'This product was imported from KREAM. Use the selected size as the anchor for instant buy pricing, bid boards, and inspection notes.'
}

function buildKreamDetailPoints(payload: ScrapedProductPayload, locale: Locale) {
  if (locale === 'ko') {
    return [
      `원본 플랫폼: ${payload.marketplace}`,
      '사이즈 기준 시세 보드와 검수 요청을 같은 화면에서 관리합니다.',
      `감지된 통화: ${payload.priceCurrency || 'KRW'}`,
    ] as [string, string, string]
  }

  return [
    `Source marketplace: ${payload.marketplace}`,
    'Size-based pricing and inspection notes are kept in the same market board view.',
    `Detected currency: ${payload.priceCurrency || 'KRW'}`,
  ] as [string, string, string]
}

function readStorage(): Product[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(items: Product[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const importedProductCopy: Record<
  Locale,
  {
    category: string
    caption: (marketplace: string) => string
    eta: string
    tag: string
    defaultOption: string
    overview: (marketplace: string) => string
    detailPoints: (payload: ScrapedProductPayload) => [string, string, string]
    specLabels: { sourceHost: string; currency: string; importedAt: string; flow: string; flowValue: string }
    notices: [string, string]
  }
> = {
  ko: {
    category: '수입 상품',
    caption: (marketplace) => `${marketplace}에서 불러온 상품입니다. 주문 전 원본 페이지를 꼭 확인해 주세요.`,
    eta: '5-8일',
    tag: '수입 상품',
    defaultOption: '기본 옵션',
    overview: (marketplace) => `${marketplace}에서 불러온 상품입니다. 옵션, 재고, 최종 배송비를 주문 전에 다시 확인해 주세요.`,
    detailPoints: (payload) => [
      `원본 판매처: ${payload.sourceHost}`,
      `감지된 마켓: ${payload.marketplace}`,
      `감지된 통화: ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: '원본 호스트',
      currency: '통화',
      importedAt: '가져온 시각',
      flow: '수집 방식',
      flowValue: 'URL 자동 수집',
    },
    notices: [
      '주문 전 원본 페이지에서 옵션, 재고, 배송 제한 여부를 다시 확인해 주세요.',
      '원본 상품 가격이나 할인 상태가 바뀌면 가져온 가격도 달라질 수 있습니다.',
    ],
  },
  en: {
    category: 'Imported',
    caption: (marketplace) => `Imported from ${marketplace}. Review the source page before ordering.`,
    eta: '5-8 days',
    tag: 'Imported',
    defaultOption: 'Default option',
    overview: (marketplace) => `This item was imported from ${marketplace}. Verify options, stock, and final shipping before purchase.`,
    detailPoints: (payload) => [
      `Imported from: ${payload.sourceHost}`,
      `Detected marketplace: ${payload.marketplace}`,
      `Detected price currency: ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: 'Source host',
      currency: 'Currency',
      importedAt: 'Imported at',
      flow: 'Flow',
      flowValue: 'Auto scraped from URL',
    },
    notices: [
      'Check variant, stock, and shipping restrictions on the original page before ordering.',
      'Imported prices can change if the source product updates or discounts expire.',
    ],
  },
  ja: {
    category: '輸入商品',
    caption: (marketplace) => `${marketplace} から取り込んだ商品です。注文前に元ページを確認してください。`,
    eta: '5-8日',
    tag: '輸入商品',
    defaultOption: '基本オプション',
    overview: (marketplace) => `${marketplace} から取り込んだ商品です。オプション、在庫、最終送料を注文前に確認してください。`,
    detailPoints: (payload) => [
      `元の販売元: ${payload.sourceHost}`,
      `検出されたマーケット: ${payload.marketplace}`,
      `検出された通貨: ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: '元ホスト',
      currency: '通貨',
      importedAt: '取り込み日時',
      flow: '取り込み方法',
      flowValue: 'URL自動取得',
    },
    notices: [
      '注文前に元ページでオプション、在庫、配送制限を再確認してください。',
      '元商品の価格や割引が変わると、取り込んだ価格も変わる場合があります。',
    ],
  },
  zh: {
    category: '导入商品',
    caption: (marketplace) => `该商品已从 ${marketplace} 导入。下单前请确认原始页面。`,
    eta: '5-8天',
    tag: '导入商品',
    defaultOption: '默认选项',
    overview: (marketplace) => `该商品已从 ${marketplace} 导入。购买前请再次确认选项、库存和最终运费。`,
    detailPoints: (payload) => [
      `原始卖家: ${payload.sourceHost}`,
      `识别到的商城: ${payload.marketplace}`,
      `识别到的货币: ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: '原始域名',
      currency: '货币',
      importedAt: '导入时间',
      flow: '导入方式',
      flowValue: '通过 URL 自动抓取',
    },
    notices: [
      '下单前请在原始页面再次确认规格、库存和配送限制。',
      '如果原始商品价格或折扣发生变化，导入价格也可能随之变化。',
    ],
  },
  es: {
    category: 'Importado',
    caption: (marketplace) => `Producto importado desde ${marketplace}. Revisa la página original antes de comprar.`,
    eta: '5-8 días',
    tag: 'Importado',
    defaultOption: 'Opción predeterminada',
    overview: (marketplace) => `Este artículo fue importado desde ${marketplace}. Verifica opciones, stock y envío final antes de comprar.`,
    detailPoints: (payload) => [
      `Importado desde: ${payload.sourceHost}`,
      `Marketplace detectado: ${payload.marketplace}`,
      `Moneda detectada: ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: 'Host de origen',
      currency: 'Moneda',
      importedAt: 'Importado el',
      flow: 'Flujo',
      flowValue: 'Captura automática por URL',
    },
    notices: [
      'Revisa variante, stock y restricciones de envío en la página original antes de comprar.',
      'Los precios importados pueden cambiar si el producto original cambia o expira un descuento.',
    ],
  },
  fr: {
    category: 'Importé',
    caption: (marketplace) => `Produit importé depuis ${marketplace}. Vérifiez la page source avant de commander.`,
    eta: '5-8 jours',
    tag: 'Importé',
    defaultOption: 'Option par défaut',
    overview: (marketplace) => `Cet article a été importé depuis ${marketplace}. Vérifiez les options, le stock et le coût final avant l'achat.`,
    detailPoints: (payload) => [
      `Importé depuis : ${payload.sourceHost}`,
      `Marketplace détecté : ${payload.marketplace}`,
      `Devise détectée : ${payload.priceCurrency || 'KRW'}`,
    ],
    specLabels: {
      sourceHost: 'Hôte source',
      currency: 'Devise',
      importedAt: 'Importé le',
      flow: 'Flux',
      flowValue: 'Capture automatique depuis URL',
    },
    notices: [
      'Vérifiez variante, stock et restrictions de livraison sur la page d’origine avant de commander.',
      'Les prix importés peuvent changer si le produit source évolue ou si une promotion expire.',
    ],
  },
}

export function createImportedProduct(payload: ScrapedProductPayload, locale: Locale = 'ko'): Product {
  const seed = hashText(payload.sourceUrl)
  const paletteChoice = PALETTES[seed % PALETTES.length]
  const price = Math.max(Math.round(payload.price), 0)
  const originalPrice = Math.max(Math.round(payload.originalPrice ?? payload.price), price)
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0
  const importedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const imageUrls = normalizeImageUrls([...(payload.imageUrls ?? []), payload.imageUrl])
  const copy = importedProductCopy[locale]
  const kream = isKreamPayload(payload)
  const modelNumber = kream ? extractKreamModelNumber(payload) : ''
  const importantInfo = normalizeInfoItems(payload.importantInfo)
  const payloadTags = normalizeTextList(payload.tags, 6)
  const payloadOptions = normalizeTextList(payload.options, 16)
  const payloadNotices = normalizeTextList(payload.notices, 3)
  const marketplace = kream ? 'KREAM' : normalizeImportedMarketplace(payload)
  const defaultTags = kream
    ? createKreamTags(payload, locale)
    : [copy.tag, marketplace, payload.sourceHost, payload.priceCurrency || 'KRW']
  const defaultOptions = kream
    ? createKreamOptions(payload, locale)
    : isBookMarketplace(marketplace)
      ? locale === 'ko'
        ? ['종이책', 'eBook', '선물포장 요청']
        : ['Paperback', 'eBook', 'Gift wrap request']
      : isUsedMarketplace(marketplace)
        ? locale === 'ko'
          ? ['택배거래', '직거래', '안전결제 요청']
          : ['Parcel trade', 'In-person trade', 'Protected payment request']
        : [copy.defaultOption]
  const defaultDetailPoints = kream
    ? buildKreamDetailPoints(payload, locale)
    : importantInfo.length > 0
      ? infoItemsToDetailPoints(importantInfo)
      : copy.detailPoints(payload)
  const sourceSpecs = [
    ...(modelNumber ? [{ label: locale === 'ko' ? '모델번호' : 'Model', value: modelNumber }] : []),
    ...importantInfo,
    { label: copy.specLabels.sourceHost, value: payload.sourceHost },
    { label: copy.specLabels.currency, value: payload.priceCurrency || 'KRW' },
    { label: copy.specLabels.importedAt, value: importedAt },
    { label: copy.specLabels.flow, value: copy.specLabels.flowValue },
  ]

  return {
    id: `imported-${seed}-${Date.now()}`,
    category: kream ? createKreamCategory(locale) : payload.category || copy.category,
    name: payload.productName,
    caption: clipText(kream ? buildKreamCaption(payload, locale) : payload.description || copy.caption(payload.marketplace), 120),
    marketplace,
    eta: copy.eta,
    originalPrice,
    price,
    discount,
    art: SUPPORTED_ARTS[seed % SUPPORTED_ARTS.length],
    palette: paletteChoice.palette,
    accent: paletteChoice.accent,
    tags: normalizeTextList([...payloadTags, ...defaultTags], 8),
    originalUrl: payload.sourceUrl,
    originShop: kream ? 'KREAM' : payload.sourceHost,
    imageUrl: imageUrls[0],
    imageUrls,
    options: payloadOptions.length > 0 ? payloadOptions : defaultOptions,
    overview: kream ? buildKreamOverview(payload, locale) : payload.description || copy.overview(payload.marketplace),
    detailPoints: defaultDetailPoints,
    specs: mergeSpecs(sourceSpecs),
    notices: payloadNotices.length > 0 ? payloadNotices : copy.notices,
  }
}

export function loadImportedProducts() {
  return serverImportedProducts ?? readStorage()
}

export function saveImportedProduct(product: Product) {
  const withoutDuplicate = loadImportedProducts().filter(
    (item) => item.originalUrl !== product.originalUrl && item.id !== product.id,
  )
  const next = [product, ...withoutDuplicate].slice(0, 12)
  serverImportedProducts = next
  writeStorage(next)
  return next
}

export function replaceImportedProducts(products: Product[]) {
  serverImportedProducts = [...products]
  writeStorage(serverImportedProducts)
}

export function clearImportedProducts() {
  serverImportedProducts = []
  writeStorage([])
}

export function getCatalogProducts() {
  return [...loadImportedProducts(), ...products]
}

export function findCatalogProduct(productId: string) {
  return getCatalogProducts().find((product) => product.id === productId)
}

export function getRelatedCatalogProducts(activeProductId: string) {
  if (activeProductId.startsWith('imported-')) {
    return []
  }

  const importedProducts = loadImportedProducts()
  const importedRelated = importedProducts.filter((product) => product.id !== activeProductId)

  if (importedRelated.length > 0) {
    return importedRelated.slice(0, 3)
  }

  return products.filter((product) => product.id !== activeProductId).slice(0, 3)
}

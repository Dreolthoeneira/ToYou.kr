const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

type ProductPayload = {
  sourceUrl: string
  sourceHost: string
  marketplace: string
  productName: string
  price: number
  originalPrice: number
  priceCurrency: string
  description?: string
  imageUrl?: string
  imageUrls?: string[]
  category?: string
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' },
  })
}

function clean(value: unknown) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

function parsePrice(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const parsed = Number(clean(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

function safeRemoteUrl(input: unknown) {
  const target = new URL(clean(input))
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('http 또는 https 상품 URL만 사용할 수 있습니다.')
  const host = target.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.local') || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '::1') {
    throw new Error('내부 네트워크 주소는 불러올 수 없습니다.')
  }
  return target
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeEntities(match[1])
  }
  return ''
}

function findProductJson(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductJson(item)
      if (found) return found
    }
    return null
  }
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  const type = Array.isArray(object['@type']) ? object['@type'] : [object['@type']]
  if (type.some((entry) => String(entry).toLowerCase() === 'product')) return object
  return findProductJson(object['@graph'])
}

function marketplace(host: string) {
  if (/yes24/.test(host)) return 'YES24'
  if (/aladin/.test(host)) return 'ALADIN'
  if (/oliveyoung/.test(host)) return 'OLIVE YOUNG'
  if (/musinsa/.test(host)) return 'MUSINSA'
  if (/kream/.test(host)) return 'KREAM'
  if (/bunjang/.test(host)) return 'BUNJANG'
  if (/joongna/.test(host)) return 'JOONGNA'
  if (/fleamarket\.naver/.test(host)) return 'NAVER FLEAMARKET'
  if (/naver/.test(host)) return 'NAVER'
  return host.replace(/^www\./, '').split('.')[0].toUpperCase()
}

async function scrapeProduct(url: unknown): Promise<ProductPayload> {
  const target = safeRemoteUrl(url)
  const response = await fetch(target, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; TOYOUCatalogBot/1.0)', 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  })
  if (!response.ok) throw new Error(`원본 사이트가 ${response.status} 상태로 응답했습니다.`)
  const html = await response.text()
  let productJson: Record<string, unknown> | null = null
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      productJson = findProductJson(JSON.parse(match[1]))
      if (productJson) break
    } catch {
      // Ignore invalid JSON-LD and continue with Open Graph metadata.
    }
  }
  const offerValue = Array.isArray(productJson?.offers) ? productJson?.offers[0] : productJson?.offers
  const offer = offerValue && typeof offerValue === 'object' ? offerValue as Record<string, unknown> : {}
  const imageValue = productJson?.image
  const imageUrl = clean(Array.isArray(imageValue) ? imageValue[0] : imageValue) || metaContent(html, 'og:image')
  const productName = clean(productJson?.name) || metaContent(html, 'og:title') || decodeEntities(clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]))
  const price = parsePrice(offer.price || offer.lowPrice || metaContent(html, 'product:price:amount'))
  if (!productName) throw new Error('상품명을 찾지 못했습니다. 다른 상품 상세 URL을 사용해 주세요.')
  if (!price) throw new Error('상품 가격을 찾지 못했습니다. 검색 결과 카드에서 가져오기를 사용해 주세요.')
  const finalUrl = new URL(response.url)
  return {
    sourceUrl: finalUrl.toString(),
    sourceHost: finalUrl.hostname.replace(/^www\./, ''),
    marketplace: marketplace(finalUrl.hostname),
    productName,
    price,
    originalPrice: parsePrice(metaContent(html, 'product:original_price:amount')) || price,
    priceCurrency: clean(offer.priceCurrency) || metaContent(html, 'product:price:currency') || 'KRW',
    description: clean(productJson?.description) || metaContent(html, 'og:description'),
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : [],
    category: clean(productJson?.category),
  }
}

async function searchBunjang(query: string): Promise<ProductPayload[]> {
  const url = `https://api.bunjang.co.kr/api/1/find_v2.json?q=${encodeURIComponent(query)}&order=score&page=0&request_id=${Date.now()}&stat_device=w&n=6&stat_category_required=1&req_ref=search&version=5`
  const response = await fetch(url, { headers: { accept: 'application/json', referer: 'https://m.bunjang.co.kr/' } })
  if (!response.ok) return []
  const payload = await response.json()
  return (Array.isArray(payload?.list) ? payload.list : []).filter((item: Record<string, unknown>) => item.type !== 'EXT_AD').slice(0, 6).map((item: Record<string, unknown>) => {
    const id = clean(item.pid)
    const imageUrl = clean(item.product_image).replace(/^http:/, 'https:')
    const price = parsePrice(item.price || item.originPrice)
    return {
      sourceUrl: `https://m.bunjang.co.kr/products/${id}`,
      sourceHost: 'm.bunjang.co.kr',
      marketplace: 'BUNJANG',
      productName: clean(item.name),
      price,
      originalPrice: parsePrice(item.originPrice) || price,
      priceCurrency: 'KRW',
      description: [clean(item.location), item.free_shipping ? '무료배송' : ''].filter(Boolean).join(' · '),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    }
  }).filter((item: ProductPayload) => item.productName && item.price)
}

async function searchNaverFlea(query: string): Promise<ProductPayload[]> {
  const url = `https://apis.fleamarket.naver.com/product/reader/v1/market-products/search?query=${encodeURIComponent(query)}&start=0&limit=6`
  const response = await fetch(url, { headers: { accept: 'application/json', origin: 'https://fleamarket.naver.com', referer: 'https://fleamarket.naver.com/search' } })
  if (!response.ok) return []
  const payload = await response.json()
  const items = Array.isArray(payload?.result?.marketProducts) ? payload.result.marketProducts : []
  return items.slice(0, 6).map((item: Record<string, unknown>) => {
    const id = clean(item.marketProductId)
    const imageUrl = clean(item.imageUrl || item.thumbnailUrl)
    const price = parsePrice(item.price || item.salePrice)
    return {
      sourceUrl: `https://fleamarket.naver.com/market-products/${id}`,
      sourceHost: 'fleamarket.naver.com',
      marketplace: 'NAVER FLEAMARKET',
      productName: clean(item.title || item.productName),
      price,
      originalPrice: price,
      priceCurrency: 'KRW',
      description: clean(item.description || item.location),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    }
  }).filter((item: ProductPayload) => item.productName && item.price)
}

async function searchBooks(query: string): Promise<ProductPayload[]> {
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`)
  if (!response.ok) throw new Error('도서 검색 서비스에 연결하지 못했습니다.')
  const payload = await response.json()
  return (Array.isArray(payload.items) ? payload.items : []).slice(0, 10).map((item: Record<string, unknown>, index: number) => {
    const info = (item.volumeInfo || {}) as Record<string, unknown>
    const sale = (item.saleInfo || {}) as Record<string, unknown>
    const listPrice = (sale.listPrice || sale.retailPrice || {}) as Record<string, unknown>
    const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers as Array<Record<string, unknown>> : []
    const isbn = clean(identifiers.find((entry) => entry.type === 'ISBN_13')?.identifier || identifiers[0]?.identifier)
    const market = index % 2 === 0 ? 'YES24' : 'ALADIN'
    const imageLinks = (info.imageLinks || {}) as Record<string, unknown>
    const imageUrl = clean(imageLinks.thumbnail || imageLinks.smallThumbnail).replace(/^http:/, 'https:')
    const price = parsePrice(listPrice.amount) || 18000
    return {
      sourceUrl: market === 'YES24'
        ? `https://www.yes24.com/Product/Search?domain=BOOK&query=${encodeURIComponent(isbn || clean(info.title))}`
        : `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=${encodeURIComponent(isbn || clean(info.title))}`,
      sourceHost: market === 'YES24' ? 'yes24.com' : 'aladin.co.kr',
      marketplace: market,
      productName: clean(info.title),
      price,
      originalPrice: price,
      priceCurrency: clean(listPrice.currencyCode) || 'KRW',
      description: [Array.isArray(info.authors) ? info.authors.join(', ') : '', clean(info.publisher), clean(info.publishedDate)].filter(Boolean).join(' · '),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
      category: '도서',
    }
  }).filter((item: ProductPayload) => item.productName)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'POST 요청만 지원합니다.' }, 405)
  try {
    const body = await request.json()
    const action = clean(body.action)
    if (action === 'scrape-product') return json({ product: await scrapeProduct(body.url) })
    if (action === 'search-books') return json({ results: await searchBooks(clean(body.query)) })
    if (action === 'search-used-products') {
      const requested = Array.isArray(body.marketplaces) ? body.marketplaces.map(clean) : []
      const searches: Array<Promise<ProductPayload[]>> = []
      if (requested.length === 0 || requested.includes('BUNJANG')) searches.push(searchBunjang(clean(body.query)))
      if (requested.length === 0 || requested.includes('NAVER FLEAMARKET')) searches.push(searchNaverFlea(clean(body.query)))
      return json({ results: (await Promise.all(searches)).flat() })
    }
    return json({ error: '지원하지 않는 상품 도구입니다.' }, 404)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : '상품 정보를 처리하지 못했습니다.' }, 400)
  }
})

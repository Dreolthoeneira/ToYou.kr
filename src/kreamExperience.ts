import type { Product } from './data'
import type { Locale } from './i18n'

export type KreamBoardRow = {
  size: string
  price: number
  meta: string
}

export type KreamSizeQuote = {
  size: string
  instantBuy: number
  sellAsk: number
  buyBid: number
  premium: number
  premiumPercent: number
}

export type KreamExperience = {
  brand: string
  line: string
  categoryLabel: string
  rank: number
  reviewCount: number
  wishCount: number
  shippingNote: string
  benefitNote: string
  modelNumber: string
  releaseDate: string
  releasePrice: number
  colorway: string
  focusSize: string
  shippingFee: number
  sizeQuotes: KreamSizeQuote[]
  trades: KreamBoardRow[]
  asks: KreamBoardRow[]
  bids: KreamBoardRow[]
  assurance: Array<{ title: string; body: string }>
  editorial: Array<{ title: string; body: string }>
  flow: Array<{ step: string; title: string; body: string }>
}

type ProductKind = 'sneakers' | 'apparel' | 'accessory' | 'beauty' | 'tech' | 'collectible'

function hashText(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function roundKrw(value: number) {
  return Math.max(Math.round(value / 1000) * 1000, 1000)
}

function extractBrand(name: string) {
  const cleaned = name.replace(/^\((?:W|M|GS|PS|TD)\)\s*/i, '').trim()
  const firstToken = cleaned.split(/\s+/)[0] || 'KREAM'

  if (/nike/i.test(cleaned)) return 'Nike'
  if (/adidas/i.test(cleaned)) return 'adidas'
  if (/jordan/i.test(cleaned)) return 'Jordan'
  if (/new balance/i.test(cleaned)) return 'New Balance'
  if (/salomon/i.test(cleaned)) return 'Salomon'
  if (/asics/i.test(cleaned)) return 'ASICS'

  return firstToken
}

function inferProductKind(product: Product): ProductKind {
  const source = `${product.category} ${product.name} ${product.caption} ${product.tags.join(' ')}`.toLowerCase()

  if (
    /(shoe|shoes|sneaker|sneakers|nike|adidas|jordan|salomon|asics|new balance|문 슈|덩크|에어|러너)/i.test(source)
  ) {
    return 'sneakers'
  }

  if (/(hoodie|tee|shirt|jacket|pants|denim|sweat|니트|자켓|후드|팬츠|셔츠)/i.test(source)) {
    return 'apparel'
  }

  if (/(beauty|ampoule|serum|lip|cream|뷰티|향수|perfume|candle|캔들)/i.test(source)) {
    return 'beauty'
  }

  if (/(earbuds|buds|speaker|case|tech|이어폰|케이스|맥세이프)/i.test(source)) {
    return 'tech'
  }

  if (/(bag|cap|hat|wallet|키링|가방|모자|볼캡|백팩)/i.test(source)) {
    return 'accessory'
  }

  return 'collectible'
}

function buildSizeList(kind: ProductKind, product: Product) {
  if (kind === 'sneakers') {
    return ['240', '245', '250', '255', '260', '265', '270', '275', '280', '285']
  }

  if (kind === 'apparel') {
    return ['S', 'M', 'L', 'XL']
  }

  if (kind === 'accessory') {
    if (/bag|wallet|가방/i.test(`${product.name} ${product.caption}`)) {
      return ['ONE SIZE']
    }

    return ['OS', 'M/L']
  }

  return ['ONE SIZE']
}

function inferCategoryLabel(kind: ProductKind, locale: Locale) {
  if (locale === 'ko') {
    if (kind === 'sneakers') return '스니커즈'
    if (kind === 'apparel') return '의류'
    if (kind === 'accessory') return '액세서리'
    if (kind === 'beauty') return '뷰티'
    if (kind === 'tech') return '테크'
    return '컬렉터블'
  }

  if (kind === 'sneakers') return 'Sneakers'
  if (kind === 'apparel') return 'Apparel'
  if (kind === 'accessory') return 'Accessories'
  if (kind === 'beauty') return 'Beauty'
  if (kind === 'tech') return 'Tech'
  return 'Collectibles'
}

function extractModelNumber(product: Product, seed: number) {
  const specValue = product.specs.find((spec) => /모델|model/i.test(spec.label))?.value

  if (specValue) {
    return specValue
  }

  const descriptionMatch = `${product.overview} ${product.caption}`.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{2,})+/)

  if (descriptionMatch?.[0]) {
    return descriptionMatch[0]
  }

  const prefix = extractBrand(product.name).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3) || 'KRM'
  return `${prefix}${String(seed % 9000 + 1000)}-${String((seed >> 3) % 900 + 100).padStart(3, '0')}`
}

function createReleaseDate(seed: number) {
  const year = 2024 + (seed % 3)
  const month = String((seed % 12) + 1).padStart(2, '0')
  const day = String((seed % 27) + 1).padStart(2, '0')
  return `${year}/${month}/${day}`
}

function createColorway(product: Product) {
  const source = `${product.name} ${product.caption}`.replace(/\s+/g, ' ').trim()
  const nameParts = source.split(' ')

  if (/\band\b/i.test(source)) {
    const tail = nameParts.slice(-3).join(' ')
    return tail
  }

  if (product.options.length > 0 && !/기본 옵션|default option/i.test(product.options[0])) {
    return product.options[0]
  }

  return product.tags.slice(0, 2).join(' / ') || 'Seasonal mix'
}

function createMetaLabel(index: number, locale: Locale, mode: 'trade' | 'ask' | 'bid') {
  if (mode === 'trade') {
    if (locale === 'ko') {
      return ['방금 전', '28분 전', '3시간 전', '어제', '2일 전'][index] ?? `${index + 1}일 전`
    }

    return ['Just now', '28m ago', '3h ago', 'Yesterday', '2d ago'][index] ?? `${index + 1}d ago`
  }

  return String(index + 1)
}

function buildSizeQuotes(product: Product, releasePrice: number, sizes: string[], seed: number) {
  const offsetSeed = [-0.05, -0.03, -0.01, 0, 0.02, 0.03, 0.05, 0.07, 0.09, 0.12]

  return sizes.map((size, index) => {
    const multiplier = 1 + offsetSeed[index % offsetSeed.length] + ((seed % 7) - 3) * 0.004
    const instantBuy = roundKrw(product.price * multiplier)
    const sellAsk = roundKrw(instantBuy + 6000 + (index % 3) * 4000)
    const buyBid = roundKrw(Math.max(instantBuy - (5000 + (index % 4) * 3000), releasePrice * 0.7))
    const premium = instantBuy - releasePrice
    const premiumPercent = releasePrice > 0 ? Number(((premium / releasePrice) * 100).toFixed(1)) : 0

    return {
      size,
      instantBuy,
      sellAsk,
      buyBid,
      premium,
      premiumPercent,
    }
  })
}

function createBoardRows(quotes: KreamSizeQuote[], locale: Locale, mode: 'trade' | 'ask' | 'bid') {
  const rows = quotes.slice(0, Math.min(quotes.length, 5))

  return rows.map((quote, index) => ({
    size: quote.size,
    price: mode === 'trade' ? quote.instantBuy : mode === 'ask' ? quote.sellAsk : quote.buyBid,
    meta: createMetaLabel(index, locale, mode),
  }))
}

export function getKreamExperience(product: Product, locale: Locale): KreamExperience {
  const seed = hashText(product.id)
  const kind = inferProductKind(product)
  const brand = extractBrand(product.name)
  const sizes = buildSizeList(kind, product)
  const baseReleasePrice =
    product.originalPrice > 0 && product.originalPrice < product.price
      ? product.originalPrice
      : roundKrw(product.price * (0.72 + (seed % 9) * 0.015))
  const releasePrice = Math.min(baseReleasePrice, roundKrw(product.price * 0.94))
  const sizeQuotes = buildSizeQuotes(product, releasePrice, sizes, seed)
  const focusSize = sizeQuotes[Math.min(Math.floor(sizeQuotes.length / 2), sizeQuotes.length - 1)]?.size ?? sizes[0]
  const shippingFee =
    kind === 'sneakers' ? 6900 : kind === 'apparel' ? 5900 : kind === 'accessory' ? 5200 : 4500

  return {
    brand,
    line: product.name,
    categoryLabel: inferCategoryLabel(kind, locale),
    rank: (seed % 24) + 1,
    reviewCount: (seed % 16) + 4,
    wishCount: 12000 + (seed % 370000),
    shippingNote: locale === 'ko' ? '일반배송 3,000원 · 5-7일 내 도착 예정' : 'Standard delivery KRW 3,000 · arrives in 5-7 days',
    benefitNote: locale === 'ko' ? '검수 완료 후 국제 배송 단계로 연결됩니다.' : 'After inspection, the item moves straight into outbound shipping.',
    modelNumber: extractModelNumber(product, seed),
    releaseDate: createReleaseDate(seed),
    releasePrice,
    colorway: createColorway(product),
    focusSize,
    shippingFee,
    sizeQuotes,
    trades: createBoardRows(sizeQuotes, locale, 'trade'),
    asks: createBoardRows([...sizeQuotes].sort((left, right) => left.sellAsk - right.sellAsk), locale, 'ask'),
    bids: createBoardRows([...sizeQuotes].sort((left, right) => right.buyBid - left.buyBid), locale, 'bid'),
    assurance: locale === 'ko'
      ? [
          {
            title: '100% 정품 기준',
            body: '상품 도착 후 기본 검수 포인트를 먼저 확인하고, 요청 메모가 있으면 우선 순위에 반영합니다.',
          },
          {
            title: '사이즈별 시세 추적',
            body: '선택한 사이즈를 기준으로 즉시 구매가, 판매 입찰, 구매 입찰 보드를 한 화면에서 비교합니다.',
          },
          {
            title: '해외 발송 연결',
            body: 'KREAM 원본 링크와 요청 메모를 묶어 국제 배송 단계까지 이어지도록 설계했습니다.',
          },
        ]
      : [
          {
            title: 'Authenticity-first flow',
            body: 'Core inspection points are checked first, then any extra request note is reflected in the handling flow.',
          },
          {
            title: 'Size-based market board',
            body: 'Instant buy, lowest ask, and highest bid stay aligned around the selected size in one view.',
          },
          {
            title: 'Outbound-ready handoff',
            body: 'The original KREAM link and your request note stay attached through the international shipping step.',
          },
        ],
    editorial: locale === 'ko'
      ? [
          {
            title: 'KREAM 구조 분석 포인트',
            body: '핵심 정보는 좌측 갤러리와 우측 시세 패널의 2열 구조 안에 밀도 높게 정리되어 있습니다.',
          },
          {
            title: '우리 사이트에 맞춘 확장',
            body: '리셀 시세 문법은 유지하되, 해외 배송과 검수 요청을 한 흐름 안으로 합쳐 구매 결정을 더 빠르게 만듭니다.',
          },
        ]
      : [
          {
            title: 'KREAM page pattern',
            body: 'The critical information is packed into a left gallery and right market panel with size-first decision making.',
          },
          {
            title: 'Our extension',
            body: 'We keep the resale-market language but add shipping and inspection handoff so the flow is actionable.',
          },
        ],
    flow: locale === 'ko'
      ? [
          { step: '01', title: '링크 분석', body: '상품명, 대표 이미지, 가격, 사이즈 구조를 KREAM 링크에서 정리합니다.' },
          { step: '02', title: '사이즈 선택', body: '즉시 구매가와 입찰 보드를 보며 구매 기준이 되는 사이즈를 고릅니다.' },
          { step: '03', title: '검수 메모', body: '박스 상태, 택 포함 여부, 오염 체크 같은 포인트를 메모로 남깁니다.' },
          { step: '04', title: '국제 배송', body: '구매 완료 후 검수와 재포장을 거쳐 해외 출고 단계로 연결합니다.' },
        ]
      : [
          { step: '01', title: 'Link intake', body: 'The KREAM URL is parsed into title, image, price, and size structure.' },
          { step: '02', title: 'Size decision', body: 'Choose a size while comparing instant buy, ask, and bid data in one board.' },
          { step: '03', title: 'Inspection memo', body: 'Leave notes for box condition, tags, accessories, or any visible flaws to check.' },
          { step: '04', title: 'International shipping', body: 'After purchase, inspection and repacking feed directly into outbound delivery.' },
        ],
  }
}

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowUpRight, ChevronRight, Copy, ShieldCheck, Star, Truck, Zap } from 'lucide-react'
import { EditorialHeader } from '../components/layout/EditorialHeader'
import { ProductArtwork } from '../components/ProductArtwork'
import { ProductImage } from '../components/ProductImage'
import type { AuthSession } from '../authSession'
import { findCatalogProduct, getCatalogProducts, getRelatedCatalogProducts } from '../importedProducts'
import { useI18n } from '../i18n'
import { getLocalizedProduct } from '../productLocalization'
import { getKreamExperience, type KreamSizeQuote } from '../kreamExperience'

type BoardTab = 'trades' | 'asks' | 'bids'
type ChartMetric = 'instantBuy' | 'sellAsk' | 'buyBid'
type ChartPlotPoint = { x: number; y: number }

interface ProductDetailPageProps {
  productId: string
  authSession: AuthSession | null
  onGoHome: () => void
  onGoToLogin: () => void
  onOpenProduct: (productId: string) => void
  onSubmitPurchaseRequest: (input: { productId: string; option: string; note: string; estimatedTotal: number }) => Promise<{ id: string; status: string }>
}

type DetailCopy = {
  headerHome: string
  missing: { title: string; description: string; action: string }
  nav: { product: string; market: string; assurance: string }
  hero: {
    source: string
    copied: string
    copy: string
    open: string
    rank: (rank: number) => string
    review: (count: number) => string
    interest: (count: string) => string
    instantBuy: string
    lowestAsk: string
    highestBid: string
    shipping: string
    request: string
    requestPlaceholder: string
    requestDefault: (name: string) => string
    buyNow: string
    openSource: string
  }
  specs: {
    title: string
    model: string
    releaseDate: string
    releasePrice: string
    color: string
    shipping: string
    benefit: string
  }
  board: {
    title: string
    description: string
    chartTitle: string
    chartDescription: string
    chartFilters: { instantBuy: string; sellAsk: string; buyBid: string }
    tabs: { trades: string; asks: string; bids: string }
    legend: { bid: string; instant: string; ask: string }
    columns: { option: string; price: string; meta: string; date: string; quantity: string }
  }
  editorial: {
    overview: string
    detailPoints: string
    marketRead: string
    notes: string
  }
  total: {
    title: string
    price: string
    fee: string
    domestic: string
    international: string
    total: string
    free: string
  }
  assurance: {
    title: string
    notesTitle: string
  }
  flow: {
    title: string
  }
}

const koCopy: DetailCopy = {
  headerHome: '홈',
  missing: {
    title: '해당 상품을 찾지 못했습니다.',
    description: '홈으로 돌아가 다른 KREAM 상품 링크를 다시 불러와 주세요.',
    action: '홈으로 돌아가기',
  },
  nav: { product: '상품', market: '시세', assurance: '보증' },
  hero: {
    source: '원본 링크',
    copied: '복사됨',
    copy: '링크 복사',
    open: '원본 열기',
    rank: (rank) => `급상승 ${rank}위`,
    review: (count) => `리뷰 ${count}`,
    interest: (count) => `관심 ${count}`,
    instantBuy: '즉시 구매가',
    lowestAsk: '판매 입찰 최저가',
    highestBid: '구매 입찰 최고가',
    shipping: '배송 메모',
    request: '검수 요청 메모',
    requestPlaceholder: '박스, 택, 구성품, 오염 여부 등 체크 포인트를 남겨주세요.',
    requestDefault: (name) => `"${name}" 주문 시 박스 상태, 택 포함 여부, 오염 여부를 우선 확인해 주세요.`,
    buyNow: '이 구성으로 구매 요청',
    openSource: 'KREAM 원본 보기',
  },
  specs: {
    title: '상품 핵심 정보',
    model: '모델번호',
    releaseDate: '발매일',
    releasePrice: '발매가',
    color: '컬러',
    shipping: '국내 배송',
    benefit: '진행 메모',
  },
  board: {
    title: '거래 보드',
    description: '선택한 사이즈를 기준으로 체결 거래, 판매 입찰, 구매 입찰을 바로 비교합니다.',
    chartTitle: '사이즈별 시세 막대 차트',
    chartDescription: '필터를 바꿔가며 사이즈별 즉시 구매가, 판매 입찰, 구매 입찰 흐름을 비교합니다.',
    chartFilters: { instantBuy: '즉시 구매가', sellAsk: '판매 입찰', buyBid: '구매 입찰' },
    tabs: { trades: '체결 거래', asks: '판매 입찰', bids: '구매 입찰' },
    legend: { bid: '구매 입찰', instant: '즉시 구매', ask: '판매 입찰' },
    columns: { option: '옵션', price: '거래가', meta: '메타', date: '거래일', quantity: '수량' },
  },
  editorial: {
    overview: '상품 해설',
    detailPoints: '체크 포인트',
    marketRead: '페이지 읽기',
    notes: '유의사항',
  },
  total: {
    title: '예상 결제 총액',
    price: '즉시 구매가',
    fee: '서비스 수수료',
    domestic: '국내 배송비',
    international: '국제 배송비',
    total: '총 결제액',
    free: '무료',
  },
  assurance: {
    title: '보증과 검수',
    notesTitle: '구매 전 확인사항',
  },
  flow: {
    title: '진행 플로우',
  },
}

const enCopy: DetailCopy = {
  headerHome: 'Home',
  missing: {
    title: 'We could not find that product.',
    description: 'Go back home and load another KREAM product URL.',
    action: 'Back home',
  },
  nav: { product: 'Product', market: 'Market', assurance: 'Assurance' },
  hero: {
    source: 'Source link',
    copied: 'Copied',
    copy: 'Copy link',
    open: 'Open source',
    rank: (rank) => `Rising #${rank}`,
    review: (count) => `${count} reviews`,
    interest: (count) => `${count} interested`,
    instantBuy: 'Instant buy',
    lowestAsk: 'Lowest ask',
    highestBid: 'Highest bid',
    shipping: 'Shipping note',
    request: 'Inspection request note',
    requestPlaceholder: 'Leave points to check for the box, tags, accessories, or visible flaws.',
    requestDefault: (name) => `For "${name}", please prioritize the box condition, included tags, and visible flaws.`,
    buyNow: 'Request purchase with this setup',
    openSource: 'Open original KREAM page',
  },
  specs: {
    title: 'Key product information',
    model: 'Model',
    releaseDate: 'Release date',
    releasePrice: 'Retail price',
    color: 'Color',
    shipping: 'Domestic shipping',
    benefit: 'Flow note',
  },
  board: {
    title: 'Market board',
    description: 'Compare completed trades, asks, and bids immediately around the selected size.',
    chartTitle: 'Size market bar chart',
    chartDescription: 'Switch filters to compare instant buy, asks, and bids across available sizes.',
    chartFilters: { instantBuy: 'Instant buy', sellAsk: 'Ask', buyBid: 'Bid' },
    tabs: { trades: 'Trades', asks: 'Asks', bids: 'Bids' },
    legend: { bid: 'Bid', instant: 'Instant', ask: 'Ask' },
    columns: { option: 'Option', price: 'Price', meta: 'Meta', date: 'Date', quantity: 'Qty' },
  },
  editorial: {
    overview: 'Overview',
    detailPoints: 'Checkpoints',
    marketRead: 'Page reading',
    notes: 'Important notes',
  },
  total: {
    title: 'Estimated payment total',
    price: 'Instant buy',
    fee: 'Service fee',
    domestic: 'Domestic shipping',
    international: 'International shipping',
    total: 'Total payment',
    free: 'Free',
  },
  assurance: {
    title: 'Assurance and inspection',
    notesTitle: 'Before purchase',
  },
  flow: {
    title: 'Execution flow',
  },
}

function formatCompactCount(localeCode: string, value: number) {
  return new Intl.NumberFormat(localeCode, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatMarketPrice(amount: number, localeCode: string, withUnit = true) {
  const value = new Intl.NumberFormat(localeCode, {
    maximumFractionDigits: 0,
  }).format(Math.max(Math.round(amount), 0))

  if (!withUnit) {
    return value
  }

  return localeCode === 'ko-KR' ? `${value}원` : `KRW ${value}`
}

function formatSignedMarketPrice(amount: number, localeCode: string) {
  return `${amount >= 0 ? '+' : '-'}${formatMarketPrice(Math.abs(amount), localeCode)}`
}

function toPercent(value: number, min: number, max: number) {
  const range = Math.max(max - min, 1)
  return ((value - min) / range) * 100
}

function getChartMetricValue(quote: KreamSizeQuote, metric: ChartMetric) {
  return quote[metric]
}

function formatSizeGuideValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

function buildLinePath(points: ChartPlotPoint[]) {
  if (points.length === 0) {
    return ''
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

function buildAreaPath(points: ChartPlotPoint[], baseline: number) {
  if (points.length === 0) {
    return ''
  }

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const lineSegments = points.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')

  return `M ${firstPoint.x.toFixed(2)} ${baseline.toFixed(2)} ${lineSegments} L ${lastPoint.x.toFixed(2)} ${baseline.toFixed(2)} Z`
}

export function ProductDetailPage({ productId, authSession, onGoHome, onGoToLogin, onOpenProduct, onSubmitPurchaseRequest }: ProductDetailPageProps) {
  const { locale } = useI18n()
  const copy = locale === 'ko' ? koCopy : enCopy
  const localeCode = locale === 'ko' ? 'ko-KR' : 'en-US'
  const baseProduct = useMemo(() => findCatalogProduct(productId), [productId])
  const activeProduct = useMemo(() => (baseProduct ? getLocalizedProduct(baseProduct, locale) : null), [baseProduct, locale])
  const market = useMemo(() => (activeProduct ? getKreamExperience(activeProduct, locale) : null), [activeProduct, locale])
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedOption, setSelectedOption] = useState('')
  const [boardTab, setBoardTab] = useState<BoardTab>('trades')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('instantBuy')
  const [requestNote, setRequestNote] = useState('')
  const [selectedImage, setSelectedImage] = useState(0)
  const [copied, setCopied] = useState(false)
  const [purchaseRequestPending, setPurchaseRequestPending] = useState(false)
  const [purchaseRequestComplete, setPurchaseRequestComplete] = useState(false)
  const [purchaseRequestError, setPurchaseRequestError] = useState('')

  useEffect(() => {
    if (!activeProduct || !market) {
      return
    }

    const activeSource = `${activeProduct.marketplace} ${activeProduct.originShop} ${activeProduct.originalUrl}`
    const nextRequestNote = /olive\s*young|올리브영/i.test(activeSource)
      ? locale === 'ko'
        ? `"${activeProduct.name}" 주문 시 사용기한, 구성 수량, 포장 상태를 우선 확인해 주세요.`
        : `For "${activeProduct.name}", please confirm shelf life, bundle quantity, and packaging condition first.`
      : /yes24|예스24|aladin|알라딘/i.test(activeSource)
        ? locale === 'ko'
          ? `"${activeProduct.name}" 주문 시 재고 상태, 포장 상태, 선물 여부를 먼저 확인해 주세요.`
          : `For "${activeProduct.name}", please check stock status, packaging condition, and gift-wrap needs first.`
        : /bunjang|번개장터|joongna|중고나라|fleamarket|플리마켓|secondhand|used/i.test(activeSource)
          ? locale === 'ko'
            ? `"${activeProduct.name}" 구매 전 사진 속 하자, 구성품 누락, 정품 여부, 안전결제 가능 여부를 확인해 주세요.`
            : `For "${activeProduct.name}", please check visible flaws, missing items, authenticity, and protected payment first.`
        : copy.hero.requestDefault(activeProduct.name)

    setSelectedSize(market.focusSize)
    setSelectedOption(activeProduct.options[0] ?? '')
    setBoardTab('trades')
    setChartMetric('instantBuy')
    setSelectedImage(0)
    setRequestNote(nextRequestNote)
  }, [activeProduct, market, copy.hero])

  useEffect(() => {
    if (!copied) {
      return
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [copied])

  if (!activeProduct || !market) {
    return (
      <div className="section">
        <div className="container empty-state">
          <h1>{copy.missing.title}</h1>
          <p>{copy.missing.description}</p>
          <button type="button" className="button button--primary" onClick={onGoHome}>
            {copy.missing.action}
          </button>
        </div>
      </div>
    )
  }

  const galleryImages = activeProduct.imageUrls?.length
    ? activeProduct.imageUrls
    : activeProduct.imageUrl
      ? [activeProduct.imageUrl]
      : []
  const currentImage = galleryImages[selectedImage] ?? activeProduct.imageUrl
  const selectedQuote = market.sizeQuotes.find((quote) => quote.size === selectedSize) ?? market.sizeQuotes[0]
  const serviceFee = Math.round(selectedQuote.instantBuy * 0.042)
  const domesticShipping = selectedQuote.instantBuy >= 300000 ? 0 : 3000
  const total = selectedQuote.instantBuy + serviceFee + domesticShipping + market.shippingFee
  const boardRows = boardTab === 'trades' ? market.trades : boardTab === 'asks' ? market.asks : market.bids
  const boardMetaLabel = boardTab === 'trades' ? copy.board.columns.date : copy.board.columns.quantity
  const chartMetricValues = market.sizeQuotes.map((quote) => getChartMetricValue(quote, chartMetric))
  const chartMetricMin = Math.min(...chartMetricValues)
  const chartMetricMax = Math.max(...chartMetricValues)
  const chartMetricRange = Math.max(chartMetricMax - chartMetricMin, 1)
  const boardPriceMin = Math.min(...boardRows.map((row) => row.price))
  const boardPriceMax = Math.max(...boardRows.map((row) => row.price))
  const productSourceText = `${activeProduct.marketplace} ${activeProduct.originShop} ${activeProduct.originalUrl}`
  const isKreamProduct = /kream/i.test(productSourceText)
  const isOliveYoungProduct = /olive\s*young|올리브영/i.test(productSourceText)
  const isYes24Product = /yes24|예스24/i.test(productSourceText)
  const isAladinProduct = /aladin|알라딘/i.test(productSourceText)
  const isBookStoreProduct = isYes24Product || isAladinProduct
  const isUsedMarketplaceProduct = /bunjang|번개장터|joongna|중고나라|fleamarket|플리마켓|secondhand|used/i.test(productSourceText)
  const bookStoreLabel = isAladinProduct ? 'ALADIN' : 'YES24'
  const marketplaceLabel = isOliveYoungProduct
    ? 'OLIVE YOUNG'
    : isKreamProduct
      ? 'KREAM'
      : isBookStoreProduct
        ? bookStoreLabel
        : isUsedMarketplaceProduct
          ? activeProduct.marketplace || activeProduct.originShop
          : activeProduct.marketplace
  const isGenericImportedProduct =
    activeProduct.id.startsWith('imported-') &&
    !isKreamProduct &&
    !isOliveYoungProduct &&
    !isBookStoreProduct &&
    !isUsedMarketplaceProduct
  const genericImportedOption = selectedOption || activeProduct.options[0] || (locale === 'ko' ? '기본 옵션' : 'Default option')
  const genericImportedTags = (activeProduct.tags.length > 0 ? activeProduct.tags : [marketplaceLabel, activeProduct.originShop])
    .filter(Boolean)
    .slice(0, 4)
  const genericImportedSpecs =
    activeProduct.specs.length > 0
      ? activeProduct.specs.slice(0, 6)
      : [
          { label: locale === 'ko' ? '원본 판매처' : 'Source', value: activeProduct.originShop },
          { label: locale === 'ko' ? '마켓' : 'Marketplace', value: marketplaceLabel },
          { label: locale === 'ko' ? '옵션' : 'Option', value: genericImportedOption },
        ]
  const genericImportedEditorial = [
    {
      title: locale === 'ko' ? '원본 링크 기준' : 'Based on the source link',
      body:
        locale === 'ko'
          ? '상품명, 대표 이미지, 가격, 옵션 정보를 원본 쇼핑몰 링크에서 가져온 기준으로 정리했습니다.'
          : 'The title, lead image, price, and options are organized from the original shop link.',
    },
    {
      title: locale === 'ko' ? '우리 사이트에 맞춘 확장' : 'Matched to this storefront',
      body:
        locale === 'ko'
          ? '홈 화면과 같은 리셀 세븐 톤으로 보이도록 상세 카드, 이미지 영역, 요청 메모를 한 화면에 맞췄습니다.'
          : 'The detail cards, image area, and request note now follow the same storefront tone as the home page.',
    },
  ]
  const genericImportedAssurance = [
    {
      title: locale === 'ko' ? '원본 페이지 확인' : 'Source page check',
      body:
        locale === 'ko'
          ? '주문 전 옵션, 재고, 배송 제한 여부는 원본 상품 페이지에서 한 번 더 확인해 주세요.'
          : 'Before ordering, recheck options, stock, and shipping limits on the source page.',
    },
    {
      title: locale === 'ko' ? '이미지 폴백' : 'Image fallback',
      body:
        locale === 'ko'
          ? '이미지는 서버 프록시로 먼저 불러오고, 실패하면 원본 이미지와 텍스트 폴백으로 이어집니다.'
          : 'Images load through the server proxy first, then fall back to the original image or a text placeholder.',
    },
    {
      title: locale === 'ko' ? '요청 메모' : 'Request note',
      body:
        locale === 'ko'
          ? '구매 전 확인할 색상, 사이즈, 구성품, 포장 요청을 메모로 남길 수 있습니다.'
          : 'Leave color, size, included item, and packaging checks in the request note.',
    },
  ]
  const genericImportedFlow =
    locale === 'ko'
      ? [
          { step: '01', title: '링크 분석', body: '원본 링크에서 상품명, 가격, 대표 이미지를 정리합니다.' },
          { step: '02', title: '옵션 확인', body: '가져온 옵션과 상세 정보를 주문 전 다시 확인합니다.' },
          { step: '03', title: '요청 메모', body: '색상, 사이즈, 포장, 검수 포인트를 남깁니다.' },
          { step: '04', title: '구매 연결', body: '원본 페이지와 우리 구매 요청 흐름을 함께 사용합니다.' },
        ]
      : [
          { step: '01', title: 'Read link', body: 'Collect title, price, and the lead image from the source link.' },
          { step: '02', title: 'Check options', body: 'Review imported options and details before ordering.' },
          { step: '03', title: 'Add note', body: 'Leave color, size, package, and inspection checkpoints.' },
          { step: '04', title: 'Connect purchase', body: 'Use the source page together with this purchase request flow.' },
        ]
  const usedTradeOption = selectedOption || activeProduct.options[0] || (locale === 'ko' ? '판매글 기준' : 'Listing default')
  const usedServiceFee = Math.max(Math.round(activeProduct.price * 0.035), 3000)
  const usedProtectedTotal = activeProduct.price + usedServiceFee
  const usedTags = (activeProduct.tags.length > 0 ? activeProduct.tags : [marketplaceLabel, locale === 'ko' ? '중고' : 'Used'])
    .filter(Boolean)
    .slice(0, 4)
  const usedSpecs =
    activeProduct.specs.length > 0
      ? activeProduct.specs.slice(0, 6)
      : [
          { label: locale === 'ko' ? '판매 플랫폼' : 'Platform', value: marketplaceLabel },
          { label: locale === 'ko' ? '원본 판매자' : 'Source seller', value: activeProduct.originShop },
          { label: locale === 'ko' ? '거래 조건' : 'Trade option', value: usedTradeOption },
          { label: locale === 'ko' ? '상태 확인' : 'Condition check', value: locale === 'ko' ? '사진과 설명 기준 재확인' : 'Recheck photos and description' },
        ]
  const usedPriceComparisonRows = [
    {
      label: locale === 'ko' ? `${marketplaceLabel} 현재 매물` : `${marketplaceLabel} listing`,
      price: activeProduct.price,
      note: locale === 'ko' ? '가져온 원본 판매글 기준' : 'Based on the imported source listing',
    },
    {
      label: locale === 'ko' ? '유사 매물 참고가' : 'Comparable used price',
      price: Math.max(Math.round((activeProduct.price * 0.92) / 1000) * 1000, 1000),
      note: locale === 'ko' ? '상태/구성품 차이를 보고 비교' : 'Compare condition and included items',
    },
    {
      label: locale === 'ko' ? '안전거래 포함 예상' : 'Protected purchase estimate',
      price: usedProtectedTotal,
      note: locale === 'ko' ? '보증/검수 요청 비용 포함 기준' : 'Includes protection and check request',
    },
  ]
  const usedEditorial = [
    {
      title: locale === 'ko' ? '중고 상태 우선 확인' : 'Condition-first review',
      body:
        locale === 'ko'
          ? '새 상품 상세보다 사진 속 사용감, 구성품 누락, 판매자 설명의 하자 표기가 먼저 보이도록 정리했습니다.'
          : 'The page prioritizes visible wear, missing accessories, and seller-described flaws over retail-style copy.',
    },
    {
      title: locale === 'ko' ? '가격 비교 기준' : 'Comparison baseline',
      body:
        locale === 'ko'
          ? '현재 매물가, 유사 매물 참고가, 안전거래 포함 예상가를 나란히 두고 구매 판단을 할 수 있게 했습니다.'
          : 'The listing price, comparable used price, and protected purchase estimate sit side by side for faster decisions.',
    },
  ]
  const usedAssurance = [
    {
      title: locale === 'ko' ? '사진/설명 대조' : 'Photo and description check',
      body:
        locale === 'ko'
          ? '원본 매물 사진과 설명을 기준으로 하자, 오염, 구성품 누락 여부를 주문 전 다시 확인합니다.'
          : 'Check flaws, stains, and missing items against the original listing photos and description before purchase.',
    },
    {
      title: locale === 'ko' ? '가격 리스크 표시' : 'Price risk marker',
      body:
        locale === 'ko'
          ? '유사 매물 참고가와 안전거래 포함 예상가를 함께 보여 과도한 프리미엄을 발견하기 쉽게 했습니다.'
          : 'Comparable and protected prices make it easier to spot an unusually high premium.',
    },
    {
      title: locale === 'ko' ? '안전거래 메모' : 'Protection note',
      body:
        locale === 'ko'
          ? '직거래, 택배거래, 안전결제 여부와 추가 검수 요청을 메모로 남겨 분쟁 가능성을 줄입니다.'
          : 'Record in-person, parcel, protected payment, and inspection requests to reduce dispute risk.',
    },
  ]
  const usedFlow =
    locale === 'ko'
      ? [
          { step: '01', title: '매물 확인', body: '원본 중고 판매글의 사진, 설명, 가격을 먼저 확인합니다.' },
          { step: '02', title: '가격 비교', body: '비슷한 매물 기준가와 안전거래 포함 예상가를 비교합니다.' },
          { step: '03', title: '상태 체크', body: '하자, 오염, 구성품, 정품 여부를 요청 메모로 남깁니다.' },
          { step: '04', title: '안전 구매', body: '원본 판매글과 보증 메모를 묶어 구매 요청을 진행합니다.' },
        ]
      : [
          { step: '01', title: 'Read listing', body: 'Review the original used listing photos, notes, and price.' },
          { step: '02', title: 'Compare price', body: 'Compare against a used benchmark and a protected estimate.' },
          { step: '03', title: 'Check condition', body: 'Leave flaw, stain, accessory, and authenticity checkpoints.' },
          { step: '04', title: 'Protected request', body: 'Use the source listing together with the protection note.' },
        ]
  const chartTitle = locale === 'ko' ? '사이즈별 시세 선 그래프' : 'Size market line chart'
  const chartDescription =
    locale === 'ko'
      ? '필터를 바꿔가며 사이즈별 즉시 구매가, 판매 입찰, 구매 입찰 흐름을 선 그래프로 확인합니다.'
      : 'Switch filters to trace instant buy, asks, and bids across sizes as a line graph.'
  const requestSupportCopy =
    locale === 'ko'
      ? '박스 상태, 택, 구성품, 하자 여부처럼 꼭 확인할 포인트를 남겨두세요.'
      : 'Leave the box condition, tags, accessories, and visible flaws as priority checkpoints.'
  const requestNoteCount = requestNote.length
  const selectedChartValue = getChartMetricValue(selectedQuote, chartMetric)
  const chartMetricLabel = copy.board.chartFilters[chartMetric]
  const chartLeftPadding = 10
  const chartRightPadding = 10
  const chartBaseline = 84
  const chartTopPadding = 16
  const chartHeight = chartBaseline - chartTopPadding
  const chartPlotWidth = 100 - chartLeftPadding - chartRightPadding
  const chartGuidePositions = [0, 1, 2, 3].map((index) => chartTopPadding + ((chartBaseline - chartTopPadding) / 3) * index)
  const chartPointData = market.sizeQuotes.map((quote, index) => {
    const value = getChartMetricValue(quote, chartMetric)
    const x =
      market.sizeQuotes.length === 1
        ? 50
        : chartLeftPadding + (index / (market.sizeQuotes.length - 1)) * chartPlotWidth
    const y =
      chartMetricMax === chartMetricMin
        ? chartTopPadding + chartHeight / 2
        : chartBaseline - ((value - chartMetricMin) / chartMetricRange) * chartHeight

    return {
      quote,
      value,
      x,
      y,
    }
  })
  const chartLinePath = buildLinePath(chartPointData)
  const chartAreaPath = buildAreaPath(chartPointData, chartBaseline)
  const catalogProducts = getCatalogProducts()
  const relatedProducts = getRelatedCatalogProducts(activeProduct.id).map((product) => getLocalizedProduct(product, locale)).slice(0, 6)
  const sameModelQuotes = market.sizeQuotes.slice(0, 5)
  const brandProductPool = catalogProducts
    .filter((product) => product.id !== activeProduct.id)
    .filter((product) => `${product.name} ${product.marketplace} ${product.originShop}`.toLowerCase().includes(market.brand.toLowerCase()))
  const fallbackBrandProducts = getRelatedCatalogProducts(activeProduct.id)
  const brandProducts = (brandProductPool.length > 0 ? brandProductPool : fallbackBrandProducts.length > 0 ? fallbackBrandProducts : catalogProducts)
    .filter((product) => product.id !== activeProduct.id)
    .slice(0, 5)
    .map((product) => getLocalizedProduct(product, locale))
  const numericSizes = market.sizeQuotes
    .map((quote) => Number.parseFloat(quote.size))
    .filter((value) => Number.isFinite(value))
  const sizeGuideRows =
    numericSizes.length === market.sizeQuotes.length
      ? [
          { label: 'KR', values: numericSizes.map((value) => formatSizeGuideValue(value)) },
          { label: 'US (M)', values: numericSizes.map((value) => formatSizeGuideValue(value / 10 - 18.5)) },
          { label: 'UK', values: numericSizes.map((value) => formatSizeGuideValue(value / 10 - 19.5)) },
          { label: 'EU', values: numericSizes.map((value) => formatSizeGuideValue(value / 10 + 14)) },
          { label: 'JP', values: numericSizes.map((value) => formatSizeGuideValue(value / 10)) },
        ]
      : []
  const reviewTraits =
    locale === 'ko'
      ? [
          { label: '정사이즈로 나왔어요', value: '100%' },
          { label: '반 사이즈 크게 구매했어요', value: '100%' },
          { label: '착화감이 편안해요', value: '100%' },
          { label: '발볼이 보통이에요', value: '100%' },
        ]
      : [
          { label: 'Fits true to size', value: '100%' },
          { label: 'Buy half size up', value: '100%' },
          { label: 'Comfort feels balanced', value: '100%' },
          { label: 'Width feels regular', value: '100%' },
        ]
  const sellerNotice = locale === 'ko' ? '판매 거래 주의사항 반드시 보유한 상품만 판매하세요.' : 'Seller notice: list only items you actually have on hand.'
  const sameModelTitle = locale === 'ko' ? '같은 모델 다른 시세' : 'More prices for this model'
  const sameModelAction = locale === 'ko' ? '동일 상품 더보기' : 'View more listings'
  const brandTitle = locale === 'ko' ? '이 브랜드의 다른 상품' : 'More from this brand'
  const sizeGuideTitle = locale === 'ko' ? '사이즈' : 'Size guide'
  const sizeGuideNote =
    locale === 'ko'
      ? '해당 사이즈 정보는 참고용입니다. 브랜드와 상품 카테고리에 따라 차이가 있을 수 있으니 실제 상품 기준으로 다시 확인해 주세요.'
      : 'These size conversions are a guide. Confirm the final fit against the original listing and brand standard before purchase.'
  const detailGalleryTitle = locale === 'ko' ? '상세 정보' : 'Detail images'
  const trustBannerText = locale === 'ko' ? 'KREAM에서는 100% 정품만 거래합니다.' : 'KREAM only trades verified authentic items.'
  const supportTitle = locale === 'ko' ? '고객센터 1588-7813' : 'Customer support 1588-7813'
  const supportHours =
    locale === 'ko'
      ? ['운영시간 평일 10:00 - 18:00 (토, 일, 공휴일 휴무)', '점심시간 평일 13:00 - 14:00', '1:1 문의하기와 채팅상담은 앱에서만 가능합니다.']
      : ['Weekdays 10:00 - 18:00 KST (closed weekends and holidays)', 'Lunch break 13:00 - 14:00 KST', '1:1 inquiries and live chat are available in the app only.']
  const hasPairOffer = /1\s*\+\s*1/i.test(`${activeProduct.name} ${activeProduct.caption}`)
  const oliveShippingFee = activeProduct.price >= 40000 ? 0 : 2500
  const oliveTotal = activeProduct.price + oliveShippingFee
  const olivePromoBadge = locale === 'ko' ? '올영 PICK' : 'Olive Pick'
  const olivePromoHeadline = hasPairOffer ? (locale === 'ko' ? '1+1 기획' : '1+1 set') : olivePromoBadge
  const oliveOptionLabel = locale === 'ko' ? '구성 선택' : 'Select option'
  const oliveRequestTitle = locale === 'ko' ? '배송 메모' : 'Delivery note'
  const oliveRequestSupport =
    locale === 'ko'
      ? '선물 포장, 수령 방식, 사용기한처럼 주문 전에 전달할 메모를 남겨두세요.'
      : 'Leave notes for gift wrap, delivery handling, or shelf-life checks before checkout.'
  const oliveRequestPlaceholder =
    locale === 'ko'
      ? '사용기한, 증정 구성, 포장 상태, 빠른배송 요청처럼 체크할 내용을 적어두세요.'
      : 'Add notes for shelf life, bundle contents, packaging, or fast-delivery requests.'
  const oliveTodayText =
    locale === 'ko'
      ? `오늘드림 ${formatMarketPrice(oliveShippingFee, localeCode)} 또는 무료`
      : `Today delivery ${formatMarketPrice(oliveShippingFee, localeCode)} or free`
  const olivePickupText = locale === 'ko' ? '픽업 매장수령 가능' : 'Store pickup available'
  const olivePriceCaption = locale === 'ko' ? `(${selectedOption || activeProduct.options[0] || '기본 구성'})` : `(${selectedOption || activeProduct.options[0] || 'Default option'})`
  const oliveCouponLabel = locale === 'ko' ? '쿠폰 적용가' : 'Coupon price'
  const olivePrimaryAction = locale === 'ko' ? '장바구니' : 'Add to bag'
  const oliveSecondaryAction = locale === 'ko' ? '바로구매' : 'Buy now'
  const oliveStoryTitle = locale === 'ko' ? '올리브영 무드 상세' : 'Olive Young style highlights'
  const oliveRelatedTitle = locale === 'ko' ? '이런 에센스/세럼/앰플 상품은 어때요?' : 'More serum and ampoule picks'
  const oliveStoryCards = [
    {
      tone: 'lime',
      eyebrow: olivePromoBadge,
      title: hasPairOffer ? olivePromoHeadline : activeProduct.tags[0] ?? olivePromoBadge,
      body: activeProduct.caption,
    },
    {
      tone: 'white',
      eyebrow: locale === 'ko' ? '핵심 포인트' : 'Key point',
      title: activeProduct.detailPoints[0] ?? activeProduct.overview,
      body: activeProduct.detailPoints[1] ?? activeProduct.overview,
    },
    {
      tone: 'deep',
      eyebrow: locale === 'ko' ? '리뷰 & 만족도' : 'Reviews & rating',
      title: `${formatCompactCount(localeCode, market.reviewCount)} ${locale === 'ko' ? '리뷰' : 'reviews'}`,
      body: locale === 'ko' ? `${market.rank}위 상승 / 할인 ${activeProduct.discount}%` : `Rising #${market.rank} / ${activeProduct.discount}% off`,
    },
  ]
  const yes24CategoryLabel = locale === 'ko' ? '국내도서' : 'Books'
  const yes24Tabs = locale === 'ko' ? ['도서정보', '리뷰/한줄평', '배송/반품/교환'] : ['Book info', 'Reviews', 'Shipping & returns']
  const yes24ReviewScore = Number((8 + (((market.reviewCount % 5) + 1) * 0.1)).toFixed(1))
  const yes24MemberPrice = Math.max(activeProduct.price - 1500, 0)
  const yes24PointAmount = Math.max(Math.round((activeProduct.price * 0.055) / 50) * 50, 50)
  const yes24ShippingFee = 0
  const yes24Total = activeProduct.price + yes24ShippingFee
  const yes24PromoBadge = isAladinProduct ? (locale === 'ko' ? '도서 전문몰' : 'Book marketplace') : locale === 'ko' ? '도서정가제' : 'Book pricing'
  const yes24ReviewText = locale === 'ko' ? `회원리뷰(${market.reviewCount}건)` : `Member reviews (${market.reviewCount})`
  const yes24SalesText = locale === 'ko' ? `판매지수 ${formatCompactCount(localeCode, market.wishCount)}` : `Sales index ${formatCompactCount(localeCode, market.wishCount)}`
  const yes24ShippingText = locale === 'ko' ? '무료배송 · 하루배송 가능 지역 기준' : 'Free shipping · next-day delivery where available'
  const yes24OptionLabel = locale === 'ko' ? '구매 형태' : 'Purchase format'
  const yes24SpecTitle = locale === 'ko' ? '도서 기본 정보' : 'Book basics'
  const yes24RequestTitle = locale === 'ko' ? '구매 메모' : 'Purchase note'
  const yes24RequestSupport =
    locale === 'ko'
      ? '포장 상태, 선물 여부, 배송 요청처럼 주문 전에 전달할 메모를 정리하세요.'
      : 'Leave purchase notes for gift wrap, packaging condition, or delivery handling.'
  const yes24RequestPlaceholder =
    locale === 'ko'
      ? '재고 상태, 래핑 여부, 배송 메모, 책 상태 확인처럼 주문 전에 확인할 내용을 적어두세요.'
      : 'Add notes for stock check, wrapping, delivery instructions, or book condition.'
  const yes24PrimaryAction = locale === 'ko' ? '카트에 담기' : 'Add to cart'
  const yes24SecondaryAction = locale === 'ko' ? '바로 구매하기' : 'Buy now'
  const yes24BundleTitle = locale === 'ko' ? '이 책을 구입하신 분들이 함께 산 책' : 'Readers also bought'
  const yes24InfoTitle = locale === 'ko' ? '품목정보' : 'Book details'
  const yes24TagTitle = locale === 'ko' ? '이 상품의 태그' : 'Tags'
  const yes24IntroTitle = locale === 'ko' ? '책소개' : 'About the book'
  const yes24MdPickTitle = locale === 'ko' ? 'MD 한마디' : 'Staff note'
  const yes24TocTitle = locale === 'ko' ? '목차' : 'Contents'
  const yes24NoticesTitle = locale === 'ko' ? '배송/교환 안내' : 'Shipping & return notes'
  const yes24Tags = activeProduct.tags.slice(0, 6)
  const yes24TocItems = activeProduct.detailPoints.length > 0 ? activeProduct.detailPoints : market.editorial.map((item) => item.title)
  const bookEditorial = [
    {
      title: locale === 'ko' ? '책 선택 포인트' : 'Book selection point',
      body:
        locale === 'ko'
          ? '저자, 출판사, 목차, 책소개를 먼저 볼 수 있도록 도서 구매 흐름에 맞춰 정리했습니다.'
          : 'Author, publisher, contents, and the book overview are grouped around a book-first purchase flow.',
    },
    {
      title: locale === 'ko' ? '구매 전 확인' : 'Before purchase',
      body:
        locale === 'ko'
          ? '재고, 포장, 선물 여부, 배송/교환 안내처럼 책 주문 전에 필요한 확인 항목을 함께 표시합니다.'
          : 'Stock, wrapping, gift needs, and shipping or return notes stay visible before checkout.',
    },
  ]
  const productInfoItems = [
    { label: copy.specs.model, value: market.modelNumber },
    { label: copy.specs.releaseDate, value: market.releaseDate },
    { label: copy.specs.releasePrice, value: formatMarketPrice(market.releasePrice, localeCode) },
    { label: copy.specs.color, value: market.colorway },
    { label: copy.specs.shipping, value: market.shippingNote },
    { label: copy.specs.benefit, value: market.benefitNote },
  ]
  const yes24BookInfoItems = activeProduct.specs.length > 0 ? activeProduct.specs.slice(0, 6) : productInfoItems
  const displayInfoItems = isBookStoreProduct
    ? yes24BookInfoItems.map((item) => ({ label: item.label, value: item.value }))
    : isUsedMarketplaceProduct
      ? usedSpecs
    : isGenericImportedProduct
      ? genericImportedSpecs
      : productInfoItems
  const detailRequestTitle = isOliveYoungProduct
    ? oliveRequestTitle
    : isBookStoreProduct
      ? yes24RequestTitle
      : isUsedMarketplaceProduct
        ? locale === 'ko'
          ? '중고 상태 확인 메모'
          : 'Used condition note'
      : isGenericImportedProduct
        ? locale === 'ko'
          ? '구매 요청 메모'
          : 'Purchase request note'
        : copy.hero.request
  const detailRequestSupport = isOliveYoungProduct
    ? oliveRequestSupport
    : isBookStoreProduct
      ? yes24RequestSupport
      : isUsedMarketplaceProduct
        ? locale === 'ko'
          ? '하자, 오염, 구성품, 직거래/택배거래 여부처럼 중고 거래 전에 확인할 내용을 남겨 주세요.'
          : 'Leave flaws, stains, included items, and in-person or parcel trade checks before purchase.'
      : isGenericImportedProduct
        ? locale === 'ko'
          ? '색상, 옵션, 구성품, 배송 요청처럼 구매 전에 확인할 내용을 남겨 주세요.'
          : 'Leave color, option, included item, and shipping checks before ordering.'
        : requestSupportCopy
  const detailRequestPlaceholder = isOliveYoungProduct
    ? oliveRequestPlaceholder
    : isBookStoreProduct
      ? yes24RequestPlaceholder
      : isUsedMarketplaceProduct
        ? locale === 'ko'
          ? '사진 속 하자, 구성품 누락, 정품 여부, 안전결제 요청처럼 확인할 내용을 적어주세요.'
          : 'Add notes for visible flaws, missing items, authenticity, or protected payment.'
      : isGenericImportedProduct
        ? locale === 'ko'
          ? '옵션, 재고, 포장, 배송 메모처럼 확인할 내용을 적어주세요.'
          : 'Add notes for options, stock, packaging, or shipping.'
        : copy.hero.requestPlaceholder

  const purchaseRequestTotal = isOliveYoungProduct
    ? oliveTotal
    : isBookStoreProduct
      ? yes24Total
      : isUsedMarketplaceProduct
        ? usedProtectedTotal
        : isGenericImportedProduct
          ? activeProduct.price
          : total
  const purchaseRequestOption = isGenericImportedProduct
    ? genericImportedOption
    : selectedOption || selectedSize || activeProduct.options[0] || ''

  async function submitPurchaseRequest() {
    if (!authSession) {
      onGoToLogin()
      return
    }

    setPurchaseRequestPending(true)
    setPurchaseRequestError('')
    try {
      await onSubmitPurchaseRequest({
        productId,
        option: purchaseRequestOption,
        note: requestNote,
        estimatedTotal: purchaseRequestTotal,
      })
      setPurchaseRequestComplete(true)
    } catch (error) {
      setPurchaseRequestError(error instanceof Error ? error.message : '구매 요청을 접수하지 못했습니다.')
    } finally {
      setPurchaseRequestPending(false)
    }
  }

  return (
    <>
      <EditorialHeader
        className="editorial-header--detail"
        onGoHome={onGoHome}
        navLabel={locale === 'ko' ? '상품 상세 메뉴' : 'Product detail navigation'}
        navItems={[
          { href: '#product', label: copy.nav.product },
          ...(isKreamProduct ? [{ href: '#market', label: copy.nav.market }] : []),
          ...(isUsedMarketplaceProduct
            ? [{ href: '#used-market', label: locale === 'ko' ? '가격비교' : 'Price check' }]
            : []),
          ...(isBookStoreProduct
            ? [
                { href: '#book-info', label: locale === 'ko' ? '도서정보' : 'Book info' },
                { href: '#details', label: locale === 'ko' ? '상세' : 'Details' },
              ]
            : [{ href: '#assurance', label: copy.nav.assurance }]),
        ]}
        actions={
          <>
            <button type="button" className="button button--ghost" onClick={onGoHome}>
              {copy.headerHome}
            </button>
          </>
        }
      />

      <main
        className={`section section--detail kream-detail-page detail-page--home-style${isKreamProduct ? ' kream-detail-page--cream' : ''}${isOliveYoungProduct ? ' olive-detail-page' : ''}${isBookStoreProduct ? ' yes24-detail-page' : ''}${isUsedMarketplaceProduct ? ' used-detail-page' : ''}`}
      >
        <div className="container">
          {isKreamProduct ? (
            <div className="kream-seller-notice">
              <span>{sellerNotice}</span>
              <ChevronRight size={18} />
            </div>
          ) : null}

          {isOliveYoungProduct ? (
            <section className="olive-hero-banner">
              <div className="olive-hero-banner__copy">
                <span>{olivePromoBadge}</span>
                <strong>{olivePromoHeadline}</strong>
                <p>{activeProduct.caption}</p>
              </div>
              <div className="olive-hero-banner__bubble">{hasPairOffer ? '1+1' : `${activeProduct.discount}%`}</div>
            </section>
          ) : null}

          {isBookStoreProduct ? (
            <section className="yes24-header-strip">
              <strong>{bookStoreLabel}</strong>
              <div className="yes24-header-strip__tabs">
                {yes24Tabs.map((tab) => (
                  <span key={tab}>{tab}</span>
                ))}
              </div>
              <div className="yes24-header-strip__price">
                <span>{yes24PromoBadge}</span>
                <strong className="kream-money">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
              </div>
            </section>
          ) : null}

          <section id="product" className={`kream-detail-top${isBookStoreProduct ? ' yes24-detail-top' : ''}`}>
            <div className={`kream-gallery-shell${isBookStoreProduct ? ' yes24-gallery-shell' : ''}`}>
              <div className="kream-gallery-stage">
                <ProductArtwork
                  art={activeProduct.art}
                  palette={activeProduct.palette}
                  accent={activeProduct.accent}
                  imageUrl={currentImage}
                  name={activeProduct.name}
                  imageLoading="eager"
                  style={{ width: '100%', minHeight: 'min(72vw, 720px)' }}
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="kream-gallery-strip">
                  {galleryImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      className={`kream-thumb${selectedImage === index ? ' is-active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <ProductImage
                        imageUrl={imageUrl}
                        alt={`${activeProduct.name} thumbnail ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        fallbackLabel={`${index + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside className={`kream-market-card${isBookStoreProduct ? ' yes24-market-card' : ''}`}>
              <div className="kream-market-card__top">
                <div>
                  <div className="breadcrumb">
                    {marketplaceLabel} / {isGenericImportedProduct || isUsedMarketplaceProduct ? activeProduct.category : isBookStoreProduct ? yes24CategoryLabel : market.categoryLabel}
                  </div>
                  <h1>{isGenericImportedProduct || isUsedMarketplaceProduct ? activeProduct.name : market.line}</h1>
                  <p>{activeProduct.caption}</p>
                </div>

                <div className="kream-market-card__actions">
                  <button
                    type="button"
                    className="source-link"
                    onClick={() => {
                      void navigator.clipboard.writeText(activeProduct.originalUrl)
                      setCopied(true)
                    }}
                  >
                    <Copy size={16} />
                    {copied ? copy.hero.copied : copy.hero.copy}
                  </button>

                  <a className="source-link source-link--anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                    <ArrowUpRight size={16} />
                    {copy.hero.open}
                  </a>
                </div>
              </div>

              <div className="kream-meta-row">
                {isOliveYoungProduct ? (
                  <>
                    <span className="chip chip--soft">{olivePromoBadge}</span>
                    <span className="chip chip--soft">{copy.hero.review(market.reviewCount)}</span>
                    <span className="chip chip--soft">{activeProduct.discount}% OFF</span>
                  </>
                ) : isBookStoreProduct ? (
                  <>
                    <span className="chip">{yes24ReviewScore}</span>
                    <span className="chip chip--soft">{yes24ReviewText}</span>
                    <span className="chip chip--soft">{yes24SalesText}</span>
                  </>
                ) : isUsedMarketplaceProduct ? (
                  <>
                    {usedTags.map((tag, index) => (
                      <span key={tag} className={index === 0 ? 'chip' : 'chip chip--soft'}>
                        {tag}
                      </span>
                    ))}
                    <span className="chip chip--soft">{locale === 'ko' ? '가격 비교' : 'Price check'}</span>
                  </>
                ) : isGenericImportedProduct ? (
                  <>
                    {genericImportedTags.map((tag, index) => (
                      <span key={tag} className={index === 0 ? 'chip' : 'chip chip--soft'}>
                        {tag}
                      </span>
                    ))}
                    {activeProduct.discount > 0 ? <span className="chip chip--soft">{activeProduct.discount}% OFF</span> : null}
                  </>
                ) : (
                  <>
                    <span className="chip">{copy.hero.rank(market.rank)}</span>
                    <span className="chip chip--soft">{copy.hero.review(market.reviewCount)}</span>
                    <span className="chip chip--soft">{copy.hero.interest(formatCompactCount(localeCode, market.wishCount))}</span>
                  </>
                )}
              </div>

              {isKreamProduct ? (
                <div className="kream-benefit-strip">
                  <div>
                    <Zap size={16} />
                    <span>{locale === 'ko' ? `빠른배송 ${formatMarketPrice(5000, localeCode)} 내일 도착 예정` : `Express ${formatMarketPrice(5000, localeCode)} arrives tomorrow`}</span>
                  </div>
                  <div>
                    <Truck size={16} />
                    <span>{market.shippingNote}</span>
                  </div>
                  <div>
                    <ShieldCheck size={16} />
                    <span>{locale === 'ko' ? '정품 검수 후 출고' : 'Ships after authentication'}</span>
                  </div>
                </div>
              ) : null}

              {isOliveYoungProduct ? (
                <div className="olive-benefit-strip">
                  <div>
                    <Zap size={16} />
                    <span>{oliveTodayText}</span>
                  </div>
                  <div>
                    <Truck size={16} />
                    <span>{olivePickupText}</span>
                  </div>
                  <div>
                    <ShieldCheck size={16} />
                    <span>{locale === 'ko' ? '공식 페이지 기준 혜택 안내' : 'Benefits matched to the official listing'}</span>
                  </div>
                </div>
              ) : null}

              {isBookStoreProduct ? (
                <div className="yes24-benefit-strip">
                  <div>
                    <Truck size={16} />
                    <span>{yes24ShippingText}</span>
                  </div>
                  <div>
                    <ShieldCheck size={16} />
                    <span>{locale === 'ko' ? `${bookStoreLabel} 적립 예상 ${formatMarketPrice(yes24PointAmount, localeCode, false)}` : `${formatMarketPrice(yes24PointAmount, localeCode)} in points`}</span>
                  </div>
                  <div>
                    <Star size={16} />
                    <span>{locale === 'ko' ? '리뷰/한줄평 기준 추천 도서' : 'Highly rated by readers'}</span>
                  </div>
                </div>
              ) : null}

              {isUsedMarketplaceProduct ? (
                <div className="used-benefit-strip">
                  <div>
                    <Truck size={16} />
                    <span>{locale === 'ko' ? `판매처: ${activeProduct.originShop}` : `Seller source: ${activeProduct.originShop}`}</span>
                  </div>
                  <div>
                    <ShieldCheck size={16} />
                    <span>{locale === 'ko' ? '사진/설명 기준 상태 확인' : 'Condition checked against photos and notes'}</span>
                  </div>
                  <div>
                    <Zap size={16} />
                    <span>{locale === 'ko' ? `거래 조건: ${usedTradeOption}` : `Trade option: ${usedTradeOption}`}</span>
                  </div>
                </div>
              ) : null}

              {isGenericImportedProduct ? (
                <div className="kream-benefit-strip">
                  <div>
                    <Truck size={16} />
                    <span>{locale === 'ko' ? `원본 판매처: ${activeProduct.originShop}` : `Source: ${activeProduct.originShop}`}</span>
                  </div>
                  <div>
                    <ShieldCheck size={16} />
                    <span>{locale === 'ko' ? '가져온 상품 정보 기준으로 구매 요청을 정리합니다.' : 'Purchase notes are based on the imported product data.'}</span>
                  </div>
                  <div>
                    <Zap size={16} />
                    <span>{locale === 'ko' ? `선택 옵션: ${genericImportedOption}` : `Selected option: ${genericImportedOption}`}</span>
                  </div>
                </div>
              ) : null}

              <div className="kream-price-hero">
                {isOliveYoungProduct ? (
                  <>
                    <div>
                      <span>{oliveCouponLabel}</span>
                      <strong className="kream-money kream-money--hero">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                    </div>
                    <p>
                      {formatMarketPrice(activeProduct.originalPrice, localeCode)} 기준 · {activeProduct.discount}% OFF {olivePriceCaption}
                    </p>
                  </>
                ) : isBookStoreProduct ? (
                  <>
                    <div>
                      <span>{locale === 'ko' ? '판매가' : 'Sale price'}</span>
                      <strong className="kream-money kream-money--hero">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                    </div>
                    <p>
                      {formatMarketPrice(activeProduct.originalPrice, localeCode)} · {locale === 'ko' ? `회원가 ${formatMarketPrice(yes24MemberPrice, localeCode)}` : `Member price ${formatMarketPrice(yes24MemberPrice, localeCode)}`}
                    </p>
                  </>
                ) : isUsedMarketplaceProduct ? (
                  <>
                    <div>
                      <span>{locale === 'ko' ? '중고 매물가' : 'Used listing price'}</span>
                      <strong className="kream-money kream-money--hero">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                    </div>
                    <p>
                      {locale === 'ko'
                        ? `안전거래 포함 예상 ${formatMarketPrice(usedProtectedTotal, localeCode)}`
                        : `Protected estimate ${formatMarketPrice(usedProtectedTotal, localeCode)}`}
                    </p>
                  </>
                ) : isGenericImportedProduct ? (
                  <>
                    <div>
                      <span>{locale === 'ko' ? '가져온 판매가' : 'Imported price'}</span>
                      <strong className="kream-money kream-money--hero">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                    </div>
                    <p>
                      {activeProduct.originalPrice > activeProduct.price
                        ? `${formatMarketPrice(activeProduct.originalPrice, localeCode)} · ${activeProduct.discount}% OFF`
                        : `${marketplaceLabel} · ${genericImportedOption}`}
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <span>{locale === 'ko' ? `발매가 ${formatMarketPrice(market.releasePrice, localeCode)}` : `Retail ${formatMarketPrice(market.releasePrice, localeCode)}`}</span>
                      <strong className="kream-money kream-money--hero">{formatMarketPrice(selectedQuote.instantBuy, localeCode)}</strong>
                    </div>
                    <p>
                      {selectedQuote.size} {copy.hero.instantBuy} · {formatSignedMarketPrice(selectedQuote.premium, localeCode)} ({selectedQuote.premiumPercent}%)
                    </p>
                  </>
                )}
              </div>

              {isOliveYoungProduct ? (
                <div className="olive-price-split">
                  <article>
                    <span>{locale === 'ko' ? '할인 전 가격' : 'Before discount'}</span>
                    <strong className="kream-money">{formatMarketPrice(activeProduct.originalPrice, localeCode)}</strong>
                  </article>
                  <article>
                    <span>{locale === 'ko' ? '혜택가' : 'Final price'}</span>
                    <strong className="kream-money">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                  </article>
                </div>
              ) : isBookStoreProduct ? (
                <div className="yes24-price-split">
                  <article>
                    <span>{locale === 'ko' ? '정가' : 'List price'}</span>
                    <strong className="kream-money">{formatMarketPrice(activeProduct.originalPrice, localeCode)}</strong>
                  </article>
                  <article>
                    <span>{locale === 'ko' ? '회원 최저가' : 'Member price'}</span>
                    <strong className="kream-money">{formatMarketPrice(yes24MemberPrice, localeCode)}</strong>
                  </article>
                </div>
              ) : isUsedMarketplaceProduct ? (
                <div className="used-price-split">
                  {usedPriceComparisonRows.slice(1).map((row) => (
                    <article key={row.label}>
                      <span>{row.label}</span>
                      <strong className="kream-money">{formatMarketPrice(row.price, localeCode)}</strong>
                    </article>
                  ))}
                </div>
              ) : isGenericImportedProduct ? (
                <div className="kream-price-split">
                  <article>
                    <span>{locale === 'ko' ? '원가' : 'Original price'}</span>
                    <strong className="kream-money">{formatMarketPrice(activeProduct.originalPrice, localeCode)}</strong>
                  </article>
                  <article>
                    <span>{locale === 'ko' ? '선택 옵션' : 'Selected option'}</span>
                    <strong>{genericImportedOption}</strong>
                  </article>
                </div>
              ) : (
                <div className="kream-price-split">
                  <article>
                    <span>{copy.hero.lowestAsk}</span>
                    <strong className="kream-money">{formatMarketPrice(selectedQuote.sellAsk, localeCode)}</strong>
                  </article>
                  <article>
                    <span>{copy.hero.highestBid}</span>
                    <strong className="kream-money">{formatMarketPrice(selectedQuote.buyBid, localeCode)}</strong>
                  </article>
                </div>
              )}

              {isOliveYoungProduct ? (
                <div className="olive-option-menu" role="tablist" aria-label={oliveOptionLabel}>
                  {activeProduct.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={selectedOption === option}
                      className={`olive-option-tab${selectedOption === option ? ' is-active' : ''}`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : isBookStoreProduct ? (
                <div className="yes24-format-menu" role="tablist" aria-label={yes24OptionLabel}>
                  {activeProduct.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={selectedOption === option}
                      className={`yes24-format-tab${selectedOption === option ? ' is-active' : ''}`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : isUsedMarketplaceProduct ? (
                <div className="used-condition-menu" role="tablist" aria-label={locale === 'ko' ? '거래 조건 선택' : 'Select trade condition'}>
                  {activeProduct.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={selectedOption === option}
                      className={`used-condition-tab${selectedOption === option ? ' is-active' : ''}`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : isGenericImportedProduct ? (
                <div className="olive-option-menu" role="tablist" aria-label={locale === 'ko' ? '옵션 선택' : 'Select option'}>
                  {activeProduct.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={selectedOption === option}
                      className={`olive-option-tab${selectedOption === option ? ' is-active' : ''}`}
                      onClick={() => setSelectedOption(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="kream-size-menu" role="tablist" aria-label={copy.board.columns.option}>
                  {market.sizeQuotes.map((quote) => (
                    <button
                      key={quote.size}
                      type="button"
                      role="tab"
                      aria-selected={selectedQuote.size === quote.size}
                      className={`kream-size-tab${selectedQuote.size === quote.size ? ' is-active' : ''}`}
                      onClick={() => setSelectedSize(quote.size)}
                    >
                      <span className="kream-size-tab__label">{quote.size}</span>
                      <strong className="kream-money">{formatMarketPrice(quote.instantBuy, localeCode)}</strong>
                    </button>
                  ))}
                </div>
              )}

              <article className="kream-spec-card">
                <h2>
                  {isGenericImportedProduct
                    ? locale === 'ko'
                      ? '원본 상품 정보'
                      : 'Source product info'
                    : isUsedMarketplaceProduct
                      ? locale === 'ko'
                        ? '중고 거래 정보'
                        : 'Used listing info'
                      : isBookStoreProduct
                        ? yes24SpecTitle
                        : copy.specs.title}
                </h2>
                <div className="kream-spec-grid">
                  {displayInfoItems.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <div className="kream-request-box">
                <div className="kream-request-box__head">
                  <div className="kream-request-box__title">
                    <strong>{detailRequestTitle}</strong>
                    <p>{detailRequestSupport}</p>
                  </div>
                  <span className="kream-request-box__count">{requestNoteCount}/220</span>
                </div>
                <div className="kream-request-box__field">
                  <textarea
                    rows={4}
                    maxLength={220}
                    value={requestNote}
                    onChange={(event) => setRequestNote(event.target.value)}
                    placeholder={detailRequestPlaceholder}
                  />
                </div>
              </div>

              <div className="kream-total-card">
                <h2>
                  {isOliveYoungProduct
                    ? locale === 'ko'
                      ? '예상 결제 정보'
                      : 'Estimated checkout'
                    : isBookStoreProduct
                      ? locale === 'ko'
                        ? '결제 정보'
                        : 'Purchase summary'
                      : isUsedMarketplaceProduct
                        ? locale === 'ko'
                          ? '안전 구매 예상'
                          : 'Protected purchase estimate'
                        : isGenericImportedProduct
                          ? locale === 'ko'
                            ? '구매 요청 정보'
                            : 'Purchase request'
                          : copy.total.title}
                </h2>
                <div className="kream-total-list">
                  {isOliveYoungProduct ? (
                    <>
                      <div>
                        <span>{locale === 'ko' ? '정가' : 'Retail'}</span>
                        <strong className="kream-money">{formatMarketPrice(activeProduct.originalPrice, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '할인 혜택' : 'Discount'}</span>
                        <strong className="kream-money">-{formatMarketPrice(Math.max(activeProduct.originalPrice - activeProduct.price, 0), localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '배송비' : 'Shipping'}</span>
                        <strong className="kream-money">{oliveShippingFee === 0 ? copy.total.free : formatMarketPrice(oliveShippingFee, localeCode)}</strong>
                      </div>
                    </>
                  ) : isBookStoreProduct ? (
                    <>
                      <div>
                        <span>{locale === 'ko' ? '정가' : 'List price'}</span>
                        <strong className="kream-money">{formatMarketPrice(activeProduct.originalPrice, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '판매가' : 'Sale price'}</span>
                        <strong className="kream-money">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? `${bookStoreLabel} 적립` : 'Points'}</span>
                        <strong className="kream-money">{formatMarketPrice(yes24PointAmount, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '배송비' : 'Shipping'}</span>
                        <strong className="kream-money">{yes24ShippingFee === 0 ? copy.total.free : formatMarketPrice(yes24ShippingFee, localeCode)}</strong>
                      </div>
                    </>
                  ) : isUsedMarketplaceProduct ? (
                    <>
                      <div>
                        <span>{locale === 'ko' ? '매물 가격' : 'Listing price'}</span>
                        <strong className="kream-money">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '안전거래/확인 비용' : 'Protection check fee'}</span>
                        <strong className="kream-money">{formatMarketPrice(usedServiceFee, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '거래 조건' : 'Trade option'}</span>
                        <strong>{usedTradeOption}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '원본 판매처' : 'Source seller'}</span>
                        <strong>{activeProduct.originShop}</strong>
                      </div>
                    </>
                  ) : isGenericImportedProduct ? (
                    <>
                      <div>
                        <span>{locale === 'ko' ? '상품 가격' : 'Product price'}</span>
                        <strong className="kream-money">{formatMarketPrice(activeProduct.price, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '원본 판매처' : 'Source shop'}</span>
                        <strong>{activeProduct.originShop}</strong>
                      </div>
                      <div>
                        <span>{locale === 'ko' ? '선택 옵션' : 'Selected option'}</span>
                        <strong>{genericImportedOption}</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span>{copy.total.price}</span>
                        <strong className="kream-money">{formatMarketPrice(selectedQuote.instantBuy, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{copy.total.fee}</span>
                        <strong className="kream-money">{formatMarketPrice(serviceFee, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{copy.total.domestic}</span>
                        <strong className="kream-money">{domesticShipping === 0 ? copy.total.free : formatMarketPrice(domesticShipping, localeCode)}</strong>
                      </div>
                      <div>
                        <span>{copy.total.international}</span>
                        <strong className="kream-money">{formatMarketPrice(market.shippingFee, localeCode)}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="purchase-total">
                  <span>{copy.total.total}</span>
                  <strong className="kream-money kream-money--total">
                    {formatMarketPrice(
                      isOliveYoungProduct
                        ? oliveTotal
                        : isBookStoreProduct
                          ? yes24Total
                          : isUsedMarketplaceProduct
                            ? usedProtectedTotal
                            : isGenericImportedProduct
                              ? activeProduct.price
                              : total,
                      localeCode,
                    )}
                  </strong>
                </div>

                <div className="purchase-actions">
                  {isOliveYoungProduct ? (
                    <>
                      <button type="button" disabled={purchaseRequestPending || purchaseRequestComplete} className="button button--ghost" onClick={submitPurchaseRequest}>
                        {purchaseRequestComplete ? (locale === 'ko' ? '요청 접수 완료' : 'Request received') : olivePrimaryAction}
                      </button>
                      <a className="button button--primary kream-inline-anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                        {oliveSecondaryAction}
                      </a>
                    </>
                  ) : isBookStoreProduct ? (
                    <>
                      <button type="button" disabled={purchaseRequestPending || purchaseRequestComplete} className="button button--ghost" onClick={submitPurchaseRequest}>
                        {purchaseRequestComplete ? (locale === 'ko' ? '요청 접수 완료' : 'Request received') : yes24PrimaryAction}
                      </button>
                      <a className="button button--primary kream-inline-anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                        {yes24SecondaryAction}
                      </a>
                    </>
                  ) : isUsedMarketplaceProduct ? (
                    <>
                      <button type="button" disabled={purchaseRequestPending || purchaseRequestComplete} className="button button--primary" onClick={submitPurchaseRequest}>
                        {purchaseRequestComplete ? (locale === 'ko' ? '요청 접수 완료' : 'Request received') : locale === 'ko' ? '안전 구매 요청' : 'Request protected purchase'}
                      </button>
                      <a className="button button--ghost kream-inline-anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                        {locale === 'ko' ? '원본 매물 보기' : 'Open source listing'}
                      </a>
                    </>
                  ) : isGenericImportedProduct ? (
                    <>
                      <button type="button" disabled={purchaseRequestPending || purchaseRequestComplete} className="button button--primary" onClick={submitPurchaseRequest}>
                        {purchaseRequestComplete ? (locale === 'ko' ? '요청 접수 완료' : 'Request received') : locale === 'ko' ? '구매 요청하기' : 'Request purchase'}
                      </button>
                      <a className="button button--ghost kream-inline-anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                        {locale === 'ko' ? '원본 보기' : 'Open source'}
                      </a>
                    </>
                  ) : (
                    <>
                      <button type="button" disabled={purchaseRequestPending || purchaseRequestComplete} className="button button--primary" onClick={submitPurchaseRequest}>
                        {purchaseRequestComplete ? (locale === 'ko' ? '요청 접수 완료' : 'Request received') : copy.hero.buyNow}
                      </button>
                      <a className="button button--ghost kream-inline-anchor" href={activeProduct.originalUrl} target="_blank" rel="noreferrer">
                        {copy.hero.openSource}
                      </a>
                    </>
                  )}
                </div>
                {purchaseRequestError ? <p className="kream-purchase-request-error" role="alert">{purchaseRequestError}</p> : null}
              </div>
            </aside>
          </section>

          {isKreamProduct ? (
            <section id="market" className="kream-board-card">
              <div className="section-head section-head--compact">
                <div>
                  <span className="eyebrow">{copy.board.title}</span>
                  <h2>{selectedQuote.size} {copy.board.title}</h2>
                </div>
                <p>{copy.board.description}</p>
              </div>

              <div className="kream-board-graph-card">
                <div className="kream-board-graph-card__head">
                  <div>
                    <strong>{chartTitle}</strong>
                    <p>{chartDescription}</p>
                  </div>
                  <div className="kream-board-filters">
                    <button type="button" className={chartMetric === 'instantBuy' ? 'is-active' : ''} onClick={() => setChartMetric('instantBuy')}>
                      {copy.board.chartFilters.instantBuy}
                    </button>
                    <button type="button" className={chartMetric === 'sellAsk' ? 'is-active' : ''} onClick={() => setChartMetric('sellAsk')}>
                      {copy.board.chartFilters.sellAsk}
                    </button>
                    <button type="button" className={chartMetric === 'buyBid' ? 'is-active' : ''} onClick={() => setChartMetric('buyBid')}>
                      {copy.board.chartFilters.buyBid}
                    </button>
                  </div>
                </div>

                <div className="kream-board-line-chart">
                  <div className="kream-board-line-chart__summary">
                    <span>{selectedQuote.size} / {chartMetricLabel}</span>
                    <strong className="kream-money">{formatMarketPrice(selectedChartValue, localeCode)}</strong>
                    <p>{formatSignedMarketPrice(selectedQuote.premium, localeCode)} ({selectedQuote.premiumPercent}%)</p>
                  </div>

                  <div className="kream-board-line-chart__canvas" role="img" aria-label={`${chartTitle} ${chartMetricLabel}`}>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="kream-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ff8d6a" stopOpacity="0.94" />
                          <stop offset="100%" stopColor="#3e7bff" stopOpacity="0.94" />
                        </linearGradient>
                        <linearGradient id="kream-line-area" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3e7bff" stopOpacity="0.24" />
                          <stop offset="100%" stopColor="#3e7bff" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {chartGuidePositions.map((position) => (
                        <line
                          key={`guide-${position}`}
                          className="kream-board-line-chart__guide"
                          x1="0"
                          y1={position}
                          x2="100"
                          y2={position}
                        />
                      ))}

                      <path className="kream-board-line-chart__area" d={chartAreaPath} fill="url(#kream-line-area)" />
                      <path className="kream-board-line-chart__path" d={chartLinePath} fill="none" stroke="url(#kream-line-gradient)" />
                    </svg>

                    {chartPointData.map(({ quote, value, x, y }) => (
                      <button
                        key={`graph-${quote.size}`}
                        type="button"
                        className={`kream-board-line-point${quote.size === selectedQuote.size ? ' is-active' : ''}`}
                        style={{ '--point-left': `${x}%`, '--point-top': `${y}%` } as CSSProperties}
                        onClick={() => setSelectedSize(quote.size)}
                        aria-label={`${quote.size} ${chartMetricLabel} ${formatMarketPrice(value, localeCode)}`}
                      >
                        {quote.size === selectedQuote.size ? (
                          <span className="kream-board-line-point__value kream-money">{formatMarketPrice(value, localeCode)}</span>
                        ) : null}
                        <span className="kream-board-line-point__dot" />
                        <span className="kream-board-line-point__size">{quote.size}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="kream-board-tabs">
                <button type="button" className={boardTab === 'trades' ? 'is-active' : ''} onClick={() => setBoardTab('trades')}>
                  {copy.board.tabs.trades}
                </button>
                <button type="button" className={boardTab === 'asks' ? 'is-active' : ''} onClick={() => setBoardTab('asks')}>
                  {copy.board.tabs.asks}
                </button>
                <button type="button" className={boardTab === 'bids' ? 'is-active' : ''} onClick={() => setBoardTab('bids')}>
                  {copy.board.tabs.bids}
                </button>
              </div>

              <div className="kream-board-table">
                <div className="kream-board-table__head">
                  <span>{copy.board.columns.option}</span>
                  <span>{copy.board.columns.price}</span>
                  <span>{boardMetaLabel}</span>
                </div>
                {boardRows.map((row) => (
                  <div key={`${boardTab}-${row.size}-${row.price}`} className="kream-board-table__row">
                    <strong>{row.size}</strong>
                    <span className="kream-board-table__price">
                      <em
                        className="kream-board-table__bar"
                        style={{ '--board-fill': `${Math.max(toPercent(row.price, boardPriceMin, boardPriceMax), 10)}%` } as CSSProperties}
                      />
                      <b className="kream-money">{formatMarketPrice(row.price, localeCode)}</b>
                    </span>
                    <span>{row.meta}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isKreamProduct ? (
            <>
              <section className="kream-review-summary">
                <div className="kream-review-summary__score">
                  <strong>5.0</strong>
                  <span>
                    <Star size={18} fill="currentColor" />
                  </span>
                  <small>{locale === 'ko' ? `${market.reviewCount}개의 리뷰` : `${market.reviewCount} reviews`}</small>
                </div>

                <div className="kream-review-summary__traits">
                  {reviewTraits.map((trait) => (
                    <div key={trait.label} className="kream-review-summary__row">
                      <strong>{trait.label}</strong>
                      <span>{trait.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="kream-rail-section">
                <div className="kream-rail-section__head">
                  <h2>{sameModelTitle}</h2>
                  <span className="kream-rail-section__badge">{sameModelAction}</span>
                </div>

                <div className="kream-rail">
                  {sameModelQuotes.map((quote) => (
                    <button
                      key={`same-model-${quote.size}`}
                      type="button"
                      className={`kream-rail-card${quote.size === selectedQuote.size ? ' is-active' : ''}`}
                      onClick={() => setSelectedSize(quote.size)}
                    >
                      <div className="kream-rail-card__media">
                        <ProductArtwork
                          art={activeProduct.art}
                          palette={activeProduct.palette}
                          accent={activeProduct.accent}
                          imageUrl={galleryImages[0] ?? activeProduct.imageUrl}
                          name={activeProduct.name}
                          style={{ width: '100%', minHeight: 160 }}
                        />
                      </div>
                      <div className="kream-rail-card__body">
                        <span>{quote.size}</span>
                        <strong className="kream-money">{formatMarketPrice(quote.instantBuy, localeCode)}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {brandProducts.length > 0 ? (
                <section className="kream-rail-section">
                  <div className="kream-rail-section__head">
                    <h2>{brandTitle}</h2>
                    <span className="kream-rail-section__badge">{market.brand}</span>
                  </div>

                  <div className="kream-rail">
                    {brandProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="kream-rail-card kream-rail-card--brand"
                        onClick={() => onOpenProduct(product.id)}
                      >
                        <div className="kream-rail-card__media">
                          <ProductArtwork
                            art={product.art}
                            palette={product.palette}
                            accent={product.accent}
                            imageUrl={product.imageUrl}
                            name={product.name}
                            style={{ width: '100%', minHeight: 160 }}
                          />
                        </div>
                        <div className="kream-rail-card__body">
                          <span>{product.marketplace}</span>
                          <strong>{product.name}</strong>
                          <em className="kream-money">{formatMarketPrice(product.price, localeCode)}</em>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {sizeGuideRows.length > 0 ? (
                <section className="kream-size-guide">
                  <div className="kream-rail-section__head">
                    <h2>{sizeGuideTitle}</h2>
                  </div>

                  <div className="kream-size-guide__scroll">
                    <table className="kream-size-guide__table">
                      <tbody>
                        {sizeGuideRows.map((row) => (
                          <tr key={row.label}>
                            <th scope="row">{row.label}</th>
                            {row.values.map((value, index) => (
                              <td key={`${row.label}-${market.sizeQuotes[index]?.size ?? index}`}>{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p>{sizeGuideNote}</p>
                </section>
              ) : null}
            </>
          ) : null}

          {isOliveYoungProduct ? (
            <>
              <section className="olive-story-grid">
                <div className="kream-rail-section__head">
                  <h2>{oliveStoryTitle}</h2>
                  <span className="kream-rail-section__badge">{olivePromoBadge}</span>
                </div>

                <div className="olive-story-grid__cards">
                  {oliveStoryCards.map((card) => (
                    <article key={`${card.eyebrow}-${card.title}`} className={`olive-story-card olive-story-card--${card.tone}`}>
                      <span>{card.eyebrow}</span>
                      <strong>{card.title}</strong>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              {relatedProducts.length > 0 ? (
                <section className="olive-related-grid">
                  <div className="kream-rail-section__head">
                    <h2>{oliveRelatedTitle}</h2>
                  </div>

                  <div className="olive-related-grid__cards">
                    {relatedProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="olive-related-card"
                        onClick={() => onOpenProduct(product.id)}
                      >
                        <div className="olive-related-card__media">
                          <ProductArtwork
                            art={product.art}
                            palette={product.palette}
                            accent={product.accent}
                            imageUrl={product.imageUrl}
                            name={product.name}
                            style={{ width: '100%', minHeight: 160 }}
                          />
                        </div>
                        <div className="olive-related-card__body">
                          <span>{product.marketplace}</span>
                          <strong>{product.name}</strong>
                          <em className="kream-money">{formatMarketPrice(product.price, localeCode)}</em>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {isBookStoreProduct ? (
            <>
              <section className="yes24-tab-strip">
                {yes24Tabs.map((tab, index) => (
                  <button key={tab} type="button" className={index === 0 ? 'is-active' : ''}>
                    {tab}
                  </button>
                ))}
              </section>

              {relatedProducts.length > 0 ? (
                <section className="yes24-related-strip">
                  <div className="kream-rail-section__head">
                    <h2>{yes24BundleTitle}</h2>
                  </div>

                  <div className="yes24-related-strip__grid">
                    {relatedProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="yes24-book-card"
                        onClick={() => onOpenProduct(product.id)}
                      >
                        <div className="yes24-book-card__cover">
                          <ProductArtwork
                            art={product.art}
                            palette={product.palette}
                            accent={product.accent}
                            imageUrl={product.imageUrl}
                            name={product.name}
                            style={{ width: '100%', minHeight: 200 }}
                          />
                        </div>
                        <div className="yes24-book-card__body">
                          <strong>{product.name}</strong>
                          <span>{product.caption}</span>
                          <em className="kream-money">{formatMarketPrice(product.price, localeCode)}</em>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section id="book-info" className="yes24-book-panels">
                <article className="yes24-book-panel">
                  <h2>{yes24InfoTitle}</h2>
                  <div className="yes24-book-specs">
                    {yes24BookInfoItems.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="yes24-book-panel">
                  <h2>{yes24TagTitle}</h2>
                  <div className="yes24-tag-list">
                    {yes24Tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>

                  <div className="yes24-md-pick">
                    <small>{yes24MdPickTitle}</small>
                    <strong>{activeProduct.caption}</strong>
                    <p>{activeProduct.overview}</p>
                  </div>
                </article>
              </section>

              <section className="yes24-book-copy">
                <article className="yes24-book-copy__intro">
                  <h2>{yes24IntroTitle}</h2>
                  <p>{activeProduct.overview}</p>
                  {bookEditorial.map((item) => (
                    <div key={item.title} className="yes24-book-copy__note">
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </article>

                <article className="yes24-book-copy__toc">
                  <h2>{yes24TocTitle}</h2>
                  <ol>
                    {yes24TocItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </article>
              </section>

              <section className="yes24-book-notices">
                <div className="kream-rail-section__head">
                  <h2>{yes24NoticesTitle}</h2>
                </div>
                <div className="yes24-book-notices__grid">
                  {activeProduct.notices.map((notice, index) => (
                    <article key={`${notice}-${index}`} className="notice-card">
                      <h3>{locale === 'ko' ? '안내' : 'Notice'}</h3>
                      <p>{notice}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {isUsedMarketplaceProduct ? (
            <section id="used-market" className="used-market-board">
              <div className="section-head section-head--compact">
                <div>
                  <span className="eyebrow">{locale === 'ko' ? '중고 가격 비교' : 'Used price check'}</span>
                  <h2>{locale === 'ko' ? '비슷한 중고 매물과 비교' : 'Compare with similar used listings'}</h2>
                </div>
                <p>
                  {locale === 'ko'
                    ? '원본 매물가, 유사 매물 참고가, 안전거래 포함 예상가를 함께 보고 구매 리스크를 줄입니다.'
                    : 'Review the source listing, a comparable used price, and a protected estimate together.'}
                </p>
              </div>

              <div className="used-price-board">
                {usedPriceComparisonRows.map((row, index) => (
                  <article key={row.label} className={index === 0 ? 'is-current' : ''}>
                    <span>{row.label}</span>
                    <strong className="kream-money">{formatMarketPrice(row.price, localeCode)}</strong>
                    <p>{row.note}</p>
                  </article>
                ))}
              </div>

              <div className="used-check-grid">
                {usedAssurance.map((item) => (
                  <article key={item.title} className="notice-card">
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {!isBookStoreProduct ? (
            <>
              <section className="kream-copy-grid">
                <article className="info-card">
                  <h3>{copy.editorial.overview}</h3>
                  <p>{activeProduct.overview}</p>
                </article>

                <article className="info-card">
                  <h3>{copy.editorial.detailPoints}</h3>
                  <ul className="bullet-list">
                    {activeProduct.detailPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>

                {(isUsedMarketplaceProduct ? usedEditorial : isGenericImportedProduct ? genericImportedEditorial : market.editorial).map((item) => (
                  <article key={item.title} className="info-card">
                    <h3>{copy.editorial.marketRead}</h3>
                    <strong className="kream-copy-grid__strong">{item.title}</strong>
                    <p>{item.body}</p>
                  </article>
                ))}
              </section>

              <section id="assurance" className="kream-assurance-block">
                <div className="section-head section-head--compact">
                  <div>
                    <span className="eyebrow">{copy.assurance.title}</span>
                    <h2>{copy.assurance.title}</h2>
                  </div>
                  <p>
                    {isUsedMarketplaceProduct
                      ? locale === 'ko'
                        ? '중고 상품은 가격보다 상태와 거래 방식이 더 중요하므로 별도 보증 체크를 함께 봅니다.'
                        : 'Used products need condition and trade-method checks alongside the price.'
                      : isGenericImportedProduct
                        ? locale === 'ko'
                          ? '가져온 상품 정보를 홈과 같은 상세 화면에서 확인합니다.'
                          : 'Review imported product data in the same detail style as the home page.'
                        : market.benefitNote}
                  </p>
                </div>

                <div className="kream-assurance-grid">
                  {(isUsedMarketplaceProduct ? usedAssurance : isGenericImportedProduct ? genericImportedAssurance : market.assurance).map((item) => (
                    <article key={item.title} className="notice-card">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </article>
                  ))}

                  {activeProduct.notices.map((notice, index) => (
                    <article key={`${notice}-${index}`} className="notice-card">
                      <h3>{copy.assurance.notesTitle}</h3>
                      <p>{notice}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {(isKreamProduct || isOliveYoungProduct || isBookStoreProduct || isUsedMarketplaceProduct || isGenericImportedProduct) && galleryImages.length > 0 ? (
            <section id="details" className={`kream-detail-gallery${isOliveYoungProduct ? ' olive-detail-gallery' : ''}${isBookStoreProduct ? ' yes24-detail-gallery' : ''}${isUsedMarketplaceProduct ? ' used-detail-gallery' : ''}`}>
              <div className="kream-rail-section__head">
                <h2>{detailGalleryTitle}</h2>
              </div>

              <div className="kream-detail-gallery__stack">
                {galleryImages.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}-detail`} className="kream-detail-gallery__panel">
                    <ProductImage
                      imageUrl={imageUrl}
                      alt={`${activeProduct.name} detail ${index + 1}`}
                      loading="eager"
                      decoding="async"
                      fallbackLabel={activeProduct.name}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {isKreamProduct ? (
            <section className="kream-support-block">
              <div className="kream-trust-banner">
                <ShieldCheck size={18} />
                <strong>{trustBannerText}</strong>
                <ChevronRight size={18} />
              </div>

              <div className="kream-support-card">
                <h2>{supportTitle}</h2>
                {supportHours.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ) : null}

          {!isBookStoreProduct ? (
            <section className="timeline-grid">
              {(isUsedMarketplaceProduct ? usedFlow : isGenericImportedProduct ? genericImportedFlow : market.flow).map((step) => (
                <article key={step.step} className="timeline-card">
                  <span>{step.step}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </article>
              ))}
            </section>
          ) : null}
        </div>
      </main>
    </>
  )
}

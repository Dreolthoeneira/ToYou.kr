import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link2, Package, Search } from 'lucide-react'
import { createImportedProduct, saveImportedProduct, type ScrapedProductPayload } from '../importedProducts'
import { saveServerImportedProduct } from '../storeApi'
import { requestCatalogTool } from '../catalogToolsApi'
import { localizeScrapeError, useI18n } from '../i18n'
import { SITE_BRAND } from '../siteBrand'
import { EditorialHeader } from '../components/layout/EditorialHeader'
import { ProductImage } from '../components/ProductImage'

interface HomePageProps {
  onOpenProduct: (productId: string) => void
  onGoToStore: () => void
  onGoToLogin: () => void
  onGoToSignup: () => void
}

type HomeCopy = {
  nav: { process: string; services: string; support: string; brandBadge: string }
  auth: { login: string; signup: string }
  hero: {
    badges: [string, string, string]
    eyebrow: string
    title: [string, string]
    description: string
    commandLabel: string
    inputBadge: string
    placeholder: string
    action: string
    loading: string
    tips: string[]
    stats: Array<{ label: string; value: string }>
  }
  process: {
    eyebrow: string
    title: string
    description: string
    steps: Array<{ step: string; title: string; body: string }>
  }
  services: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ emoji: string; title: string; body: string }>
  }
  support: {
    eyebrow: string
    title: string
    description: string
    cards: Array<{ title: string; body: string }>
  }
  footer: {
    description: string
    links: string
    account: string
  }
  errors: {
    emptyUrl: string
    invalidUrl: string
    loadFailed: string
  }
}

type SearchMode = 'used' | 'book'
type UsedSearchMarket = 'BUNJANG' | 'JOONGNA' | 'NAVER FLEAMARKET'
type UsedPlatformFilter = 'ALL' | UsedSearchMarket
type UsedPlatformOptionValue = 'URL' | UsedPlatformFilter
type UsedPlatformOption = {
  value: UsedPlatformOptionValue
  label: string
  hint: string
}

type SearchModeCopy = {
  badge: string
  placeholder: string
  action: string
  searchFailed: string
  noResults: (value: string) => string
  resultsEyebrow: string
  resultsTitle: (value: string) => string
  resultsDescription: string
  resultAction: string
  resultSource: string
  emptyMarket: string
  summary: (count: number) => string
}

type KeywordSearchCopy = {
  commandLabel: string
  modeLabel: string
  emptyInput: string
  url: {
    badge: string
    placeholder: string
    action: string
  }
  modes: Record<SearchMode, { label: string; hint: string }>
  used: SearchModeCopy
  book: SearchModeCopy
}

const koCopy: HomeCopy = {
  nav: { process: '이용방법', services: '서비스', support: '안내', brandBadge: 'Seoul to global' },
  auth: { login: '로그인', signup: '회원가입' },
  hero: {
    badges: ['URL 입력', '자동 수집', '국제 배송'],
    eyebrow: '글로벌 배송 대행',
    title: ['가장 쉽고 빠른', '한국 쇼핑 링크 인입'],
    description:
      '상품 링크 하나만 넣으면 대표 이미지, 가격, 옵션, 원본 링크를 자동으로 정리해 바로 상세 페이지로 넘깁니다. 쇼핑몰, 브랜드 스토어, 리셀 마켓 등 다양한 한국 상품 링크를 한 흐름으로 관리할 수 있습니다.',
    commandLabel: '상품 링크 첨부',
    inputBadge: '링크',
    placeholder: '예: https://kream.co.kr/products/327067',
    action: '링크 불러오기',
    loading: '불러오는 중...',
    tips: [
      '상품 링크만 붙여 넣으면 홈 목록을 거치지 않고 바로 상세로 이동합니다.',
      '대표 이미지가 있으면 상세 상단 갤러리에서 크게 보여줍니다.',
      '원본 링크는 상세 페이지에서 다시 열거나 복사할 수 있습니다.',
    ],
    stats: [
      { label: '자동 수집', value: 'URL' },
      { label: '바로 이동', value: 'DETAIL' },
      { label: '원본 링크', value: 'SOURCE' },
    ],
  },
  process: {
    eyebrow: '이용 방법',
    title: '링크 하나로 끝나는 3단계',
    description: '입력, 검토, 결제 흐름만 남기고 복잡한 수집 작업은 화면 뒤로 숨깁니다.',
    steps: [
      { step: '01', title: '상품 링크 입력', body: '원하는 한국 상품 링크를 붙여 넣으면 스토어 정보와 상품 기본 정보를 자동으로 분석합니다.' },
      { step: '02', title: '상세 정보 확인', body: '가져온 상품명, 이미지, 가격, 옵션, 요청 메모를 상세 페이지에서 바로 검토합니다.' },
      { step: '03', title: '구매와 배송 진행', body: '검수 요청과 국제 배송 비용까지 묶어서 실제 주문 흐름으로 이어갑니다.' },
    ],
  },
  services: {
    eyebrow: '서비스',
    title: '원본 링크 중심으로 설계된 구매 경험',
    description: '우리가 직접 상품을 등록하지 않아도, 링크 기반으로 상세 페이지를 빠르게 생성해 주문 결정을 앞당깁니다.',
    cards: [
      { emoji: '🔗', title: '원본 링크 보존', body: '상세 페이지 안에서 원본 판매처 링크를 열고 복사할 수 있어 맥락이 끊기지 않습니다.' },
      { emoji: '🖼️', title: '대표 이미지 자동 반영', body: '감지된 상품 이미지를 상단 비주얼에 먼저 배치해 링크만으로도 신뢰감 있는 상세를 만듭니다.' },
      { emoji: '📦', title: '배송 비용 결합', body: '상품 금액에 수수료와 국제 배송비를 더해 실제 결제에 가까운 총액을 빠르게 보여줍니다.' },
    ],
  },
  support: {
    eyebrow: '운영 메모',
    title: '상세 페이지에서 중요한 것만 남긴다',
    description: '이 사이트는 링크 수집보다 결제 직전 의사결정에 집중합니다.',
    cards: [
      { title: '구매 전 메모', body: '상태 확인, 구성품, 포장 요청 같은 체크 포인트를 상세 페이지에서 바로 입력합니다.' },
      { title: '옵션 우선 구조', body: '상품마다 옵션 선택과 가격 요약이 상세 상단에서 바로 연결되도록 구성합니다.' },
      { title: '국제 배송 연결', body: '검수와 포워딩 문맥을 유지한 채 결제 총액까지 이어지도록 설계합니다.' },
    ],
  },
  footer: {
    description: '링크 하나로 상품 상세를 만들고 구매대행 흐름까지 연결하는 글로벌 forwarding storefront.',
    links: '바로가기',
    account: '계정',
  },
  errors: {
    emptyUrl: '상품 링크를 먼저 입력해 주세요.',
    invalidUrl: '올바른 상품 링크를 입력해 주세요.',
    loadFailed: '상품 정보를 불러오지 못했습니다.',
  },
}

const enCopy: HomeCopy = {
  nav: { process: 'How it works', services: 'Services', support: 'Notes', brandBadge: 'Seoul to global' },
  auth: { login: 'Login', signup: 'Sign up' },
  hero: {
    badges: ['URL intake', 'Auto import', 'International shipping'],
    eyebrow: 'Global forwarding',
    title: ['The fastest way to turn', 'a Korean product link into a detail page'],
    description:
      'Paste a product link and we organize the lead image, pricing, options, and source URL before moving directly into the detail view. One flow can cover brand stores, marketplaces, and resale links.',
    commandLabel: 'Attach product link',
    inputBadge: 'LINK',
    placeholder: 'Example: https://kream.co.kr/products/327067',
    action: 'Import link',
    loading: 'Loading...',
    tips: [
      'A product link opens the detail page directly without leaving cards on the homepage.',
      'If an image is detected, it becomes the main visual in the detail gallery.',
      'The original source link stays available for reopening or copying later.',
    ],
    stats: [
      { label: 'Auto import', value: 'URL' },
      { label: 'Direct route', value: 'DETAIL' },
      { label: 'Source trace', value: 'SOURCE' },
    ],
  },
  process: {
    eyebrow: 'How it works',
    title: 'Three steps, no manual catalog work',
    description: 'Input, review, and payment remain visible while the collection work stays behind the scenes.',
    steps: [
      { step: '01', title: 'Paste the product URL', body: 'We analyze the store, product name, price, and images from the submitted link.' },
      { step: '02', title: 'Review the detail page', body: 'Check the imported title, image, pricing, options, and request notes directly inside the detail view.' },
      { step: '03', title: 'Move into purchase flow', body: 'Carry inspection requests and international shipping estimates into the real order process.' },
    ],
  },
  services: {
    eyebrow: 'Services',
    title: 'A purchase experience built around the original link',
    description: 'We do not need to pre-register products. The detail page is generated from the source URL and becomes actionable immediately.',
    cards: [
      { emoji: '🔗', title: 'Source link preserved', body: 'Open and copy the original seller URL directly from the detail page without losing context.' },
      { emoji: '🖼️', title: 'Lead image import', body: 'The detected product image becomes the hero visual so imported links still feel trustworthy.' },
      { emoji: '📦', title: 'Shipping-aware total', body: 'Service fees and international shipping are layered onto the product price for a more realistic total.' },
    ],
  },
  support: {
    eyebrow: 'Operating notes',
    title: 'Keep only what matters in the detail page',
    description: 'This storefront focuses on purchase decisions instead of manual catalog management.',
    cards: [
      { title: 'Pre-purchase notes', body: 'Condition checks, accessories, and packaging instructions live directly on the detail page.' },
      { title: 'Option-first structure', body: 'Options and price summaries stay connected near the top of the product detail.' },
      { title: 'International handoff', body: 'Inspection and forwarding context stays intact all the way into the total payment summary.' },
    ],
  },
  footer: {
    description: 'A global forwarding storefront that turns one link into a product detail page and purchase flow.',
    links: 'Links',
    account: 'Account',
  },
  errors: {
    emptyUrl: 'Enter a product link first.',
    invalidUrl: 'Enter a valid product link.',
    loadFailed: 'We could not load the product information.',
  },
}

const koKeywordSearchCopy: KeywordSearchCopy = {
  commandLabel: '상품 링크 또는 키워드 검색',
  modeLabel: '검색 방식',
  emptyInput: '링크 또는 검색어를 먼저 입력해 주세요.',
  url: {
    badge: 'LINK',
    placeholder: '예: https://kream.co.kr/products/327067',
    action: '링크 불러오기',
  },
  modes: {
    used: {
      label: '중고',
      hint: '통합 또는 플랫폼별 검색',
    },
    book: {
      label: '책',
      hint: '알라딘 · YES24',
    },
  },
  used: {
    badge: 'USED',
    placeholder: '예: 아식스 젤 카야노 14',
    action: '중고 검색',
    searchFailed: '중고 검색 결과를 불러오지 못했습니다.',
    noResults: (value: string) => `"${value}" 검색 결과가 없습니다.`,
    resultsEyebrow: '중고 검색 결과',
    resultsTitle: (value: string) => `"${value}"에 대한 통합 중고 검색 결과`,
    resultsDescription: '카드를 누르면 해당 상품을 바로 상세 플로우에 담습니다.',
    resultAction: '상세 담기',
    resultSource: '원본 보기',
    emptyMarket: '결과 없음',
    summary: (count: number) => `상위 ${count}개`,
  },
  book: {
    badge: 'BOOK',
    placeholder: '예: 꽃의 시간',
    action: '책 검색',
    searchFailed: '책 검색 결과를 불러오지 못했습니다.',
    noResults: (value: string) => `"${value}" 검색 결과가 없습니다.`,
    resultsEyebrow: '책 검색 결과',
    resultsTitle: (value: string) => `"${value}"에 대한 알라딘 / YES24 결과`,
    resultsDescription: '카드를 누르면 해당 상품 상세로 바로 이어집니다.',
    resultAction: '상세 불러오기',
    resultSource: '원본 보기',
    emptyMarket: '결과 없음',
    summary: (count: number) => `상위 ${count}개`,
  },
}

const enKeywordSearchCopy: KeywordSearchCopy = {
  commandLabel: 'Product link or keyword search',
  modeLabel: 'Search mode',
  emptyInput: 'Enter a link or search keyword first.',
  url: {
    badge: 'LINK',
    placeholder: 'Example: https://kream.co.kr/products/327067',
    action: 'Import link',
  },
  modes: {
    used: {
      label: 'Used',
      hint: 'Combined or platform-specific search',
    },
    book: {
      label: 'Books',
      hint: 'Aladin and YES24',
    },
  },
  used: {
    badge: 'USED',
    placeholder: 'Example: Asics Gel Kayano 14',
    action: 'Search used',
    searchFailed: 'We could not load the used market search results.',
    noResults: (value: string) => `No used-market results found for "${value}".`,
    resultsEyebrow: 'Used market results',
    resultsTitle: (value: string) => `Combined used-market matches for "${value}"`,
    resultsDescription: 'Select a card to save that listing into the detail flow right away.',
    resultAction: 'Save detail',
    resultSource: 'Source',
    emptyMarket: 'No results',
    summary: (count: number) => `${count} matches`,
  },
  book: {
    badge: 'BOOK',
    placeholder: 'Example: The Flower of Time',
    action: 'Search books',
    searchFailed: 'We could not load the book search results.',
    noResults: (value: string) => `No book results found for "${value}".`,
    resultsEyebrow: 'Book results',
    resultsTitle: (value: string) => `Aladin and YES24 matches for "${value}"`,
    resultsDescription: 'Select a card to open that product detail flow directly.',
    resultAction: 'Open detail',
    resultSource: 'Source',
    emptyMarket: 'No results',
    summary: (count: number) => `${count} matches`,
  },
}

const koAppleHomeCopy = {
  heroStage: {
    eyebrow: 'Editorial shopping flow',
    title: '링크에서 구매까지, 한 흐름으로',
    body: '넉넉한 여백과 선명한 정보 위계로 상품 탐색을 정리하고, 링크 불러오기와 마켓 검색은 첫 화면에서 바로 작동하도록 유지했습니다.',
  },
  supportSpotlight: {
    eyebrow: 'Purchase confidence',
    title: '카탈로그보다 결정에 집중하는 구조',
    body: '원본 링크, 요청 메모, 배송 연결만 남기고 수작업 등록 흐름은 최대한 뒤로 숨겼습니다.',
  },
}

const enAppleHomeCopy = {
  heroStage: {
    eyebrow: 'Editorial shopping flow',
    title: 'One clear flow from link to purchase',
    body: 'Generous space and a clear information hierarchy keep discovery calm, while link import and market search remain ready from the first screen.',
  },
  supportSpotlight: {
    eyebrow: 'Purchase confidence',
    title: 'Built for decisions, not catalog busywork',
    body: 'The flow keeps the original link, request memo, and shipping handoff visible while pushing manual listing work out of the way.',
  },
}

function normalizeUrlInput(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

const processIcons = [Link2, Search, Package] as const
const usedSearchMarkets: readonly UsedSearchMarket[] = ['BUNJANG', 'JOONGNA', 'NAVER FLEAMARKET']
const bookSearchMarkets = ['ALADIN', 'YES24'] as const

function isLikelyUrlInput(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return false
  }

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return true
  }

  if (/^www\./i.test(trimmed)) {
    return true
  }

  if (/\s/.test(trimmed)) {
    return false
  }

  return /^[^\s]+\.[a-z]{2,}(?:[\/?#]|$)/i.test(trimmed)
}

function toSearchMarketClassName(marketplace: string) {
  return marketplace.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function HomePage({ onOpenProduct, onGoToStore, onGoToLogin, onGoToSignup }: HomePageProps) {
  const { locale } = useI18n()
  const copy = locale === 'ko' ? koCopy : enCopy
  const keywordSearchCopy = locale === 'ko' ? koKeywordSearchCopy : enKeywordSearchCopy
  const appleHomeCopy = locale === 'ko' ? koAppleHomeCopy : enAppleHomeCopy
  const { scrollYProgress } = useScroll()
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('used')
  const [forceUrlEntry, setForceUrlEntry] = useState(false)
  const [usedPlatformFilter, setUsedPlatformFilter] = useState<UsedPlatformFilter>('ALL')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [searchResults, setSearchResults] = useState<ScrapedProductPayload[]>([])
  const [searchResultQuery, setSearchResultQuery] = useState('')
  const [searchResultMode, setSearchResultMode] = useState<SearchMode>('used')
  const [searchResultUsedPlatformFilter, setSearchResultUsedPlatformFilter] = useState<UsedPlatformFilter>('ALL')
  const [activeResultUrl, setActiveResultUrl] = useState('')
  const activeKeywordModeCopy = keywordSearchCopy[searchMode]
  const activeSearchResultCopy = keywordSearchCopy[searchResultMode]
  const usedPlatformOptions: UsedPlatformOption[] =
    locale === 'ko'
      ? [
          { value: 'URL', label: '원본 URL', hint: '상품 링크 직접 붙여넣기' },
          { value: 'ALL', label: '통합', hint: '3개 플랫폼 동시 검색' },
          { value: 'BUNJANG', label: '번개장터', hint: 'm.bunjang.co.kr' },
          { value: 'JOONGNA', label: '중고나라', hint: 'web.joongna.com' },
          { value: 'NAVER FLEAMARKET', label: '네이버 플리마켓', hint: 'fleamarket.naver.com' },
        ]
      : [
          { value: 'URL', label: 'Source URL', hint: 'Paste a product link directly' },
          { value: 'ALL', label: 'Combined', hint: 'Search all three markets' },
          { value: 'BUNJANG', label: 'Bunjang', hint: 'm.bunjang.co.kr' },
          { value: 'JOONGNA', label: 'Joongna', hint: 'web.joongna.com' },
          { value: 'NAVER FLEAMARKET', label: 'Naver Fleamarket', hint: 'fleamarket.naver.com' },
        ]
  const marketDisplayLabels: Record<string, string> =
    locale === 'ko'
      ? {
          ALADIN: '알라딘',
          YES24: 'YES24',
          BUNJANG: '번개장터',
          JOONGNA: '중고나라',
          'NAVER FLEAMARKET': '네이버 플리마켓',
        }
      : {
          ALADIN: 'Aladin',
          YES24: 'YES24',
          BUNJANG: 'Bunjang',
          JOONGNA: 'Joongna',
          'NAVER FLEAMARKET': 'Naver Fleamarket',
        }
  const activeSearchResultUsedPlatformOption =
    usedPlatformOptions.find((option) => option.value === searchResultUsedPlatformFilter) ?? usedPlatformOptions[0]
  const heroBadgeY = useTransform(scrollYProgress, [0, 0.16], [0, -18])
  const heroHeadlineY = useTransform(scrollYProgress, [0, 0.18], [0, 56])
  const heroHeadlineOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.56])
  const heroStatsY = useTransform(scrollYProgress, [0, 0.18], [0, 40])
  const sceneHaloY = useTransform(scrollYProgress, [0, 0.22], [0, -60])
  const sceneHaloScale = useTransform(scrollYProgress, [0, 0.22], [1, 1.12])
  const sceneBeamY = useTransform(scrollYProgress, [0, 0.22], [0, 72])
  const sceneBeamOpacity = useTransform(scrollYProgress, [0, 0.22], [0.92, 0.42])
  const sceneGlassY = useTransform(scrollYProgress, [0, 0.22], [0, 54])
  const sceneGlassRotate = useTransform(scrollYProgress, [0, 0.22], [0, 8])
  const isUrlMode = isLikelyUrlInput(query)
  const shouldUseUrlEntry = forceUrlEntry || isUrlMode
  const activeUsedPlatformOptionValue: UsedPlatformOptionValue = shouldUseUrlEntry ? 'URL' : usedPlatformFilter
  const searchResultMarkets =
    searchResultMode === 'used'
      ? searchResultUsedPlatformFilter === 'ALL'
        ? usedSearchMarkets
        : [searchResultUsedPlatformFilter]
      : bookSearchMarkets
  const searchGroups = searchResultMarkets.map((marketplace) => ({
    marketplace,
    items: searchResults.filter((result) => result.marketplace === marketplace),
  }))
  const searchResultEyebrow =
    searchResultMode === 'used' && searchResultUsedPlatformFilter !== 'ALL'
      ? locale === 'ko'
        ? `${activeSearchResultUsedPlatformOption.label} 검색`
        : `${activeSearchResultUsedPlatformOption.label} results`
      : activeSearchResultCopy.resultsEyebrow
  const searchResultTitle =
    searchResultMode === 'used' && searchResultUsedPlatformFilter !== 'ALL'
      ? locale === 'ko'
        ? `"${searchResultQuery}"에 대한 ${activeSearchResultUsedPlatformOption.label} 결과`
        : `${activeSearchResultUsedPlatformOption.label} matches for "${searchResultQuery}"`
      : activeSearchResultCopy.resultsTitle(searchResultQuery)
  const heroStageCards = [
    {
      badge: keywordSearchCopy.url.badge,
      title: keywordSearchCopy.url.action,
      body: copy.hero.tips[0],
    },
    {
      badge: keywordSearchCopy.used.badge,
      title: keywordSearchCopy.modes.used.label,
      body: keywordSearchCopy.modes.used.hint,
    },
    {
      badge: keywordSearchCopy.book.badge,
      title: keywordSearchCopy.modes.book.label,
      body: keywordSearchCopy.modes.book.hint,
    },
  ]

  async function importProductFromPayload(product: ScrapedProductPayload) {
    const importedProduct = createImportedProduct(product, locale)
    setIsLoading(true)
    setError('')

    try {
      const savedProduct = await saveServerImportedProduct(importedProduct)
      saveImportedProduct(savedProduct)
      onOpenProduct(savedProduct.id)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.errors.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearchModeChange(nextMode: SearchMode) {
    setSearchMode(nextMode)
    setForceUrlEntry(false)
    setError('')
    setSearchResults([])
    setSearchResultQuery('')
  }

  function handleUsedPlatformChange(nextPlatform: UsedPlatformOptionValue) {
    if (nextPlatform === 'URL') {
      setForceUrlEntry(true)
    } else {
      setForceUrlEntry(false)
      setUsedPlatformFilter(nextPlatform)
    }

    setError('')
    setSearchResults([])
    setSearchResultQuery('')
  }

  async function importProductFromUrl(targetUrl: string, fallbackProduct?: ScrapedProductPayload) {
    setIsLoading(true)
    setError('')

    try {
      const payload = await requestCatalogTool<{ product: ScrapedProductPayload }>('/api/scrape-product', { url: targetUrl })

      importProductFromPayload(payload.product)
    } catch (caughtError) {
      if (fallbackProduct) {
        importProductFromPayload(fallbackProduct)
        return
      }

      setError(caughtError instanceof Error ? caughtError.message : copy.errors.loadFailed)
    } finally {
      setActiveResultUrl('')
      setIsLoading(false)
    }
  }

  async function handleUsedSearch() {
    const searchQuery = query.trim()

    if (!searchQuery) {
      setError(keywordSearchCopy.emptyInput)
      return
    }

    setIsLoading(true)
    setError('')
    setSearchResults([])

    try {
      const marketplaces = usedPlatformFilter === 'ALL' ? [...usedSearchMarkets] : [usedPlatformFilter]
      const payload = await requestCatalogTool<{ results: ScrapedProductPayload[] }>('/api/search-used-products', { query: searchQuery, marketplaces })

      if (payload.results.length === 0) {
        throw new Error(activeKeywordModeCopy.noResults(searchQuery))
      }

      setSearchResults(payload.results)
      setSearchResultQuery(searchQuery)
      setSearchResultMode('used')
      setSearchResultUsedPlatformFilter(usedPlatformFilter)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : activeKeywordModeCopy.searchFailed)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBookSearch() {
    const searchQuery = query.trim()

    if (!searchQuery) {
      setError(keywordSearchCopy.emptyInput)
      return
    }

    setIsLoading(true)
    setError('')
    setSearchResults([])

    try {
      const payload = await requestCatalogTool<{ results: ScrapedProductPayload[] }>('/api/search-books', { query: searchQuery })

      if (payload.results.length === 0) {
        throw new Error(keywordSearchCopy.book.noResults(searchQuery))
      }

      setSearchResults(payload.results)
      setSearchResultQuery(searchQuery)
      setSearchResultMode('book')
      setSearchResultUsedPlatformFilter('ALL')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : keywordSearchCopy.book.searchFailed)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleImportProduct() {
    const trimmedQuery = query.trim()
    const shouldImportFromUrl = shouldUseUrlEntry || isLikelyUrlInput(trimmedQuery)

    if (!trimmedQuery) {
      setError(shouldImportFromUrl ? copy.errors.emptyUrl : keywordSearchCopy.emptyInput)
      return
    }

    if (!shouldImportFromUrl) {
      await (searchMode === 'used' ? handleUsedSearch() : handleBookSearch())
      return
    }

    const targetUrl = normalizeUrlInput(trimmedQuery)

    if (!targetUrl) {
      setError(copy.errors.emptyUrl)
      return
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      setError(copy.errors.invalidUrl)
      return
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      setError(copy.errors.invalidUrl)
      return
    }

    setSearchResults([])
    setSearchResultQuery('')
    await importProductFromUrl(targetUrl)
  }

  return (
    <>
      <EditorialHeader
        className="editorial-header--home"
        utilityNote={locale === 'ko' ? 'LINK IMPORT STUDIO' : 'LINK IMPORT STUDIO'}
        navLabel={locale === 'ko' ? '쇼핑 카테고리' : 'Shopping categories'}
        navItems={[
          {
            href: '/',
            label: locale === 'ko' ? 'SHOP' : 'SHOP',
            onClick: (event) => {
              event.preventDefault()
              onGoToStore()
            },
          },
          { href: '#process', label: copy.nav.process },
          { href: '#services', label: copy.nav.services },
          { href: '#support', label: copy.nav.support },
        ]}
        actions={
          <>
            <button type="button" className="button button--ghost" onClick={onGoToLogin}>
              {copy.auth.login}
            </button>
            <button type="button" className="button button--primary" onClick={onGoToSignup}>
              {copy.auth.signup}
            </button>
          </>
        }
      />

      <main className="home-main">
        <section className="hero hero--home">
          <motion.div className="hero-scene hero-scene--halo" style={{ y: sceneHaloY, scale: sceneHaloScale }} />
          <motion.div className="hero-scene hero-scene--beam" style={{ y: sceneBeamY, opacity: sceneBeamOpacity }} />
          <motion.div className="hero-scene hero-scene--glass" style={{ y: sceneGlassY, rotate: sceneGlassRotate }} />

          <div className="container hero-grid hero-grid--single">
            <div className="hero-copy hero-copy--wide hero-copy--home-apple">
              <motion.div className="hero-copy__topline hero-copy__topline--centered" style={{ y: heroBadgeY }}>
                {copy.hero.badges.map((badge, index) => (
                  <span key={badge} className={`hero-copy__badge${index === 1 ? ' hero-copy__badge--soft' : ''}`}>
                    {badge}
                  </span>
                ))}
              </motion.div>

              <motion.div className="hero-copy__headline hero-copy__headline--centered" style={{ y: heroHeadlineY, opacity: heroHeadlineOpacity }}>
                <span className="eyebrow">{copy.hero.eyebrow}</span>
                <h1>
                  {copy.hero.title[0]} <span>{copy.hero.title[1]}</span>
                </h1>
                <p style={{ fontSize: '1.12rem' }}>{copy.hero.description}</p>
              </motion.div>

              <motion.div
                className="hero-command"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <label className="hero-command__label" htmlFor="product-url">
                  {keywordSearchCopy.commandLabel}
                </label>

                {!isUrlMode ? (
                  <div className="hero-command__modes" role="tablist" aria-label={keywordSearchCopy.modeLabel}>
                    {(['used', 'book'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={searchMode === mode}
                        className={`hero-command__mode${searchMode === mode ? ' is-active' : ''}`}
                        onClick={() => handleSearchModeChange(mode)}
                      >
                        <strong>{keywordSearchCopy.modes[mode].label}</strong>
                        <span>{keywordSearchCopy.modes[mode].hint}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchMode === 'used' ? (
                  <motion.div
                    className="hero-platform-strip"
                    role="tablist"
                    aria-label={locale === 'ko' ? '중고 플랫폼 선택' : 'Choose a used market'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {usedPlatformOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={activeUsedPlatformOptionValue === option.value}
                        className={`hero-platform-strip__tab${activeUsedPlatformOptionValue === option.value ? ' is-active' : ''}`}
                        onClick={() => handleUsedPlatformChange(option.value)}
                      >
                        <strong>{option.label}</strong>
                        <span>{option.hint}</span>
                      </button>
                    ))}
                  </motion.div>
                ) : null}

                <motion.div
                    className={`hero-search hero-search--prominent${isInputFocused ? ' is-focused' : ''}${query ? ' has-value' : ''}`}
                  animate={{ y: isInputFocused ? -2 : 0, scale: isInputFocused ? 1.01 : 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.7 }}
                >
                  <div className="hero-search__field">
                    <span className="hero-search__prefix" aria-hidden="true">
                      {shouldUseUrlEntry ? keywordSearchCopy.url.badge : activeKeywordModeCopy.badge}
                    </span>
                    <input
                      id="product-url"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value)
                        if (error) {
                          setError('')
                        }
                      }}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleImportProduct()
                        }
                      }}
                      placeholder={shouldUseUrlEntry ? keywordSearchCopy.url.placeholder : activeKeywordModeCopy.placeholder}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                  <button type="button" className="button button--primary" onClick={() => void handleImportProduct()} disabled={isLoading}>
                    {isLoading ? copy.hero.loading : shouldUseUrlEntry ? keywordSearchCopy.url.action : activeKeywordModeCopy.action}
                  </button>
                </motion.div>

                {error && <p className="hero-feedback hero-feedback--error">{error}</p>}

                {searchResults.length > 0 ? (
                  <div className="hero-book-results">
                    <div className="hero-book-results__header">
                      <div>
                        <span className="eyebrow eyebrow--small">{searchResultEyebrow}</span>
                        <strong className="hero-book-results__title">{searchResultTitle}</strong>
                      </div>
                      <p className="hero-book-results__summary">{activeSearchResultCopy.resultsDescription}</p>
                    </div>

                    <div className="hero-book-results__groups">
                      {searchGroups.map((group) => (
                        <section
                          key={group.marketplace}
                          className={`book-market-group book-market-group--${toSearchMarketClassName(group.marketplace)}`}
                        >
                          <div className="book-market-group__head">
                            <strong>{marketDisplayLabels[group.marketplace] ?? group.marketplace}</strong>
                            <span>
                              {group.items.length > 0 ? activeSearchResultCopy.summary(group.items.length) : activeSearchResultCopy.emptyMarket}
                            </span>
                          </div>

                          <div className="book-market-group__list">
                            {group.items.map((result) => (
                              <article key={result.sourceUrl} className="book-result-card">
                                <div className="book-result-card__thumb">
                                  <ProductImage
                                    imageUrl={result.imageUrl ?? undefined}
                                    alt={result.productName}
                                    fallbackLabel={group.marketplace}
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </div>

                                <div className="book-result-card__body">
                                  <span className="book-result-card__market">{marketDisplayLabels[result.marketplace] ?? result.marketplace}</span>
                                  <h3>{result.productName}</h3>
                                  <p>{result.description || result.sourceHost}</p>
                                  <div className="book-result-card__price-row">
                                    <strong>{new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US').format(result.price)} KRW</strong>
                                    {result.originalPrice && result.originalPrice > result.price ? (
                                      <span>{new Intl.NumberFormat(locale === 'ko' ? 'ko-KR' : 'en-US').format(result.originalPrice)} KRW</span>
                                    ) : null}
                                  </div>
                                  <div className="book-result-card__actions">
                                    <button
                                      type="button"
                                      className="button button--primary"
                                      disabled={isLoading}
                                      onClick={() => {
                                        if (searchResultMode === 'used') {
                                          importProductFromPayload(result)
                                          return
                                        }

                                        setActiveResultUrl(result.sourceUrl)
                                        void importProductFromUrl(result.sourceUrl, result)
                                      }}
                                    >
                                      {isLoading && activeResultUrl === result.sourceUrl ? copy.hero.loading : activeSearchResultCopy.resultAction}
                                    </button>
                                    <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="book-result-card__link">
                                      {activeSearchResultCopy.resultSource}
                                    </a>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="hero-tip-row">
                  {copy.hero.tips.map((tip) => (
                    <span key={tip} className="hero-tip">
                      {tip}
                    </span>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="hero-cinema"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="hero-cinema__main">
                  <span className="hero-cinema__eyebrow">{appleHomeCopy.heroStage.eyebrow}</span>
                  <strong>{appleHomeCopy.heroStage.title}</strong>
                  <p>{appleHomeCopy.heroStage.body}</p>
                </div>

                <div className="hero-cinema__cards">
                  {heroStageCards.map((card, index) => (
                    <article key={card.title} className={`hero-cinema-card hero-cinema-card--${index + 1}`}>
                      <span>{card.badge}</span>
                      <strong>{card.title}</strong>
                      <p>{card.body}</p>
                    </article>
                  ))}
                </div>
              </motion.div>

              <motion.div className="hero-stats" style={{ y: heroStatsY }}>
                {copy.hero.stats.map((stat) => (
                  <motion.article
                    key={stat.label}
                    className="stat-card"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.45 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </motion.article>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        <section id="process" className="section section--home-process">
          <div className="container">
            <div className="section-head section-head--compact section-head--centered">
              <div>
                <span className="eyebrow">{copy.process.eyebrow}</span>
                <h2>{copy.process.title}</h2>
              </div>
              <p>{copy.process.description}</p>
            </div>

            <div className="process-stack">
              {copy.process.steps.map((step, index) => {
                const Icon = processIcons[index] ?? processIcons[0]

                return (
                  <motion.article
                    key={step.step}
                    className="process-card"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.48, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="process-card__topline">
                      <span className="process-card__step">STEP {step.step}</span>
                      <span className="process-card__icon" aria-hidden="true">
                        <Icon size={28} strokeWidth={2.1} />
                      </span>
                    </div>

                    <div className="process-card__number-wrap" aria-hidden="true">
                      <div className="process-card__number">{index + 1}</div>
                    </div>

                    <div className="process-card__body">
                      <strong>{step.title}</strong>
                      <p>{step.body}</p>
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="services" className="section section--home-services">
          <div className="container">
            <div className="section-head section-head--compact section-head--centered">
              <div>
                <span className="eyebrow">{copy.services.eyebrow}</span>
                <h2>{copy.services.title}</h2>
              </div>
              <p>{copy.services.description}</p>
            </div>

            <div className="service-grid">
              {copy.services.cards.map((card, index) => (
                <motion.article
                  key={card.title}
                  className="service-card"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.42, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="service-card__emoji" aria-hidden="true">
                    {card.emoji}
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="support" className="section section--home-support">
          <div className="container">
            <div className="section-head section-head--compact section-head--centered">
              <div>
                <span className="eyebrow">{appleHomeCopy.supportSpotlight.eyebrow}</span>
                <h2>{appleHomeCopy.supportSpotlight.title}</h2>
              </div>
              <p>{appleHomeCopy.supportSpotlight.body}</p>
            </div>

            <div className="notice-grid">
              {copy.support.cards.map((card) => (
                <article key={card.title} className="notice-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="footer" className="site-footer site-footer--home">
        <div className="container footer-grid">
          <div>
            <h2>{SITE_BRAND}</h2>
            <p>{copy.footer.description}</p>
          </div>
          <div>
            <h3>{copy.footer.links}</h3>
            <a href="#process">{copy.nav.process}</a>
            <a href="#services">{copy.nav.services}</a>
            <a href="#support">{copy.nav.support}</a>
          </div>
          <div>
            <h3>{copy.footer.account}</h3>
            <button type="button" className="footer-link-button" onClick={onGoToLogin}>
              {copy.auth.login}
            </button>
            <button type="button" className="footer-link-button" onClick={onGoToSignup}>
              {copy.auth.signup}
            </button>
          </div>
        </div>
      </footer>
    </>
  )
}

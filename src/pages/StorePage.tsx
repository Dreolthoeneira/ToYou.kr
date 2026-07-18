import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clock3,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import type { CatalogProduct } from '../catalog'
import type { AdminPost, StoreSettings } from '../adminData'
import type { AuthSession } from '../authSession'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import { useI18n } from '../i18n'
import { SITE_BRAND } from '../siteBrand'

interface StorePageProps {
  products: CatalogProduct[]
  posts: AdminPost[]
  settings: StoreSettings
  authSession: AuthSession | null
  cartCount: number
  onOpenProduct: (productId: string) => void
  onGoToLogin: () => void
  onGoToSignup: () => void
  onLogout: () => void
  onGoToProfile: () => void
  onOpenPosts: () => void
  onOpenPost: (postId: string) => void
  onGoToAdmin: () => void
  onOpenCollection: (season: 'spring' | 'summer' | 'winter') => void
  onCheckout: (productId: string, quantity: number, option: string) => void
}

const storeCopy = {
  ko: {
    announcements: ['첫 구매 10% 할인 · 신규 회원 전용', '매주 수요일 새로운 상품 업데이트', '7만원 이상 구매 시 무료배송'],
    searchPlaceholder: '상품명이나 카테고리를 검색하세요',
    popular: '인기 검색어',
    keywords: ['신상품', '베스트', '테크', '리빙'],
    account: { login: '로그인', signup: '회원가입', bag: '장바구니', points: '+2,000 Points' },
    nav: { new: 'NEW 10%', best: 'BEST', all: 'ALL', community: 'COMMUNITY' },
    hero: {
      eyebrow: 'TO YOU · NEW EDIT',
      title: '매일의 장면을 바꾸는\n새로운 선택',
      body: '형태와 색, 쓰임이 분명한 이번 주 투유의 추천 상품',
      action: '컬렉션 보기',
    },
    beginning: {
      eyebrow: 'OUR BEGINNING',
      title: '화려함보다 편안함, 오래도록 함께할 물건',
      body: '매일 자연스럽게 손이 가고, 시간이 지나도 질리지 않는 상품을 투유가 직접 고릅니다.',
    },
    editorial: [
      ['공간을 바꾸는 작은 물건', '색과 형태가 만드는 새로운 분위기'],
      ['매일 쓰기 좋은 디자인', '보기 좋은 것과 편안한 사용감 사이'],
    ],
    weekly: { eyebrow: 'WEEKLY BEST', title: '이번 주 실시간 추천상품', all: '전체보기' },
    product: { new: 'NEW', today: '오늘출발', detail: '상세보기', buy: '바로구매', soldout: '품절' },
    guide: [
      ['빠른 출고', '영업일 기준 1–3일 내 출고'],
      ['안전한 결제', '주문과 결제 정보 암호화'],
      ['간편한 교환', '수령 후 7일 이내 신청'],
    ],
    footer: { description: '투유가 직접 고르고 관리하는 공식 온라인 스토어.', shop: 'SHOP', support: 'SUPPORT', account: 'ACCOUNT', admin: '상품 관리' },
  },
  en: {
    announcements: ['10% off your first order', 'New products every Wednesday', 'Free shipping over ₩70,000'],
    searchPlaceholder: 'Search products or categories',
    popular: 'Popular searches',
    keywords: ['New', 'Best', 'Tech', 'Living'],
    account: { login: 'Login', signup: 'Sign up', bag: 'Bag', points: '+2,000 Points' },
    nav: { new: 'NEW 10%', best: 'BEST', all: 'ALL', community: 'COMMUNITY' },
    hero: {
      eyebrow: 'TO YOU · NEW EDIT',
      title: 'New choices for\neveryday scenes',
      body: 'This week’s To You selection, chosen for clear form, color, and purpose.',
      action: 'View collection',
    },
    beginning: {
      eyebrow: 'OUR BEGINNING',
      title: 'Comfort over spectacle, objects made to stay',
      body: 'We select products you will reach for naturally and enjoy long after the trend passes.',
    },
    editorial: [
      ['Small objects, different spaces', 'A new mood shaped by color and form'],
      ['Design made for every day', 'Where appearance meets effortless use'],
    ],
    weekly: { eyebrow: 'WEEKLY BEST', title: 'This week’s live recommendations', all: 'View all' },
    product: { new: 'NEW', today: 'Ships today', detail: 'View', buy: 'Buy now', soldout: 'Sold out' },
    guide: [
      ['Fast dispatch', 'Ships within 1–3 business days'],
      ['Secure checkout', 'Encrypted order and payment data'],
      ['Easy returns', 'Request within 7 days'],
    ],
    footer: { description: 'The official store selected and managed directly by To You.', shop: 'SHOP', support: 'SUPPORT', account: 'ACCOUNT', admin: 'Manage products' },
  },
} as const

const seasonalCollections = {
  ko: [
    {
      slug: 'spring',
      season: '2026 SPRING',
      eyebrow: 'TO YOU · SPRING EDIT 01',
      title: '가볍게 시작하는\n봄의 장면',
      body: '부드러운 색과 선명한 형태로 고른 새로운 계절의 두 가지 물건',
      action: 'SPRING 컬렉션 보기',
      description: '새로운 하루에 자연스럽게 스며드는 가벼운 색과 형태를 모았습니다.',
    },
    {
      slug: 'summer',
      season: '2026 SUMMER',
      eyebrow: 'TO YOU · SUMMER EDIT 02',
      title: '선명하고 가벼운\n여름의 선택',
      body: '더운 계절에도 편안하게 곁에 둘 수 있는 산뜻한 데일리 오브제',
      action: 'SUMMER 컬렉션 보기',
      description: '맑은 컬러와 가벼운 사용감으로 여름의 리듬을 정돈합니다.',
    },
    {
      slug: 'winter',
      season: '2026 WINTER',
      eyebrow: 'TO YOU · WINTER EDIT 03',
      title: '천천히 머무는\n겨울의 온도',
      body: '차분한 질감과 깊은 색으로 완성한 오래 곁에 둘 겨울의 물건',
      action: 'WINTER 컬렉션 보기',
      description: '손에 닿는 따뜻한 질감과 고요한 색을 중심으로 골랐습니다.',
    },
  ],
  en: [
    {
      slug: 'spring',
      season: '2026 SPRING', eyebrow: 'TO YOU · SPRING EDIT 01', title: 'A lighter start\nfor spring',
      body: 'Two seasonal objects selected for their soft color and clear form.', action: 'VIEW SPRING COLLECTION',
      description: 'Light colors and forms that settle naturally into a new day.',
    },
    {
      slug: 'summer',
      season: '2026 SUMMER', eyebrow: 'TO YOU · SUMMER EDIT 02', title: 'Clear and light\nfor summer',
      body: 'Fresh everyday objects made to stay comfortable through warmer days.', action: 'VIEW SUMMER COLLECTION',
      description: 'Clear colors and an easy feel for the rhythm of summer.',
    },
    {
      slug: 'winter',
      season: '2026 WINTER', eyebrow: 'TO YOU · WINTER EDIT 03', title: 'A slower kind\nof winter',
      body: 'Quiet textures and deeper colors selected to stay with you.', action: 'VIEW WINTER COLLECTION',
      description: 'Warm textures and calm colors for time spent indoors.',
    },
  ],
} as const

function BestProductCard({
  product,
  index,
  labels,
  onOpen,
  onBuy,
}: {
  product: CatalogProduct
  index: number
  labels: { new: string; today: string; detail: string; buy: string; soldout: string }
  onOpen: () => void
  onBuy: () => void
}) {
  const discount = product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0
  const soldOut = product.status !== 'active' || product.stock < 1

  return (
    <article className="blanca-product-card">
      <button type="button" className="blanca-product-card__media" onClick={onOpen} aria-label={`${product.name} 상세 보기`}>
        <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
        <span className="blanca-product-card__rank">{String(index + 1).padStart(2, '0')}</span>
        <div className="blanca-product-card__badges">
          {index < 3 ? <span>{labels.new}</span> : null}
          {product.stock > 0 ? <span>{labels.today}</span> : null}
        </div>
        <div className="blanca-product-card__quick">
          <span><Heart size={16} /></span>
          <span><ShoppingBag size={16} /></span>
        </div>
      </button>
      <div className="blanca-product-card__body">
        <div className="blanca-product-card__meta"><span>{product.category}</span><div>{product.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}<i style={{ backgroundColor: product.accent }} /></div></div>
        <button type="button" className="blanca-product-card__name" onClick={onOpen}>{product.name}</button>
        <p>{product.summary}</p>
        <div className="blanca-product-card__price">
          <strong>{currencyFormatter.format(product.price)}</strong>
          {discount > 0 ? <><del>{currencyFormatter.format(product.compareAtPrice)}</del><em>{discount}%</em></> : null}
        </div>
        <div className="blanca-product-card__actions">
          <button type="button" onClick={onOpen}>{labels.detail}</button>
          <button type="button" disabled={soldOut} onClick={onBuy}>{soldOut ? labels.soldout : labels.buy} {!soldOut ? <ArrowRight size={14} /> : null}</button>
        </div>
      </div>
    </article>
  )
}

export function StorePage({ products, posts, settings, authSession, cartCount, onOpenProduct, onGoToLogin, onGoToSignup, onLogout, onGoToProfile, onOpenPosts, onOpenPost, onGoToAdmin, onOpenCollection, onCheckout }: StorePageProps) {
  const { locale } = useI18n()
  const text = locale === 'ko' ? storeCopy.ko : storeCopy.en
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [heroIndex, setHeroIndex] = useState(0)
  const activeProducts = products.filter((product) => product.status === 'active' && product.stock > 0)
  const categories = Array.from(new Set(activeProducts.map((product) => product.category))).slice(0, 6)
  const heroSlides = activeProducts.length > 1
    ? Array.from({ length: Math.min(3, Math.ceil(activeProducts.length / 2)) }, (_, index) => [activeProducts[index * 2], activeProducts[(index * 2 + 1) % activeProducts.length]].filter(Boolean) as CatalogProduct[])
    : [activeProducts]
  const heroProducts = heroSlides[heroIndex] ?? heroSlides[0] ?? []
  const collectionText = locale === 'ko' ? seasonalCollections.ko : seasonalCollections.en
  const activeCollection = collectionText[heroIndex % collectionText.length]
  const editorialProducts = activeProducts.slice(2, 4).length === 2 ? activeProducts.slice(2, 4) : activeProducts.slice(0, 2)

  useEffect(() => {
    if (heroSlides.length < 2) return

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length)
    }, 5800)

    return () => window.clearInterval(timer)
  }, [heroSlides.length])

  const visibleProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    return activeProducts.filter((product) => {
      const categoryMatch = activeCategory === 'ALL' || product.category === activeCategory
      const queryMatch = !normalizedQuery || `${product.name} ${product.category} ${product.summary}`.toLowerCase().includes(normalizedQuery)
      return categoryMatch && queryMatch
    })
  }, [activeCategory, activeProducts, searchQuery])

  function chooseCategory(category: string) {
    setActiveCategory(category)
    setMenuOpen(false)
    window.setTimeout(() => document.getElementById('weekly-best')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  function nextHero() {
    setHeroIndex((current) => (current + 1) % Math.max(1, heroSlides.length))
  }

  function previousHero() {
    setHeroIndex((current) => (current - 1 + Math.max(1, heroSlides.length)) % Math.max(1, heroSlides.length))
  }

  function openCurrentCollection() {
    onOpenCollection(activeCollection.slug)
  }

  if (settings.maintenanceMode) {
    return (
      <main className="store-maintenance">
        <span>{settings.storeName || SITE_BRAND}</span>
        <h1>더 나은 스토어를 준비하고 있습니다.</h1>
        <p>잠시 운영을 멈추고 상품과 서비스를 정돈하고 있어요.<br />조금 뒤 다시 방문해 주세요.</p>
        <small>{settings.supportEmail} · {settings.supportPhone}</small>
        <button type="button" onClick={onGoToAdmin}>관리 화면으로</button>
      </main>
    )
  }

  const featuredPosts = [...posts]
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 3)
  const announcements = [settings.announcement, ...text.announcements].filter(Boolean)

  return (
    <div className="blanca-store">
      <div className="blanca-announcement" aria-label="Store announcements">
        <div>{[...announcements, ...announcements].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
      </div>

      <header className="blanca-header">
        <div className="blanca-header__masthead">
          <div className="blanca-header__tools">
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className="blanca-header__menu" aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
            <button type="button" onClick={() => setSearchOpen((value) => !value)}><Search size={17} /><span>{text.searchPlaceholder}</span></button>
          </div>
          <button type="button" className="blanca-header__logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{(settings.storeName || SITE_BRAND).toUpperCase()}</button>
          <div className="blanca-header__account">
            {authSession ? (
              <>
                <button type="button" className="blanca-header__member" onClick={onGoToProfile} aria-label={`${authSession.displayName} 회원정보 수정`}><UserRound size={16} /><span>{authSession.displayName}{locale === 'ko' ? '님' : ''}</span><i aria-hidden="true" /></button>
                <button type="button" onClick={onLogout}>{locale === 'ko' ? '로그아웃' : 'Sign out'}</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onGoToLogin}><UserRound size={16} /><span>{text.account.login}</span></button>
                <button type="button" onClick={onGoToSignup}>{text.account.signup}<em>{text.account.points}</em></button>
              </>
            )}
            <button type="button" aria-label={text.account.bag}><ShoppingBag size={17} /><b>{cartCount}</b></button>
          </div>
        </div>

        {searchOpen ? (
          <div className="blanca-search-panel">
            <div><Search size={18} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={text.searchPlaceholder} /><button type="button" onClick={() => { setSearchOpen(false); setSearchQuery('') }}><X size={18} /></button></div>
            <span>{text.popular}</span>
            <nav>{text.keywords.map((keyword) => <button key={keyword} type="button" onClick={() => { setSearchQuery(keyword); setSearchOpen(false); window.setTimeout(() => document.getElementById('weekly-best')?.scrollIntoView({ behavior: 'smooth' }), 0) }}>{keyword}</button>)}</nav>
          </div>
        ) : null}

        <nav className="blanca-category-nav" aria-label={locale === 'ko' ? '상품 카테고리' : 'Product categories'}>
          <button type="button" className={activeCategory === 'ALL' ? 'is-active' : ''} onClick={() => chooseCategory('ALL')}>{text.nav.new}<i /></button>
          <button type="button" onClick={() => chooseCategory('ALL')}>{text.nav.best}</button>
          {categories.map((category) => <button key={category} type="button" className={activeCategory === category ? 'is-active' : ''} onClick={() => chooseCategory(category)}>{category}</button>)}
          <button type="button" onClick={onOpenPosts}>{text.nav.community}<ChevronDown size={13} /></button>
        </nav>

        <aside className={menuOpen ? 'blanca-mobile-drawer is-open' : 'blanca-mobile-drawer'}>
          <div className="blanca-mobile-drawer__account">{authSession ? <><button type="button" onClick={onGoToProfile}>{authSession.displayName}{locale === 'ko' ? '님' : ''}<span>{locale === 'ko' ? '회원정보 수정' : 'Edit profile'}</span></button><button type="button" onClick={onLogout}>{locale === 'ko' ? '로그아웃' : 'Sign out'}</button></> : <><button type="button" onClick={onGoToLogin}>{text.account.login}</button><button type="button" onClick={onGoToSignup}>{text.account.signup} <span>{text.account.points}</span></button></>}</div>
          <div className="blanca-mobile-drawer__categories"><button type="button" onClick={() => chooseCategory('ALL')}>{text.nav.all}</button>{categories.map((category) => <button key={category} type="button" onClick={() => chooseCategory(category)}>{category}</button>)}<button type="button" onClick={onOpenPosts}>{text.nav.community}</button></div>
        </aside>
      </header>

      <main>
        {heroProducts.length > 0 ? (
          <section className="blanca-hero">
            <div className="blanca-hero__grid">
              {heroProducts.map((product, index) => (
                <div key={`${heroIndex}-${product.id}`} className="blanca-hero__item">
                  <button type="button" className="blanca-hero__media" onClick={() => onOpenProduct(product.id)} aria-label={`${product.name} 상세 보기`}>
                    <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} imageLoading="eager" />
                  </button>
                  {index === 0 ? <span className="blanca-hero__copy"><small>{activeCollection.eyebrow}</small><strong>{activeCollection.title.split('\n').map((line) => <i key={line}>{line}</i>)}</strong><em>{activeCollection.body}</em><button type="button" onClick={openCurrentCollection}>{activeCollection.action} <ArrowRight size={15} /></button></span> : <span className="blanca-hero__product-name"><small>{activeCollection.season}</small><strong>{product.name}</strong></span>}
                </div>
              ))}
            </div>
            {heroSlides.length > 1 ? (
              <div className="blanca-hero__controls">
                <button type="button" onClick={previousHero} aria-label="Previous slide"><ArrowLeft size={18} /></button>
                <span>{heroSlides.map((_, index) => <button key={index} type="button" className={index === heroIndex ? 'is-active' : ''} onClick={() => setHeroIndex(index)} aria-label={`Go to slide ${index + 1}`} />)}</span>
                <button type="button" onClick={nextHero} aria-label="Next slide"><ArrowRight size={18} /></button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="blanca-store-empty"><h1>{locale === 'ko' ? '판매 중인 상품을 준비하고 있습니다.' : 'Products are being prepared.'}</h1><button type="button" onClick={onGoToAdmin}>{text.footer.admin}</button></section>
        )}

        <section className="blanca-beginning">
          <span>{text.beginning.eyebrow}</span>
          <h2>{text.beginning.title}</h2>
          <p>{text.beginning.body}</p>
        </section>

        {editorialProducts.length > 0 ? (
          <section className="blanca-editorial">
            {editorialProducts.map((product, index) => (
              <button key={product.id} type="button" onClick={() => onOpenProduct(product.id)}>
                <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
                <span><strong>{text.editorial[index][0]}</strong><small>{text.editorial[index][1]}</small></span>
              </button>
            ))}
          </section>
        ) : null}

        <section id="weekly-best" className="blanca-weekly">
          <div className="blanca-weekly__heading"><span>{text.weekly.eyebrow}</span><h2>{text.weekly.title}</h2><button type="button" onClick={() => { setActiveCategory('ALL'); setSearchQuery('') }}>{text.weekly.all} <ArrowRight size={14} /></button></div>
          <div className="blanca-weekly__filters"><button type="button" className={activeCategory === 'ALL' ? 'is-active' : ''} onClick={() => setActiveCategory('ALL')}>{text.nav.all}</button>{categories.map((category) => <button key={category} type="button" className={activeCategory === category ? 'is-active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div>
          {visibleProducts.length > 0 ? (
            <div className="blanca-product-grid">{visibleProducts.map((product, index) => <BestProductCard key={product.id} product={product} index={index} labels={text.product} onOpen={() => onOpenProduct(product.id)} onBuy={() => onCheckout(product.id, 1, product.options[0] ?? '')} />)}</div>
          ) : <div className="blanca-search-empty">{locale === 'ko' ? '조건에 맞는 상품이 없습니다.' : 'No products match your search.'}</div>}
        </section>

        <section className="blanca-service-strip">
          {[Clock3, ShieldCheck, Truck].map((Icon, index) => <article key={text.guide[index][0]}><Icon size={21} /><div><strong>{text.guide[index][0]}</strong><span>{text.guide[index][1]}</span></div></article>)}
        </section>

        {featuredPosts.length ? (
          <section className="blanca-journal">
            <div className="blanca-journal__heading"><span>JOURNAL &amp; NOTICE</span><h2>스토어의 새로운 이야기</h2><p>새로운 소식과 오래 두고 읽을 이야기를 전합니다.</p></div>
            <div className="blanca-journal__grid">
              {featuredPosts.map((post) => (
                <article key={post.id}>
                  <button type="button" className="blanca-journal__post" onClick={() => onOpenPost(post.id)}>
                  <div className="blanca-journal__cover">{post.coverImage ? <img src={post.coverImage} alt="" /> : <span>{post.category === 'notice' ? 'NOTICE' : post.category === 'event' ? 'EVENT' : 'JOURNAL'}</span>}</div>
                  <small>{post.category === 'notice' ? '공지' : post.category === 'event' ? '이벤트' : '저널'} · {new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(post.updatedAt))}</small>
                  <h3>{post.title}</h3><p>{post.excerpt}</p>
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="blanca-footer">
        <div className="blanca-footer__brand"><h2>{(settings.storeName || SITE_BRAND).toUpperCase()}</h2><p>{settings.footerDescription || text.footer.description}</p></div>
        <div><h3>{text.footer.shop}</h3><button type="button" onClick={() => chooseCategory('ALL')}>{text.nav.new}</button><button type="button" onClick={() => chooseCategory('ALL')}>{text.nav.best}</button></div>
        <div><h3>{text.footer.support}</h3><a href="#weekly-best">{settings.shippingNotice}</a><a href={`tel:${settings.supportPhone}`}>{settings.supportPhone}</a><a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></div>
        <div><h3>{text.footer.account}</h3><button type="button" onClick={onGoToLogin}>{text.account.login}</button><button type="button" onClick={onGoToSignup}>{text.account.signup}</button><button type="button" onClick={onGoToAdmin}>{text.footer.admin}</button></div>
      </footer>
    </div>
  )
}

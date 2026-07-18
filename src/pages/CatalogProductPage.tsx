import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Heart,
  Info,
  MessageCircle,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  ThumbsUp,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import type { CatalogProduct } from '../catalog'
import type { AdminReview } from '../adminData'
import type { AuthSession } from '../authSession'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import { SITE_BRAND } from '../siteBrand'
import type { CartInput } from '../storeApi'

interface CatalogProductPageProps {
  product?: CatalogProduct
  products: CatalogProduct[]
  reviews: AdminReview[]
  authSession: AuthSession | null
  cartCount: number
  wishlistProductIds: string[]
  restockProductIds: string[]
  onGoHome: () => void
  onGoToLogin: () => void
  onGoToSignup: () => void
  onLogout: () => void
  onGoToProfile: () => void
  onOpenCart: () => void
  onOpenPosts: () => void
  onOpenProduct: (productId: string) => void
  onCheckout: (productId: string, quantity: number, option: string) => void
  onAddToCart: (items: CartInput[]) => Promise<void>
  onToggleWishlist: (productId: string, liked: boolean) => Promise<void>
  onRequestRestock: (productId: string) => Promise<void>
}

const galleryViews = [
  { label: '대표 이미지', tone: 'main' },
  { label: '디테일', tone: 'detail' },
  { label: '소재와 마감', tone: 'texture' },
  { label: '스타일 뷰', tone: 'styled' },
]

type DetailSection = 'product-info' | 'option-guide' | 'product-reviews' | 'product-qna'
type ReviewFilter = 'all' | 'photo' | 'recent'

export function CatalogProductPage({
  product,
  products,
  reviews,
  authSession,
  cartCount,
  wishlistProductIds,
  restockProductIds,
  onGoHome,
  onGoToLogin,
  onGoToSignup,
  onLogout,
  onGoToProfile,
  onOpenCart,
  onOpenPosts,
  onOpenProduct,
  onCheckout,
  onAddToCart,
  onToggleWishlist,
  onRequestRestock,
}: CatalogProductPageProps) {
  const [selectedOption, setSelectedOption] = useState(product?.options[0] ?? '')
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const [liked, setLiked] = useState(() => product ? wishlistProductIds.includes(product.id) : false)
  const [restockRequested, setRestockRequested] = useState(() => product ? restockProductIds.includes(product.id) : false)
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([])
  const [bundleAdded, setBundleAdded] = useState(false)
  const [activeSection, setActiveSection] = useState<DetailSection>('product-info')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false)
  const [headerSearchQuery, setHeaderSearchQuery] = useState('')
  const [actionPending, setActionPending] = useState(false)

  useEffect(() => {
    if (!product) return
    setLiked(wishlistProductIds.includes(product.id))
    setRestockRequested(restockProductIds.includes(product.id))
  }, [product, restockProductIds, wishlistProductIds])

  const relatedProducts = useMemo(
    () => products.filter((item) => item.id !== product?.id && item.status === 'active').slice(0, 4),
    [product?.id, products],
  )
  const headerCategories = useMemo(
    () => Array.from(new Set(products.filter((item) => item.status === 'active' && item.stock > 0).map((item) => item.category))).slice(0, 6),
    [products],
  )
  const headerAnnouncements = [
    '첫 구매 10% 할인 · 신규 회원 전용',
    '매주 수요일 새로운 상품 업데이트',
    '7만원 이상 구매 시 무료배송',
  ]

  if (!product) {
    return (
      <div className="catalog-detail-empty">
        <span className="eyebrow">PRODUCT NOT FOUND</span>
        <h1>상품을 찾을 수 없습니다.</h1>
        <button type="button" className="button button--primary" onClick={onGoHome}>스토어로 돌아가기</button>
      </div>
    )
  }

  const options = product.options.length > 0 ? product.options : ['기본 옵션']
  const activeOption = selectedOption || options[0]
  const isSoldOut = product.status !== 'active' || product.stock < 1
  const discount = product.compareAtPrice > product.price
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0
  const productReviews = reviews.filter((review) => review.productId === product.id && review.status === 'visible')
  const reviewCount = productReviews.length
  const reviewAverage = reviewCount
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
    : 0
  const reviewSatisfaction = reviewCount ? Math.round((reviewAverage / 5) * 100) : 0
  const bundleProducts = relatedProducts.slice(0, 3)
  const bundleTotal = product.price + bundleProducts
    .filter((item) => selectedBundleIds.includes(item.id))
    .reduce((total, item) => total + item.price, 0)
  const optionTip = product.category === '테크'
    ? '사용 중인 기종과 옵션명이 정확히 일치하는지 확인해 주세요.'
    : product.category === '패션' || product.category === '액세서리'
      ? '평소 선택하는 사이즈와 동일한 옵션을 추천합니다.'
      : '구성 용량과 세트 수량을 확인한 뒤 선택해 주세요.'
  const visibleReviews = reviewFilter === 'photo'
    ? []
    : reviewFilter === 'recent'
      ? [...productReviews].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      : productReviews

  async function addToBag() {
    if (isSoldOut) return
    if (!authSession) {
      onGoToLogin()
      return
    }
    setActionPending(true)
    try {
      await onAddToCart([{ productId: product!.id, option: activeOption, quantity }])
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1800)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '장바구니에 담지 못했습니다.')
    } finally {
      setActionPending(false)
    }
  }

  async function toggleLiked() {
    if (!authSession) {
      onGoToLogin()
      return
    }
    const nextLiked = !liked
    setActionPending(true)
    try {
      await onToggleWishlist(product!.id, nextLiked)
      setLiked(nextLiked)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '관심상품을 변경하지 못했습니다.')
    } finally {
      setActionPending(false)
    }
  }

  async function submitRestockRequest() {
    if (!authSession) {
      onGoToLogin()
      return
    }
    setActionPending(true)
    try {
      await onRequestRestock(product!.id)
      setRestockRequested(true)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '재입고 알림을 신청하지 못했습니다.')
    } finally {
      setActionPending(false)
    }
  }

  function scrollToSection(id: DetailSection) {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleBundle(productId: string) {
    setSelectedBundleIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  async function addBundleToBag() {
    if (selectedBundleIds.length === 0) return
    if (!authSession) {
      onGoToLogin()
      return
    }
    const bundleItems: CartInput[] = [
      { productId: product!.id, option: activeOption, quantity: 1 },
      ...bundleProducts.filter((item) => selectedBundleIds.includes(item.id)).map((item) => ({ productId: item.id, option: item.options[0] ?? '', quantity: 1 })),
    ]
    setActionPending(true)
    try {
      await onAddToCart(bundleItems)
      setBundleAdded(true)
      window.setTimeout(() => setBundleAdded(false), 1800)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '선택 상품을 장바구니에 담지 못했습니다.')
    } finally {
      setActionPending(false)
    }
  }

  return (
    <div className="catalog-detail-page nb-product-page">
      <div className="blanca-announcement" aria-label="스토어 혜택 안내">
        <div>{[...headerAnnouncements, ...headerAnnouncements].map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
      </div>

      <header className="blanca-header blanca-header--detail">
        <div className="blanca-header__masthead">
          <div className="blanca-header__tools">
            <button type="button" onClick={() => setHeaderMenuOpen((value) => !value)} className="blanca-header__menu" aria-label={headerMenuOpen ? '메뉴 닫기' : '메뉴 열기'}>{headerMenuOpen ? <X size={21} /> : <Menu size={21} />}</button>
            <button type="button" onClick={() => setHeaderSearchOpen((value) => !value)}><Search size={17} /><span>상품명이나 카테고리를 검색하세요</span></button>
          </div>
          <button type="button" className="blanca-header__logo" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
          <div className="blanca-header__account">
            {authSession ? (
              <>
                <button type="button" className="blanca-header__member" onClick={onGoToProfile} aria-label={`${authSession.displayName} 회원정보 수정`}><UserRound size={16} /><span>{authSession.displayName}님</span><i aria-hidden="true" /></button>
                <button type="button" onClick={onLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <button type="button" onClick={onGoToLogin}><UserRound size={16} /><span>로그인</span></button>
                <button type="button" onClick={onGoToSignup}>회원가입<em>+2,000 Points</em></button>
              </>
            )}
            <button type="button" onClick={onOpenCart} aria-label={`장바구니 ${cartCount}`}><ShoppingBag size={17} /><b>{cartCount}</b></button>
          </div>
        </div>

        {headerSearchOpen ? (
          <div className="blanca-search-panel">
            <div><Search size={18} /><input autoFocus value={headerSearchQuery} onChange={(event) => setHeaderSearchQuery(event.target.value)} placeholder="상품명이나 카테고리를 검색하세요" /><button type="button" onClick={() => { setHeaderSearchOpen(false); setHeaderSearchQuery('') }} aria-label="검색 닫기"><X size={18} /></button></div>
            <span>인기 검색어</span>
            <nav>{['신상품', '베스트', '테크', '리빙'].map((keyword) => <button key={keyword} type="button" onClick={onGoHome}>{keyword}</button>)}</nav>
          </div>
        ) : null}

        <nav className="blanca-category-nav" aria-label="상품 카테고리">
          <button type="button" className="is-active" onClick={onGoHome}>NEW 10%<i /></button>
          <button type="button" onClick={onGoHome}>BEST</button>
          {headerCategories.map((category) => <button key={category} type="button" onClick={onGoHome}>{category}</button>)}
          <button type="button" onClick={onOpenPosts}>COMMUNITY<ChevronDown size={13} /></button>
        </nav>

        <aside className={headerMenuOpen ? 'blanca-mobile-drawer is-open' : 'blanca-mobile-drawer'}>
          <div className="blanca-mobile-drawer__account">{authSession ? <><button type="button" onClick={onGoToProfile}>{authSession.displayName}님<span>회원정보 수정</span></button><button type="button" onClick={onLogout}>로그아웃</button></> : <><button type="button" onClick={onGoToLogin}>로그인</button><button type="button" onClick={onGoToSignup}>회원가입 <span>+2,000 Points</span></button></>}<button type="button" onClick={onOpenCart}>장바구니 <span>{cartCount}</span></button></div>
          <div className="blanca-mobile-drawer__categories"><button type="button" onClick={onGoHome}>ALL</button>{headerCategories.map((category) => <button key={category} type="button" onClick={onGoHome}>{category}</button>)}<button type="button" onClick={onOpenPosts}>COMMUNITY</button></div>
        </aside>
      </header>

      <main className="nb-product-shell">
        <nav className="nb-product-breadcrumb" aria-label="상품 경로">
          <button type="button" onClick={onGoHome}><ArrowLeft size={15} /> 전체 상품</button>
          <ChevronRight size={13} />
          <span>{product.category}</span>
          <ChevronRight size={13} />
          <strong>{product.name}</strong>
        </nav>

        <div className="nb-product-hero">
          <section className="nb-product-gallery" aria-label="상품 이미지">
            <div className="nb-product-thumbnails">
              {galleryViews.map((view, index) => (
                <button
                  key={view.tone}
                  type="button"
                  className={selectedImage === index ? 'is-active' : ''}
                  aria-label={view.label}
                  aria-pressed={selectedImage === index}
                  onClick={() => setSelectedImage(index)}
                >
                  <ProductArtwork
                    art={product.art}
                    palette={product.palette}
                    accent={product.accent}
                    imageUrl={product.imageUrl}
                    name={`${product.name} ${view.label}`}
                    imageLoading="eager"
                  />
                </button>
              ))}
            </div>

            <div className={`nb-product-stage nb-product-stage--${galleryViews[selectedImage].tone}`}>
              {product.featured ? <span className="nb-product-stage__badge">EDITOR'S PICK</span> : null}
              <ProductArtwork
                art={product.art}
                palette={product.palette}
                accent={product.accent}
                imageUrl={product.imageUrl}
                name={product.name}
                imageLoading="eager"
              />
              <span className="nb-product-stage__count">{String(selectedImage + 1).padStart(2, '0')} / {String(galleryViews.length).padStart(2, '0')}</span>
            </div>
          </section>

          <aside className="nb-product-buybox">
            <span className="nb-product-buybox__eyebrow">{product.featured ? 'BEST · ' : ''}{product.category}</span>
            <h1>{product.name}</h1>
            <p className="nb-product-buybox__summary">{product.summary}</p>

            <div className="nb-product-price-row">
              <div>
                {discount > 0 ? <em>{discount}%</em> : null}
                <strong>{currencyFormatter.format(product.price)}</strong>
                {discount > 0 ? <del>{currencyFormatter.format(product.compareAtPrice)}</del> : null}
              </div>
              <button type="button" disabled={actionPending} className={liked ? 'is-active' : ''} onClick={toggleLiked} aria-label="관심상품">
                <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            <button type="button" className="nb-product-rating" onClick={() => scrollToSection('product-reviews')}>
              <span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}</span>
              <strong>{reviewAverage ? reviewAverage.toFixed(1) : '—'}</strong>
              <em>{reviewCount}개 리뷰 보기</em>
              <ChevronRight size={14} />
            </button>

            <div className="nb-product-perks">
              <div><span>회원 혜택</span><strong>구매 금액의 2% 포인트 적립</strong><ChevronRight size={14} /></div>
              <div><span>배송 안내</span><strong>{product.price >= 70_000 ? '무료배송 · 평균 2일 이내 도착' : '3,000원 · 평균 2일 이내 도착'}</strong><ChevronRight size={14} /></div>
            </div>

            <section className="nb-product-colors">
              <div><strong>컬러</strong><span>Selected palette</span></div>
              <div className="nb-product-swatches">
                {product.palette.map((color, index) => (
                  <span key={color} className={index === 0 ? 'is-active' : ''} style={{ background: color }} title={index === 0 ? 'Main color' : 'Sub color'} />
                ))}
              </div>
            </section>

            <fieldset className="nb-product-options">
              <legend><span>옵션</span><button type="button" onClick={() => scrollToSection('option-guide')}><Ruler size={14} /> 옵션 가이드</button></legend>
              <div>
                {options.map((option) => (
                  <button key={option} type="button" className={activeOption === option ? 'is-selected' : ''} onClick={() => setSelectedOption(option)}>
                    {activeOption === option ? <Check size={14} /> : null}{option}
                  </button>
                ))}
              </div>
              <small>{product.stock <= 8 ? `재고가 ${product.stock}개 남았습니다.` : '지금 주문 가능한 옵션입니다.'}</small>
            </fieldset>

            <div className="nb-product-fit-note">
              <Info size={17} />
              <div><strong>옵션 선택 팁</strong><p>{optionTip}</p></div>
            </div>

            <div className="nb-product-selection">
              <div><span>{activeOption}</span><small>{currencyFormatter.format(product.price)}</small></div>
              <div className="nb-product-quantity">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="수량 줄이기"><Minus size={14} /></button>
                <b>{quantity}</b>
                <button type="button" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} aria-label="수량 늘리기"><Plus size={14} /></button>
              </div>
            </div>

            <div className="nb-product-total"><span>총 상품금액</span><strong>{currencyFormatter.format(product.price * quantity)}</strong></div>

            <div className="nb-product-actions">
              {isSoldOut ? (
                <button type="button" disabled={actionPending || restockRequested} className="nb-product-actions__restock" onClick={submitRestockRequest}>
                  {restockRequested ? <Check size={18} /> : <Bell size={18} />}{restockRequested ? '재입고 알림 신청 완료' : '재입고 알림 신청'}
                </button>
              ) : (
                <>
                  <button type="button" className="nb-product-actions__buy" onClick={() => onCheckout(product.id, quantity, activeOption)}>바로 구매</button>
                  <button type="button" disabled={actionPending} className="nb-product-actions__cart" onClick={addToBag}>
                    <ShoppingBag size={18} /> {added ? '담았습니다' : '장바구니'}
                  </button>
                </>
              )}
            </div>

            <div className="nb-product-assurances">
              <span><BadgeCheck size={17} /><b>정품 보증</b></span>
              <span><RotateCcw size={17} /><b>7일 교환·반품</b></span>
              <span><ShieldCheck size={17} /><b>안전 결제</b></span>
            </div>
          </aside>
        </div>

        <nav className="nb-product-tabs" aria-label="상품 상세 메뉴">
          <button type="button" className={activeSection === 'product-info' ? 'is-active' : ''} onClick={() => scrollToSection('product-info')}><span>01</span> 상품정보</button>
          <button type="button" className={activeSection === 'option-guide' ? 'is-active' : ''} onClick={() => scrollToSection('option-guide')}><span>02</span> 옵션 안내</button>
          <button type="button" className={activeSection === 'product-reviews' ? 'is-active' : ''} onClick={() => scrollToSection('product-reviews')}><span>03</span> 상품리뷰 <em>{reviewCount}</em></button>
          <button type="button" className={activeSection === 'product-qna' ? 'is-active' : ''} onClick={() => scrollToSection('product-qna')}><span>04</span> 상품문의</button>
        </nav>

        <section id="product-info" className="nb-product-info">
          <div className="nb-product-section-heading">
            <span className="nb-product-section-index">01</span>
            <span className="eyebrow">PRODUCT INFORMATION</span>
            <h2>오래 사용할수록 더 좋아지는 선택</h2>
            <p>{product.description}</p>
          </div>

          <div className="nb-product-editorial">
            <div className="nb-product-editorial__visual">
              <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
            </div>
            <div className="nb-product-editorial__copy">
              <span>{product.category.toUpperCase()} · TO YOU SELECT</span>
              <h3>{product.name}</h3>
              <p>{product.summary}</p>
              <ul>{product.details.map((detail) => <li key={detail}><Check size={15} />{detail}</li>)}</ul>
            </div>
          </div>

          <dl className="nb-product-specs">
            <div><dt>상품 코드</dt><dd>{product.id.toUpperCase()}</dd></div>
            <div><dt>카테고리</dt><dd>{product.category}</dd></div>
            <div><dt>대표 컬러</dt><dd>{product.palette[0]}</dd></div>
            <div><dt>상품 상태</dt><dd>{isSoldOut ? '품절' : '판매 중'}</dd></div>
          </dl>
        </section>

        <section id="option-guide" className="nb-product-guide">
          <div className="nb-product-section-heading nb-product-section-heading--compact">
            <span className="nb-product-section-index">02</span>
            <span className="eyebrow">OPTION GUIDE</span>
            <h2>옵션과 재고를 한눈에 확인하세요</h2>
          </div>
          <div className="nb-product-guide__table-wrap">
            <table>
              <thead><tr><th>옵션</th>{options.map((option) => <th key={option}>{option}</th>)}</tr></thead>
              <tbody>
                <tr><th>판매 상태</th>{options.map((option) => <td key={option}><span>구매 가능</span></td>)}</tr>
                <tr><th>배송 예정</th>{options.map((option) => <td key={option}>1–2 영업일</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="nb-product-guide__note"><Ruler size={16} /> 상품별 옵션 표기는 제조사 기준이며, 자세한 내용은 상품 문의를 이용해 주세요.</p>
        </section>

        <section id="product-reviews" className="nb-product-reviews">
          <div className="nb-product-section-heading nb-product-section-heading--compact">
            <span className="nb-product-section-index">03</span>
            <span className="eyebrow">CUSTOMER REVIEW</span>
            <h2>구매 고객의 솔직한 리뷰</h2>
          </div>
          <div className="nb-review-overview">
            <div className="nb-review-overview__score"><strong>{reviewAverage ? reviewAverage.toFixed(1) : '—'}</strong><span>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} fill={index < Math.round(reviewAverage) ? 'currentColor' : 'none'} />)}</span><small>{reviewCount}개의 리뷰</small></div>
            <div className="nb-review-overview__signal"><strong>{reviewCount ? `${reviewSatisfaction}%` : '—'}</strong><span>{reviewCount ? '만족도' : '첫 리뷰를 기다려요'}</span><p>{reviewCount ? '구매 고객이 남긴 평점을 기준으로 계산했습니다.' : '이 상품을 사용해 본 경험을 알려주세요.'}</p></div>
            <div className="nb-review-overview__reward"><PackageCheck size={24} /><strong>포토 리뷰 1,000P</strong><p>사진과 함께 후기를 남겨주세요.</p></div>
          </div>
          <div className="nb-review-toolbar">
            <strong>전체 리뷰 <em>{reviewCount}</em></strong>
            <div>
              <button type="button" className={reviewFilter === 'all' ? 'is-active' : ''} onClick={() => setReviewFilter('all')}>전체</button>
              <button type="button" className={reviewFilter === 'photo' ? 'is-active' : ''} onClick={() => setReviewFilter('photo')}><Camera size={13} /> 포토 리뷰</button>
              <button type="button" className={reviewFilter === 'recent' ? 'is-active' : ''} onClick={() => setReviewFilter('recent')}>최신순</button>
            </div>
          </div>
          <div className="nb-review-list">
            {visibleReviews.map((review) => (
              <article key={review.id}>
                <header><span className="nb-review-avatar">{review.author.charAt(0)}</span><div><strong>{review.author}</strong><span>{review.option || activeOption} 구매</span></div><time>{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(review.createdAt))}</time></header>
                <div className="nb-review-stars">{Array.from({ length: 5 }, (_, item) => <Star key={item} size={13} fill={item < review.rating ? 'currentColor' : 'none'} />)}</div>
                <p>{review.body}</p>
                <footer><button type="button"><ThumbsUp size={14} /> 도움이 돼요</button></footer>
              </article>
            ))}
            {!visibleReviews.length ? <div className="nb-review-empty">{reviewFilter === 'photo' ? '등록된 포토 리뷰가 없습니다.' : '아직 공개된 리뷰가 없습니다.'}</div> : null}
          </div>
        </section>

        <section id="product-qna" className="nb-product-support">
          <div className="nb-product-section-heading nb-product-section-heading--compact">
            <span className="nb-product-section-index">04</span>
            <span className="eyebrow">HELP & DELIVERY</span>
            <h2>구매 전 필요한 안내</h2>
          </div>
          <div className="nb-product-support__grid">
            <details open><summary><Truck size={18} /> 배송 안내 <ChevronDown size={17} /></summary><p>결제 완료 후 평균 1–2 영업일 이내 출고됩니다. 7만원 이상 구매 시 무료배송입니다.</p></details>
            <details><summary><RotateCcw size={18} /> 교환 및 반품 <ChevronDown size={17} /></summary><p>수령 후 7일 이내 신청할 수 있습니다. 사용 흔적이나 구성품 훼손이 있는 경우 반품이 제한될 수 있습니다.</p></details>
            <details><summary><CreditCard size={18} /> 결제 혜택 <ChevronDown size={17} /></summary><p>카드, 카카오페이, 네이버페이를 지원합니다. 회원은 구매 금액의 2%를 포인트로 적립받습니다.</p></details>
            <details><summary><MessageCircle size={18} /> 상품 문의 <ChevronDown size={17} /></summary><p>옵션과 상품 상태에 관한 문의는 평일 오전 10시부터 오후 5시까지 순차적으로 답변드립니다.</p></details>
          </div>
        </section>

        {bundleProducts.length > 0 ? (
          <section className="nb-product-bundle">
            <div className="nb-product-section-heading nb-product-section-heading--compact">
              <span className="nb-product-section-index">05</span>
              <span className="eyebrow">COMPLETE THE LOOK</span>
              <h2>함께 담으면 더 잘 어울려요</h2>
            </div>
            <div className="nb-product-bundle__layout">
              <div className="nb-product-bundle__products">
                <article className="is-required">
                  <span className="nb-product-bundle__check"><Check size={14} /></span>
                  <div><ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} /></div>
                  <strong>{product.name}</strong><small>{currencyFormatter.format(product.price)}</small>
                </article>
                {bundleProducts.map((item) => {
                  const isSelected = selectedBundleIds.includes(item.id)
                  return (
                    <article key={item.id} className={isSelected ? 'is-selected' : ''}>
                      <button type="button" className="nb-product-bundle__check" aria-label={`${item.name} 함께 담기`} aria-pressed={isSelected} onClick={() => toggleBundle(item.id)}>{isSelected ? <Check size={14} /> : <Plus size={14} />}</button>
                      <button type="button" className="nb-product-bundle__visual" onClick={() => onOpenProduct(item.id)}><ProductArtwork art={item.art} palette={item.palette} accent={item.accent} imageUrl={item.imageUrl} name={item.name} /></button>
                      <strong>{item.name}</strong><small>{currencyFormatter.format(item.price)}</small>
                    </article>
                  )
                })}
              </div>
              <aside className="nb-product-bundle__summary">
                <Sparkles size={20} />
                <span>선택 상품 {selectedBundleIds.length + 1}개</span>
                <strong>{currencyFormatter.format(bundleTotal)}</strong>
                <p>기본 상품과 함께 선택한 상품을 한 번에 장바구니에 담습니다.</p>
                <button type="button" disabled={selectedBundleIds.length === 0 || actionPending} onClick={addBundleToBag}>{bundleAdded ? '함께 담았습니다' : '선택 상품 함께 담기'}</button>
              </aside>
            </div>
          </section>
        ) : null}

        <section className="nb-product-community">
          <div className="nb-product-section-heading nb-product-section-heading--compact">
            <span className="nb-product-section-index">06</span>
            <span className="eyebrow">TO YOU COMMUNITY</span>
            <h2>고객이 완성한 스타일</h2>
          </div>
          <div className="nb-product-community__grid">
            {[product, ...relatedProducts.slice(0, 2)].map((item, index) => (
              <article key={`community-${item.id}`} className={`nb-product-community__card nb-product-community__card--${index + 1}`}>
                <ProductArtwork art={item.art} palette={item.palette} accent={item.accent} imageUrl={item.imageUrl} name={`${item.name} 스타일`} />
                <span><Camera size={14} /> #TOYOU_STYLE</span>
              </article>
            ))}
          </div>
          <div className="nb-product-community__footer"><p>구매한 상품의 스타일을 공유하고 포토 리뷰 포인트를 받아보세요.</p><button type="button" onClick={() => scrollToSection('product-reviews')}>포토 리뷰 혜택 보기 <ChevronRight size={15} /></button></div>
        </section>

        {relatedProducts.length > 0 ? (
          <section className="nb-product-related">
            <div className="nb-product-section-heading nb-product-section-heading--compact">
              <span className="nb-product-section-index">07</span>
              <span className="eyebrow">YOU MAY ALSO LIKE</span>
              <h2>함께 둘러보기 좋은 상품</h2>
            </div>
            <div className="nb-product-related__grid">
              {relatedProducts.map((item) => (
                <button key={item.id} type="button" onClick={() => onOpenProduct(item.id)}>
                  <span className="nb-product-related__visual"><ProductArtwork art={item.art} palette={item.palette} accent={item.accent} imageUrl={item.imageUrl} name={item.name} /></span>
                  <span className="nb-product-related__body"><small>{item.category}</small><strong>{item.name}</strong><em>{currencyFormatter.format(item.price)}</em></span>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

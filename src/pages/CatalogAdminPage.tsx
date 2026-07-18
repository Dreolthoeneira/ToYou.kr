import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  LayoutDashboard,
  MessageSquare,
  PackageOpen,
  Pencil,
  Pin,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Trash2,
  X,
} from 'lucide-react'
import {
  createAdminId,
  type AdminOrder,
  type AdminOrderStatus,
  type AdminPost,
  type AdminPostCategory,
  type AdminReview,
  type StoreSettings,
} from '../adminData'
import { createCatalogProductId, type CatalogProduct, type CatalogProductStatus } from '../catalog'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter, type ArtType } from '../data'

type AdminView = 'dashboard' | 'products' | 'posts' | 'orders' | 'reviews' | 'settings'

interface CatalogAdminPageProps {
  products: CatalogProduct[]
  posts: AdminPost[]
  orders: AdminOrder[]
  reviews: AdminReview[]
  settings: StoreSettings
  onSave: (product: CatalogProduct) => void
  onDelete: (productId: string) => void
  onSavePost: (post: AdminPost) => void
  onDeletePost: (postId: string) => void
  onUpdateOrderStatus: (orderId: string, status: AdminOrderStatus) => void
  onUpdateReviewStatus: (reviewId: string, status: AdminReview['status']) => void
  onDeleteReview: (reviewId: string) => void
  onSaveSettings: (settings: StoreSettings) => void
  onGoStore: () => void
  onOpenProduct: (productId: string) => void
}

const artOptions: ArtType[] = ['case', 'bag', 'drop', 'buds', 'cap', 'jar', 'box', 'van', 'globe']

const productStatusLabel: Record<CatalogProductStatus, string> = {
  active: '판매 중',
  draft: '임시 저장',
  soldout: '품절',
}

const orderStatusLabel: Record<AdminOrderStatus, string> = {
  paid: '결제 완료',
  preparing: '상품 준비',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소',
}

const postCategoryLabel: Record<AdminPostCategory, string> = {
  notice: '공지',
  journal: '저널',
  event: '이벤트',
}

const viewMeta: Record<AdminView, { eyebrow: string; title: string; description: string }> = {
  dashboard: { eyebrow: 'OVERVIEW', title: '운영 현황', description: '오늘 확인해야 할 스토어 상태를 한눈에 봅니다.' },
  products: { eyebrow: 'CATALOG', title: '상품 관리', description: '상품 정보, 재고와 판매 상태를 관리합니다.' },
  posts: { eyebrow: 'CONTENT', title: '게시글 관리', description: '공지, 저널과 이벤트 콘텐츠를 작성하고 공개합니다.' },
  orders: { eyebrow: 'FULFILLMENT', title: '주문 관리', description: '결제된 주문을 확인하고 배송 상태를 변경합니다.' },
  reviews: { eyebrow: 'CUSTOMER VOICE', title: '리뷰 관리', description: '구매 후기를 검수하고 스토어 노출 여부를 정합니다.' },
  settings: { eyebrow: 'STORE CONTROL', title: '스토어 설정', description: '상단 안내, 고객센터와 운영 상태를 관리합니다.' },
}

function createEmptyProduct(): CatalogProduct {
  return {
    id: '', name: '', category: '리빙', summary: '', description: '', price: 0, compareAtPrice: 0,
    stock: 0, status: 'draft', featured: false, art: 'box', palette: ['#f3eee6', '#ddd0bf'],
    accent: '#7a5e45', imageUrl: '', options: [], details: [], createdAt: new Date().toISOString(),
  }
}

function createEmptyPost(): AdminPost {
  const now = new Date().toISOString()
  return {
    id: '', title: '', category: 'notice', excerpt: '', content: '', status: 'draft', pinned: false,
    coverImage: '', createdAt: now, updatedAt: now,
  }
}

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function CatalogAdminPage({
  products,
  posts,
  orders,
  reviews,
  settings,
  onSave,
  onDelete,
  onSavePost,
  onDeletePost,
  onUpdateOrderStatus,
  onUpdateReviewStatus,
  onDeleteReview,
  onSaveSettings,
  onGoStore,
  onOpenProduct,
}: CatalogAdminPageProps) {
  const [view, setView] = useState<AdminView>('dashboard')
  const [productDraft, setProductDraft] = useState<CatalogProduct | null>(null)
  const [postDraft, setPostDraft] = useState<AdminPost | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [postQuery, setPostQuery] = useState('')
  const [postStatus, setPostStatus] = useState<'all' | AdminPost['status']>('all')
  const [orderStatus, setOrderStatus] = useState<'all' | AdminOrderStatus>('all')
  const [reviewStatus, setReviewStatus] = useState<'all' | AdminReview['status']>('all')
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [notice, setNotice] = useState('')

  useEffect(() => setSettingsDraft(settings), [settings])

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    return query ? products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query)) : products
  }, [products, productQuery])

  const filteredPosts = useMemo(() => {
    const query = postQuery.trim().toLowerCase()
    return posts.filter((post) => {
      const matchesQuery = !query || `${post.title} ${post.excerpt}`.toLowerCase().includes(query)
      return matchesQuery && (postStatus === 'all' || post.status === postStatus)
    })
  }, [posts, postQuery, postStatus])

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderStatus === 'all' || order.status === orderStatus),
    [orders, orderStatus],
  )

  const filteredReviews = useMemo(
    () => reviews.filter((review) => reviewStatus === 'all' || review.status === reviewStatus),
    [reviews, reviewStatus],
  )

  const activeProducts = products.filter((product) => product.status === 'active').length
  const lowStockProducts = products.filter((product) => product.stock > 0 && product.stock <= 10).length
  const pendingOrders = orders.filter((order) => order.status === 'paid' || order.status === 'preparing').length
  const visibleReviews = reviews.filter((review) => review.status === 'visible').length
  const revenue = orders.filter((order) => order.status !== 'cancelled').reduce((sum, order) => sum + order.total, 0)

  function flash(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2300)
  }

  function goToView(nextView: AdminView) {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function updateProductDraft<K extends keyof CatalogProduct>(key: K, value: CatalogProduct[K]) {
    setProductDraft((current) => current ? { ...current, [key]: value } : current)
  }

  function updatePostDraft<K extends keyof AdminPost>(key: K, value: AdminPost[K]) {
    setPostDraft((current) => current ? { ...current, [key]: value } : current)
  }

  function handleProductImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      flash('이미지는 1.5MB 이하 파일을 사용해 주세요.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => updateProductDraft('imageUrl', typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function handlePostImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 1_500_000) {
      flash('커버 이미지는 1.5MB 이하 파일을 사용해 주세요.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => updatePostDraft('coverImage', typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(file)
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productDraft || !productDraft.name.trim()) return
    const normalized: CatalogProduct = {
      ...productDraft,
      id: productDraft.id || createCatalogProductId(productDraft.name),
      name: productDraft.name.trim(),
      category: productDraft.category.trim() || '기타',
      price: Math.max(0, Number(productDraft.price) || 0),
      compareAtPrice: Math.max(0, Number(productDraft.compareAtPrice) || 0),
      stock: Math.max(0, Number(productDraft.stock) || 0),
      status: productDraft.stock < 1 && productDraft.status === 'active' ? 'soldout' : productDraft.status,
    }
    onSave(normalized)
    setProductDraft(null)
    flash('상품 정보가 저장되었습니다.')
  }

  function handlePostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!postDraft || !postDraft.title.trim()) return
    const now = new Date().toISOString()
    onSavePost({
      ...postDraft,
      id: postDraft.id || createAdminId('post'),
      title: postDraft.title.trim(),
      excerpt: postDraft.excerpt.trim(),
      content: postDraft.content.trim(),
      updatedAt: now,
    })
    setPostDraft(null)
    flash(postDraft.status === 'published' ? '게시글이 공개되었습니다.' : '게시글이 임시 저장되었습니다.')
  }

  function deleteProduct(product: CatalogProduct) {
    if (!window.confirm(`“${product.name}” 상품을 삭제할까요?`)) return
    onDelete(product.id)
    flash('상품이 삭제되었습니다.')
  }

  function deletePost(post: AdminPost) {
    if (!window.confirm(`“${post.title}” 게시글을 삭제할까요?`)) return
    onDeletePost(post.id)
    flash('게시글이 삭제되었습니다.')
  }

  function deleteReview(review: AdminReview) {
    if (!window.confirm(`${review.author}님의 리뷰를 삭제할까요?`)) return
    onDeleteReview(review.id)
    flash('리뷰가 삭제되었습니다.')
  }

  const meta = viewMeta[view]
  const primaryAction = view === 'products'
    ? { label: '상품 등록', action: () => setProductDraft(createEmptyProduct()) }
    : view === 'posts'
      ? { label: '게시글 작성', action: () => setPostDraft(createEmptyPost()) }
      : null

  return (
    <div className="admin-console">
      <aside className="admin-console__sidebar">
        <button type="button" className="admin-console__brand" onClick={() => goToView('dashboard')}>
          <span>TY</span><div><strong>TO YOU</strong><small>ADMIN</small></div>
        </button>
        <nav aria-label="관리 메뉴">
          <button type="button" className={view === 'dashboard' ? 'is-active' : ''} onClick={() => goToView('dashboard')}><LayoutDashboard size={18} /><span>대시보드</span></button>
          <button type="button" className={view === 'products' ? 'is-active' : ''} onClick={() => goToView('products')}><ShoppingBag size={18} /><span>상품</span><em>{products.length}</em></button>
          <button type="button" className={view === 'posts' ? 'is-active' : ''} onClick={() => goToView('posts')}><FileText size={18} /><span>게시글</span><em>{posts.length}</em></button>
          <button type="button" className={view === 'orders' ? 'is-active' : ''} onClick={() => goToView('orders')}><PackageOpen size={18} /><span>주문</span>{pendingOrders ? <em>{pendingOrders}</em> : null}</button>
          <button type="button" className={view === 'reviews' ? 'is-active' : ''} onClick={() => goToView('reviews')}><MessageSquare size={18} /><span>리뷰</span><em>{reviews.length}</em></button>
          <button type="button" className={view === 'settings' ? 'is-active' : ''} onClick={() => goToView('settings')}><Settings size={18} /><span>스토어 설정</span></button>
        </nav>
        <div className="admin-console__sidebar-foot">
          <button type="button" onClick={onGoStore}><ArrowLeft size={17} /><span>스토어로 돌아가기</span></button>
          <p><span className="is-online" /> 스토어 정상 운영 중</p>
        </div>
      </aside>

      <div className="admin-console__workspace">
        <header className="admin-console__topbar">
          <div><span>{meta.eyebrow}</span><h1>{meta.title}</h1></div>
          <div className="admin-console__top-actions">
            <button type="button" className="admin-console__store-link" onClick={onGoStore}><Store size={17} /> 스토어 보기</button>
            {primaryAction ? <button type="button" className="admin-console__primary" onClick={primaryAction.action}><Plus size={17} /> {primaryAction.label}</button> : null}
          </div>
        </header>

        <main className="admin-console__main">
          <div className="admin-console__heading"><p>{meta.description}</p><span>마지막 업데이트 · 방금 전</span></div>
          {notice ? <div className="admin-console__notice"><Check size={16} /> {notice}</div> : null}

          {view === 'dashboard' ? (
            <div className="admin-dashboard">
              <section className="admin-dashboard__stats">
                <article><span className="admin-dashboard__icon"><CircleDollarSign size={20} /></span><div><small>누적 결제 금액</small><strong>{currencyFormatter.format(revenue)}</strong><p>취소 주문 제외</p></div></article>
                <article><span className="admin-dashboard__icon"><PackageOpen size={20} /></span><div><small>처리할 주문</small><strong>{pendingOrders}<em>건</em></strong><p>결제 완료 · 상품 준비</p></div></article>
                <article><span className="admin-dashboard__icon"><ShoppingBag size={20} /></span><div><small>판매 중 상품</small><strong>{activeProducts}<em>개</em></strong><p>재고 부족 {lowStockProducts}개</p></div></article>
                <article><span className="admin-dashboard__icon"><MessageSquare size={20} /></span><div><small>공개 리뷰</small><strong>{visibleReviews}<em>개</em></strong><p>숨김 {reviews.length - visibleReviews}개</p></div></article>
              </section>

              <section className="admin-dashboard__grid">
                <article className="admin-panel admin-panel--wide">
                  <header><div><h2>최근 주문</h2><p>가장 최근 들어온 주문을 확인하세요.</p></div><button type="button" onClick={() => goToView('orders')}>전체 보기 <ChevronRight size={16} /></button></header>
                  {orders.length ? (
                    <div className="admin-dashboard__recent">
                      {orders.slice(0, 5).map((order) => <div key={order.id}><span className={`admin-order-mark admin-order-mark--${order.status}`} /><div><strong>{order.productName}</strong><small>{order.customerName} · {formatDate(order.createdAt, true)}</small></div><b>{currencyFormatter.format(order.total)}</b><em>{orderStatusLabel[order.status]}</em></div>)}
                    </div>
                  ) : <div className="admin-empty"><PackageOpen size={26} /><strong>아직 주문이 없습니다.</strong><p>스토어에서 결제가 완료되면 여기에 바로 표시됩니다.</p></div>}
                </article>

                <article className="admin-panel">
                  <header><div><h2>빠른 작업</h2><p>자주 쓰는 관리 메뉴</p></div></header>
                  <div className="admin-dashboard__quick">
                    <button type="button" onClick={() => { goToView('products'); setProductDraft(createEmptyProduct()) }}><Plus size={18} /><span><strong>새 상품 등록</strong><small>가격과 재고 설정</small></span><ChevronRight size={16} /></button>
                    <button type="button" onClick={() => { goToView('posts'); setPostDraft(createEmptyPost()) }}><FileText size={18} /><span><strong>공지 작성</strong><small>스토어 소식 게시</small></span><ChevronRight size={16} /></button>
                    <button type="button" onClick={() => goToView('settings')}><Settings size={18} /><span><strong>스토어 설정</strong><small>안내 문구와 연락처</small></span><ChevronRight size={16} /></button>
                  </div>
                </article>
              </section>

              <section className="admin-dashboard__grid">
                <article className="admin-panel admin-panel--wide">
                  <header><div><h2>콘텐츠 현황</h2><p>공개 중인 게시글과 임시 저장 글입니다.</p></div><button type="button" onClick={() => goToView('posts')}>관리하기 <ChevronRight size={16} /></button></header>
                  <div className="admin-dashboard__posts">
                    {posts.slice(0, 4).map((post) => <button type="button" key={post.id} onClick={() => { goToView('posts'); setPostDraft({ ...post }) }}><span>{postCategoryLabel[post.category]}</span><div><strong>{post.pinned ? '고정 · ' : ''}{post.title}</strong><small>{formatDate(post.updatedAt)}</small></div><em className={post.status === 'published' ? 'is-live' : ''}>{post.status === 'published' ? '공개' : '임시 저장'}</em></button>)}
                  </div>
                </article>
                <article className="admin-panel admin-panel--health">
                  <header><div><h2>스토어 상태</h2><p>운영 설정 요약</p></div></header>
                  <div><span className={settings.maintenanceMode ? 'is-warning' : 'is-good'}>{settings.maintenanceMode ? '점검 모드' : '정상 운영'}</span><p>{settings.maintenanceMode ? '고객에게 점검 화면이 표시되도록 설정되어 있습니다.' : '고객이 상품을 보고 주문할 수 있습니다.'}</p><button type="button" onClick={() => goToView('settings')}>운영 설정 열기</button></div>
                </article>
              </section>
            </div>
          ) : null}

          {view === 'products' ? (
            <section className="admin-panel admin-list-panel">
              <div className="admin-list-toolbar"><div><h2>전체 상품</h2><span>{filteredProducts.length}개</span></div><label><Search size={17} /><input type="search" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="상품명 또는 카테고리 검색" /></label></div>
              <div className="admin-product-head"><span>상품 정보</span><span>판매가</span><span>재고</span><span>상태</span><span>관리</span></div>
              <div className="admin-product-list">
                {filteredProducts.map((product) => (
                  <article key={product.id}>
                    <div className="admin-product-info"><div><ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} /></div><span><strong>{product.name}</strong><small>{product.category} · {product.id}</small></span></div>
                    <strong>{currencyFormatter.format(product.price)}</strong>
                    <span className={product.stock <= 10 ? 'is-low' : ''}>{product.stock}개</span>
                    <em className={`admin-status admin-status--${product.status}`}>{productStatusLabel[product.status]}</em>
                    <div className="admin-row-actions"><button type="button" onClick={() => onOpenProduct(product.id)} aria-label="상품 보기"><Eye size={16} /></button><button type="button" onClick={() => setProductDraft({ ...product })} aria-label="상품 수정"><Pencil size={16} /></button><button type="button" onClick={() => deleteProduct(product)} aria-label="상품 삭제"><Trash2 size={16} /></button></div>
                  </article>
                ))}
                {!filteredProducts.length ? <div className="admin-empty"><ShoppingBag size={26} /><strong>조건에 맞는 상품이 없습니다.</strong></div> : null}
              </div>
            </section>
          ) : null}

          {view === 'posts' ? (
            <section className="admin-panel admin-list-panel">
              <div className="admin-list-toolbar admin-list-toolbar--filters"><div><h2>전체 게시글</h2><span>{filteredPosts.length}개</span></div><div><label><Search size={17} /><input type="search" value={postQuery} onChange={(event) => setPostQuery(event.target.value)} placeholder="제목 검색" /></label><select value={postStatus} onChange={(event) => setPostStatus(event.target.value as typeof postStatus)}><option value="all">전체 상태</option><option value="published">공개</option><option value="draft">임시 저장</option></select></div></div>
              <div className="admin-post-list">
                {filteredPosts.map((post) => (
                  <article key={post.id}>
                    <div className="admin-post-list__cover">{post.coverImage ? <img src={post.coverImage} alt="" /> : <FileText size={22} />}</div>
                    <div className="admin-post-list__content"><span><em>{postCategoryLabel[post.category]}</em>{post.pinned ? <small><Pin size={12} /> 상단 고정</small> : null}</span><strong>{post.title}</strong><p>{post.excerpt || '요약 내용이 없습니다.'}</p></div>
                    <div className="admin-post-list__meta"><em className={post.status === 'published' ? 'is-live' : ''}>{post.status === 'published' ? '공개' : '임시 저장'}</em><span>수정 {formatDate(post.updatedAt)}</span></div>
                    <div className="admin-row-actions"><button type="button" onClick={() => setPostDraft({ ...post })} aria-label="게시글 수정"><Pencil size={16} /></button><button type="button" onClick={() => deletePost(post)} aria-label="게시글 삭제"><Trash2 size={16} /></button></div>
                  </article>
                ))}
                {!filteredPosts.length ? <div className="admin-empty"><FileText size={26} /><strong>조건에 맞는 게시글이 없습니다.</strong></div> : null}
              </div>
            </section>
          ) : null}

          {view === 'orders' ? (
            <section className="admin-panel admin-list-panel">
              <div className="admin-list-toolbar"><div><h2>전체 주문</h2><span>{filteredOrders.length}건</span></div><select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value as typeof orderStatus)}><option value="all">전체 상태</option>{Object.entries(orderStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="admin-order-list">
                {filteredOrders.map((order) => (
                  <article key={order.id}>
                    <div className="admin-order-list__id"><strong>{order.id.toUpperCase()}</strong><span>{formatDate(order.createdAt, true)}</span></div>
                    <div><strong>{order.productName}</strong><span>{order.option || '기본 옵션'} · {order.quantity}개</span></div>
                    <div><strong>{order.customerName}</strong><span>{order.phone}</span><small>{order.address}</small></div>
                    <b>{currencyFormatter.format(order.total)}</b>
                    <select value={order.status} onChange={(event) => onUpdateOrderStatus(order.id, event.target.value as AdminOrderStatus)} aria-label="주문 상태"><option value="paid">결제 완료</option><option value="preparing">상품 준비</option><option value="shipping">배송 중</option><option value="delivered">배송 완료</option><option value="cancelled">주문 취소</option></select>
                  </article>
                ))}
                {!filteredOrders.length ? <div className="admin-empty"><PackageOpen size={26} /><strong>표시할 주문이 없습니다.</strong><p>스토어 결제 완료 주문이 자동으로 쌓입니다.</p></div> : null}
              </div>
            </section>
          ) : null}

          {view === 'reviews' ? (
            <section className="admin-panel admin-list-panel">
              <div className="admin-list-toolbar"><div><h2>구매 리뷰</h2><span>{filteredReviews.length}개</span></div><select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}><option value="all">전체 상태</option><option value="visible">공개</option><option value="hidden">숨김</option></select></div>
              <div className="admin-review-list">
                {filteredReviews.map((review) => (
                  <article key={review.id}>
                    <div className="admin-review-list__score"><strong>{review.rating.toFixed(1)}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
                    <div className="admin-review-list__body"><span><strong>{review.author}</strong><small>{review.productName} · {review.option}</small></span><p>{review.body}</p><em>{formatDate(review.createdAt)}</em></div>
                    <div className="admin-review-list__state"><em className={review.status === 'visible' ? 'is-live' : ''}>{review.status === 'visible' ? '공개 중' : '숨김'}</em><button type="button" onClick={() => onUpdateReviewStatus(review.id, review.status === 'visible' ? 'hidden' : 'visible')}>{review.status === 'visible' ? <EyeOff size={16} /> : <Eye size={16} />}{review.status === 'visible' ? '숨기기' : '공개하기'}</button><button type="button" onClick={() => deleteReview(review)}><Trash2 size={16} /> 삭제</button></div>
                  </article>
                ))}
                {!filteredReviews.length ? <div className="admin-empty"><MessageSquare size={26} /><strong>표시할 리뷰가 없습니다.</strong></div> : null}
              </div>
            </section>
          ) : null}

          {view === 'settings' ? (
            <form className="admin-settings" onSubmit={(event) => { event.preventDefault(); onSaveSettings(settingsDraft); flash('스토어 설정이 저장되었습니다.') }}>
              <section className="admin-panel"><header><div><h2>기본 정보</h2><p>스토어에서 고객에게 보이는 이름과 소개입니다.</p></div></header><div className="admin-settings__fields"><label><span>스토어 이름</span><input value={settingsDraft.storeName} onChange={(event) => setSettingsDraft({ ...settingsDraft, storeName: event.target.value })} /></label><label className="is-full"><span>하단 소개 문구</span><textarea rows={3} value={settingsDraft.footerDescription} onChange={(event) => setSettingsDraft({ ...settingsDraft, footerDescription: event.target.value })} /></label></div></section>
              <section className="admin-panel"><header><div><h2>고객 안내</h2><p>상단 띠 배너와 배송 정책에 표시되는 문구입니다.</p></div></header><div className="admin-settings__fields"><label className="is-full"><span>상단 공지</span><input value={settingsDraft.announcement} onChange={(event) => setSettingsDraft({ ...settingsDraft, announcement: event.target.value })} /></label><label className="is-full"><span>배송 안내</span><input value={settingsDraft.shippingNotice} onChange={(event) => setSettingsDraft({ ...settingsDraft, shippingNotice: event.target.value })} /></label></div></section>
              <section className="admin-panel"><header><div><h2>고객센터</h2><p>문의 응대에 사용할 연락처입니다.</p></div></header><div className="admin-settings__fields"><label><span>이메일</span><input type="email" value={settingsDraft.supportEmail} onChange={(event) => setSettingsDraft({ ...settingsDraft, supportEmail: event.target.value })} /></label><label><span>전화번호</span><input value={settingsDraft.supportPhone} onChange={(event) => setSettingsDraft({ ...settingsDraft, supportPhone: event.target.value })} /></label></div></section>
              <section className="admin-panel admin-settings__operation"><span className="admin-settings__operation-icon"><Clock3 size={20} /></span><div><strong>스토어 점검 모드</strong><p>활성화하면 고객에게 운영 준비 안내가 표시됩니다.</p></div><label className="admin-switch"><input type="checkbox" checked={settingsDraft.maintenanceMode} onChange={(event) => setSettingsDraft({ ...settingsDraft, maintenanceMode: event.target.checked })} /><span /></label></section>
              <div className="admin-settings__save"><button type="submit" className="admin-console__primary"><Save size={17} /> 변경사항 저장</button></div>
            </form>
          ) : null}
        </main>
      </div>

      {productDraft ? (
        <div className="catalog-editor" role="dialog" aria-modal="true" aria-label={productDraft.id ? '상품 수정' : '상품 등록'}>
          <button type="button" className="catalog-editor__backdrop" onClick={() => setProductDraft(null)} aria-label="닫기" />
          <form className="catalog-editor__panel" onSubmit={handleProductSubmit}>
            <header><div><span className="eyebrow">CATALOG EDITOR</span><h2>{productDraft.id ? '상품 수정' : '새 상품 등록'}</h2></div><button type="button" onClick={() => setProductDraft(null)} aria-label="닫기"><X size={20} /></button></header>
            <div className="catalog-editor__body">
              <div className="catalog-editor__preview"><ProductArtwork art={productDraft.art} palette={productDraft.palette} accent={productDraft.accent} imageUrl={productDraft.imageUrl} name={productDraft.name || '상품 미리보기'} /></div>
              <label className="catalog-editor__upload"><ImagePlus size={18} /><span>상품 이미지 업로드<small>JPG, PNG, WEBP · 최대 1.5MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProductImage} /></label>
              <div className="catalog-editor__grid">
                <label className="catalog-editor__full"><span>상품명 *</span><input required value={productDraft.name} onChange={(event) => updateProductDraft('name', event.target.value)} placeholder="상품명을 입력하세요" /></label>
                <label><span>카테고리</span><input value={productDraft.category} onChange={(event) => updateProductDraft('category', event.target.value)} /></label>
                <label><span>판매 상태</span><select value={productDraft.status} onChange={(event) => updateProductDraft('status', event.target.value as CatalogProductStatus)}><option value="active">판매 중</option><option value="draft">임시 저장</option><option value="soldout">품절</option></select></label>
                <label><span>판매가</span><input type="number" min="0" value={productDraft.price} onChange={(event) => updateProductDraft('price', Number(event.target.value))} /></label>
                <label><span>정상가</span><input type="number" min="0" value={productDraft.compareAtPrice} onChange={(event) => updateProductDraft('compareAtPrice', Number(event.target.value))} /></label>
                <label><span>재고</span><input type="number" min="0" value={productDraft.stock} onChange={(event) => updateProductDraft('stock', Number(event.target.value))} /></label>
                <label><span>대체 이미지 스타일</span><select value={productDraft.art} onChange={(event) => updateProductDraft('art', event.target.value as ArtType)}>{artOptions.map((art) => <option key={art} value={art}>{art}</option>)}</select></label>
                <label className="catalog-editor__full"><span>한 줄 소개</span><input value={productDraft.summary} onChange={(event) => updateProductDraft('summary', event.target.value)} /></label>
                <label className="catalog-editor__full"><span>상세 설명</span><textarea rows={4} value={productDraft.description} onChange={(event) => updateProductDraft('description', event.target.value)} /></label>
                <label className="catalog-editor__full"><span>옵션 · 한 줄에 하나씩</span><textarea rows={3} value={productDraft.options.join('\n')} onChange={(event) => updateProductDraft('options', event.target.value.split('\n').filter(Boolean))} /></label>
                <label className="catalog-editor__full"><span>상품 포인트 · 한 줄에 하나씩</span><textarea rows={3} value={productDraft.details.join('\n')} onChange={(event) => updateProductDraft('details', event.target.value.split('\n').filter(Boolean))} /></label>
                <label className="catalog-editor__full catalog-editor__check"><input type="checkbox" checked={productDraft.featured} onChange={(event) => updateProductDraft('featured', event.target.checked)} /><span>메인 화면 대표 상품으로 노출</span></label>
              </div>
            </div>
            <footer><button type="button" className="button button--ghost" onClick={() => setProductDraft(null)}>취소</button><button type="submit" className="button button--primary"><Save size={16} /> 저장하기</button></footer>
          </form>
        </div>
      ) : null}

      {postDraft ? (
        <div className="admin-editor" role="dialog" aria-modal="true" aria-label={postDraft.id ? '게시글 수정' : '게시글 작성'}>
          <button type="button" className="admin-editor__backdrop" onClick={() => setPostDraft(null)} aria-label="닫기" />
          <form className="admin-editor__panel" onSubmit={handlePostSubmit}>
            <header><div><span>CONTENT EDITOR</span><h2>{postDraft.id ? '게시글 수정' : '새 게시글 작성'}</h2></div><button type="button" onClick={() => setPostDraft(null)} aria-label="닫기"><X size={20} /></button></header>
            <div className="admin-editor__body">
              <div className="admin-editor__settings">
                <label><span>분류</span><select value={postDraft.category} onChange={(event) => updatePostDraft('category', event.target.value as AdminPostCategory)}><option value="notice">공지</option><option value="journal">저널</option><option value="event">이벤트</option></select></label>
                <label><span>공개 상태</span><select value={postDraft.status} onChange={(event) => updatePostDraft('status', event.target.value as AdminPost['status'])}><option value="draft">임시 저장</option><option value="published">공개</option></select></label>
                <label className="admin-editor__pin"><input type="checkbox" checked={postDraft.pinned} onChange={(event) => updatePostDraft('pinned', event.target.checked)} /><span><Pin size={15} /> 목록 상단에 고정</span></label>
              </div>
              <label className="admin-editor__title"><span>제목 *</span><input required value={postDraft.title} onChange={(event) => updatePostDraft('title', event.target.value)} placeholder="제목을 입력하세요" /></label>
              <label><span>목록 요약</span><textarea rows={2} value={postDraft.excerpt} onChange={(event) => updatePostDraft('excerpt', event.target.value)} placeholder="목록에서 보일 짧은 설명" /></label>
              <label><span>본문</span><textarea className="admin-editor__content" rows={12} value={postDraft.content} onChange={(event) => updatePostDraft('content', event.target.value)} placeholder="고객에게 전달할 내용을 작성하세요." /></label>
              <label className="admin-editor__upload"><ImagePlus size={18} /><span>{postDraft.coverImage ? '커버 이미지 변경' : '커버 이미지 추가'}<small>JPG, PNG, WEBP · 최대 1.5MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePostImage} /></label>
              {postDraft.coverImage ? <div className="admin-editor__cover"><img src={postDraft.coverImage} alt="커버 미리보기" /><button type="button" onClick={() => updatePostDraft('coverImage', '')}><Trash2 size={15} /> 이미지 제거</button></div> : null}
            </div>
            <footer><button type="button" onClick={() => setPostDraft(null)}>취소</button><button type="submit"><Save size={16} /> {postDraft.status === 'published' ? '저장하고 공개' : '임시 저장'}</button></footer>
          </form>
        </div>
      ) : null}
    </div>
  )
}

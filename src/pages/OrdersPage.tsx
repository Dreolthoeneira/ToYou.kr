import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react'
import type { AdminOrder, AdminOrderStatus } from '../adminData'
import type { AuthSession } from '../authSession'
import type { CatalogProduct } from '../catalog'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import { SITE_BRAND } from '../siteBrand'
import { loadServerOrders } from '../storeApi'

interface OrdersPageProps {
  authSession: AuthSession | null
  products: CatalogProduct[]
  onGoHome: () => void
  onGoToLogin: () => void
  onGoToProfile: () => void
  onOpenProduct: (productId: string) => void
}

const deliverySteps = [
  { key: 'paid', label: '결제 완료', description: '주문을 확인했어요.', Icon: CreditCard },
  { key: 'preparing', label: '상품 준비', description: '상품을 포장하고 있어요.', Icon: PackageCheck },
  { key: 'shipping', label: '배송 중', description: '배송지로 이동 중이에요.', Icon: Truck },
  { key: 'delivered', label: '배송 완료', description: '배송이 완료됐어요.', Icon: Check },
] as const

const statusIndex: Record<Exclude<AdminOrderStatus, 'cancelled'>, number> = {
  paid: 0,
  preparing: 1,
  shipping: 2,
  delivered: 3,
}

const statusCopy: Record<AdminOrderStatus, { label: string; body: string }> = {
  paid: { label: '결제 완료', body: '결제가 완료되어 주문 내용을 확인하고 있습니다.' },
  preparing: { label: '상품 준비 중', body: '상품 검수와 포장을 진행하고 있습니다.' },
  shipping: { label: '배송 중', body: '상품이 출고되어 배송지로 이동하고 있습니다.' },
  delivered: { label: '배송 완료', body: '상품 배송이 완료되었습니다.' },
  cancelled: { label: '주문 취소', body: '취소된 주문입니다. 결제수단에 따라 환불 반영 시간이 다를 수 있습니다.' },
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function paymentLabel(method: AdminOrder['paymentMethod']) {
  if (method === 'kakao') return '카카오페이'
  if (method === 'naver') return '네이버페이'
  return '신용·체크카드'
}

export function OrdersPage({ authSession, products, onGoHome, onGoToLogin, onGoToProfile, onOpenProduct }: OrdersPageProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(Boolean(authSession))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authSession) {
      setOrders([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError('')
    void loadServerOrders()
      .then((nextOrders) => {
        if (active) setOrders(nextOrders)
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : '주문과 배송 정보를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [authSession])

  async function refreshOrders() {
    setRefreshing(true)
    setError('')
    try {
      setOrders(await loadServerOrders())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '배송 상태를 새로 불러오지 못했습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  if (!authSession) {
    return (
      <div className="orders-page orders-page--signed-out">
        <header className="orders-header">
          <button type="button" onClick={onGoHome}><ArrowLeft size={17} /> 스토어로</button>
          <button type="button" className="orders-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
          <span><ShieldCheck size={15} /> 회원 전용</span>
        </header>
        <main className="orders-auth-gate">
          <span><ShoppingBag size={27} /></span>
          <small>MEMBER ORDER</small>
          <h1>로그인 후 주문과<br />배송을 확인할 수 있어요</h1>
          <p>주문 내역은 구매한 회원 계정에만 안전하게 표시됩니다.</p>
          <button type="button" onClick={onGoToLogin}>로그인하기 <ChevronRight size={17} /></button>
        </main>
      </div>
    )
  }

  return (
    <div className="orders-page">
      <header className="orders-header">
        <button type="button" onClick={onGoHome}><ArrowLeft size={17} /> 쇼핑 계속하기</button>
        <button type="button" className="orders-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <button type="button" onClick={onGoToProfile}>{authSession.displayName}님 <ChevronRight size={15} /></button>
      </header>

      <main className="orders-shell">
        <section className="orders-heading">
          <div>
            <span>ORDER &amp; DELIVERY</span>
            <h1>주문·배송 조회</h1>
            <p>결제부터 배송 완료까지 현재 진행 상황을 한눈에 확인하세요.</p>
          </div>
          <button type="button" disabled={loading || refreshing} onClick={refreshOrders}>
            <RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} /> 배송 상태 새로고침
          </button>
        </section>

        {loading ? (
          <div className="orders-loading" role="status"><i /><strong>주문 내역을 불러오고 있어요</strong><span>잠시만 기다려 주세요.</span></div>
        ) : error ? (
          <div className="orders-error" role="alert"><XCircle size={24} /><strong>{error}</strong><button type="button" onClick={refreshOrders}>다시 시도</button></div>
        ) : orders.length === 0 ? (
          <div className="orders-empty"><ShoppingBag size={28} /><span>NO ORDERS YET</span><h2>아직 주문 내역이 없어요</h2><p>마음에 드는 상품을 발견하면 첫 주문을 시작해 보세요.</p><button type="button" onClick={onGoHome}>상품 보러가기 <ChevronRight size={16} /></button></div>
        ) : (
          <section className="orders-list" aria-label="주문 내역">
            <div className="orders-list__summary"><span>전체 주문</span><strong>{orders.length}</strong><small>관리자가 상태를 변경하면 새로고침 후 바로 반영됩니다.</small></div>
            {orders.map((order) => {
              const product = products.find((item) => item.id === order.productId)
              const cancelled = order.status === 'cancelled'
              const currentStatusIndex = order.status === 'cancelled' ? -1 : statusIndex[order.status]

              return (
                <article key={order.id} className={`orders-card${cancelled ? ' is-cancelled' : ''}`}>
                  <header className="orders-card__header">
                    <div><span>{formatOrderDate(order.createdAt)}</span><strong>주문번호 {order.id.toUpperCase()}</strong></div>
                    <em className={`is-${order.status}`}>{statusCopy[order.status].label}</em>
                  </header>

                  <div className="orders-card__product">
                    <button type="button" onClick={() => onOpenProduct(order.productId)} aria-label={`${order.productName} 상품 보기`}>
                      {product ? <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} /> : <span><PackageCheck size={25} /></span>}
                    </button>
                    <div><small>{product?.category ?? 'TO YOU ORDER'}</small><h2>{order.productName}</h2><p>{order.option || '기본 옵션'} · {order.quantity}개</p></div>
                    <strong>{currencyFormatter.format(order.total)}</strong>
                  </div>

                  {cancelled ? (
                    <div className="orders-card__cancelled"><XCircle size={19} /><div><strong>{statusCopy.cancelled.label}</strong><p>{statusCopy.cancelled.body}</p></div></div>
                  ) : (
                    <div className="orders-progress" aria-label={`현재 상태: ${statusCopy[order.status].label}`}>
                      {deliverySteps.map(({ key, label, description, Icon }, index) => (
                        <div key={key} className={`${index <= currentStatusIndex ? 'is-active' : ''}${index < currentStatusIndex ? ' is-complete' : ''}${index === currentStatusIndex ? ' is-current' : ''}`}>
                          <span>{index < currentStatusIndex ? <Check size={16} /> : <Icon size={17} />}</span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="orders-card__status-copy"><Clock3 size={17} /><div><strong>{statusCopy[order.status].label}</strong><span>{statusCopy[order.status].body}</span></div></div>

                  <div className="orders-card__details">
                    <div><MapPin size={17} /><span><small>배송지</small><strong>{order.address}</strong></span></div>
                    <div><CreditCard size={17} /><span><small>결제수단</small><strong>{paymentLabel(order.paymentMethod)}</strong></span></div>
                    <div><Truck size={17} /><span><small>배송 요청사항</small><strong>{order.deliveryNote || '요청사항 없음'}</strong></span></div>
                  </div>

                  <footer><button type="button" onClick={() => onOpenProduct(order.productId)}>상품 다시 보기 <ChevronRight size={15} /></button></footer>
                </article>
              )
            })}
          </section>
        )}
      </main>
    </div>
  )
}

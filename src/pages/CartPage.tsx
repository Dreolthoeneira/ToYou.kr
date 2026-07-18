import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LoaderCircle,
  LockKeyhole,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react'
import type { AuthSession } from '../authSession'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import {
  loadServerCart,
  removeServerCartItem,
  updateServerCartItemQuantity,
  type AccountActivity,
  type CartLine,
  type CartSnapshot,
} from '../storeApi'
import { SITE_BRAND } from '../siteBrand'

interface CartPageProps {
  authSession: AuthSession | null
  cartCount: number
  onGoHome: () => void
  onGoToLogin: () => void
  onOpenProduct: (productId: string) => void
  onCheckout: (productId: string, quantity: number, option: string) => void
  onCartActivityChange: (activity: AccountActivity) => void
}

function lineKey(line: Pick<CartLine, 'productId' | 'option'>) {
  return `${line.productId}::${line.option}`
}

export function CartPage({
  authSession,
  cartCount,
  onGoHome,
  onGoToLogin,
  onOpenProduct,
  onCheckout,
  onCartActivityChange,
}: CartPageProps) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(Boolean(authSession))
  const [pendingKey, setPendingKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!authSession) {
      setLines([])
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    loadServerCart()
      .then((snapshot) => {
        if (!active) return
        applySnapshot(snapshot)
      })
      .catch((caughtError) => {
        if (active) setError(caughtError instanceof Error ? caughtError.message : '장바구니를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [authSession])

  function applySnapshot(snapshot: CartSnapshot) {
    setLines(snapshot.lines)
    onCartActivityChange(snapshot.activity)
    setSelectedKey((current) => snapshot.lines.some((line) => lineKey(line) === current)
      ? current
      : snapshot.lines[0] ? lineKey(snapshot.lines[0]) : '')
    setError('')
  }

  async function changeQuantity(line: CartLine, quantity: number) {
    if (quantity < 1 || quantity > Math.min(99, line.product.stock)) return
    const key = lineKey(line)
    setPendingKey(key)
    try {
      applySnapshot(await updateServerCartItemQuantity(line.productId, line.option, quantity))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '수량을 변경하지 못했습니다.')
    } finally {
      setPendingKey('')
    }
  }

  async function removeLine(line: CartLine) {
    const key = lineKey(line)
    setPendingKey(key)
    try {
      applySnapshot(await removeServerCartItem(line.productId, line.option))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '상품을 삭제하지 못했습니다.')
    } finally {
      setPendingKey('')
    }
  }

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0), [lines])
  const shipping = subtotal === 0 || subtotal >= 70_000 ? 0 : 3_000
  const freeShippingRemaining = Math.max(0, 70_000 - subtotal)
  const selectedLine = lines.find((line) => lineKey(line) === selectedKey) ?? lines[0]
  const selectedUnavailable = !selectedLine || selectedLine.product.status !== 'active' || selectedLine.product.stock < selectedLine.quantity

  return (
    <div className="cart-page">
      <div className="cart-page__announcement">
        <span>TO YOU MEMBER CART</span>
        <strong>7만원 이상 구매 시 무료배송</strong>
        <span>안전한 주문 · 빠른 출고</span>
      </div>

      <header className="cart-header">
        <button type="button" onClick={onGoHome}><ArrowLeft size={17} /> 쇼핑 계속하기</button>
        <button type="button" className="cart-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <div><ShoppingBag size={18} /><span>장바구니</span><b>{cartCount}</b></div>
      </header>

      {!authSession ? (
        <main className="cart-auth-empty">
          <span><UserRound size={26} /></span>
          <small>MEMBER CART</small>
          <h1>로그인 후 장바구니를 확인해 주세요</h1>
          <p>담아둔 상품과 옵션, 수량을 계정에 안전하게 저장해 둘게요.</p>
          <button type="button" onClick={onGoToLogin}>로그인하기 <ChevronRight size={16} /></button>
          <button type="button" className="cart-auth-empty__shop" onClick={onGoHome}>상품 둘러보기</button>
        </main>
      ) : (
        <main className="cart-shell">
          <nav className="cart-breadcrumb" aria-label="현재 위치"><button type="button" onClick={onGoHome}>HOME</button><ChevronRight size={12} /><span>CART</span></nav>
          <div className="cart-heading">
            <div><small>YOUR SELECTION</small><h1>장바구니</h1></div>
            <p>주문할 상품을 선택하고 옵션과 수량을 마지막으로 확인해 주세요.</p>
          </div>

          {error ? <div className="cart-error" role="alert">{error}<button type="button" onClick={() => setError('')}>확인</button></div> : null}

          {loading ? (
            <div className="cart-loading"><LoaderCircle size={24} /><span>장바구니를 불러오고 있어요</span></div>
          ) : lines.length === 0 ? (
            <section className="cart-empty">
              <span><ShoppingBag size={28} /></span>
              <small>YOUR BAG IS EMPTY</small>
              <h2>아직 담긴 상품이 없어요</h2>
              <p>투유가 고른 이번 주의 상품을 천천히 둘러보세요.</p>
              <button type="button" onClick={onGoHome}>쇼핑 시작하기 <ChevronRight size={16} /></button>
            </section>
          ) : (
            <div className="cart-layout">
              <section className="cart-list" aria-label="장바구니 상품">
                <div className="cart-list__top"><span>상품 {lines.length}종</span><small>주문할 상품 하나를 선택해 주세요</small></div>
                {lines.map((line) => {
                  const key = lineKey(line)
                  const isPending = pendingKey === key
                  const isSelected = selectedKey === key
                  const unavailable = line.product.status !== 'active' || line.product.stock < 1
                  return (
                    <article key={key} className={`cart-line${isSelected ? ' is-selected' : ''}${unavailable ? ' is-unavailable' : ''}`}>
                      <label className="cart-line__select" aria-label={`${line.product.name} 주문 상품으로 선택`}>
                        <input type="radio" name="cart-selection" checked={isSelected} onChange={() => setSelectedKey(key)} />
                        <span><Check size={12} /></span>
                      </label>
                      <button type="button" className="cart-line__visual" onClick={() => onOpenProduct(line.productId)}>
                        <ProductArtwork art={line.product.art} palette={line.product.palette} accent={line.product.accent} imageUrl={line.product.imageUrl} name={line.product.name} />
                      </button>
                      <div className="cart-line__details">
                        <small>{line.product.category}</small>
                        <button type="button" onClick={() => onOpenProduct(line.productId)}>{line.product.name}</button>
                        <p><span>옵션</span>{line.option || '기본 옵션'}</p>
                        <em className={unavailable ? 'is-soldout' : ''}>{unavailable ? '현재 주문 불가' : `재고 ${line.product.stock}개`}</em>
                      </div>
                      <div className="cart-line__controls">
                        <div className="cart-quantity" aria-label={`${line.product.name} 수량`}>
                          <button type="button" disabled={isPending || line.quantity <= 1} onClick={() => changeQuantity(line, line.quantity - 1)} aria-label="수량 줄이기"><Minus size={14} /></button>
                          <span>{isPending ? <LoaderCircle size={14} /> : line.quantity}</span>
                          <button type="button" disabled={isPending || unavailable || line.quantity >= Math.min(99, line.product.stock)} onClick={() => changeQuantity(line, line.quantity + 1)} aria-label="수량 늘리기"><Plus size={14} /></button>
                        </div>
                        <button type="button" className="cart-line__remove" disabled={isPending} onClick={() => removeLine(line)}><Trash2 size={14} /> 삭제</button>
                      </div>
                      <div className="cart-line__price"><strong>{currencyFormatter.format(line.product.price * line.quantity)}</strong><small>{currencyFormatter.format(line.product.price)} / 개</small></div>
                    </article>
                  )
                })}
              </section>

              <aside className="cart-summary">
                <span className="cart-summary__eyebrow">ORDER SUMMARY</span>
                <h2>결제 예상 금액</h2>
                <dl>
                  <div><dt>상품 금액</dt><dd>{currencyFormatter.format(subtotal)}</dd></div>
                  <div><dt>배송비</dt><dd>{shipping ? currencyFormatter.format(shipping) : '무료'}</dd></div>
                  <div className="cart-summary__total"><dt>합계</dt><dd>{currencyFormatter.format(subtotal + shipping)}</dd></div>
                </dl>
                <div className="cart-shipping-progress">
                  <div><Truck size={16} /><span>{freeShippingRemaining > 0 ? `${currencyFormatter.format(freeShippingRemaining)} 더 담으면 무료배송` : '무료배송 혜택이 적용됐어요'}</span></div>
                  <i><span style={{ width: `${Math.min(100, subtotal / 700)}%` }} /></i>
                </div>
                <button
                  type="button"
                  className="cart-summary__checkout"
                  disabled={selectedUnavailable}
                  onClick={() => selectedLine && onCheckout(selectedLine.productId, selectedLine.quantity, selectedLine.option)}
                >
                  <span>{selectedLine ? `${selectedLine.product.name} 주문하기` : '상품을 선택해 주세요'}</span><ChevronRight size={18} />
                </button>
                <p>현재 선택한 상품부터 안전하게 주문합니다. 다른 상품은 장바구니에 그대로 보관돼요.</p>
                <div className="cart-summary__trust"><span><LockKeyhole size={15} /> 안전한 주문 정보 처리</span><span><PackageCheck size={15} /> 재고 확인 후 주문 확정</span></div>
              </aside>
            </div>
          )}
        </main>
      )}
    </div>
  )
}

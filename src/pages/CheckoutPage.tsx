import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react'
import type { CatalogProduct } from '../catalog'
import { createAdminId, type AdminOrder } from '../adminData'
import {
  hasCompleteDeliveryProfile,
  loadCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from '../customerProfile'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import { SITE_BRAND } from '../siteBrand'
import type { AuthSession } from '../authSession'
import { updateServerProfile } from '../accountApi'
import { openKoreanAddressSearch } from '../addressSearch'

interface CheckoutPageProps {
  product?: CatalogProduct
  authSession: AuthSession | null
  onGoBack: () => void
  onGoHome: () => void
  onCreateOrder: (order: AdminOrder) => Promise<AdminOrder>
  onProfileUpdated: (session: AuthSession) => void
}

type PaymentMethod = 'card' | 'kakao' | 'naver'

const DELIVERY_FEE_THRESHOLD = 70_000
const DELIVERY_FEE = 3_000

function getCheckoutSelection(product?: CatalogProduct) {
  const params = new URLSearchParams(window.location.search)
  const requestedQuantity = Number(params.get('quantity') ?? '1')
  const quantity = Number.isFinite(requestedQuantity)
    ? Math.max(1, Math.min(product?.stock ?? 99, Math.floor(requestedQuantity)))
    : 1
  const requestedOption = params.get('option') ?? ''
  const option = product?.options.includes(requestedOption)
    ? requestedOption
    : product?.options[0] ?? ''

  return { quantity, option }
}

export function CheckoutPage({ product, authSession, onGoBack, onGoHome, onCreateOrder, onProfileUpdated }: CheckoutPageProps) {
  const [profile, setProfile] = useState<CustomerProfile>(loadCustomerProfile)
  const [editingAddress, setEditingAddress] = useState(() => !hasCompleteDeliveryProfile(loadCustomerProfile()))
  const [deliveryNote, setDeliveryNote] = useState('문 앞에 놓아주세요')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const addressDetailRef = useRef<HTMLInputElement>(null)
  const selection = useMemo(() => getCheckoutSelection(product), [product])

  if (!product) {
    return (
      <div className="checkout-empty">
        <span className="eyebrow">CHECKOUT</span>
        <h1>결제할 상품을 찾을 수 없어요.</h1>
        <button type="button" className="checkout-primary" onClick={onGoHome}>스토어로 돌아가기</button>
      </div>
    )
  }

  const subtotal = product.price * selection.quantity
  const deliveryFee = subtotal >= DELIVERY_FEE_THRESHOLD ? 0 : DELIVERY_FEE
  const total = subtotal + deliveryFee

  function updateProfile(field: keyof CustomerProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function validateProfile() {
    if (profile.name.trim().length < 2) return '받으시는 분의 이름을 입력해 주세요.'
    if (profile.phone.replace(/\D/g, '').length < 9) return '연락 가능한 휴대폰 번호를 입력해 주세요.'
    if (profile.postalCode.trim().length < 3 || profile.addressLine1.trim().length < 5) return '배송 주소를 모두 입력해 주세요.'
    return ''
  }

  async function handleAddressSearch() {
    try {
      const selectedAddress = await openKoreanAddressSearch()
      if (!selectedAddress) return
      setProfile((current) => ({
        ...current,
        postalCode: selectedAddress.postalCode,
        addressLine1: selectedAddress.address,
      }))
      setError('')
      window.requestAnimationFrame(() => addressDetailRef.current?.focus())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '주소 검색을 시작하지 못했습니다.')
    }
  }

  async function persistDeliveryProfile() {
    saveCustomerProfile(profile)

    if (authSession) {
      const serverProfile = authSession.provider === 'email'
        ? profile
        : { ...profile, name: authSession.displayName, email: authSession.email }
      const account = await updateServerProfile(serverProfile)
      saveCustomerProfile(account.profile)
      setProfile(account.profile)
      onProfileUpdated(account.session)
    }
  }

  async function saveDeliveryAddress() {
    const profileError = validateProfile()
    if (profileError) {
      setError(profileError)
      return
    }
    setSubmitting(true)
    try {
      await persistDeliveryProfile()
      setEditingAddress(false)
      setError('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '배송지를 저장하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const profileError = validateProfile()
    if (profileError) {
      setError(profileError)
      setEditingAddress(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!agreed) {
      setError('주문 내용과 결제 조건 확인이 필요해요.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await persistDeliveryProfile()
      await onCreateOrder({
        id: createAdminId('ord'),
        productId: product!.id,
        productName: product!.name,
        option: selection.option,
        quantity: selection.quantity,
        total,
        customerName: profile.name.trim(),
        phone: profile.phone.trim(),
        address: `[${profile.postalCode}] ${profile.addressLine1} ${profile.addressLine2}`.trim(),
        paymentMethod,
        deliveryNote,
        status: 'paid',
        createdAt: new Date().toISOString(),
      })
      setComplete(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '주문을 완료하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (complete) {
    return (
      <div className="checkout-complete-page">
        <div className="checkout-ambient checkout-ambient--one" aria-hidden="true" />
        <div className="checkout-ambient checkout-ambient--two" aria-hidden="true" />
        <header className="checkout-header">
          <button type="button" className="checkout-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        </header>
        <main className="checkout-complete">
          <span className="checkout-complete__icon" aria-hidden="true">
            <span className="checkout-complete__sparkles">
              {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
            </span>
            <Check size={32} />
          </span>
          <span className="eyebrow">ORDER COMPLETE</span>
          <h1>주문이 완료됐어요</h1>
          <p>{profile.name}님, 주문 내용을 확인해 상품을 준비할게요.<br />배송 진행 상황은 계정에서 확인할 수 있어요.</p>
          <div className="checkout-complete__order">
            <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
            <div><small>주문 상품</small><strong>{product.name}</strong><span>{selection.option || '기본 옵션'} · {selection.quantity}개</span></div>
            <b>{currencyFormatter.format(total)}</b>
          </div>
          <button type="button" className="checkout-primary" onClick={onGoHome}>쇼핑 계속하기 <ChevronRight size={17} /></button>
        </main>
      </div>
    )
  }

  return (
    <div className="checkout-shell">
      <div className="checkout-ambient checkout-ambient--one" aria-hidden="true" />
      <div className="checkout-ambient checkout-ambient--two" aria-hidden="true" />
      <header className="checkout-header">
        <button type="button" className="checkout-header__back" onClick={onGoBack}><ArrowLeft size={17} /> 상품으로</button>
        <button type="button" className="checkout-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <span><LockKeyhole size={15} /> 안전 결제</span>
      </header>

      <main className="checkout-main">
        <div className="checkout-title">
          <div className="checkout-title__meta">
            <span className="eyebrow">QUICK CHECKOUT</span>
            <span className="checkout-title__promise"><ShieldCheck size={14} /> 안전하게 암호화된 결제</span>
          </div>
          <h1>마지막 한 번만 확인하면<br />주문이 완료돼요</h1>
          <p>저장된 배송 정보를 불러왔어요. 달라진 내용만 가볍게 확인해 주세요.</p>
          <div className="checkout-progress" aria-label="결제 진행 단계">
            <span className={editingAddress ? 'is-current' : 'is-done'} aria-current={editingAddress ? 'step' : undefined}>
              <i>{editingAddress ? '1' : <Check size={13} />}</i> 배송지 확인
            </span>
            <b aria-hidden="true" />
            <span className={!editingAddress ? 'is-current' : ''} aria-current={!editingAddress ? 'step' : undefined}><i>2</i> 결제수단</span>
            <b aria-hidden="true" />
            <span><i>3</i> 주문 완료</span>
          </div>
        </div>

        <form className="checkout-layout" onSubmit={handlePayment}>
          <div className="checkout-sections">
            <section className="checkout-section">
              <div className="checkout-section__heading">
                <div><span>01</span><div><h2>배송지</h2><p>받으실 분과 주소를 확인해 주세요.</p></div></div>
                {!editingAddress ? <button type="button" onClick={() => setEditingAddress(true)}>변경</button> : null}
              </div>

              {editingAddress ? (
                <div className="checkout-address-form">
                  <div className="checkout-field-row">
                    <label><span>받는 분</span><input value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} autoComplete="name" placeholder="이름" /></label>
                    <label><span>휴대폰 번호</span><input value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" /></label>
                  </div>
                  <div className="checkout-address-search">
                    <label className="checkout-postal"><span>우편번호</span><input readOnly value={profile.postalCode} autoComplete="postal-code" inputMode="numeric" placeholder="우편번호" /></label>
                    <button type="button" disabled={submitting} onClick={handleAddressSearch}><Search size={16} /> 주소 검색</button>
                  </div>
                  <label><span>기본 주소</span><input readOnly value={profile.addressLine1} autoComplete="street-address" placeholder="주소 검색 버튼을 눌러주세요" /></label>
                  <label><span>상세 주소</span><input ref={addressDetailRef} value={profile.addressLine2} onChange={(event) => updateProfile('addressLine2', event.target.value)} autoComplete="address-line2" placeholder="동·호수 등 상세 주소" /></label>
                  <button type="button" disabled={submitting} className="checkout-save-address" onClick={saveDeliveryAddress}>{submitting ? '저장 중…' : '이 배송지 사용하기'}</button>
                </div>
              ) : (
                <div className="checkout-saved-address">
                  <span className="checkout-saved-address__icon"><MapPin size={20} /></span>
                  <div>
                    <div><strong>{profile.name}</strong><em>기본 배송지</em></div>
                    <p>[{profile.postalCode}] {profile.addressLine1} {profile.addressLine2}</p>
                    <span>{profile.phone}</span>
                  </div>
                  <Check size={18} />
                </div>
              )}

              <label className="checkout-delivery-note">
                <span><MessageSquareText size={16} /> 배송 요청사항</span>
                <select value={deliveryNote} onChange={(event) => setDeliveryNote(event.target.value)}>
                  <option>문 앞에 놓아주세요</option>
                  <option>경비실에 맡겨주세요</option>
                  <option>배송 전에 연락해 주세요</option>
                  <option>요청사항 없음</option>
                </select>
              </label>
            </section>

            <section className="checkout-section">
              <div className="checkout-section__heading">
                <div><span>02</span><div><h2>결제수단</h2><p>원하는 방법 하나만 선택해 주세요.</p></div></div>
              </div>
              <div className="checkout-payment-methods">
                <button type="button" className={paymentMethod === 'card' ? 'is-selected' : ''} onClick={() => setPaymentMethod('card')}><CreditCard size={20} /><span><strong>신용·체크카드</strong><small>일반 카드 결제</small></span>{paymentMethod === 'card' ? <span className="checkout-payment-check"><Check size={14} /></span> : null}</button>
                <button type="button" className={paymentMethod === 'kakao' ? 'is-selected' : ''} onClick={() => setPaymentMethod('kakao')}><img className="checkout-pay-logo" src={`${import.meta.env.BASE_URL}logos/kakao.svg`} alt="" /><span><strong>카카오페이</strong><small>카카오로 빠른 결제</small></span>{paymentMethod === 'kakao' ? <span className="checkout-payment-check"><Check size={14} /></span> : null}</button>
                <button type="button" className={paymentMethod === 'naver' ? 'is-selected' : ''} onClick={() => setPaymentMethod('naver')}><img className="checkout-pay-logo" src={`${import.meta.env.BASE_URL}logos/naver.svg`} alt="" /><span><strong>네이버페이</strong><small>네이버로 빠른 결제</small></span>{paymentMethod === 'naver' ? <span className="checkout-payment-check"><Check size={14} /></span> : null}</button>
              </div>
              <p className="checkout-payment-note"><ShieldCheck size={16} /> 결제 정보는 암호화되어 안전하게 처리됩니다.</p>
            </section>
          </div>

          <aside className="checkout-summary">
            <span className="eyebrow">ORDER SUMMARY</span>
            <h2>주문 요약</h2>
            <div className="checkout-product">
              <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
              <div><small>{product.category}</small><strong>{product.name}</strong><span>{selection.option || '기본 옵션'} · {selection.quantity}개</span></div>
            </div>
            <div className="checkout-delivery-preview">
              <span><Truck size={18} /></span>
              <div><strong>결제 후 바로 준비할게요</strong><small>평균 1–2 영업일 이내 출고</small></div>
            </div>
            <dl>
              <div><dt>상품 금액</dt><dd>{currencyFormatter.format(subtotal)}</dd></div>
              <div><dt>배송비</dt><dd>{deliveryFee === 0 ? '무료' : currencyFormatter.format(deliveryFee)}</dd></div>
              <div className="checkout-summary__total"><dt>총 결제금액</dt><dd>{currencyFormatter.format(total)}</dd></div>
            </dl>
            <label className="checkout-agreement"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>주문 상품, 배송지와 결제 금액을 확인했습니다.</span></label>
            {error ? <p className="checkout-error" role="alert">{error}</p> : null}
            <button type="submit" disabled={submitting} className="checkout-primary">{submitting ? '주문 처리 중…' : `${currencyFormatter.format(total)} 결제하기`} <ChevronRight size={17} /></button>
            <p className="checkout-summary__secure"><Smartphone size={14} /> 선택한 결제수단 화면으로 바로 이어집니다.</p>
          </aside>
        </form>
      </main>
    </div>
  )
}

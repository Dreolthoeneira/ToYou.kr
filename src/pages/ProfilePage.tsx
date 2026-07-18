import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { AuthSession } from '../authSession'
import { updateServerProfile } from '../accountApi'
import { loadCustomerProfile, saveCustomerProfile, type CustomerProfile } from '../customerProfile'
import { SITE_BRAND } from '../siteBrand'

interface ProfilePageProps {
  authSession: AuthSession | null
  onGoHome: () => void
  onGoToLogin: () => void
  onSave: (session: AuthSession) => void
  onLogout: () => void
}

function getInitialProfile(session: AuthSession): CustomerProfile {
  const savedProfile = loadCustomerProfile()
  const belongsToCurrentMember = !session.email
    || !savedProfile.email
    || savedProfile.email.toLowerCase() === session.email.toLowerCase()

  if (!belongsToCurrentMember) {
    return {
      email: session.email,
      name: session.displayName,
      phone: '',
      postalCode: '',
      addressLine1: '',
      addressLine2: '',
    }
  }

  return {
    ...savedProfile,
    name: savedProfile.name || session.displayName,
    email: savedProfile.email || session.email,
  }
}

export function ProfilePage({ authSession, onGoHome, onGoToLogin, onSave, onLogout }: ProfilePageProps) {
  if (!authSession) {
    return (
      <main className="profile-page profile-page--signed-out">
        <button type="button" className="profile-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <section className="profile-signed-out">
          <span><UserRound size={25} /></span>
          <small>MEMBER ACCOUNT</small>
          <h1>로그인이 필요해요</h1>
          <p>회원정보를 확인하거나 수정하려면 먼저 로그인해 주세요.</p>
          <button type="button" onClick={onGoToLogin}>로그인하기 <ChevronRight size={16} /></button>
        </section>
      </main>
    )
  }

  return <ProfileEditor authSession={authSession} onGoHome={onGoHome} onSave={onSave} onLogout={onLogout} />
}

function ProfileEditor({ authSession, onGoHome, onSave, onLogout }: Omit<ProfilePageProps, 'authSession' | 'onGoToLogin'> & { authSession: AuthSession }) {
  const [profile, setProfile] = useState<CustomerProfile>(() => getInitialProfile(authSession))
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const isSocialAccount = authSession.provider !== 'email'
  const initials = useMemo(() => (profile.name.trim() || authSession.displayName).slice(0, 2), [authSession.displayName, profile.name])
  const joinedDate = useMemo(
    () => new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(new Date(authSession.loggedInAt)),
    [authSession.loggedInAt],
  )

  function updateProfile<Key extends keyof CustomerProfile>(key: Key, value: CustomerProfile[Key]) {
    setProfile((current) => ({ ...current, [key]: value }))
    setError('')
    setSaved(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isSocialAccount && profile.name.trim().length < 2) {
      setError('이름을 2자 이상 입력해 주세요.')
      return
    }

    if (!isSocialAccount && profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      setError('올바른 이메일 주소를 입력해 주세요.')
      return
    }

    if (profile.phone && profile.phone.replace(/\D/g, '').length < 9) {
      setError('연락 가능한 휴대폰 번호를 입력해 주세요.')
      return
    }

    const trimmedProfile = Object.fromEntries(
      Object.entries(profile).map(([key, value]) => [key, value.trim()]),
    ) as unknown as CustomerProfile
    const nextProfile = isSocialAccount
      ? { ...trimmedProfile, name: authSession.displayName, email: authSession.email }
      : trimmedProfile

    setSaving(true)
    setError('')

    try {
      const account = await updateServerProfile(nextProfile)
      saveCustomerProfile(account.profile)
      setProfile(account.profile)
      onSave(account.session)
      setSaved(true)
    } catch (requestError) {
      setSaved(false)
      setError(requestError instanceof Error ? requestError.message : '회원정보를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    onLogout()
    onGoHome()
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button type="button" className="profile-header__back" onClick={onGoHome}><ArrowLeft size={17} /> 쇼핑 계속하기</button>
        <button type="button" className="profile-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <button type="button" className="profile-header__logout" onClick={handleLogout}>로그아웃 <LogOut size={15} /></button>
      </header>

      <main className="profile-shell">
        <aside className="profile-summary">
          <span className="profile-summary__eyebrow">MY ACCOUNT</span>
          <div className="profile-summary__avatar" aria-hidden="true">{initials}</div>
          <h1>{profile.name || authSession.displayName}<small>님</small></h1>
          <p>{profile.email || '이메일을 등록해 주세요'}</p>
          <div className="profile-summary__status"><i /> 로그인 중</div>

          <dl>
            <div><dt>회원 등급</dt><dd>TO YOU MEMBER</dd></div>
            <div><dt>가입 시점</dt><dd>{joinedDate}</dd></div>
            <div><dt>가입 방식</dt><dd>{authSession.provider === 'email' ? '이메일' : authSession.provider}</dd></div>
          </dl>

          <div className="profile-summary__benefit">
            <span>사용 가능한 혜택</span>
            <strong>2,000<small> Points</small></strong>
            <p>다음 주문에서 바로 사용할 수 있어요.</p>
          </div>
        </aside>

        <section className="profile-editor">
          <header className="profile-editor__heading">
            <div><span>ACCOUNT SETTINGS</span><h2>회원정보 수정</h2></div>
            <p>{isSocialAccount ? `${authSession.provider} 간편가입 계정의 이름과 이메일은 해당 서비스에서 관리됩니다.` : '이름을 변경하면 스토어 상단의 회원 이름에도 바로 반영됩니다.'}</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <section className="profile-form-section">
              <div className="profile-form-section__title"><UserRound size={18} /><div><h3>기본 정보</h3><p>주문 안내와 계정 확인에 사용됩니다.</p></div></div>
              {isSocialAccount ? <div className="profile-social-lock"><ShieldCheck size={18} /><div><strong>{authSession.provider} 간편가입으로 연결된 정보예요.</strong><span>이름과 이메일은 {authSession.provider} 계정에서 변경할 수 있어요.</span></div></div> : null}
              <div className="profile-field-grid">
                <label><span>이름 <em className={isSocialAccount ? 'is-locked' : ''}>{isSocialAccount ? '변경 불가' : '필수'}</em></span><input autoFocus={!isSocialAccount} disabled={isSocialAccount} value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} autoComplete="name" placeholder="김승우" /></label>
                <label><span>이메일 {isSocialAccount ? <em className="is-locked">변경 불가</em> : null}</span><div className="profile-input-icon"><Mail size={16} /><input disabled={isSocialAccount} type="email" value={profile.email} onChange={(event) => updateProfile('email', event.target.value)} autoComplete="email" placeholder="hello@example.com" /></div></label>
                <label className="profile-field-grid__wide"><span>휴대폰 번호</span><div className="profile-input-icon"><Phone size={16} /><input type="tel" value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" /></div></label>
              </div>
            </section>

            <section className="profile-form-section">
              <div className="profile-form-section__title"><MapPin size={18} /><div><h3>기본 배송지</h3><p>결제 시 자동으로 불러올 주소입니다.</p></div></div>
              <div className="profile-field-grid">
                <label className="profile-field-grid__postal"><span>우편번호</span><input value={profile.postalCode} onChange={(event) => updateProfile('postalCode', event.target.value)} autoComplete="postal-code" inputMode="numeric" placeholder="06236" /></label>
                <label className="profile-field-grid__wide"><span>기본 주소</span><input value={profile.addressLine1} onChange={(event) => updateProfile('addressLine1', event.target.value)} autoComplete="street-address" placeholder="서울시 강남구 테헤란로" /></label>
                <label className="profile-field-grid__wide"><span>상세 주소</span><input value={profile.addressLine2} onChange={(event) => updateProfile('addressLine2', event.target.value)} autoComplete="address-line2" placeholder="동·호수 등 상세 주소" /></label>
              </div>
            </section>

            <div className="profile-security-note"><ShieldCheck size={18} /><div><strong>회원정보는 이 기기에 안전하게 저장돼요.</strong><span>저장한 배송지는 다음 결제부터 자동으로 입력됩니다.</span></div><PackageCheck size={19} /></div>

            {error ? <p className="profile-form-message is-error" role="alert">{error}</p> : null}
            {saved ? <p className="profile-form-message is-saved" role="status"><Check size={16} /> 회원정보가 저장되었습니다.</p> : null}

            <div className="profile-form-actions">
              <button type="button" onClick={onGoHome}>취소</button>
              <button type="submit" disabled={saving}>{saving ? '저장 중…' : '변경사항 저장'} <Check size={16} /></button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

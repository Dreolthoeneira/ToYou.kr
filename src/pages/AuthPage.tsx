import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import type { AuthSession } from '../authSession'
import { AccountApiError, loginWithEmail, loginWithSocial, requestPasswordReset, signupWithEmail, updatePassword } from '../accountApi'
import { openKoreanAddressSearch } from '../addressSearch'
import { LegalDocumentModal, type LegalDocumentType } from '../components/LegalDocumentModal'
import { saveCustomerProfile } from '../customerProfile'
import { useI18n } from '../i18n'
import { SITE_BRAND } from '../siteBrand'

interface AuthPageProps {
  mode: 'login' | 'signup'
  onGoHome: () => void
  onSwitchMode: () => void
  onAuthComplete: (session: AuthSession) => void
}

const authText = {
  ko: {
    login: {
      sideEyebrow: 'WELCOME BACK',
      sideTitle: '다시 만나서\n반가워요',
      sideBody: '로그인하면 주문 현황, 찜한 상품, 배송 정보를 한곳에서 편하게 확인할 수 있어요.',
      title: '이메일로 로그인해 주세요',
      description: '가입할 때 사용한 이메일과 비밀번호를 입력해 주세요.',
      email: '이메일',
      emailPlaceholder: 'you@example.com',
      password: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      forgot: '비밀번호를 잊으셨나요?',
      submit: '로그인',
      socialDivider: '또는 이메일로 로그인',
      switchPrompt: '아직 투유 계정이 없나요?',
      switchAction: '회원가입',
      completeEyebrow: 'LOGIN COMPLETE',
      completeTitle: '로그인했어요',
      completeBody: '이제 저장한 상품과 주문 내역을 이어서 확인할 수 있어요.',
    },
    signup: {
      sideEyebrow: 'JOIN TO YOU',
      sideTitle: '정보는 한 번만,\n결제는 더 빠르게',
      sideBody: '주문과 배송에 꼭 필요한 정보만 미리 저장해 두고, 결제할 때는 확인만 하면 돼요.',
      steps: [
        { title: '기본 정보를 알려주세요', description: '주문 확인과 배송 안내에 필요한 정보예요.' },
        { title: '받으실 주소를 입력해 주세요', description: '기본 배송지로 저장해 다음 결제부터 자동으로 불러와요.' },
        { title: '비밀번호를 만들어 주세요', description: '영문과 숫자를 포함해 8자 이상 입력해 주세요.' },
      ],
      fields: {
        email: '이메일',
        emailPlaceholder: 'you@example.com',
        name: '이름',
        namePlaceholder: '받으시는 분의 이름',
        phone: '휴대폰 번호',
        phonePlaceholder: '010-1234-5678',
        postalCode: '우편번호',
        postalCodePlaceholder: '우편번호',
        addressLine1: '기본 주소',
        addressLine1Placeholder: '도로명 주소를 입력하세요',
        addressLine2: '상세 주소',
        addressLine2Placeholder: '동·호수 등 상세 주소',
        password: '비밀번호',
        passwordPlaceholder: '8자 이상 입력하세요',
        confirmPassword: '비밀번호 확인',
        confirmPlaceholder: '한 번 더 입력하세요',
      },
      next: '다음',
      submit: '가입 완료',
      terms: '[필수] 이용약관 및 개인정보 처리방침에 동의합니다.',
      switchPrompt: '이미 계정이 있나요?',
      switchAction: '로그인',
      socialDivider: '또는 이메일로 가입',
      socialCompleteEyebrow: 'QUICK SIGN UP COMPLETE',
      socialCompleteTitle: '간편 가입이 완료됐어요',
      socialCompleteBody: '계정 연결이 완료됐어요. 배송지는 첫 주문에서 입력하면 다음부터 자동으로 불러올게요.',
      completeEyebrow: 'WELCOME TO TO YOU',
      completeTitle: '가입과 배송지 저장이 완료됐어요',
      completeBody: '이제 상품을 고른 뒤 저장된 배송지만 확인하면 빠르게 결제할 수 있어요.',
    },
    header: { home: '스토어로 돌아가기' },
    benefits: [
      ['배송지 자동 입력', '결제할 때 다시 입력하지 않아요'],
      ['안전한 정보 관리', '주문에 필요한 정보만 저장'],
      ['빠른 결제 흐름', '배송지 확인 후 바로 결제'],
    ],
  },
  en: {
    login: {
      sideEyebrow: 'WELCOME BACK',
      sideTitle: 'Good to see\nyou again',
      sideBody: 'Sign in to keep orders, saved items, and delivery details together.',
      title: 'Sign in with your email',
      description: 'Enter the email and password you used to create your account.',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      forgot: 'Forgot your password?',
      submit: 'Sign in',
      socialDivider: 'or sign in with email',
      switchPrompt: 'New to To You?',
      switchAction: 'Create account',
      completeEyebrow: 'LOGIN COMPLETE',
      completeTitle: 'You are signed in',
      completeBody: 'Your saved products and order history are ready.',
    },
    signup: {
      sideEyebrow: 'JOIN TO YOU',
      sideTitle: 'Enter it once,\ncheckout faster',
      sideBody: 'Save only the essentials for orders and delivery, then simply review them at checkout.',
      steps: [
        { title: 'Tell us the essentials', description: 'We use these details for order and delivery updates.' },
        { title: 'Add your delivery address', description: 'We save it as your default so the next checkout is faster.' },
        { title: 'Create your password', description: 'Use at least 8 characters with letters and numbers.' },
      ],
      fields: {
        email: 'Email',
        emailPlaceholder: 'you@example.com',
        name: 'Name',
        namePlaceholder: 'Recipient name',
        phone: 'Mobile number',
        phonePlaceholder: '010-1234-5678',
        postalCode: 'Postal code',
        postalCodePlaceholder: 'Postal code',
        addressLine1: 'Address',
        addressLine1Placeholder: 'Street address',
        addressLine2: 'Address details',
        addressLine2Placeholder: 'Apartment, suite, etc.',
        password: 'Password',
        passwordPlaceholder: 'At least 8 characters',
        confirmPassword: 'Confirm password',
        confirmPlaceholder: 'Enter it again',
      },
      next: 'Continue',
      submit: 'Create account',
      terms: '[Required] I agree to the Terms and Privacy Policy.',
      switchPrompt: 'Already have an account?',
      switchAction: 'Sign in',
      socialDivider: 'or sign up with email',
      socialCompleteEyebrow: 'QUICK SIGN UP COMPLETE',
      socialCompleteTitle: 'Your quick sign-up is complete',
      socialCompleteBody: 'Your account is connected. Add a delivery address at checkout and we’ll remember it next time.',
      completeEyebrow: 'WELCOME TO TO YOU',
      completeTitle: 'Your account and address are ready',
      completeBody: 'At checkout, simply review your saved delivery details and pay.',
    },
    header: { home: 'Back to store' },
    benefits: [
      ['Address autofill', 'No need to type it again'],
      ['Only the essentials', 'Order details stored safely'],
      ['Faster checkout', 'Review your address and pay'],
    ],
  },
} as const

function BrandMark({ onGoHome }: { onGoHome: () => void }) {
  return <button type="button" className="toss-auth-header__brand" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
}

export function AuthPage({ mode, onGoHome, onSwitchMode, onAuthComplete }: AuthPageProps) {
  const { locale } = useI18n()
  const copy = locale === 'ko' ? authText.ko : authText.en
  const isLogin = mode === 'login'
  const isRecovery = isLogin && new URLSearchParams(window.location.search).get('recovery') === '1'
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [socialProvider, setSocialProvider] = useState<'Kakao' | 'Naver' | null>(null)
  const [legalDocument, setLegalDocument] = useState<LegalDocumentType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const addressDetailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setStep(0)
    setError('')
    setComplete(false)
    setSocialProvider(null)
    setLegalDocument(null)
    setResetEmailSent(false)
  }, [mode])

  async function handleSocialAuth(provider: 'Kakao' | 'Naver') {
    if (!isLogin && !agreed) {
      setError(locale === 'ko' ? '간편가입을 계속하려면 필수 약관에 동의해 주세요.' : 'Agree to the required terms before quick sign-up.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const account = await loginWithSocial(provider)
      if (!account) return
      saveCustomerProfile(account.profile)
      onAuthComplete(account.session)
      setSocialProvider(provider)
      setComplete(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '간편가입을 처리하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function getSocialLabel(provider: 'Kakao' | 'Naver') {
    if (locale === 'ko') return `${provider}로 간편 ${isLogin ? '로그인' : '가입'}`
    return `${isLogin ? 'Sign in' : 'Sign up'} with ${provider}`
  }

  function validateEmail() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validatePhone() {
    return phone.replace(/\D/g, '').length >= 9
  }

  async function handleAddressSearch() {
    try {
      const selectedAddress = await openKoreanAddressSearch()
      if (!selectedAddress) return
      setPostalCode(selectedAddress.postalCode)
      setAddressLine1(selectedAddress.address)
      setError('')
      window.requestAnimationFrame(() => addressDetailRef.current?.focus())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '주소 검색을 시작하지 못했습니다.')
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateEmail()) {
      setError(locale === 'ko' ? '올바른 이메일 주소를 입력해 주세요.' : 'Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError(locale === 'ko' ? '비밀번호를 8자 이상 입력해 주세요.' : 'Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const account = await loginWithEmail(email.trim(), password)
      saveCustomerProfile(account.profile)
      onAuthComplete(account.session)
      setComplete(true)
    } catch (requestError) {
      if (requestError instanceof AccountApiError && requestError.code === 'invalid_credentials') {
        setError(locale === 'ko' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : 'The email or password is incorrect.')
      } else if (requestError instanceof AccountApiError && requestError.code === 'email_not_confirmed') {
        setError(locale === 'ko' ? '이메일 인증을 완료한 뒤 로그인해 주세요.' : 'Confirm your email before signing in.')
      } else {
        setError(requestError instanceof Error ? requestError.message : '로그인하지 못했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    if (!validateEmail()) {
      setError(locale === 'ko' ? '가입한 이메일 주소를 먼저 입력해 주세요.' : 'Enter the email address you used to sign up.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await requestPasswordReset(email.trim())
      setResetEmailSent(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '비밀번호 재설정 메일을 보내지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(locale === 'ko' ? '영문과 숫자를 포함해 8자 이상 입력해 주세요.' : 'Use at least 8 characters with letters and numbers.')
      return
    }
    if (password !== confirmPassword) {
      setError(locale === 'ko' ? '비밀번호가 서로 일치하지 않아요.' : 'Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const account = await updatePassword(password)
      saveCustomerProfile(account.profile)
      onAuthComplete(account.session)
      setComplete(true)
    } catch (requestError) {
      if (requestError instanceof AccountApiError && requestError.code === 'session_not_found') {
        setError(locale === 'ko' ? '재설정 링크가 만료되었습니다. 로그인 화면에서 새 메일을 요청해 주세요.' : 'This reset link has expired. Request a new email from the sign-in page.')
      } else {
        setError(requestError instanceof Error ? requestError.message : '비밀번호를 변경하지 못했습니다.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === 0) {
      if (!validateEmail()) {
        setError(locale === 'ko' ? '올바른 이메일 주소를 입력해 주세요.' : 'Enter a valid email address.')
        return
      }
      if (name.trim().length < 2) {
        setError(locale === 'ko' ? '받으시는 분의 이름을 2자 이상 입력해 주세요.' : 'Enter the recipient name.')
        return
      }
      if (!validatePhone()) {
        setError(locale === 'ko' ? '연락 가능한 휴대폰 번호를 입력해 주세요.' : 'Enter a valid mobile number.')
        return
      }
    }

    if (step === 1) {
      if (postalCode.trim().length < 3 || addressLine1.trim().length < 5) {
        setError(locale === 'ko' ? '우편번호와 기본 주소를 입력해 주세요.' : 'Enter a postal code and street address.')
        return
      }
    }

    if (step === 2) {
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setError(locale === 'ko' ? '영문과 숫자를 포함해 8자 이상 입력해 주세요.' : 'Use at least 8 characters with letters and numbers.')
        return
      }
      if (password !== confirmPassword) {
        setError(locale === 'ko' ? '비밀번호가 서로 일치하지 않아요.' : 'Passwords do not match.')
        return
      }
      if (!agreed) {
        setError(locale === 'ko' ? '약관 동의가 필요합니다.' : 'You need to agree to the terms.')
        return
      }

      const nextProfile = {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
        postalCode: postalCode.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
      }

      setSubmitting(true)
      setError('')

      try {
        const account = await signupWithEmail(nextProfile, password)
        saveCustomerProfile(account.profile)
        onAuthComplete(account.session)
        setComplete(true)
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : '회원가입을 처리하지 못했습니다.')
      } finally {
        setSubmitting(false)
      }
      return
    }

    setError('')
    setStep((current) => current + 1)
  }

  const signupStep = copy.signup.steps[step]
  const signupFields = copy.signup.fields
  const legalConsent = (
    <div className="toss-auth-legal-consent">
      <label className="toss-auth-terms">
        <input
          type="checkbox"
          checked={agreed}
          aria-required="true"
          onChange={(event) => {
            setAgreed(event.target.checked)
            if (event.target.checked) setError('')
          }}
        />
        <span>{copy.signup.terms}</span>
      </label>
      <div className="toss-auth-legal-links" aria-label={locale === 'ko' ? '가입 약관 문서' : 'Registration documents'}>
        <button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('terms')}>
          {locale === 'ko' ? '이용약관 보기' : 'View Terms'}
        </button>
        <i aria-hidden="true" />
        <button type="button" aria-haspopup="dialog" onClick={() => setLegalDocument('privacy')}>
          {locale === 'ko' ? '개인정보 처리방침 보기' : 'View Privacy Policy'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="toss-auth-page">
      <header className="toss-auth-header">
        <BrandMark onGoHome={onGoHome} />
        <div>
          <span>{isLogin ? copy.login.switchPrompt : copy.signup.switchPrompt}</span>
          <button type="button" onClick={onSwitchMode}>{isLogin ? copy.login.switchAction : copy.signup.switchAction}</button>
          <button type="button" className="toss-auth-header__home" onClick={onGoHome}>{copy.header.home}</button>
        </div>
      </header>

      <main className="toss-auth-layout">
        <section className="toss-auth-visual">
          <div className="toss-auth-visual__copy">
            <span className="eyebrow">{isLogin ? copy.login.sideEyebrow : copy.signup.sideEyebrow}</span>
            <h1>{(isLogin ? copy.login.sideTitle : copy.signup.sideTitle).split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
            <p>{isLogin ? copy.login.sideBody : copy.signup.sideBody}</p>
          </div>

          <div className="toss-auth-visual__card">
            <div className="toss-auth-order-card">
              <span className="toss-auth-order-card__icon">{isLogin ? <ShoppingBag size={21} /> : <MapPin size={21} />}</span>
              <div><small>{isLogin ? 'TO YOU ORDER' : 'DEFAULT ADDRESS'}</small><strong>{locale === 'ko' ? (isLogin ? '내 주문을 한곳에서' : '배송지는 한 번만 입력') : (isLogin ? 'Every order in one place' : 'Enter your address once')}</strong></div>
              <span className="toss-auth-order-card__status"><Check size={13} /> READY</span>
            </div>
            <div className="toss-auth-benefits">
              {[PackageCheck, ShieldCheck, LockKeyhole].map((Icon, index) => (
                <article key={copy.benefits[index][0]}><Icon size={18} /><div><strong>{copy.benefits[index][0]}</strong><span>{copy.benefits[index][1]}</span></div></article>
              ))}
            </div>
          </div>
        </section>

        <section className="toss-auth-panel-shell">
          <div className="toss-auth-panel">
            {complete ? (
              <div className="toss-auth-complete">
                <span className="toss-auth-complete__check"><Check size={28} /></span>
                <span className="eyebrow">{isRecovery ? 'PASSWORD UPDATED' : isLogin ? copy.login.completeEyebrow : socialProvider ? copy.signup.socialCompleteEyebrow : copy.signup.completeEyebrow}</span>
                <h2>{isRecovery ? (locale === 'ko' ? '새 비밀번호로 변경했어요' : 'Your password is updated') : isLogin ? copy.login.completeTitle : socialProvider ? copy.signup.socialCompleteTitle : copy.signup.completeTitle}</h2>
                <p>{isRecovery ? (locale === 'ko' ? '이제 새 비밀번호로 로그인할 수 있어요.' : 'You can now sign in with your new password.') : isLogin ? copy.login.completeBody : socialProvider ? copy.signup.socialCompleteBody : copy.signup.completeBody}</p>
                <button type="button" className="toss-auth-primary" onClick={onGoHome}>{copy.header.home} <ArrowRight size={17} /></button>
              </div>
            ) : isRecovery ? (
              <>
                <div className="toss-auth-panel__heading">
                  <span className="eyebrow">PASSWORD RESET</span>
                  <h2>{locale === 'ko' ? '새 비밀번호를 입력해 주세요' : 'Enter a new password'}</h2>
                  <p>{locale === 'ko' ? '영문과 숫자를 포함해 8자 이상으로 만들어 주세요.' : 'Use at least 8 characters with letters and numbers.'}</p>
                </div>
                <form className="toss-auth-form toss-auth-form--recovery" onSubmit={handlePasswordUpdate} noValidate>
                  <label><span>{locale === 'ko' ? '새 비밀번호' : 'New password'}</span><div className="toss-auth-password"><input autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={locale === 'ko' ? '8자 이상 입력하세요' : 'At least 8 characters'} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
                  <label><span>{locale === 'ko' ? '새 비밀번호 확인' : 'Confirm new password'}</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={locale === 'ko' ? '한 번 더 입력하세요' : 'Enter it again'} autoComplete="new-password" /></label>
                  {error ? <p className="toss-auth-error" role="alert">{error}</p> : null}
                  <button type="submit" disabled={submitting} className="toss-auth-primary">{submitting ? (locale === 'ko' ? '변경 중…' : 'Updating…') : (locale === 'ko' ? '비밀번호 변경' : 'Update password')} <ArrowRight size={17} /></button>
                </form>
              </>
            ) : isLogin ? (
              <>
                <div className="toss-auth-panel__heading">
                  <span className="eyebrow">LOGIN</span>
                  <h2>{copy.login.title}</h2>
                  <p>{copy.login.description}</p>
                </div>

                <div className="toss-auth-social">
                  <button type="button" disabled={submitting} aria-label={getSocialLabel('Kakao')} onClick={() => handleSocialAuth('Kakao')}><img src={`${import.meta.env.BASE_URL}logos/kakao.svg`} alt="" /><span>Kakao</span></button>
                  <button type="button" disabled={submitting} aria-label={getSocialLabel('Naver')} onClick={() => handleSocialAuth('Naver')}><img src={`${import.meta.env.BASE_URL}logos/naver.svg`} alt="" /><span>Naver</span></button>
                </div>
                <div className="toss-auth-divider"><span>{copy.login.socialDivider}</span></div>

                <form className="toss-auth-form" onSubmit={handleLogin} noValidate>
                  <label><span>{copy.login.email}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.login.emailPlaceholder} autoComplete="email" /></label>
                  <label><span>{copy.login.password}</span><div className="toss-auth-password"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy.login.passwordPlaceholder} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
                  <button type="button" disabled={submitting} className="toss-auth-forgot" onClick={handleForgotPassword}>{resetEmailSent ? (locale === 'ko' ? '재설정 메일 다시 보내기' : 'Send the reset email again') : copy.login.forgot}</button>
                  {resetEmailSent ? <p className="toss-auth-success" role="status">{locale === 'ko' ? '비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 눌러 새 비밀번호를 설정해 주세요.' : 'We sent a password reset email. Open its link to choose a new password.'}</p> : null}
                  {error ? <p className="toss-auth-error" role="alert">{error}</p> : null}
                  <button type="submit" disabled={submitting} className="toss-auth-primary">{submitting ? (locale === 'ko' ? '확인 중…' : 'Signing in…') : copy.login.submit} <ArrowRight size={17} /></button>
                </form>
              </>
            ) : (
              <>
                <div className="toss-auth-progress" aria-label={`Step ${step + 1} of 3`}><span>{step + 1} / 3</span><div>{[0, 1, 2].map((item) => <i key={item} className={item <= step ? 'is-active' : ''} />)}</div></div>
                <div className="toss-auth-panel__heading">
                  <span className="eyebrow">SIGN UP</span>
                  <h2>{signupStep.title}</h2>
                  <p>{signupStep.description}</p>
                </div>

                {step === 0 ? (
                  <>
                    <div className="toss-auth-social toss-auth-social--signup">
                      <button type="button" disabled={submitting} aria-label={getSocialLabel('Kakao')} onClick={() => handleSocialAuth('Kakao')}><img src={`${import.meta.env.BASE_URL}logos/kakao.svg`} alt="" /><span>Kakao</span></button>
                      <button type="button" disabled={submitting} aria-label={getSocialLabel('Naver')} onClick={() => handleSocialAuth('Naver')}><img src={`${import.meta.env.BASE_URL}logos/naver.svg`} alt="" /><span>Naver</span></button>
                    </div>
                    {legalConsent}
                    <div className="toss-auth-divider toss-auth-divider--signup"><span>{copy.signup.socialDivider}</span></div>
                  </>
                ) : null}

                <form className="toss-auth-form toss-auth-form--signup" onSubmit={handleSignup} noValidate>
                  {step === 0 ? (
                    <div className="toss-auth-field-grid">
                      <label className="toss-auth-field-grid__wide"><span>{signupFields.email}</span><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={signupFields.emailPlaceholder} autoComplete="email" /></label>
                      <label><span>{signupFields.name}</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={signupFields.namePlaceholder} autoComplete="name" /></label>
                      <label><span>{signupFields.phone}</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={signupFields.phonePlaceholder} autoComplete="tel" inputMode="tel" /></label>
                    </div>
                  ) : null}
                  {step === 1 ? (
                    <div className="toss-auth-field-grid toss-auth-field-grid--address">
                      <div className="toss-auth-address-search toss-auth-field-grid__wide">
                        <label className="toss-auth-field-grid__postal"><span>{signupFields.postalCode}</span><input readOnly type="text" value={postalCode} placeholder={signupFields.postalCodePlaceholder} autoComplete="postal-code" inputMode="numeric" /></label>
                        <button autoFocus type="button" disabled={submitting} onClick={handleAddressSearch}><Search size={16} /> {locale === 'ko' ? '주소 검색' : 'Search address'}</button>
                      </div>
                      <label className="toss-auth-field-grid__wide"><span>{signupFields.addressLine1}</span><input readOnly type="text" value={addressLine1} placeholder={signupFields.addressLine1Placeholder} autoComplete="street-address" /></label>
                      <label className="toss-auth-field-grid__wide"><span>{signupFields.addressLine2}</span><input ref={addressDetailRef} type="text" value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder={signupFields.addressLine2Placeholder} autoComplete="address-line2" /></label>
                      <p className="toss-auth-address-note"><MapPin size={15} /> {locale === 'ko' ? '주소 검색 후 상세 주소만 입력해 주세요.' : 'Search for an address, then add the apartment or unit.'}</p>
                    </div>
                  ) : null}
                  {step === 2 ? (
                    <>
                      <label><span>{signupFields.password}</span><div className="toss-auth-password"><input autoFocus type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={signupFields.passwordPlaceholder} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
                      <label><span>{signupFields.confirmPassword}</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={signupFields.confirmPlaceholder} autoComplete="new-password" /></label>
                      {legalConsent}
                    </>
                  ) : null}
                  {error ? <p className="toss-auth-error" role="alert">{error}</p> : null}
                  <div className="toss-auth-form__actions">
                    {step > 0 ? <button type="button" className="toss-auth-back" onClick={() => { setStep((current) => current - 1); setError('') }}><ArrowLeft size={17} /> {locale === 'ko' ? '이전' : 'Back'}</button> : null}
                    <button type="submit" disabled={submitting} className="toss-auth-primary">{submitting ? (locale === 'ko' ? '저장 중…' : 'Saving…') : step === 2 ? copy.signup.submit : copy.signup.next} <ArrowRight size={17} /></button>
                  </div>
                </form>
              </>
            )}

            {!complete ? <div className="toss-auth-switch"><span>{isLogin ? copy.login.switchPrompt : copy.signup.switchPrompt}</span><button type="button" onClick={onSwitchMode}>{isLogin ? copy.login.switchAction : copy.signup.switchAction}</button></div> : null}
          </div>
        </section>
      </main>
      {legalDocument ? <LegalDocumentModal documentType={legalDocument} locale={locale} onClose={() => setLegalDocument(null)} /> : null}
    </div>
  )
}

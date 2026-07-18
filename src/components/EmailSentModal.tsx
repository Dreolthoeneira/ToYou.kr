import { useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, Mail, RefreshCw, ShieldCheck, X } from 'lucide-react'

export type EmailSentKind = 'confirmation' | 'recovery'

interface EmailSentModalProps {
  kind: EmailSentKind
  email: string
  locale: string
  onClose: () => void
  onResend: () => Promise<void>
}

const inboxProviders: Array<{ domains: string[]; url: string }> = [
  { domains: ['gmail.com', 'googlemail.com'], url: 'https://mail.google.com/' },
  { domains: ['naver.com'], url: 'https://mail.naver.com/' },
  { domains: ['daum.net', 'hanmail.net', 'kakao.com'], url: 'https://mail.daum.net/' },
  { domains: ['nate.com'], url: 'https://mail.nate.com/' },
  { domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'], url: 'https://outlook.live.com/mail/' },
]

function getInbox(email: string) {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? ''
  const provider = inboxProviders.find((item) => item.domains.includes(domain))
  const isYahoo = /^yahoo\.[a-z.]+$/.test(domain)
  const isSafeDomain = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)

  return {
    domain,
    url: provider?.url ?? (isYahoo ? 'https://mail.yahoo.com/' : isSafeDomain ? `https://${domain}` : ''),
  }
}

export function EmailSentModal({ kind, email, locale, onClose, onResend }: EmailSentModalProps) {
  const isKorean = locale === 'ko'
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [resending, setResending] = useState(false)
  const [resendState, setResendState] = useState<'idle' | 'sent' | 'error'>('idle')
  const { domain, url } = getInbox(email)
  const isConfirmation = kind === 'confirmation'

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [onClose])

  async function handleResend() {
    if (resending) return
    setResending(true)
    setResendState('idle')
    try {
      await onResend()
      setResendState('sent')
    } catch {
      setResendState('error')
    } finally {
      setResending(false)
    }
  }

  const title = isConfirmation
    ? isKorean ? '인증 메일을 보냈어요' : 'Your confirmation email is on its way'
    : isKorean ? '재설정 메일을 보냈어요' : 'Your reset email is on its way'
  const description = isConfirmation
    ? isKorean ? '메일 안의 인증 버튼을 누르면 가입이 완료돼요.' : 'Open the email and select the confirmation button to finish signing up.'
    : isKorean ? '메일 안의 링크에서 새 비밀번호를 만들어 주세요.' : 'Open the link in the email to create a new password.'

  return (
    <div className="email-sent-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div ref={panelRef} className="email-sent-modal__panel" role="dialog" aria-modal="true" aria-labelledby="email-sent-title" aria-describedby="email-sent-description">
        <button ref={closeButtonRef} type="button" className="email-sent-modal__close" onClick={onClose} aria-label={isKorean ? '안내 닫기' : 'Close'}>
          <X size={20} />
        </button>

        <div className="email-sent-modal__visual" aria-hidden="true">
          <i className="email-sent-modal__orbit email-sent-modal__orbit--one" />
          <i className="email-sent-modal__orbit email-sent-modal__orbit--two" />
          <span className="email-sent-modal__mail"><Mail size={30} /><b><Check size={13} /></b></span>
        </div>

        <span className="email-sent-modal__eyebrow">TO YOU · EMAIL DELIVERY</span>
        <h2 id="email-sent-title">{title}</h2>
        <p id="email-sent-description">{description}</p>

        <div className="email-sent-modal__address">
          <span><Mail size={15} /> {isKorean ? '받는 이메일' : 'Sent to'}</span>
          <strong>{email}</strong>
        </div>

        {url ? (
          <a className="email-sent-modal__inbox" href={url} target="_blank" rel="noreferrer">
            <span><b>{domain}</b>{isKorean ? ' 메일함으로 바로 이동하기' : ' Open inbox'}</span>
            <ExternalLink size={17} />
          </a>
        ) : null}

        <div className="email-sent-modal__help">
          <ShieldCheck size={18} />
          <p>{isKorean ? '메일이 보이지 않으면 스팸함을 확인하고, 입력한 이메일 주소가 맞는지 확인해 주세요. 도착까지 1~2분 걸릴 수 있어요.' : 'Check your spam folder and confirm the address above. Delivery can take a minute or two.'}</p>
        </div>

        <div className="email-sent-modal__footer">
          <button type="button" className="email-sent-modal__resend" disabled={resending} onClick={handleResend}>
            {resendState === 'sent' ? <Check size={16} /> : <RefreshCw className={resending ? 'is-spinning' : ''} size={16} />}
            {resending
              ? isKorean ? '다시 보내는 중…' : 'Sending…'
              : resendState === 'sent'
                ? isKorean ? '다시 보냈어요' : 'Sent again'
                : isKorean ? '메일 다시 보내기' : 'Send again'}
          </button>
          <button type="button" className="email-sent-modal__done" onClick={onClose}>{isKorean ? '확인했어요' : 'Done'}</button>
        </div>
        {resendState === 'error' ? <p className="email-sent-modal__error" role="alert">{isKorean ? '잠시 후 다시 시도해 주세요.' : 'Please try again in a moment.'}</p> : null}
      </div>
    </div>
  )
}

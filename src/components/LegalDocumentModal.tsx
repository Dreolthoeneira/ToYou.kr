import { useEffect, useRef, type ReactNode } from 'react'
import { FileText, ShieldCheck, X } from 'lucide-react'

export type LegalDocumentType = 'terms' | 'privacy'

interface LegalDocumentModalProps {
  documentType: LegalDocumentType
  locale: string
  onClose: () => void
}

const effectiveDate = '2026. 7. 18.'

export function LegalDocumentModal({ documentType, locale, onClose }: LegalDocumentModalProps) {
  const isKorean = locale === 'ko'
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

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
      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => !element.hasAttribute('disabled'))
      if (!focusableElements.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousActiveElement?.focus()
    }
  }, [onClose])

  const isTerms = documentType === 'terms'
  const title = isKorean
    ? isTerms ? '이용약관' : '개인정보 처리방침'
    : isTerms ? 'Terms of Service' : 'Privacy Policy'
  const description = isKorean
    ? `시행일 ${effectiveDate}`
    : 'Effective July 18, 2026'

  return (
    <div className="legal-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div
        ref={panelRef}
        className="legal-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        aria-describedby="legal-modal-description"
      >
        <header className="legal-modal__header">
          <span className="legal-modal__icon" aria-hidden="true">
            {isTerms ? <FileText size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <span className="eyebrow">TO YOU LEGAL</span>
            <h2 id="legal-modal-title">{title}</h2>
            <p id="legal-modal-description">{description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="legal-modal__close"
            onClick={onClose}
            aria-label={isKorean ? '약관 닫기' : 'Close document'}
          >
            <X size={20} />
          </button>
        </header>

        <div className="legal-modal__body">
          {isKorean
            ? isTerms ? <KoreanTerms /> : <KoreanPrivacy />
            : isTerms ? <EnglishTerms /> : <EnglishPrivacy />}
        </div>

        <footer className="legal-modal__footer">
          <span>{isKorean ? '내용을 끝까지 확인해 주세요.' : 'Please review the document before agreeing.'}</span>
          <button type="button" onClick={onClose}>{isKorean ? '확인했어요' : 'Done'}</button>
        </footer>
      </div>
    </div>
  )
}

function KoreanTerms() {
  return (
    <>
      <p className="legal-modal__lead">본 약관은 TO YOU(이하 “스토어”)가 제공하는 온라인 쇼핑몰 서비스의 이용 조건과 회원 및 스토어의 권리·의무를 정합니다.</p>

      <LegalSection number="01" title="약관의 적용과 변경">
        <p>회원가입, 상품 조회, 주문, 결제, 배송 및 회원 서비스 이용에 본 약관이 적용됩니다. 스토어는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일과 주요 내용을 서비스 화면에 미리 안내합니다.</p>
      </LegalSection>
      <LegalSection number="02" title="회원가입과 계정 관리">
        <ul>
          <li>이메일 가입 또는 카카오·네이버 간편가입으로 계정을 만들 수 있습니다.</li>
          <li>간편가입 계정의 이메일과 이름은 연결된 소셜 계정에서 제공되므로 스토어에서 직접 변경할 수 없습니다.</li>
          <li>회원은 정확한 정보를 제공하고 계정 접근 수단을 안전하게 관리해야 합니다.</li>
          <li>타인의 정보를 도용하거나 서비스 운영을 방해하는 경우 이용을 제한할 수 있습니다.</li>
        </ul>
      </LegalSection>
      <LegalSection number="03" title="주문과 계약의 성립">
        <p>회원이 상품, 옵션, 수량, 배송지와 결제 정보를 확인한 후 주문을 제출하고 스토어가 주문 완료를 안내하면 구매계약이 성립합니다. 품절, 가격 표시 오류 또는 결제 승인 실패 등 부득이한 사유가 있으면 주문을 취소하고 지체 없이 안내합니다.</p>
      </LegalSection>
      <LegalSection number="04" title="가격과 결제">
        <p>상품 가격과 배송비는 주문 화면에 표시되며, 회원은 제공되는 결제수단으로 결제할 수 있습니다. 결제 과정은 해당 결제사업자의 정책과 이용 조건을 따를 수 있습니다.</p>
      </LegalSection>
      <LegalSection number="05" title="배송">
        <p>배송 지역, 비용 및 예상 일정은 상품 또는 결제 화면에서 안내합니다. 천재지변, 택배사 사정, 주문 폭주 등으로 지연되는 경우 확인 가능한 수단으로 안내합니다.</p>
      </LegalSection>
      <LegalSection number="06" title="취소·반품·교환과 환불">
        <ul>
          <li>회원은 관련 법령이 정한 기간과 조건에 따라 주문 취소, 반품 또는 교환을 요청할 수 있습니다.</li>
          <li>상품 하자나 오배송은 스토어가 필요한 비용을 부담합니다.</li>
          <li>회원의 사용 또는 훼손으로 가치가 현저히 감소한 상품, 맞춤 제작 상품 등 법령상 청약철회가 제한되는 경우에는 사전에 그 사실을 안내합니다.</li>
          <li>환불은 반품 상품과 사유를 확인한 뒤 원결제수단을 기준으로 처리하며, 결제사업자 사정에 따라 실제 반영 시점이 달라질 수 있습니다.</li>
        </ul>
      </LegalSection>
      <LegalSection number="07" title="회원의 의무">
        <p>회원은 허위 주문, 비정상적인 시스템 접근, 콘텐츠 무단 복제, 타인의 권리 침해 등 법령이나 본 약관에 위배되는 행위를 해서는 안 됩니다.</p>
      </LegalSection>
      <LegalSection number="08" title="서비스 변경과 중단">
        <p>설비 점검, 장애, 외부 서비스 변경 등 필요한 경우 서비스의 일부를 변경하거나 일시 중단할 수 있습니다. 예측 가능한 중단은 가능한 범위에서 사전에 안내합니다.</p>
      </LegalSection>
      <LegalSection number="09" title="책임의 범위">
        <p>스토어는 고의 또는 과실로 회원에게 발생한 손해에 대해 관련 법령에 따라 책임을 부담합니다. 회원의 귀책사유나 통제하기 어려운 불가항력으로 발생한 손해에는 책임이 제한될 수 있습니다.</p>
      </LegalSection>
      <LegalSection number="10" title="문의와 분쟁 해결">
        <p>서비스와 주문 관련 문의는 <a href="mailto:hello@toyou-store.kr">hello@toyou-store.kr</a>로 접수할 수 있습니다. 분쟁이 발생하면 상호 협의를 우선하며, 해결되지 않는 경우 대한민국 법령과 관할 법원의 절차를 따릅니다.</p>
      </LegalSection>
    </>
  )
}

function KoreanPrivacy() {
  return (
    <>
      <p className="legal-modal__lead">TO YOU는 회원가입, 주문 및 배송 서비스를 제공하는 데 필요한 개인정보만 처리하며 관련 법령에 따라 안전하게 관리합니다.</p>

      <LegalSection number="01" title="처리하는 개인정보">
        <div className="legal-modal__data-list">
          <div><strong>회원가입</strong><span>이메일, 이름, 휴대폰 번호, 비밀번호 인증 정보</span></div>
          <div><strong>간편가입</strong><span>소셜 제공자 식별값, 이메일, 이름 또는 프로필 정보</span></div>
          <div><strong>주문·배송</strong><span>수령인, 연락처, 우편번호, 주소, 주문 상품·옵션·수량·금액, 결제수단, 배송 요청사항</span></div>
          <div><strong>서비스 이용</strong><span>장바구니, 찜, 재입고 알림, 로그인 세션 정보</span></div>
          <div><strong>자동 생성 정보</strong><span>쿠키·세션 식별자와 서비스 이용 기록이 인증 또는 호스팅 과정에서 생성될 수 있습니다.</span></div>
        </div>
      </LegalSection>
      <LegalSection number="02" title="처리 목적">
        <ul>
          <li>본인 식별, 회원가입과 로그인, 계정 관리</li>
          <li>주문 확인, 결제, 상품 배송, 교환·반품·환불</li>
          <li>문의 대응, 공지 전달, 부정 이용 방지와 서비스 보안</li>
          <li>회원이 요청한 찜, 장바구니 및 재입고 알림 기능 제공</li>
        </ul>
      </LegalSection>
      <LegalSection number="03" title="보유 및 이용 기간">
        <p>회원정보는 원칙적으로 회원 탈퇴 시 지체 없이 삭제합니다. 다만 관계 법령에 따라 다음 기록은 정해진 기간 동안 별도로 보관할 수 있습니다.</p>
        <div className="legal-modal__retention">
          <div><span>표시·광고 기록</span><strong>6개월</strong></div>
          <div><span>계약 또는 청약철회 기록</span><strong>5년</strong></div>
          <div><span>대금결제 및 재화 공급 기록</span><strong>5년</strong></div>
          <div><span>소비자 불만 또는 분쟁처리 기록</span><strong>3년</strong></div>
        </div>
      </LegalSection>
      <LegalSection number="04" title="제3자 제공과 외부 서비스">
        <p>TO YOU는 원칙적으로 회원의 개인정보를 제3자에게 판매하거나 제공하지 않습니다. 회원의 별도 동의가 있거나 법령상 근거가 있는 경우에만 필요한 범위에서 제공합니다. 인증·데이터베이스 운영에는 Supabase, 웹사이트 제공에는 GitHub Pages 등 외부 인프라가 사용되며, 각 서비스는 기능 제공에 필요한 범위에서 정보를 처리할 수 있습니다.</p>
      </LegalSection>
      <LegalSection number="05" title="파기 절차와 방법">
        <p>보유 기간이 끝나거나 처리 목적이 달성된 정보는 복구하기 어려운 방식으로 삭제합니다. 법령에 따라 보관해야 하는 정보는 다른 정보와 분리해 보관하고 기간이 끝나면 파기합니다.</p>
      </LegalSection>
      <LegalSection number="06" title="회원의 권리">
        <p>회원은 자신의 개인정보 열람, 정정, 삭제, 처리정지 및 회원 탈퇴를 요청할 수 있습니다. 계정의 회원정보 수정 메뉴 또는 고객문의 이메일을 이용할 수 있으며, 본인 확인 후 지체 없이 처리합니다. 소셜 계정에서 받은 이메일과 이름은 해당 카카오 또는 네이버 계정에서 변경해야 합니다.</p>
      </LegalSection>
      <LegalSection number="07" title="안전성 확보 조치">
        <p>접근 권한 관리, 인증 세션 보호, 통신 구간 암호화 및 필요한 기술적·관리적 조치를 적용합니다. 비밀번호는 인증 서비스에서 보호되며 화면이나 데이터베이스에서 평문으로 조회하지 않습니다.</p>
      </LegalSection>
      <LegalSection number="08" title="쿠키와 세션">
        <p>로그인 유지와 장바구니 등 핵심 기능을 위해 브라우저 저장소, 쿠키 또는 세션 식별자를 사용할 수 있습니다. 브라우저 설정에서 이를 삭제하거나 차단할 수 있지만 일부 기능이 정상적으로 동작하지 않을 수 있습니다.</p>
      </LegalSection>
      <LegalSection number="09" title="개인정보 문의">
        <p>개인정보 관련 열람·삭제·불만 또는 보호 문의는 TO YOU 개인정보 담당 창구 <a href="mailto:hello@toyou-store.kr">hello@toyou-store.kr</a>로 보내주세요.</p>
      </LegalSection>
      <LegalSection number="10" title="방침 변경">
        <p>본 방침이 변경되는 경우 적용일과 변경 내용을 서비스 화면에서 사전에 안내합니다.</p>
      </LegalSection>
    </>
  )
}

function EnglishTerms() {
  return (
    <>
      <p className="legal-modal__lead">These terms set the conditions for using the TO YOU online store and the rights and responsibilities of members and the store.</p>
      <LegalSection number="01" title="Application and updates"><p>These terms apply to account registration, browsing, orders, payment, delivery, and member services. We may update them within applicable law and will announce material changes and their effective date in advance.</p></LegalSection>
      <LegalSection number="02" title="Accounts"><p>You may register with email or Kakao and Naver. Details supplied by a social provider must be changed with that provider. Keep account access secure and provide accurate information.</p></LegalSection>
      <LegalSection number="03" title="Orders"><p>A purchase contract is formed when you submit a reviewed order and we confirm completion. We may cancel and notify you if stock, pricing, or payment errors prevent fulfillment.</p></LegalSection>
      <LegalSection number="04" title="Payment and delivery"><p>Prices, delivery fees, and expected schedules appear during purchase. Payment-provider terms may also apply. We will notify you when delivery is materially delayed.</p></LegalSection>
      <LegalSection number="05" title="Cancellation, returns, and refunds"><p>You may request cancellation, return, or exchange as permitted by applicable consumer law. We cover verified defects and shipping errors. Statutory exceptions may apply to used, damaged, or made-to-order goods when disclosed in advance.</p></LegalSection>
      <LegalSection number="06" title="Acceptable use"><p>Do not place fraudulent orders, attempt unauthorized access, copy protected content without permission, or infringe the rights of others.</p></LegalSection>
      <LegalSection number="07" title="Service availability"><p>Service may be changed or temporarily suspended for maintenance, failures, or changes to external systems. Planned interruptions will be announced when practicable.</p></LegalSection>
      <LegalSection number="08" title="Contact and disputes"><p>Contact <a href="mailto:hello@toyou-store.kr">hello@toyou-store.kr</a> for account or order assistance. Disputes are first addressed through consultation and otherwise follow the laws and court procedures of the Republic of Korea.</p></LegalSection>
    </>
  )
}

function EnglishPrivacy() {
  return (
    <>
      <p className="legal-modal__lead">TO YOU processes only the personal information needed for accounts, orders, and delivery and protects it under applicable law.</p>
      <LegalSection number="01" title="Information we process"><p>Account details include email, name, phone number, and authentication information. Social sign-up may supply a provider identifier, email, name, or profile. Orders include recipient, contact, address, products, payment method, and delivery notes. Cart, saved items, alerts, session identifiers, and access records may also be generated.</p></LegalSection>
      <LegalSection number="02" title="Purposes"><p>We use information to identify members, manage sign-in, fulfill and support orders, handle returns and refunds, answer inquiries, secure the service, and provide requested cart, saved-item, and restock features.</p></LegalSection>
      <LegalSection number="03" title="Retention"><p>Account information is normally deleted when membership ends. Records may be retained where Korean law requires: advertising for 6 months, contracts and withdrawals for 5 years, payment and supply for 5 years, and complaints or disputes for 3 years.</p></LegalSection>
      <LegalSection number="04" title="Sharing and infrastructure"><p>We do not sell personal information or ordinarily provide it to third parties. We do so only with separate consent or a lawful basis. Supabase supports authentication and database functions, and GitHub Pages provides site hosting; these services may process information as needed to provide their functions.</p></LegalSection>
      <LegalSection number="05" title="Deletion and security"><p>Information is securely deleted when its purpose or retention period ends. Legally retained records are separated until deletion. We use access controls, protected sessions, encrypted transport, and appropriate administrative and technical safeguards.</p></LegalSection>
      <LegalSection number="06" title="Your rights"><p>You may request access, correction, deletion, suspension of processing, or account withdrawal through account settings or by email. Details supplied by Kakao or Naver must be changed with that provider.</p></LegalSection>
      <LegalSection number="07" title="Cookies and sessions"><p>Browser storage, cookies, or session identifiers may be used for sign-in and core shopping features. Blocking them may prevent parts of the store from working.</p></LegalSection>
      <LegalSection number="08" title="Contact"><p>For privacy requests or complaints, contact TO YOU at <a href="mailto:hello@toyou-store.kr">hello@toyou-store.kr</a>. Material policy changes will be announced before they take effect.</p></LegalSection>
    </>
  )
}

function LegalSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="legal-modal__section">
      <div className="legal-modal__section-heading"><span>{number}</span><h3>{title}</h3></div>
      <div>{children}</div>
    </section>
  )
}

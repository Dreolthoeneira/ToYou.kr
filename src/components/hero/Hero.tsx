import { currencyFormatter, detectMarketplace, editorialNotes, heroStats, quickBenefits, type Product } from '../../data'
import { SITE_BRAND } from '../../siteBrand'

interface HeroProps {
  query: string
  setQuery: (q: string) => void
  activeProduct: Product
}

export function Hero({ query, setQuery, activeProduct }: HeroProps) {
  const marketplace = detectMarketplace(query)
  const serviceFee = Math.round(activeProduct.price * 0.065)
  const localShipping = activeProduct.price > 50000 ? 0 : 3500
  const intlShipping = activeProduct.category === '패션' ? 9800 : 6900
  const total = activeProduct.price + serviceFee + localShipping + intlShipping

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">CROSS-BORDER LOGISTICS</p>
        <h1>
          서울의 모든 스토어를
          <br />
          당신의 집 앞까지
        </h1>
        <p className="hero-description">
          단순한 쇼핑몰을 넘어, 복잡한 한국 직구를 가장 심플한 흐름으로 바꿉니다.
          URL 하나로 시작하는 구매 대행부터, 직접 쇼핑한 물건의 안전한 합배송까지
          {SITE_BRAND}이 서울 현지에서 직접 관리합니다.
        </p>

        <div className="hero-search">
          <label className="sr-only" htmlFor="hero-query">
            상품명 또는 URL
          </label>
          <input
            id="hero-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="한국 쇼핑몰 URL을 붙여 넣어 보세요"
          />
          <button type="button" className="primary-button">
            빠른 견적
          </button>
        </div>

        <div className="benefit-list">
          {quickBenefits.map((item) => (
            <div key={item} className="benefit-pill">
              <span className="benefit-dot" />
              {item}
            </div>
          ))}
        </div>

        <div className="stat-grid">
          {heroStats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="hero-panel">
        <div className="quote-card">
          <div className="quote-card__top">
            <div>
              <p className="eyebrow eyebrow--compact">ESTIMATE PREVIEW</p>
              <h2>{activeProduct.name}</h2>
            </div>
            <span className="market-badge">{marketplace}</span>
          </div>

          <p className="quote-card__caption">{activeProduct.caption}</p>

          <div className="quote-breakdown">
            <div>
              <span>상품가</span>
              <strong>{currencyFormatter.format(activeProduct.price)}</strong>
            </div>
            <div>
              <span>구매 대행 수수료</span>
              <strong>{currencyFormatter.format(serviceFee)}</strong>
            </div>
            <div>
              <span>현지 배송</span>
              <strong>{currencyFormatter.format(localShipping)}</strong>
            </div>
            <div>
              <span>국제 배송 (예상)</span>
              <strong>{currencyFormatter.format(intlShipping)}</strong>
            </div>
          </div>

          <div className="quote-total">
            <span>예상 결제 합계</span>
            <strong>{currencyFormatter.format(total)}</strong>
          </div>

          <div className="quote-meta">
            <span>도착 예상 {activeProduct.eta}</span>
            <span>검수 완료 후 즉시 출고</span>
          </div>
        </div>

        <div className="floating-note">
          {editorialNotes.map((note) => (
            <article key={note.title} className="editorial-card">
              <p>{note.label}</p>
              <strong>{note.title}</strong>
              <span>{note.body}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

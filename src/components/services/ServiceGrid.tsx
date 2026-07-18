import { serviceTypes } from '../../data'
import { ProductVisual } from '../visuals/ProductVisual'
import { SITE_BRAND } from '../../siteBrand'

export function ServiceGrid() {
  return (
    <section className="service-section" id="services">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">OUR SERVICES</p>
          <h2>복잡한 직구를 세 가지 흐름으로</h2>
        </div>
        <p>
          사용자의 쇼핑 스타일에 맞춰 최적화된 물류 서비스를 제공합니다.
          결제 대행부터 대량 소싱까지 {SITE_BRAND}의 전문 인력이 함께합니다.
        </p>
      </div>

      <div className="service-grid">
        {serviceTypes.map((service) => (
          <article key={service.id} className="service-card">
            <div className="service-card__icon">
              <ProductVisual
                art={service.icon}
                palette={['#fff', '#f0f0f0']}
                accent="#b12d57"
              />
            </div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <ul className="service-card__benefits">
              {service.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <button type="button" className="service-card__btn">
              자세히 보기
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

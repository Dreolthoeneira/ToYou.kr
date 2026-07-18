import { processSteps } from '../../data'
import { SITE_BRAND } from '../../siteBrand'

export function ProcessTimeline() {
  return (
    <section className="process-section" id="process">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">HOW IT MOVES</p>
          <h2>서울 센터에서 문 앞까지의 여정</h2>
        </div>
        <p>
          {SITE_BRAND}의 물류 시스템은 투명합니다. 모든 상품은 센터 도착 시 정밀 검수를
          거치며, 최적의 포장 상태로 해외로 발송됩니다.
        </p>
      </div>

      <div className="process-grid">
        {processSteps.map((item) => (
          <article key={item.step} className="process-card">
            <p>{item.step}</p>
            <h3>{item.title}</h3>
            <span>{item.description}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

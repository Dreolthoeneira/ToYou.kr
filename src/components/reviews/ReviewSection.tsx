import { reviews } from '../../data'
import { SITE_BRAND } from '../../siteBrand'

export function ReviewSection() {
  return (
    <section className="review-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">GLOBAL VOICES</p>
          <h2>전 세계 유저들의 리얼한 피드백</h2>
        </div>
        <p>
          다양한 국가의 사용자들이 {SITE_BRAND}를 통해 서울의 취향을 안전하게 전달받았습니다.
          신뢰할 수 있는 후기를 확인해 보세요.
        </p>
      </div>

      <div className="review-grid">
        {reviews.map((review) => (
          <article key={review.name} className="review-card">
            <div className="review-card__stars" aria-label={`${review.rating} out of 5`}>
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
            <h3>{review.title}</h3>
            <p>{review.body}</p>
            <div className="review-card__footer">
              <strong>{review.name}</strong>
              <span>{review.item}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

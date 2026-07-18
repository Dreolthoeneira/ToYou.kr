import { useState } from 'react'
import { ranking } from '../../data'

type RankingPeriod = keyof typeof ranking

export function RankingBoard() {
  const [rankingPeriod, setRankingPeriod] = useState<RankingPeriod>('daily')

  return (
    <section className="ranking-section" id="ranking">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">RANKING BOARD</p>
          <h2>글로벌 유저들이 선택한 인기 아이템</h2>
        </div>
        <p>
          전 세계 120개국 유저들의 실제 구매 데이터를 바탕으로 한 랭킹입니다.
          지금 가장 많이 서울에서 해외로 나가는 물건들을 확인하세요.
        </p>
      </div>

      <div className="ranking-tabs">
        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
          <button
            key={period}
            type="button"
            className={rankingPeriod === period ? 'is-active' : ''}
            onClick={() => setRankingPeriod(period)}
          >
            {period === 'daily' ? '일간' : period === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      <div className="ranking-grid">
        {ranking[rankingPeriod].map((item) => (
          <article key={`${rankingPeriod}-${item.rank}`} className="ranking-card">
            <div className="ranking-card__rank">{item.rank}</div>
            <div className="ranking-card__body">
              <span>{item.tag}</span>
              <strong>{item.name}</strong>
            </div>
            <div className="ranking-card__delta">{item.delta}</div>
          </article>
        ))}
      </div>
    </section>
  )
}

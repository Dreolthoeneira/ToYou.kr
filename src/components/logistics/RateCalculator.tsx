import { useState } from 'react'
import { currencyFormatter, destinationCountries } from '../../data'
import { SITE_BRAND } from '../../siteBrand'
import { FlagIcon } from '../FlagIcon'

export function RateCalculator() {
  const [calcCountry, setCalcCountry] = useState(destinationCountries[0].code)
  const [calcWeight, setCalcWeight] = useState(1.5)

  const selectedCountry = destinationCountries.find((c) => c.code === calcCountry)!
  const estimatedRate = selectedCountry.rate * calcWeight

  return (
    <section className="calculator-section" id="calc">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">RATE CALCULATOR</p>
          <h2>예상 배송비를 미리 확인하세요</h2>
        </div>
        <p>
          목적지와 무게만 입력하면 대략적인 국제 배송 요금을 계산해 드립니다.
          {SITE_BRAND}는 업계 최저 수준의 특송 요율을 제공합니다.
        </p>
      </div>

      <div className="calculator-card">
        <div className="calc-inputs">
          <div className="calc-field">
            <span className="calc-field__label">도착 국가</span>
            <div className="support-country-list" role="radiogroup" aria-label="도착 국가">
              {destinationCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`support-country-item${calcCountry === c.code ? ' is-active' : ''}`}
                  role="radio"
                  aria-checked={calcCountry === c.code}
                  onClick={() => setCalcCountry(c.code)}
                >
                  <FlagIcon code={c.flagCode} className="support-country-item__flag" />
                  <span className="support-country-item__name">{c.name}</span>
                  <span className="support-country-item__meta">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="calc-field">
            <label>예상 무게 (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0.5"
              value={calcWeight}
              onChange={(e) => setCalcWeight(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="calc-result">
          <p>국제 배송비 예상</p>
          <strong>{currencyFormatter.format(estimatedRate)}</strong>
          <span>부피 무게 제외 실중량 기준</span>
        </div>
      </div>
    </section>
  )
}

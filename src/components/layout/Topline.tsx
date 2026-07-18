import { FlagIcon } from '../FlagIcon'

export function Topline() {
  return (
    <div className="topline">
      <div className="topline__left">
        <span>서울 직매입 셀렉션</span>
        <span>검수 후 재포장 출고</span>
      </div>
      <div className="topline__right">
        <button type="button">
          KRW <FlagIcon code="kr" className="topline__flag" />
        </button>
        <button type="button">한국어</button>
      </div>
    </div>
  )
}

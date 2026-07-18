import { SITE_BRAND, SITE_DOMAIN, SITE_MARK } from '../../siteBrand'

export function Header() {
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <div className="brand-mark">{SITE_MARK}</div>
        <div>
          <p className="brand-name">{SITE_BRAND}</p>
          <p className="brand-sub">{SITE_DOMAIN}</p>
        </div>
      </div>

      <nav className="site-nav">
        <a href="#services">서비스</a>
        <a href="#discover">발견</a>
        <a href="#ranking">랭킹</a>
        <a href="#calc">배송비 계산</a>
      </nav>

      <div className="header-actions">
        <button type="button">마이페이지</button>
        <button type="button" className="primary-button primary-button--ghost">
          내 사서함
        </button>
      </div>
    </header>
  )
}

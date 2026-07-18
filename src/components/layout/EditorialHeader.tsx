import type { MouseEventHandler, ReactNode } from 'react'
import { SITE_BRAND, SITE_DOMAIN } from '../../siteBrand'
import { LanguageToggle } from '../LanguageToggle'

export interface EditorialHeaderNavItem {
  href: string
  label: ReactNode
  key?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

interface EditorialHeaderProps {
  navItems: EditorialHeaderNavItem[]
  actions?: ReactNode
  announcement?: ReactNode
  announcementNote?: ReactNode
  className?: string
  navLabel?: string
  onGoHome?: () => void
  utilityNote?: ReactNode
}

export function EditorialHeader({
  navItems,
  actions,
  announcement = '한국 쇼핑 컨시어지',
  announcementNote = 'SEOUL · WORLDWIDE',
  className = '',
  navLabel = '주요 카테고리',
  onGoHome,
  utilityNote = SITE_DOMAIN,
}: EditorialHeaderProps) {
  return (
    <header className={`editorial-header${className ? ` ${className}` : ''}`}>
      <div className="store-announcement">
        <div className="container store-announcement__inner">
          <span className="store-announcement__label">{announcement}</span>
          <span className="store-announcement__note">{announcementNote}</span>
        </div>
      </div>

      <div className="container editorial-header__utility-row">
        <span className="editorial-header__utility-note">{utilityNote}</span>
        <div className="editorial-header__actions">
          <LanguageToggle />
          {actions}
        </div>
      </div>

      <div className="container editorial-header__masthead">
        <a
          className="editorial-header__wordmark"
          href="/"
          aria-label={`${SITE_BRAND} 홈`}
          onClick={
            onGoHome
              ? (event) => {
                  event.preventDefault()
                  onGoHome()
                }
              : undefined
          }
        >
          {SITE_BRAND.toUpperCase()}
        </a>
      </div>

      <nav className="editorial-header__category-nav" aria-label={navLabel}>
        <div className="container editorial-header__category-scroll">
          {navItems.map((item, index) => (
            <a
              key={item.key ?? `${item.href}-${index}`}
              className="editorial-header__category-link"
              href={item.href}
              onClick={item.onClick}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}

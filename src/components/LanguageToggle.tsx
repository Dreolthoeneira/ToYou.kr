import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { getLocaleOption, localeOptions, useI18n } from '../i18n'
import { FlagIcon } from './FlagIcon'

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const activeOption = getLocaleOption(locale)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={`locale-toggle${compact ? ' locale-toggle--compact' : ''}${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="locale-toggle__trigger"
        aria-label={activeOption.selectorLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="locale-toggle__flag-shell" aria-hidden="true">
          <FlagIcon code={activeOption.flagCode} className="locale-toggle__flag" />
        </span>
        <span className="locale-toggle__current">{activeOption.shortLabel}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="locale-toggle__menu"
            role="menu"
            aria-label={activeOption.selectorLabel}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                role="menuitemradio"
                aria-checked={locale === option.code}
                className={`locale-toggle__option${locale === option.code ? ' is-active' : ''}`}
                onClick={() => {
                  setLocale(option.code)
                  setOpen(false)
                }}
              >
                <span className="locale-toggle__option-main">
                  <span className="locale-toggle__flag-shell locale-toggle__flag-shell--option" aria-hidden="true">
                    <FlagIcon code={option.flagCode} className="locale-toggle__flag" />
                  </span>
                  <span className="locale-toggle__option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.englishLabel}</small>
                  </span>
                </span>
                <span className="locale-toggle__option-badge">{option.shortLabel}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { motion } from 'framer-motion'
import type { LocaleOption } from '../i18n'
import { FlagIcon } from './FlagIcon'

interface LocaleSuggestionPromptProps {
  detectedCountry?: string
  suggestedOption: LocaleOption
  onDismiss: () => void
  onAccept: () => void
}

export function LocaleSuggestionPrompt({
  detectedCountry,
  suggestedOption,
  onDismiss,
  onAccept,
}: LocaleSuggestionPromptProps) {
  const regionLine = detectedCountry
    ? `${detectedCountry} access detected.`
    : 'Your region looks better matched to another language.'

  return (
    <motion.div
      className="locale-suggestion-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.section
        className="locale-suggestion-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locale-suggestion-title"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="locale-suggestion-chip">Language suggestion</span>

        <div className="locale-suggestion-copy">
          <h2 id="locale-suggestion-title">This site is currently shown in Korean.</h2>
          <p>{regionLine}</p>
          <p>
            Would you like to switch to{' '}
            <strong>
              <FlagIcon code={suggestedOption.flagCode} className="locale-suggestion-inline-flag" /> {suggestedOption.englishLabel}
            </strong>
            ?
          </p>
        </div>

        <div className="locale-suggestion-target">
          <span className="locale-suggestion-target__flag" aria-hidden="true">
            <FlagIcon code={suggestedOption.flagCode} className="locale-suggestion-target__flag-image" />
          </span>
          <div>
            <strong>{suggestedOption.label}</strong>
            <small>{suggestedOption.englishLabel}</small>
          </div>
        </div>

        <div className="locale-suggestion-actions">
          <button type="button" className="button button--ghost" onClick={onDismiss}>
            Keep Korean
          </button>
          <button type="button" className="button button--primary" onClick={onAccept}>
            Switch to {suggestedOption.englishLabel}
          </button>
        </div>
      </motion.section>
    </motion.div>
  )
}

import cnFlag from 'flag-icons/flags/4x3/cn.svg'
import deFlag from 'flag-icons/flags/4x3/de.svg'
import esFlag from 'flag-icons/flags/4x3/es.svg'
import frFlag from 'flag-icons/flags/4x3/fr.svg'
import jpFlag from 'flag-icons/flags/4x3/jp.svg'
import krFlag from 'flag-icons/flags/4x3/kr.svg'
import sgFlag from 'flag-icons/flags/4x3/sg.svg'
import usFlag from 'flag-icons/flags/4x3/us.svg'
import vnFlag from 'flag-icons/flags/4x3/vn.svg'
import auFlag from 'flag-icons/flags/4x3/au.svg'

interface FlagIconProps {
  code: string
  className?: string
}

const flagSources: Record<string, string> = {
  au: auFlag,
  cn: cnFlag,
  de: deFlag,
  es: esFlag,
  fr: frFlag,
  jp: jpFlag,
  kr: krFlag,
  sg: sgFlag,
  us: usFlag,
  vn: vnFlag,
}

export function FlagIcon({ code, className = '' }: FlagIconProps) {
  const normalizedCode = code.trim().toLowerCase()
  const flagSource = flagSources[normalizedCode]
  const classes = ['app-flag-icon', className].filter(Boolean).join(' ')

  return <span className={classes} style={{ backgroundImage: flagSource ? `url(${flagSource})` : undefined }} aria-hidden="true" />
}

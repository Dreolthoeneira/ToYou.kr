import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr'

type I18nContextValue = {
  locale: Locale
  hasLocalePreference: boolean
  setLocale: (locale: Locale) => void
}

export type LocaleOption = {
  code: Locale
  shortLabel: string
  flagCode: string
  label: string
  englishLabel: string
  htmlLang: string
  selectorLabel: string
}

const STORAGE_KEY = 'onda-locale'

const I18nContext = createContext<I18nContextValue | null>(null)

export const localeOptions: LocaleOption[] = [
  {
    code: 'ko',
    shortLabel: 'KO',
    flagCode: 'kr',
    label: '한국어',
    englishLabel: 'Korean',
    htmlLang: 'ko-KR',
    selectorLabel: '언어 선택',
  },
  {
    code: 'en',
    shortLabel: 'EN',
    flagCode: 'us',
    label: 'English',
    englishLabel: 'English',
    htmlLang: 'en-US',
    selectorLabel: 'Language selector',
  },
  {
    code: 'ja',
    shortLabel: 'JA',
    flagCode: 'jp',
    label: '日本語',
    englishLabel: 'Japanese',
    htmlLang: 'ja-JP',
    selectorLabel: '言語を選択',
  },
  {
    code: 'zh',
    shortLabel: 'ZH',
    flagCode: 'cn',
    label: '中文',
    englishLabel: 'Chinese',
    htmlLang: 'zh-CN',
    selectorLabel: '选择语言',
  },
  {
    code: 'es',
    shortLabel: 'ES',
    flagCode: 'es',
    label: 'Español',
    englishLabel: 'Spanish',
    htmlLang: 'es-ES',
    selectorLabel: 'Seleccionar idioma',
  },
  {
    code: 'fr',
    shortLabel: 'FR',
    flagCode: 'fr',
    label: 'Français',
    englishLabel: 'French',
    htmlLang: 'fr-FR',
    selectorLabel: 'Choisir la langue',
  },
]

const localeOptionMap: Record<Locale, LocaleOption> = Object.fromEntries(
  localeOptions.map((option) => [option.code, option]),
) as Record<Locale, LocaleOption>

function isLocale(value: string | null): value is Locale {
  return value === 'ko' || value === 'en' || value === 'ja' || value === 'zh' || value === 'es' || value === 'fr'
}

export function detectNavigatorLocale(language: string): Locale {
  const normalized = language.toLowerCase()

  if (normalized.startsWith('ko')) return 'ko'
  if (normalized.startsWith('ja')) return 'ja'
  if (normalized.startsWith('zh')) return 'zh'
  if (normalized.startsWith('es')) return 'es'
  if (normalized.startsWith('fr')) return 'fr'
  return 'en'
}

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') {
    return 'ko'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (isLocale(stored)) {
    return stored
  }

  return 'ko'
}

export function getLocaleOption(locale: Locale) {
  return localeOptionMap[locale]
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(resolveInitialLocale)
  const [hasLocalePreference, setHasLocalePreference] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return isLocale(window.localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    const option = getLocaleOption(locale)

    document.documentElement.lang = option.htmlLang
    document.documentElement.setAttribute('data-locale', locale)
  }, [locale])

  function updateLocale(nextLocale: Locale) {
    setLocale(nextLocale)
    setHasLocalePreference(true)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
    }
  }

  const value = useMemo(
    () => ({
      locale,
      hasLocalePreference,
      setLocale: updateLocale,
    }),
    [hasLocalePreference, locale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider.')
  }

  return context
}

export function formatKrwAmount(amount: number, locale: Locale) {
  const safeAmount = Math.max(Math.round(amount), 0)

  return new Intl.NumberFormat(getLocaleOption(locale).htmlLang, {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(safeAmount)
}

const scrapeErrorMap: Record<string, Record<Exclude<Locale, 'ko'>, string>> = {
  '상품 URL을 먼저 입력해 주세요.': {
    en: 'Enter a product URL first.',
    ja: 'まず商品URLを入力してください。',
    zh: '请先输入商品链接。',
    es: 'Primero ingresa la URL del producto.',
    fr: "Saisissez d'abord l'URL du produit.",
  },
  '지원하지 않는 주소입니다. 쇼핑몰 상품 상세 링크를 입력해 주세요.': {
    en: 'Unsupported URL. Enter a direct product detail page URL.',
    ja: '対応していないURLです。商品詳細ページのURLを入力してください。',
    zh: '该链接暂不支持。请输入商品详情页链接。',
    es: 'URL no compatible. Ingresa la URL directa de la página del producto.',
    fr: "URL non prise en charge. Saisissez l'URL directe de la page produit.",
  },
  '해당 URL은 쇼핑몰 상품 링크가 아닙니다. 상품 상세 페이지 URL을 입력해 주세요.': {
    en: 'That URL is not a storefront product link. Enter a direct product detail page URL.',
    ja: 'このURLはショップの商品リンクではありません。商品詳細ページのURLを入力してください。',
    zh: '该链接不是商城商品链接。请输入商品详情页链接。',
    es: 'Esa URL no corresponde a una página de producto. Ingresa la URL directa del producto.',
    fr: "Cette URL n'est pas un lien produit valide. Saisissez l'URL directe de la page produit.",
  },
  '해당 파일에서 상품 정보를 찾지 못했습니다. 상품 정보가 보이는 PDF를 확인해 주세요.': {
    en: 'We could not detect product details from that file. Check that the PDF shows the product information.',
    ja: 'そのファイルから商品情報を見つけられませんでした。商品情報が表示されているPDFか確認してください。',
    zh: '无法从该文件中识别商品信息。请确认 PDF 中包含商品详情。',
    es: 'No pudimos detectar la información del producto en ese archivo. Verifica que el PDF muestre los datos del producto.',
    fr: "Impossible de détecter les informations du produit dans ce fichier. Vérifiez que le PDF affiche bien les détails du produit.",
  },
  '불러오려는 로컬 PDF 파일이 열리지 않습니다. 상품 정보가 있는 PDF 경로를 확인해 주세요.': {
    en: 'That local PDF file could not be opened. Check the file path and try again.',
    ja: 'ローカルPDFを開けませんでした。商品情報が含まれるPDFのパスを確認してください。',
    zh: '无法打开本地 PDF 文件。请检查文件路径后重试。',
    es: 'No se pudo abrir ese archivo PDF local. Revisa la ruta del archivo e inténtalo de nuevo.',
    fr: "Impossible d'ouvrir ce PDF local. Vérifiez le chemin du fichier et réessayez.",
  },
  '해당 페이지에 접근할 수 없습니다. 공개된 상품 상세 페이지인지 확인해 주세요.': {
    en: 'That page is not accessible. Check that the product page is public.',
    ja: 'そのページにアクセスできません。公開されている商品詳細ページか確認してください。',
    zh: '无法访问该页面。请确认这是公开的商品详情页。',
    es: 'No se puede acceder a esa página. Verifica que la página del producto sea pública.',
    fr: "Cette page n'est pas accessible. Vérifiez que la page produit est publique.",
  },
  '해당 쇼핑몰 페이지를 불러오지 못했습니다. 링크 상태를 확인해 주세요.': {
    en: 'We could not load that storefront page. Check the link and try again.',
    ja: 'そのショップページを読み込めませんでした。リンクを確認して再試行してください。',
    zh: '无法加载该商城页面。请检查链接后重试。',
    es: 'No pudimos cargar esa página de la tienda. Revisa el enlace e inténtalo de nuevo.',
    fr: "Impossible de charger cette page boutique. Vérifiez le lien et réessayez.",
  },
  '상품 정보를 불러오지 못했습니다. 쇼핑몰 상품 상세 페이지 URL인지 확인해 주세요.': {
    en: 'We could not load product information. Check that the URL is a direct product detail page.',
    ja: '商品情報を読み込めませんでした。商品詳細ページのURLか確認してください。',
    zh: '无法加载商品信息。请确认这是商品详情页链接。',
    es: 'No pudimos cargar la información del producto. Verifica que sea la URL directa de la página del producto.',
    fr: "Impossible de charger les informations du produit. Vérifiez qu'il s'agit bien de l'URL directe de la page produit.",
  },
}

const scrapeErrorFallback: Record<Exclude<Locale, 'ko'>, string> = {
  en: 'We could not load that product. Check the URL and try again.',
  ja: '商品を読み込めませんでした。URLを確認してもう一度お試しください。',
  zh: '无法加载该商品。请检查链接后重试。',
  es: 'No pudimos cargar ese producto. Revisa la URL e inténtalo de nuevo.',
  fr: "Impossible de charger ce produit. Vérifiez l'URL et réessayez.",
}

export function localizeScrapeError(message: string, locale: Locale) {
  if (locale === 'ko') {
    return message
  }

  return scrapeErrorMap[message]?.[locale] ?? scrapeErrorFallback[locale]
}

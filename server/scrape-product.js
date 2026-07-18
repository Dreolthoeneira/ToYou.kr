import { readFile, stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { load } from 'cheerio'
import { PDFParse } from 'pdf-parse'
import { chromium } from 'playwright'

const BROWSER_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  pragma: 'no-cache',
  'cache-control': 'no-cache',
}
const BUNJANG_HOST_PATTERN = /(^|\.)bunjang\.co\.kr$/i
const ALPHA_HOST_PATTERN = /(^|\.)alpha\.co\.kr$/i
const BUNJANG_PRODUCT_ID_PATTERN = /\/products\/(\d+)(?:\/|$)/i
const WINDOWS_FILE_PATH_PATTERN = /^[a-z]:[\\/]/i
const PDF_FILE_PATH_PATTERN = /\.pdf$/i
const PDF_PREVIEW_PAGE_LIMIT = 6
const BOOK_SEARCH_RESULT_LIMIT_PER_SITE = 5
const USED_SEARCH_RESULT_LIMIT_PER_SITE = 6
const PDF_PREVIEW_CACHE = new Map()

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTargetUrl(input) {
  const raw = cleanText(input)

  if (!raw) {
    throw new Error('Enter a product URL first.')
  }

  if (WINDOWS_FILE_PATH_PATTERN.test(raw)) {
    return pathToFileURL(raw).toString()
  }

  const withProtocol = /^(?:https?|file):\/\//i.test(raw) ? raw : `https://${raw}`
  const target = new URL(withProtocol)

  if (!['http:', 'https:', 'file:'].includes(target.protocol)) {
    throw new Error('Only http, https, and local file URLs are supported.')
  }

  return target.toString()
}

function normalizeHost(url) {
  return new URL(url).hostname.replace(/^www\./, '')
}

function normalizeSearchQuery(input) {
  const query = cleanText(input)

  if (!query) {
    throw new Error('Enter a search keyword first.')
  }

  return query
}

function formatHost(host) {
  return host
    .split('.')
    .slice(0, 2)
    .join('.')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function pickFirst(...values) {
  for (const value of values) {
    const text = cleanText(value)

    if (text) {
      return text
    }
  }

  return ''
}

function pickFirstNumber(...values) {
  for (const value of values) {
    const parsed = parsePrice(value)

    if (parsed !== null) {
      return parsed
    }
  }

  return null
}

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }

  const text = cleanText(value)

  if (!text) {
    return null
  }

  const numeric = text.replace(/[^0-9.,]/g, '')

  if (!numeric) {
    return null
  }

  const normalized = numeric.includes(',') && numeric.includes('.')
    ? numeric.replace(/,/g, '')
    : numeric.replace(/,/g, '')
  const parsed = Number(normalized)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed)
}

function detectCurrency(...values) {
  const text = values.map((value) => cleanText(value)).join(' ')

  if (/₩|KRW|원/i.test(text)) {
    return 'KRW'
  }

  if (/¥|JPY|円|￥/i.test(text)) {
    return 'JPY'
  }

  if (/\$|USD/i.test(text)) {
    return 'USD'
  }

  return 'KRW'
}

function detectCurrencyCode(...values) {
  const text = values.map((value) => cleanText(value)).join(' ')

  if (/(?:\u20a9|\uffe6|KRW)\s*[0-9]|[0-9][0-9,.\s]*(?:\u20a9|\uffe6|KRW|\uc6d0)/i.test(text)) {
    return 'KRW'
  }

  if (/(?:\u00a5|\uffe5|JPY)\s*[0-9]|[0-9][0-9,.\s]*(?:\u00a5|\uffe5|JPY|\uc5d4)/i.test(text)) {
    return 'JPY'
  }

  if (/\$|USD/i.test(text)) {
    return 'USD'
  }

  return 'KRW'
}

function extractName(value) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return cleanText(value)
  }

  if (Array.isArray(value)) {
    return extractName(value[0])
  }

  if (typeof value === 'object') {
    return pickFirst(value.name, value.title, value.brand)
  }

  return ''
}

function resolveUrl(baseUrl, value) {
  const text = cleanText(value)

  if (!text || /^data:|^blob:/i.test(text)) {
    return ''
  }

  try {
    return new URL(text, baseUrl).toString()
  } catch {
    return ''
  }
}

function normalizeMarketplaceLabel(sourceHost, marketplace) {
  const source = `${sourceHost} ${marketplace}`.toLowerCase()

  if (/yes24|\uc608\uc2a424/.test(source)) {
    return 'YES24'
  }

  if (/aladin|\uc54c\ub77c\ub518/.test(source)) {
    return 'ALADIN'
  }

  if (/olive\s*young|\uc62c\ub9ac\ube0c\uc601/.test(source)) {
    return 'OLIVE YOUNG'
  }

  if (/smartstore|brand\.naver|naver smart|\uc2a4\ub9c8\ud2b8\uc2a4\ud1a0\uc5b4/.test(source)) {
    return 'NAVER SMARTSTORE'
  }

  if (/shopping\.naver|naver shopping|\ub124\uc774\ubc84\s*\uc1fc\ud551/.test(source)) {
    return 'NAVER SHOPPING'
  }

  if (/kream/.test(source)) {
    return 'KREAM'
  }

  if (/musinsa|\ubb34\uc2e0\uc0ac/.test(source)) {
    return 'MUSINSA'
  }

  if (/coupang|\ucfe0\ud321/.test(source)) {
    return 'COUPANG'
  }

  if (/bunjang|\ubc88\uac1c\uc7a5\ud130/.test(source)) {
    return 'BUNJANG'
  }

  if (/alpha|\uc54c\ud30c/.test(source)) {
    return 'ALPHA'
  }

  if (/joongna|\uc911\uace0\ub098\ub77c/.test(source)) {
    return 'JOONGNA'
  }

  if (/fleamarket|n\s*\ud50c\ub9ac\ub9c8\ucf13|\ud50c\ub9ac\ub9c8\ucf13/.test(source)) {
    return 'NAVER FLEAMARKET'
  }

  return marketplace
}

const COMMON_IMPORTANT_INFO_LABELS = [
  { label: '브랜드', aliases: ['브랜드', 'brand', '제조사'] },
  { label: '판매자', aliases: ['판매자', '판매처', '셀러', 'seller', '스토어', '상점', 'shop'] },
  { label: '배송', aliases: ['배송', '배송비', '배송정보', 'delivery', 'shipping'] },
  { label: '혜택', aliases: ['혜택', '쿠폰', '적립', '포인트', 'benefit', 'coupon', 'point'] },
  { label: '리뷰', aliases: ['리뷰', '후기', '평점', '별점', 'review', 'rating'] },
  { label: '상품 상태', aliases: ['상품상태', '상태', 'condition'] },
  { label: '거래 지역', aliases: ['거래지역', '지역', 'location'] },
  { label: '안전결제', aliases: ['안전결제', '안전거래', 'safe pay', 'safety payment'] },
  { label: '옵션', aliases: ['옵션', '색상', '사이즈', '선택', 'option', 'size', 'color'] },
  { label: '카테고리', aliases: ['카테고리', '분류', 'category'] },
  { label: '모델번호', aliases: ['모델번호', '모델명', '품번', 'style code', 'model', 'mpn', 'sku'] },
  { label: 'ISBN', aliases: ['isbn', 'isbn13'] },
]

const SHOP_PROFILE_DEFINITIONS = [
  {
    key: 'YES24',
    marketplace: 'YES24',
    designProfile: 'book-detail',
    hostPattern: /(^|\.)yes24\.com$/i,
    tags: ['도서', '서점'],
    importantLabels: [
      { label: '저자', aliases: ['저자', '글쓴이', '작가', 'author'] },
      { label: '출판사', aliases: ['출판사', 'publisher'] },
      { label: '발행일', aliases: ['발행일', '출간일', 'publication', 'published'] },
      { label: '쪽수', aliases: ['쪽수', '페이지', 'pages'] },
      { label: 'ISBN', aliases: ['isbn', 'isbn13'] },
    ],
    importantSelectors: [
      { label: '저자', selectors: ['.gd_auth', '.gd_infoAuthor', '[class*="author"]'] },
      { label: '출판사', selectors: ['.gd_pub', '[class*="publisher"]'] },
      { label: '발행일', selectors: ['.gd_date', '[class*="pubDate"]'] },
      { label: '회원리뷰', selectors: ['.gd_rating', '[class*="review"] [class*="rating"]'] },
      { label: '배송', selectors: ['.gd_deli', '[class*="delivery"]'] },
      { label: '혜택', selectors: ['.gd_benefit', '[class*="benefit"]'] },
    ],
    optionSelectors: ['.gd_format a', '.gd_format button', '[class*="format"] a', '[class*="format"] button'],
    noticeSelectors: ['#infoset_shoppingGuide li', '#infoset_goodsGuide li', '[class*="notice"] li'],
  },
  {
    key: 'ALADIN',
    marketplace: 'ALADIN',
    designProfile: 'book-detail',
    hostPattern: /(^|\.)aladin\.co\.kr$/i,
    tags: ['도서', '서점'],
    importantLabels: [
      { label: '저자', aliases: ['저자', '글쓴이', '작가', 'author'] },
      { label: '출판사', aliases: ['출판사', 'publisher'] },
      { label: '출간일', aliases: ['출간일', '발행일', 'publication', 'published'] },
      { label: '쪽수', aliases: ['쪽수', '페이지', 'pages'] },
      { label: 'ISBN', aliases: ['isbn', 'isbn13'] },
    ],
    importantSelectors: [
      { label: '저자/출판사', selectors: ['.Ere_prod_mconts_R', '.conts_info_list1', '.conts_info_list'] },
      { label: '별점', selectors: ['.Ere_sub_pink', '[class*="star"]'] },
      { label: '배송', selectors: ['.Ere_fs15', '[class*="delivery"]'] },
      { label: '혜택', selectors: ['[class*="benefit"]', '[class*="mileage"]'] },
    ],
    optionSelectors: ['[class*="book"] [class*="type"] a', '[class*="format"] a', '[class*="option"] button'],
    noticeSelectors: ['[class*="notice"] li', '[class*="guide"] li', '.Ere_prod_mconts_box li'],
  },
  {
    key: 'NAVER_SMARTSTORE',
    marketplace: 'NAVER SMARTSTORE',
    designProfile: 'naver-storefront',
    hostPattern: /(^|\.)smartstore\.naver\.com$|(^|\.)brand\.naver\.com$/i,
    tags: ['네이버', '스마트스토어'],
    importantSelectors: [
      { label: '스토어', selectors: ['[class*="store"] [class*="name"]', '[class*="seller"] [class*="name"]'] },
      { label: '배송', selectors: ['[class*="delivery"]', '[class*="shipping"]'] },
      { label: '혜택', selectors: ['[class*="benefit"]', '[class*="point"]', '[class*="coupon"]'] },
      { label: '리뷰', selectors: ['[class*="review"]', '[class*="rating"]'] },
    ],
    optionSelectors: ['select option', '[class*="option"] button', '[class*="option"] li', '[class*="select"] button'],
    noticeSelectors: ['[class*="delivery"] li', '[class*="notice"] li', '[class*="guide"] li'],
  },
  {
    key: 'KREAM',
    marketplace: 'KREAM',
    designProfile: 'resale-market',
    hostPattern: /(^|\.)kream\.co\.kr$/i,
    tags: ['리셀', '시세'],
    importantSelectors: [
      { label: '브랜드', selectors: ['[class*="brand"]'] },
      { label: '모델번호', selectors: ['[class*="model"]', '[class*="style"]'] },
      { label: '최근 거래가', selectors: ['[class*="last"] [class*="price"]', '[class*="recent"] [class*="price"]'] },
      { label: '발매가', selectors: ['[class*="release"] [class*="price"]'] },
      { label: '사이즈', selectors: ['[class*="size"]'] },
    ],
    optionSelectors: ['[class*="size"] button', '[class*="size"] li', '[class*="option"] button'],
    noticeSelectors: ['[class*="notice"] li', '[class*="inspection"] li'],
  },
  {
    key: 'MUSINSA',
    marketplace: 'MUSINSA',
    designProfile: 'fashion-commerce',
    hostPattern: /(^|\.)musinsa\.com$/i,
    tags: ['패션', '무신사'],
    importantSelectors: [
      { label: '브랜드', selectors: ['[class*="brand"] a', '[class*="brand"]'] },
      { label: '상품번호', selectors: ['[class*="goods"] [class*="number"]', '[class*="product"] [class*="number"]'] },
      { label: '회원혜택', selectors: ['[class*="benefit"]', '[class*="coupon"]'] },
      { label: '배송', selectors: ['[class*="delivery"]', '[class*="shipping"]'] },
      { label: '리뷰', selectors: ['[class*="review"]', '[class*="rating"]'] },
    ],
    optionSelectors: ['[class*="option"] button', '[class*="size"] button', 'select option'],
    noticeSelectors: ['[class*="notice"] li', '[class*="delivery"] li', '[class*="guide"] li'],
  },
  {
    key: 'BUNJANG',
    marketplace: 'BUNJANG',
    designProfile: 'used-market',
    hostPattern: /(^|\.)bunjang\.co\.kr$/i,
    tags: ['중고', '번개장터'],
    importantSelectors: [
      { label: '상품 상태', selectors: ['[class*="condition"]', '[class*="status"]'] },
      { label: '거래 지역', selectors: ['[class*="location"]', '[class*="region"]'] },
      { label: '안전결제', selectors: ['[class*="safe"]', '[class*="pay"]'] },
      { label: '배송', selectors: ['[class*="delivery"]', '[class*="shipping"]'] },
    ],
    optionSelectors: [],
    noticeSelectors: ['[class*="notice"] li', '[class*="description"] li'],
  },
  {
    key: 'JOONGNA',
    marketplace: 'JOONGNA',
    designProfile: 'used-market',
    hostPattern: /(^|\.)joongna\.com$|(^|\.)web\.joongna\.com$/i,
    tags: ['중고', '중고나라'],
    importantSelectors: [
      { label: '상품 상태', selectors: ['[class*="condition"]', '[class*="status"]'] },
      { label: '거래 지역', selectors: ['[class*="location"]', '[class*="region"]'] },
      { label: '안전결제', selectors: ['[class*="safe"]', '[class*="pay"]'] },
      { label: '배송', selectors: ['[class*="delivery"]', '[class*="shipping"]'] },
    ],
    optionSelectors: [],
    noticeSelectors: ['[class*="notice"] li', '[class*="description"] li'],
  },
  {
    key: 'NAVER_FLEAMARKET',
    marketplace: 'NAVER FLEAMARKET',
    designProfile: 'used-market',
    hostPattern: /(^|\.)fleamarket\.naver\.com$/i,
    tags: ['중고', '네이버'],
    importantSelectors: [
      { label: '상품 상태', selectors: ['[class*="condition"]', '[class*="status"]'] },
      { label: '거래 지역', selectors: ['[class*="location"]', '[class*="region"]'] },
      { label: '안전결제', selectors: ['[class*="safe"]', '[class*="pay"]'] },
      { label: '배송', selectors: ['[class*="delivery"]', '[class*="shipping"]'] },
    ],
    optionSelectors: [],
    noticeSelectors: ['[class*="notice"] li', '[class*="description"] li'],
  },
  {
    key: 'COUPANG',
    marketplace: 'COUPANG',
    designProfile: 'retail-checkout',
    hostPattern: /(^|\.)coupang\.com$/i,
    tags: ['쿠팡', '로켓배송'],
    importantSelectors: [
      { label: '브랜드', selectors: ['.prod-brand-name', '[class*="brand"]'] },
      { label: '판매자', selectors: ['.prod-sale-vendor-name', '[class*="vendor"]', '[class*="seller"]'] },
      { label: '배송', selectors: ['.prod-shipping-fee-message', '.prod-delivery-return-policy-title', '[class*="delivery"]'] },
      { label: '혜택', selectors: ['[class*="benefit"]', '[class*="coupon"]'] },
      { label: '리뷰', selectors: ['.prod-review-count', '[class*="review"]'] },
    ],
    optionSelectors: ['.prod-option__item', '[class*="option"] button', 'select option'],
    noticeSelectors: ['.prod-description-attribute li', '[class*="notice"] li', '[class*="delivery"] li'],
  },
]

function normalizeInfoLabel(value) {
  return cleanText(value)
    .replace(/[\s:：/()·._\-[\]]/g, '')
    .toLowerCase()
}

function truncateInfoText(value, maxLength = 160) {
  const text = cleanText(value)

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3).trim()}...`
}

function isUsefulInfoValue(value, maxLength = 180) {
  const text = cleanText(value)

  if (text.length < 2 || text.length > maxLength) {
    return false
  }

  return !/^(?:선택|옵션|옵션 선택|품절|sold out)$/i.test(text)
}

function uniqueCleanTexts(values, limit = 12, maxLength = 120) {
  const seen = new Set()
  const results = []

  for (const value of values) {
    const text = truncateInfoText(value, maxLength)

    if (!isUsefulInfoValue(text, maxLength) || seen.has(text)) {
      continue
    }

    seen.add(text)
    results.push(text)

    if (results.length >= limit) {
      break
    }
  }

  return results
}

function appendImportantInfo(items, seen, label, value, maxLength = 160) {
  const cleanLabel = cleanText(label)
  const cleanValue = truncateInfoText(value, maxLength)

  if (!cleanLabel || !isUsefulInfoValue(cleanValue, maxLength)) {
    return
  }

  const key = `${normalizeInfoLabel(cleanLabel)}:${cleanValue.toLowerCase()}`

  if (seen.has(key)) {
    return
  }

  seen.add(key)
  items.push({ label: cleanLabel, value: cleanValue })
}

function getShopProfile(sourceHost, marketplace, sourceUrl) {
  const source = `${sourceHost} ${marketplace} ${sourceUrl}`

  return (
    SHOP_PROFILE_DEFINITIONS.find((profile) => profile.hostPattern.test(sourceHost)) ??
    SHOP_PROFILE_DEFINITIONS.find((profile) => new RegExp(profile.key.replace(/_/g, '[_\\s-]*'), 'i').test(source)) ??
    null
  )
}

function getProfileImportantLabels(profile) {
  return [...(profile?.importantLabels ?? []), ...COMMON_IMPORTANT_INFO_LABELS]
}

function resolveKnownInfoLabel(labelText, profile) {
  const normalized = normalizeInfoLabel(labelText)

  if (!normalized) {
    return ''
  }

  for (const definition of getProfileImportantLabels(profile)) {
    for (const alias of definition.aliases) {
      const normalizedAlias = normalizeInfoLabel(alias)

      if (normalizedAlias && (normalized === normalizedAlias || normalized.includes(normalizedAlias))) {
        return definition.label
      }
    }
  }

  return ''
}

function collectTextsBySelectors($, selectors, { limit = 8, maxLength = 120 } = {}) {
  const values = []

  for (const selector of selectors) {
    try {
      $(selector).each((_, element) => {
        const target = $(element)
        const text = pickFirst(target.attr('content'), target.attr('aria-label'), target.attr('title'), target.text())

        if (text) {
          values.push(text)
        }
      })
    } catch {
      // Ignore brittle site selectors so a single adapter never breaks the fallback parser.
    }
  }

  return uniqueCleanTexts(values, limit, maxLength)
}

function collectSelectorImportantInfo($, profile, items, seen) {
  for (const definition of profile?.importantSelectors ?? []) {
    const value = collectTextsBySelectors($, definition.selectors, { limit: 1, maxLength: 160 })[0]

    if (value) {
      appendImportantInfo(items, seen, definition.label, value)
    }
  }
}

function collectStructuredImportantInfo($, profile, items, seen) {
  $('tr').each((_, element) => {
    const row = $(element)
    const label = pickFirst(row.find('th').first().text(), row.find('td').first().text())
    const resolvedLabel = resolveKnownInfoLabel(label, profile)

    if (!resolvedLabel) {
      return
    }

    const valueCells = row.find('th').length > 0 ? row.find('td') : row.find('td').slice(1)
    const value = cleanText(valueCells.text())
    appendImportantInfo(items, seen, resolvedLabel, value)
  })

  $('dt').each((_, element) => {
    const label = cleanText($(element).text())
    const resolvedLabel = resolveKnownInfoLabel(label, profile)

    if (!resolvedLabel) {
      return
    }

    appendImportantInfo(items, seen, resolvedLabel, $(element).next('dd').text())
  })

  $('[class*="info"] li, [class*="spec"] li, [class*="detail"] li, [class*="attribute"] li').each((_, element) => {
    const rawText = cleanText($(element).text())
    const parts = rawText.split(/\s*(?:[:：|])\s*/)

    if (parts.length < 2) {
      return
    }

    const resolvedLabel = resolveKnownInfoLabel(parts[0], profile)

    if (!resolvedLabel) {
      return
    }

    appendImportantInfo(items, seen, resolvedLabel, parts.slice(1).join(' '))
  })
}

function collectJsonLdImportantInfo(productNode, offerNode, items, seen) {
  const brand = extractName(productNode?.brand)
  const category = extractName(productNode?.category)
  const sku = pickFirst(productNode?.sku, productNode?.mpn, productNode?.productID)
  const availability = cleanText(offerNode?.availability).split('/').pop()
  const ratingValue = pickFirst(productNode?.aggregateRating?.ratingValue, productNode?.aggregateRating?.rating)
  const reviewCount = pickFirst(productNode?.aggregateRating?.reviewCount, productNode?.aggregateRating?.ratingCount)

  appendImportantInfo(items, seen, '브랜드', brand)
  appendImportantInfo(items, seen, '카테고리', category)
  appendImportantInfo(items, seen, '모델번호', sku)
  appendImportantInfo(items, seen, '재고 상태', availability)

  if (ratingValue || reviewCount) {
    appendImportantInfo(items, seen, '리뷰', joinSearchDescription(ratingValue && `평점 ${ratingValue}`, reviewCount && `리뷰 ${reviewCount}`))
  }
}

function collectMetaImportantInfo($, items, seen) {
  appendImportantInfo(items, seen, '브랜드', getMeta($, 'product:brand'))
  appendImportantInfo(items, seen, '카테고리', getMeta($, 'product:category'))
  appendImportantInfo(items, seen, '모델번호', pickFirst(getMeta($, 'product:retailer_item_id'), getMeta($, 'sku')))
  appendImportantInfo(items, seen, '재고 상태', getMeta($, 'product:availability'))
  appendImportantInfo(items, seen, '상품 상태', getMeta($, 'product:condition'))
}

function collectMarketplaceOptions($, profile) {
  const selectors = [
    ...(profile?.optionSelectors ?? []),
    '[name*="option" i] option',
    '[class*="option" i] button',
    '[class*="option" i] li',
    '[class*="size" i] button',
  ]

  return collectTextsBySelectors($, selectors, { limit: 16, maxLength: 48 }).filter(
    (value) => !/^(?:선택|옵션|옵션 선택|상품을 선택|choose|select)$/i.test(value),
  )
}

function collectMarketplaceNotices($, profile) {
  const selectors = [
    ...(profile?.noticeSelectors ?? []),
    '[class*="notice" i] li',
    '[class*="guide" i] li',
    '[class*="delivery" i] li',
  ]

  return collectTextsBySelectors($, selectors, { limit: 3, maxLength: 140 })
}

function extractMarketplaceMetadata($, productNode, offerNode, sourceUrl, sourceHost, marketplace) {
  const profile = getShopProfile(sourceHost, marketplace, sourceUrl)
  const importantInfo = []
  const seen = new Set()

  collectJsonLdImportantInfo(productNode, offerNode, importantInfo, seen)
  collectMetaImportantInfo($, importantInfo, seen)
  collectStructuredImportantInfo($, profile, importantInfo, seen)
  collectSelectorImportantInfo($, profile, importantInfo, seen)

  const brand = importantInfo.find((item) => item.label === '브랜드')?.value ?? ''
  const sellerName = importantInfo.find((item) => item.label === '판매자' || item.label === '스토어')?.value ?? ''
  const category = importantInfo.find((item) => item.label === '카테고리')?.value ?? ''
  const tags = uniqueCleanTexts([profile?.marketplace, ...(profile?.tags ?? []), brand, category], 6, 48)

  return {
    siteKey: profile?.key ?? null,
    siteProfile: profile?.designProfile ?? 'generic-commerce',
    importantInfo: importantInfo.slice(0, 14),
    options: collectMarketplaceOptions($, profile),
    tags,
    notices: collectMarketplaceNotices($, profile),
    brand,
    sellerName,
    category,
  }
}

function joinSearchDescription(...values) {
  const seen = new Set()
  const parts = []

  values.forEach((value) => {
    const text = cleanText(value)

    if (!text || seen.has(text)) {
      return
    }

    seen.add(text)
    parts.push(text)
  })

  return parts.join(' | ')
}

function formatRelativeTimestamp(value) {
  const timestamp = Number(value)

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return ''
  }

  const diffMinutes = Math.max(Math.floor((Date.now() - timestamp) / 60000), 0)

  if (diffMinutes < 1) {
    return '\ubc29\uae08 \uc804'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}\ubd84 \uc804`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}\uc2dc\uac04 \uc804`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 7) {
    return `${diffDays}\uc77c \uc804`
  }

  const diffWeeks = Math.floor(diffDays / 7)

  if (diffWeeks < 5) {
    return `${diffWeeks}\uc8fc \uc804`
  }

  const diffMonths = Math.floor(diffDays / 30)

  if (diffMonths < 12) {
    return `${diffMonths}\uac1c\uc6d4 \uc804`
  }

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears}\ub144 \uc804`
}

function formatSearchTimestamp(value) {
  const raw = cleanText(value)
  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return raw
  }

  return formatRelativeTimestamp(parsed > 1_000_000_000_000 ? parsed : parsed * 1000)
}

function extractAssignedValue(html, variableName) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`(?:var|const|let)\\s+${escapedName}\\s*=\\s*["']([^"']+)["']`, 'i'))
  return cleanText(match?.[1] ?? '')
}

function extractAssignedNumber(html, variableName) {
  return pickFirstNumber(extractAssignedValue(html, variableName))
}

function extractStringValues(value, values = []) {
  if (!value) {
    return values
  }

  if (typeof value === 'string') {
    const text = cleanText(value)

    if (text) {
      values.push(text)
    }

    return values
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractStringValues(item, values)
    }

    return values
  }

  if (typeof value === 'object') {
    extractStringValues(value.url, values)
    extractStringValues(value.contentUrl, values)
    extractStringValues(value.image, values)
    extractStringValues(value.src, values)
  }

  return values
}

function pickSrcSetUrl(value) {
  const entries = cleanText(value)
    .split(',')
    .map((entry) => cleanText(entry.split(/\s+/)[0]))
    .filter(Boolean)

  return entries[entries.length - 1] ?? ''
}

function scoreImageCandidate(candidateUrl) {
  const lowered = candidateUrl.toLowerCase()
  let score = 0

  if (/\.(?:avif|gif|jpe?g|png|webp)(?:$|\?)/.test(lowered)) {
    score += 3
  }

  if (/product|goods|item|detail|gallery|photo|image/.test(lowered)) {
    score += 2
  }

  if (/logo|icon|avatar|profile|sprite|favicon|banner|ads?/.test(lowered)) {
    score -= 4
  }

  if (/data:|blank/.test(lowered)) {
    score -= 10
  }

  return score
}

function collectRankedImageUrls(sourceUrl, values) {
  const candidates = []
  const seen = new Set()

  values.forEach((value, index) => {
    const resolved = resolveUrl(sourceUrl, value)

    if (!resolved || seen.has(resolved)) {
      return
    }

    seen.add(resolved)
    candidates.push({
      url: resolved,
      score: scoreImageCandidate(resolved),
      index,
    })
  })

  candidates.sort((left, right) => right.score - left.score || left.index - right.index)
  return candidates.map((candidate) => candidate.url)
}

function collectJsonLdNodes(node, nodes = []) {
  if (!node) {
    return nodes
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectJsonLdNodes(item, nodes)
    }

    return nodes
  }

  if (typeof node === 'object') {
    nodes.push(node)
    collectJsonLdNodes(node['@graph'], nodes)
    collectJsonLdNodes(node.mainEntity, nodes)
    collectJsonLdNodes(node.itemListElement, nodes)
    collectJsonLdNodes(node.subjectOf, nodes)
    collectJsonLdNodes(node.hasVariant, nodes)
  }

  return nodes
}

function getJsonLdEntities($, entityType) {
  const entities = []

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = cleanText($(element).html())

    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw)
      const nodes = collectJsonLdNodes(parsed)

      for (const node of nodes) {
        const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]

        if (types.includes(entityType)) {
          entities.push(node)
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  })

  return entities
}

function getJsonLdProducts($) {
  return getJsonLdEntities($, 'Product')
}

function getOffer(productNode) {
  const offers = productNode?.offers

  if (Array.isArray(offers)) {
    return offers[0] ?? null
  }

  return offers ?? null
}

function getMeta($, key) {
  return pickFirst(
    $(`meta[property="${key}"]`).attr('content'),
    $(`meta[name="${key}"]`).attr('content'),
  )
}

function getItemProp($, key) {
  const target = $(`[itemprop="${key}"]`).first()

  return pickFirst(target.attr('content'), target.attr('value'), target.text())
}

function getDomImageUrls($, sourceUrl) {
  const selectors = [
    '[itemprop="image"]',
    'main img',
    'article img',
    '[class*="product"] img',
    '[class*="gallery"] img',
    '[data-testid*="image"] img',
  ]
  const rawCandidates = []

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const rawValues = [
        $(element).attr('content'),
        $(element).attr('src'),
        $(element).attr('data-src'),
        $(element).attr('data-original'),
        pickSrcSetUrl($(element).attr('srcset')),
        pickSrcSetUrl($(element).attr('data-srcset')),
      ]

      for (const rawValue of rawValues) {
        rawCandidates.push(rawValue)
      }
    })
  }

  return collectRankedImageUrls(sourceUrl, rawCandidates)
}

function extractImageUrls($, productNode, sourceUrl) {
  const candidateValues = [
    ...extractStringValues(productNode?.image),
    getMeta($, 'og:image'),
    getMeta($, 'og:image:url'),
    getMeta($, 'og:image:secure_url'),
    getMeta($, 'twitter:image'),
    getMeta($, 'twitter:image:src'),
    getItemProp($, 'image'),
    ...getDomImageUrls($, sourceUrl),
  ]

  return collectRankedImageUrls(sourceUrl, candidateValues)
}

function extractFallbackPrice(html) {
  const matches = html.match(/(?:₩|KRW|원|¥|JPY|円|￥|\$|USD)\s*[0-9][0-9,.\s]*/gi) ?? []

  for (const match of matches) {
    const parsed = parsePrice(match)

    if (parsed) {
      return parsed
    }
  }

  const plainNumberMatch = html.match(/"price"\s*:\s*"?(?<price>[0-9][0-9,.]*)"?/i)
  return parsePrice(plainNumberMatch?.groups?.price ?? '')
}

function extractFallbackPriceValue(html) {
  const matches =
    html.match(
      /(?:\u20a9|\uffe6|KRW|\uc6d0|\u00a5|\uffe5|JPY|\uc5d4|\$|USD)\s*[0-9][0-9,.\s]*/gi,
    ) ?? []

  for (const match of matches) {
    const parsed = parsePrice(match)

    if (parsed !== null) {
      return parsed
    }
  }

  const plainNumberMatch = html.match(/"price"\s*:\s*"?(?<price>[0-9][0-9,.]*)"?/i)
  return parsePrice(plainNumberMatch?.groups?.price ?? '')
}

function stripSiteName(title, siteName) {
  const cleanTitle = cleanText(title)
  const cleanSiteName = cleanText(siteName)

  if (!cleanTitle) {
    return ''
  }

  if (!cleanSiteName) {
    return cleanTitle
  }

  const separators = ['|', '-', '·', ':']

  for (const separator of separators) {
    const [firstPart] = cleanTitle.split(separator)
    const candidate = cleanText(firstPart)

    if (candidate && cleanTitle.includes(cleanSiteName)) {
      return candidate
    }
  }

  return cleanTitle
}

function isFileUrl(targetUrl) {
  return new URL(targetUrl).protocol === 'file:'
}

function isLocalPdfUrl(targetUrl) {
  return isFileUrl(targetUrl) && PDF_FILE_PATH_PATTERN.test(new URL(targetUrl).pathname)
}

function getLocalFilePath(targetUrl) {
  try {
    return fileURLToPath(targetUrl)
  } catch {
    throw new Error('Could not read that local file path.')
  }
}

function createSourceFileUrl(targetUrl) {
  return `/api/source-file?url=${encodeURIComponent(targetUrl)}`
}

function createPdfPreviewUrl(targetUrl, pageNumber) {
  return `/api/product-image?url=${encodeURIComponent(targetUrl)}&page=${pageNumber}`
}

function extractUrlsFromText(text) {
  return [...new Set((text.match(/https?:\/\/[^\s<>"')]+/gi) ?? []).map((value) => cleanText(value)))]
}

function getPdfPrimaryLines(lines) {
  const stopIndex = lines.findIndex((line) => ['이 상품은 어떠세요', '관련 상품', '추천 상품'].some((token) => line.includes(token)))
  return (stopIndex >= 0 ? lines.slice(0, stopIndex) : lines.slice(0, 20)).slice(0, 20)
}

function isPdfNoiseLine(line) {
  return (
    !line ||
    /^https?:\/\//i.test(line) ||
    /^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) ||
    /^\d+\s*\/\s*\d+$/.test(line) ||
    /^(원래 페이지로|주문 배송 흐름|한눈에 보기|상세 정보|상품 정보|주의사항|이 상품은 어떠세요\?)$/.test(line) ||
    line.includes('공유하기') ||
    line.includes('찜하기') ||
    /^[0-9]{2}\.\s*[0-9]+\.\s*[0-9]+/.test(line)
  )
}

function hasCurrencyMarker(line) {
  return /(?:\u20a9|\uffe6|KRW|\uc6d0|\u00a5|\uffe5|JPY|\uc5d4|\$|USD)/i.test(line)
}

function extractPdfProductName(lines, fallbackName) {
  const candidates = new Map()

  getPdfPrimaryLines(lines).forEach((line, index) => {
    if (
      isPdfNoiseLine(line) ||
      hasCurrencyMarker(line) ||
      /^[0-9][0-9,.\s~]*$/.test(line) ||
      line.includes('장바구니') ||
      /상품\s*\d+/i.test(line) ||
      line.length < 4 ||
      line.includes('프리미엄 유통 상품') ||
      line === '한정・하이브랜드' ||
      line === '한정, 하이브랜드 상품'
    ) {
      return
    }

    const current = candidates.get(line) ?? { count: 0, index }
    candidates.set(line, {
      count: current.count + 1,
      index: current.index,
    })
  })

  const best = [...candidates.entries()].sort(
    (left, right) =>
      right[1].count - left[1].count ||
      left[1].index - right[1].index ||
      right[0].length - left[0].length,
  )[0]?.[0]

  return best ?? fallbackName
}

function extractPdfProductPrice(lines, productName) {
  const searchLines = getPdfPrimaryLines(lines)
  const candidates = []

  searchLines.forEach((line, index) => {
    const previousLine = searchLines[index - 1] ?? ''
    const nextLine = searchLines[index + 1] ?? ''
    const price = parsePrice(line)

    if (
      price === null ||
      (!hasCurrencyMarker(line) && !line.includes('장바구니') && !/상품\s*\d+/i.test(previousLine))
    ) {
      return
    }

    let score = 0

    if (hasCurrencyMarker(line)) {
      score += 3
    }

    if (line.includes('장바구니')) {
      score += 5
    }

    if (/상품\s*\d+/i.test(previousLine) || /상품\s*\d+/i.test(line)) {
      score += 4
    }

    if ([previousLine, line, nextLine].some((entry) => productName && entry.includes(productName))) {
      score += 2
    }

    if (index <= 10) {
      score += 1
    }

    if (line.includes('~')) {
      score -= 1
    }

    candidates.push({ price, score, index })
  })

  return candidates.sort((left, right) => right.score - left.score || right.index - left.index)[0]?.price ?? null
}

function extractPdfDescription(lines, productName) {
  const descriptionLines = []
  const seen = new Set()

  for (const line of getPdfPrimaryLines(lines)) {
    if (
      isPdfNoiseLine(line) ||
      line === productName ||
      hasCurrencyMarker(line) ||
      /^[0-9][0-9,.\s~]*$/.test(line) ||
      line.includes('장바구니') ||
      /상품\s*\d+/i.test(line)
    ) {
      continue
    }

    if (!seen.has(line)) {
      seen.add(line)
      descriptionLines.push(line)
    }

    if (descriptionLines.length >= 5) {
      break
    }
  }

  return descriptionLines.join(' ')
}

async function readLocalPdfFile(targetUrl) {
  const normalizedUrl = normalizeTargetUrl(targetUrl)

  if (!isLocalPdfUrl(normalizedUrl)) {
    throw new Error('Use a local PDF file URL.')
  }

  const filePath = getLocalFilePath(normalizedUrl)
  const fileStats = await stat(filePath).catch(() => {
    throw new Error('Could not find that local PDF file.')
  })

  if (!fileStats.isFile()) {
    throw new Error('That local PDF path is not a file.')
  }

  return {
    normalizedUrl,
    filePath,
    fileStats,
    buffer: await readFile(filePath),
  }
}

async function scrapeLocalPdfProduct(targetUrl) {
  const { normalizedUrl, filePath, buffer } = await readLocalPdfFile(targetUrl)
  const parser = new PDFParse({ data: buffer })

  try {
    const textResult = await parser.getText({ first: 2 })
    const lines = textResult.text
      .split(/\r?\n/)
      .map((line) => cleanText(line))
      .filter(Boolean)
    const fallbackName = basename(filePath).replace(/\.pdf$/i, '')
    const productName = extractPdfProductName(lines, fallbackName)
    const price = extractPdfProductPrice(lines, productName)
    const detectedSourceUrl = extractUrlsFromText(textResult.text)[0] ?? ''
    const sourceHost = detectedSourceUrl ? normalizeHost(detectedSourceUrl) : 'LOCAL PDF'
    const marketplace = detectedSourceUrl ? formatHost(sourceHost) : 'LOCAL PDF'
    const imageUrls = Array.from(
      { length: Math.min(Math.max(textResult.total, 1), PDF_PREVIEW_PAGE_LIMIT) },
      (_, index) => createPdfPreviewUrl(normalizedUrl, index + 1),
    )

    if (!productName) {
      throw new Error('Could not detect a product name from that PDF.')
    }

    if (price === null) {
      throw new Error('Could not detect a product price from that PDF.')
    }

    return {
      sourceUrl: createSourceFileUrl(normalizedUrl),
      sourceHost,
      marketplace,
      productName,
      price,
      originalPrice: price,
      priceCurrency: detectCurrencyCode(textResult.text),
      description: extractPdfDescription(lines, productName),
      imageUrl: imageUrls[0] ?? '',
      imageUrls,
    }
  } finally {
    await parser.destroy()
  }
}

async function createLocalPdfPreview(targetUrl, pageNumber = 1) {
  const { normalizedUrl, buffer, fileStats } = await readLocalPdfFile(targetUrl)
  const safePageNumber = Math.max(1, Math.round(Number(pageNumber) || 1))
  const cacheKey = `${normalizedUrl}:${fileStats.mtimeMs}:${safePageNumber}`
  const cachedPreview = PDF_PREVIEW_CACHE.get(cacheKey)

  if (cachedPreview) {
    return cachedPreview
  }

  const parser = new PDFParse({ data: buffer })

  try {
    const screenshotResult = await parser.getScreenshot({
      partial: [safePageNumber],
      desiredWidth: 800,
      imageDataUrl: false,
    })
    const page = screenshotResult.pages[0]

    if (!page) {
      throw new Error('Could not render that PDF page.')
    }

    const preview = {
      body: Buffer.from(page.data),
      contentType: 'image/png',
      cacheControl: 'private, max-age=3600',
      lastModified: fileStats.mtime.toUTCString(),
    }

    PDF_PREVIEW_CACHE.set(cacheKey, preview)
    return preview
  } finally {
    await parser.destroy()
  }
}

async function readLocalSourceFile(targetUrl) {
  const { normalizedUrl, filePath, fileStats, buffer } = await readLocalPdfFile(targetUrl)

  return {
    normalizedUrl,
    filename: basename(filePath),
    body: buffer,
    contentType: 'application/pdf',
    cacheControl: 'private, max-age=3600',
    lastModified: fileStats.mtime.toUTCString(),
  }
}

function isBunjangUrl(targetUrl) {
  return BUNJANG_HOST_PATTERN.test(normalizeHost(targetUrl))
}

function isAlphaUrl(targetUrl) {
  return ALPHA_HOST_PATTERN.test(normalizeHost(targetUrl))
}

function extractBunjangProductId(targetUrl) {
  const parsedUrl = new URL(targetUrl)
  const pathMatch = parsedUrl.pathname.match(BUNJANG_PRODUCT_ID_PATTERN)

  if (pathMatch?.[1]) {
    return pathMatch[1]
  }

  const queryProductId = cleanText(
    parsedUrl.searchParams.get('pid') ?? parsedUrl.searchParams.get('product_id') ?? '',
  )

  return /^\d+$/.test(queryProductId) ? queryProductId : ''
}

function resolveBunjangImageUrl(imageUrl) {
  const resolved = cleanText(imageUrl)

  if (!resolved) {
    return ''
  }

  return resolved
    .replace(/\{cnt\}/g, '1')
    .replace(/\{res\}/g, '480')
}

function resolveBunjangImageUrls(imageUrl, imageCount) {
  const resolved = cleanText(imageUrl)
  const count = Math.max(parsePrice(imageCount) ?? 0, 0)

  if (!resolved) {
    return []
  }

  if (count <= 1 || !/\{cnt\}/.test(resolved)) {
    return [resolveBunjangImageUrl(resolved)]
  }

  return Array.from({ length: count }, (_, index) =>
    resolved
      .replace(/\{cnt\}/g, String(index + 1))
      .replace(/\{res\}/g, '480'),
  )
}

function extractBunjangProductFromPayload(payload, sourceUrl) {
  const product = payload?.data?.product

  if (!product || typeof product !== 'object') {
    throw new Error('Could not detect a Bunjang product from that page.')
  }

  const productName = cleanText(product.name)
  const price = pickFirstNumber(product.price, product.originPrice)
  const category = pickFirst(product.categoryName, product.category?.name, product.category?.title)
  const sellerName = pickFirst(product.sellerName, product.seller?.nickname, product.user?.nickname, product.user?.name)
  const importantInfo = []
  const seenImportantInfo = new Set()

  if (!productName) {
    throw new Error('Could not detect a product name from that page.')
  }

  if (price === null) {
    throw new Error('Could not detect a product price from that page. Try a direct product page URL.')
  }

  appendImportantInfo(importantInfo, seenImportantInfo, '상품 상태', pickFirst(product.condition, product.conditionName, product.status, product.statusName))
  appendImportantInfo(importantInfo, seenImportantInfo, '거래 지역', pickFirst(product.location, product.locationName, product.address, product.area))
  appendImportantInfo(importantInfo, seenImportantInfo, '배송', pickFirst(product.shippingFeeName, product.deliveryFeeName, product.shippingFee, product.deliveryFee, product.freeShipping ? '무료배송' : ''))
  appendImportantInfo(importantInfo, seenImportantInfo, '안전결제', product.safePay || product.isSafePay || product.payable ? '지원' : '')
  appendImportantInfo(importantInfo, seenImportantInfo, '판매자', sellerName)
  appendImportantInfo(importantInfo, seenImportantInfo, '카테고리', category)

  return {
    sourceUrl,
    sourceHost: normalizeHost(sourceUrl),
    marketplace: 'BUNJANG',
    siteKey: 'BUNJANG',
    siteProfile: 'used-market',
    productName,
    price,
    originalPrice: pickFirstNumber(product.originPrice, product.price) ?? price,
    priceCurrency: 'KRW',
    description: cleanText(product.description),
    imageUrl: resolveBunjangImageUrl(product.imageUrl),
    imageUrls: resolveBunjangImageUrls(product.imageUrl, product.imageCount),
    importantInfo,
    options: [],
    tags: uniqueCleanTexts(['BUNJANG', '중고', '번개장터', category], 6, 48),
    notices: [],
    sellerName,
    category,
  }
}

function extractAlphaProductFromHtml(html, sourceUrl) {
  const $ = load(html)
  const sourceHost = normalizeHost(sourceUrl)
  const productName = pickFirst(
    extractAssignedValue(html, 'p_name'),
    cleanText($('[class*="name"]').first().text()),
    getMeta($, 'og:title'),
  )
  const price = pickFirstNumber(
    extractAssignedNumber(html, 'productPrice'),
    extractAssignedNumber(html, 'PR_MM_PRICE'),
    $('.cost').first().text(),
    $('[class*="price"]').first().text(),
  )
  const originalPrice = pickFirstNumber(
    $('.old_cost').first().text(),
    html.match(/var\s+price1\s*=\s*"?(?<price>[0-9,]+)"?/i)?.groups?.price ?? '',
    price,
  )
  const imageUrls = collectRankedImageUrls(sourceUrl, [
    extractAssignedValue(html, 'RECO_IMAGE'),
    extractAssignedValue(html, 'image'),
    ...$('img[id^="myimage"][src]')
      .map((_, element) => $(element).attr('src'))
      .get(),
  ])
  const imageUrl = imageUrls[0] ?? ''

  if (!productName) {
    throw new Error('Could not detect a product name from that page.')
  }

  if (price === null) {
    throw new Error('Could not detect a product price from that page. Try a direct product page URL.')
  }

  return {
    sourceUrl,
    sourceHost,
    marketplace: 'ALPHA',
    productName,
    price,
    originalPrice: originalPrice ?? price,
    priceCurrency: 'KRW',
    description: '',
    imageUrl,
    imageUrls,
  }
}

async function scrapeBunjangProduct(normalizedUrl) {
  const productId = extractBunjangProductId(normalizedUrl)

  if (!productId) {
    throw new Error('Use a direct Bunjang product URL.')
  }

  const response = await fetch(`https://api.bunjang.co.kr/api/pms/v3/products-detail/${productId}?viewerUid=-1`, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'application/json, text/plain, */*',
      referer: normalizedUrl,
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  return extractBunjangProductFromPayload(await response.json(), normalizedUrl)
}

async function scrapeAlphaProductWithFetch(normalizedUrl) {
  const response = await fetch(normalizedUrl, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new Error('The URL did not return an HTML product page.')
  }

  return extractAlphaProductFromHtml(await response.text(), response.url)
}

async function scrapeBunjangProductWithBrowser(normalizedUrl) {
  const productId = extractBunjangProductId(normalizedUrl)

  if (!productId) {
    throw new Error('Use a direct Bunjang product URL.')
  }

  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const page = await browser.newPage({
      locale: 'ko-KR',
      userAgent: BROWSER_HEADERS['user-agent'],
    })

    await page.setExtraHTTPHeaders({
      'accept-language': BROWSER_HEADERS['accept-language'],
    })

    const detailResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes(`/api/pms/v3/products-detail/${productId}`),
      {
        timeout: 30000,
      },
    )

    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await page.waitForLoadState('networkidle', {
      timeout: 15000,
    }).catch(() => undefined)

    const detailResponse = await detailResponsePromise

    if (!detailResponse.ok()) {
      throw new Error(`The remote site responded with ${detailResponse.status()}.`)
    }

    return extractBunjangProductFromPayload(await detailResponse.json(), page.url())
  } finally {
    await browser.close()
  }
}

async function scrapeAlphaProductWithBrowser(normalizedUrl) {
  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const page = await browser.newPage({
      locale: 'ko-KR',
      userAgent: BROWSER_HEADERS['user-agent'],
    })

    await page.setExtraHTTPHeaders({
      'accept-language': BROWSER_HEADERS['accept-language'],
    })
    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await page.waitForLoadState('networkidle', {
      timeout: 15000,
    }).catch(() => undefined)

    return extractAlphaProductFromHtml(await page.content(), page.url())
  } finally {
    await browser.close()
  }
}

function extractYes24BookSearchResults(html, sourceUrl) {
  const $ = load(html)
  const results = []
  const seen = new Set()

  $('#yesSchList > li .itemUnit').each((_, element) => {
    if (results.length >= BOOK_SEARCH_RESULT_LIMIT_PER_SITE) {
      return false
    }

    const item = $(element)
    const link = item
      .find('a.gd_name')
      .filter((__, anchor) => /\/product\/goods\//i.test($(anchor).attr('href') ?? ''))
      .first()
    const href = resolveUrl(sourceUrl, link.attr('href'))
    const category = cleanText(item.find('.gd_res').first().text())
    const productName = cleanText(link.text())
    const price = pickFirstNumber(item.find('.info_price .txt_num .yes_b').first().text())
    const originalPrice = pickFirstNumber(item.find('.info_price .txt_num.dash .yes_m').first().text())
    const imageUrl = resolveUrl(
      sourceUrl,
      item.find('.img_bdr img').first().attr('data-original') || item.find('.img_bdr img').first().attr('src'),
    )
    const author = cleanText(item.find('.info_auth').first().text())
    const publisher = cleanText(item.find('.info_pub').first().text())
    const publishedAt = cleanText(item.find('.info_date').first().text())

    if (!href || seen.has(href) || !productName || price === null) {
      return
    }

    if (category && !/\ub3c4\uc11c/.test(category)) {
      return
    }

    seen.add(href)
    results.push({
      sourceUrl: href,
      sourceHost: 'yes24.com',
      marketplace: 'YES24',
      productName,
      price,
      originalPrice: originalPrice ?? price,
      priceCurrency: 'KRW',
      description: [author, publisher, publishedAt].filter(Boolean).join(' | '),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  })

  return results
}

function extractAladinBookSearchResults(html, sourceUrl) {
  const $ = load(html)
  const results = []
  const seen = new Set()

  $('a.bo3[href*="/shop/wproduct.aspx?ItemId="], a.bo3[href*="aladin.co.kr/shop/wproduct.aspx?ItemId="]').each((_, element) => {
    if (results.length >= BOOK_SEARCH_RESULT_LIMIT_PER_SITE) {
      return false
    }

    const link = $(element)
    const href = resolveUrl(sourceUrl, link.attr('href'))
    const productName = cleanText(link.text())
    const titleLine = link.closest('li')
    const infoLines = titleLine.parent().children('li')
    const titleIndex = titleLine.index()
    const category = cleanText(titleLine.find('.tit_category').first().text())
    const authorLine = cleanText(infoLines.eq(titleIndex + 1).text())
    const priceLine = cleanText(infoLines.eq(titleIndex + 2).text())
    const price = pickFirstNumber(link.closest('tr').find('span.ss_p2 em').first().text(), priceLine)
    const originalPriceMatch = priceLine.match(/([0-9,]+)\s*\uc6d0\s*[\u2192\-]/)
    const originalPrice = pickFirstNumber(originalPriceMatch?.[1], priceLine)
    const row = link.closest('tr')
    const productBox = link.closest('div.ss_book_box')
    const imageUrl = resolveUrl(
      sourceUrl,
      productBox
        .find('img[src]')
        .filter((__, image) => !/noimg|icon|arrow|logo/i.test($(image).attr('src') ?? ''))
        .first()
        .attr('src'),
    )

    if (!href || seen.has(href) || !productName || price === null) {
      return
    }

    if (category && !/\ub3c4\uc11c/.test(category)) {
      return
    }

    seen.add(href)
    results.push({
      sourceUrl: href,
      sourceHost: 'aladin.co.kr',
      marketplace: 'ALADIN',
      productName,
      price,
      originalPrice: originalPrice ?? price,
      priceCurrency: 'KRW',
      description: authorLine,
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  })

  return results
}

async function searchYes24Books(query) {
  const searchUrl = `https://www.yes24.com/Product/Search?domain=BOOK&query=${encodeURIComponent(query)}`
  const response = await fetch(searchUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept-language': BROWSER_HEADERS['accept-language'],
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const html = await response.text()
  const $ = load(html)
  const results = []
  const seen = new Set()

  $('#yesSchList > li .itemUnit').each((_, element) => {
    if (results.length >= BOOK_SEARCH_RESULT_LIMIT_PER_SITE) {
      return false
    }

    const item = $(element)
    const link = item
      .find('a.gd_name')
      .filter((__, anchor) => /\/product\/goods\//i.test($(anchor).attr('href') ?? ''))
      .first()
    const href = resolveUrl(response.url, link.attr('href'))
    const category = cleanText(item.find('.gd_res').first().text())
    const productName = cleanText(link.text())
    const price = pickFirstNumber(item.find('.info_price .txt_num .yes_b').first().text())
    const originalPrice = pickFirstNumber(item.find('.info_price .txt_num.dash .yes_m').first().text())
    const imageUrl = resolveUrl(
      response.url,
      item.find('.img_bdr img').first().attr('data-original') || item.find('.img_bdr img').first().attr('src'),
    )
    const author = cleanText(item.find('.info_auth').first().text())
    const publisher = cleanText(item.find('.info_pub').first().text())
    const publishedAt = cleanText(item.find('.info_date').first().text())

    if (!href || seen.has(href) || !productName || price === null) {
      return
    }

    if (category && !/\ub3c4\uc11c/.test(category)) {
      return
    }

    seen.add(href)
    results.push({
      sourceUrl: href,
      sourceHost: 'yes24.com',
      marketplace: 'YES24',
      productName,
      price,
      originalPrice: originalPrice ?? price,
      priceCurrency: 'KRW',
      description: [author, publisher, publishedAt].filter(Boolean).join(' | '),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  })

  return results
}

async function searchAladinBooks(query) {
  const searchUrl = `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchTarget=Book&SearchWord=${encodeURIComponent(query)}`
  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  return extractAladinBookSearchResults(await response.text(), response.url)
}

async function searchBunjangUsedProducts(query) {
  const searchUrl =
    `https://api.bunjang.co.kr/api/1/find_v2.json?q=${encodeURIComponent(query)}` +
    `&order=score&page=0&request_id=${Date.now()}&stat_device=w&n=${USED_SEARCH_RESULT_LIMIT_PER_SITE}` +
    '&stat_category_required=1&req_ref=search&version=5'
  const response = await fetch(searchUrl, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'application/json, text/plain, */*',
      referer: 'https://m.bunjang.co.kr/',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const payload = await response.json()
  const results = []
  const seen = new Set()
  const items = Array.isArray(payload?.list) ? payload.list : []

  for (const item of items) {
    if (results.length >= USED_SEARCH_RESULT_LIMIT_PER_SITE) {
      break
    }

    const productId = cleanText(item?.pid)
    const productType = cleanText(item?.type)
    const sourceUrl = productId ? `https://m.bunjang.co.kr/products/${productId}` : ''
    const productName = cleanText(item?.name)
    const price = pickFirstNumber(item?.price, item?.originPrice)
    const imageUrl = resolveBunjangImageUrl(item?.product_image)

    if (!sourceUrl || seen.has(sourceUrl) || productType === 'EXT_AD' || !productName || price === null) {
      continue
    }

    seen.add(sourceUrl)
    results.push({
      sourceUrl,
      sourceHost: normalizeHost(sourceUrl),
      marketplace: 'BUNJANG',
      productName,
      price,
      originalPrice: pickFirstNumber(item?.originPrice, item?.price) ?? price,
      priceCurrency: 'KRW',
      description: joinSearchDescription(item?.location, formatSearchTimestamp(item?.update_time), item?.free_shipping ? '\ubb34\ub8cc\ubc30\uc1a1' : ''),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  }

  return results
}

async function searchJoongnaUsedProducts(query) {
  const searchUrl = `https://web.joongna.com/search?keyword=${encodeURIComponent(query)}`
  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const html = await response.text()
  const $ = load(html)
  const results = []
  const seen = new Set()

  $('a[href^="/product/"]').each((_, element) => {
    if (results.length >= USED_SEARCH_RESULT_LIMIT_PER_SITE) {
      return false
    }

    const card = $(element)
    const href = resolveUrl(response.url, card.attr('href'))

    if (!href || seen.has(href) || /\/product\/form/i.test(href)) {
      return
    }

    const productName = pickFirst(
      card.find('span[class*="text-14"][class*="line-clamp-2"]').first().text(),
      cleanText(card.find('img[alt]').first().attr('alt')).replace(/\s*\uc774\ubbf8\uc9c0$/, ''),
    )
    const price = pickFirstNumber(
      card.find('div')
        .filter((__, entry) => /\uc6d0/.test(cleanText($(entry).text())))
        .first()
        .text(),
      `${cleanText(card.find('span[class*="text-18"][class*="font-bold"]').first().text())}${cleanText(card.find('span[class*="text-15"][class*="font-bold"]').first().text())}`,
    )
    const imageUrl = resolveUrl(response.url, card.find('img[src]').first().attr('src'))
    const postedAt = card
      .find('span')
      .map((__, entry) => cleanText($(entry).text()))
      .get()
      .find((value) => /(?:\ubc29\uae08|\ubd84 \uc804|\uc2dc\uac04 \uc804|\uc77c \uc804|\uc8fc \uc804|\uac1c\uc6d4 \uc804|\ub144 \uc804)$/.test(value)) ?? ''
    const shipping = card
      .find('span')
      .map((__, entry) => cleanText($(entry).text()))
      .get()
      .find((value) => /\ubb34\ub8cc\ubc30\uc1a1|\ubc30\uc1a1\ube44/.test(value)) ?? ''

    if (!productName || price === null) {
      return
    }

    seen.add(href)
    results.push({
      sourceUrl: href,
      sourceHost: normalizeHost(href),
      marketplace: 'JOONGNA',
      productName,
      price,
      originalPrice: price,
      priceCurrency: 'KRW',
      description: joinSearchDescription(postedAt, shipping),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  })

  return results
}

async function searchNaverFleamarketUsedProducts(query) {
  const searchUrl =
    `https://apis.fleamarket.naver.com/product/reader/v1/market-products/search?query=${encodeURIComponent(query)}` +
    `&start=0&limit=${USED_SEARCH_RESULT_LIMIT_PER_SITE}`
  const response = await fetch(searchUrl, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'application/json, text/plain, */*',
      origin: 'https://fleamarket.naver.com',
      referer: 'https://fleamarket.naver.com/search',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const payload = await response.json()
  const items = Array.isArray(payload?.result?.marketProducts) ? payload.result.marketProducts : []
  const results = []
  const seen = new Set()

  for (const item of items) {
    if (results.length >= USED_SEARCH_RESULT_LIMIT_PER_SITE) {
      break
    }

    const productId = cleanText(item?.marketProductId)
    const sourceUrl = productId ? `https://fleamarket.naver.com/market-products/${productId}` : ''
    const productName = pickFirst(item?.title, item?.productName)
    const price = pickFirstNumber(item?.price)
    const imageUrl = resolveUrl('https://fleamarket.naver.com', item?.productImageUrl)

    if (!sourceUrl || seen.has(sourceUrl) || !productName || price === null) {
      continue
    }

    seen.add(sourceUrl)
    results.push({
      sourceUrl,
      sourceHost: normalizeHost(sourceUrl),
      marketplace: 'NAVER FLEAMARKET',
      productName,
      price,
      originalPrice: price,
      priceCurrency: 'KRW',
      description: joinSearchDescription(
        item?.paymentType === 'FLEA_SAFETY' ? 'Safe pay' : '',
        formatRelativeTimestamp(item?.createdAt),
      ),
      imageUrl,
      imageUrls: imageUrl ? [imageUrl] : [],
    })
  }

  return results
}

const USED_SEARCH_HANDLERS = {
  BUNJANG: searchBunjangUsedProducts,
  JOONGNA: searchJoongnaUsedProducts,
  'NAVER FLEAMARKET': searchNaverFleamarketUsedProducts,
}

function normalizeUsedSearchMarketplaces(values) {
  const availableMarketplaces = Object.keys(USED_SEARCH_HANDLERS)

  if (!Array.isArray(values) || values.length === 0) {
    return availableMarketplaces
  }

  const requested = values
    .map((value) => cleanText(value).toUpperCase())
    .filter(Boolean)

  if (requested.length === 0 || requested.includes('ALL')) {
    return availableMarketplaces
  }

  const selected = availableMarketplaces.filter((marketplace) => requested.includes(marketplace.toUpperCase()))
  return selected.length > 0 ? selected : availableMarketplaces
}

export async function searchBooks(query) {
  const normalizedQuery = normalizeSearchQuery(query)
  const settlements = await Promise.allSettled([
    searchAladinBooks(normalizedQuery),
    searchYes24Books(normalizedQuery),
  ])
  const results = settlements.flatMap((settlement) => (settlement.status === 'fulfilled' ? settlement.value : []))

  if (results.length > 0) {
    return results
  }

  const firstError = settlements.find((settlement) => settlement.status === 'rejected')

  if (firstError?.status === 'rejected') {
    throw firstError.reason
  }

  return []
}

export async function searchUsedProducts(query, marketplaces) {
  const normalizedQuery = normalizeSearchQuery(query)
  const selectedMarketplaces = normalizeUsedSearchMarketplaces(marketplaces)
  const settlements = await Promise.allSettled(
    selectedMarketplaces.map((marketplace) => USED_SEARCH_HANDLERS[marketplace](normalizedQuery)),
  )
  const results = settlements.flatMap((settlement) => (settlement.status === 'fulfilled' ? settlement.value : []))

  if (results.length > 0) {
    return results
  }

  const firstError = settlements.find((settlement) => settlement.status === 'rejected')

  if (firstError?.status === 'rejected') {
    throw firstError.reason
  }

  return []
}

function extractProductFromHtml(html, sourceUrl) {
  const $ = load(html)
  const productNode = getJsonLdProducts($)[0] ?? null
  const offerNode = getOffer(productNode)
  const sourceHost = normalizeHost(sourceUrl)
  const siteName = pickFirst(getMeta($, 'og:site_name'), getMeta($, 'application-name'))
  const pageTitle = pickFirst(getMeta($, 'og:title'), getMeta($, 'twitter:title'), $('title').text())
  const productName = pickFirst(
    extractName(productNode?.name),
    getItemProp($, 'name'),
    cleanText($('h1').first().text()),
    stripSiteName(pageTitle, siteName),
  )
  const marketplace = normalizeMarketplaceLabel(sourceHost, pickFirst(siteName, formatHost(sourceHost)))
  const price = pickFirstNumber(
    parsePrice(offerNode?.price),
    parsePrice(offerNode?.lowPrice),
    parsePrice(getMeta($, 'product:price:amount')),
    parsePrice(getMeta($, 'product:sale_price:amount')),
    parsePrice(getItemProp($, 'price')),
    extractFallbackPriceValue(html),
  )
  const originalPrice = pickFirstNumber(
    parsePrice(getMeta($, 'product:original_price:amount')),
    parsePrice(getItemProp($, 'highPrice')),
    parsePrice(offerNode?.highPrice),
  )
  const priceCurrency = pickFirst(
    extractName(offerNode?.priceCurrency),
    getMeta($, 'product:price:currency'),
    getItemProp($, 'priceCurrency'),
    detectCurrencyCode(html),
  )
  const description = pickFirst(
    getMeta($, 'og:description'),
    getMeta($, 'description'),
    extractName(productNode?.description),
  )
  const imageUrls = extractImageUrls($, productNode, sourceUrl)
  const imageUrl = imageUrls[0] ?? ''
  const marketplaceMetadata = extractMarketplaceMetadata($, productNode, offerNode, sourceUrl, sourceHost, marketplace)

  if (!productName) {
    throw new Error('Could not detect a product name from that page.')
  }

  if (price === null) {
    throw new Error('Could not detect a product price from that page. Try a direct product page URL.')
  }

  return {
    sourceUrl,
    sourceHost,
    marketplace,
    ...marketplaceMetadata,
    productName,
    price,
    originalPrice: originalPrice || price,
    priceCurrency,
    description,
    imageUrl,
    imageUrls,
  }
}

async function scrapeProductWithFetch(normalizedUrl) {
  const response = await fetch(normalizedUrl, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote site responded with ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new Error('The URL did not return an HTML product page.')
  }

  const html = await response.text()
  return extractProductFromHtml(html, response.url)
}

async function scrapeProductWithBrowser(normalizedUrl) {
  const browser = await chromium.launch({
    headless: true,
  })

  try {
    const page = await browser.newPage({
      locale: 'ko-KR',
      userAgent: BROWSER_HEADERS['user-agent'],
    })

    await page.setExtraHTTPHeaders({
      'accept-language': BROWSER_HEADERS['accept-language'],
    })
    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    await page.waitForLoadState('networkidle', {
      timeout: 15000,
    }).catch(() => undefined)

    const html = await page.content()
    return extractProductFromHtml(html, page.url())
  } finally {
    await browser.close()
  }
}

async function proxyProductImage(targetUrl, pageNumber = 1) {
  const normalizedUrl = normalizeTargetUrl(targetUrl)

  if (isLocalPdfUrl(normalizedUrl)) {
    return createLocalPdfPreview(normalizedUrl, pageNumber)
  }

  if (isFileUrl(normalizedUrl)) {
    throw new Error('Only local PDF files are supported for file URLs.')
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      ...BROWSER_HEADERS,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`The remote image responded with ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('The remote URL did not return an image.')
  }

  const body = Buffer.from(await response.arrayBuffer())
  return {
    body,
    contentType,
    cacheControl: response.headers.get('cache-control') ?? 'public, max-age=3600',
    lastModified: response.headers.get('last-modified') ?? '',
  }
}

function shouldRetryInBrowser(error) {
  const message = error instanceof Error ? error.message : ''

  return (
    /responded with 403/i.test(message) ||
    /could not detect a product (name|price)/i.test(message)
  )
}

function toUserFacingScrapeError(error) {
  const message = error instanceof Error ? error.message : ''

  if (/Enter a product URL first\./i.test(message)) {
    return '상품 URL을 먼저 입력해 주세요.'
  }

  if (/Only http, https, and local file URLs are supported\./i.test(message)) {
    return '지원하지 않는 주소입니다. 쇼핑몰 상품 상세 링크를 입력해 주세요.'
  }

  if (
    /Could not detect a product (name|price) from that page/i.test(message) ||
    /The URL did not return an HTML product page\./i.test(message) ||
    /Use a direct Bunjang product URL\./i.test(message) ||
    /Could not detect a Bunjang product from that page\./i.test(message)
  ) {
    return '해당 URL은 쇼핑몰 상품 링크가 아닙니다. 상품 상세 페이지 URL을 입력해 주세요.'
  }

  if (
    /Could not detect a product (name|price) from that PDF/i.test(message) ||
    /Could not render that PDF page\./i.test(message)
  ) {
    return '해당 파일에서 상품 정보를 찾지 못했습니다. 상품 정보가 보이는 PDF를 확인해 주세요.'
  }

  if (
    /Could not read that local file path\./i.test(message) ||
    /Use a local PDF file URL\./i.test(message) ||
    /Could not find that local PDF file\./i.test(message) ||
    /That local PDF path is not a file\./i.test(message) ||
    /Only local PDF files are supported for file URLs\./i.test(message)
  ) {
    return '불러올 수 있는 로컬 PDF 파일이 아닙니다. 상품 정보가 있는 PDF 경로를 확인해 주세요.'
  }

  if (/The remote site responded with 403\./i.test(message)) {
    return '해당 페이지에 접근할 수 없습니다. 공개된 상품 상세 페이지인지 확인해 주세요.'
  }

  if (/The remote site responded with \d+\./i.test(message)) {
    return '해당 쇼핑몰 페이지를 불러오지 못했습니다. 링크 상태를 확인해 주세요.'
  }

  return '상품 정보를 불러오지 못했습니다. 쇼핑몰 상품 상세 페이지 URL인지 확인해 주세요.'
}

export async function scrapeProduct(targetUrl) {
  const normalizedUrl = normalizeTargetUrl(targetUrl)

  if (isLocalPdfUrl(normalizedUrl)) {
    return scrapeLocalPdfProduct(normalizedUrl)
  }

  if (isFileUrl(normalizedUrl)) {
    throw new Error('Only local PDF files are supported for file URLs.')
  }

  if (isBunjangUrl(normalizedUrl)) {
    try {
      return await scrapeBunjangProduct(normalizedUrl)
    } catch (error) {
      if (!shouldRetryInBrowser(error)) {
        throw error
      }

      return scrapeBunjangProductWithBrowser(normalizedUrl)
    }
  }

  if (isAlphaUrl(normalizedUrl)) {
    try {
      return await scrapeAlphaProductWithFetch(normalizedUrl)
    } catch (error) {
      if (!shouldRetryInBrowser(error)) {
        throw error
      }

      return scrapeAlphaProductWithBrowser(normalizedUrl)
    }
  }

  try {
    return await scrapeProductWithFetch(normalizedUrl)
  } catch (error) {
    if (!shouldRetryInBrowser(error)) {
      throw error
    }

    return scrapeProductWithBrowser(normalizedUrl)
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''

    req.on('data', (chunk) => {
      raw += chunk
    })

    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

export function createScrapeProductMiddleware() {
  return async (req, res, next) => {
    const requestUrl = new URL(req.url ?? '/', 'http://localhost')

    if (requestUrl.pathname === '/api/source-file') {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        const file = await readLocalSourceFile(requestUrl.searchParams.get('url') ?? '')
        res.statusCode = 200
        res.setHeader('content-type', file.contentType)
        res.setHeader('cache-control', file.cacheControl)
        res.setHeader('content-disposition', `inline; filename="${file.filename.replace(/"/g, '')}"`)

        if (file.lastModified) {
          res.setHeader('last-modified', file.lastModified)
        }

        res.end(file.body)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load the source file.'
        sendJson(res, 400, { error: message })
      }

      return
    }

    if (requestUrl.pathname === '/api/product-image') {
      if (!['GET', 'POST'].includes(req.method ?? '')) {
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        const body = req.method === 'POST' ? await readJsonBody(req) : {}
        const targetUrl = req.method === 'POST' ? body.url : requestUrl.searchParams.get('url') ?? ''
        const pageNumber =
          req.method === 'POST'
            ? body.page ?? 1
            : requestUrl.searchParams.get('page') ?? 1
        const image = await proxyProductImage(targetUrl, pageNumber)
        res.statusCode = 200
        res.setHeader('content-type', image.contentType)
        res.setHeader('cache-control', image.cacheControl)

        if (image.lastModified) {
          res.setHeader('last-modified', image.lastModified)
        }

        res.end(image.body)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load the product image.'
        sendJson(res, 400, { error: message })
      }

      return
    }

    if (requestUrl.pathname === '/api/search-books') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        const body = await readJsonBody(req)
        const results = await searchBooks(body.query)
        sendJson(res, 200, { results })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load book search results.'
        sendJson(res, 400, { error: message })
      }

      return
    }

    if (requestUrl.pathname === '/api/search-used-products') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed.' })
        return
      }

      try {
        const body = await readJsonBody(req)
        const results = await searchUsedProducts(body.query, body.marketplaces)
        sendJson(res, 200, { results })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load used product search results.'
        sendJson(res, 400, { error: message })
      }

      return
    }

    if (requestUrl.pathname !== '/api/scrape-product') {
      next()
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' })
      return
    }

    try {
      const body = await readJsonBody(req)
      const product = await scrapeProduct(body.url)
      sendJson(res, 200, { product })
    } catch (error) {
      const message = toUserFacingScrapeError(error)
      sendJson(res, 400, { error: message })
    }
  }
}

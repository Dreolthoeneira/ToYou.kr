export interface KoreanAddressSearchResult {
  postalCode: string
  address: string
}

interface KakaoPostcodeData {
  zonecode: string
  address: string
  roadAddress: string
  jibunAddress: string
  bname: string
  buildingName: string
  apartment: 'Y' | 'N'
}

interface KakaoPostcodeOptions {
  oncomplete: (data: KakaoPostcodeData) => void
  onclose: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void
  width?: number | string
  height?: number | string
  animation?: boolean
}

interface KakaoPostcodeOpenOptions {
  popupTitle?: string
  popupKey?: string
}

interface KakaoPostcodeEmbedOptions {
  autoClose?: boolean
}

type KakaoPostcodeConstructor = new (options: KakaoPostcodeOptions) => {
  open: (options?: KakaoPostcodeOpenOptions) => void
  embed: (element: HTMLElement, options?: KakaoPostcodeEmbedOptions) => void
}

declare global {
  interface Window {
    daum?: {
      Postcode?: KakaoPostcodeConstructor
    }
    kakao?: {
      Postcode?: KakaoPostcodeConstructor
    }
  }
}

const postcodeScriptUrl = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
let postcodeScriptPromise: Promise<KakaoPostcodeConstructor> | null = null

function getPostcodeConstructor() {
  return window.daum?.Postcode ?? window.kakao?.Postcode
}

function loadPostcodeScript() {
  const loadedConstructor = getPostcodeConstructor()
  if (loadedConstructor) return Promise.resolve(loadedConstructor)
  if (postcodeScriptPromise) return postcodeScriptPromise

  postcodeScriptPromise = new Promise<KakaoPostcodeConstructor>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      postcodeScriptPromise = null
      reject(new Error('주소 검색 서비스 응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.'))
    }, 8_000)
    const handleLoad = () => {
      const Postcode = getPostcodeConstructor()
      if (Postcode) {
        window.clearTimeout(timeoutId)
        resolve(Postcode)
      } else {
        window.clearTimeout(timeoutId)
        postcodeScriptPromise = null
        reject(new Error('주소 검색 서비스를 초기화하지 못했습니다.'))
      }
    }
    const handleError = () => {
      window.clearTimeout(timeoutId)
      postcodeScriptPromise = null
      reject(new Error('주소 검색 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'))
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${postcodeScriptUrl}"]`)
    if (existingScript) {
      // A script tag can remain in the document after a browser extension,
      // privacy setting, or transient network failure prevented execution.
      // Replace that stale tag instead of waiting for a load event that has
      // already happened.
      existingScript.remove()
    }

    const script = document.createElement('script')
    script.src = postcodeScriptUrl
    script.async = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return postcodeScriptPromise
}

function formatSelectedAddress(data: KakaoPostcodeData) {
  const baseAddress = data.roadAddress || data.address || data.jibunAddress
  if (!data.roadAddress) return baseAddress

  const extraParts: string[] = []
  if (data.bname && /[동로가]$/.test(data.bname)) extraParts.push(data.bname)
  if (data.apartment === 'Y' && data.buildingName && !extraParts.includes(data.buildingName)) {
    extraParts.push(data.buildingName)
  }

  return extraParts.length ? `${baseAddress} (${extraParts.join(', ')})` : baseAddress
}

export async function openKoreanAddressSearch(): Promise<KoreanAddressSearchResult | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'postcode-modal'
    overlay.setAttribute('role', 'presentation')

    const dialog = document.createElement('section')
    dialog.className = 'postcode-modal__dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-labelledby', 'postcode-modal-title')

    const header = document.createElement('header')
    header.className = 'postcode-modal__header'

    const title = document.createElement('h2')
    title.id = 'postcode-modal-title'
    title.textContent = '주소 검색'

    const closeButton = document.createElement('button')
    closeButton.className = 'postcode-modal__close'
    closeButton.type = 'button'
    closeButton.setAttribute('aria-label', '주소 검색 닫기')
    closeButton.textContent = '×'

    const content = document.createElement('div')
    content.className = 'postcode-modal__content'

    const status = document.createElement('div')
    status.className = 'postcode-modal__status'
    status.setAttribute('role', 'status')
    status.textContent = '주소 검색 서비스를 불러오는 중입니다.'

    const embedTarget = document.createElement('div')
    embedTarget.className = 'postcode-modal__embed'
    embedTarget.hidden = true

    header.append(title, closeButton)
    content.append(status, embedTarget)
    dialog.append(header, content)
    overlay.append(dialog)
    document.body.append(overlay)
    document.body.classList.add('postcode-modal-open')
    closeButton.focus()

    let settled = false
    const finish = (result: KoreanAddressSearchResult | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('keydown', handleKeydown)
      document.body.classList.remove('postcode-modal-open')
      overlay.remove()
      resolve(result)
    }

    closeButton.addEventListener('click', () => finish(null))
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) finish(null)
    })

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null)
    }
    window.addEventListener('keydown', handleKeydown)

    loadPostcodeScript()
      .then((Postcode) => {
        if (settled) return
        status.remove()
        embedTarget.hidden = false

        const postcode = new Postcode({
          width: '100%',
          height: '100%',
          animation: true,
          oncomplete: (data) => {
            finish({
              postalCode: data.zonecode,
              address: formatSelectedAddress(data),
            })
          },
          onclose: () => undefined,
        })

        postcode.embed(embedTarget, { autoClose: false })
      })
      .catch((error: unknown) => {
        if (settled) return
        status.classList.add('postcode-modal__status--error')
        status.setAttribute('role', 'alert')
        status.textContent = error instanceof Error
          ? error.message
          : '주소 검색 서비스를 불러오지 못했습니다.'
      })
  })
}

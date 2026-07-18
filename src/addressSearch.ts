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
  width?: number
  height?: number
  animation?: boolean
}

interface KakaoPostcodeOpenOptions {
  popupTitle?: string
  popupKey?: string
}

type KakaoPostcodeConstructor = new (options: KakaoPostcodeOptions) => {
  open: (options?: KakaoPostcodeOpenOptions) => void
}

declare global {
  interface Window {
    kakao?: {
      Postcode?: KakaoPostcodeConstructor
    }
  }
}

const postcodeScriptUrl = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
let postcodeScriptPromise: Promise<KakaoPostcodeConstructor> | null = null

function getPostcodeConstructor() {
  return window.kakao?.Postcode
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
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      window.setTimeout(() => {
        const Postcode = getPostcodeConstructor()
        if (Postcode) {
          window.clearTimeout(timeoutId)
          resolve(Postcode)
        }
      }, 0)
      return
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
  const Postcode = await loadPostcodeScript()

  return new Promise((resolve) => {
    let selected = false
    const postcode = new Postcode({
      width: 500,
      height: 600,
      animation: true,
      oncomplete: (data) => {
        selected = true
        resolve({
          postalCode: data.zonecode,
          address: formatSelectedAddress(data),
        })
      },
      onclose: () => {
        if (!selected) resolve(null)
      },
    })

    postcode.open({
      popupTitle: 'TO YOU 주소 검색',
      popupKey: 'toyouPostcode',
    })
  })
}

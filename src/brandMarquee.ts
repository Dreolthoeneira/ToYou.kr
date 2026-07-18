type BrandLogoSpec = {
  name: string
  width: number
  fontFamily: string
  fontSize: number
  fontWeight: number
  letterSpacing?: string
  fill?: string
  background?: string
  border?: string
}

export type BrandMarqueeLogo = {
  name: string
  src: string
  width: number
  height: number
}

const LOGO_HEIGHT = 88

const brandLogoSpecs: BrandLogoSpec[] = [
  {
    name: 'RINS',
    width: 184,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: '0.18em',
  },
  {
    name: 'MATIN KIM',
    width: 268,
    fontFamily: 'Georgia, Times New Roman, serif',
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  {
    name: 'MUSINSA',
    width: 244,
    fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: '0.06em',
  },
  {
    name: 'OLIVE YOUNG',
    width: 312,
    fontFamily: 'Trebuchet MS, Arial, Helvetica, sans-serif',
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.05em',
    fill: '#1c8e57',
  },
  {
    name: '29CM',
    width: 186,
    fontFamily: 'Georgia, Times New Roman, serif',
    fontSize: 36,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  {
    name: 'KREAM',
    width: 210,
    fontFamily: 'Arial Black, Arial, Helvetica, sans-serif',
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: '0.08em',
  },
  {
    name: 'BUNJANG',
    width: 240,
    fontFamily: 'Verdana, Arial, Helvetica, sans-serif',
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.06em',
    fill: '#2a5bd7',
  },
  {
    name: 'W CONCEPT',
    width: 286,
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '0.12em',
  },
  {
    name: 'TAMBU',
    width: 214,
    fontFamily: 'Georgia, Times New Roman, serif',
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: '0.16em',
  },
]

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function createBrandLogoDataUrl(spec: BrandLogoSpec) {
  const {
    name,
    width,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing = '0.06em',
    fill = '#111111',
    background = '#f7f4ed',
    border = 'rgba(17, 17, 17, 0.08)',
  } = spec

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LOGO_HEIGHT}" viewBox="0 0 ${width} ${LOGO_HEIGHT}" fill="none">
      <rect x="1" y="1" width="${width - 2}" height="${LOGO_HEIGHT - 2}" rx="${LOGO_HEIGHT / 2}" fill="${background}" stroke="${border}" stroke-width="1.5" />
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        font-weight="${fontWeight}"
        letter-spacing="${letterSpacing}"
        fill="${fill}"
      >${escapeXml(name)}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const brandMarqueeLogos: BrandMarqueeLogo[] = brandLogoSpecs.map((spec) => ({
  name: spec.name,
  src: createBrandLogoDataUrl(spec),
  width: spec.width,
  height: LOGO_HEIGHT,
}))

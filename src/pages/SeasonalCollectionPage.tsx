import { useEffect, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ShoppingBag,
  Snowflake,
  Sprout,
  Sun,
  Truck,
} from 'lucide-react'
import type { CatalogProduct } from '../catalog'
import { ProductArtwork } from '../components/ProductArtwork'
import { currencyFormatter } from '../data'
import { SITE_BRAND } from '../siteBrand'

export type CollectionSeason = 'spring' | 'summer' | 'winter'

interface SeasonalCollectionPageProps {
  season: CollectionSeason
  products: CatalogProduct[]
  onGoHome: () => void
  onOpenCollection: (season: CollectionSeason) => void
  onOpenProduct: (productId: string) => void
  onCheckout: (productId: string, quantity: number, option: string) => void
}

const collectionData = {
  spring: {
    number: '01',
    season: 'SPRING 2026',
    hero: ['Soft', 'Spring'],
    kicker: 'SEASONAL COLLECTION · 01',
    intro: '천천히 피어나는 색, 가볍게 손에 잡히는 형태. 봄의 첫 장면을 닮은 두 가지 물건을 골랐습니다.',
    note: 'Soft light, new rhythm.',
    storyTitle: '새로운 계절은 작은 변화에서 시작됩니다.',
    storyBody: '과장되지 않은 색과 매일의 움직임을 방해하지 않는 편안한 형태. 봄 컬렉션은 익숙한 하루를 조금 더 가볍게 만드는 감각에 집중했습니다.',
    editTitle: ['Objects for', 'a lighter day.'],
    moodTitle: ['Bloom at', 'your own pace.'],
    moodBody: '부드러운 빛과 가벼운 색을 곁에 두고, 서두르지 않는 방식으로 새로운 계절을 시작해 보세요.',
    traits: ['GENTLE COLOR', 'LIGHT FORM', 'NEW RHYTHM'],
    next: 'summer' as const,
    nextLabel: 'HIGH SUMMER',
  },
  summer: {
    number: '02',
    season: 'SUMMER 2026',
    hero: ['High', 'Summer'],
    kicker: 'SEASONAL COLLECTION · 02',
    intro: '강한 햇빛, 차가운 물, 선명한 컬러. 여름의 속도와 온도를 담은 경쾌한 오브제를 소개합니다.',
    note: 'Stay light. Stay vivid.',
    storyTitle: '여름은 가장 선명한 순간을 기억합니다.',
    storyBody: '가볍게 들고 나가고, 빠르게 꺼내 쓰고, 어디에서나 분명하게 보이는 것. 한여름의 리듬에 맞춰 컬러와 사용감을 새롭게 조합했습니다.',
    editTitle: ['Objects for', 'bright escapes.'],
    moodTitle: ['Find your', 'own blue.'],
    moodBody: '눈부신 낮과 늦은 저녁 사이, 선명한 색과 가벼운 움직임이 여름의 장면을 완성합니다.',
    traits: ['CLEAR COLOR', 'COOL TOUCH', 'FAST RHYTHM'],
    next: 'winter' as const,
    nextLabel: 'QUIET WINTER',
  },
  winter: {
    number: '03',
    season: 'WINTER 2026',
    hero: ['Quiet', 'Winter'],
    kicker: 'SEASONAL COLLECTION · 03',
    intro: '눈이 그친 뒤의 고요한 공기처럼 차분한 색과 손끝에 오래 남는 질감을 모았습니다.',
    note: 'Keep the quiet close.',
    storyTitle: '오래 머무는 물건에는 조용한 온도가 있습니다.',
    storyBody: '빛을 낮추고 재료의 표면과 깊은 색에 집중했습니다. 겨울 컬렉션은 실내의 느린 시간과 자연스럽게 어울리는 물건을 제안합니다.',
    editTitle: ['Objects for', 'slower days.'],
    moodTitle: ['Stay for', 'a while.'],
    moodBody: '따뜻한 빛, 손끝에 닿는 질감, 오래 머무는 향. 속도를 늦출수록 또렷해지는 겨울의 감각을 만나보세요.',
    traits: ['LOW LIGHT', 'WARM TOUCH', 'SLOW RITUAL'],
    next: 'spring' as const,
    nextLabel: 'SOFT SPRING',
  },
} as const

const seasonOrder: CollectionSeason[] = ['spring', 'summer', 'winter']

function SeasonIcon({ season }: { season: CollectionSeason }) {
  if (season === 'spring') return <Sprout />
  if (season === 'summer') return <Sun />
  return <Snowflake />
}

export function SeasonalCollectionPage({
  season,
  products,
  onGoHome,
  onOpenCollection,
  onOpenProduct,
  onCheckout,
}: SeasonalCollectionPageProps) {
  const data = collectionData[season]
  const activeProducts = products.filter((product) => product.status === 'active' && product.stock > 0)
  const seasonIndex = seasonOrder.indexOf(season)
  const collectionProducts = activeProducts.slice(seasonIndex * 2, seasonIndex * 2 + 2)
  const fallbackProducts = collectionProducts.length === 2 ? collectionProducts : activeProducts.slice(0, 2)
  const [heroProductIndex, setHeroProductIndex] = useState(0)
  const leadProduct = fallbackProducts[heroProductIndex % Math.max(1, fallbackProducts.length)]

  useEffect(() => {
    setHeroProductIndex(0)
    if (fallbackProducts.length < 2) return

    const timer = window.setInterval(() => {
      setHeroProductIndex((current) => (current + 1) % fallbackProducts.length)
    }, 5200)

    return () => window.clearInterval(timer)
  }, [fallbackProducts.length, season])

  if (!leadProduct) {
    return (
      <main className="editorial-collection-empty">
        <span>{data.season}</span>
        <h1>컬렉션을 준비하고 있습니다.</h1>
        <button type="button" onClick={onGoHome}>스토어로 돌아가기</button>
      </main>
    )
  }

  function scrollToEdit() {
    document.getElementById('seasonal-edit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`editorial-collection editorial-collection--${season}`}>
      <header className="editorial-collection__header">
        <button type="button" className="editorial-collection__back" onClick={onGoHome}><ArrowLeft size={16} /> STORE</button>
        <button type="button" className="editorial-collection__wordmark" onClick={onGoHome}>{SITE_BRAND.toUpperCase()}</button>
        <nav aria-label="Season collections">
          {seasonOrder.map((item) => (
            <button type="button" key={item} className={item === season ? 'is-active' : ''} onClick={() => onOpenCollection(item)}>
              <span>0{seasonOrder.indexOf(item) + 1}</span>{item.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      <main>
        <section className="editorial-collection__hero">
          <div className="editorial-collection__weather" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>

          <div className="editorial-collection__hero-copy">
            <div className="editorial-collection__eyebrow"><SeasonIcon season={season} /> {data.kicker}</div>
            <h1><span>{data.hero[0]}</span><em>{data.hero[1]}</em></h1>
            <div className="editorial-collection__hero-note">
              <span>{data.number} / 03</span>
              <div><p>{data.intro}</p><small>{data.note}</small></div>
            </div>
            <button type="button" className="editorial-collection__discover" onClick={scrollToEdit}>
              컬렉션 둘러보기 <ArrowDown size={16} />
            </button>
          </div>

          <div className="editorial-collection__spotlight" aria-live="polite">
            <button key={`${season}-${leadProduct.id}`} type="button" className="editorial-collection__spotlight-media" onClick={() => onOpenProduct(leadProduct.id)} aria-label={`${leadProduct.name} 상세 보기`}>
              <ProductArtwork art={leadProduct.art} palette={leadProduct.palette} accent={leadProduct.accent} imageUrl={leadProduct.imageUrl} name={leadProduct.name} imageLoading="eager" />
              <span className="editorial-collection__view">VIEW <ArrowUpRight size={15} /></span>
            </button>
            <div className="editorial-collection__spotlight-info">
              <span>{leadProduct.category} · CURATED 0{heroProductIndex + 1}</span>
              <strong>{leadProduct.name}</strong>
              <em>{currencyFormatter.format(leadProduct.price)}</em>
            </div>
            <div className="editorial-collection__switcher">
              {fallbackProducts.map((product, index) => (
                <button type="button" key={product.id} className={index === heroProductIndex ? 'is-active' : ''} onClick={() => setHeroProductIndex(index)}>
                  <i>0{index + 1}</i><span>{product.name}</span><b aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div className="editorial-collection__hero-stamp" aria-hidden="true">
            <span>CURATED IN SEOUL</span><strong>’26</strong>
          </div>
        </section>

        <section className="editorial-collection__index" aria-label="Collection information">
          <article><small>EDITION</small><strong>{data.number} / SEASONAL ARCHIVE</strong></article>
          <article><small>OBJECTS</small><strong>02 LIMITED SELECTIONS</strong></article>
          <article><small>DELIVERY</small><strong><Truck size={13} /> 1–3 BUSINESS DAYS</strong></article>
          <article><small>BENEFIT</small><strong>₩70,000+ FREE SHIPPING</strong></article>
        </section>

        <section className="editorial-collection__story">
          <div className="editorial-collection__story-label">
            <span>{data.number}</span>
            <div><SeasonIcon season={season} /><small>THE SEASONAL NOTE<br />SEOUL, 2026</small></div>
          </div>
          <div className="editorial-collection__story-copy">
            <h2>{data.storyTitle}</h2>
            <p>{data.storyBody}</p>
          </div>
          <aside>
            <span>SEASON PALETTE</span>
            <div className="editorial-collection__palette"><i /><i /><i /><i /></div>
            <p>COLOR / TEXTURE / LIGHT<br />A STUDY IN EVERYDAY OBJECTS</p>
          </aside>
        </section>

        <section className="editorial-collection__edit" id="seasonal-edit">
          <header>
            <div><span>THE EDIT · {data.number}</span><p>두 가지 물건으로 완성하는 계절의 장면</p></div>
            <h2><span>{data.editTitle[0]}</span><em>{data.editTitle[1]}</em></h2>
            <strong>02<br /><span>OBJECTS</span></strong>
          </header>

          <div className="editorial-collection__lookbook">
            {fallbackProducts.map((product, index) => (
              <article key={product.id} className={index % 2 ? 'is-reversed' : ''}>
                <button type="button" className="editorial-collection__product-media" onClick={() => onOpenProduct(product.id)}>
                  <ProductArtwork art={product.art} palette={product.palette} accent={product.accent} imageUrl={product.imageUrl} name={product.name} />
                  <span>0{index + 1}</span>
                  <i>DISCOVER <ArrowUpRight size={15} /></i>
                </button>
                <div className="editorial-collection__product-copy">
                  <div className="editorial-collection__product-meta"><span>{product.category}</span><span>IN STOCK · {product.stock}</span></div>
                  <h3><button type="button" onClick={() => onOpenProduct(product.id)}>{product.name}</button></h3>
                  <p>{product.summary}</p>
                  {product.details[0] ? <blockquote>{product.details[0]}</blockquote> : null}
                  <div className="editorial-collection__options">
                    {(product.options.length ? product.options : ['기본 옵션']).slice(0, 3).map((option, optionIndex) => <span key={option}><i>{optionIndex === 0 ? <Check size={11} /> : null}</i>{option}</span>)}
                  </div>
                  <div className="editorial-collection__price">
                    <strong>{currencyFormatter.format(product.price)}</strong>
                    {product.compareAtPrice > product.price ? <del>{currencyFormatter.format(product.compareAtPrice)}</del> : null}
                  </div>
                  <div className="editorial-collection__actions">
                    <button type="button" onClick={() => onOpenProduct(product.id)}>자세히 보기 <ArrowRight size={15} /></button>
                    <button type="button" onClick={() => onCheckout(product.id, 1, product.options[0] ?? '')}><ShoppingBag size={15} /> 바로 구매</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="editorial-collection__mood" aria-label="Collection mood">
          <div className="editorial-collection__mood-orbit" aria-hidden="true"><i /><i /><i /></div>
          <span>{data.traits.join(' / ')}</span>
          <h2><span>{data.moodTitle[0]}</span><em>{data.moodTitle[1]}</em></h2>
          <p>{data.moodBody}</p>
          <div className="editorial-collection__traits">
            {data.traits.map((trait, index) => <div key={trait}><small>0{index + 1}</small><strong>{trait}</strong></div>)}
          </div>
        </section>

        <section className="editorial-collection__next">
          <div><span>NEXT COLLECTION</span><small>CONTINUE THE SEASONAL ARCHIVE</small></div>
          <button type="button" onClick={() => onOpenCollection(data.next)}>{data.nextLabel} <ArrowRight /></button>
        </section>
      </main>

      <footer className="editorial-collection__footer">
        <strong>{SITE_BRAND.toUpperCase()}</strong>
        <span>{data.season} · CURATED IN SEOUL</span>
        <button type="button" onClick={onGoHome}>BACK TO STORE <ArrowUpRight size={14} /></button>
      </footer>
    </div>
  )
}

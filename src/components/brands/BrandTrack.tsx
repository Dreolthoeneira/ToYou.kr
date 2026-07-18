import { brandMarqueeLogos } from '../../brandMarquee'

export function BrandTrack() {
  return (
    <section className="brand-section">
      <div className="brand-scroll">
        <div className="brand-track">
          {[...brandMarqueeLogos, ...brandMarqueeLogos].map((brand, i) => (
            <span
              key={`${brand.name}-${i}`}
              className="brand-item marquee-logo"
              aria-hidden={i >= brandMarqueeLogos.length}
            >
              <img
                src={brand.src}
                alt={i >= brandMarqueeLogos.length ? '' : `${brand.name} logo`}
                width={brand.width}
                height={brand.height}
                decoding="async"
              />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

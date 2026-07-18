import { currencyFormatter, products, trendKeywords, type Product } from '../../data'
import { ProductVisual } from '../visuals/ProductVisual'

interface ProductSectionProps {
  activeProductId: string
  setActiveProductId: (id: string) => void
  activeCategory: string
  setActiveCategory: (cat: string) => void
  setQuery: (q: string) => void
}

const categories = ['전체', ...new Set(products.map((product) => product.category))]

export function ProductSection({
  activeProductId,
  setActiveProductId,
  activeCategory,
  setActiveCategory,
  setQuery,
}: ProductSectionProps) {
  const filteredProducts =
    activeCategory === '전체'
      ? products
      : products.filter((p) => p.category === activeCategory)

  return (
    <section className="trend-panel-section" id="discover">
      <div className="section-heading">
        <div>
          <p className="eyebrow eyebrow--compact">SEOUL CURATION</p>
          <h2>실시간으로 회전하는 서울 취향</h2>
        </div>
        <p>
          한국에서 가장 인기 있는 스토어의 트렌드를 실시간으로 큐레이션합니다.
          관심 있는 키워드를 눌러 지금 가장 핫한 아이템을 확인해 보세요.
        </p>
      </div>

      <div className="trend-keywords">
        {trendKeywords.map((keyword, index) => (
          <button
            key={keyword}
            type="button"
            className={`trend-chip ${index % 3 === 0 ? 'trend-chip--accent' : ''}`}
            onClick={() => {
              setQuery(keyword)
              setActiveProductId(products[index % products.length].id)
            }}
          >
            {keyword}
          </button>
        ))}
      </div>

      <div className="discover-controls">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={category === activeCategory ? 'is-active' : ''}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <p>상품 카드를 누르면 상단 예상가 카드가 즉시 업데이트됩니다.</p>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            type="button"
            className={`product-card ${product.id === activeProductId ? 'product-card--active' : ''}`}
            onClick={() => setActiveProductId(product.id)}
          >
            <div className="product-card__meta">
              <span>{product.marketplace}</span>
              <span>{product.discount}% off</span>
            </div>

            <ProductVisual art={product.art} palette={product.palette} accent={product.accent} />

            <div className="product-card__content">
              <p>{product.category}</p>
              <h3>{product.name}</h3>
              <span>{product.caption}</span>
            </div>

            <div className="product-card__bottom">
              <strong>{currencyFormatter.format(product.price)}</strong>
              <span>{currencyFormatter.format(product.originalPrice)}</span>
            </div>

            <div className="product-card__tags">
              {product.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

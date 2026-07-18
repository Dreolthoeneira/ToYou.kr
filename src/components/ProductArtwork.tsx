import { useEffect, useState, type CSSProperties } from 'react'
import type { Product } from '../data'
import { resolveProductImageUrl } from './ProductImage'

interface ProductArtworkProps extends Pick<Product, 'art' | 'palette' | 'accent'> {
  imageUrl?: string
  name?: string
  style?: CSSProperties
  imageLoading?: 'eager' | 'lazy'
}

export function ProductArtwork({
  art,
  palette,
  accent,
  imageUrl,
  name,
  style,
  imageLoading = 'lazy',
}: ProductArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const [useOriginalImageUrl, setUseOriginalImageUrl] = useState(false)

  useEffect(() => {
    setHasImageError(false)
    setUseOriginalImageUrl(false)
  }, [imageUrl])

  const proxiedImageUrl = resolveProductImageUrl(imageUrl)
  const resolvedImageUrl = useOriginalImageUrl ? imageUrl ?? '' : proxiedImageUrl

  function handleImageError() {
    if (resolvedImageUrl && imageUrl && resolvedImageUrl !== imageUrl) {
      setUseOriginalImageUrl(true)
      return
    }

    setHasImageError(true)
  }

  return (
    <div
      className={`product-art product-art--${resolvedImageUrl && !hasImageError ? 'image' : art}`}
      style={
        {
          '--tone-a': palette[0],
          '--tone-b': palette[1],
          '--tone-accent': accent,
          ...style,
        } as CSSProperties
      }
    >
      {resolvedImageUrl && !hasImageError ? (
        <img
          className="product-art__image"
          src={resolvedImageUrl}
          alt={name ?? 'Imported product image'}
          loading={imageLoading}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
      ) : (
        <>
          <div className="product-art__glow" />
          {art === 'case' && (
            <>
              <div className="shape case-shell" />
              <div className="shape case-lens case-lens--a" />
              <div className="shape case-lens case-lens--b" />
              <div className="shape case-lens case-lens--c" />
            </>
          )}
          {art === 'bag' && (
            <>
              <div className="shape bag-body" />
              <div className="shape bag-pocket" />
              <div className="shape bag-handle" />
            </>
          )}
          {art === 'drop' && (
            <>
              <div className="shape bottle-body" />
              <div className="shape bottle-cap" />
              <div className="shape bottle-drop" />
            </>
          )}
          {art === 'buds' && (
            <>
              <div className="shape buds-case" />
              <div className="shape bud bud--a" />
              <div className="shape bud bud--b" />
            </>
          )}
          {art === 'cap' && (
            <>
              <div className="shape cap-crown" />
              <div className="shape cap-brim" />
            </>
          )}
          {art === 'jar' && (
            <>
              <div className="shape jar-glass" />
              <div className="shape jar-lid" />
              <div className="shape jar-label" />
            </>
          )}
        </>
      )}
    </div>
  )
}

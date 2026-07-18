import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { isSupabaseConfigured } from '../supabaseClient'

interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageUrl?: string
  fallbackLabel?: string
}

export function resolveProductImageUrl(imageUrl?: string) {
  if (!imageUrl) {
    return ''
  }

  return /^https?:\/\//i.test(imageUrl) && !isSupabaseConfigured
    ? `/api/product-image?url=${encodeURIComponent(imageUrl)}`
    : imageUrl
}

export function ProductImage({ imageUrl, fallbackLabel, className = '', alt = '', ...props }: ProductImageProps) {
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

  if (!resolvedImageUrl || hasImageError) {
    return (
      <span className={`product-image-fallback ${className}`} role="img" aria-label={alt}>
        {fallbackLabel || alt || 'Product image'}
      </span>
    )
  }

  return (
    <img
      {...props}
      className={className}
      src={resolvedImageUrl}
      alt={alt}
      referrerPolicy={props.referrerPolicy ?? 'no-referrer'}
      onError={handleImageError}
    />
  )
}

import type { ArtType } from '../../data'

interface ProductVisualProps {
  art: ArtType
  palette?: [string, string]
  accent?: string
  className?: string
}

export function ProductVisual({
  art,
  palette = ['#fff', '#f0f0f0'],
  accent = '#b12d57',
  className = '',
}: ProductVisualProps) {
  return (
    <div
      className={`product-visual product-visual--${art} ${className}`}
      style={
        {
          '--tone-a': palette[0],
          '--tone-b': palette[1],
          '--tone-accent': accent,
        } as React.CSSProperties
      }
    >
      <div className="visual-glow" />
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
      {art === 'box' && (
        <>
          <div className="shape box-side" />
          <div className="shape box-flap" />
        </>
      )}
      {art === 'van' && (
        <>
          <div className="shape van-body" />
          <div className="shape van-wheel van-wheel--a" />
          <div className="shape van-wheel van-wheel--b" />
        </>
      )}
    </div>
  )
}

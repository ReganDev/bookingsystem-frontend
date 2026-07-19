import { useState } from 'react'

/** Photo gallery shown beside the booking card: one large image with a
 *  thumbnail strip. Images that fail to load are dropped so a broken URL
 *  never leaves an empty box. */
export function BusinessGallery({
  photos,
  businessName,
}: {
  photos: string[]
  businessName: string
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const [activeIndex, setActiveIndex] = useState(0)

  const usable = photos.filter((url) => !broken.has(url))
  if (usable.length === 0) return null

  const active = usable[Math.min(activeIndex, usable.length - 1)]

  function markBroken(url: string) {
    setBroken((current) => {
      const next = new Set(current)
      next.add(url)
      return next
    })
  }

  return (
    <aside className="booking-gallery" aria-label={`Photos of ${businessName}`}>
      <div className="booking-gallery-main">
        <img
          src={active}
          alt={`${businessName}`}
          loading="lazy"
          onError={() => markBroken(active)}
        />
      </div>
      {usable.length > 1 && (
        <div className="booking-gallery-thumbs">
          {usable.map((url, index) => (
            <button
              key={url}
              type="button"
              className={`booking-gallery-thumb ${
                url === active ? 'active' : ''
              }`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={url === active ? 'true' : undefined}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                onError={() => markBroken(url)}
              />
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

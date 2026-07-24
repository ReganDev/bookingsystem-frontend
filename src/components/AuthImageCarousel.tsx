import { useEffect, useState } from 'react'

const SLIDES = [
  {
    src: '/auth-carousel/hair-styling.png',
    alt: 'Client enjoying a hair styling appointment',
  },
  {
    src: '/auth-carousel/hair-wash.png',
    alt: 'Stylist washing a client’s hair at the salon',
  },
  {
    src: '/auth-carousel/hair-spray.png',
    alt: 'Stylist finishing a client’s hairstyle',
  },
] as const

const INTERVAL_MS = 3000

export function AuthImageCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % SLIDES.length)
    }, INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="auth-carousel" aria-hidden="true">
      {SLIDES.map((slide, index) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          className={`auth-carousel-image ${
            index === activeIndex ? 'active' : ''
          }`}
          loading={index === 0 ? 'eager' : 'lazy'}
        />
      ))}
      <div className="auth-carousel-overlay" />
      <div className="auth-carousel-caption">
        <p className="auth-carousel-eyebrow">BookingBase</p>
        <p className="auth-carousel-title">Book services you trust</p>
      </div>
    </div>
  )
}

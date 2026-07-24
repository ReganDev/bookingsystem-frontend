import { useEffect, useState } from 'react'

const SLIDES = [
  {
    src: '/auth-carousel/handyman.png',
    alt: 'Handyman completing a service for a customer',
  },
  {
    src: '/auth-carousel/hair-salon.png',
    alt: 'Hair stylist finishing a client appointment',
  },
  {
    src: '/auth-carousel/business-handshake.png',
    alt: 'Business professional greeting a client',
  },
  {
    src: '/auth-carousel/salon-station.png',
    alt: 'Modern salon styling station',
  },
  {
    src: '/auth-carousel/barbershop.png',
    alt: 'Barbershop interior with styling chair',
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

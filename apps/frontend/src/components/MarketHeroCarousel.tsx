import { useEffect, useState } from 'react'

type HeroStat = {
  label: string
  value: string
  tone: 'gold' | 'mint' | 'cream'
}

type HeroSlide = {
  id: string
  image: string
  eyebrow: string
  title: string
  subtitle: string
  stats: HeroStat[]
}

const slides: HeroSlide[] = [
  {
    id: 'market-morning',
    image: '/market-scenes/dashboard-market-1.jpg',
    eyebrow: 'Market pulse',
    title: 'Every trading day has a story.',
    subtitle: 'Track sales, stock, debtors, and savings from one grounded business workspace.',
    stats: [
      { label: 'Sales', value: 'Live today', tone: 'gold' },
      { label: 'Stock', value: 'Always in view', tone: 'mint' },
    ],
  },
  {
    id: 'market-rhythm',
    image: '/market-scenes/dashboard-market-2.jpg',
    eyebrow: 'Business rhythm',
    title: 'Built for the pace of the market.',
    subtitle: 'Keep your records moving even when the day is busy, loud, and fast.',
    stats: [
      { label: 'Debtors', value: 'Follow up faster', tone: 'cream' },
      { label: 'Savings', value: 'Close the day well', tone: 'gold' },
    ],
  },
  {
    id: 'market-discipline',
    image: '/market-scenes/dashboard-market-3.jpg',
    eyebrow: 'Trade discipline',
    title: 'Real market energy, clear business control.',
    subtitle: 'Use the atmosphere of trade without losing the focus of your numbers.',
    stats: [
      { label: 'Records', value: 'Clean and simple', tone: 'mint' },
      { label: 'Reports', value: 'Ready to review', tone: 'cream' },
    ],
  },
]

const toneClasses: Record<HeroStat['tone'], string> = {
  gold: 'border-[rgba(232,168,56,0.28)] bg-[rgba(232,168,56,0.12)] text-[#f0bc5a]',
  mint: 'border-[rgba(78,204,163,0.28)] bg-[rgba(78,204,163,0.12)] text-[#4ecca3]',
  cream: 'border-white/10 bg-white/6 text-primary',
}

const getTimeMood = () => {
  const hour = new Date().getHours()

  if (hour < 12) {
    return {
      tint: 'linear-gradient(90deg, rgba(19,11,8,0.9) 0%, rgba(19,11,8,0.68) 38%, rgba(19,11,8,0.46) 62%, rgba(19,11,8,0.84) 100%), linear-gradient(180deg, rgba(232,168,56,0.18) 0%, rgba(196,98,45,0.12) 40%, rgba(26,15,10,0.56) 100%)',
      glow: 'bg-[radial-gradient(circle_at_top_right,rgba(232,168,56,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,98,45,0.14),transparent_28%)]',
    }
  }

  if (hour < 17) {
    return {
      tint: 'linear-gradient(90deg, rgba(19,11,8,0.92) 0%, rgba(19,11,8,0.72) 38%, rgba(19,11,8,0.5) 62%, rgba(19,11,8,0.86) 100%), linear-gradient(180deg, rgba(196,98,45,0.15) 0%, rgba(120,59,31,0.1) 42%, rgba(26,15,10,0.58) 100%)',
      glow: 'bg-[radial-gradient(circle_at_top_right,rgba(196,98,45,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(232,168,56,0.12),transparent_28%)]',
    }
  }

  return {
    tint: 'linear-gradient(90deg, rgba(15,9,7,0.94) 0%, rgba(15,9,7,0.76) 38%, rgba(15,9,7,0.54) 62%, rgba(15,9,7,0.9) 100%), linear-gradient(180deg, rgba(77,45,92,0.14) 0%, rgba(196,98,45,0.1) 42%, rgba(26,15,10,0.66) 100%)',
    glow: 'bg-[radial-gradient(circle_at_top_right,rgba(159,176,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(196,98,45,0.12),transparent_28%)]',
  }
}

type MarketHeroCarouselProps = {
  businessName: string
  greeting: string
  dateLabel: string
  initials: string
}

export const MarketHeroCarousel = ({
  businessName,
  greeting,
  dateLabel,
  initials,
}: MarketHeroCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const mood = getTimeMood()

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, 6500)

    return () => window.clearInterval(timer)
  }, [])

  const activeSlide = slides[activeIndex]

  return (
    <section
      className="relative overflow-hidden rounded-[26px] border border-[#c4622d]/20 px-4 py-4 sm:rounded-3xl sm:px-5 sm:py-5 md:px-8 md:py-7"
      style={{
        background:
          'linear-gradient(180deg, rgba(15,9,7,0.18) 0%, rgba(15,9,7,0.44) 100%), radial-gradient(120% 180% at 0% 0%, rgba(196,98,45,0.28) 0%, rgba(196,98,45,0.08) 42%, rgba(26,15,10,0.82) 100%)',
      }}
    >
      <div
        className="market-scene-pan absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{
          backgroundImage: `${mood.tint}, url('${activeSlide.image}')`,
          filter: 'saturate(0.95) contrast(1.03)',
        }}
      />
      <div className={`pointer-events-none absolute inset-0 ${mood.glow}`} />
      <div className="pointer-events-none absolute inset-0 pattern-dots opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a0f0a] via-[rgba(26,15,10,0.72)] to-transparent sm:h-28" />

      <div className="relative z-10 flex flex-col gap-4 sm:gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pr-1 sm:max-w-[75%]">
            <p className="font-ui text-xs font-semibold uppercase tracking-[0.13em] text-[rgba(245,237,224,0.52)]">
              {greeting}
            </p>
            <h1 className="mt-1 break-words font-display text-[clamp(1.45rem,6.6vw,2.6rem)] font-bold leading-[0.95] text-primary wonky sm:text-[clamp(1.7rem,3.5vw,2.6rem)]">
              {businessName}
            </h1>
            <p className="mt-2 max-w-[18rem] font-body text-[11px] leading-5 text-[rgba(245,237,224,0.56)] sm:max-w-none sm:text-xs md:text-sm">
              {dateLabel}
            </p>
          </div>

          <button
            aria-label="Profile"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-gradient-to-br from-[#c04818] to-[#e8a838] font-ui text-xs font-extrabold text-white shadow-[0_10px_30px_rgba(15,9,7,0.3)] sm:h-12 sm:w-12 sm:text-sm"
          >
            {initials || 'TB'}
          </button>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <div className="max-w-2xl rounded-[1.35rem] border border-white/10 bg-[rgba(21,12,9,0.52)] p-3.5 shadow-[0_18px_60px_rgba(8,4,2,0.24)] backdrop-blur-[6px] sm:rounded-[1.7rem] sm:p-4 md:p-5">
            <p className="label-base mb-2">{activeSlide.eyebrow}</p>
            <h2 className="max-w-xl text-[1.35rem] font-display font-bold leading-[1.06] text-primary wonky sm:text-2xl md:text-[2rem]">
              {activeSlide.title}
            </h2>
            <p className="mt-2 max-w-xl font-body text-[13px] leading-5 text-[rgba(245,237,224,0.74)] sm:text-sm sm:leading-6 md:text-[0.96rem]">
              {activeSlide.subtitle}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
              {activeSlide.stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`min-w-0 rounded-2xl border px-3 py-2.5 sm:min-w-[132px] sm:px-3.5 sm:py-3 ${toneClasses[stat.tone]}`}
                >
                  <p className="font-ui text-[0.58rem] font-bold uppercase tracking-[0.12em] opacity-80 sm:text-[0.64rem]">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-ui text-[13px] font-extrabold leading-5 sm:text-sm">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-white/10 bg-[rgba(21,12,9,0.6)] px-3.5 py-3 backdrop-blur-[6px] sm:px-4 lg:flex-col lg:items-stretch lg:justify-end lg:rounded-[1.35rem] lg:px-4 lg:py-4">
            <div className="min-w-0">
              <p className="label-base mb-1">Scene</p>
              <p className="font-ui text-sm font-bold text-primary sm:text-[0.95rem]">
                {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end lg:self-stretch lg:justify-end">
              {slides.map((slide, index) => (
                <span
                  key={slide.id}
                  aria-hidden="true"
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    index === activeIndex ? 'w-6 bg-[#f0bc5a] sm:w-7' : 'w-2.5 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

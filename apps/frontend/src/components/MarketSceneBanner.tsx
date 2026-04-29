import type { ReactNode } from 'react'

type MarketSceneBannerProps = {
  image: string
  eyebrow: string
  title: string
  description: string
  badge?: string
  children?: ReactNode
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

export const MarketSceneBanner = ({
  image,
  eyebrow,
  title,
  description,
  badge,
  children,
}: MarketSceneBannerProps) => {
  const mood = getTimeMood()

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#1c120e] px-4 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.25)] sm:rounded-[28px] sm:px-5 sm:py-5 md:px-6">
      <div
        className="market-scene-pan absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `${mood.tint}, url('${image}')`,
          filter: 'saturate(0.96) contrast(1.03)',
        }}
      />
      <div className={`pointer-events-none absolute inset-0 ${mood.glow}`} />
      <div className="pointer-events-none absolute inset-0 pattern-dots opacity-30" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#140d0a] via-[rgba(20,13,10,0.68)] to-transparent sm:h-24" />

      <div className="relative z-10 flex flex-col gap-3.5 sm:gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl min-w-0">
          <p className="label-base mb-2">{eyebrow}</p>
          <h1 className="break-words font-display text-[1.9rem] font-bold leading-[0.95] text-primary wonky sm:text-3xl md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-secondary sm:text-sm sm:leading-6">
            {description}
          </p>
        </div>

        {(badge || children) ? (
          <div className="flex flex-col items-start gap-2.5 sm:gap-3 md:items-end">
            {badge ? (
              <span className="rounded-full border border-[#e8a838]/25 bg-[rgba(32,18,12,0.62)] px-3 py-1 text-[10px] font-ui font-bold uppercase tracking-[0.08em] text-[#f0bc5a] backdrop-blur-[6px] sm:text-[11px]">
                {badge}
              </span>
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  )
}

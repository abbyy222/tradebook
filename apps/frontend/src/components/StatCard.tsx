import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  trend?: { text: string; positive: boolean }
  icon?: ReactNode
  accent?: 'terra' | 'gold' | 'danger' | 'neutral'
  isLoading?: boolean
  onClick?: () => void
}

const ACCENT_STYLES = {
  terra: {
    topGlow: 'rgba(196,98,45,0.5)',
    border: 'rgba(196,98,45,0.2)',
    bg: 'rgba(196,98,45,0.06)',
  },
  gold: {
    topGlow: 'rgba(232,168,56,0.5)',
    border: 'rgba(232,168,56,0.18)',
    bg: 'rgba(232,168,56,0.05)',
  },
  danger: {
    topGlow: 'rgba(226,75,74,0.5)',
    border: 'rgba(226,75,74,0.18)',
    bg: 'rgba(226,75,74,0.05)',
  },
  neutral: {
    topGlow: 'rgba(245,237,224,0.15)',
    border: 'rgba(255,255,255,0.07)',
    bg: 'rgba(255,255,255,0.02)',
  },
}

export const StatCard = ({
  label,
  value,
  subtext,
  trend,
  icon,
  accent = 'neutral',
  isLoading = false,
  onClick,
}: StatCardProps) => {
  const styles = ACCENT_STYLES[accent]

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className="group relative min-w-0 overflow-hidden rounded-2xl p-5 md:p-6"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={
        onClick
          ? (e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 10px 26px rgba(5, 3, 1, 0.25)'
            }
          : undefined
      }
      onMouseLeave={
        onClick
          ? (e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }
          : undefined
      }
      onTouchStart={
        onClick
          ? (e) => {
              const el = e.currentTarget
              el.style.transform = 'scale(0.97)'
            }
          : undefined
      }
      onTouchEnd={
        onClick
          ? (e) => {
              const el = e.currentTarget
              el.style.transform = 'scale(1)'
            }
          : undefined
      }
    >
      <div
        className="pointer-events-none absolute left-6 right-6 top-0 rounded-full"
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${styles.topGlow}, transparent)`,
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <p
          className="font-ui font-bold uppercase tracking-widest"
          style={{ fontSize: '0.65rem', color: 'rgba(245,237,224,0.55)', letterSpacing: '0.1em' }}
        >
          {label}
        </p>
        {icon ? (
          <span className="shrink-0 text-[rgba(245,237,224,0.62)] transition-transform duration-150 group-hover:scale-105">
            {icon}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="skeleton mt-2 h-8 w-3/4 rounded-lg" />
      ) : (
        <p
          className="mt-2 min-w-0 font-display font-bold leading-none"
          style={{
            fontSize: 'clamp(1rem, 2.3vw, 1.5rem)',
            letterSpacing: '-0.02em',
            color: '#f5ede0',
            fontVariationSettings: "'WONK' 1, 'opsz' 30",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </p>
      )}

      {!isLoading && (trend || subtext) && (
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          {trend && (
            <>
              <span style={{ color: trend.positive ? '#4ecca3' : '#f87171', fontSize: '0.75rem' }}>
                {trend.positive ? '+' : '-'}
              </span>
              <span
                className="truncate font-ui font-semibold"
                style={{
                  fontSize: '0.72rem',
                  color: trend.positive ? '#4ecca3' : '#f87171',
                }}
              >
                {trend.text}
              </span>
            </>
          )}
          {subtext && !trend && (
            <span className="truncate font-body" style={{ fontSize: '0.72rem', color: 'rgba(245,237,224,0.5)' }}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

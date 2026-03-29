// src/components/StatCard.tsx
// The four hero numbers on the dashboard.
// Uses Fraunces (with WONK optical axis) for the number â€” it makes â‚¦84,500
// look like a luxury item price tag rather than a spreadsheet cell.
//
// The "accent" prop changes the top glow colour â€” emerald for positive,
// gold for totals, red for warnings.

interface StatCardProps {
  label: string
  value: string
  subtext?: string
  trend?: { text: string; positive: boolean }
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
  accent = 'neutral',
  isLoading = false,
  onClick,
}: StatCardProps) => {
  const styles = ACCENT_STYLES[accent]

  return (
    <div
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2 min-w-0"
      style={{
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onTouchStart={onClick ? (e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(0.97)'
      } : undefined}
      onTouchEnd={onClick ? (e) => {
        const el = e.currentTarget
        el.style.transform = 'scale(1)'
      } : undefined}
    >
      {/* Top accent glow line */}
      <div
        className="absolute top-0 left-6 right-6 rounded-full pointer-events-none"
        style={{
          height: 1,
          background: `linear-gradient(90deg, transparent, ${styles.topGlow}, transparent)`,
        }}
      />

      {/* Label */}
      <p
        className="font-ui font-bold uppercase tracking-widest"
        style={{ fontSize: '0.65rem', color: 'rgba(245,237,224,0.4)', letterSpacing: '0.1em' }}
      >
        {label}
      </p>

      {/* Value â€” the star of the show */}
      {isLoading ? (
        <div className="skeleton h-8 w-3/4 rounded-lg" />
      ) : (
        <p
          className="font-display font-bold leading-none"
          style={{
            fontSize: '1.75rem',
            letterSpacing: '-0.02em',
            color: '#f5ede0',
            fontVariationSettings: "'WONK' 1, 'opsz' 30",
          }}
        >
          {value}
        </p>
      )}

      {/* Subtext / trend */}
      {!isLoading && (trend || subtext) && (
        <div className="flex items-center gap-1.5 mt-0.5">
          {trend && (
            <>
              <span style={{ color: trend.positive ? '#4ecca3' : '#f87171', fontSize: '0.75rem' }}>
                {trend.positive ? 'â†‘' : 'â†“'}
              </span>
              <span
                className="font-ui font-semibold"
                style={{
                  fontSize: '0.7rem',
                  color: trend.positive ? '#4ecca3' : '#f87171',
                }}
              >
                {trend.text}
              </span>
            </>
          )}
          {subtext && !trend && (
            <span
              className="font-body"
              style={{ fontSize: '0.72rem', color: 'rgba(245,237,224,0.35)' }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
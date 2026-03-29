// src/components/BottomNav.tsx
// The primary nav. Five destinations, each represented by a clean SVG icon.
// Active state: terracotta glow + gold indicator pip at top of nav.
// Touch targets are 48px minimum — critical for market conditions.
//
// Icon rationale: I drew these as minimal SVG paths rather than using emoji.
// Emoji vary wildly across Android vs iOS — these look identical everywhere.

import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: (active: boolean) => ReactElement
}

// SVG icon components — thin stroke, 24x24 viewBox
const HomeIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M3 9.5L12 3l9 6.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.12 : 0}
      strokeLinejoin="round"
    />
    <path
      d="M9 22V12h6v10"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinejoin="round"
    />
  </svg>
)

const SalesIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12" cy="12" r="9"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 7v1m0 8v1m-3-5h1.5a1.5 1.5 0 010 3H12m0-3h.5a1.5 1.5 0 000-3H10m2 6h2"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
)

const ExpenseIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect
      x="3" y="5" width="18" height="14" rx="2"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M3 10h18M7 15h2m4 0h2"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </svg>
)

const DebtorIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle
      cx="9" cy="7" r="4"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M2 21v-1a7 7 0 0114 0v1"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinecap="round"
    />
    <path
      d="M19 8v6m-3-3h6"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
    />
  </svg>
)

const StockIcon = (active: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M20 7L12 3 4 7v10l8 4 8-4V7z"
      stroke="currentColor"
      strokeWidth={active ? 2 : 1.5}
      strokeLinejoin="round"
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 3v18M4 7l8 4 8-4"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  { to: '/',         label: 'Home',     icon: HomeIcon    },
  { to: '/sales',    label: 'Sales',    icon: SalesIcon   },
  { to: '/expenses', label: 'Expenses', icon: ExpenseIcon },
  { to: '/debtors',  label: 'Debtors',  icon: DebtorIcon  },
  { to: '/stock',    label: 'Stock',    icon: StockIcon   },
]

export const BottomNav = () => {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        // Glass morphism on deep earth background
        background: 'rgba(20, 11, 7, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex-1"
          >
            {({ isActive }) => (
              <div
                className="relative flex flex-col items-center justify-center gap-1 py-3 min-h-[60px] transition-all duration-150"
                style={{
                  color: isActive ? '#e8a838' : 'rgba(245,237,224,0.35)',
                }}
              >
                {/* Active pip — gold line at very top */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: 24,
                      height: 2.5,
                      background: 'linear-gradient(90deg, #c4622d, #e8a838)',
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  className="transition-transform duration-150"
                  style={{ transform: isActive ? 'scale(1.08)' : 'scale(1)' }}
                >
                  {item.icon(isActive)}
                </div>

                {/* Label */}
                <span
                  className="font-ui font-bold text-center"
                  style={{
                    fontSize: '0.58rem',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

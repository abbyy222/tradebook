import type { ReactNode } from 'react'

export type NavIconProps = {
  active: boolean
  className?: string
}

export type AppNavItem = {
  to: string
  label: string
  Icon: (props: NavIconProps) => ReactNode
}

const iconStroke = (active: boolean) => (active ? 2 : 1.7)

const HomeIcon = ({ active, className }: NavIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      strokeLinejoin="round"
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.12 : 0}
    />
    <path
      d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      strokeLinejoin="round"
    />
  </svg>
)

const SalesIcon = ({ active, className }: NavIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 17h14" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" />
    <path d="M7 13.5h2.5m2 0H14m2 0h1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path
      d="M6 17V9.2a2 2 0 0 1 .9-1.66l4-2.5a2 2 0 0 1 2.2 0l4 2.5A2 2 0 0 1 18 9.2V17"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      strokeLinejoin="round"
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.08 : 0}
    />
  </svg>
)

const ExpenseIcon = ({ active, className }: NavIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="3"
      y="5"
      width="18"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
    <path d="M7 14.5h3M14 14.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const DebtorIcon = ({ active, className }: NavIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle
      cx="9"
      cy="8"
      r="3.5"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M3 20a6 6 0 0 1 12 0" stroke="currentColor" strokeWidth={iconStroke(active)} strokeLinecap="round" />
    <path d="M17 8v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const StockIcon = ({ active, className }: NavIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3 4 7v10l8 4 8-4V7l-8-4Z"
      stroke="currentColor"
      strokeWidth={iconStroke(active)}
      strokeLinejoin="round"
      fill={active ? 'currentColor' : 'none'}
      fillOpacity={active ? 0.1 : 0}
    />
    <path d="M12 3v18M4 7l8 4 8-4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/sales', label: 'Sales', Icon: SalesIcon },
  { to: '/expenses', label: 'Expenses', Icon: ExpenseIcon },
  { to: '/debtors', label: 'Debtors', Icon: DebtorIcon },
  { to: '/stock', label: 'Stock', Icon: StockIcon },
]

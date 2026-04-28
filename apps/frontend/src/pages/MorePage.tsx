import { Link, useNavigate } from 'react-router-dom'
import type { SVGProps } from 'react'
import { ONBOARDING_STORAGE_KEY } from '@/components/OnboardingQuest'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { resetTraderSession } from '@/utils/resetTraderSession'

type IconProps = SVGProps<SVGSVGElement>

const iconClassName = 'h-5 w-5'

const CoinsIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M7 7c0 1.7 3.1 3 7 3s7-1.3 7-3-3.1-3-7-3-7 1.3-7 3Z" />
    <path d="M7 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
    <path d="M3 12c0 1.4 2.4 2.5 5.5 2.5S14 13.4 14 12" />
    <path d="M3 12v4c0 1.4 2.4 2.5 5.5 2.5S14 17.4 14 16v-4" />
  </svg>
)

const UsersIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="3" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 4.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const ChartIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 19h16" />
    <path d="M7 16V9" />
    <path d="M12 16V5" />
    <path d="M17 16v-4" />
  </svg>
)

const TruckIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 17H6V7h10v10h-2" />
    <path d="M16 10h3l2 3v4h-2" />
    <circle cx="8" cy="17" r="2" />
    <circle cx="18" cy="17" r="2" />
  </svg>
)

const SparklesIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m12 3 1.9 4.8L19 9.7l-4.2 2.6L16.5 17 12 14.3 7.5 17l1.7-4.7L5 9.7l5.1-1.9L12 3Z" />
  </svg>
)

const ShieldPlusIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3 5 6v6c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6l-7-3Z" />
    <path d="M12 9v6" />
    <path d="M9 12h6" />
  </svg>
)

const LogOutIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
)

const tools = [
  { title: 'Savings', desc: 'Track daily savings and totals', to: '/savings', icon: CoinsIcon },
  { title: 'Customers', desc: 'Customer list and contact directory', to: '/customers', icon: UsersIcon },
  { title: 'Suppliers', desc: 'Supplier/vendor directory', to: '/suppliers', icon: TruckIcon },
]

export const MorePage = () => {
  const trader = useAuthStore((state) => state.trader)
  const navigate = useNavigate()
  const isOwner = trader?.role !== 'SALESPERSON'

  const launchGuide = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.location.href = '/dashboard'
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // keep logout resilient
    } finally {
      await resetTraderSession()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen px-4 pb-8 pt-10 sm:px-5 sm:pt-12 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="label-base mb-1">Tools</p>
        <h1 className="font-display text-3xl font-bold text-primary wonky">More</h1>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={launchGuide}
            className="flex items-start gap-3 rounded-2xl border border-[#e8a838]/35 bg-[#2b1912] px-4 py-4 text-left transition-opacity duration-150 hover:opacity-85"
          >
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0bc5a]/12 text-[#f0bc5a]">
              <SparklesIcon className={iconClassName} />
            </span>
            <span className="min-w-0">
              <p className="font-ui text-base font-bold text-[#f0bc5a]">Launch Quest Guide</p>
              <p className="mt-1 text-sm text-secondary">Reopen the guided walkthrough.</p>
            </span>
          </button>

          {isOwner ? (
            <Link
              to="/team"
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-primary">
                <ShieldPlusIcon className={iconClassName} />
              </span>
              <span className="min-w-0">
                <p className="font-ui text-base font-bold text-primary">Team</p>
                <p className="mt-1 text-sm text-secondary">Manage owners and salespeople access.</p>
              </span>
            </Link>
          ) : null}

          {isOwner ? (
            <Link
              to="/insights"
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-primary">
                <ChartIcon className={iconClassName} />
              </span>
              <span className="min-w-0">
                <p className="font-ui text-base font-bold text-primary">Insights</p>
                <p className="mt-1 text-sm text-secondary">See profit, sales quality, and top-performing products.</p>
              </span>
            </Link>
          ) : null}

          {tools.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <p className="font-ui text-base font-bold text-primary">{item.title}</p>
                <p className="mt-1 text-sm text-secondary">{item.desc}</p>
              </span>
            </Link>
          ))}

          <button
            onClick={() => void handleLogout()}
            className="flex items-start gap-3 rounded-2xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] px-4 py-4 text-left transition-opacity duration-150 hover:opacity-85"
          >
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(248,113,113,0.12)] text-[#f87171]">
              <LogOutIcon className={iconClassName} />
            </span>
            <span className="min-w-0">
              <p className="font-ui text-base font-bold text-[#f87171]">Logout</p>
              <p className="mt-1 text-sm text-secondary">Sign out from this device.</p>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

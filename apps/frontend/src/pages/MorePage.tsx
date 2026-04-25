import { Link, useNavigate } from 'react-router-dom'
import { ONBOARDING_STORAGE_KEY } from '@/components/OnboardingQuest'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/authStore'
import { resetTraderSession } from '@/utils/resetTraderSession'

const tools = [
  { title: 'Savings', desc: 'Track daily savings and totals', to: '/savings' },
  { title: 'Customers', desc: 'Customer list and contact directory', to: '/customers' },
  { title: 'Suppliers', desc: 'Supplier/vendor directory', to: '/suppliers' },
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
    <div className="min-h-screen px-5 pb-8 pt-12 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="label-base mb-1">Tools</p>
        <h1 className="font-display text-3xl font-bold text-primary wonky">More</h1>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={launchGuide}
            className="rounded-2xl border border-[#e8a838]/35 bg-[#2b1912] px-4 py-4 text-left transition-opacity duration-150 hover:opacity-85"
          >
            <p className="font-ui text-base font-bold text-[#f0bc5a]">Launch Quest Guide</p>
            <p className="mt-1 text-sm text-secondary">Reopen the guided walkthrough.</p>
          </button>

          {isOwner ? (
            <Link
              to="/team"
              className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <p className="font-ui text-base font-bold text-primary">Team</p>
              <p className="mt-1 text-sm text-secondary">Manage owners and salespeople access.</p>
            </Link>
          ) : null}

          {tools.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4 transition-opacity duration-150 hover:opacity-85"
            >
              <p className="font-ui text-base font-bold text-primary">{item.title}</p>
              <p className="mt-1 text-sm text-secondary">{item.desc}</p>
            </Link>
          ))}

          <button
            onClick={() => void handleLogout()}
            className="rounded-2xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] px-4 py-4 text-left transition-opacity duration-150 hover:opacity-85"
          >
            <p className="font-ui text-base font-bold text-[#f87171]">Logout</p>
            <p className="mt-1 text-sm text-secondary">Sign out from this device.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

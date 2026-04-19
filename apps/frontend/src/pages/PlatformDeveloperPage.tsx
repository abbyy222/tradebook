import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'

const tabs = [
  { label: 'Overview', to: '/platform/dev/overview' },
  { label: 'Reliability', to: '/platform/dev/reliability' },
  { label: 'Operations', to: '/platform/dev/operations' },
  { label: 'Access', to: '/platform/dev/access' },
]

export const PlatformDeveloperPage = () => {
  const location = useLocation()

  if (location.pathname === '/platform/dev') {
    return <Navigate to="/platform/dev/overview" replace />
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="rounded-2xl border border-white/10 bg-[#231510] px-4 py-4">
        <p className="label-base mb-1">Engineering Side</p>
        <h1 className="font-display text-2xl font-bold text-primary wonky sm:text-3xl">Developer Console</h1>
        <p className="mt-1 text-xs text-secondary sm:text-sm">System reliability tooling, platform controls, and operations safety.</p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1.5 font-ui text-xs font-bold uppercase tracking-[0.08em] ${
                  isActive
                    ? 'border border-[rgba(232,168,56,0.35)] bg-[rgba(232,168,56,0.15)] text-[#f0bc5a]'
                    : 'border border-white/10 bg-[rgba(255,255,255,0.04)] text-secondary'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  )
}

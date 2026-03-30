import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'
import { useAuthStore } from '@/stores/authStore'
import { BottomNav } from '@/components/BottomNav'
import { APP_NAV_ITEMS } from '@/components/AppNavigation'

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const trader = useAuthStore((state) => state.trader)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const displayName = trader?.businessName ?? trader?.name ?? 'Tradebook'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  return (
    <div className="min-h-screen bg-[#1a0f0a]">
      <SyncStatusBanner />
      <div className="mx-auto flex w-full max-w-[1400px] md:gap-6 md:px-5 md:py-5">
        <aside className="hidden h-[calc(100vh-5rem)] w-[260px] flex-col rounded-3xl border border-white/10 bg-[#231510] p-5 md:flex">
          <div className="rounded-2xl border border-white/10 bg-[#2d1b14] px-4 py-4">
            <p className="label-base mb-1">Workspace</p>
            <p className="font-display text-xl font-bold text-primary wonky">{displayName}</p>
            <p className="mt-1 font-body text-xs text-secondary">Your daily business cockpit</p>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1.5" aria-label="Desktop navigation">
            {APP_NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}>
                {({ isActive }) => (
                  <div
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all duration-150"
                    style={{
                      background: isActive ? 'rgba(232,168,56,0.14)' : 'transparent',
                      border: `1px solid ${isActive ? 'rgba(232,168,56,0.28)' : 'rgba(255,255,255,0.06)'}`,
                      color: isActive ? '#f0bc5a' : 'rgba(245,237,224,0.62)',
                    }}
                  >
                    <item.Icon active={isActive} className="h-5 w-5" />
                    <span className="font-ui text-sm font-bold">{item.label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#2b1912] px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c4622d] to-[#e8a838] font-ui text-sm font-extrabold text-white">
              {initials || 'TB'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-ui text-sm font-bold text-primary">{displayName}</p>
              <p className="truncate font-body text-xs text-secondary">Signed in</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:rounded-3xl md:border md:border-white/10 md:bg-[#20130e] md:pb-4">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

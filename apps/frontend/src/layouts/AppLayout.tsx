import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'
import { useAuthStore } from '@/stores/authStore'
import { BottomNav } from '@/components/BottomNav'
import { APP_NAV_ITEMS } from '@/components/AppNavigation'
import { OnboardingQuest, ONBOARDING_STORAGE_KEY } from '@/components/OnboardingQuest'
import { authApi } from '@/api/auth.api'

const TeamIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="16" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M3.5 19a4.6 4.6 0 0 1 9 0M11.5 19a4.6 4.6 0 0 1 9 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
)

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M14 16l4-4-4-4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const trader = useAuthStore((state) => state.trader)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [questOpen, setQuestOpen] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const displayName = trader?.businessName ?? trader?.name ?? 'Tradebook'
  const isOwner = trader?.role !== 'SALESPERSON'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2)

  useEffect(() => {
    if (!isAuthenticated) return

    const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
    if (!hasCompleted) {
      setQuestOpen(true)
    }
  }, [isAuthenticated])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // keep logout resilient even if network fails
    } finally {
      logout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-[#1a0f0a]">
      <SyncStatusBanner />
      <div className="mx-auto flex w-full max-w-[1320px] md:gap-6 md:px-5 md:py-5">
        <aside className="hidden h-[calc(100vh-5rem)] w-[260px] flex-col overflow-y-auto rounded-3xl border border-white/10 bg-[#231510] p-5 md:flex">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#2d1b14] px-4 py-4">
            <p className="label-base mb-1">Workspace</p>
            <p
              className="truncate font-display font-bold leading-tight text-primary wonky"
              style={{ fontSize: 'clamp(0.95rem, 1.2vw, 1.2rem)' }}
              title={displayName}
            >
              {displayName}
            </p>
            <p className="mt-1 font-body text-xs text-secondary">Your daily business cockpit</p>
          </div>

          <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1.5" aria-label="Desktop navigation">
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

          <div className="mt-4 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-[#2b1912] px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#c4622d] to-[#e8a838] font-ui text-sm font-extrabold text-white">
              {initials || 'TB'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-ui text-sm font-bold text-primary" title={displayName}>
                {displayName}
              </p>
              <p className="truncate font-body text-xs text-secondary">Signed in</p>
            </div>
          </div>

          <button
            onClick={() => setQuestOpen(true)}
            className="mt-3 shrink-0 rounded-xl border border-[#e8a838]/35 bg-[#3a2319] px-3.5 py-2.5 text-left font-ui text-xs font-bold uppercase tracking-[0.08em] text-[#f0bc5a]"
          >
            Launch Quest Guide
          </button>
          {isOwner ? (
            <NavLink
              to="/team"
              className="mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-[#2b1912] px-3.5 py-2.5 text-left font-ui text-xs font-bold uppercase tracking-[0.08em] text-secondary hover:text-primary"
            >
              <TeamIcon />
              Manage Team
            </NavLink>
          ) : null}
          <button
            onClick={handleLogout}
            className="mt-2 flex shrink-0 items-center gap-2 rounded-xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] px-3.5 py-2.5 text-left font-ui text-xs font-bold uppercase tracking-[0.08em] text-[#f87171]"
          >
            <LogoutIcon />
            Logout
          </button>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:rounded-3xl md:border md:border-white/10 md:bg-[#20130e] md:pb-4">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <OnboardingQuest
        open={questOpen}
        onClose={() => setQuestOpen(false)}
        onComplete={() => localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')}
      />
    </div>
  )
}

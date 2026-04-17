import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

export const InternalPortalLayout = ({ portal }: { portal: 'ADMIN' | 'DEVELOPER' }) => {
  const isAuthenticated = useInternalAuthStore((s) => s.isAuthenticated)
  const currentPortal = useInternalAuthStore((s) => s.portal)
  const user = useInternalAuthStore((s) => s.user)
  const logout = useInternalAuthStore((s) => s.logout)
  const navigate = useNavigate()

  if (!isAuthenticated) return <Navigate to="/internal/login" replace />
  if (currentPortal !== portal) {
    return <Navigate to={currentPortal === 'ADMIN' ? '/platform/admin' : '/platform/dev'} replace />
  }

  return (
    <div className="min-h-screen bg-[#1a0f0a]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#180d09]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="min-w-0">
            <p className="label-base mb-0.5">Internal Console</p>
            <p className="truncate font-ui text-xs font-bold text-primary sm:text-sm">
              {portal === 'ADMIN' ? 'Company Admin Portal' : 'Developer Console'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden rounded-xl border border-white/10 bg-[#2a1912] px-3 py-2 sm:block">
              <p className="font-ui text-xs font-bold text-primary">{user?.fullName}</p>
              <p className="text-[11px] text-secondary">{user?.phoneNumber}</p>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/internal/login', { replace: true })
              }}
              className="rounded-xl border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.08)] px-2.5 py-2 font-ui text-[11px] font-bold uppercase tracking-[0.08em] text-[#f87171] sm:px-3 sm:text-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-4 pb-10 sm:px-4 sm:py-5">
        <Outlet />
      </main>
    </div>
  )
}

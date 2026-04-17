import { Navigate, Outlet } from 'react-router-dom'
import { useInternalAuthStore } from '@/stores/internalAuthStore'

export const InternalAuthLayout = () => {
  const isAuthenticated = useInternalAuthStore((s) => s.isAuthenticated)
  const portal = useInternalAuthStore((s) => s.portal)

  if (isAuthenticated && portal === 'ADMIN') return <Navigate to="/platform/admin" replace />
  if (isAuthenticated && portal === 'DEVELOPER') return <Navigate to="/platform/dev" replace />

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-10 surface-0">
      <div className="absolute inset-0 pattern-dots pointer-events-none" />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 560,
          height: 560,
          top: '-180px',
          left: '-120px',
          background: 'radial-gradient(circle, rgba(39,132,245,0.18) 0%, rgba(39,132,245,0.04) 60%, transparent 75%)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 520,
          height: 520,
          bottom: '-180px',
          right: '-120px',
          background: 'radial-gradient(circle, rgba(232,168,56,0.18) 0%, rgba(232,168,56,0.05) 60%, transparent 75%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[430px] items-center">
        <Outlet />
      </div>
    </div>
  )
}


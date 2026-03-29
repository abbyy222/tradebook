import { Navigate, Outlet } from 'react-router-dom'
import { SyncStatusBanner } from '@/components/SyncStatusBanner'
import { useAuthStore } from '@/stores/authStore'

export const AppLayout = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <SyncStatusBanner />
      <Outlet />
    </>
  )
}

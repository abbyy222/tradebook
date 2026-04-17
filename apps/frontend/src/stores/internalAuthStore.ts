import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InternalPortal, InternalUserDTO } from '@tradebook/shared-types'

interface InternalAuthState {
  token: string | null
  user: InternalUserDTO | null
  portal: InternalPortal | null
  isAuthenticated: boolean
  login: (token: string, user: InternalUserDTO, portal: InternalPortal) => void
  logout: () => void
}

export const useInternalAuthStore = create<InternalAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      portal: null,
      isAuthenticated: false,

      login: (token, user, portal) => set({ token, user, portal, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, portal: null, isAuthenticated: false }),
    }),
    {
      name: 'tradebook-internal-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        portal: state.portal,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)


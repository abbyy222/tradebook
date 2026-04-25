// src/stores/authStore.ts
// Zustand is minimal — no actions, no reducers, no boilerplate.
// Just a store with state and functions to update it.
// We persist the token to localStorage so the trader
// stays logged in across page refreshes and app restarts.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TraderDTO } from '@tradebook/shared-types'

interface AuthState {
  token: string | null
  trader: TraderDTO | null
  isAuthenticated: boolean
  login: (token: string, trader: TraderDTO) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  // persist middleware serialises state to localStorage automatically.
  // When the app loads, it rehydrates from localStorage.
  // The trader never has to log in again unless the token expires.
  persist(
    (set) => ({
      token: null,
      trader: null,
      isAuthenticated: false,

      login: (token, trader) =>
        set({ token, trader, isAuthenticated: true }),

      logout: () => set({ token: null, trader: null, isAuthenticated: false }),
    }),
    {
      name: 'tradebook-auth', // localStorage key
      // Only persist these fields — don't persist functions
      partialize: (state) => ({
        token: state.token,
        trader: state.trader,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

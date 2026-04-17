// src/main.tsx
// The entry point. Sets up all providers in the correct order.
// Provider order matters — inner providers can access outer ones.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { initSyncEngine } from '@/services/syncEngine'
import { initNetworkHealth } from '@/services/networkHealth'
import './index.css'

// Configure TanStack Query globally.
// These defaults apply to every query in the app.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on 401/403 — those are auth errors, not transient failures
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false
        if (error?.response?.status === 403) return false
        if (error?.response?.status === 429) return false
        return failureCount < 2 // retry other errors up to 2 times
      },
      staleTime: 30_000,
      // Don't refetch just because user switched browser tabs.
      // Traders on low-end phones pay for data — unnecessary
      // requests cost them real money.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0, // never auto-retry mutations — side effects may not be idempotent
    },
  },
})

// Start the sync engine — registers online/offline listeners
initNetworkHealth()
initSyncEngine()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {/* DevTools only visible in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
)

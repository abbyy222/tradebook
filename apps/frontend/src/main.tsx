// src/main.tsx
// The entry point. Sets up all providers in the correct order.
// Provider order matters — inner providers can access outer ones.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { queryClient } from '@/lib/queryClient'
import { initSyncEngine } from '@/services/syncEngine'
import { initNetworkHealth } from '@/services/networkHealth'
import './index.css'

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

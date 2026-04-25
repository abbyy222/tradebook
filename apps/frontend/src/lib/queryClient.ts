import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
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

// src/hooks/useSales.ts
// Custom hooks are the public API of our data layer.
// Components import these hooks â€” they never import api or db directly.
// This means we can completely change the data layer without
// touching a single component â€” just update the hooks.

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalSale } from '@/db'
import { salesApi } from '@/api/sales.api'
import type { CreateSaleDTO, CursorPaginatedResponse, SaleDTO } from '@tradebook/shared-types'

// Query keys â€” centralised as constants.
// A query key is how TanStack Query identifies a piece of cached data.
// Using string literals everywhere leads to typos and cache misses.
// Using constants means you can refactor without fear.
export const salesKeys = {
  all: ['sales'] as const,
  dashboard: () => [...salesKeys.all, 'dashboard'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: object) => [...salesKeys.lists(), filters] as const,
  detail: (id: string) => [...salesKeys.all, 'detail', id] as const,
}

const SALES_PAGE_SIZE = 20

const matchesSaleFilters = (
  sale: Pick<SaleDTO, 'soldAt' | 'paymentType'>,
  filters: {
    from?: string
    to?: string
    paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
  }
) => {
  const soldAt = new Date(sale.soldAt).getTime()

  if (filters.from && soldAt < new Date(filters.from).getTime()) return false
  if (filters.to && soldAt > new Date(filters.to).getTime()) return false
  if (filters.paymentType && sale.paymentType !== filters.paymentType) return false

  return true
}

const listSalesFromDexie = async (
  filters: {
    from?: string
    to?: string
    paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
  },
  cursor?: string
): Promise<CursorPaginatedResponse<SaleDTO>> => {
  const sales = await db.sales.orderBy('soldAt').reverse().toArray()

  const filtered = sales.filter((sale) => {
    if (!matchesSaleFilters(sale, filters)) return false
    if (cursor && new Date(sale.soldAt).getTime() >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, SALES_PAGE_SIZE)
  const hasNextPage = filtered.length > SALES_PAGE_SIZE
  const nextCursor = hasNextPage ? page[page.length - 1]?.soldAt ?? null : null

  return {
    data: page,
    meta: {
      nextCursor,
      hasNextPage,
      pageSize: SALES_PAGE_SIZE,
    },
    error: null,
  }
}

const mergeServerAndLocalSales = async (
  serverSales: SaleDTO[],
  filters: {
    from?: string
    to?: string
    paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
  }
): Promise<CursorPaginatedResponse<SaleDTO>> => {
  const localUnsynced = await db.sales
    .filter((sale) => sale.syncStatus !== 'SYNCED')
    .toArray()

  const merged = new Map<string, SaleDTO>()

  for (const sale of serverSales) {
    if (matchesSaleFilters(sale, filters)) {
      merged.set(sale.id, { ...sale, syncStatus: 'SYNCED' })
    }
  }

  for (const sale of localUnsynced) {
    if (matchesSaleFilters(sale, filters)) {
      merged.set(sale.id, { ...sale, syncStatus: 'SYNCED' })
    }
  }

  const ordered = Array.from(merged.values()).sort(
    (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()
  )

  const page = ordered.slice(0, SALES_PAGE_SIZE)
  const hasNextPage = ordered.length > SALES_PAGE_SIZE

  return {
    data: page,
    meta: {
      nextCursor: hasNextPage ? page[page.length - 1]?.soldAt ?? null : null,
      hasNextPage,
      pageSize: SALES_PAGE_SIZE,
    },
    error: null,
  }
}

const syncPendingSales = async () => {
  const retryable = await db.sales
    .filter((sale) => sale.syncStatus === 'PENDING' || sale.syncStatus === 'FAILED')
    .toArray()

  if (retryable.length === 0) return

  const payload: CreateSaleDTO[] = retryable.map((sale) => ({
    id: sale.id,
    itemName: sale.itemName,
    amount: sale.amount,
    paymentType: sale.paymentType,
    debtorId: sale.debtorId,
    soldAt: sale.soldAt,
  }))

  await salesApi.syncBatch(payload)

  await db.transaction('rw', db.sales, async () => {
    for (const sale of retryable) {
      await db.sales.update(sale.id, { syncStatus: 'SYNCED' })
    }
  })
}

const storeServerSales = async (sales: SaleDTO[]) => {
  if (sales.length === 0) return

  const rows: LocalSale[] = sales.map((sale) => ({
    ...sale,
    syncStatus: 'SYNCED',
  }))

  await db.sales.bulkPut(rows)
}

// --- Dashboard stats hook ---
export const useDashboardStats = () => {
  return useQuery({
    queryKey: salesKeys.dashboard(),
    queryFn: salesApi.getDashboard,
    // staleTime: how long cached data is considered fresh.
    // 60 seconds means if a component unmounts and remounts within
    // 60 seconds, we use the cached value without a network request.
    staleTime: 60_000,
    // refetchInterval: automatically refetch in the background
    // every 5 minutes so the dashboard stays current.
    refetchInterval: 5 * 60_000,
  })
}

// --- Infinite scroll sales list ---
// useInfiniteQuery handles cursor pagination automatically.
// As the trader scrolls down, it fetches the next page
// and appends it to the list seamlessly.
export const useSalesList = (filters: {
  from?: string
  to?: string
  paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
}) => {
  return useInfiniteQuery({
    queryKey: salesKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      // Hybrid strategy:
      // 1. If online, push pending local sales to the backend first
      // 2. Fetch the freshest page from the server
      // 3. Write server truth back into Dexie so offline reads stay current
      // 4. If any online step fails, fall back to Dexie instead of breaking the UI
      if (navigator.onLine) {
        try {
          await syncPendingSales()
          const serverPage = await salesApi.list({
            ...filters,
            cursor,
            pageSize: SALES_PAGE_SIZE,
          })
          await storeServerSales(serverPage.data)
          return mergeServerAndLocalSales(serverPage.data, filters)
        } catch {
          return listSalesFromDexie(filters, cursor)
        }
      }

      return listSalesFromDexie(filters, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}

// --- Create sale mutation ---
// This is the most important mutation in the app.
// It implements the optimistic update pattern:
// 1. Write to Dexie immediately (UI updates instantly)
// 2. Try to sync to backend
// 3. If backend succeeds â€” all good
// 4. If offline â€” stays PENDING in Dexie, syncs later
//
// The trader never waits for network. Record a sale in 1 second,
// whether online or on an underground market with no signal.
export const useCreateSale = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateSaleDTO, 'id'>) => {
      // Generate UUID on the CLIENT â€” this is the offline-first key.
      // The ID exists before the server ever sees this record.
      const id = uuidv4()
      const sale = { ...input, id }

      // Step 1: Write to local Dexie immediately
      await db.sales.add({
        ...sale,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      })

      // Step 2: Try to sync to backend if online
      if (navigator.onLine) {
        void salesApi
          .sync(sale)
          .then(() => db.sales.update(id, { syncStatus: 'SYNCED' }))
          .catch(() => {
            // Leave the local sale as PENDING so the next sync cycle can retry it.
          })
      }

      return sale
    },

    onSuccess: () => {
      // Invalidate the dashboard and list caches so they refetch
      // fresh data reflecting the new sale
      queryClient.invalidateQueries({ queryKey: salesKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
  })
}

export const useRetrySalesSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await syncPendingSales()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
    },
  })
}

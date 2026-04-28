import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalStockItem } from '@/db'
import { stockApi } from '@/api/stock.api'
import { dashboardKeys } from '@/hooks/useDashboard'
import { isNetworkReachable } from '@/services/networkHealth'
import { getInitialSyncStatus } from '@/services/syncStatus'
import { syncEngine } from '@/services/syncEngine'
import type {
  CreateStockItemDTO,
  CursorPaginatedResponse,
  StockItemDTO,
  StockMovementDTO,
} from '@tradebook/shared-types'

export const stockKeys = {
  all: ['stock'] as const,
  lists: () => [...stockKeys.all, 'list'] as const,
  list: (filters: object) => [...stockKeys.lists(), filters] as const,
  alerts: () => [...stockKeys.all, 'alerts'] as const,
  movements: (id: string) => [...stockKeys.all, 'movements', id] as const,
}

const STOCK_PAGE_SIZE = 20
const STOCK_SERVER_TIMEOUT_MS = 2_500
export type StockAdjustmentReason = 'restock' | 'sale_adjustment' | 'damage' | 'correction'
let isSyncingStockItems = false
let isSyncingStockAdjustments = false

type StockListFilters = { lowStockOnly?: boolean; search?: string }

type StockListQueryData = {
  pages: CursorPaginatedResponse<StockItemDTO>[]
  pageParams: Array<string | undefined>
}

const computeStockMetrics = (item: Pick<StockItemDTO, 'quantity' | 'unitPrice' | 'costPrice'>) => {
  const stockValue = item.quantity * item.costPrice
  const retailValue = item.quantity * item.unitPrice
  return {
    stockValue,
    retailValue,
    expectedGrossProfit: retailValue - stockValue,
  }
}

const normalizeStockItem = (item: StockItemDTO): StockItemDTO => ({
  ...item,
  ...computeStockMetrics(item),
})

const upsertStockItemInQueryData = (
  current: StockListQueryData | undefined,
  item: StockItemDTO,
  filters: StockListFilters,
) => {
  if (!current || !matchesStockFilters(item, filters) || current.pages.length === 0) {
    return current
  }

  const [firstPage, ...restPages] = current.pages
  const nextFirstPage = {
    ...firstPage,
    data: [item, ...firstPage.data.filter((existing) => existing.id !== item.id)]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, STOCK_PAGE_SIZE),
  }

  return {
    ...current,
    pages: [nextFirstPage, ...restPages],
  }
}

const updateCachedStockLists = (
  queryClient: ReturnType<typeof useQueryClient>,
  item: StockItemDTO,
) => {
  const matchingQueries = queryClient.getQueriesData<StockListQueryData>({
    queryKey: stockKeys.lists(),
  })

  for (const [queryKey, current] of matchingQueries) {
    const filters = (Array.isArray(queryKey) ? queryKey[queryKey.length - 1] : {}) as StockListFilters
    const next = upsertStockItemInQueryData(current, item, filters)

    if (next && next !== current) {
      queryClient.setQueryData(queryKey, next)
    }
  }
}

const matchesStockFilters = (
  item: Pick<StockItemDTO, 'itemName' | 'quantity' | 'lowStockThreshold'>,
  filters: { lowStockOnly?: boolean; search?: string },
) => {
  if (filters.lowStockOnly && item.quantity > item.lowStockThreshold) return false

  if (filters.search) {
    const needle = filters.search.trim().toLowerCase()
    if (needle.length > 0 && !item.itemName.toLowerCase().includes(needle)) return false
  }

  return true
}

const listStockFromDexie = async (
  filters: { lowStockOnly?: boolean; search?: string },
  cursor?: string,
): Promise<CursorPaginatedResponse<StockItemDTO>> => {
  const items = await db.stockItems.orderBy('updatedAt').reverse().toArray()

  const filtered = items.filter((item) => {
    if (!matchesStockFilters(item, filters)) return false
    if (cursor && new Date(item.updatedAt).getTime() >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, STOCK_PAGE_SIZE).map(normalizeStockItem)
  const hasNextPage = filtered.length > STOCK_PAGE_SIZE
  const nextCursor = hasNextPage ? page[page.length - 1]?.updatedAt ?? null : null

  return {
    data: page,
    meta: {
      nextCursor,
      hasNextPage,
      pageSize: STOCK_PAGE_SIZE,
    },
    error: null,
  }
}

const storeServerStockItems = async (items: StockItemDTO[]) => {
  if (items.length === 0) return

  const [locallyUnsyncedStockIds, locallyAdjustedStockIds] = await Promise.all([
    db.stockItems
      .filter((item) => item.syncStatus !== 'SYNCED')
      .primaryKeys(),
    db.stockAdjustments
      .filter((adjustment) => adjustment.syncStatus !== 'SYNCED')
      .toArray(),
  ])
  const existingItems = await db.stockItems.toArray()
  const existingById = new Map(existingItems.map((item) => [item.id, item]))

  const protectedIds = new Set<string>([
    ...(locallyUnsyncedStockIds as string[]),
    ...locallyAdjustedStockIds.map((adjustment) => adjustment.stockItemId),
  ])

  const rows: LocalStockItem[] = items
    .filter((serverItem) => {
      if (protectedIds.has(serverItem.id)) return false
      const local = existingById.get(serverItem.id)
      if (!local) return true
      return new Date(local.updatedAt).getTime() <= new Date(serverItem.updatedAt).getTime()
    })
    .map((item) => ({
      ...normalizeStockItem(item),
      syncStatus: 'SYNCED',
    }))

  if (rows.length === 0) return
  await db.stockItems.bulkPut(rows)
}

const mergeServerAndLocalStockItems = async (
  serverItems: StockItemDTO[],
  filters: { lowStockOnly?: boolean; search?: string },
): Promise<CursorPaginatedResponse<StockItemDTO>> => {
  const localUnsynced = await db.stockItems
    .filter((item) => item.syncStatus !== 'SYNCED')
    .toArray()

  const merged = new Map<string, StockItemDTO>()

  for (const item of serverItems) {
    if (matchesStockFilters(item, filters)) {
      merged.set(item.id, { ...normalizeStockItem(item), syncStatus: 'SYNCED' })
    }
  }

  for (const item of localUnsynced) {
    if (matchesStockFilters(item, filters)) {
      merged.set(item.id, normalizeStockItem(item))
    }
  }

  const ordered = Array.from(merged.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  const page = ordered.slice(0, STOCK_PAGE_SIZE)
  const hasNextPage = ordered.length > STOCK_PAGE_SIZE

  return {
    data: page,
    meta: {
      nextCursor: hasNextPage ? page[page.length - 1]?.updatedAt ?? null : null,
      hasNextPage,
      pageSize: STOCK_PAGE_SIZE,
    },
    error: null,
  }
}

const syncPendingStockItems = async () => {
  if (isSyncingStockItems) return
  isSyncingStockItems = true

  const retryable = await db.stockItems
    .filter((item) => item.syncStatus !== 'SYNCED')
    .toArray()

  if (retryable.length === 0) {
    isSyncingStockItems = false
    return
  }

  try {
    for (const item of retryable) {
      try {
        const synced = await stockApi.sync({
          id: item.id,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          wholesalePrice: item.wholesalePrice,
          wholesaleMinQty: item.wholesaleMinQty,
          lowStockThreshold: item.lowStockThreshold,
        })

        await db.stockItems.put({
          ...normalizeStockItem(synced),
          syncStatus: 'SYNCED',
        })
      } catch {
        await db.stockItems.update(item.id, { syncStatus: 'FAILED' })
      }
    }
  } finally {
    isSyncingStockItems = false
  }
}

const syncPendingStockAdjustments = async () => {
  if (isSyncingStockAdjustments) return
  isSyncingStockAdjustments = true

  const retryable = await db.stockAdjustments
    .filter((adjustment) => adjustment.syncStatus !== 'SYNCED')
    .sortBy('createdAt')

  if (retryable.length === 0) {
    isSyncingStockAdjustments = false
    return
  }

  try {
    for (const adjustment of retryable) {
      try {
        const synced = await stockApi.adjust(adjustment.stockItemId, {
          delta: adjustment.delta,
          reason: adjustment.reason,
          unitPrice: adjustment.unitPrice,
          costPrice: adjustment.costPrice,
          wholesalePrice: adjustment.wholesalePrice,
          wholesaleMinQty: adjustment.wholesaleMinQty,
          lowStockThreshold: adjustment.lowStockThreshold,
        })

        await db.transaction('rw', db.stockItems, db.stockAdjustments, async () => {
          await db.stockItems.put({
            ...normalizeStockItem(synced),
            syncStatus: 'SYNCED',
          })
          await db.stockAdjustments.update(adjustment.id, { syncStatus: 'SYNCED' })
        })
      } catch {
        await db.stockAdjustments.update(adjustment.id, { syncStatus: 'FAILED' })
      }
    }
  } finally {
    isSyncingStockAdjustments = false
  }
}

const applyLocalStockDelta = async (
  stockItemId: string,
  input: {
    delta: number
    unitPrice?: number
    costPrice?: number
    wholesalePrice?: number | null
    wholesaleMinQty?: number | null
    lowStockThreshold?: number
  },
) => {
  const item = await db.stockItems.get(stockItemId)

  if (!item) {
    throw new Error('Stock item not found')
  }

  const nextQuantity = item.quantity + input.delta
  if (nextQuantity < 0) {
    throw new Error('Insufficient stock for this adjustment')
  }

  const updatedAt = new Date().toISOString()
  const nextUnitPrice = input.unitPrice ?? item.unitPrice
  const nextCostPrice = input.costPrice ?? item.costPrice
  const metrics = computeStockMetrics({
    ...item,
    quantity: nextQuantity,
    unitPrice: nextUnitPrice,
    costPrice: nextCostPrice,
  })

  await db.stockItems.update(stockItemId, {
    quantity: nextQuantity,
    unitPrice: nextUnitPrice,
    costPrice: nextCostPrice,
    ...(input.wholesalePrice !== undefined ? { wholesalePrice: input.wholesalePrice } : {}),
    ...(input.wholesaleMinQty !== undefined ? { wholesaleMinQty: input.wholesaleMinQty } : {}),
    ...(input.lowStockThreshold != null ? { lowStockThreshold: input.lowStockThreshold } : {}),
    updatedAt,
    ...metrics,
  })
}

export const useStockList = (filters: { lowStockOnly?: boolean; search?: string }) => {
  return useInfiniteQuery({
    queryKey: stockKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
          const serverPage = await stockApi.list({
            cursor,
            pageSize: STOCK_PAGE_SIZE,
            lowStockOnly: filters.lowStockOnly,
            search: filters.search,
          }, { timeoutMs: STOCK_SERVER_TIMEOUT_MS })
          await storeServerStockItems(serverPage.data)
          return mergeServerAndLocalStockItems(serverPage.data, filters)
        } catch {
          return listStockFromDexie(filters, cursor)
        }
      }

      return listStockFromDexie(filters, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 120_000,
  })
}

export const useCreateStockItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateStockItemDTO, 'id'>) => {
      const id = uuidv4()
      const timestamp = new Date().toISOString()
      const item = {
        ...input,
        id,
        lowStockThreshold: input.lowStockThreshold ?? 5,
        wholesalePrice: input.wholesalePrice ?? null,
        wholesaleMinQty: input.wholesaleMinQty ?? null,
      }
      const metrics = computeStockMetrics(item)

      await db.stockItems.add({
        ...item,
        ...metrics,
        syncStatus: getInitialSyncStatus(),
        updatedAt: timestamp,
      })

      if (isNetworkReachable()) {
        void syncEngine.syncIfQueueThresholdReached()
      }

      return normalizeStockItem({
        ...item,
        ...metrics,
        updatedAt: timestamp,
        syncStatus: getInitialSyncStatus(),
      })
    },
    onSuccess: (createdItem) => {
      updateCachedStockLists(queryClient, createdItem)
      queryClient.invalidateQueries({ queryKey: stockKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useAdjustStock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      stockItemId: string
      delta: number
      reason: StockAdjustmentReason
      unitPrice?: number
      costPrice?: number
      wholesalePrice?: number | null
      wholesaleMinQty?: number | null
      lowStockThreshold?: number
    }) => {
      const adjustmentId = uuidv4()
      const createdAt = new Date().toISOString()

      await db.transaction('rw', db.stockItems, db.stockAdjustments, async () => {
        await applyLocalStockDelta(input.stockItemId, input)
        await db.stockAdjustments.add({
          id: adjustmentId,
          stockItemId: input.stockItemId,
          delta: input.delta,
          reason: input.reason,
          unitPrice: input.unitPrice,
          costPrice: input.costPrice,
          wholesalePrice: input.wholesalePrice,
          wholesaleMinQty: input.wholesaleMinQty,
          lowStockThreshold: input.lowStockThreshold,
          createdAt,
          syncStatus: getInitialSyncStatus(),
        })
      })

      if (isNetworkReachable()) {
        void syncEngine.syncIfQueueThresholdReached()
      }

      return db.stockItems.get(input.stockItemId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useRetryStockSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await syncPendingStockItems()
      await syncPendingStockAdjustments()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useStockMovements = (stockItemId: string, enabled = true) => {
  return useQuery<StockMovementDTO[]>({
    queryKey: stockKeys.movements(stockItemId),
    queryFn: () => stockApi.getMovements(stockItemId),
    enabled: enabled && Boolean(stockItemId),
    staleTime: 60_000,
  })
}

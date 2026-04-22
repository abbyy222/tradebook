import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalDebtor, type LocalSale } from '@/db'
import { salesApi } from '@/api/sales.api'
import { dashboardKeys } from '@/hooks/useDashboard'
import { stockKeys } from '@/hooks/useStock'
import { isNetworkReachable } from '@/services/networkHealth'
import { getInitialSyncStatus } from '@/services/syncStatus'
import { syncEngine } from '@/services/syncEngine'
import type { CreateSaleDTO, CursorPaginatedResponse, SaleDTO } from '@tradebook/shared-types'

export const salesKeys = {
  all: ['sales'] as const,
  dashboard: () => [...salesKeys.all, 'dashboard'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: object) => [...salesKeys.lists(), filters] as const,
  detail: (id: string) => [...salesKeys.all, 'detail', id] as const,
}

const SALES_PAGE_SIZE = 20

type SalesListFilters = {
  from?: string
  to?: string
  paymentType?: 'CASH' | 'TRANSFER' | 'DEBT'
}

type SalesListQueryData = {
  pages: CursorPaginatedResponse<SaleDTO>[]
  pageParams: Array<string | undefined>
}

const normalizeSale = (sale: Partial<SaleDTO> & Pick<SaleDTO, 'id' | 'itemName' | 'amount' | 'paymentType' | 'soldAt' | 'createdAt'>): SaleDTO => {
  const quantity = sale.quantity ?? 1
  const unitPrice = sale.unitPrice ?? Number((sale.amount / quantity).toFixed(2))
  return {
    ...sale,
    quantity,
    unitPrice,
    stockItemId: sale.stockItemId,
    debtorId: sale.debtorId,
    syncStatus: sale.syncStatus ?? 'SYNCED',
  } as SaleDTO
}

const applyLocalCreditSaleToDebtor = (debtor: LocalDebtor, amount: number, soldAt: string): LocalDebtor => ({
  ...debtor,
  totalOwed: debtor.totalOwed + amount,
  balance: debtor.balance + amount,
  status: 'ACTIVE',
  updatedAt: soldAt,
})

const matchesSaleFilters = (sale: Pick<SaleDTO, 'soldAt' | 'paymentType'>, filters: SalesListFilters) => {
  const soldAt = new Date(sale.soldAt).getTime()
  if (filters.from && soldAt < new Date(filters.from).getTime()) return false
  if (filters.to && soldAt > new Date(filters.to).getTime()) return false
  if (filters.paymentType && sale.paymentType !== filters.paymentType) return false
  return true
}

const upsertSaleInQueryData = (current: SalesListQueryData | undefined, sale: SaleDTO, filters: SalesListFilters) => {
  if (!current || !matchesSaleFilters(sale, filters) || current.pages.length === 0) return current

  const [firstPage, ...restPages] = current.pages
  const nextFirstPage = {
    ...firstPage,
    data: [sale, ...firstPage.data.filter((existing) => existing.id !== sale.id)]
      .sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
      .slice(0, SALES_PAGE_SIZE),
  }

  return { ...current, pages: [nextFirstPage, ...restPages] }
}

const updateCachedSalesLists = (queryClient: ReturnType<typeof useQueryClient>, sale: SaleDTO) => {
  const matchingQueries = queryClient.getQueriesData<SalesListQueryData>({ queryKey: salesKeys.lists() })

  for (const [queryKey, current] of matchingQueries) {
    const filters = (Array.isArray(queryKey) ? queryKey[queryKey.length - 1] : {}) as SalesListFilters
    const next = upsertSaleInQueryData(current, sale, filters)
    if (next && next !== current) {
      queryClient.setQueryData(queryKey, next)
    }
  }
}

const listSalesFromDexie = async (filters: SalesListFilters, cursor?: string): Promise<CursorPaginatedResponse<SaleDTO>> => {
  const sales = await db.sales.orderBy('soldAt').reverse().toArray()
  const normalized = sales.map((sale) => normalizeSale(sale as any))

  const filtered = normalized.filter((sale) => {
    if (!matchesSaleFilters(sale, filters)) return false
    if (cursor && new Date(sale.soldAt).getTime() >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, SALES_PAGE_SIZE)
  const hasNextPage = filtered.length > SALES_PAGE_SIZE
  const nextCursor = hasNextPage ? page[page.length - 1]?.soldAt ?? null : null

  return { data: page, meta: { nextCursor, hasNextPage, pageSize: SALES_PAGE_SIZE }, error: null }
}

const mergeServerAndLocalSales = async (serverSales: SaleDTO[], filters: SalesListFilters): Promise<CursorPaginatedResponse<SaleDTO>> => {
  const localUnsynced = await db.sales.filter((sale) => sale.syncStatus !== 'SYNCED').toArray()
  const merged = new Map<string, SaleDTO>()

  for (const sale of serverSales) {
    if (matchesSaleFilters(sale, filters)) {
      merged.set(sale.id, { ...normalizeSale(sale), syncStatus: 'SYNCED' })
    }
  }

  for (const sale of localUnsynced) {
    const normalized = normalizeSale(sale as any)
    if (matchesSaleFilters(normalized, filters)) {
      merged.set(normalized.id, normalized)
    }
  }

  const ordered = Array.from(merged.values()).sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime())
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
  const retryable = await db.sales.filter((sale) => sale.syncStatus !== 'SYNCED').toArray()
  if (retryable.length === 0) return

  const payload: CreateSaleDTO[] = retryable.map((sale) => {
    const normalized = normalizeSale(sale as any)
    return {
      id: normalized.id,
      itemName: normalized.itemName,
      stockItemId: normalized.stockItemId,
      quantity: normalized.quantity,
      unitPrice: normalized.unitPrice,
      amount: normalized.amount,
      paymentType: normalized.paymentType,
      debtorId: normalized.debtorId,
      soldAt: normalized.soldAt,
    }
  })

  await salesApi.syncBatch(payload)

  await db.transaction('rw', db.sales, async () => {
    for (const sale of retryable) {
      await db.sales.update(sale.id, { syncStatus: 'SYNCED' })
    }
  })
}

const storeServerSales = async (sales: SaleDTO[]) => {
  if (sales.length === 0) return
  const localProtected = await db.sales
    .filter((sale) => sale.syncStatus !== 'SYNCED')
    .primaryKeys()
  const protectedIds = new Set(localProtected as string[])

  const rows: LocalSale[] = sales
    .filter((sale) => !protectedIds.has(sale.id))
    .map((sale) => ({ ...normalizeSale(sale), syncStatus: 'SYNCED' }))

  if (rows.length === 0) return
  await db.sales.bulkPut(rows)
}

type CreateSaleInput = {
  stockItemId: string
  itemName: string
  quantity: number
  unitPrice: number
  amount: number
  paymentType: 'CASH' | 'TRANSFER' | 'DEBT'
  debtorId?: string
  soldAt: string
}

export const useDashboardStats = () => {
  return useMutation({ mutationFn: salesApi.getDashboard })
}

export const useSalesList = (filters: SalesListFilters) => {
  return useInfiniteQuery({
    queryKey: salesKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
          const serverPage = await salesApi.list({ ...filters, cursor, pageSize: SALES_PAGE_SIZE })
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
    staleTime: 120_000,
  })
}

export const useCreateSale = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const id = uuidv4()
      const createdAt = new Date().toISOString()
      const stockItem = await db.stockItems.get(input.stockItemId)

      if (!stockItem) {
        throw new Error('Select a stock item from inventory before recording a sale')
      }

      if (input.quantity <= 0) {
        throw new Error('Quantity sold must be at least 1')
      }

      if (stockItem.quantity < input.quantity) {
        throw new Error('Not enough stock. Available: ' + stockItem.quantity)
      }

      if (Math.abs(stockItem.unitPrice - input.unitPrice) > 0.009) {
        throw new Error('Use the current selling price saved on this stock item')
      }

      const canonicalAmount = Number((input.quantity * stockItem.unitPrice).toFixed(2))
      const sale = normalizeSale({
        ...input,
        id,
        itemName: stockItem.itemName,
        unitPrice: stockItem.unitPrice,
        amount: canonicalAmount,
        createdAt,
        syncStatus: getInitialSyncStatus(),
      })

      if (sale.paymentType === 'DEBT' && !sale.debtorId) {
        throw new Error('Please select a debtor for credit sales')
      }

      await db.transaction('rw', db.sales, db.stockItems, db.debtors, async () => {
        const latestStock = await db.stockItems.get(input.stockItemId)
        if (!latestStock) throw new Error('Selected stock item is no longer available')
        if (latestStock.quantity < input.quantity) {
          throw new Error('Not enough stock. Available: ' + latestStock.quantity)
        }

        await db.sales.add({ ...sale, syncStatus: getInitialSyncStatus() })
        await db.stockItems.update(latestStock.id, {
          quantity: latestStock.quantity - input.quantity,
          stockValue: (latestStock.quantity - input.quantity) * latestStock.costPrice,
          retailValue: (latestStock.quantity - input.quantity) * latestStock.unitPrice,
          expectedGrossProfit: (latestStock.quantity - input.quantity) * (latestStock.unitPrice - latestStock.costPrice),
          updatedAt: sale.soldAt,
        })

        if (sale.paymentType === 'DEBT') {
          const debtor = await db.debtors.get(sale.debtorId!)
          if (!debtor) {
            throw new Error('Selected debtor was not found locally')
          }
          await db.debtors.put(applyLocalCreditSaleToDebtor(debtor, sale.amount, sale.soldAt))
        }
      })

      if (isNetworkReachable()) {
        void syncEngine.syncIfQueueThresholdReached()
      }

      return sale
    },
    onSuccess: (createdSale) => {
      updateCachedSalesLists(queryClient, createdSale)
      queryClient.invalidateQueries({ queryKey: salesKeys.dashboard() })
      queryClient.invalidateQueries({ queryKey: salesKeys.lists() })
      queryClient.invalidateQueries({ queryKey: stockKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
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
      queryClient.invalidateQueries({ queryKey: stockKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

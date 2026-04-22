import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { suppliersApi } from '@/api/suppliers.api'
import { db, type LocalSupplier } from '@/db'
import { isNetworkReachable } from '@/services/networkHealth'
import { getInitialSyncStatus } from '@/services/syncStatus'
import { syncEngine } from '@/services/syncEngine'
import type { CreateSupplierDTO, CursorPaginatedResponse, SupplierDTO } from '@tradebook/shared-types'

export const supplierKeys = {
  all: ['suppliers'] as const,
  lists: () => [...supplierKeys.all, 'list'] as const,
  list: (filters: object) => [...supplierKeys.lists(), filters] as const,
}

const PAGE_SIZE = 20

const listSuppliersFromDexie = async (search?: string, cursor?: string): Promise<CursorPaginatedResponse<SupplierDTO>> => {
  const rows = await db.suppliers.orderBy('createdAt').reverse().toArray()

  const term = search?.trim().toLowerCase()
  const filtered = rows.filter((supplier) => {
    const createdAtMs = new Date(supplier.createdAt).getTime()
    if (cursor && createdAtMs >= new Date(cursor).getTime()) return false

    if (!term) return true
    const hay = [supplier.name, supplier.phoneNumber ?? '', supplier.itemCategory ?? ''].join(' ').toLowerCase()
    return hay.includes(term)
  })

  const page = filtered.slice(0, PAGE_SIZE) as SupplierDTO[]
  const hasNextPage = filtered.length > PAGE_SIZE

  return {
    data: page,
    meta: {
      nextCursor: hasNextPage ? page[page.length - 1]?.createdAt ?? null : null,
      hasNextPage,
      pageSize: PAGE_SIZE,
    },
    error: null,
  }
}

const storeServerSuppliers = async (suppliers: SupplierDTO[]) => {
  if (suppliers.length === 0) return

  const localProtected = await db.suppliers
    .filter((supplier) => supplier.syncStatus !== 'SYNCED')
    .primaryKeys()
  const protectedIds = new Set(localProtected as string[])

  const rows: LocalSupplier[] = suppliers
    .filter((supplier) => !protectedIds.has(supplier.id))
    .map((supplier) => ({
      ...supplier,
      syncStatus: 'SYNCED',
    }))

  if (rows.length === 0) return
  await db.suppliers.bulkPut(rows)
}

export const useSuppliersList = (search?: string) => {
  return useInfiniteQuery({
    queryKey: supplierKeys.list({ search }),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
          const serverPage = await suppliersApi.list({ cursor, pageSize: PAGE_SIZE, search })
          await storeServerSuppliers(serverPage.data)
          return listSuppliersFromDexie(search, cursor)
        } catch {
          return listSuppliersFromDexie(search, cursor)
        }
      }

      return listSuppliersFromDexie(search, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CursorPaginatedResponse<SupplierDTO>) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 120_000,
  })
}

export const useCreateSupplier = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<CreateSupplierDTO, 'id'>) => {
      const id = uuidv4()
      const now = new Date().toISOString()

      const localSupplier: LocalSupplier = {
        id,
        name: input.name,
        phoneNumber: input.phoneNumber,
        itemCategory: input.itemCategory,
        note: input.note,
        createdAt: now,
        updatedAt: now,
        syncStatus: getInitialSyncStatus(),
      }

      await db.suppliers.put(localSupplier)

      if (isNetworkReachable()) {
        void syncEngine.syncIfQueueThresholdReached()
      }

      return localSupplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() })
    },
  })
}

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: async (_result, id) => {
      await db.suppliers.delete(id)
      queryClient.invalidateQueries({ queryKey: supplierKeys.lists() })
    },
  })
}

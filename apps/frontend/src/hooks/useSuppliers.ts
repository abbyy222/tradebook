import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { suppliersApi } from '@/api/suppliers.api'
import { db, type LocalSupplier } from '@/db'
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

  const rows: LocalSupplier[] = suppliers.map((supplier) => ({
    ...supplier,
    syncStatus: 'SYNCED',
  }))

  await db.suppliers.bulkPut(rows)
}

const syncPendingSuppliers = async () => {
  const retryable = await db.suppliers.filter((supplier) => supplier.syncStatus === 'PENDING' || supplier.syncStatus === 'FAILED').toArray()
  if (retryable.length === 0) return

  for (const supplier of retryable) {
    try {
      const synced = await suppliersApi.sync({
        id: supplier.id,
        name: supplier.name,
        phoneNumber: supplier.phoneNumber ?? undefined,
        itemCategory: supplier.itemCategory ?? undefined,
        note: supplier.note ?? undefined,
      })

      await db.suppliers.put({ ...synced, syncStatus: 'SYNCED' })
    } catch {
      await db.suppliers.update(supplier.id, { syncStatus: 'FAILED' })
    }
  }
}

export const useSuppliersList = (search?: string) => {
  return useInfiniteQuery({
    queryKey: supplierKeys.list({ search }),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (navigator.onLine) {
        try {
          await syncPendingSuppliers()
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
    staleTime: 30_000,
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
        syncStatus: 'PENDING',
      }

      await db.suppliers.put(localSupplier)

      if (navigator.onLine) {
        void suppliersApi
          .sync({ id, ...input })
          .then((synced) => db.suppliers.put({ ...synced, syncStatus: 'SYNCED' }))
          .catch(() => {
            // keep pending for retry
          })
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

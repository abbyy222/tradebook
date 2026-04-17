import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { savingsApi } from '@/api/savings.api'
import { db, type LocalSavingsEntry } from '@/db'
import { isNetworkReachable } from '@/services/networkHealth'
import type { CursorPaginatedResponse, SavingsEntryDTO } from '@tradebook/shared-types'

export const savingsKeys = {
  all: ['savings'] as const,
  lists: () => [...savingsKeys.all, 'list'] as const,
  list: (filters: object) => [...savingsKeys.lists(), filters] as const,
  todaySummary: () => [...savingsKeys.all, 'today-summary'] as const,
}

const SAVINGS_PAGE_SIZE = 20

const listSavingsFromDexie = async (filters: { from?: string; to?: string }, cursor?: string): Promise<CursorPaginatedResponse<SavingsEntryDTO>> => {
  const rows = await db.savings.orderBy('savedAt').reverse().toArray()

  const filtered = rows.filter((entry) => {
    const at = new Date(entry.savedAt).getTime()
    if (Number.isNaN(at)) return false
    if (filters.from && at < new Date(filters.from).getTime()) return false
    if (filters.to && at > new Date(filters.to).getTime()) return false
    if (cursor && at >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, SAVINGS_PAGE_SIZE) as SavingsEntryDTO[]
  const hasNextPage = filtered.length > SAVINGS_PAGE_SIZE

  return {
    data: page,
    meta: {
      nextCursor: hasNextPage ? page[page.length - 1]?.savedAt ?? null : null,
      hasNextPage,
      pageSize: SAVINGS_PAGE_SIZE,
    },
    error: null,
  }
}

const storeServerSavings = async (entries: SavingsEntryDTO[]) => {
  if (entries.length === 0) return

  const rows: LocalSavingsEntry[] = entries.map((entry) => ({
    ...entry,
    syncStatus: 'SYNCED',
  }))

  await db.savings.bulkPut(rows)
}

const syncPendingSavings = async () => {
  const retryable = await db.savings.filter((entry) => entry.syncStatus === 'PENDING' || entry.syncStatus === 'FAILED').toArray()
  if (retryable.length === 0) return

  for (const entry of retryable) {
    try {
      const synced = await savingsApi.sync({
        id: entry.id,
        amount: entry.amount,
        savedAt: entry.savedAt,
        note: entry.note,
      })

      await db.savings.put({ ...synced, syncStatus: 'SYNCED' })
    } catch {
      await db.savings.update(entry.id, { syncStatus: 'FAILED' })
    }
  }
}

const getTodayBounds = () => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  to.setMilliseconds(to.getMilliseconds() - 1)
  return { from, to }
}

export const useSavingsEntries = (filters: { from?: string; to?: string } = {}) => {
  return useInfiniteQuery({
    queryKey: savingsKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
          await syncPendingSavings()
          const serverPage = await savingsApi.list({ ...filters, cursor, pageSize: SAVINGS_PAGE_SIZE })
          await storeServerSavings(serverPage.data)
          return listSavingsFromDexie(filters, cursor)
        } catch {
          return listSavingsFromDexie(filters, cursor)
        }
      }

      return listSavingsFromDexie(filters, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CursorPaginatedResponse<SavingsEntryDTO>) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}

export const useSavingsTodaySummary = () => {
  return useQuery({
    queryKey: savingsKeys.todaySummary(),
    queryFn: async () => {
      if (isNetworkReachable()) {
        try {
          await syncPendingSavings()
          const summary = await savingsApi.getTodaySummary()
          return summary
        } catch {
          // fallback to local summary
        }
      }

      const { from, to } = getTodayBounds()
      const entries = await db.savings.toArray()
      const total = entries.reduce((sum, entry) => {
        const at = new Date(entry.savedAt).getTime()
        if (at >= from.getTime() && at <= to.getTime()) {
          return sum + entry.amount
        }
        return sum
      }, 0)

      return {
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        total,
      }
    },
    staleTime: 30_000,
  })
}

export const useCreateSavingsEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<SavingsEntryDTO, 'id' | 'createdAt' | 'createdByTraderId'>) => {
      const id = uuidv4()
      const localEntry: LocalSavingsEntry = {
        id,
        amount: input.amount,
        savedAt: input.savedAt,
        note: input.note,
        createdAt: new Date().toISOString(),
        syncStatus: 'PENDING',
      }

      await db.savings.put(localEntry)

      if (isNetworkReachable()) {
        void savingsApi
          .sync({
            id,
            amount: input.amount,
            savedAt: input.savedAt,
            note: input.note,
          })
          .then((synced) => db.savings.put({ ...synced, syncStatus: 'SYNCED' }))
          .catch(() => {
            // keep pending for retry
          })
      }

      return localEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.todaySummary() })
    },
  })
}

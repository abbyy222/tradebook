import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { savingsApi } from '@/api/savings.api'
import { db, type LocalSavingsEntry } from '@/db'
import { isNetworkReachable } from '@/services/networkHealth'
import { getInitialSyncStatus } from '@/services/syncStatus'
import { syncEngine } from '@/services/syncEngine'
import type {
  ConfirmSavingsVerificationDTO,
  CreateSavingsEntryDTO,
  CursorPaginatedResponse,
  SavingsEntryDTO,
  UpdateSavingsAccountDestinationDTO,
  UpdateSavingsTargetDTO,
} from '@tradebook/shared-types'

export const savingsKeys = {
  all: ['savings'] as const,
  lists: () => [...savingsKeys.all, 'list'] as const,
  list: (filters: object) => [...savingsKeys.lists(), filters] as const,
  todaySummary: () => [...savingsKeys.all, 'today-summary'] as const,
  target: () => [...savingsKeys.all, 'target'] as const,
  account: () => [...savingsKeys.all, 'account'] as const,
  banks: () => [...savingsKeys.all, 'banks'] as const,
  verificationPreview: (id: string) => [...savingsKeys.all, 'verification-preview', id] as const,
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

  const localProtected = await db.savings
    .filter((entry) => entry.syncStatus !== 'SYNCED')
    .primaryKeys()
  const protectedIds = new Set(localProtected as string[])

  const rows: LocalSavingsEntry[] = entries
    .filter((entry) => !protectedIds.has(entry.id))
    .map((entry) => ({
      ...entry,
      syncStatus: 'SYNCED',
    }))

  if (rows.length === 0) return
  await db.savings.bulkPut(rows)
}

const getTodayBounds = () => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const to = new Date(from)
  to.setDate(to.getDate() + 1)
  to.setMilliseconds(to.getMilliseconds() - 1)
  return { from, to }
}

const getUnsyncedTodayTotal = async (from: Date, to: Date) => {
  const unsyncedToday = await db.savings
    .filter((entry) => {
      if (entry.syncStatus === 'SYNCED') return false
      const at = new Date(entry.savedAt).getTime()
      if (Number.isNaN(at)) return false
      return at >= from.getTime() && at <= to.getTime()
    })
    .toArray()

  return unsyncedToday.reduce((sum, entry) => sum + entry.amount, 0)
}

export const useSavingsEntries = (filters: { from?: string; to?: string } = {}) => {
  return useInfiniteQuery({
    queryKey: savingsKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
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
    staleTime: 120_000,
  })
}

export const useSavingsTodaySummary = () => {
  return useQuery({
    queryKey: savingsKeys.todaySummary(),
    queryFn: async () => {
      const { from, to } = getTodayBounds()

      if (isNetworkReachable()) {
        try {
          const summary = await savingsApi.getTodaySummary()
          const unsyncedLocalTotal = await getUnsyncedTodayTotal(from, to)
          return summary
            ? {
                ...summary,
                total: summary.total + unsyncedLocalTotal,
              }
            : summary
        } catch {
          // fallback to local summary
        }
      }

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
    staleTime: 120_000,
  })
}

export const useSavingsTargetProgress = () => {
  return useQuery({
    queryKey: savingsKeys.target(),
    queryFn: () => savingsApi.getTargetProgress(),
    staleTime: 120_000,
  })
}

export const useSavingsAccount = () => {
  return useQuery({
    queryKey: savingsKeys.account(),
    queryFn: () => savingsApi.getAccount(),
    staleTime: 120_000,
  })
}

export const useSavingsBanks = () => {
  return useQuery({
    queryKey: savingsKeys.banks(),
    queryFn: () => savingsApi.listBanks(),
    staleTime: 1000 * 60 * 60 * 24,
  })
}

export const useUpdateSavingsTarget = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSavingsTargetDTO) => savingsApi.updateTarget(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.target() })
    },
  })
}

export const useUpdateSavingsAccount = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateSavingsAccountDestinationDTO) => savingsApi.updateAccount(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.account() })
    },
  })
}

export const useResolveSavingsAccount = () => {
  return useMutation({
    mutationFn: savingsApi.resolveAccount,
  })
}

export const useSavingsVerificationPreview = () => {
  return useMutation({
    mutationFn: (id: string) => savingsApi.getVerificationPreview(id),
  })
}

export const useInitiateSavingsVerification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => savingsApi.initiateVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.todaySummary() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.target() })
    },
  })
}

export const useConfirmSavingsVerification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ConfirmSavingsVerificationDTO }) =>
      savingsApi.confirmVerification(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.todaySummary() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.target() })
    },
  })
}

export const useCreateSavingsEntry = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateSavingsEntryDTO, 'id'>) => {
      const id = uuidv4()
      const payload: CreateSavingsEntryDTO = {
        id,
        amount: input.amount,
        savedAt: input.savedAt,
        note: input.note,
      }

      const localEntry: LocalSavingsEntry = {
        id,
        amount: input.amount,
        savedAt: input.savedAt,
        note: input.note,
        status: 'DECLARED',
        reconciledAt: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
        syncStatus: getInitialSyncStatus(),
      }

      await db.savings.put(localEntry)

      if (isNetworkReachable()) {
        try {
          const synced = await savingsApi.sync(payload)
          const syncedEntry: LocalSavingsEntry = {
            ...synced,
            syncStatus: 'SYNCED',
          }

          await db.savings.put(syncedEntry)
          return syncedEntry
        } catch {
          void syncEngine.syncIfQueueThresholdReached()
        }
      }

      return localEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savingsKeys.lists() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.todaySummary() })
      queryClient.invalidateQueries({ queryKey: savingsKeys.target() })
    },
  })
}

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalDebtor } from '@/db'
import { debtorsApi } from '@/api/debtors.api'
import { dashboardKeys } from '@/hooks/useDashboard'
import type {
  CreateDebtorDTO,
  CursorPaginatedResponse,
  DebtorDTO,
  RecordPaymentDTO,
} from '@tradebook/shared-types'

export const debtorKeys = {
  all: ['debtors'] as const,
  lists: () => [...debtorKeys.all, 'list'] as const,
  list: (filters: object) => [...debtorKeys.lists(), filters] as const,
  detail: (id: string) => [...debtorKeys.all, 'detail', id] as const,
  payments: (id: string) => [...debtorKeys.all, 'payments', id] as const,
}

const DEBTORS_PAGE_SIZE = 20

const normalizePhoneNumber = (phoneNumber?: string) => {
  if (!phoneNumber) return undefined

  const trimmed = phoneNumber.trim()
  if (trimmed.length === 0) return undefined

  const hasPlusPrefix = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')

  if (digitsOnly.length === 0) return undefined
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly
}

const normalizeDueDate = (dueDate?: string) => {
  if (!dueDate) return undefined

  const trimmed = dueDate.trim()
  if (trimmed.length === 0) return undefined

  if (trimmed.includes('T')) return trimmed

  return new Date(`${trimmed}T00:00:00.000Z`).toISOString()
}

const toRecordPaymentPayload = (
  payment: Partial<RecordPaymentDTO> & Pick<RecordPaymentDTO, 'amount'>
): RecordPaymentDTO => ({
  amount: payment.amount,
  paidAt: payment.paidAt ?? new Date().toISOString(),
  note: payment.note?.trim() ? payment.note.trim() : undefined,
})

const toCreateDebtorPayload = (
  debtor: Pick<CreateDebtorDTO, 'id' | 'customerName' | 'phoneNumber' | 'totalOwed' | 'dueDate'>
): CreateDebtorDTO => ({
  id: debtor.id,
  customerName: debtor.customerName.trim(),
  phoneNumber: normalizePhoneNumber(debtor.phoneNumber),
  totalOwed: debtor.totalOwed,
  dueDate: normalizeDueDate(debtor.dueDate),
})

const matchesDebtorFilters = (
  debtor: Pick<DebtorDTO, 'status'>,
  filters: { status?: 'ACTIVE' | 'PARTIAL' | 'CLEARED' }
) => {
  if (filters.status && debtor.status !== filters.status) return false
  return true
}

const applyLocalPaymentToDebtor = (
  debtor: LocalDebtor,
  payment: RecordPaymentDTO
): LocalDebtor => {
  const totalPaid = debtor.totalPaid + payment.amount
  const balance = Math.max(debtor.totalOwed - totalPaid, 0)

  let status: DebtorDTO['status'] = 'ACTIVE'
  if (balance === 0) {
    status = 'CLEARED'
  } else if (totalPaid > 0) {
    status = 'PARTIAL'
  }

  return {
    ...debtor,
    totalPaid,
    balance,
    status,
    updatedAt: payment.paidAt,
  }
}

const listDebtorsFromDexie = async (
  filters: { status?: 'ACTIVE' | 'PARTIAL' | 'CLEARED' },
  cursor?: string
): Promise<CursorPaginatedResponse<DebtorDTO>> => {
  const debtors = await db.debtors.orderBy('createdAt').reverse().toArray()

  const filtered = debtors.filter((debtor) => {
    if (!matchesDebtorFilters(debtor, filters)) return false
    if (cursor && new Date(debtor.createdAt).getTime() >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, DEBTORS_PAGE_SIZE)
  const hasNextPage = filtered.length > DEBTORS_PAGE_SIZE
  const nextCursor = hasNextPage ? page[page.length - 1]?.createdAt ?? null : null

  return {
    data: page,
    meta: {
      nextCursor,
      hasNextPage,
      pageSize: DEBTORS_PAGE_SIZE,
    },
    error: null,
  }
}

const storeServerDebtors = async (debtors: DebtorDTO[]) => {
  if (debtors.length === 0) return

  const now = new Date().toISOString()
  const rows: LocalDebtor[] = debtors.map((debtor) => ({
    ...debtor,
    syncStatus: 'SYNCED',
    updatedAt: now,
  }))

  await db.debtors.bulkPut(rows)
}

const getLocallyMutatedDebtorIds = async () => {
  const unsyncedPayments = await db.debtorPayments
    .filter((payment) => payment.syncStatus !== 'SYNCED')
    .toArray()

  return new Set(unsyncedPayments.map((payment) => payment.debtorId))
}

const mergeServerAndLocalDebtors = async (
  serverDebtors: DebtorDTO[],
  filters: { status?: 'ACTIVE' | 'PARTIAL' | 'CLEARED' }
): Promise<CursorPaginatedResponse<DebtorDTO>> => {
  const localUnsynced = await db.debtors
    .filter((debtor) => debtor.syncStatus !== 'SYNCED')
    .toArray()

  const locallyMutatedIds = await getLocallyMutatedDebtorIds()
  const locallyMutatedDebtors = await db.debtors
    .filter((debtor) => locallyMutatedIds.has(debtor.id))
    .toArray()

  const merged = new Map<string, DebtorDTO & { syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED' }>()

  for (const debtor of serverDebtors) {
    if (matchesDebtorFilters(debtor, filters)) {
      merged.set(debtor.id, { ...debtor, syncStatus: 'SYNCED' })
    }
  }

  for (const debtor of [...localUnsynced, ...locallyMutatedDebtors]) {
    if (matchesDebtorFilters(debtor, filters)) {
      merged.set(debtor.id, { ...debtor, syncStatus: 'SYNCED' })
    }
  }

  const ordered = Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const page = ordered.slice(0, DEBTORS_PAGE_SIZE)
  const hasNextPage = ordered.length > DEBTORS_PAGE_SIZE

  return {
    data: page,
    meta: {
      nextCursor: hasNextPage ? page[page.length - 1]?.createdAt ?? null : null,
      hasNextPage,
      pageSize: DEBTORS_PAGE_SIZE,
    },
    error: null,
  }
}

const syncPendingDebtors = async () => {
  const retryable = await db.debtors
    .filter((debtor) => debtor.syncStatus === 'PENDING' || debtor.syncStatus === 'FAILED')
    .toArray()

  if (retryable.length === 0) return

  for (const debtor of retryable) {
    try {
      const created = await debtorsApi.create(toCreateDebtorPayload(debtor))

      await db.debtors.put({
        ...created,
        syncStatus: 'SYNCED',
        updatedAt: new Date().toISOString(),
      })
    } catch {
      await db.debtors.update(debtor.id, { syncStatus: 'FAILED' })
    }
  }
}

const syncPendingDebtorPayments = async () => {
  const retryable = await db.debtorPayments
    .filter((payment) => payment.syncStatus === 'PENDING' || payment.syncStatus === 'FAILED')
    .sortBy('createdAt')

  if (retryable.length === 0) return

  for (const payment of retryable) {
    try {
      const updatedDebtor = await debtorsApi.recordPayment(
        payment.debtorId,
        toRecordPaymentPayload(payment)
      )

      await db.transaction('rw', db.debtorPayments, db.debtors, async () => {
        await db.debtorPayments.update(payment.id, { syncStatus: 'SYNCED' })
        await db.debtors.put({
          ...updatedDebtor,
          syncStatus: 'SYNCED',
          updatedAt: new Date().toISOString(),
        })
      })
    } catch {
      await db.transaction('rw', db.debtorPayments, db.debtors, async () => {
        await db.debtorPayments.update(payment.id, { syncStatus: 'FAILED' })
        await db.debtors.update(payment.debtorId, { syncStatus: 'FAILED' })
      })
    }
  }
}

export const useDebtorsList = (status?: 'ACTIVE' | 'PARTIAL' | 'CLEARED') => {
  return useInfiniteQuery({
    queryKey: debtorKeys.list({ status }),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (navigator.onLine) {
        try {
          await syncPendingDebtors()
          await syncPendingDebtorPayments()
          const serverPage = await debtorsApi.list({
            status,
            cursor,
            pageSize: DEBTORS_PAGE_SIZE,
          })
          await storeServerDebtors(serverPage.data)
          return mergeServerAndLocalDebtors(serverPage.data, { status })
        } catch {
          return listDebtorsFromDexie({ status }, cursor)
        }
      }

      return listDebtorsFromDexie({ status }, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}

export const useDebtor = (id: string) => {
  return useQuery({
    queryKey: debtorKeys.detail(id),
    queryFn: () => debtorsApi.getOne(id),
    enabled: !!id,
  })
}

export const usePaymentHistory = (debtorId: string) => {
  return useQuery({
    queryKey: debtorKeys.payments(debtorId),
    queryFn: () => debtorsApi.getPaymentHistory(debtorId),
    enabled: !!debtorId,
  })
}

export const useCreateDebtor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateDebtorDTO, 'id'>) => {
      const debtor = toCreateDebtorPayload({ ...input, id: uuidv4() })
      const timestamp = new Date().toISOString()

      await db.debtors.add({
        ...debtor,
        totalPaid: 0,
        balance: debtor.totalOwed,
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'PENDING',
      })

      if (navigator.onLine) {
        void debtorsApi
          .create(debtor)
          .then((created) =>
            db.debtors.put({
              ...created,
              syncStatus: 'SYNCED',
              updatedAt: new Date().toISOString(),
            })
          )
          .catch(() => {
            // Leave the local debtor as PENDING so the next sync cycle can retry it.
          })
      }

      return debtor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useRecordPayment = (debtorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<RecordPaymentDTO> & Pick<RecordPaymentDTO, 'amount'>) => {
      const payment = toRecordPaymentPayload(input)
      const debtor = await db.debtors.get(debtorId)

      if (!debtor) {
        throw new Error('Debtor not found locally')
      }

      const localUpdatedDebtor = applyLocalPaymentToDebtor(debtor, payment)
      const queuedPayment = {
        id: uuidv4(),
        debtorId,
        amount: payment.amount,
        paidAt: payment.paidAt,
        note: payment.note,
        createdAt: new Date().toISOString(),
        syncStatus: 'PENDING' as const,
      }

      await db.transaction('rw', db.debtors, db.debtorPayments, async () => {
        await db.debtorPayments.add(queuedPayment)
        await db.debtors.put(localUpdatedDebtor)
      })

      if (navigator.onLine) {
        void syncPendingDebtorPayments().catch(() => {
          // Keep the local payment queued for the sync engine to retry later.
        })
      }

      return localUpdatedDebtor
    },
    onSuccess: async (updatedDebtor) => {
      queryClient.setQueryData(debtorKeys.detail(debtorId), updatedDebtor)
      queryClient.invalidateQueries({ queryKey: debtorKeys.payments(debtorId) })
      queryClient.invalidateQueries({ queryKey: debtorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useRetryDebtorSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await syncPendingDebtors()
      await syncPendingDebtorPayments()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: debtorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

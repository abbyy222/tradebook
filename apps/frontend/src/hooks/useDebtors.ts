import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalDebtor, type LocalDebtorPayment, type LocalSale } from '@/db'
import { debtorsApi } from '@/api/debtors.api'
import { dashboardKeys } from '@/hooks/useDashboard'
import { isNetworkReachable } from '@/services/networkHealth'
import type {
  CreateDebtorDTO,
  CursorPaginatedResponse,
  DebtorDTO,
  DebtorStatementDTO,
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
let isSyncingDebtors = false
let isSyncingDebtorPayments = false

const normalizePhoneNumber = (phoneNumber?: string) => {
  if (!phoneNumber) return undefined

  const trimmed = phoneNumber.trim()
  if (trimmed.length === 0) return undefined

  const hasPlusPrefix = trimmed.startsWith('+')
  const digitsOnly = trimmed.replace(/\D/g, '')

  if (digitsOnly.length === 0) return undefined
  return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly
}

const normalizeDueDate = (dueDate?: string | null) => {
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
  debtor: Pick<CreateDebtorDTO, 'id' | 'customerName' | 'phoneNumber' | 'totalOwed'> & { dueDate?: string | null }
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
  payment: RecordPaymentDTO,
  syncStatus: LocalDebtor['syncStatus'] = 'PENDING'
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
    syncStatus,
  }
}

const getUnsyncedCreditSalesForDebtor = async (debtorId: string) => {
  return db.sales
    .filter(
      (sale) =>
        sale.debtorId === debtorId &&
        sale.paymentType === 'DEBT' &&
        sale.syncStatus !== 'SYNCED'
    )
    .toArray()
}

const buildSeedDebtorPayload = async (debtor: LocalDebtor) => {
  const pendingCreditSales = await getUnsyncedCreditSalesForDebtor(debtor.id)
  const pendingCreditTotal = pendingCreditSales.reduce((sum, sale) => sum + sale.amount, 0)
  const openingTotalOwed = Math.max(Number((debtor.totalOwed - pendingCreditTotal).toFixed(2)), 0)

  return {
    payload: toCreateDebtorPayload({
      id: debtor.id,
      customerName: debtor.customerName,
      phoneNumber: debtor.phoneNumber,
      totalOwed: openingTotalOwed,
      dueDate: debtor.dueDate,
    }),
    pendingCreditTotal,
  }
}

const mergeQueuedCreditSalesBackIntoDebtor = (debtor: DebtorDTO, pendingCreditTotal: number): LocalDebtor => {
  if (pendingCreditTotal <= 0) {
    return {
      ...debtor,
      syncStatus: 'SYNCED',
      updatedAt: new Date().toISOString(),
    }
  }

  const totalOwed = Number((debtor.totalOwed + pendingCreditTotal).toFixed(2))
  const balance = Number((totalOwed - debtor.totalPaid).toFixed(2))

  return {
    ...debtor,
    totalOwed,
    balance,
    status: balance <= 0 ? 'CLEARED' : debtor.totalPaid > 0 ? 'PARTIAL' : 'ACTIVE',
    syncStatus: 'SYNCED',
    updatedAt: new Date().toISOString(),
  }
}

const hasLocalUnsyncedStatementChanges = async (debtorId: string) => {
  const [unsyncedPaymentsCount, unsyncedCreditSalesCount] = await Promise.all([
    db.debtorPayments
      .filter((payment) => payment.debtorId === debtorId && payment.syncStatus !== 'SYNCED')
      .count(),
    db.sales
      .filter(
        (sale) =>
          sale.debtorId === debtorId &&
          sale.paymentType === 'DEBT' &&
          sale.syncStatus !== 'SYNCED'
      )
      .count(),
  ])

  return unsyncedPaymentsCount > 0 || unsyncedCreditSalesCount > 0
}

const buildLocalStatement = async (debtorId: string): Promise<DebtorStatementDTO> => {
  const debtor = await db.debtors.get(debtorId)
  if (!debtor) {
    throw new Error('Debtor not found locally')
  }

  const [sales, payments] = await Promise.all([
    db.sales
      .filter((sale) => sale.debtorId === debtorId && sale.paymentType === 'DEBT')
      .toArray(),
    db.debtorPayments.filter((payment) => payment.debtorId === debtorId).toArray(),
  ])

  const timeline: Array<{
    id: string
    type: 'SALE' | 'PAYMENT'
    amount: number
    date: string
    reference?: string
    note?: string
  }> = [
    ...sales.map((sale: LocalSale) => ({
      id: sale.id,
      type: 'SALE' as const,
      amount: sale.amount,
      date: sale.soldAt,
      reference: sale.itemName,
      note: sale.syncStatus === 'SYNCED' ? 'Credit sale' : 'Credit sale (queued)',
    })),
    ...payments.map((payment: LocalDebtorPayment) => ({
      id: payment.id,
      type: 'PAYMENT' as const,
      amount: payment.amount,
      date: payment.paidAt,
      note:
        payment.note ??
        (payment.syncStatus === 'SYNCED' ? undefined : 'Payment recorded locally (queued)'),
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const totalSalesOnCredit = sales.reduce((sum, sale) => sum + sale.amount, 0)
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const openingBalance = Math.max(
    Number((debtor.totalOwed - totalSalesOnCredit).toFixed(2)),
    0
  )

  let runningBalance = openingBalance
  const entries = timeline.map((entry) => {
    if (entry.type === 'SALE') runningBalance += entry.amount
    if (entry.type === 'PAYMENT') runningBalance -= entry.amount

    return {
      ...entry,
      balanceAfter: Math.max(Number(runningBalance.toFixed(2)), 0),
    }
  })

  const statementBalance = entries.length > 0
    ? entries[entries.length - 1].balanceAfter
    : Math.max(Number((openingBalance + totalSalesOnCredit - totalPayments).toFixed(2)), 0)

  return {
    debtor,
    generatedAt: new Date().toISOString(),
    entries,
    totals: {
      totalSalesOnCredit,
      totalPayments,
      balance: statementBalance,
    },
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

  const [locallyUnsyncedDebtors, unsyncedPayments, existingDebtors] = await Promise.all([
    db.debtors.filter((debtor) => debtor.syncStatus !== 'SYNCED').toArray(),
    db.debtorPayments.filter((payment) => payment.syncStatus !== 'SYNCED').toArray(),
    db.debtors.toArray(),
  ])
  const unsyncedCreditSales = await db.sales
    .filter(
      (sale) => sale.paymentType === 'DEBT' && sale.debtorId != null && sale.syncStatus !== 'SYNCED'
    )
    .toArray()
  const localLockIds = new Set<string>([
    ...locallyUnsyncedDebtors.map((debtor) => debtor.id),
    ...unsyncedPayments.map((payment) => payment.debtorId),
    ...unsyncedCreditSales.map((sale) => sale.debtorId!).filter(Boolean),
  ])
  const existingById = new Map(existingDebtors.map((debtor) => [debtor.id, debtor]))

  const now = new Date().toISOString()
  const rows: LocalDebtor[] = debtors
    .filter((serverDebtor) => {
      if (localLockIds.has(serverDebtor.id)) return false

      const local = existingById.get(serverDebtor.id)
      if (!local) return true

      // Extra guard: even synced local rows should not be replaced by older server snapshots.
      if (new Date(local.updatedAt).getTime() > new Date(serverDebtor.updatedAt).getTime()) {
        return false
      }

      return true
    })
    .map((debtor) => ({
      ...debtor,
      syncStatus: 'SYNCED',
      updatedAt: now,
    }))

  if (rows.length === 0) return
  await db.debtors.bulkPut(rows)
}

const getLocallyMutatedDebtorIds = async () => {
  const unsyncedPayments = await db.debtorPayments
    .filter((payment) => payment.syncStatus !== 'SYNCED')
    .toArray()
  const unsyncedCreditSales = await db.sales
    .filter(
      (sale) => sale.paymentType === 'DEBT' && sale.debtorId != null && sale.syncStatus !== 'SYNCED'
    )
    .toArray()

  return new Set([
    ...unsyncedPayments.map((payment) => payment.debtorId),
    ...unsyncedCreditSales.map((sale) => sale.debtorId!).filter(Boolean),
  ])
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

  const merged = new Map<string, DebtorDTO & { syncStatus?: 'QUEUED' | 'PENDING' | 'SYNCED' | 'FAILED' }>()

  for (const debtor of serverDebtors) {
    if (matchesDebtorFilters(debtor, filters)) {
      merged.set(debtor.id, { ...debtor, syncStatus: 'SYNCED' })
    }
  }

  for (const debtor of [...localUnsynced, ...locallyMutatedDebtors]) {
    if (matchesDebtorFilters(debtor, filters)) {
      // Preserve local sync state so queued/failed debtors are visible in UI.
      merged.set(debtor.id, { ...debtor, syncStatus: debtor.syncStatus })
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
  if (isSyncingDebtors) return
  isSyncingDebtors = true

  const retryable = await db.debtors
    .filter((debtor) => debtor.syncStatus !== 'SYNCED')
    .toArray()

  try {
    if (retryable.length === 0) return

    for (const debtor of retryable) {
      try {
        const { payload, pendingCreditTotal } = await buildSeedDebtorPayload(debtor)
        const created = await debtorsApi.create(payload)

        await db.debtors.put(mergeQueuedCreditSalesBackIntoDebtor(created, pendingCreditTotal))
      } catch {
        await db.debtors.update(debtor.id, { syncStatus: 'FAILED' })
      }
    }
  } finally {
    isSyncingDebtors = false
  }
}

const syncPendingDebtorPayments = async () => {
  if (isSyncingDebtorPayments) return
  isSyncingDebtorPayments = true

  const retryable = await db.debtorPayments
    .filter((payment) => payment.syncStatus !== 'SYNCED')
    .sortBy('createdAt')

  try {
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
  } finally {
    isSyncingDebtorPayments = false
  }
}

export const useDebtorsList = (status?: 'ACTIVE' | 'PARTIAL' | 'CLEARED') => {
  return useInfiniteQuery({
    queryKey: debtorKeys.list({ status }),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (isNetworkReachable()) {
        try {
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
    staleTime: 120_000,
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

export const useDebtorStatement = (debtorId: string) => {
  return useQuery({
    queryKey: [...debtorKeys.detail(debtorId), 'statement'],
    queryFn: async () => {
      const debtor = await db.debtors.get(debtorId)
      const hasUnsyncedChanges = await hasLocalUnsyncedStatementChanges(debtorId)
      const shouldUseLocal =
        !isNetworkReachable() || hasUnsyncedChanges || (debtor && debtor.syncStatus !== 'SYNCED')

      if (shouldUseLocal) {
        return buildLocalStatement(debtorId)
      }

      try {
        return await debtorsApi.getStatement(debtorId)
      } catch {
        return buildLocalStatement(debtorId)
      }
    },
    enabled: !!debtorId,
  })
}

export const useCreateDebtor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateDebtorDTO, 'id'>) => {
      const debtor = toCreateDebtorPayload({ ...input, id: uuidv4() })
      const timestamp = new Date().toISOString()

      if (isNetworkReachable()) {
        try {
          const created = await debtorsApi.create(debtor)
          await db.debtors.put({
            ...created,
            syncStatus: 'SYNCED',
            updatedAt: new Date().toISOString(),
          })
          return created
        } catch {
          // fall back to offline save so trader can keep working
        }
      }

      await db.debtors.add({
        ...debtor,
        totalPaid: 0,
        balance: debtor.totalOwed,
        status: 'ACTIVE',
        createdAt: timestamp,
        updatedAt: timestamp,
        syncStatus: 'PENDING',
      })

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

      const canAttemptServer =
        isNetworkReachable() && (typeof navigator === 'undefined' || navigator.onLine)

      if (canAttemptServer) {
        try {
          const updatedDebtor = await debtorsApi.recordPayment(
            debtorId,
            toRecordPaymentPayload(payment)
          )

          await db.transaction('rw', db.debtors, db.debtorPayments, async () => {
            await db.debtorPayments.add({
              id: uuidv4(),
              debtorId,
              amount: payment.amount,
              paidAt: payment.paidAt,
              note: payment.note,
              createdAt: new Date().toISOString(),
              syncStatus: 'SYNCED',
            })
            await db.debtors.put({
              ...updatedDebtor,
              syncStatus: 'SYNCED',
              updatedAt: new Date().toISOString(),
            })
          })

          return {
            ...updatedDebtor,
            syncStatus: 'SYNCED' as const,
            updatedAt: new Date().toISOString(),
          }
        } catch {
          // fall back to offline queue so operation does not block trader
        }
      }

      const localUpdatedDebtor = applyLocalPaymentToDebtor(debtor, payment, 'PENDING')
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

      return localUpdatedDebtor
    },
    onSuccess: async (updatedDebtor) => {
      queryClient.setQueryData(debtorKeys.detail(debtorId), updatedDebtor)
      queryClient.invalidateQueries({ queryKey: debtorKeys.payments(debtorId) })
      queryClient.invalidateQueries({ queryKey: [...debtorKeys.detail(debtorId), 'statement'] })
      queryClient.invalidateQueries({ queryKey: debtorKeys.lists() })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.overview() })
    },
  })
}

export const useUpdateDebtorSchedule = (debtorId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dueDate: string | null) => {
      const updatedDebtor = await debtorsApi.updateSchedule(debtorId, { dueDate })

      await db.debtors.put({
        ...updatedDebtor,
        syncStatus: 'SYNCED',
        updatedAt: new Date().toISOString(),
      })

      return updatedDebtor
    },
    onSuccess: (updatedDebtor) => {
      queryClient.setQueryData(debtorKeys.detail(debtorId), updatedDebtor)
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

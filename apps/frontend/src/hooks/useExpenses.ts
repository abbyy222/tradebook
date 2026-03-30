import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalExpense } from '@/db'
import { expensesApi } from '@/api/expenses.api'
import type {
  CreateExpenseDTO,
  CursorPaginatedResponse,
  ExpenseCategory,
  ExpenseDTO,
  ExpenseFrequency,
  ExpenseType,
} from '@tradebook/shared-types'

export type ExpenseListFilters = {
  from?: string
  to?: string
  category?: ExpenseCategory
  expenseType?: ExpenseType
  frequency?: ExpenseFrequency
}

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: ExpenseListFilters) => [...expenseKeys.lists(), filters] as const,
}

const EXPENSES_PAGE_SIZE = 20

const normalizeExpenseCategory = (category: string | undefined): ExpenseCategory => {
  switch ((category ?? '').toUpperCase()) {
    case 'TRANSPORT':
      return 'TRANSPORT'
    case 'SUPPLIES':
    case 'RESTOCK':
      return 'RESTOCK'
    case 'MARKET_FEES':
    case 'MARKET FEES':
      return 'MARKET_FEES'
    case 'PACKAGING':
      return 'PACKAGING'
    case 'EQUIPMENT':
      return 'EQUIPMENT'
    case 'FOOD':
      return 'FOOD'
    case 'RENT':
      return 'RENT'
    case 'ELECTRICITY':
      return 'ELECTRICITY'
    case 'WATER':
      return 'WATER'
    case 'SALARY':
    case 'STAFF':
      return 'SALARY'
    case 'LEVY':
      return 'LEVY'
    case 'REPAIRS':
      return 'REPAIRS'
    case 'UTILITIES':
      return 'UTILITIES'
    default:
      return 'OTHER'
  }
}

const normalizeIsoDateTime = (value?: string) => {
  if (!value) return undefined
  const raw = value.trim()
  if (!raw) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00.000Z`).toISOString()
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

const getNextDueDate = (frequency: ExpenseFrequency | undefined, anchorDate: string | undefined) => {
  if (!frequency || !anchorDate) return undefined

  const next = new Date(anchorDate)
  if (Number.isNaN(next.getTime())) return undefined

  if (frequency === 'DAILY') next.setUTCDate(next.getUTCDate() + 1)
  if (frequency === 'MONTHLY') next.setUTCMonth(next.getUTCMonth() + 1)
  if (frequency === 'YEARLY') next.setUTCFullYear(next.getUTCFullYear() + 1)

  return next.toISOString()
}

const sanitizeEndDate = (startDate: string | undefined, endDate: string | undefined) => {
  if (!startDate || !endDate) return endDate
  return new Date(endDate).getTime() >= new Date(startDate).getTime() ? endDate : undefined
}

const normalizeExpenseRecord = (expense: Partial<ExpenseDTO> & { id: string; description: string; amount: number; spentAt: string; createdAt?: string }) => {
  const expenseType: ExpenseType = expense.expenseType === 'RECURRING' ? 'RECURRING' : 'ONE_TIME'
  const spentAt = normalizeIsoDateTime(expense.spentAt) ?? new Date().toISOString()
  const startDate = normalizeIsoDateTime(expense.startDate) ?? (expenseType === 'RECURRING' ? spentAt : undefined)
  const rawEndDate = normalizeIsoDateTime(expense.endDate)
  const endDate = sanitizeEndDate(startDate, rawEndDate)
  const frequency = expenseType === 'RECURRING' ? expense.frequency : undefined
  const nextDueDate = expenseType === 'RECURRING'
    ? normalizeIsoDateTime(expense.nextDueDate) ?? getNextDueDate(frequency, startDate ?? spentAt)
    : undefined

  return {
    ...expense,
    spentAt,
    startDate,
    endDate,
    nextDueDate,
    category: normalizeExpenseCategory(expense.category),
    expenseType,
    frequency,
    createdAt: expense.createdAt ?? new Date().toISOString(),
  }
}

const matchesExpenseFilters = (
  expense: Pick<ExpenseDTO, 'spentAt' | 'category' | 'expenseType' | 'frequency'>,
  filters: ExpenseListFilters,
) => {
  const spentAt = new Date(expense.spentAt).getTime()

  if (filters.from && spentAt < new Date(filters.from).getTime()) return false
  if (filters.to && spentAt > new Date(filters.to).getTime()) return false
  if (filters.category && expense.category !== filters.category) return false
  if (filters.expenseType && expense.expenseType !== filters.expenseType) return false
  if (filters.frequency && expense.frequency !== filters.frequency) return false

  return true
}

const listExpensesFromDexie = async (
  filters: ExpenseListFilters,
  cursor?: string,
): Promise<CursorPaginatedResponse<ExpenseDTO>> => {
  const expenses = await db.expenses.orderBy('spentAt').reverse().toArray()

  const filtered = expenses
    .map(normalizeExpenseRecord)
    .filter((expense) => {
      if (!matchesExpenseFilters(expense as ExpenseDTO, filters)) return false
      if (cursor && new Date(expense.spentAt).getTime() >= new Date(cursor).getTime()) return false
      return true
    })

  const page = filtered.slice(0, EXPENSES_PAGE_SIZE) as ExpenseDTO[]
  const hasNextPage = filtered.length > EXPENSES_PAGE_SIZE
  const nextCursor = hasNextPage ? page[page.length - 1]?.spentAt ?? null : null

  return {
    data: page,
    meta: {
      nextCursor,
      hasNextPage,
      pageSize: EXPENSES_PAGE_SIZE,
    },
    error: null,
  }
}

const syncPendingExpenses = async () => {
  const retryable = await db.expenses
    .filter((expense) => expense.syncStatus === 'PENDING' || expense.syncStatus === 'FAILED')
    .toArray()

  if (retryable.length === 0) return

  const normalized = retryable.map((expense) => normalizeExpenseRecord(expense as Partial<ExpenseDTO> & { id: string; description: string; amount: number; spentAt: string }))

  const payload: CreateExpenseDTO[] = normalized.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    expenseType: expense.expenseType,
    frequency: expense.frequency,
    note: expense.note,
    spentAt: expense.spentAt,
    startDate: expense.startDate,
    endDate: expense.endDate,
    nextDueDate: expense.nextDueDate,
  }))

  await expensesApi.syncBatch(payload)

  await db.transaction('rw', db.expenses, async () => {
    for (const expense of normalized) {
      await db.expenses.update(expense.id, {
        category: expense.category,
        expenseType: expense.expenseType,
        frequency: expense.frequency,
        syncStatus: 'SYNCED',
      })
    }
  })
}

const storeServerExpenses = async (expenses: ExpenseDTO[]) => {
  if (expenses.length === 0) return

  const rows: LocalExpense[] = expenses.map((expense) => ({
    ...normalizeExpenseRecord(expense),
    syncStatus: expense.syncStatus ?? 'SYNCED',
  }))

  await db.expenses.bulkPut(rows)
}

const updateCachedExpenseLists = (queryClient: ReturnType<typeof useQueryClient>, expense: LocalExpense) => {
  const queries = queryClient.getQueriesData<{
    pageParams: Array<string | undefined>
    pages: CursorPaginatedResponse<ExpenseDTO>[]
  }>({ queryKey: expenseKeys.lists() })

  for (const [queryKey, existing] of queries) {
    if (!existing) continue

    const filters = (queryKey as readonly unknown[])[2] as ExpenseListFilters | undefined
    if (filters && !matchesExpenseFilters(expense, filters)) continue

    const firstPage = existing.pages[0] ?? {
      data: [],
      meta: { nextCursor: null, hasNextPage: false, pageSize: EXPENSES_PAGE_SIZE },
      error: null,
    }

    const deduped = [expense, ...firstPage.data.filter((row) => row.id !== expense.id)]
    const nextFirstPage = {
      ...firstPage,
      data: deduped.slice(0, EXPENSES_PAGE_SIZE),
      meta: {
        ...firstPage.meta,
        hasNextPage: deduped.length > EXPENSES_PAGE_SIZE || firstPage.meta.hasNextPage,
      },
    }

    queryClient.setQueryData(queryKey, {
      ...existing,
      pages: [nextFirstPage, ...existing.pages.slice(1)],
    })
  }
}

export const useExpensesList = (filters: ExpenseListFilters = {}) => {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (navigator.onLine) {
        try {
          void syncPendingExpenses()
          const serverPage = await expensesApi.list({ ...filters, cursor, pageSize: EXPENSES_PAGE_SIZE })
          await storeServerExpenses(serverPage.data)
          return listExpensesFromDexie(filters, cursor)
        } catch {
          return listExpensesFromDexie(filters, cursor)
        }
      }

      return listExpensesFromDexie(filters, cursor)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}

export const useCreateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<CreateExpenseDTO, 'id'>) => {
      const id = uuidv4()
      const normalized = normalizeExpenseRecord({ ...input, id })
      const localExpense: LocalExpense = {
        ...normalized,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      }

      await db.expenses.put(localExpense)

      if (navigator.onLine) {
        void expensesApi
          .sync({
            id: localExpense.id,
            description: localExpense.description,
            amount: localExpense.amount,
            category: localExpense.category,
            expenseType: localExpense.expenseType,
            frequency: localExpense.frequency,
            note: localExpense.note,
            spentAt: localExpense.spentAt,
            startDate: localExpense.startDate,
            endDate: localExpense.endDate,
            nextDueDate: localExpense.nextDueDate,
          })
          .then((serverExpense) => db.expenses.put({ ...normalizeExpenseRecord(serverExpense), syncStatus: 'SYNCED' }))
          .catch(() => {
            // Keep it pending locally so background sync can retry later.
          })
      }

      return localExpense
    },
    onSuccess: (expense) => {
      updateCachedExpenseLists(queryClient, expense)
    },
  })
}

export const useRetryExpensesSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await syncPendingExpenses()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
    },
  })
}
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { db, type LocalExpense } from '@/db'
import { expensesApi } from '@/api/expenses.api'
import type {
  CreateExpenseDTO,
  CursorPaginatedResponse,
  ExpenseDTO,
} from '@tradebook/shared-types'

const normalizeExpenseCategory = (category: string) => {
  switch (category.toUpperCase()) {
    case 'TRANSPORT':
      return 'transport'
    case 'SUPPLIES':
    case 'RESTOCK':
      return 'restock'
    case 'UTILITIES':
    case 'RENT':
    case 'MARKET_FEES':
      return 'market_fees'
    case 'PACKAGING':
      return 'packaging'
    case 'EQUIPMENT':
      return 'equipment'
    case 'FOOD':
      return 'food'
    case 'STAFF':
    case 'OTHER':
    default:
      return 'other'
  }
}

export const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: object) => [...expenseKeys.lists(), filters] as const,
}

const EXPENSES_PAGE_SIZE = 20

const matchesExpenseFilters = (
  expense: Pick<ExpenseDTO, 'spentAt' | 'category'>,
  filters: {
    from?: string
    to?: string
    category?: string
  }
) => {
  const spentAt = new Date(expense.spentAt).getTime()

  if (filters.from && spentAt < new Date(filters.from).getTime()) return false
  if (filters.to && spentAt > new Date(filters.to).getTime()) return false
  if (filters.category && expense.category !== filters.category) return false

  return true
}

const listExpensesFromDexie = async (
  filters: {
    from?: string
    to?: string
    category?: string
  },
  cursor?: string
): Promise<CursorPaginatedResponse<ExpenseDTO>> => {
  const expenses = await db.expenses.orderBy('spentAt').reverse().toArray()

  const filtered = expenses.filter((expense) => {
    if (!matchesExpenseFilters(expense, filters)) return false
    if (cursor && new Date(expense.spentAt).getTime() >= new Date(cursor).getTime()) return false
    return true
  })

  const page = filtered.slice(0, EXPENSES_PAGE_SIZE)
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
  const pending = await db.expenses
    .filter((expense) => expense.syncStatus === 'PENDING' || expense.syncStatus === 'FAILED')
    .toArray()
  if (pending.length === 0) return

  const payload: CreateExpenseDTO[] = pending.map((expense) => ({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    category: normalizeExpenseCategory(expense.category),
    spentAt: expense.spentAt,
  }))

  await expensesApi.syncBatch(payload)

  await db.transaction('rw', db.expenses, async () => {
    for (const expense of pending) {
      await db.expenses.update(expense.id, { syncStatus: 'SYNCED' })
    }
  })
}

const storeServerExpenses = async (expenses: ExpenseDTO[]) => {
  if (expenses.length === 0) return

  const rows: LocalExpense[] = expenses.map((expense) => ({
    ...expense,
    syncStatus: 'SYNCED',
  }))

  await db.expenses.bulkPut(rows)
}

export const useExpensesList = (filters: {
  from?: string
  to?: string
  category?: string
} = {}) => {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as string | undefined

      if (navigator.onLine) {
        try {
          await syncPendingExpenses()
          const serverPage = await expensesApi.list({
            ...filters,
            cursor,
            pageSize: EXPENSES_PAGE_SIZE,
          })
          await storeServerExpenses(serverPage.data)
          return serverPage
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
      const expense = {
        ...input,
        id,
        category: normalizeExpenseCategory(input.category),
      }

      await db.expenses.add({
        ...expense,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString(),
      })

      if (navigator.onLine) {
        void expensesApi
          .sync(expense)
          .then(() => db.expenses.update(id, { syncStatus: 'SYNCED' }))
          .catch(() => {
            // Keep the record locally so the sync engine can retry later.
          })
      }

      return expense
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all })
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

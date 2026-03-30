import { z } from 'zod'

export const EXPENSE_CATEGORIES = [
  'RESTOCK',
  'TRANSPORT',
  'MARKET_FEES',
  'PACKAGING',
  'EQUIPMENT',
  'FOOD',
  'RENT',
  'ELECTRICITY',
  'WATER',
  'SALARY',
  'LEVY',
  'REPAIRS',
  'UTILITIES',
  'OTHER',
] as const

export const EXPENSE_TYPES = ['ONE_TIME', 'RECURRING'] as const
export const EXPENSE_FREQUENCIES = ['DAILY', 'MONTHLY', 'YEARLY'] as const

const normalizeExpenseCategory = (value: unknown) => {
  const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_')

  switch (normalized) {
    case 'TRANSPORT':
      return 'TRANSPORT'
    case 'SUPPLIES':
    case 'RESTOCK':
      return 'RESTOCK'
    case 'MARKET_FEES':
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

const normalizeExpenseType = (value: unknown) => {
  const normalized = String(value ?? '').trim().toUpperCase()
  return normalized === 'RECURRING' ? 'RECURRING' : 'ONE_TIME'
}

const normalizeExpenseFrequency = (value: unknown) => {
  if (value == null || value === '') return undefined
  const normalized = String(value).trim().toUpperCase()
  return ['DAILY', 'MONTHLY', 'YEARLY'].includes(normalized) ? normalized : undefined
}

const normalizeDateTime = (value: unknown) => {
  if (value == null || value === '') return undefined
  if (value instanceof Date) return value.toISOString()

  const raw = String(value).trim()
  if (!raw) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00.000Z`).toISOString()
  }

  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString()
}

const baseExpenseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300).trim(),
  amount: z.number().positive(),
  // The backend accepts both the new enum values and legacy lowercase aliases.
  // That makes sync resilient when older offline rows come back after a schema upgrade.
  category: z.preprocess(normalizeExpenseCategory, z.enum(EXPENSE_CATEGORIES)),
  expenseType: z.preprocess(normalizeExpenseType, z.enum(EXPENSE_TYPES)).default('ONE_TIME'),
  frequency: z.preprocess(normalizeExpenseFrequency, z.enum(EXPENSE_FREQUENCIES).optional()),
  note: z.string().trim().max(500).optional(),
  spentAt: z.preprocess(normalizeDateTime, z.string().datetime()),
  startDate: z.preprocess(normalizeDateTime, z.string().datetime().optional()),
  endDate: z.preprocess(normalizeDateTime, z.string().datetime().optional()),
  nextDueDate: z.preprocess(normalizeDateTime, z.string().datetime().optional()),
})

export const createExpenseSchema = baseExpenseSchema.superRefine((value, ctx) => {
  if (value.expenseType === 'RECURRING' && !value.frequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'Recurring expenses require a frequency',
    })
  }

  if (value.expenseType === 'ONE_TIME' && value.frequency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['frequency'],
      message: 'One-time expenses must not include a frequency',
    })
  }

  if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endDate'],
      message: 'End date cannot be before start date',
    })
  }
})

export const syncExpensesSchema = z.object({
  expenses: z.array(createExpenseSchema).min(1).max(100),
})

export const listExpensesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(z.number().min(1).max(100)),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  category: z.preprocess((value) => (value == null ? undefined : normalizeExpenseCategory(value)), z.enum(EXPENSE_CATEGORIES).optional()),
  expenseType: z.preprocess((value) => (value == null ? undefined : normalizeExpenseType(value)), z.enum(EXPENSE_TYPES).optional()),
  frequency: z.preprocess((value) => normalizeExpenseFrequency(value), z.enum(EXPENSE_FREQUENCIES).optional()),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type SyncExpensesInput = z.infer<typeof syncExpensesSchema>
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>
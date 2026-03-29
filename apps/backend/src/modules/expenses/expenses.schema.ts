// src/modules/expenses/expenses.schema.ts
// Nearly identical to sales schema.
// Key difference: category field for grouping in reports.

import { z } from 'zod'

// We define allowed categories as an enum rather than a free-text string.
// Why? Because if traders can type anything, you end up with
// "transport", "Transport", "TRANSPORT", "transort" (typo) —
// four different categories that mean the same thing.
// An enum enforces consistency at the validation layer.
export const EXPENSE_CATEGORIES = [
  'restock',
  'transport',
  'market_fees',
  'packaging',
  'equipment',
  'food',
  'other',
] as const

export const createExpenseSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(300).trim(),
  amount: z
    .number()
    .positive()
    .multipleOf(0.01),
  category: z.enum(EXPENSE_CATEGORIES),
  spentAt: z.string().datetime(),
})

export const syncExpensesSchema = z.object({
  expenses: z
    .array(createExpenseSchema)
    .min(1)
    .max(100),
})

export const listExpensesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type SyncExpensesInput = z.infer<typeof syncExpensesSchema>
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>
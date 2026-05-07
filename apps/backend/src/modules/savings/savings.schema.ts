import { z } from 'zod'

const SAVINGS_TARGET_PERIODS = ['DAILY', 'WEEKLY', 'MONTHLY'] as const

export const createSavingsEntrySchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  savedAt: z.string().datetime(),
  note: z.string().max(300).optional(),
})

export const listSavingsEntriesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(z.number().min(1).max(100)),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export const updateSavingsEntrySchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  savedAt: z.string().datetime(),
  note: z.string().max(300).optional(),
})

export const updateSavingsTargetSchema = z.object({
  amount: z.number().positive().multipleOf(0.01),
  period: z.enum(SAVINGS_TARGET_PERIODS),
})

export const updateSavingsAccountSchema = z.object({
  bankName: z.string().trim().min(2).max(80),
  bankCode: z.string().trim().min(2).max(20),
  accountNumber: z.string().trim().regex(/^\d{10,20}$/, 'Account number must be 10 to 20 digits'),
  accountName: z.string().trim().min(2).max(120),
})

export const resolveSavingsAccountSchema = z.object({
  bankCode: z.string().trim().min(2).max(20),
  accountNumber: z.string().trim().regex(/^\d{10,20}$/, 'Account number must be 10 to 20 digits'),
})

export const confirmSavingsVerificationSchema = z.object({
  reference: z.string().trim().min(6).max(120),
})

export type CreateSavingsEntryInput = z.infer<typeof createSavingsEntrySchema>
export type ListSavingsEntriesQuery = z.infer<typeof listSavingsEntriesQuerySchema>
export type UpdateSavingsEntryInput = z.infer<typeof updateSavingsEntrySchema>
export type UpdateSavingsTargetInput = z.infer<typeof updateSavingsTargetSchema>
export type UpdateSavingsAccountInput = z.infer<typeof updateSavingsAccountSchema>
export type ConfirmSavingsVerificationInput = z.infer<typeof confirmSavingsVerificationSchema>

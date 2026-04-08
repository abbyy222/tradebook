import { z } from 'zod'

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

export type CreateSavingsEntryInput = z.infer<typeof createSavingsEntrySchema>
export type ListSavingsEntriesQuery = z.infer<typeof listSavingsEntriesQuerySchema>
export type UpdateSavingsEntryInput = z.infer<typeof updateSavingsEntrySchema>

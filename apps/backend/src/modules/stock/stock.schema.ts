import { z } from 'zod'

export const createStockItemSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string().min(1).max(200).trim(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().positive().multipleOf(0.01),
  // Cost price is the accounting anchor for inventory value and future profit/loss.
  costPrice: z.number().nonnegative().multipleOf(0.01),
  lowStockThreshold: z.number().int().min(0).default(5),
})

export const adjustStockSchema = z.object({
  delta: z.number().int().refine(val => val !== 0, 'Delta cannot be zero'),
  reason: z.enum(['restock', 'sale_adjustment', 'damage', 'correction']),
})

export const updateStockItemSchema = z.object({
  itemName: z.string().min(1).max(200).trim().optional(),
  unitPrice: z.number().positive().multipleOf(0.01).optional(),
  costPrice: z.number().nonnegative().multipleOf(0.01).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
})

export const syncStockSchema = z.object({
  items: z.array(createStockItemSchema).min(1).max(100),
})

export const listStockQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(z.number().min(1).max(100)),
  lowStockOnly: z.string().optional().transform(val => val === 'true'),
  search: z.string().max(100).optional(),
})

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>
export type SyncStockInput = z.infer<typeof syncStockSchema>
export type ListStockQuery = z.infer<typeof listStockQuerySchema>
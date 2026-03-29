// src/modules/stock/stock.schema.ts

import { z } from 'zod'

export const createStockItemSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string().min(1).max(200).trim(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().positive().multipleOf(0.01),
  lowStockThreshold: z.number().int().min(0).default(5),
})

// For updating quantity — we accept a DELTA (change amount)
// not an absolute value. Why?
// Absolute: "set quantity to 8" — race condition risk
// Delta: "add 10 to quantity" — atomic, safe under concurrency
export const adjustStockSchema = z.object({
  delta: z
    .number()
    .int()
    .refine(val => val !== 0, 'Delta cannot be zero'),
  reason: z.enum(['restock', 'sale_adjustment', 'damage', 'correction']),
})

export const updateStockItemSchema = z.object({
  itemName: z.string().min(1).max(200).trim().optional(),
  unitPrice: z.number().positive().multipleOf(0.01).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
})

export const syncStockSchema = z.object({
  items: z.array(createStockItemSchema).min(1).max(100),
})

export const listStockQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  // Filter to only show low stock items — useful for restocking view
  lowStockOnly: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  search: z.string().max(100).optional(),
})

export type CreateStockItemInput = z.infer<typeof createStockItemSchema>
export type AdjustStockInput = z.infer<typeof adjustStockSchema>
export type UpdateStockItemInput = z.infer<typeof updateStockItemSchema>
export type SyncStockInput = z.infer<typeof syncStockSchema>
export type ListStockQuery = z.infer<typeof listStockQuerySchema>
import { z } from 'zod'

export const createStockItemSchema = z.object({
  id: z.string().uuid(),
  itemName: z.string().min(1).max(200).trim(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().positive().multipleOf(0.01),
  // Cost price is the accounting anchor for inventory value and future profit/loss.
  costPrice: z.number().nonnegative().multipleOf(0.01),
  wholesalePrice: z.number().positive().multipleOf(0.01).nullable().optional(),
  wholesaleMinQty: z.number().int().min(2).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).default(5),
}).superRefine((value, ctx) => {
  if (value.wholesalePrice != null && value.wholesaleMinQty == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesaleMinQty'],
      message: 'Wholesale minimum quantity is required when wholesale price is set',
    })
  }

  if (value.wholesaleMinQty != null && value.wholesalePrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesalePrice'],
      message: 'Wholesale price is required when wholesale minimum quantity is set',
    })
  }

  if (value.wholesalePrice != null && value.wholesalePrice > value.unitPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesalePrice'],
      message: 'Wholesale price should not be higher than the regular selling price',
    })
  }
})

export const adjustStockSchema = z.object({
  delta: z.number().int(),
  reason: z.enum(['restock', 'sale_adjustment', 'damage', 'correction']),
  unitPrice: z.number().positive().multipleOf(0.01).optional(),
  costPrice: z.number().nonnegative().multipleOf(0.01).optional(),
  wholesalePrice: z.number().positive().multipleOf(0.01).nullable().optional(),
  wholesaleMinQty: z.number().int().min(2).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
  const hasMetadataChange =
    value.unitPrice !== undefined ||
    value.costPrice !== undefined ||
    value.wholesalePrice !== undefined ||
    value.wholesaleMinQty !== undefined ||
    value.lowStockThreshold !== undefined

  if (value.delta === 0 && !hasMetadataChange) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['delta'],
      message: 'Add/remove quantity or change at least one stock detail',
    })
  }

  if (value.wholesalePrice != null && value.unitPrice != null && value.wholesalePrice > value.unitPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesalePrice'],
      message: 'Wholesale price should not be higher than the regular selling price',
    })
  }
})

export const updateStockItemSchema = z.object({
  itemName: z.string().min(1).max(200).trim().optional(),
  unitPrice: z.number().positive().multipleOf(0.01).optional(),
  costPrice: z.number().nonnegative().multipleOf(0.01).optional(),
  wholesalePrice: z.number().positive().multipleOf(0.01).nullable().optional(),
  wholesaleMinQty: z.number().int().min(2).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
  if (value.wholesalePrice != null && value.unitPrice != null && value.wholesalePrice > value.unitPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['wholesalePrice'],
      message: 'Wholesale price should not be higher than the regular selling price',
    })
  }
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

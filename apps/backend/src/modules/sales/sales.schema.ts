import { z } from 'zod'

export const createSaleSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
  itemName: z.string().min(1).max(200).trim(),
  stockItemId: z.string().uuid().optional(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z
    .number()
    .positive('Unit price must be greater than zero')
    .multipleOf(0.01, 'Unit price cannot have more than 2 decimal places'),
  amount: z
    .number()
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  pricingMode: z.enum(['RETAIL', 'WHOLESALE']).optional(),
  paymentType: z.enum(['CASH', 'TRANSFER', 'DEBT']),
  debtorId: z.string().uuid().optional(),
  soldAt: z.string().datetime('soldAt must be a valid ISO datetime'),
}).superRefine((value, ctx) => {
  const expectedAmount = Number((value.quantity * value.unitPrice).toFixed(2))
  if (Math.abs(value.amount - expectedAmount) > 0.009) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'Amount must equal quantity multiplied by unit price',
    })
  }
})

export const syncSalesSchema = z.object({
  sales: z
    .array(createSaleSchema)
    .min(1)
    .max(100, 'Cannot sync more than 100 sales at once'),
})

export const listSalesQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  paymentType: z.enum(['CASH', 'TRANSFER', 'DEBT']).optional(),
})

export const profitLossQuerySchema = z.object({
  period: z.enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SyncSalesInput = z.infer<typeof syncSalesSchema>
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>
export type ProfitLossQuery = z.infer<typeof profitLossQuerySchema>

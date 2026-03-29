// src/modules/sales/sales.schema.ts
// We define schemas for every operation separately.
// Why? Because what you need to CREATE a sale is different from
// what you need to QUERY sales. Separate schemas = explicit contracts.

import { z } from 'zod'

// --- Create / Sync schema ---
// Notice the id is required and comes from the CLIENT.
// This is the offline-first pattern — the phone generates
// the UUID before the server ever sees the record.
export const createSaleSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
  itemName: z.string().min(1).max(200).trim(),
  amount: z
    .number()
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
  paymentType: z.enum(['CASH', 'TRANSFER', 'DEBT']),
  debtorId: z.string().uuid().optional(),
  soldAt: z.string().datetime('soldAt must be a valid ISO datetime'),
})

// Bulk sync schema — the phone sends an ARRAY of pending sales at once.
// Instead of 50 HTTP requests for 50 offline sales, we do ONE request.
// This is called batching and it's critical for mobile performance.
export const syncSalesSchema = z.object({
  sales: z
    .array(createSaleSchema)
    .min(1)
    .max(100, 'Cannot sync more than 100 sales at once'),
})

// --- Query schema ---
// Validates and parses URL query parameters for the list endpoint.
// e.g. GET /api/v1/sales?cursor=2024-01-15T10:00:00Z&pageSize=20
export const listSalesQuerySchema = z.object({
  // cursor is the soldAt timestamp of the LAST item from the previous page
  cursor: z.string().datetime().optional(),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  // date range filters for reports
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  // filter by payment type
  paymentType: z.enum(['CASH', 'TRANSFER', 'DEBT']).optional(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
export type SyncSalesInput = z.infer<typeof syncSalesSchema>
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>
// src/modules/debtors/debtors.schema.ts

import { z } from 'zod'

export const createDebtorSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string().min(1).max(200).trim(),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
  totalOwed: z.number().nonnegative().multipleOf(0.01),
  dueDate: z.string().datetime().optional(),
})

export const recordPaymentSchema = z.object({
  amount: z
    .number()
    .positive('Payment amount must be greater than zero')
    .multipleOf(0.01),
  paidAt: z.string().datetime(),
  note: z.string().max(300).optional(),
})

export const updateDebtorScheduleSchema = z.object({
  dueDate: z.string().datetime().nullable(),
})

export const listDebtorsQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().min(1).max(100)),
  status: z.enum(['ACTIVE', 'PARTIAL', 'CLEARED']).optional(),
})

export type CreateDebtorInput = z.infer<typeof createDebtorSchema>
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>
export type UpdateDebtorScheduleInput = z.infer<typeof updateDebtorScheduleSchema>
export type ListDebtorsQuery = z.infer<typeof listDebtorsQuerySchema>

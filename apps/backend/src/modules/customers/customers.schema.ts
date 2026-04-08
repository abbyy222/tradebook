import { z } from 'zod'

export const createCustomerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).trim(),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  note: z.string().max(300).optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  note: z.string().max(300).optional(),
})

export const listCustomersQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(z.number().min(1).max(100)),
  search: z.string().max(120).optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>

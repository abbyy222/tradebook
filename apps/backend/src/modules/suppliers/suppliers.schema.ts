import { z } from 'zod'

export const createSupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).trim(),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  itemCategory: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
})

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  itemCategory: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
})

export const listSuppliersQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  pageSize: z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(z.number().min(1).max(100)),
  search: z.string().max(120).optional(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>

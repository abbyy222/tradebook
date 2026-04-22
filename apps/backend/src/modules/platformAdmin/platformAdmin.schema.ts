import { z } from 'zod'

export const platformAdminRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
})

export type PlatformAdminRangeQuery = z.infer<typeof platformAdminRangeQuerySchema>

export const platformBusinessActivityStatusSchema = z.enum(['ACTIVE', 'DORMANT', 'INACTIVE', 'NEW'])

export const platformAdminBusinessesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(12),
  search: z.string().trim().max(80).optional(),
  status: platformBusinessActivityStatusSchema.optional(),
  sort: z.enum(['activity', 'sales', 'newest']).default('activity'),
})

export type PlatformAdminBusinessesQuery = z.infer<typeof platformAdminBusinessesQuerySchema>

export const businessAccountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])

export const platformBusinessStatusUpdateSchema = z.object({
  accountStatus: businessAccountStatusSchema,
  reason: z.string().trim().min(3).max(240),
})

export const platformBusinessRepairSchema = z.object({
  reason: z.string().trim().min(3).max(240).default('Support-triggered sync repair'),
})

export const platformAdminBusinessActionLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  traderId: z.string().uuid().optional(),
})

export type BusinessAccountStatus = z.infer<typeof businessAccountStatusSchema>
export type PlatformBusinessStatusUpdateInput = z.infer<typeof platformBusinessStatusUpdateSchema>
export type PlatformBusinessRepairInput = z.infer<typeof platformBusinessRepairSchema>
export type PlatformAdminBusinessActionLogQuery = z.infer<typeof platformAdminBusinessActionLogQuerySchema>

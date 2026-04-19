import { z } from 'zod'

export const platformDevEventsQuerySchema = z.object({
  windowMinutes: z.coerce.number().int().min(1).max(24 * 60).default(60),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  endpoint: z.string().trim().max(120).optional(),
})

export type PlatformDevEventsQuery = z.infer<typeof platformDevEventsQuerySchema>

export const platformModuleSchema = z.enum([
  'SALES',
  'EXPENSES',
  'STOCK',
  'DEBTORS',
  'SAVINGS',
  'SUPPLIERS',
  'CUSTOMERS',
])

export const updateKillSwitchSchema = z.object({
  module: platformModuleSchema,
  enabled: z.boolean(),
})

export const deadLetterQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  module: platformModuleSchema.optional(),
  traderId: z.string().uuid().optional(),
})

export const tenantHeatmapQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
})

export const forceResyncSchema = z.object({
  traderId: z.string().uuid().optional(),
  modules: z.array(platformModuleSchema).min(1).max(7).default(['SALES', 'EXPENSES', 'STOCK']),
})

export type PlatformModuleKey = z.infer<typeof platformModuleSchema>
export type UpdateKillSwitchInput = z.infer<typeof updateKillSwitchSchema>
export type DeadLetterQuery = z.infer<typeof deadLetterQuerySchema>
export type TenantHeatmapQuery = z.infer<typeof tenantHeatmapQuerySchema>
export type ForceResyncInput = z.infer<typeof forceResyncSchema>

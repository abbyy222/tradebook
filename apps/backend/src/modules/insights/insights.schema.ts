import { z } from 'zod'

export const insightsRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(14),
})

export type InsightsRangeQuery = z.infer<typeof insightsRangeQuerySchema>


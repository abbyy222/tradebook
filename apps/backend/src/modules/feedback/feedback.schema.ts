import { z } from 'zod'

const FEEDBACK_CATEGORIES = [
  'App bug',
  'Sync issue',
  'Slow performance',
  'Payment/debtor issue',
  'Feature request',
  'Other',
] as const

const normalizeOptionalReporterName = (value: unknown) => {
  if (value == null) return undefined
  const trimmed = String(value).trim()
  return trimmed ? trimmed : undefined
}

const normalizePagePath = (value: unknown) => {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export const submitFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(8).max(4000),
  reporterName: z.preprocess(normalizeOptionalReporterName, z.string().min(2).max(120).optional()),
  pagePath: z.preprocess(normalizePagePath, z.string().min(1).max(240)),
})

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>

import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3010'),
  GATEWAY_TOKEN: z.string().min(12, 'GATEWAY_TOKEN is required'),
  GATEWAY_CALLBACK_URL: z.string().url('GATEWAY_CALLBACK_URL must be a valid URL'),
  GATEWAY_CALLBACK_SECRET: z.string().min(12, 'GATEWAY_CALLBACK_SECRET is required'),
  FLW_SECRET_KEY: z.string().min(1, 'FLW_SECRET_KEY is required'),
  FLW_WEBHOOK_SECRET: z.string().min(8, 'FLW_WEBHOOK_SECRET must be at least 8 characters'),
  FLW_BASE_URL: z.string().default('https://api.flutterwave.com'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid payout gateway environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

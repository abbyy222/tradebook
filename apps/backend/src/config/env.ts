// src/config/env.ts
// Senior principle: load and VALIDATE all env vars at startup.
// If DATABASE_URL is missing, the app crashes immediately with a clear message
// rather than failing silently 10 minutes later on first DB call.

import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  INTERNAL_JWT_SECRET: z.string().min(32, 'INTERNAL_JWT_SECRET must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  INTERNAL_JWT_EXPIRES_IN: z.string().default('12h'),
  PLATFORM_SEED_DEV_PHONE: z.string().regex(/^\+?[0-9]{10,15}$/, 'PLATFORM_SEED_DEV_PHONE is invalid').optional(),
  PLATFORM_SEED_DEV_PASSWORD: z.string().min(8, 'PLATFORM_SEED_DEV_PASSWORD must be at least 8 characters').optional(),
  PLATFORM_SEED_DEV_NAME: z.string().min(2, 'PLATFORM_SEED_DEV_NAME is required').optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  FRONTEND_URLS: z.string().optional(),
  BACKEND_PUBLIC_URL: z.string().optional(),
  BREVO_API_KEY: z.string().min(1, 'BREVO_API_KEY is required'),
  BREVO_SENDER_EMAIL: z.email('BREVO_SENDER_EMAIL must be a valid email address'),
  BREVO_SENDER_NAME: z.string().min(2, 'BREVO_SENDER_NAME is required'),
  FEEDBACK_ADMIN_EMAIL: z.email('FEEDBACK_ADMIN_EMAIL must be a valid email address'),
  FEEDBACK_DEV_EMAIL: z.email('FEEDBACK_DEV_EMAIL must be a valid email address'),
  SAVINGS_PAYOUT_PROVIDER: z.enum(['DIRECT', 'PROXY']).default('DIRECT'),
  SAVINGS_PAYOUT_SERVICE_URL: z.string().optional(),
  SAVINGS_PAYOUT_SERVICE_TOKEN: z.string().optional(),
  SAVINGS_PAYOUT_CALLBACK_SECRET: z.string().optional(),
  FLW_SECRET_KEY: z.string().min(1, 'FLW_SECRET_KEY is required').optional(),
  FLW_WEBHOOK_SECRET: z.string().min(8, 'FLW_WEBHOOK_SECRET must be at least 8 characters').optional(),
  FLW_BASE_URL: z.string().default('https://api.flutterwave.com'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1) // hard crash — don't run with bad config
}

export const env = {
  ...parsed.data,
  INTERNAL_JWT_SECRET: parsed.data.INTERNAL_JWT_SECRET ?? parsed.data.JWT_SECRET,
}

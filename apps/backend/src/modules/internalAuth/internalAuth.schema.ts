import { z } from 'zod'

export const internalLoginSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  portal: z.enum(['ADMIN', 'DEVELOPER']).default('ADMIN'),
})

export const createPlatformAdminSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  fullName: z.string().min(2).max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type InternalLoginInput = z.infer<typeof internalLoginSchema>
export type CreatePlatformAdminInput = z.infer<typeof createPlatformAdminSchema>


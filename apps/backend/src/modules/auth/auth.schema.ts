// src/modules/auth/auth.schema.ts
// Zod schemas validate and parse incoming data.
// If validation passes, the output is fully typed — no casting needed.
// This is the ONLY place we trust external input.

import { z } from 'zod'

export const registerSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  name: z.string().min(2).max(100),
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
  language: z.enum(['EN', 'PIDGIN', 'IGBO', 'YORUBA', 'HAUSA']).default('EN'),
  businessName: z.string().max(200).optional(),
})

export const loginSchema = z.object({
  phoneNumber: z.string(),
  pin: z.string().length(4),
})

export const createSalespersonSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  name: z.string().min(2).max(100),
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
  language: z.enum(['EN', 'PIDGIN', 'IGBO', 'YORUBA', 'HAUSA']).default('EN'),
})

export const updateSalespersonSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
  name: z.string().min(2).max(100),
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers')
    .optional(),
  language: z.enum(['EN', 'PIDGIN', 'IGBO', 'YORUBA', 'HAUSA']).default('EN'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateSalespersonInput = z.infer<typeof createSalespersonSchema>
export type UpdateSalespersonInput = z.infer<typeof updateSalespersonSchema>

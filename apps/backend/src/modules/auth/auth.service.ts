// src/modules/auth/auth.service.ts
// The service contains ALL business logic.
// It knows nothing about HTTP — no req, no res, no status codes.
// It speaks in domain terms: traders, PINs, tokens.
// This is the layer you'd unit test in isolation.

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../../middleware/errorHandler'
import { authRepository } from './auth.repository'
import { RegisterInput, LoginInput } from './auth.schema'

interface TraderDTO {
  id: string
  phoneNumber: string
  name: string
  businessName?: string
  language: string
  createdAt: string
}

interface AuthResponseDTO {
  token: string
  trader: TraderDTO
}

// bcrypt cost factor — 12 is the recommended production value.
// Higher = more secure but slower. 12 takes ~300ms which is
// slow enough to defeat brute force but fast enough for UX.
const SALT_ROUNDS = 12
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']

const toTraderDTO = (trader: any): TraderDTO => ({
  id: trader.id,
  phoneNumber: trader.phoneNumber,
  name: trader.name,
  businessName: trader.businessName ?? undefined,
  language: trader.language,
  createdAt: trader.createdAt.toISOString(),
})

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponseDTO> {
    // 1. Check if phone already registered
    const existing = await authRepository.findByPhone(input.phoneNumber)
    if (existing) {
      throw new AppError('Phone number already registered', 409, 'CONFLICT')
    }

    // 2. Hash the PIN — never store it plain
    const pinHash = await bcrypt.hash(input.pin, SALT_ROUNDS)

    // 3. Create the trader
    const trader = await authRepository.create({ ...input, pinHash })

    // 4. Generate JWT
    const token = jwt.sign(
      { traderId: trader.id, phoneNumber: trader.phoneNumber },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return { token, trader: toTraderDTO(trader) }
  },

  async login(input: LoginInput): Promise<AuthResponseDTO> {
    // 1. Find trader
    const trader = await authRepository.findByPhone(input.phoneNumber)

    // Security: same error for "not found" and "wrong PIN"
    // We never tell attackers which one it was
    if (!trader) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
    }

    // 2. Compare PIN against hash
    const pinValid = await bcrypt.compare(input.pin, trader.pinHash)
    if (!pinValid) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { traderId: trader.id, phoneNumber: trader.phoneNumber },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return { token, trader: toTraderDTO(trader) }
  },
}

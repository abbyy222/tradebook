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
import { RegisterInput, LoginInput, CreateSalespersonInput, UpdateSalespersonInput } from './auth.schema'
import { normalizePhoneNumber } from '../../utils/phone'
import { platformAdminRepository } from '../platformAdmin/platformAdmin.repository'

interface TraderDTO {
  id: string
  phoneNumber: string
  name: string
  businessName?: string
  role: 'OWNER' | 'SALESPERSON'
  language: string
  isActive: boolean
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
  role: trader.role,
  language: trader.language,
  isActive: trader.isActive,
  createdAt: trader.createdAt.toISOString(),
})

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponseDTO> {
    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber)

    // 1. Check if phone already registered
    const existing = await authRepository.findByPhone(normalizedPhoneNumber)
    if (existing) {
      throw new AppError('Phone number already registered', 409, 'CONFLICT')
    }

    // 2. Hash the PIN — never store it plain
    const pinHash = await bcrypt.hash(input.pin, SALT_ROUNDS)

    // 3. Create the trader
    const trader = await authRepository.create({ ...input, phoneNumber: normalizedPhoneNumber, pinHash })

    // 4. Generate JWT
    const token = jwt.sign(
      { traderId: trader.id, actorId: trader.id, role: trader.role, phoneNumber: trader.phoneNumber },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return { token, trader: toTraderDTO(trader) }
  },

  async createSalesperson(ownerTraderId: string, input: CreateSalespersonInput): Promise<TraderDTO> {
    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber)
    const existing = await authRepository.findByPhone(normalizedPhoneNumber)
    if (existing) {
      throw new AppError('Phone number already registered', 409, 'CONFLICT')
    }

    const owner = await authRepository.findById(ownerTraderId)
    if (!owner) {
      throw new AppError('Owner account not found', 404, 'NOT_FOUND')
    }

    if (owner.role !== 'OWNER') {
      throw new AppError('Only business owners can add salespeople', 403, 'FORBIDDEN')
    }

    const pinHash = await bcrypt.hash(input.pin, SALT_ROUNDS)
    const salesperson = await authRepository.createSalesperson(ownerTraderId, { ...input, phoneNumber: normalizedPhoneNumber, pinHash })

    return toTraderDTO(salesperson)
  },

  async listSalespeople(ownerTraderId: string): Promise<TraderDTO[]> {
    const owner = await authRepository.findById(ownerTraderId)
    if (!owner) {
      throw new AppError('Owner account not found', 404, 'NOT_FOUND')
    }

    if (owner.role !== 'OWNER') {
      throw new AppError('Only business owners can view team members', 403, 'FORBIDDEN')
    }

    const rows = await authRepository.listSalespeople(ownerTraderId)
    return rows.map(toTraderDTO)
  },

  async updateSalesperson(ownerTraderId: string, salespersonId: string, input: UpdateSalespersonInput): Promise<TraderDTO> {
    const owner = await authRepository.findById(ownerTraderId)
    if (!owner) {
      throw new AppError('Owner account not found', 404, 'NOT_FOUND')
    }

    if (owner.role !== 'OWNER') {
      throw new AppError('Only business owners can edit team members', 403, 'FORBIDDEN')
    }

    const salesperson = await authRepository.findSalespersonById(salespersonId, ownerTraderId)
    if (!salesperson) {
      throw new AppError('Salesperson not found', 404, 'NOT_FOUND')
    }

    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber)
    const existing = await authRepository.findByPhone(normalizedPhoneNumber)
    if (existing && existing.id !== salespersonId) {
      throw new AppError('Phone number already registered', 409, 'CONFLICT')
    }

    const pinHash = input.pin ? await bcrypt.hash(input.pin, SALT_ROUNDS) : undefined
    await authRepository.updateSalesperson(salespersonId, ownerTraderId, {
      ...input,
      phoneNumber: normalizedPhoneNumber,
      pinHash,
    })

    const updated = await authRepository.findSalespersonById(salespersonId, ownerTraderId)
    if (!updated) {
      throw new AppError('Salesperson not found', 404, 'NOT_FOUND')
    }

    return toTraderDTO(updated)
  },

  async deactivateSalesperson(ownerTraderId: string, salespersonId: string) {
    const owner = await authRepository.findById(ownerTraderId)
    if (!owner) {
      throw new AppError('Owner account not found', 404, 'NOT_FOUND')
    }

    if (owner.role !== 'OWNER') {
      throw new AppError('Only business owners can remove team members', 403, 'FORBIDDEN')
    }

    const salesperson = await authRepository.findSalespersonById(salespersonId, ownerTraderId)
    if (!salesperson) {
      throw new AppError('Salesperson not found', 404, 'NOT_FOUND')
    }

    await authRepository.setSalespersonActiveState(salespersonId, ownerTraderId, false)
    return { removed: true }
  },

  async login(input: LoginInput): Promise<AuthResponseDTO> {
    const normalizedPhoneNumber = normalizePhoneNumber(input.phoneNumber)
    // 1. Find trader
    const trader = await authRepository.findByPhone(normalizedPhoneNumber)

    // Security: same error for "not found" and "wrong PIN"
    // We never tell attackers which one it was
    if (!trader) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
    }

    if (!trader.isActive) {
      throw new AppError('This salesperson account has been removed from the team.', 403, 'ACCOUNT_INACTIVE')
    }

    // 2. Compare PIN against hash
    const pinValid = await bcrypt.compare(input.pin, trader.pinHash)
    if (!pinValid) {
      throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
    }

    const scopeTraderId = trader.ownerTraderId ?? trader.id
    const accountStatus = await platformAdminRepository.getBusinessAccountStatus(scopeTraderId)
    if (accountStatus === 'SUSPENDED') {
      throw new AppError('This business account is suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED')
    }

    // 3. Generate JWT
    const token = jwt.sign(
      {
        traderId: scopeTraderId,
        actorId: trader.id,
        role: trader.role,
        phoneNumber: trader.phoneNumber,
      },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    return { token, trader: toTraderDTO(trader) }
  },
}

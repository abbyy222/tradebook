import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { AppError } from '../../middleware/errorHandler'
import { CreatePlatformAdminInput, InternalLoginInput } from './internalAuth.schema'
import { internalAuthRepository } from './internalAuth.repository'

const SALT_ROUNDS = 12
const INTERNAL_JWT_EXPIRES_IN = env.INTERNAL_JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']

const toInternalUserDTO = (user: any) => ({
  id: user.id,
  phoneNumber: user.phoneNumber,
  fullName: user.fullName,
  role: user.role as 'PLATFORM_ADMIN' | 'PLATFORM_DEV',
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
})

export const internalAuthService = {
  async login(input: InternalLoginInput) {
    const user = await internalAuthRepository.findByPhone(input.phoneNumber)
    if (!user) throw new AppError('Invalid internal credentials', 401, 'UNAUTHORIZED')
    if (!user.isActive) throw new AppError('Account is deactivated', 403, 'FORBIDDEN')

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash)
    if (!passwordOk) throw new AppError('Invalid internal credentials', 401, 'UNAUTHORIZED')

    if (input.portal === 'ADMIN' && user.role !== 'PLATFORM_ADMIN') {
      throw new AppError('You are not allowed in Admin Portal', 403, 'FORBIDDEN')
    }
    if (input.portal === 'DEVELOPER' && user.role !== 'PLATFORM_DEV') {
      throw new AppError('You are not allowed in Developer Console', 403, 'FORBIDDEN')
    }

    const token = jwt.sign(
      { internalUserId: user.id, role: user.role, phoneNumber: user.phoneNumber },
      env.INTERNAL_JWT_SECRET,
      { expiresIn: INTERNAL_JWT_EXPIRES_IN }
    )

    return {
      token,
      user: toInternalUserDTO(user),
      portal: input.portal,
    }
  },

  async me(internalUserId: string) {
    const user = await internalAuthRepository.findById(internalUserId)
    if (!user) throw new AppError('Internal user not found', 404, 'NOT_FOUND')
    return toInternalUserDTO(user)
  },

  async createPlatformAdmin(creatorRole: 'PLATFORM_ADMIN' | 'PLATFORM_DEV', input: CreatePlatformAdminInput) {
    if (creatorRole !== 'PLATFORM_DEV') {
      throw new AppError('Only platform developers can add admins', 403, 'FORBIDDEN')
    }

    const existing = await internalAuthRepository.findByPhone(input.phoneNumber)
    if (existing) throw new AppError('Phone number already exists', 409, 'CONFLICT')

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS)
    const created = await internalAuthRepository.createPlatformAdmin({
      phoneNumber: input.phoneNumber,
      fullName: input.fullName,
      passwordHash,
    })

    return toInternalUserDTO(created)
  },

  async listPlatformAdmins() {
    const rows = await internalAuthRepository.listPlatformAdmins()
    return rows.map(toInternalUserDTO)
  },
}


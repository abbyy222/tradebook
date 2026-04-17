import bcrypt from 'bcryptjs'
import { prisma } from '../prisma/client'
import { env } from '../config/env'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 12

export const seedInternalDeveloper = async () => {
  // Cleanup legacy default seed record if it exists and does not match configured env phone.
  if (env.PLATFORM_SEED_DEV_PHONE !== '08000000000') {
    await prisma.$executeRawUnsafe(
      `DELETE FROM internal_users
       WHERE phone_number = '08000000000'
         AND role = 'PLATFORM_DEV'::"InternalRole"`
    )
  }

  const passwordHash = await bcrypt.hash(env.PLATFORM_SEED_DEV_PASSWORD, SALT_ROUNDS)
  const existing = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id FROM internal_users WHERE phone_number = $1 LIMIT 1`,
    env.PLATFORM_SEED_DEV_PHONE
  )

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE internal_users
       SET full_name = $2,
           password_hash = $3,
           role = 'PLATFORM_DEV'::"InternalRole",
           is_active = true,
           updated_at = NOW()
       WHERE phone_number = $1`,
      env.PLATFORM_SEED_DEV_PHONE,
      env.PLATFORM_SEED_DEV_NAME,
      passwordHash
    )
    logger.info({
      event: 'platform_dev_seed_updated',
      phoneNumber: env.PLATFORM_SEED_DEV_PHONE,
    })
    return
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO internal_users (id, phone_number, full_name, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'PLATFORM_DEV'::"InternalRole", true, NOW(), NOW())`,
    uuidv4(),
    env.PLATFORM_SEED_DEV_PHONE,
    env.PLATFORM_SEED_DEV_NAME,
    passwordHash
  )

  logger.info({
    event: 'platform_dev_seed_created',
    phoneNumber: env.PLATFORM_SEED_DEV_PHONE,
  })
}

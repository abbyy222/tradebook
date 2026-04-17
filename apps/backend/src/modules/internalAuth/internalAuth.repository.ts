import { prisma } from '../../prisma/client'
import { v4 as uuidv4 } from 'uuid'

type InternalUserRow = {
  id: string
  phoneNumber: string
  fullName: string
  passwordHash: string
  role: 'PLATFORM_ADMIN' | 'PLATFORM_DEV'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const mapRow = (row: any): InternalUserRow => ({
  id: row.id,
  phoneNumber: row.phone_number,
  fullName: row.full_name,
  passwordHash: row.password_hash,
  role: row.role,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export const internalAuthRepository = {
  async findByPhone(phoneNumber: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, phone_number, full_name, password_hash, role, is_active, created_at, updated_at
       FROM internal_users
       WHERE phone_number = $1
       LIMIT 1`,
      phoneNumber
    )
    return rows[0] ? mapRow(rows[0]) : null
  },

  async findById(id: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, phone_number, full_name, password_hash, role, is_active, created_at, updated_at
       FROM internal_users
       WHERE id = $1
       LIMIT 1`,
      id
    )
    return rows[0] ? mapRow(rows[0]) : null
  },

  async createPlatformAdmin(data: { phoneNumber: string; fullName: string; passwordHash: string }) {
    const id = uuidv4()
    await prisma.$executeRawUnsafe(
      `INSERT INTO internal_users (id, phone_number, full_name, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'PLATFORM_ADMIN'::"InternalRole", true, NOW(), NOW())`,
      id,
      data.phoneNumber,
      data.fullName,
      data.passwordHash
    )
    const created = await this.findById(id)
    return created!
  },

  async listPlatformAdmins() {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, phone_number, full_name, password_hash, role, is_active, created_at, updated_at
       FROM internal_users
       WHERE role = 'PLATFORM_ADMIN'::"InternalRole"
       ORDER BY created_at DESC`
    )
    return rows.map(mapRow)
  },
}

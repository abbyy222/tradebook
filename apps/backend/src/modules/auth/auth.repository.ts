
import { Prisma } from '@prisma/client'
import { CreateSalespersonInput, RegisterInput } from './auth.schema'
import { prisma } from '../../prisma/client'

export const authRepository = {
  async findByPhone(phoneNumber: string) {
    return prisma.trader.findUnique({
      where: { phoneNumber },
    })
  },

  async create(data: RegisterInput & { pinHash: string }) {
    return prisma.trader.create({
      data: {
        phoneNumber: data.phoneNumber,
        name: data.name,
        pinHash: data.pinHash,
        language: data.language,
        businessName: data.businessName,
        role: 'OWNER',
      },
    })
  },

  async findById(id: string) {
    return prisma.trader.findUnique({
      where: { id },
    })
  },

  async createSalesperson(ownerTraderId: string, data: CreateSalespersonInput & { pinHash: string }) {
    return prisma.trader.create({
      data: {
        phoneNumber: data.phoneNumber,
        name: data.name,
        pinHash: data.pinHash,
        language: data.language,
        role: 'SALESPERSON',
        ownerTraderId,
      },
    })
  },

  async listSalespeople(ownerTraderId: string) {
    return prisma.trader.findMany({
      where: {
        ownerTraderId,
        role: 'SALESPERSON',
      },
      orderBy: { createdAt: 'desc' },
    })
  },
}

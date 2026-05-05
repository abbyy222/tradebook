
import { Prisma } from '@prisma/client'
import { CreateSalespersonInput, RegisterInput, UpdateSalespersonInput } from './auth.schema'
import { prisma } from '../../prisma/client'
import { phoneLookupCandidates } from '../../utils/phone'

export const authRepository = {
  async findByPhone(phoneNumber: string) {
    const candidates = phoneLookupCandidates(phoneNumber)
    return prisma.trader.findFirst({
      where: { phoneNumber: { in: candidates } },
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

  async findSalespersonById(id: string, ownerTraderId: string) {
    return prisma.trader.findFirst({
      where: {
        id,
        ownerTraderId,
        role: 'SALESPERSON',
      },
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

  async updateSalesperson(id: string, ownerTraderId: string, data: UpdateSalespersonInput & { pinHash?: string }) {
    return prisma.trader.updateMany({
      where: {
        id,
        ownerTraderId,
        role: 'SALESPERSON',
      },
      data: {
        phoneNumber: data.phoneNumber,
        name: data.name,
        language: data.language,
        ...(data.pinHash ? { pinHash: data.pinHash } : {}),
      },
    })
  },

  async setSalespersonActiveState(id: string, ownerTraderId: string, isActive: boolean) {
    return prisma.trader.updateMany({
      where: {
        id,
        ownerTraderId,
        role: 'SALESPERSON',
      },
      data: { isActive },
    })
  },
}


import { Prisma} from '@prisma/client'
import { RegisterInput } from './auth.schema'
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
      },
    })
  },
}
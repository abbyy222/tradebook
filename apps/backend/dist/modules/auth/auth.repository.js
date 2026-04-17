"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const client_1 = require("../../prisma/client");
const phone_1 = require("../../utils/phone");
exports.authRepository = {
    async findByPhone(phoneNumber) {
        const candidates = (0, phone_1.phoneLookupCandidates)(phoneNumber);
        return client_1.prisma.trader.findFirst({
            where: { phoneNumber: { in: candidates } },
        });
    },
    async create(data) {
        return client_1.prisma.trader.create({
            data: {
                phoneNumber: data.phoneNumber,
                name: data.name,
                pinHash: data.pinHash,
                language: data.language,
                businessName: data.businessName,
                role: 'OWNER',
            },
        });
    },
    async findById(id) {
        return client_1.prisma.trader.findUnique({
            where: { id },
        });
    },
    async createSalesperson(ownerTraderId, data) {
        return client_1.prisma.trader.create({
            data: {
                phoneNumber: data.phoneNumber,
                name: data.name,
                pinHash: data.pinHash,
                language: data.language,
                role: 'SALESPERSON',
                ownerTraderId,
            },
        });
    },
    async listSalespeople(ownerTraderId) {
        return client_1.prisma.trader.findMany({
            where: {
                ownerTraderId,
                role: 'SALESPERSON',
            },
            orderBy: { createdAt: 'desc' },
        });
    },
};

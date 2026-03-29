"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const client_1 = require("../../prisma/client");
exports.authRepository = {
    async findByPhone(phoneNumber) {
        return client_1.prisma.trader.findUnique({
            where: { phoneNumber },
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
            },
        });
    },
};

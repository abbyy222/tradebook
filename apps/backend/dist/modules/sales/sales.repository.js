"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const getStartOfTodayInLagos = (now) => {
    const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
    lagosNow.setUTCHours(0, 0, 0, 0);
    return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
};
const getStartOfWeekInLagos = (now) => {
    const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
    const day = lagosNow.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    lagosNow.setUTCDate(lagosNow.getUTCDate() - offset);
    lagosNow.setUTCHours(0, 0, 0, 0);
    return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
};
const saleSelect = {
    id: true,
    itemName: true,
    stockItemId: true,
    quantity: true,
    unitPrice: true,
    amount: true,
    paymentType: true,
    debtorId: true,
    syncStatus: true,
    soldAt: true,
    createdAt: true,
};
exports.salesRepository = {
    async createWithInventoryEffects(traderId, data) {
        return client_2.prisma.$transaction(async (tx) => {
            if (data.stockItemId) {
                const stockUpdate = await tx.stockItem.updateMany({
                    where: {
                        id: data.stockItemId,
                        traderId,
                        quantity: { gte: data.quantity },
                    },
                    data: {
                        quantity: { decrement: data.quantity },
                        syncStatus: 'SYNCED',
                    },
                });
                if (stockUpdate.count === 0) {
                    const currentStock = await tx.stockItem.findFirst({
                        where: { id: data.stockItemId, traderId },
                        select: { quantity: true },
                    });
                    throw new Error(`INSUFFICIENT_STOCK:${currentStock?.quantity ?? 0}:${data.quantity}`);
                }
                const stockSnapshot = await tx.stockItem.findFirst({
                    where: { id: data.stockItemId, traderId },
                    select: {
                        id: true,
                        quantity: true,
                        unitPrice: true,
                        costPrice: true,
                        wholesalePrice: true,
                        wholesaleMinQty: true,
                    },
                });
                if (!stockSnapshot) {
                    throw new Error(`INSUFFICIENT_STOCK:0:${data.quantity}`);
                }
                await tx.stockMovement.create({
                    data: {
                        traderId,
                        stockItemId: stockSnapshot.id,
                        type: 'SALE',
                        quantityDelta: -data.quantity,
                        quantityAfter: stockSnapshot.quantity,
                        unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                        costPrice: stockSnapshot.costPrice,
                        wholesalePrice: stockSnapshot.wholesalePrice,
                        wholesaleMinQty: stockSnapshot.wholesaleMinQty,
                        note: `Sale recorded for ${data.itemName}`,
                        referenceId: data.id,
                        happenedAt: new Date(data.soldAt),
                    },
                });
            }
            const sale = await tx.sale.create({
                data: {
                    id: data.id,
                    traderId,
                    stockItemId: data.stockItemId ?? null,
                    itemName: data.itemName,
                    quantity: data.quantity,
                    unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                    amount: new client_1.Prisma.Decimal(data.amount),
                    paymentType: data.paymentType,
                    debtorId: data.debtorId ?? null,
                    syncStatus: 'SYNCED',
                    soldAt: new Date(data.soldAt),
                },
                select: saleSelect,
            });
            if (data.paymentType === 'DEBT' && data.debtorId) {
                const debtorUpdate = await tx.debtor.updateMany({
                    where: { id: data.debtorId, traderId },
                    data: {
                        totalOwed: { increment: new client_1.Prisma.Decimal(data.amount) },
                        status: 'ACTIVE',
                    },
                });
                if (debtorUpdate.count === 0) {
                    throw new Error('DEBTOR_NOT_FOUND');
                }
            }
            return sale;
        });
    },
    async create(traderId, data) {
        return client_2.prisma.sale.create({
            data: {
                id: data.id,
                traderId,
                stockItemId: data.stockItemId ?? null,
                itemName: data.itemName,
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                amount: new client_1.Prisma.Decimal(data.amount),
                paymentType: data.paymentType,
                debtorId: data.debtorId ?? null,
                syncStatus: 'SYNCED',
                soldAt: new Date(data.soldAt),
            },
            select: saleSelect,
        });
    },
    async upsert(traderId, data) {
        return client_2.prisma.sale.upsert({
            where: { id: data.id },
            create: {
                id: data.id,
                traderId,
                stockItemId: data.stockItemId ?? null,
                itemName: data.itemName,
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                amount: new client_1.Prisma.Decimal(data.amount),
                paymentType: data.paymentType,
                debtorId: data.debtorId ?? null,
                syncStatus: 'SYNCED',
                soldAt: new Date(data.soldAt),
            },
            update: {
                syncStatus: 'SYNCED',
            },
            select: saleSelect,
        });
    },
    async bulkUpsert(traderId, sales) {
        return client_2.prisma.$transaction(sales.map((sale) => client_2.prisma.sale.upsert({
            where: { id: sale.id },
            create: {
                id: sale.id,
                traderId,
                stockItemId: sale.stockItemId ?? null,
                itemName: sale.itemName,
                quantity: sale.quantity,
                unitPrice: new client_1.Prisma.Decimal(sale.unitPrice),
                amount: new client_1.Prisma.Decimal(sale.amount),
                paymentType: sale.paymentType,
                debtorId: sale.debtorId ?? null,
                syncStatus: 'SYNCED',
                soldAt: new Date(sale.soldAt),
            },
            update: { syncStatus: 'SYNCED' },
            select: saleSelect,
        })));
    },
    async findExistingIds(traderId, ids) {
        if (ids.length === 0)
            return new Set();
        const rows = await client_2.prisma.sale.findMany({
            where: { traderId, id: { in: ids } },
            select: { id: true },
        });
        return new Set(rows.map((row) => row.id));
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, from, to, paymentType } = query;
        const where = {
            traderId,
            ...(cursor ? { soldAt: { lt: new Date(cursor) } } : {}),
            ...(from || to
                ? {
                    soldAt: {
                        ...(cursor ? { lt: new Date(cursor) } : {}),
                        ...(from ? { gte: new Date(from) } : {}),
                        ...(to ? { lte: new Date(to) } : {}),
                    },
                }
                : {}),
            ...(paymentType ? { paymentType } : {}),
        };
        const rawSales = await client_2.prisma.sale.findMany({
            where,
            select: saleSelect,
            orderBy: { soldAt: 'desc' },
            take: pageSize + 1,
        });
        const hasNextPage = rawSales.length > pageSize;
        const sales = hasNextPage ? rawSales.slice(0, pageSize) : rawSales;
        const nextCursor = hasNextPage && sales.length > 0 ? sales[sales.length - 1].soldAt.toISOString() : null;
        return { sales, nextCursor, hasNextPage };
    },
    async getDashboardStats(traderId) {
        const now = new Date();
        const todayStart = getStartOfTodayInLagos(now);
        const weekStart = getStartOfWeekInLagos(now);
        const [todayStats, weekStats, totalStats] = await Promise.all([
            client_2.prisma.sale.aggregate({
                where: { traderId, soldAt: { gte: todayStart } },
                _sum: { amount: true },
                _count: { id: true },
            }),
            client_2.prisma.sale.aggregate({
                where: { traderId, soldAt: { gte: weekStart } },
                _sum: { amount: true },
                _count: { id: true },
            }),
            client_2.prisma.sale.aggregate({
                where: { traderId },
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);
        return {
            today: {
                total: todayStats._sum.amount ?? new client_1.Prisma.Decimal(0),
                count: todayStats._count.id,
            },
            thisWeek: {
                total: weekStats._sum.amount ?? new client_1.Prisma.Decimal(0),
                count: weekStats._count.id,
            },
            allTime: {
                total: totalStats._sum.amount ?? new client_1.Prisma.Decimal(0),
                count: totalStats._count.id,
            },
        };
    },
    async getTotalsForPeriod(traderId, from, to) {
        return client_2.prisma.sale.aggregate({
            where: {
                traderId,
                ...(from || to
                    ? {
                        soldAt: {
                            ...(from ? { gte: from } : {}),
                            ...(to ? { lte: to } : {}),
                        },
                    }
                    : {}),
            },
            _sum: { amount: true },
            _count: { id: true },
        });
    },
    async getPaymentBreakdownForPeriod(traderId, from, to) {
        return client_2.prisma.sale.groupBy({
            by: ['paymentType'],
            where: {
                traderId,
                soldAt: {
                    gte: from,
                    lte: to,
                },
            },
            _sum: { amount: true },
            _count: { id: true },
        });
    },
    async findById(id, traderId) {
        return client_2.prisma.sale.findFirst({
            where: { id, traderId },
            select: saleSelect,
        });
    },
    async delete(id, traderId) {
        return client_2.prisma.sale.deleteMany({ where: { id, traderId } });
    },
};

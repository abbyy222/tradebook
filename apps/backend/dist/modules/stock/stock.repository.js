"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const stockSelect = {
    id: true,
    itemName: true,
    quantity: true,
    unitPrice: true,
    costPrice: true,
    lowStockThreshold: true,
    syncStatus: true,
    updatedAt: true,
    createdAt: true,
};
exports.stockRepository = {
    async upsert(traderId, data) {
        return client_2.prisma.stockItem.upsert({
            where: {
                traderId_itemName: { traderId, itemName: data.itemName },
            },
            create: {
                id: data.id,
                traderId,
                itemName: data.itemName,
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                costPrice: new client_1.Prisma.Decimal(data.costPrice),
                lowStockThreshold: data.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            update: {
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                costPrice: new client_1.Prisma.Decimal(data.costPrice),
                lowStockThreshold: data.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            select: stockSelect,
        });
    },
    async bulkUpsert(traderId, items) {
        return client_2.prisma.$transaction(items.map(item => client_2.prisma.stockItem.upsert({
            where: {
                traderId_itemName: { traderId, itemName: item.itemName },
            },
            create: {
                id: item.id,
                traderId,
                itemName: item.itemName,
                quantity: item.quantity,
                unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                costPrice: new client_1.Prisma.Decimal(item.costPrice),
                lowStockThreshold: item.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            update: {
                quantity: item.quantity,
                unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                costPrice: new client_1.Prisma.Decimal(item.costPrice),
                lowStockThreshold: item.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            select: stockSelect,
        })));
    },
    async adjustQuantity(id, traderId, input) {
        const item = await client_2.prisma.stockItem.findFirst({
            where: { id, traderId },
            select: { id: true, quantity: true, lowStockThreshold: true },
        });
        if (!item)
            return null;
        if (input.delta < 0 && item.quantity + input.delta < 0) {
            throw new Error(`Insufficient stock. Current: ${item.quantity}, Requested: ${Math.abs(input.delta)}`);
        }
        return client_2.prisma.stockItem.update({
            where: { id },
            data: {
                quantity: { increment: input.delta },
                ...(input.unitPrice != null ? { unitPrice: new client_1.Prisma.Decimal(input.unitPrice) } : {}),
                ...(input.costPrice != null ? { costPrice: new client_1.Prisma.Decimal(input.costPrice) } : {}),
                ...(input.lowStockThreshold != null ? { lowStockThreshold: input.lowStockThreshold } : {}),
                syncStatus: 'SYNCED',
            },
            select: stockSelect,
        });
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, lowStockOnly, search } = query;
        const where = {
            traderId,
            ...(cursor && { updatedAt: { lt: new Date(cursor) } }),
            ...(lowStockOnly && {
                quantity: {
                    lte: client_2.prisma.stockItem.fields.lowStockThreshold,
                },
            }),
            ...(search && {
                itemName: { contains: search, mode: 'insensitive' },
            }),
        };
        const raw = await client_2.prisma.stockItem.findMany({
            where,
            select: stockSelect,
            orderBy: { updatedAt: 'desc' },
            take: pageSize + 1,
        });
        const hasNextPage = raw.length > pageSize;
        const items = hasNextPage ? raw.slice(0, pageSize) : raw;
        const nextCursor = hasNextPage && items.length > 0
            ? items[items.length - 1].updatedAt.toISOString()
            : null;
        return { items, nextCursor, hasNextPage };
    },
    async getLowStockItems(traderId) {
        return client_2.prisma.$queryRaw `
      SELECT id, item_name as "itemName", quantity, low_stock_threshold as "lowStockThreshold", unit_price as "unitPrice", cost_price as "costPrice"
      FROM stock_items
      WHERE trader_id = ${traderId}
        AND quantity <= low_stock_threshold
      ORDER BY quantity ASC
      LIMIT 20
    `;
    },
    async getInventorySummary(traderId) {
        const [summary] = await client_2.prisma.$queryRaw `
      SELECT
        COALESCE(SUM(quantity * cost_price), 0) as "inventoryValue",
        COALESCE(SUM(quantity * unit_price), 0) as "retailValue",
        COALESCE(SUM(quantity * (unit_price - cost_price)), 0) as "expectedMarginOnHand",
        COALESCE(SUM(quantity), 0) as "unitsOnHand"
      FROM stock_items
      WHERE trader_id = ${traderId}
    `;
        return {
            inventoryValue: Number(summary?.inventoryValue ?? 0),
            retailValue: Number(summary?.retailValue ?? 0),
            expectedMarginOnHand: Number(summary?.expectedMarginOnHand ?? 0),
            unitsOnHand: Number(summary?.unitsOnHand ?? 0),
        };
    },
    async findById(id, traderId) {
        return client_2.prisma.stockItem.findFirst({
            where: { id, traderId },
            select: stockSelect,
        });
    },
    async delete(id, traderId) {
        return client_2.prisma.stockItem.deleteMany({ where: { id, traderId } });
    },
};

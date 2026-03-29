"use strict";
// src/modules/stock/stock.repository.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const stockSelect = {
    id: true,
    itemName: true,
    quantity: true,
    unitPrice: true,
    lowStockThreshold: true,
    syncStatus: true,
    updatedAt: true,
    createdAt: true,
};
exports.stockRepository = {
    async upsert(traderId, data) {
        return client_2.prisma.stockItem.upsert({
            where: {
                // This uses the unique constraint we defined in the schema:
                // @@unique([traderId, itemName])
                // It means: for THIS trader, find the item with THIS name.
                // If it doesn't exist, create it. If it does, update it.
                traderId_itemName: {
                    traderId,
                    itemName: data.itemName,
                },
            },
            create: {
                id: data.id,
                traderId,
                itemName: data.itemName,
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
                lowStockThreshold: data.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            update: {
                quantity: data.quantity,
                unitPrice: new client_1.Prisma.Decimal(data.unitPrice),
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
                lowStockThreshold: item.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            update: {
                quantity: item.quantity,
                unitPrice: new client_1.Prisma.Decimal(item.unitPrice),
                lowStockThreshold: item.lowStockThreshold,
                syncStatus: 'SYNCED',
            },
            select: stockSelect,
        })));
    },
    // --- Atomic quantity adjustment ---
    // This is the concurrency-safe way to change stock levels.
    // Prisma's increment/decrement maps to SQL:
    //   UPDATE stock_items SET quantity = quantity + delta WHERE id = ?
    // The database executes this as a single atomic operation —
    // no race condition possible because we never read then write,
    // we only write a relative change.
    async adjustQuantity(id, traderId, delta) {
        // First verify the item belongs to this trader
        const item = await client_2.prisma.stockItem.findFirst({
            where: { id, traderId },
            select: { id: true, quantity: true, lowStockThreshold: true },
        });
        if (!item)
            return null;
        // Guard: prevent negative stock
        // If delta is negative (removing stock) and it would take
        // quantity below zero — reject it.
        // Example: quantity=3, delta=-5 would give quantity=-2.
        // That's physically impossible and would corrupt reports.
        if (delta < 0 && item.quantity + delta < 0) {
            throw new Error(`Insufficient stock. Current: ${item.quantity}, Requested: ${Math.abs(delta)}`);
        }
        const updated = await client_2.prisma.stockItem.update({
            where: { id },
            data: {
                // This is the atomic operation — increment by delta.
                // For negative deltas (selling/removing) this is effectively a decrement.
                quantity: { increment: delta },
                syncStatus: 'SYNCED',
            },
            select: stockSelect,
        });
        return updated;
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, lowStockOnly, search } = query;
        const where = {
            traderId,
            // Cursor here is the item's updatedAt timestamp
            ...(cursor && { updatedAt: { lt: new Date(cursor) } }),
            // Low stock filter: quantity <= lowStockThreshold
            // This is a computed condition — we compare two columns.
            // We use Prisma's raw filter for column-to-column comparison.
            ...(lowStockOnly && {
                quantity: {
                    lte: client_2.prisma.stockItem.fields.lowStockThreshold,
                },
            }),
            // Search by item name — case-insensitive contains
            // 'mode: insensitive' maps to ILIKE in PostgreSQL
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
    // --- Low stock alert fetch ---
    // Returns only items that need restocking.
    // Used by the dashboard alert banner.
    // We use Prisma's raw query here because comparing two columns
    // of the same table isn't cleanly supported in Prisma's typed API.
    async getLowStockItems(traderId) {
        return client_2.prisma.$queryRaw `
      SELECT id, item_name as "itemName", quantity, low_stock_threshold as "lowStockThreshold"
      FROM stock_items
      WHERE trader_id = ${traderId}
        AND quantity <= low_stock_threshold
      ORDER BY quantity ASC
      LIMIT 20
    `;
        // Raw SQL note: we use parameterised query (${traderId}) not
        // string interpolation. NEVER do: `WHERE trader_id = '${traderId}'`
        // That's a SQL injection vulnerability. Prisma's $queryRaw with
        // template literals is safe — it parameterises automatically.
    },
    async findById(id, traderId) {
        return client_2.prisma.stockItem.findFirst({
            where: { id, traderId },
            select: stockSelect,
        });
    },
    async delete(id, traderId) {
        return client_2.prisma.stockItem.deleteMany({
            where: { id, traderId },
        });
    },
};

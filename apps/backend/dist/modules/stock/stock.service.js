"use strict";
// src/modules/stock/stock.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockService = void 0;
const stock_repository_1 = require("./stock.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const toStockDTO = (item) => ({
    ...item,
    unitPrice: Number(item.unitPrice),
    // isLowStock is a COMPUTED field — we derive it from the data
    // rather than storing it separately. Storing computed state creates
    // synchronisation problems — the stored flag can get out of sync
    // with the actual values. Compute it fresh on every read instead.
    isLowStock: item.quantity <= item.lowStockThreshold,
    updatedAt: item.updatedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
});
exports.stockService = {
    async syncItem(traderId, input) {
        const item = await stock_repository_1.stockRepository.upsert(traderId, input);
        return toStockDTO(item);
    },
    async syncBatch(traderId, input) {
        logger_1.logger.info({
            event: 'bulk_sync_stock',
            traderId,
            count: input.items.length,
        });
        const synced = await stock_repository_1.stockRepository.bulkUpsert(traderId, input.items);
        return { synced: synced.length, items: synced.map(toStockDTO) };
    },
    // --- Adjust stock quantity ---
    // Business rules live here, not in the repository.
    // The repository just executes the atomic SQL update.
    // The service decides WHEN and WHETHER to allow it.
    async adjustStock(id, traderId, input) {
        try {
            const updated = await stock_repository_1.stockRepository.adjustQuantity(id, traderId, input.delta);
            if (!updated) {
                throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
            }
            // Log every stock adjustment with reason for audit trail.
            // In production you can use this to reconstruct inventory history
            // even if you don't have a dedicated stock_movements table yet.
            logger_1.logger.info({
                event: 'stock_adjusted',
                traderId,
                itemId: id,
                delta: input.delta,
                reason: input.reason,
                newQuantity: updated.quantity,
            });
            return toStockDTO(updated);
        }
        catch (err) {
            // The repository throws a plain Error for insufficient stock.
            // We catch it here and convert it to a proper AppError
            // with the right HTTP status code.
            if (err.message?.includes('Insufficient stock')) {
                throw new errorHandler_1.AppError(err.message, 400, 'INSUFFICIENT_STOCK');
            }
            throw err;
        }
    },
    async listStock(traderId, query) {
        const result = await stock_repository_1.stockRepository.findMany(traderId, query);
        return {
            data: result.items.map(toStockDTO),
            meta: {
                nextCursor: result.nextCursor,
                hasNextPage: result.hasNextPage,
                pageSize: query.pageSize,
            },
            error: null,
        };
    },
    // --- Low stock alerts ---
    // Returns items that need restocking.
    // The dashboard calls this on load and shows a warning banner
    // if any items are running low.
    async getLowStockAlerts(traderId) {
        const items = await stock_repository_1.stockRepository.getLowStockItems(traderId);
        return items.map(item => ({
            ...item,
            isLowStock: true, // by definition — these are all low stock
        }));
    },
    async getStockItem(id, traderId) {
        const item = await stock_repository_1.stockRepository.findById(id, traderId);
        if (!item)
            throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
        return toStockDTO(item);
    },
    async deleteStockItem(id, traderId) {
        const result = await stock_repository_1.stockRepository.delete(id, traderId);
        if (result.count === 0)
            throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
        return { deleted: true };
    },
};

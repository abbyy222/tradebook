"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockService = void 0;
const stock_repository_1 = require("./stock.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const toStockDTO = (item) => {
    const unitPrice = Number(item.unitPrice);
    const costPrice = Number(item.costPrice);
    const wholesalePrice = item.wholesalePrice == null ? null : Number(item.wholesalePrice);
    const stockValue = item.quantity * costPrice;
    const retailValue = item.quantity * unitPrice;
    return {
        ...item,
        unitPrice,
        costPrice,
        wholesalePrice,
        stockValue,
        retailValue,
        expectedGrossProfit: retailValue - stockValue,
        isLowStock: item.quantity <= item.lowStockThreshold,
        updatedAt: item.updatedAt.toISOString?.() ?? item.updatedAt,
        createdAt: item.createdAt?.toISOString?.() ?? item.createdAt,
    };
};
exports.stockService = {
    async syncItem(traderId, input) {
        const item = await stock_repository_1.stockRepository.upsert(traderId, input);
        return toStockDTO(item);
    },
    async syncBatch(traderId, input) {
        logger_1.logger.info({ event: 'bulk_sync_stock', traderId, count: input.items.length });
        const synced = await stock_repository_1.stockRepository.bulkUpsert(traderId, input.items);
        return { synced: synced.length, items: synced.map(toStockDTO) };
    },
    async adjustStock(id, traderId, input) {
        try {
            const updated = await stock_repository_1.stockRepository.adjustQuantity(id, traderId, input);
            if (!updated) {
                throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
            }
            logger_1.logger.info({
                event: 'stock_adjusted',
                traderId,
                itemId: id,
                delta: input.delta,
                reason: input.reason,
                newQuantity: updated.quantity,
                unitPrice: input.unitPrice,
                costPrice: input.costPrice,
                wholesalePrice: input.wholesalePrice,
                wholesaleMinQty: input.wholesaleMinQty,
                lowStockThreshold: input.lowStockThreshold,
            });
            return toStockDTO(updated);
        }
        catch (err) {
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
    async getLowStockAlerts(traderId) {
        const items = await stock_repository_1.stockRepository.getLowStockItems(traderId);
        return items.map(item => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            costPrice: Number(item.costPrice),
            wholesalePrice: item.wholesalePrice == null ? null : Number(item.wholesalePrice),
            stockValue: item.quantity * Number(item.costPrice),
            retailValue: item.quantity * Number(item.unitPrice),
            expectedGrossProfit: item.quantity * (Number(item.unitPrice) - Number(item.costPrice)),
            isLowStock: true,
        }));
    },
    async getStockItem(id, traderId) {
        const item = await stock_repository_1.stockRepository.findById(id, traderId);
        if (!item)
            throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
        return toStockDTO(item);
    },
    async getStockMovements(id, traderId) {
        const item = await stock_repository_1.stockRepository.findById(id, traderId);
        if (!item)
            throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
        const movements = await stock_repository_1.stockRepository.findMovements(id, traderId);
        return movements.map((movement) => ({
            id: movement.id,
            stockItemId: movement.stockItemId,
            itemName: movement.stockItem.itemName,
            type: movement.type,
            quantityDelta: movement.quantityDelta,
            quantityAfter: movement.quantityAfter,
            unitPrice: movement.unitPrice == null ? null : Number(movement.unitPrice),
            costPrice: movement.costPrice == null ? null : Number(movement.costPrice),
            wholesalePrice: movement.wholesalePrice == null ? null : Number(movement.wholesalePrice),
            wholesaleMinQty: movement.wholesaleMinQty,
            note: movement.note,
            referenceId: movement.referenceId,
            happenedAt: movement.happenedAt.toISOString(),
            createdAt: movement.createdAt.toISOString(),
        }));
    },
    async deleteStockItem(id, traderId) {
        const result = await stock_repository_1.stockRepository.delete(id, traderId);
        if (result.count === 0)
            throw new errorHandler_1.AppError('Stock item not found', 404, 'NOT_FOUND');
        return { deleted: true };
    },
};

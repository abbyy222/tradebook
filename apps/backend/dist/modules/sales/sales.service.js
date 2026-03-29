"use strict";
// src/modules/sales/sales.service.ts
// The service orchestrates the business rules.
// It speaks in business language, not HTTP language.
// Notice: no req, no res, no status codes anywhere in this file.
// It takes plain inputs, calls repositories, applies rules, returns data.
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesService = void 0;
const sales_repository_1 = require("./sales.repository");
const debtors_repository_1 = require("../debtors/debtors.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
// Helper: convert Prisma Decimal to plain number for the API response.
// We never expose Decimal objects to the client — they're not JSON-serialisable.
// We always convert to number at the service boundary (the DTO layer).
const toSaleDTO = (sale) => ({
    ...sale,
    amount: Number(sale.amount), // Decimal → number
    soldAt: sale.soldAt.toISOString(),
    createdAt: sale.createdAt.toISOString(),
});
exports.salesService = {
    // --- Single sale sync ---
    async syncSale(traderId, input) {
        // Business rule: if payment type is DEBT, a debtorId is required
        if (input.paymentType === 'DEBT' && !input.debtorId) {
            throw new errorHandler_1.AppError('A debtor must be specified for credit sales', 400, 'DEBTOR_REQUIRED');
        }
        // Business rule: if a debtorId is given, it must belong to THIS trader
        if (input.debtorId) {
            const debtor = await debtors_repository_1.debtorsRepository.findById(input.debtorId, traderId);
            if (!debtor) {
                throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
            }
            // If this is a debt sale, increase the debtor's total owed amount.
            // We do this in the service because it's a BUSINESS RULE —
            // "recording a credit sale increases what the customer owes."
            // The repository doesn't know or care about this rule.
            await debtors_repository_1.debtorsRepository.incrementOwed(input.debtorId, input.amount);
        }
        const sale = await sales_repository_1.salesRepository.upsert(traderId, input);
        return toSaleDTO(sale);
    },
    // --- Bulk sync (offline batch) ---
    // This is called when the phone reconnects and flushes queued sales.
    async syncBatch(traderId, input) {
        // Validate business rules for every sale in the batch BEFORE
        // writing anything to the DB. We don't want to write half a batch
        // and then fail on the other half — that leaves data in an
        // inconsistent state. Validate all, then write all.
        for (const sale of input.sales) {
            if (sale.paymentType === 'DEBT' && !sale.debtorId) {
                throw new errorHandler_1.AppError(`Sale ${sale.id}: credit sales require a debtor`, 400, 'VALIDATION_ERROR');
            }
        }
        // Log the batch size — useful for monitoring in production.
        // If you're seeing batches of 100 regularly, traders are going
        // offline for long periods and you might need to investigate.
        logger_1.logger.info({ event: 'bulk_sync', traderId, count: input.sales.length });
        const synced = await sales_repository_1.salesRepository.bulkUpsert(traderId, input.sales);
        return {
            synced: synced.length,
            sales: synced.map(toSaleDTO),
        };
    },
    // --- List with pagination ---
    async listSales(traderId, query) {
        const result = await sales_repository_1.salesRepository.findMany(traderId, query);
        return {
            data: result.sales.map(toSaleDTO),
            meta: {
                nextCursor: result.nextCursor,
                hasNextPage: result.hasNextPage,
                pageSize: query.pageSize,
            },
            error: null,
        };
    },
    // --- Dashboard stats ---
    async getDashboardStats(traderId) {
        const stats = await sales_repository_1.salesRepository.getDashboardStats(traderId);
        return {
            today: {
                total: Number(stats.today.total),
                count: stats.today.count,
            },
            thisWeek: {
                total: Number(stats.thisWeek.total),
                count: stats.thisWeek.count,
            },
            allTime: {
                total: Number(stats.allTime.total),
                count: stats.allTime.count,
            },
        };
    },
    // --- Get single sale ---
    async getSale(id, traderId) {
        const sale = await sales_repository_1.salesRepository.findById(id, traderId);
        if (!sale) {
            throw new errorHandler_1.AppError('Sale not found', 404, 'NOT_FOUND');
        }
        return toSaleDTO(sale);
    },
    // --- Delete ---
    async deleteSale(id, traderId) {
        const result = await sales_repository_1.salesRepository.delete(id, traderId);
        // deleteMany returns { count: number }
        if (result.count === 0) {
            throw new errorHandler_1.AppError('Sale not found', 404, 'NOT_FOUND');
        }
        return { deleted: true };
    },
};

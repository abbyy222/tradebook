"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesService = void 0;
const sales_repository_1 = require("./sales.repository");
const debtors_repository_1 = require("../debtors/debtors.repository");
const expenses_repository_1 = require("../expenses/expenses.repository");
const stock_repository_1 = require("../stock/stock.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const toSaleDTO = (sale) => ({
    ...sale,
    unitPrice: Number(sale.unitPrice),
    amount: Number(sale.amount),
    soldAt: sale.soldAt.toISOString(),
    createdAt: sale.createdAt.toISOString(),
});
const getPeriodStartInLagos = (period, now) => {
    const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
    switch (period) {
        case 'TODAY':
            lagosNow.setUTCHours(0, 0, 0, 0);
            return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
        case 'THIS_WEEK': {
            const day = lagosNow.getUTCDay();
            const offset = day === 0 ? 6 : day - 1;
            lagosNow.setUTCDate(lagosNow.getUTCDate() - offset);
            lagosNow.setUTCHours(0, 0, 0, 0);
            return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
        }
        case 'THIS_MONTH':
            lagosNow.setUTCDate(1);
            lagosNow.setUTCHours(0, 0, 0, 0);
            return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
        case 'THIS_YEAR':
            lagosNow.setUTCMonth(0, 1);
            lagosNow.setUTCHours(0, 0, 0, 0);
            return new Date(lagosNow.getTime() - LAGOS_OFFSET_MS);
        case 'ALL_TIME':
        default:
            return undefined;
    }
};
const assertSaleAmountMatches = (input) => {
    const expected = Number((input.quantity * input.unitPrice).toFixed(2));
    if (Math.abs(expected - input.amount) > 0.009) {
        throw new errorHandler_1.AppError('Sale amount does not match quantity multiplied by the selling price', 400, 'INVALID_SALE_AMOUNT');
    }
};
const normalizeSaleAgainstStock = async (traderId, input, existingSale) => {
    assertSaleAmountMatches(input);
    if (!input.stockItemId) {
        return input;
    }
    const stockItem = await stock_repository_1.stockRepository.findById(input.stockItemId, traderId);
    if (!stockItem) {
        throw new errorHandler_1.AppError('Selected stock item was not found', 400, 'STOCK_ITEM_NOT_FOUND');
    }
    const canonicalUnitPrice = Number(stockItem.unitPrice);
    if (Math.abs(canonicalUnitPrice - input.unitPrice) > 0.009) {
        throw new errorHandler_1.AppError('Use the current selling price saved on the stock item', 400, 'INVALID_SELLING_PRICE');
    }
    if (!existingSale && stockItem.quantity < input.quantity) {
        throw new errorHandler_1.AppError('Not enough stock. Available: ' + stockItem.quantity + ', requested: ' + input.quantity, 400, 'INSUFFICIENT_STOCK');
    }
    return {
        ...input,
        itemName: stockItem.itemName,
        unitPrice: canonicalUnitPrice,
        amount: Number((input.quantity * canonicalUnitPrice).toFixed(2)),
    };
};
exports.salesService = {
    async syncSale(traderId, input) {
        const existingSale = await sales_repository_1.salesRepository.findById(input.id, traderId);
        const normalizedInput = await normalizeSaleAgainstStock(traderId, input, existingSale);
        if (normalizedInput.paymentType === 'DEBT' && !normalizedInput.debtorId) {
            throw new errorHandler_1.AppError('A debtor must be specified for credit sales', 400, 'DEBTOR_REQUIRED');
        }
        if (normalizedInput.debtorId) {
            const debtor = await debtors_repository_1.debtorsRepository.findById(normalizedInput.debtorId, traderId);
            if (!debtor) {
                throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
            }
        }
        const sale = await sales_repository_1.salesRepository.upsert(traderId, normalizedInput);
        if (!existingSale && normalizedInput.stockItemId) {
            await stock_repository_1.stockRepository.adjustQuantity(normalizedInput.stockItemId, traderId, -normalizedInput.quantity);
        }
        if (!existingSale && normalizedInput.paymentType === 'DEBT' && normalizedInput.debtorId) {
            await debtors_repository_1.debtorsRepository.incrementOwed(normalizedInput.debtorId, normalizedInput.amount);
        }
        return toSaleDTO(sale);
    },
    async syncBatch(traderId, input) {
        logger_1.logger.info({ event: 'bulk_sync', traderId, count: input.sales.length });
        const sales = [];
        for (const sale of input.sales) {
            sales.push(await this.syncSale(traderId, sale));
        }
        return {
            synced: sales.length,
            sales,
        };
    },
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
    async getDashboardStats(traderId) {
        const stats = await sales_repository_1.salesRepository.getDashboardStats(traderId);
        return {
            today: { total: Number(stats.today.total), count: stats.today.count },
            thisWeek: { total: Number(stats.thisWeek.total), count: stats.thisWeek.count },
            allTime: { total: Number(stats.allTime.total), count: stats.allTime.count },
        };
    },
    async getProfitLossSummary(traderId, query) {
        const now = new Date();
        const from = getPeriodStartInLagos(query.period, now);
        const [salesTotals, expenseTotals, inventorySummary, receivablesSummary] = await Promise.all([
            sales_repository_1.salesRepository.getTotalsForPeriod(traderId, from, now),
            expenses_repository_1.expensesRepository.getTotalForPeriod(traderId, from, now),
            stock_repository_1.stockRepository.getInventorySummary(traderId),
            debtors_repository_1.debtorsRepository.getReceivablesSummary(traderId),
        ]);
        const revenue = Number(salesTotals._sum.amount ?? 0);
        const expenseTotal = Number(expenseTotals._sum.amount ?? 0);
        return {
            period: query.period,
            revenue,
            expenseTotal,
            operatingProfit: revenue - expenseTotal,
            inventoryValue: inventorySummary.inventoryValue,
            retailValue: inventorySummary.retailValue,
            expectedMarginOnHand: inventorySummary.expectedMarginOnHand,
            receivablesTotal: receivablesSummary.receivablesTotal,
            salesCount: salesTotals._count.id,
            expenseCount: expenseTotals._count.id,
            unitsOnHand: inventorySummary.unitsOnHand,
            activeDebtorsCount: receivablesSummary.activeDebtorsCount,
        };
    },
    async getSale(id, traderId) {
        const sale = await sales_repository_1.salesRepository.findById(id, traderId);
        if (!sale) {
            throw new errorHandler_1.AppError('Sale not found', 404, 'NOT_FOUND');
        }
        return toSaleDTO(sale);
    },
    async deleteSale(id, traderId) {
        const result = await sales_repository_1.salesRepository.delete(id, traderId);
        if (result.count === 0) {
            throw new errorHandler_1.AppError('Sale not found', 404, 'NOT_FOUND');
        }
        return { deleted: true };
    },
};

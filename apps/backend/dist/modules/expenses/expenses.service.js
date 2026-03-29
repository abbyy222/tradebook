"use strict";
// src/modules/expenses/expenses.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesService = void 0;
const expenses_repository_1 = require("./expenses.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const toExpenseDTO = (expense) => ({
    ...expense,
    amount: Number(expense.amount),
    spentAt: expense.spentAt.toISOString(),
    createdAt: expense.createdAt.toISOString(),
});
exports.expensesService = {
    async syncExpense(traderId, input) {
        const expense = await expenses_repository_1.expensesRepository.upsert(traderId, input);
        return toExpenseDTO(expense);
    },
    async syncBatch(traderId, input) {
        logger_1.logger.info({
            event: 'bulk_sync_expenses',
            traderId,
            count: input.expenses.length,
        });
        const synced = await expenses_repository_1.expensesRepository.bulkUpsert(traderId, input.expenses);
        return { synced: synced.length, expenses: synced.map(toExpenseDTO) };
    },
    async listExpenses(traderId, query) {
        const result = await expenses_repository_1.expensesRepository.findMany(traderId, query);
        return {
            data: result.expenses.map(toExpenseDTO),
            meta: {
                nextCursor: result.nextCursor,
                hasNextPage: result.hasNextPage,
                pageSize: query.pageSize,
            },
            error: null,
        };
    },
    // --- Category breakdown for insights ---
    // We also calculate the percentage each category represents
    // of total spending. The frontend can use this to draw a
    // simple bar chart without doing any maths itself.
    async getCategoryBreakdown(traderId, from, to) {
        const breakdown = await expenses_repository_1.expensesRepository.getCategoryBreakdown(traderId, from, to);
        const grandTotal = breakdown.reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0);
        return breakdown.map(row => ({
            category: row.category,
            total: Number(row._sum.amount ?? 0),
            count: row._count.id,
            // percentage rounded to 1 decimal place
            percentage: grandTotal > 0
                ? Math.round((Number(row._sum.amount ?? 0) / grandTotal) * 1000) / 10
                : 0,
        }));
    },
    async getExpense(id, traderId) {
        const expense = await expenses_repository_1.expensesRepository.findById(id, traderId);
        if (!expense)
            throw new errorHandler_1.AppError('Expense not found', 404, 'NOT_FOUND');
        return toExpenseDTO(expense);
    },
    async deleteExpense(id, traderId) {
        const result = await expenses_repository_1.expensesRepository.delete(id, traderId);
        if (result.count === 0)
            throw new errorHandler_1.AppError('Expense not found', 404, 'NOT_FOUND');
        return { deleted: true };
    },
};

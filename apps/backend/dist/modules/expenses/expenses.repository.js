"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const expenseSelect = {
    id: true,
    description: true,
    amount: true,
    category: true,
    expenseType: true,
    frequency: true,
    note: true,
    syncStatus: true,
    spentAt: true,
    startDate: true,
    endDate: true,
    nextDueDate: true,
    createdAt: true,
};
const toExpenseWriteInput = (traderId, data) => ({
    id: data.id,
    traderId,
    description: data.description,
    amount: new client_1.Prisma.Decimal(data.amount),
    category: data.category,
    expenseType: data.expenseType,
    frequency: data.expenseType === 'RECURRING' ? data.frequency ?? null : null,
    note: data.note?.trim() || null,
    syncStatus: 'SYNCED',
    spentAt: new Date(data.spentAt),
    startDate: data.startDate ? new Date(data.startDate) : null,
    endDate: data.endDate ? new Date(data.endDate) : null,
    nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
});
exports.expensesRepository = {
    async upsert(traderId, data) {
        return client_2.prisma.expense.upsert({
            where: { id: data.id },
            create: toExpenseWriteInput(traderId, data),
            update: {
                description: data.description,
                amount: new client_1.Prisma.Decimal(data.amount),
                category: data.category,
                expenseType: data.expenseType,
                frequency: data.expenseType === 'RECURRING' ? data.frequency ?? null : null,
                note: data.note?.trim() || null,
                syncStatus: 'SYNCED',
                spentAt: new Date(data.spentAt),
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
            },
            select: expenseSelect,
        });
    },
    async bulkUpsert(traderId, expenses) {
        return client_2.prisma.$transaction(expenses.map(expense => client_2.prisma.expense.upsert({
            where: { id: expense.id },
            create: toExpenseWriteInput(traderId, expense),
            update: {
                description: expense.description,
                amount: new client_1.Prisma.Decimal(expense.amount),
                category: expense.category,
                expenseType: expense.expenseType,
                frequency: expense.expenseType === 'RECURRING' ? expense.frequency ?? null : null,
                note: expense.note?.trim() || null,
                syncStatus: 'SYNCED',
                spentAt: new Date(expense.spentAt),
                startDate: expense.startDate ? new Date(expense.startDate) : null,
                endDate: expense.endDate ? new Date(expense.endDate) : null,
                nextDueDate: expense.nextDueDate ? new Date(expense.nextDueDate) : null,
            },
            select: expenseSelect,
        })));
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, from, to, category, expenseType, frequency } = query;
        const where = {
            traderId,
            ...(from || to || cursor
                ? {
                    spentAt: {
                        ...(cursor && { lt: new Date(cursor) }),
                        ...(from && { gte: new Date(from) }),
                        ...(to && { lte: new Date(to) }),
                    },
                }
                : {}),
            ...(category && { category }),
            ...(expenseType && { expenseType }),
            ...(frequency && { frequency }),
        };
        const raw = await client_2.prisma.expense.findMany({
            where,
            select: expenseSelect,
            orderBy: { spentAt: 'desc' },
            take: pageSize + 1,
        });
        const hasNextPage = raw.length > pageSize;
        const expenses = hasNextPage ? raw.slice(0, pageSize) : raw;
        const nextCursor = hasNextPage && expenses.length > 0
            ? expenses[expenses.length - 1].spentAt.toISOString()
            : null;
        return { expenses, nextCursor, hasNextPage };
    },
    async getCategoryBreakdown(traderId, from, to) {
        return client_2.prisma.expense.groupBy({
            by: ['category'],
            where: { traderId, spentAt: { gte: from, lte: to } },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: 'desc' } },
        });
    },
    async getTotalForPeriod(traderId, from, to) {
        return client_2.prisma.expense.aggregate({
            where: {
                traderId,
                ...(from || to
                    ? {
                        spentAt: {
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
    async findById(id, traderId) {
        return client_2.prisma.expense.findFirst({
            where: { id, traderId },
            select: expenseSelect,
        });
    },
    async delete(id, traderId) {
        return client_2.prisma.expense.deleteMany({ where: { id, traderId } });
    },
};

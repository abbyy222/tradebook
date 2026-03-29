"use strict";
// src/modules/expenses/expenses.repository.ts
// Identical structure to sales repository.
// The new addition is getCategoryBreakdown — an aggregate query
// that groups spending by category for the insights screen.
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const expenseSelect = {
    id: true,
    description: true,
    amount: true,
    category: true,
    syncStatus: true,
    spentAt: true,
    createdAt: true,
};
exports.expensesRepository = {
    async upsert(traderId, data) {
        return client_2.prisma.expense.upsert({
            where: { id: data.id },
            create: {
                id: data.id,
                traderId,
                description: data.description,
                amount: new client_1.Prisma.Decimal(data.amount),
                category: data.category,
                syncStatus: 'SYNCED',
                spentAt: new Date(data.spentAt),
            },
            update: { syncStatus: 'SYNCED' },
            select: expenseSelect,
        });
    },
    async bulkUpsert(traderId, expenses) {
        return client_2.prisma.$transaction(expenses.map(expense => client_2.prisma.expense.upsert({
            where: { id: expense.id },
            create: {
                id: expense.id,
                traderId,
                description: expense.description,
                amount: new client_1.Prisma.Decimal(expense.amount),
                category: expense.category,
                syncStatus: 'SYNCED',
                spentAt: new Date(expense.spentAt),
            },
            update: { syncStatus: 'SYNCED' },
            select: expenseSelect,
        })));
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, from, to, category } = query;
        const where = {
            traderId,
            ...(cursor && { spentAt: { lt: new Date(cursor) } }),
            ...(from || to
                ? {
                    spentAt: {
                        ...(cursor && { lt: new Date(cursor) }),
                        ...(from && { gte: new Date(from) }),
                        ...(to && { lte: new Date(to) }),
                    },
                }
                : {}),
            ...(category && { category }),
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
    // --- Category breakdown ---
    // This powers the "Where is my money going?" insights screen.
    // groupBy is a SQL GROUP BY under the hood — Postgres sums each
    // category in one pass through the data rather than fetching
    // all records and summing in JavaScript (which would be very slow).
    async getCategoryBreakdown(traderId, from, to) {
        return client_2.prisma.expense.groupBy({
            by: ['category'],
            where: {
                traderId,
                spentAt: { gte: from, lte: to },
            },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: 'desc' } }, // biggest spend category first
        });
    },
    // --- Total for period ---
    // Used by the dashboard to show total outgoings this week.
    async getTotalForPeriod(traderId, from, to) {
        return client_2.prisma.expense.aggregate({
            where: {
                traderId,
                spentAt: { gte: from, lte: to },
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
        return client_2.prisma.expense.deleteMany({
            where: { id, traderId },
        });
    },
};

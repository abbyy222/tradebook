"use strict";
// src/modules/debtors/debtors.repository.ts
// The most complex repository. Pay close attention to the
// recordPayment method — it uses a transaction to guarantee
// that the payment record and the balance update are atomic.
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtorsRepository = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("../../prisma/client");
const debtorSelect = {
    id: true,
    customerName: true,
    phoneNumber: true,
    totalOwed: true,
    totalPaid: true,
    status: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
};
const computeDebtorStatus = (totalOwed, totalPaid) => {
    if (totalPaid >= totalOwed - 0.01)
        return 'CLEARED';
    if (totalPaid > 0)
        return 'PARTIAL';
    return 'ACTIVE';
};
exports.debtorsRepository = {
    async upsert(traderId, data) {
        return client_2.prisma.debtor.upsert({
            where: { id: data.id },
            create: {
                id: data.id,
                traderId,
                customerName: data.customerName,
                phoneNumber: data.phoneNumber ?? null,
                totalOwed: new client_1.Prisma.Decimal(data.totalOwed),
                totalPaid: new client_1.Prisma.Decimal(0),
                status: 'ACTIVE',
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            },
            update: {
                customerName: data.customerName,
                phoneNumber: data.phoneNumber ?? null,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
            },
            select: debtorSelect,
        });
    },
    // --- incrementOwed ---
    // Called by the sales service when a DEBT sale is recorded.
    // Atomic increment — same concurrency-safe pattern as stock.
    async incrementOwed(debtorId, amount) {
        return client_2.prisma.debtor.update({
            where: { id: debtorId },
            data: {
                totalOwed: { increment: new client_1.Prisma.Decimal(amount) },
                status: 'ACTIVE',
            },
        });
    },
    // --- recordPayment ---
    // THE most important method in the debtors module.
    // This must be atomic — both operations succeed or both fail.
    //
    // What happens inside this transaction:
    // 1. Create a Payment record (the receipt/history entry)
    // 2. Update the Debtor's totalPaid (increase it by payment amount)
    // 3. Recalculate and update the Debtor's status:
    //    - If totalPaid >= totalOwed → CLEARED
    //    - If totalPaid > 0 but < totalOwed → PARTIAL
    //    - If totalPaid === 0 → ACTIVE
    //
    // If step 1 succeeds but step 2 crashes — transaction rolls back.
    // The Payment record is deleted. The debtor balance is unchanged.
    // The trader retries. Consistent state preserved.
    async recordPayment(debtorId, traderId, input) {
        // We use an interactive transaction — a callback where we can
        // run queries sequentially and use the result of one query
        // as input to the next, all within the same transaction.
        // If we throw at any point, everything rolls back.
        return client_2.prisma.$transaction(async (tx) => {
            // Step 1: Verify the debtor exists and belongs to this trader.
            // We do this INSIDE the transaction so the debtor can't be
            // deleted between our check and our update (TOCTOU race condition).
            const debtor = await tx.debtor.findFirst({
                where: { id: debtorId, traderId },
                select: {
                    id: true,
                    totalOwed: true,
                    totalPaid: true,
                    status: true,
                },
            });
            if (!debtor) {
                throw new Error('DEBTOR_NOT_FOUND');
            }
            // Step 2: Business rule — can't pay more than what's owed.
            const remaining = Number(debtor.totalOwed) - Number(debtor.totalPaid);
            if (input.amount > remaining + 0.01) {
                // +0.01 tolerance for floating point rounding in comparison
                throw new Error(`OVERPAYMENT:${remaining}`);
            }
            // Step 3: Create the payment record
            await tx.payment.create({
                data: {
                    debtorId,
                    amount: new client_1.Prisma.Decimal(input.amount),
                    paidAt: new Date(input.paidAt),
                    note: input.note ?? null,
                },
            });
            // Step 4: Calculate the new totalPaid
            const newTotalPaid = Number(debtor.totalPaid) + input.amount;
            const totalOwed = Number(debtor.totalOwed);
            // Step 5: Determine new status
            // We compute this with a small tolerance (0.01) to handle
            // floating point precision issues in comparisons
            const newStatus = newTotalPaid >= totalOwed - 0.01
                ? 'CLEARED'
                : newTotalPaid > 0
                    ? 'PARTIAL'
                    : 'ACTIVE';
            // Step 6: Update debtor balance and status
            const updatedDebtor = await tx.debtor.update({
                where: { id: debtorId },
                data: {
                    totalPaid: new client_1.Prisma.Decimal(newTotalPaid),
                    status: newStatus,
                },
                select: debtorSelect,
            });
            return updatedDebtor;
        });
    },
    async getReceivablesSummary(traderId) {
        const [summary] = await client_2.prisma.$queryRaw `
      SELECT
        COALESCE(SUM(total_owed - total_paid), 0) as "receivablesTotal",
        COUNT(*) as "activeDebtorsCount"
      FROM debtors
      WHERE trader_id = ${traderId}
        AND status IN ('ACTIVE', 'PARTIAL')
        AND (total_owed - total_paid) > 0
    `;
        return {
            receivablesTotal: Number(summary?.receivablesTotal ?? 0),
            activeDebtorsCount: Number(summary?.activeDebtorsCount ?? 0),
        };
    },
    async findMany(traderId, query) {
        const { cursor, pageSize, status } = query;
        const where = {
            traderId,
            ...(cursor && { createdAt: { lt: new Date(cursor) } }),
            ...(status && { status }),
        };
        const raw = await client_2.prisma.debtor.findMany({
            where,
            select: debtorSelect,
            orderBy: { createdAt: 'desc' },
            take: pageSize + 1,
        });
        const hasNextPage = raw.length > pageSize;
        const debtors = hasNextPage ? raw.slice(0, pageSize) : raw;
        const nextCursor = hasNextPage && debtors.length > 0
            ? debtors[debtors.length - 1].createdAt.toISOString()
            : null;
        return { debtors, nextCursor, hasNextPage };
    },
    // --- Payment history for a debtor ---
    // Returns all payments made against a debt in chronological order.
    async getPaymentHistory(debtorId, traderId) {
        // First verify the debtor belongs to this trader
        const debtor = await client_2.prisma.debtor.findFirst({
            where: { id: debtorId, traderId },
            select: { id: true },
        });
        if (!debtor)
            return null;
        return client_2.prisma.payment.findMany({
            where: { debtorId },
            orderBy: { paidAt: 'desc' },
            select: {
                id: true,
                amount: true,
                paidAt: true,
                note: true,
                createdAt: true,
            },
        });
    },
    async findById(id, traderId) {
        return client_2.prisma.debtor.findFirst({
            where: { id, traderId },
            select: debtorSelect,
        });
    },
    async delete(id, traderId) {
        return client_2.prisma.debtor.deleteMany({
            where: { id, traderId },
        });
    },
    async getStatement(debtorId, traderId) {
        let debtor = await client_2.prisma.debtor.findFirst({
            where: { id: debtorId, traderId },
            select: debtorSelect,
        });
        if (!debtor)
            return null;
        const paymentsAggregate = await client_2.prisma.payment.aggregate({
            where: { debtorId },
            _sum: { amount: true },
        });
        const storedTotalPaid = Number(debtor.totalPaid);
        const recomputedTotalPaid = Number(paymentsAggregate._sum.amount ?? 0);
        const needsReconciliation = Math.abs(storedTotalPaid - recomputedTotalPaid) > 0.01;
        if (needsReconciliation) {
            const totalOwed = Number(debtor.totalOwed);
            debtor = await client_2.prisma.debtor.update({
                where: { id: debtorId },
                data: {
                    totalPaid: new client_1.Prisma.Decimal(recomputedTotalPaid),
                    status: computeDebtorStatus(totalOwed, recomputedTotalPaid),
                },
                select: debtorSelect,
            });
        }
        const [sales, payments] = await Promise.all([
            client_2.prisma.sale.findMany({
                where: { traderId, debtorId },
                select: {
                    id: true,
                    itemName: true,
                    amount: true,
                    soldAt: true,
                },
                orderBy: { soldAt: 'asc' },
            }),
            client_2.prisma.payment.findMany({
                where: { debtorId },
                select: {
                    id: true,
                    amount: true,
                    note: true,
                    paidAt: true,
                },
                orderBy: { paidAt: 'asc' },
            }),
        ]);
        return { debtor, sales, payments, reconciled: needsReconciliation };
    },
    async updateSchedule(debtorId, traderId, input) {
        const updated = await client_2.prisma.debtor.updateMany({
            where: { id: debtorId, traderId },
            data: {
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
            },
        });
        if (updated.count === 0)
            return null;
        return client_2.prisma.debtor.findFirst({
            where: { id: debtorId, traderId },
            select: debtorSelect,
        });
    },
};

"use strict";
// src/modules/debtors/debtors.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtorsService = void 0;
const debtors_repository_1 = require("./debtors.repository");
const errorHandler_1 = require("../../middleware/errorHandler");
const logger_1 = require("../../utils/logger");
const toDebtorDTO = (debtor) => ({
    ...debtor,
    totalOwed: Number(debtor.totalOwed),
    totalPaid: Number(debtor.totalPaid),
    // balance is computed on the fly — always accurate,
    // never out of sync with totalOwed and totalPaid
    balance: Number(debtor.totalOwed) - Number(debtor.totalPaid),
    dueDate: debtor.dueDate?.toISOString() ?? null,
    createdAt: debtor.createdAt.toISOString(),
    updatedAt: debtor.updatedAt.toISOString(),
});
exports.debtorsService = {
    async createDebtor(traderId, input) {
        const debtor = await debtors_repository_1.debtorsRepository.upsert(traderId, input);
        return toDebtorDTO(debtor);
    },
    async recordPayment(debtorId, traderId, input) {
        try {
            const updatedDebtor = await debtors_repository_1.debtorsRepository.recordPayment(debtorId, traderId, input);
            // Log every payment for audit trail
            logger_1.logger.info({
                event: 'payment_recorded',
                traderId,
                debtorId,
                amount: input.amount,
                newStatus: updatedDebtor.status,
            });
            return toDebtorDTO(updatedDebtor);
        }
        catch (err) {
            // Parse the errors thrown inside the transaction
            // and convert them to proper AppErrors with HTTP codes
            if (err.message === 'DEBTOR_NOT_FOUND') {
                throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
            }
            if (err.message?.startsWith('OVERPAYMENT:')) {
                const remaining = err.message.split(':')[1];
                throw new errorHandler_1.AppError(`Payment exceeds remaining balance of ₦${Number(remaining).toLocaleString()}`, 400, 'OVERPAYMENT');
            }
            throw err;
        }
    },
    async listDebtors(traderId, query) {
        const result = await debtors_repository_1.debtorsRepository.findMany(traderId, query);
        return {
            data: result.debtors.map(toDebtorDTO),
            meta: {
                nextCursor: result.nextCursor,
                hasNextPage: result.hasNextPage,
                pageSize: query.pageSize,
            },
            error: null,
        };
    },
    async getPaymentHistory(debtorId, traderId) {
        const payments = await debtors_repository_1.debtorsRepository.getPaymentHistory(debtorId, traderId);
        if (!payments)
            throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
        return payments.map(p => ({
            ...p,
            amount: Number(p.amount),
            paidAt: p.paidAt.toISOString(),
            createdAt: p.createdAt.toISOString(),
        }));
    },
    async getStatement(debtorId, traderId) {
        const statement = await debtors_repository_1.debtorsRepository.getStatement(debtorId, traderId);
        if (!statement)
            throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
        const debtor = toDebtorDTO(statement.debtor);
        if (statement.reconciled) {
            logger_1.logger.warn({
                event: 'debtor_statement_reconciled',
                traderId,
                debtorId,
                message: 'Debtor totals were auto-reconciled from payment ledger while generating statement.',
            });
        }
        const timeline = [
            ...statement.sales.map((sale) => ({
                id: sale.id,
                type: 'SALE',
                amount: Number(sale.amount),
                date: sale.soldAt.toISOString(),
                reference: sale.itemName,
                note: 'Credit sale',
            })),
            ...statement.payments.map((payment) => ({
                id: payment.id,
                type: 'PAYMENT',
                amount: Number(payment.amount),
                date: payment.paidAt.toISOString(),
                note: payment.note ?? undefined,
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const totalSalesOnCredit = statement.sales.reduce((sum, sale) => sum + Number(sale.amount), 0);
        const totalPayments = statement.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
        // Support legacy/manual debtors that started with opening debt not tied to a sale row.
        // totalOwed can be greater than total credit-sale rows; that difference is opening balance.
        const openingBalance = Math.max(Number((debtor.totalOwed - totalSalesOnCredit).toFixed(2)), 0);
        let runningBalance = openingBalance;
        const entries = timeline.map((entry) => {
            if (entry.type === 'SALE')
                runningBalance += entry.amount;
            if (entry.type === 'PAYMENT')
                runningBalance -= entry.amount;
            return {
                ...entry,
                balanceAfter: Math.max(Number(runningBalance.toFixed(2)), 0),
            };
        });
        const statementBalance = entries.length > 0
            ? entries[entries.length - 1].balanceAfter
            : Math.max(Number((openingBalance + totalSalesOnCredit - totalPayments).toFixed(2)), 0);
        return {
            debtor,
            generatedAt: new Date().toISOString(),
            entries,
            totals: {
                totalSalesOnCredit,
                totalPayments,
                balance: statementBalance,
            },
        };
    },
    async getDebtor(id, traderId) {
        const debtor = await debtors_repository_1.debtorsRepository.findById(id, traderId);
        if (!debtor)
            throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
        return toDebtorDTO(debtor);
    },
    async updateDebtorSchedule(debtorId, traderId, input) {
        const updatedDebtor = await debtors_repository_1.debtorsRepository.updateSchedule(debtorId, traderId, input);
        if (!updatedDebtor)
            throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
        return toDebtorDTO(updatedDebtor);
    },
    async deleteDebtor(id, traderId) {
        const result = await debtors_repository_1.debtorsRepository.delete(id, traderId);
        if (result.count === 0)
            throw new errorHandler_1.AppError('Debtor not found', 404, 'NOT_FOUND');
        return { deleted: true };
    },
};

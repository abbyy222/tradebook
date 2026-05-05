"use strict";
// src/modules/debtors/debtors.schema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDebtorsQuerySchema = exports.updateDebtorScheduleSchema = exports.recordPaymentSchema = exports.createDebtorSchema = void 0;
const zod_1 = require("zod");
exports.createDebtorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    customerName: zod_1.z.string().min(1).max(200).trim(),
    phoneNumber: zod_1.z
        .string()
        .regex(/^\+?[0-9]{10,15}$/)
        .optional(),
    totalOwed: zod_1.z.number().nonnegative().multipleOf(0.01),
    dueDate: zod_1.z.string().datetime().optional(),
});
exports.recordPaymentSchema = zod_1.z.object({
    amount: zod_1.z
        .number()
        .positive('Payment amount must be greater than zero')
        .multipleOf(0.01),
    paidAt: zod_1.z.string().datetime(),
    note: zod_1.z.string().max(300).optional(),
});
exports.updateDebtorScheduleSchema = zod_1.z.object({
    dueDate: zod_1.z.string().datetime().nullable(),
});
exports.listDebtorsQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 20))
        .pipe(zod_1.z.number().min(1).max(100)),
    status: zod_1.z.enum(['ACTIVE', 'PARTIAL', 'CLEARED']).optional(),
});

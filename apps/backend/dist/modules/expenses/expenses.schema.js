"use strict";
// src/modules/expenses/expenses.schema.ts
// Nearly identical to sales schema.
// Key difference: category field for grouping in reports.
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpensesQuerySchema = exports.syncExpensesSchema = exports.createExpenseSchema = exports.EXPENSE_CATEGORIES = void 0;
const zod_1 = require("zod");
// We define allowed categories as an enum rather than a free-text string.
// Why? Because if traders can type anything, you end up with
// "transport", "Transport", "TRANSPORT", "transort" (typo) —
// four different categories that mean the same thing.
// An enum enforces consistency at the validation layer.
exports.EXPENSE_CATEGORIES = [
    'restock',
    'transport',
    'market_fees',
    'packaging',
    'equipment',
    'food',
    'other',
];
exports.createExpenseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(1).max(300).trim(),
    amount: zod_1.z
        .number()
        .positive()
        .multipleOf(0.01),
    category: zod_1.z.enum(exports.EXPENSE_CATEGORIES),
    spentAt: zod_1.z.string().datetime(),
});
exports.syncExpensesSchema = zod_1.z.object({
    expenses: zod_1.z
        .array(exports.createExpenseSchema)
        .min(1)
        .max(100),
});
exports.listExpensesQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().datetime().optional(),
    pageSize: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 20))
        .pipe(zod_1.z.number().min(1).max(100)),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    category: zod_1.z.enum(exports.EXPENSE_CATEGORIES).optional(),
});

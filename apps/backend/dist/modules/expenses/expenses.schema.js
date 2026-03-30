"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpensesQuerySchema = exports.syncExpensesSchema = exports.createExpenseSchema = exports.EXPENSE_FREQUENCIES = exports.EXPENSE_TYPES = exports.EXPENSE_CATEGORIES = void 0;
const zod_1 = require("zod");
exports.EXPENSE_CATEGORIES = [
    'RESTOCK',
    'TRANSPORT',
    'MARKET_FEES',
    'PACKAGING',
    'EQUIPMENT',
    'FOOD',
    'RENT',
    'ELECTRICITY',
    'WATER',
    'SALARY',
    'LEVY',
    'REPAIRS',
    'UTILITIES',
    'OTHER',
];
exports.EXPENSE_TYPES = ['ONE_TIME', 'RECURRING'];
exports.EXPENSE_FREQUENCIES = ['DAILY', 'MONTHLY', 'YEARLY'];
const normalizeExpenseCategory = (value) => {
    const normalized = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '_');
    switch (normalized) {
        case 'TRANSPORT':
            return 'TRANSPORT';
        case 'SUPPLIES':
        case 'RESTOCK':
            return 'RESTOCK';
        case 'MARKET_FEES':
            return 'MARKET_FEES';
        case 'PACKAGING':
            return 'PACKAGING';
        case 'EQUIPMENT':
            return 'EQUIPMENT';
        case 'FOOD':
            return 'FOOD';
        case 'RENT':
            return 'RENT';
        case 'ELECTRICITY':
            return 'ELECTRICITY';
        case 'WATER':
            return 'WATER';
        case 'SALARY':
        case 'STAFF':
            return 'SALARY';
        case 'LEVY':
            return 'LEVY';
        case 'REPAIRS':
            return 'REPAIRS';
        case 'UTILITIES':
            return 'UTILITIES';
        default:
            return 'OTHER';
    }
};
const normalizeExpenseType = (value) => {
    const normalized = String(value ?? '').trim().toUpperCase();
    return normalized === 'RECURRING' ? 'RECURRING' : 'ONE_TIME';
};
const normalizeExpenseFrequency = (value) => {
    if (value == null || value === '')
        return undefined;
    const normalized = String(value).trim().toUpperCase();
    return ['DAILY', 'MONTHLY', 'YEARLY'].includes(normalized) ? normalized : undefined;
};
const normalizeDateTime = (value) => {
    if (value == null || value === '')
        return undefined;
    if (value instanceof Date)
        return value.toISOString();
    const raw = String(value).trim();
    if (!raw)
        return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(`${raw}T12:00:00.000Z`).toISOString();
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
};
const baseExpenseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(1).max(300).trim(),
    amount: zod_1.z.number().positive(),
    // The backend accepts both the new enum values and legacy lowercase aliases.
    // That makes sync resilient when older offline rows come back after a schema upgrade.
    category: zod_1.z.preprocess(normalizeExpenseCategory, zod_1.z.enum(exports.EXPENSE_CATEGORIES)),
    expenseType: zod_1.z.preprocess(normalizeExpenseType, zod_1.z.enum(exports.EXPENSE_TYPES)).default('ONE_TIME'),
    frequency: zod_1.z.preprocess(normalizeExpenseFrequency, zod_1.z.enum(exports.EXPENSE_FREQUENCIES).optional()),
    note: zod_1.z.string().trim().max(500).optional(),
    spentAt: zod_1.z.preprocess(normalizeDateTime, zod_1.z.string().datetime()),
    startDate: zod_1.z.preprocess(normalizeDateTime, zod_1.z.string().datetime().optional()),
    endDate: zod_1.z.preprocess(normalizeDateTime, zod_1.z.string().datetime().optional()),
    nextDueDate: zod_1.z.preprocess(normalizeDateTime, zod_1.z.string().datetime().optional()),
});
exports.createExpenseSchema = baseExpenseSchema.superRefine((value, ctx) => {
    if (value.expenseType === 'RECURRING' && !value.frequency) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['frequency'],
            message: 'Recurring expenses require a frequency',
        });
    }
    if (value.expenseType === 'ONE_TIME' && value.frequency) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['frequency'],
            message: 'One-time expenses must not include a frequency',
        });
    }
    if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'End date cannot be before start date',
        });
    }
});
exports.syncExpensesSchema = zod_1.z.object({
    expenses: zod_1.z.array(exports.createExpenseSchema).min(1).max(100),
});
exports.listExpensesQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().datetime().optional(),
    pageSize: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(zod_1.z.number().min(1).max(100)),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    category: zod_1.z.preprocess((value) => (value == null ? undefined : normalizeExpenseCategory(value)), zod_1.z.enum(exports.EXPENSE_CATEGORIES).optional()),
    expenseType: zod_1.z.preprocess((value) => (value == null ? undefined : normalizeExpenseType(value)), zod_1.z.enum(exports.EXPENSE_TYPES).optional()),
    frequency: zod_1.z.preprocess((value) => normalizeExpenseFrequency(value), zod_1.z.enum(exports.EXPENSE_FREQUENCIES).optional()),
});

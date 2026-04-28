"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profitLossQuerySchema = exports.listSalesQuerySchema = exports.syncSalesSchema = exports.createSaleSchema = void 0;
const zod_1 = require("zod");
exports.createSaleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('ID must be a valid UUID'),
    itemName: zod_1.z.string().min(1).max(200).trim(),
    stockItemId: zod_1.z.string().uuid().optional(),
    quantity: zod_1.z.number().int().positive('Quantity must be at least 1'),
    unitPrice: zod_1.z
        .number()
        .positive('Unit price must be greater than zero')
        .multipleOf(0.01, 'Unit price cannot have more than 2 decimal places'),
    amount: zod_1.z
        .number()
        .positive('Amount must be greater than zero')
        .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
    pricingMode: zod_1.z.enum(['RETAIL', 'WHOLESALE']).optional(),
    paymentType: zod_1.z.enum(['CASH', 'TRANSFER', 'DEBT']),
    debtorId: zod_1.z.string().uuid().optional(),
    soldAt: zod_1.z.string().datetime('soldAt must be a valid ISO datetime'),
}).superRefine((value, ctx) => {
    const expectedAmount = Number((value.quantity * value.unitPrice).toFixed(2));
    if (Math.abs(value.amount - expectedAmount) > 0.009) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['amount'],
            message: 'Amount must equal quantity multiplied by unit price',
        });
    }
});
exports.syncSalesSchema = zod_1.z.object({
    sales: zod_1.z
        .array(exports.createSaleSchema)
        .min(1)
        .max(100, 'Cannot sync more than 100 sales at once'),
});
exports.listSalesQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().datetime().optional(),
    pageSize: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 20))
        .pipe(zod_1.z.number().min(1).max(100)),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    paymentType: zod_1.z.enum(['CASH', 'TRANSFER', 'DEBT']).optional(),
});
exports.profitLossQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL_TIME']).optional().default('THIS_MONTH'),
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStockQuerySchema = exports.syncStockSchema = exports.updateStockItemSchema = exports.adjustStockSchema = exports.createStockItemSchema = void 0;
const zod_1 = require("zod");
exports.createStockItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    itemName: zod_1.z.string().min(1).max(200).trim(),
    quantity: zod_1.z.number().int().min(0),
    unitPrice: zod_1.z.number().positive().multipleOf(0.01),
    // Cost price is the accounting anchor for inventory value and future profit/loss.
    costPrice: zod_1.z.number().nonnegative().multipleOf(0.01),
    wholesalePrice: zod_1.z.number().positive().multipleOf(0.01).nullable().optional(),
    wholesaleMinQty: zod_1.z.number().int().min(2).nullable().optional(),
    lowStockThreshold: zod_1.z.number().int().min(0).default(5),
}).superRefine((value, ctx) => {
    if (value.wholesalePrice != null && value.wholesaleMinQty == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['wholesaleMinQty'],
            message: 'Wholesale minimum quantity is required when wholesale price is set',
        });
    }
    if (value.wholesaleMinQty != null && value.wholesalePrice == null) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['wholesalePrice'],
            message: 'Wholesale price is required when wholesale minimum quantity is set',
        });
    }
    if (value.wholesalePrice != null && value.wholesalePrice > value.unitPrice) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['wholesalePrice'],
            message: 'Wholesale price should not be higher than the regular selling price',
        });
    }
});
exports.adjustStockSchema = zod_1.z.object({
    delta: zod_1.z.number().int(),
    reason: zod_1.z.enum(['restock', 'sale_adjustment', 'damage', 'correction']),
    unitPrice: zod_1.z.number().positive().multipleOf(0.01).optional(),
    costPrice: zod_1.z.number().nonnegative().multipleOf(0.01).optional(),
    wholesalePrice: zod_1.z.number().positive().multipleOf(0.01).nullable().optional(),
    wholesaleMinQty: zod_1.z.number().int().min(2).nullable().optional(),
    lowStockThreshold: zod_1.z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
    const hasMetadataChange = value.unitPrice !== undefined ||
        value.costPrice !== undefined ||
        value.wholesalePrice !== undefined ||
        value.wholesaleMinQty !== undefined ||
        value.lowStockThreshold !== undefined;
    if (value.delta === 0 && !hasMetadataChange) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['delta'],
            message: 'Add/remove quantity or change at least one stock detail',
        });
    }
    if (value.wholesalePrice != null && value.unitPrice != null && value.wholesalePrice > value.unitPrice) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['wholesalePrice'],
            message: 'Wholesale price should not be higher than the regular selling price',
        });
    }
});
exports.updateStockItemSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(200).trim().optional(),
    unitPrice: zod_1.z.number().positive().multipleOf(0.01).optional(),
    costPrice: zod_1.z.number().nonnegative().multipleOf(0.01).optional(),
    wholesalePrice: zod_1.z.number().positive().multipleOf(0.01).nullable().optional(),
    wholesaleMinQty: zod_1.z.number().int().min(2).nullable().optional(),
    lowStockThreshold: zod_1.z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
    if (value.wholesalePrice != null && value.unitPrice != null && value.wholesalePrice > value.unitPrice) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['wholesalePrice'],
            message: 'Wholesale price should not be higher than the regular selling price',
        });
    }
});
exports.syncStockSchema = zod_1.z.object({
    items: zod_1.z.array(exports.createStockItemSchema).min(1).max(100),
});
exports.listStockQuerySchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    pageSize: zod_1.z.string().optional().transform(val => (val ? parseInt(val, 10) : 20)).pipe(zod_1.z.number().min(1).max(100)),
    lowStockOnly: zod_1.z.string().optional().transform(val => val === 'true'),
    search: zod_1.z.string().max(100).optional(),
});

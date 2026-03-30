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
    lowStockThreshold: zod_1.z.number().int().min(0).default(5),
});
exports.adjustStockSchema = zod_1.z.object({
    delta: zod_1.z.number().int().refine(val => val !== 0, 'Delta cannot be zero'),
    reason: zod_1.z.enum(['restock', 'sale_adjustment', 'damage', 'correction']),
});
exports.updateStockItemSchema = zod_1.z.object({
    itemName: zod_1.z.string().min(1).max(200).trim().optional(),
    unitPrice: zod_1.z.number().positive().multipleOf(0.01).optional(),
    costPrice: zod_1.z.number().nonnegative().multipleOf(0.01).optional(),
    lowStockThreshold: zod_1.z.number().int().min(0).optional(),
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

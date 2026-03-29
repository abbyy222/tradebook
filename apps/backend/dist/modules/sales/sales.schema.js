"use strict";
// src/modules/sales/sales.schema.ts
// We define schemas for every operation separately.
// Why? Because what you need to CREATE a sale is different from
// what you need to QUERY sales. Separate schemas = explicit contracts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSalesQuerySchema = exports.syncSalesSchema = exports.createSaleSchema = void 0;
const zod_1 = require("zod");
// --- Create / Sync schema ---
// Notice the id is required and comes from the CLIENT.
// This is the offline-first pattern — the phone generates
// the UUID before the server ever sees the record.
exports.createSaleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('ID must be a valid UUID'),
    itemName: zod_1.z.string().min(1).max(200).trim(),
    amount: zod_1.z
        .number()
        .positive('Amount must be greater than zero')
        .multipleOf(0.01, 'Amount cannot have more than 2 decimal places'),
    paymentType: zod_1.z.enum(['CASH', 'TRANSFER', 'DEBT']),
    debtorId: zod_1.z.string().uuid().optional(),
    soldAt: zod_1.z.string().datetime('soldAt must be a valid ISO datetime'),
});
// Bulk sync schema — the phone sends an ARRAY of pending sales at once.
// Instead of 50 HTTP requests for 50 offline sales, we do ONE request.
// This is called batching and it's critical for mobile performance.
exports.syncSalesSchema = zod_1.z.object({
    sales: zod_1.z
        .array(exports.createSaleSchema)
        .min(1)
        .max(100, 'Cannot sync more than 100 sales at once'),
});
// --- Query schema ---
// Validates and parses URL query parameters for the list endpoint.
// e.g. GET /api/v1/sales?cursor=2024-01-15T10:00:00Z&pageSize=20
exports.listSalesQuerySchema = zod_1.z.object({
    // cursor is the soldAt timestamp of the LAST item from the previous page
    cursor: zod_1.z.string().datetime().optional(),
    pageSize: zod_1.z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 20))
        .pipe(zod_1.z.number().min(1).max(100)),
    // date range filters for reports
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    // filter by payment type
    paymentType: zod_1.z.enum(['CASH', 'TRANSFER', 'DEBT']).optional(),
});

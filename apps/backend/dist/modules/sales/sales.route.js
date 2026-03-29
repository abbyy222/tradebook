"use strict";
// src/modules/sales/sales.routes.ts
// Deliberately thin. Validate → authenticate → call service → respond.
// Notice every route is wrapped in try/catch with next(err).
// Errors always flow to the global error handler — never handled inline.
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const sales_schema_1 = require("./sales.schema");
const sales_service_1 = require("./sales.service");
exports.salesRouter = (0, express_1.Router)();
// All sales routes require authentication — apply middleware to all
exports.salesRouter.use(authenticate_1.authenticate);
// POST /api/v1/sales/sync
// Single sale sync (online mode — sale recorded while connected)
exports.salesRouter.post('/sync', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const input = sales_schema_1.createSaleSchema.parse(req.body);
        const sale = await sales_service_1.salesService.syncSale(traderId, input);
        res.status(201).json({ data: sale, error: null });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/sales/sync/batch
// Bulk sync (offline mode — phone reconnects and flushes queue)
exports.salesRouter.post('/sync/batch', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const input = sales_schema_1.syncSalesSchema.parse(req.body);
        const result = await sales_service_1.salesService.syncBatch(traderId, input);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/sales
// Paginated list — cursor-based, filtered, sorted
exports.salesRouter.get('/', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        // Query params come as strings — Zod transforms them to the right types
        const query = sales_schema_1.listSalesQuerySchema.parse(req.query);
        const result = await sales_service_1.salesService.listSales(traderId, query);
        res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/sales/dashboard
// Dashboard stats — today's total, week's total, all time
exports.salesRouter.get('/dashboard', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const stats = await sales_service_1.salesService.getDashboardStats(traderId);
        res.status(200).json({ data: stats, error: null });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/sales/:id
// Single sale detail
exports.salesRouter.get('/:id', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const sale = await sales_service_1.salesService.getSale(saleId, traderId);
        res.status(200).json({ data: sale, error: null });
    }
    catch (err) {
        next(err);
    }
});
// DELETE /api/v1/sales/:id
exports.salesRouter.delete('/:id', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const saleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await sales_service_1.salesService.deleteSale(saleId, traderId);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});

"use strict";
// src/modules/stock/stock.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const authorizeRole_1 = require("../../middleware/authorizeRole");
const stock_schema_1 = require("./stock.schema");
const stock_service_1 = require("./stock.service");
const enforceModuleWritable_1 = require("../../middleware/enforceModuleWritable");
exports.stockRouter = (0, express_1.Router)();
exports.stockRouter.use(authenticate_1.authenticate);
exports.stockRouter.post('/sync', (0, authorizeRole_1.authorizeRole)('OWNER'), (0, enforceModuleWritable_1.enforceModuleWritable)('STOCK'), async (req, res, next) => {
    try {
        const input = stock_schema_1.createStockItemSchema.parse(req.body);
        const item = await stock_service_1.stockService.syncItem(req.trader.traderId, input);
        res.status(201).json({ data: item, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.stockRouter.post('/sync/batch', (0, authorizeRole_1.authorizeRole)('OWNER'), (0, enforceModuleWritable_1.enforceModuleWritable)('STOCK'), async (req, res, next) => {
    try {
        const input = stock_schema_1.syncStockSchema.parse(req.body);
        const result = await stock_service_1.stockService.syncBatch(req.trader.traderId, input);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.stockRouter.get('/', async (req, res, next) => {
    try {
        const query = stock_schema_1.listStockQuerySchema.parse(req.query);
        const result = await stock_service_1.stockService.listStock(req.trader.traderId, query);
        res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/stock/alerts — low stock items only
exports.stockRouter.get('/alerts', async (req, res, next) => {
    try {
        const alerts = await stock_service_1.stockService.getLowStockAlerts(req.trader.traderId);
        res.status(200).json({ data: alerts, error: null });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/v1/stock/:id/adjust — atomic quantity change
exports.stockRouter.patch('/:id/adjust', (0, authorizeRole_1.authorizeRole)('OWNER'), (0, enforceModuleWritable_1.enforceModuleWritable)('STOCK'), async (req, res, next) => {
    try {
        const input = stock_schema_1.adjustStockSchema.parse(req.body);
        const stockId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await stock_service_1.stockService.adjustStock(stockId, req.trader.traderId, input);
        res.status(200).json({ data: item, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.stockRouter.get('/:id', async (req, res, next) => {
    try {
        const stockId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await stock_service_1.stockService.getStockItem(stockId, req.trader.traderId);
        res.status(200).json({ data: item, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.stockRouter.get('/:id/movements', async (req, res, next) => {
    try {
        const stockId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const movements = await stock_service_1.stockService.getStockMovements(stockId, req.trader.traderId);
        res.status(200).json({ data: movements, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.stockRouter.delete('/:id', (0, authorizeRole_1.authorizeRole)('OWNER'), async (req, res, next) => {
    try {
        const stockId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await stock_service_1.stockService.deleteStockItem(stockId, req.trader.traderId);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});

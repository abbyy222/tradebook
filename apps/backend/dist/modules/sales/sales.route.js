"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const sales_schema_1 = require("./sales.schema");
const sales_service_1 = require("./sales.service");
const enforceModuleWritable_1 = require("../../middleware/enforceModuleWritable");
exports.salesRouter = (0, express_1.Router)();
exports.salesRouter.use(authenticate_1.authenticate);
exports.salesRouter.post('/sync', (0, enforceModuleWritable_1.enforceModuleWritable)('SALES'), async (req, res, next) => {
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
exports.salesRouter.post('/sync/batch', (0, enforceModuleWritable_1.enforceModuleWritable)('SALES'), async (req, res, next) => {
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
exports.salesRouter.get('/', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const query = sales_schema_1.listSalesQuerySchema.parse(req.query);
        const result = await sales_service_1.salesService.listSales(traderId, query);
        res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
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
exports.salesRouter.get('/profit-loss', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const query = sales_schema_1.profitLossQuerySchema.parse(req.query);
        const snapshot = await sales_service_1.salesService.getProfitLossSummary(traderId, query);
        res.status(200).json({ data: snapshot, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.salesRouter.get('/day-close', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const summary = await sales_service_1.salesService.getDayCloseSummary(traderId);
        res.status(200).json({ data: summary, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.salesRouter.post('/day-close/close', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const actorId = req.trader.actorId;
        const role = req.trader.role;
        const input = sales_schema_1.closeDaySchema.parse(req.body);
        const summary = await sales_service_1.salesService.closeBusinessDay(traderId, actorId, role, input);
        res.status(200).json({ data: summary, error: null });
    }
    catch (err) {
        next(err);
    }
});
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

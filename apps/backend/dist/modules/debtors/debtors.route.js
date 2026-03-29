"use strict";
// src/modules/debtors/debtors.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.debtorsRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const debtors_schema_1 = require("./debtors.schema");
const debtors_service_1 = require("./debtors.service");
exports.debtorsRouter = (0, express_1.Router)();
exports.debtorsRouter.use(authenticate_1.authenticate);
exports.debtorsRouter.post('/', async (req, res, next) => {
    try {
        const input = debtors_schema_1.createDebtorSchema.parse(req.body);
        const debtor = await debtors_service_1.debtorsService.createDebtor(req.trader.traderId, input);
        res.status(201).json({ data: debtor, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.debtorsRouter.get('/', async (req, res, next) => {
    try {
        const query = debtors_schema_1.listDebtorsQuerySchema.parse(req.query);
        const result = await debtors_service_1.debtorsService.listDebtors(req.trader.traderId, query);
        res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
exports.debtorsRouter.get('/:id', async (req, res, next) => {
    try {
        const debtorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const debtor = await debtors_service_1.debtorsService.getDebtor(debtorId, req.trader.traderId);
        res.status(200).json({ data: debtor, error: null });
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/debtors/:id/payments — full payment history
exports.debtorsRouter.get('/:id/payments', async (req, res, next) => {
    try {
        const debtorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const payments = await debtors_service_1.debtorsService.getPaymentHistory(debtorId, req.trader.traderId);
        res.status(200).json({ data: payments, error: null });
    }
    catch (err) {
        next(err);
    }
});
// POST /api/v1/debtors/:id/payments — record a payment
exports.debtorsRouter.post('/:id/payments', async (req, res, next) => {
    try {
        const input = debtors_schema_1.recordPaymentSchema.parse(req.body);
        const debtorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const debtor = await debtors_service_1.debtorsService.recordPayment(debtorId, req.trader.traderId, input);
        res.status(200).json({ data: debtor, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.debtorsRouter.delete('/:id', async (req, res, next) => {
    try {
        const debtorId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await debtors_service_1.debtorsService.deleteDebtor(debtorId, req.trader.traderId);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});

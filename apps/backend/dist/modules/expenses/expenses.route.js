"use strict";
// src/modules/expenses/expenses.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.expensesRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const expenses_schema_1 = require("./expenses.schema");
const expenses_service_1 = require("./expenses.service");
const zod_1 = require("zod");
exports.expensesRouter = (0, express_1.Router)();
exports.expensesRouter.use(authenticate_1.authenticate);
exports.expensesRouter.post('/sync', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const input = expenses_schema_1.createExpenseSchema.parse(req.body);
        const expense = await expenses_service_1.expensesService.syncExpense(traderId, input);
        res.status(201).json({ data: expense, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.expensesRouter.post('/sync/batch', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const input = expenses_schema_1.syncExpensesSchema.parse(req.body);
        const result = await expenses_service_1.expensesService.syncBatch(traderId, input);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.expensesRouter.get('/', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        const query = expenses_schema_1.listExpensesQuerySchema.parse(req.query);
        const result = await expenses_service_1.expensesService.listExpenses(traderId, query);
        res.status(200).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/v1/expenses/insights?from=...&to=...
// Returns spending broken down by category for the insights screen.
exports.expensesRouter.get('/insights', async (req, res, next) => {
    try {
        const traderId = req.trader.traderId;
        // Parse and validate the date range query params
        const { from, to } = zod_1.z
            .object({
            from: zod_1.z.string().datetime(),
            to: zod_1.z.string().datetime(),
        })
            .parse(req.query);
        const breakdown = await expenses_service_1.expensesService.getCategoryBreakdown(traderId, new Date(from), new Date(to));
        res.status(200).json({ data: breakdown, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.expensesRouter.get('/:id', async (req, res, next) => {
    try {
        const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const expense = await expenses_service_1.expensesService.getExpense(expenseId, req.trader.traderId);
        res.status(200).json({ data: expense, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.expensesRouter.delete('/:id', async (req, res, next) => {
    try {
        const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await expenses_service_1.expensesService.deleteExpense(expenseId, req.trader.traderId);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});

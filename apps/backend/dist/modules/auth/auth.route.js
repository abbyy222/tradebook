"use strict";
// src/modules/auth/auth.routes.ts
// The route handler is deliberately thin.
// Validate → call service → send response. That's it.
// No business logic here. No database calls here.
// It just translates HTTP into service calls and back.
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
const authenticate_1 = require("../../middleware/authenticate");
const authorizeRole_1 = require("../../middleware/authorizeRole");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', async (req, res, next) => {
    try {
        // parse() throws a ZodError if validation fails
        // The global error handler catches it and returns a 400
        const input = auth_schema_1.registerSchema.parse(req.body);
        const result = await auth_service_1.authService.register(input);
        res.status(201).json({ data: result, error: null });
    }
    catch (err) {
        next(err); // always pass errors to next() — never handle in route
    }
});
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        const input = auth_schema_1.loginSchema.parse(req.body);
        const result = await auth_service_1.authService.login(input);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.post('/salespeople', authenticate_1.authenticate, (0, authorizeRole_1.authorizeRole)('OWNER'), async (req, res, next) => {
    try {
        const input = auth_schema_1.createSalespersonSchema.parse(req.body);
        const result = await auth_service_1.authService.createSalesperson(req.trader.traderId, input);
        res.status(201).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.get('/salespeople', authenticate_1.authenticate, (0, authorizeRole_1.authorizeRole)('OWNER'), async (req, res, next) => {
    try {
        const result = await auth_service_1.authService.listSalespeople(req.trader.traderId);
        res.status(200).json({ data: result, error: null });
    }
    catch (err) {
        next(err);
    }
});
exports.authRouter.post('/logout', authenticate_1.authenticate, async (_req, res) => {
    // JWT is stateless in current architecture, so logout is handled client-side
    // by dropping token/session. This endpoint exists for explicit API semantics.
    res.status(200).json({ data: { success: true }, error: null });
});

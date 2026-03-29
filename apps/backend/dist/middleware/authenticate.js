"use strict";
// src/middleware/authenticate.ts
// Verifies the JWT on protected routes.
// Route handlers that use this middleware can trust that
// req.trader is always populated — no need to check again inside.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errorHandler_1 = require("./errorHandler");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        throw new errorHandler_1.AppError('No token provided', 401, 'UNAUTHORIZED');
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.trader = payload; // attach to request for downstream handlers
        next();
    }
    catch {
        throw new errorHandler_1.AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }
};
exports.authenticate = authenticate;

"use strict";
// src/middleware/errorHandler.ts
// ONE place where all errors land. Route handlers never send error
// responses themselves - they just throw, and this catches everything.
// This is the global error boundary for the entire API.
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof zod_1.ZodError) {
        logger_1.logger.warn({
            requestId: req.requestId,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            path: req.originalUrl,
            details: err.flatten().fieldErrors,
            issues: err.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code,
            })),
            body: req.body,
        });
        return res.status(400).json({
            data: null,
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: err.flatten().fieldErrors,
            },
        });
    }
    if (err instanceof AppError) {
        logger_1.logger.warn({ requestId: req.requestId, error: err.message, code: err.code });
        return res.status(err.statusCode).json({
            data: null,
            error: { message: err.message, code: err.code },
        });
    }
    logger_1.logger.error({
        requestId: req.requestId,
        error: err.message,
        stack: err.stack,
    });
    return res.status(500).json({
        data: null,
        error: {
            message: 'Something went wrong',
            code: 'INTERNAL_ERROR',
        },
    });
};
exports.errorHandler = errorHandler;

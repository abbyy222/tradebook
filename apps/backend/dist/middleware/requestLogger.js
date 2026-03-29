"use strict";
// src/middleware/requestLogger.ts
// Attaches a unique requestId to every request.
// When something goes wrong in production, you can search logs
// by requestId and see the exact journey of that one bad request.
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const requestLogger = (req, res, next) => {
    const requestId = (0, uuid_1.v4)();
    const start = Date.now();
    // Attach to request so route handlers can log with the same ID
    req.requestId = requestId;
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger_1.logger.info({
            requestId,
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
        });
    });
    next();
};
exports.requestLogger = requestLogger;

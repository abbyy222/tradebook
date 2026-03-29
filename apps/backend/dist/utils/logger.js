"use strict";
// src/utils/logger.ts
// We use Winston over console.log because in production you need:
// - Log levels (info, warn, error) so you can filter
// - JSON format so log aggregators (Datadog, Logtail) can parse and search
// - Timestamps on every line
// - Request IDs so you can trace one user's journey through many log lines
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("../config/env");
exports.logger = winston_1.default.createLogger({
    level: env_1.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: env_1.env.NODE_ENV === 'production'
        ? winston_1.default.format.json() // machines read this
        : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ level, message, ...meta }) => {
            const renderedMessage = typeof message === 'string' ? message : JSON.stringify(message);
            const renderedMeta = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${level}: ${renderedMessage}${renderedMeta}`;
        })),
    transports: [new winston_1.default.transports.Console()],
});

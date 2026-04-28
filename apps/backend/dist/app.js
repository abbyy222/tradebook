"use strict";
// src/app.ts
// We separate app setup (app.ts) from server startup (server.ts).
// Why? So we can import the app in tests without starting a real server.
// This is a standard pattern in production Node.js codebases.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./utils/logger");
// Route imports (we'll create these next)
const auth_route_1 = require("./modules/auth/auth.route");
const sales_route_1 = require("./modules/sales/sales.route");
const expenses_route_1 = require("./modules/expenses/expenses.route");
const debtors_route_1 = require("./modules/debtors/debtors.route");
const stock_route_1 = require("./modules/stock/stock.route");
const savings_route_1 = require("./modules/savings/savings.route");
const customers_route_1 = require("./modules/customers/customers.route");
const suppliers_route_1 = require("./modules/suppliers/suppliers.route");
const insights_route_1 = require("./modules/insights/insights.route");
const internalAuth_route_1 = require("./modules/internalAuth/internalAuth.route");
const platformAdmin_route_1 = require("./modules/platformAdmin/platformAdmin.route");
const platformDev_route_1 = require("./modules/platformDev/platformDev.route");
const feedback_route_1 = require("./modules/feedback/feedback.route");
const app = (0, express_1.default)();
exports.app = app;
// Render/Netlify sit behind a reverse proxy. Trusting the first proxy
// ensures req.ip resolves to the real client IP for rate limiting.
if (env_1.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}
const normalizeOrigin = (value) => value.trim().replace(/\/+$/, '');
const configuredOrigins = new Set([env_1.env.FRONTEND_URL, ...(env_1.env.FRONTEND_URLS?.split(',') ?? [])]
    .map(normalizeOrigin)
    .filter(Boolean));
const isTrustedNetlifyOrigin = (origin) => {
    try {
        const host = new URL(origin).hostname.toLowerCase();
        return host.endsWith('.netlify.app');
    }
    catch {
        return false;
    }
};
// --- Security middleware ---
// helmet sets 11 security headers automatically
app.use((0, helmet_1.default)());
// cors only allows requests from our frontend URL
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow server-to-server or curl requests without an Origin header.
        if (!origin)
            return callback(null, true);
        const incoming = normalizeOrigin(origin);
        if (configuredOrigins.has(incoming) || isTrustedNetlifyOrigin(incoming)) {
            return callback(null, true);
        }
        logger_1.logger.warn({
            event: 'cors_origin_blocked',
            origin: incoming,
            allowedOrigins: Array.from(configuredOrigins),
        });
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
// --- Performance middleware ---
// compress all responses — critical for slow mobile networks
app.use((0, compression_1.default)());
// parse JSON bodies — limit size to prevent payload attacks
app.use(express_1.default.json({ limit: '10kb' }));
// --- Rate limiting ---
// Global limiter: 100 requests per 15 minutes per IP
// This protects against brute force and DDoS
const isDevelopment = env_1.env.NODE_ENV === 'development';
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter);
// Stricter limiter for auth routes — prevent PIN brute force
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 50 : 10,
    message: { error: 'Too many login attempts, please try again later' },
});
// --- Logging ---
app.use(requestLogger_1.requestLogger);
// --- Health check ---
// Always have this. Load balancers, Railway, and monitoring tools
// ping this to know if your app is alive.
app.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// --- Routes — all versioned under /api/v1 ---
// Versioning from day one means you can ship /api/v2 later
// without breaking existing mobile clients still on v1
app.use('/api/v1/auth', authLimiter, auth_route_1.authRouter);
app.use('/api/v1/sales', sales_route_1.salesRouter);
app.use('/api/v1/expenses', expenses_route_1.expensesRouter);
app.use('/api/v1/debtors', debtors_route_1.debtorsRouter);
app.use('/api/v1/stock', stock_route_1.stockRouter);
app.use('/api/v1/savings', savings_route_1.savingsRouter);
app.use('/api/v1/customers', customers_route_1.customersRouter);
app.use('/api/v1/suppliers', suppliers_route_1.suppliersRouter);
app.use('/api/v1/insights', insights_route_1.insightsRouter);
app.use('/api/v1/internal-auth', internalAuth_route_1.internalAuthRouter);
app.use('/api/v1/platform-admin', platformAdmin_route_1.platformAdminRouter);
app.use('/api/v1/platform-dev', platformDev_route_1.platformDevRouter);
app.use('/api/v1/feedback', feedback_route_1.feedbackRouter);
// --- 404 handler ---
// Express 5's path matcher no longer accepts bare "*".
// A final middleware with no path still catches every unmatched request.
app.use((_, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// --- Global error handler — MUST be last ---
app.use(errorHandler_1.errorHandler);

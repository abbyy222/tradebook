// src/app.ts
// We separate app setup (app.ts) from server startup (server.ts).
// Why? So we can import the app in tests without starting a real server.
// This is a standard pattern in production Node.js codebases.

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'

// Route imports (we'll create these next)
import { authRouter } from './modules/auth/auth.route'
import { salesRouter } from './modules/sales/sales.route'
import { expensesRouter } from './modules/expenses/expenses.route'
import { debtorsRouter } from './modules/debtors/debtors.route'
import { stockRouter } from './modules/stock/stock.route'
import { savingsRouter } from './modules/savings/savings.route'
import { customersRouter } from './modules/customers/customers.route'
import { suppliersRouter } from './modules/suppliers/suppliers.route'
import { internalAuthRouter } from './modules/internalAuth/internalAuth.route'
import { platformAdminRouter } from './modules/platformAdmin/platformAdmin.route'
import { platformDevRouter } from './modules/platformDev/platformDev.route'

const app = express()

// Render/Netlify sit behind a reverse proxy. Trusting the first proxy
// ensures req.ip resolves to the real client IP for rate limiting.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '')
const configuredOrigins = new Set(
  [env.FRONTEND_URL, ...(env.FRONTEND_URLS?.split(',') ?? [])]
    .map(normalizeOrigin)
    .filter(Boolean)
)

// --- Security middleware ---
// helmet sets 11 security headers automatically
app.use(helmet())

// cors only allows requests from our frontend URL
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or curl requests without an Origin header.
    if (!origin) return callback(null, true)

    const incoming = normalizeOrigin(origin)
    if (configuredOrigins.has(incoming)) return callback(null, true)

    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// --- Performance middleware ---
// compress all responses — critical for slow mobile networks
app.use(compression())

// parse JSON bodies — limit size to prevent payload attacks
app.use(express.json({ limit: '10kb' }))

// --- Rate limiting ---
// Global limiter: 100 requests per 15 minutes per IP
// This protects against brute force and DDoS
const isDevelopment = env.NODE_ENV === 'development'

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// Stricter limiter for auth routes — prevent PIN brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 10,
  message: { error: 'Too many login attempts, please try again later' },
})

// --- Logging ---
app.use(requestLogger)

// --- Health check ---
// Always have this. Load balancers, Railway, and monitoring tools
// ping this to know if your app is alive.
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// --- Routes — all versioned under /api/v1 ---
// Versioning from day one means you can ship /api/v2 later
// without breaking existing mobile clients still on v1
app.use('/api/v1/auth', authLimiter, authRouter)
app.use('/api/v1/sales', salesRouter)
app.use('/api/v1/expenses', expensesRouter)
app.use('/api/v1/debtors', debtorsRouter)
app.use('/api/v1/stock', stockRouter)
app.use('/api/v1/savings', savingsRouter)
app.use('/api/v1/customers', customersRouter)
app.use('/api/v1/suppliers', suppliersRouter)
app.use('/api/v1/internal-auth', internalAuthRouter)
app.use('/api/v1/platform-admin', platformAdminRouter)
app.use('/api/v1/platform-dev', platformDevRouter)

// --- 404 handler ---
// Express 5's path matcher no longer accepts bare "*".
// A final middleware with no path still catches every unmatched request.
app.use((_, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// --- Global error handler — MUST be last ---
app.use(errorHandler)

export { app }

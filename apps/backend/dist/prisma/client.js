"use strict";
// src/prisma/client.ts
//
// WHY THIS FILE EXISTS:
// PrismaClient opens a connection pool to PostgreSQL when instantiated.
// A connection pool means it keeps several database connections open and
// ready to use — rather than opening a new connection on every query
// (which is slow and expensive).
//
// The problem: if every repository does `new PrismaClient()`, each one
// opens its OWN connection pool. With 5 modules each opening 10 connections,
// you've got 50 open connections doing the work of 10.
// PostgreSQL (especially the free Neon tier) has connection limits.
// You'll hit that ceiling fast under any real load and get:
// "too many connections" errors — app goes down.
//
// The solution: ONE shared instance for the entire app lifetime.
// Every repository imports THIS and uses the same pool.
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
// The globalThis trick solves a development-only problem.
// ts-node-dev hot-reloads files when you save them.
// Without this, every save creates a NEW PrismaClient,
// stacking up connection pools until your DB refuses connections.
// By attaching the instance to globalThis (which survives hot reloads),
// we reuse the same client across reloads in development.
// In production this trick is irrelevant — the server starts once
// and stays running — but it costs nothing to have it there.
const globalForPrisma = globalThis;
const pool = globalForPrisma.pool ??
    new pg_1.Pool({
        connectionString: env_1.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    });
const adapter = new adapter_pg_1.PrismaPg(pool);
pool.on('error', (error) => {
    logger_1.logger.warn({
        event: 'postgres_pool_error',
        error: error.message,
    });
});
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        adapter,
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
        ],
    });
// Slow query detection.
// Any query taking longer than 2 seconds gets logged as a warning.
// In production you watch these logs — if a query suddenly starts
// taking 3 seconds, your index may be missing or your data grew
// past a threshold where the query plan changed.
// Catching this EARLY (in logs) beats finding it from user complaints.
exports.prisma.$on('query', (e) => {
    if (e.duration > 2000) {
        logger_1.logger.warn({
            event: 'slow_query',
            query: e.query,
            duration: `${e.duration}ms`,
        });
    }
});
// Only cache on globalThis outside production
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pool = pool;
    globalForPrisma.prisma = exports.prisma;
}

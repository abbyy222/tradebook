"use strict";
// src/config/env.ts
// Senior principle: load and VALIDATE all env vars at startup.
// If DATABASE_URL is missing, the app crashes immediately with a clear message
// rather than failing silently 10 minutes later on first DB call.
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().default('3000'),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    INTERNAL_JWT_SECRET: zod_1.z.string().min(32, 'INTERNAL_JWT_SECRET must be at least 32 characters').optional(),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    INTERNAL_JWT_EXPIRES_IN: zod_1.z.string().default('12h'),
    PLATFORM_SEED_DEV_PHONE: zod_1.z.string().regex(/^\+?[0-9]{10,15}$/, 'PLATFORM_SEED_DEV_PHONE is invalid'),
    PLATFORM_SEED_DEV_PASSWORD: zod_1.z.string().min(8, 'PLATFORM_SEED_DEV_PASSWORD must be at least 8 characters'),
    PLATFORM_SEED_DEV_NAME: zod_1.z.string().min(2, 'PLATFORM_SEED_DEV_NAME is required'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5173'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1); // hard crash — don't run with bad config
}
exports.env = {
    ...parsed.data,
    INTERNAL_JWT_SECRET: parsed.data.INTERNAL_JWT_SECRET ?? parsed.data.JWT_SECRET,
};

"use strict";
// src/modules/auth/auth.schema.ts
// Zod schemas validate and parse incoming data.
// If validation passes, the output is fully typed — no casting needed.
// This is the ONLY place we trust external input.
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    phoneNumber: zod_1.z
        .string()
        .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number'),
    name: zod_1.z.string().min(2).max(100),
    pin: zod_1.z
        .string()
        .length(4, 'PIN must be exactly 4 digits')
        .regex(/^\d+$/, 'PIN must contain only numbers'),
    language: zod_1.z.enum(['EN', 'PIDGIN', 'IGBO', 'YORUBA', 'HAUSA']).default('EN'),
    businessName: zod_1.z.string().max(200).optional(),
});
exports.loginSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string(),
    pin: zod_1.z.string().length(4),
});

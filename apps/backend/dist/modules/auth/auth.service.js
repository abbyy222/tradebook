"use strict";
// src/modules/auth/auth.service.ts
// The service contains ALL business logic.
// It knows nothing about HTTP — no req, no res, no status codes.
// It speaks in domain terms: traders, PINs, tokens.
// This is the layer you'd unit test in isolation.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const errorHandler_1 = require("../../middleware/errorHandler");
const auth_repository_1 = require("./auth.repository");
const phone_1 = require("../../utils/phone");
// bcrypt cost factor — 12 is the recommended production value.
// Higher = more secure but slower. 12 takes ~300ms which is
// slow enough to defeat brute force but fast enough for UX.
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = env_1.env.JWT_EXPIRES_IN;
const toTraderDTO = (trader) => ({
    id: trader.id,
    phoneNumber: trader.phoneNumber,
    name: trader.name,
    businessName: trader.businessName ?? undefined,
    role: trader.role,
    language: trader.language,
    createdAt: trader.createdAt.toISOString(),
});
exports.authService = {
    async register(input) {
        const normalizedPhoneNumber = (0, phone_1.normalizePhoneNumber)(input.phoneNumber);
        // 1. Check if phone already registered
        const existing = await auth_repository_1.authRepository.findByPhone(normalizedPhoneNumber);
        if (existing) {
            throw new errorHandler_1.AppError('Phone number already registered', 409, 'CONFLICT');
        }
        // 2. Hash the PIN — never store it plain
        const pinHash = await bcryptjs_1.default.hash(input.pin, SALT_ROUNDS);
        // 3. Create the trader
        const trader = await auth_repository_1.authRepository.create({ ...input, phoneNumber: normalizedPhoneNumber, pinHash });
        // 4. Generate JWT
        const token = jsonwebtoken_1.default.sign({ traderId: trader.id, actorId: trader.id, role: trader.role, phoneNumber: trader.phoneNumber }, env_1.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return { token, trader: toTraderDTO(trader) };
    },
    async createSalesperson(ownerTraderId, input) {
        const normalizedPhoneNumber = (0, phone_1.normalizePhoneNumber)(input.phoneNumber);
        const existing = await auth_repository_1.authRepository.findByPhone(normalizedPhoneNumber);
        if (existing) {
            throw new errorHandler_1.AppError('Phone number already registered', 409, 'CONFLICT');
        }
        const owner = await auth_repository_1.authRepository.findById(ownerTraderId);
        if (!owner) {
            throw new errorHandler_1.AppError('Owner account not found', 404, 'NOT_FOUND');
        }
        if (owner.role !== 'OWNER') {
            throw new errorHandler_1.AppError('Only business owners can add salespeople', 403, 'FORBIDDEN');
        }
        const pinHash = await bcryptjs_1.default.hash(input.pin, SALT_ROUNDS);
        const salesperson = await auth_repository_1.authRepository.createSalesperson(ownerTraderId, { ...input, phoneNumber: normalizedPhoneNumber, pinHash });
        return toTraderDTO(salesperson);
    },
    async listSalespeople(ownerTraderId) {
        const owner = await auth_repository_1.authRepository.findById(ownerTraderId);
        if (!owner) {
            throw new errorHandler_1.AppError('Owner account not found', 404, 'NOT_FOUND');
        }
        if (owner.role !== 'OWNER') {
            throw new errorHandler_1.AppError('Only business owners can view team members', 403, 'FORBIDDEN');
        }
        const rows = await auth_repository_1.authRepository.listSalespeople(ownerTraderId);
        return rows.map(toTraderDTO);
    },
    async login(input) {
        const normalizedPhoneNumber = (0, phone_1.normalizePhoneNumber)(input.phoneNumber);
        // 1. Find trader
        const trader = await auth_repository_1.authRepository.findByPhone(normalizedPhoneNumber);
        // Security: same error for "not found" and "wrong PIN"
        // We never tell attackers which one it was
        if (!trader) {
            throw new errorHandler_1.AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }
        // 2. Compare PIN against hash
        const pinValid = await bcryptjs_1.default.compare(input.pin, trader.pinHash);
        if (!pinValid) {
            throw new errorHandler_1.AppError('Invalid credentials', 401, 'UNAUTHORIZED');
        }
        const scopeTraderId = trader.ownerTraderId ?? trader.id;
        // 3. Generate JWT
        const token = jsonwebtoken_1.default.sign({
            traderId: scopeTraderId,
            actorId: trader.id,
            role: trader.role,
            phoneNumber: trader.phoneNumber,
        }, env_1.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return { token, trader: toTraderDTO(trader) };
    },
};

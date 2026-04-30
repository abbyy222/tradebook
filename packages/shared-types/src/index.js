"use strict";
// packages/shared-types/src/index.ts
// These types are shared between frontend and backend.
// Change a DTO here and TypeScript tells you everywhere that breaks -
// in the API handler AND in the React component. Zero runtime surprises.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEEDBACK_CATEGORIES = exports.PROFIT_LOSS_PERIODS = exports.EXPENSE_FREQUENCIES = exports.EXPENSE_TYPES = exports.EXPENSE_CATEGORIES = void 0;
exports.EXPENSE_CATEGORIES = [
    'RESTOCK',
    'TRANSPORT',
    'MARKET_FEES',
    'PACKAGING',
    'EQUIPMENT',
    'FOOD',
    'RENT',
    'ELECTRICITY',
    'WATER',
    'SALARY',
    'LEVY',
    'REPAIRS',
    'UTILITIES',
    'OTHER',
];
exports.EXPENSE_TYPES = ['ONE_TIME', 'RECURRING'];
exports.EXPENSE_FREQUENCIES = ['DAILY', 'MONTHLY', 'YEARLY'];
exports.PROFIT_LOSS_PERIODS = ['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR', 'ALL_TIME'];
exports.FEEDBACK_CATEGORIES = [
    'App bug',
    'Sync issue',
    'Slow performance',
    'Payment/debtor issue',
    'Feature request',
    'Other',
];

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopDebtorCleanupJob = exports.startDebtorCleanupJob = void 0;
const debtors_repository_1 = require("../modules/debtors/debtors.repository");
const logger_1 = require("../utils/logger");
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
let cleanupTimer;
const runCleanup = async () => {
    const cutoff = new Date(Date.now() - FIVE_MINUTES_MS);
    try {
        const result = await debtors_repository_1.debtorsRepository.deleteClearedOlderThan(cutoff);
        if (result.count > 0) {
            logger_1.logger.info({
                event: 'cleared_debtors_cleaned',
                deleted: result.count,
                cutoff: cutoff.toISOString(),
            });
        }
    }
    catch (error) {
        logger_1.logger.error({
            event: 'debtor_cleanup_failed',
            error: error?.message ?? 'Unknown cleanup error',
            stack: error?.stack,
        });
    }
};
const startDebtorCleanupJob = () => {
    if (cleanupTimer)
        return cleanupTimer;
    void runCleanup();
    cleanupTimer = setInterval(() => {
        void runCleanup();
    }, ONE_MINUTE_MS);
    return cleanupTimer;
};
exports.startDebtorCleanupJob = startDebtorCleanupJob;
const stopDebtorCleanupJob = () => {
    if (!cleanupTimer)
        return;
    clearInterval(cleanupTimer);
    cleanupTimer = undefined;
};
exports.stopDebtorCleanupJob = stopDebtorCleanupJob;

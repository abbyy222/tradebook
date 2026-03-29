"use strict";
// src/server.ts
// Kept deliberately thin. Its only job is to start the HTTP server.
// All app logic lives in app.ts.
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const server = app_1.app.listen(Number(env_1.env.PORT), () => {
    logger_1.logger.info(`Server running on port ${env_1.env.PORT} [${env_1.env.NODE_ENV}]`);
});
// Graceful shutdown — when Railway/Vercel stops the container,
// it sends SIGTERM. We finish in-flight requests before closing.
// Without this, active requests get killed mid-response.
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        logger_1.logger.info('Server closed');
        process.exit(0);
    });
});

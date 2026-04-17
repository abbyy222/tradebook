import 'dotenv/config';
export declare const env: {
    INTERNAL_JWT_SECRET: string;
    NODE_ENV: "development" | "production" | "test";
    PORT: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    INTERNAL_JWT_EXPIRES_IN: string;
    FRONTEND_URL: string;
    PLATFORM_SEED_DEV_PHONE?: string | undefined;
    PLATFORM_SEED_DEV_PASSWORD?: string | undefined;
    PLATFORM_SEED_DEV_NAME?: string | undefined;
    FRONTEND_URLS?: string | undefined;
};

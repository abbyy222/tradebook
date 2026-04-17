-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_DEV');

-- CreateTable
CREATE TABLE "internal_users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "InternalRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "internal_users_phone_number_key" ON "internal_users"("phone_number");

-- CreateIndex
CREATE INDEX "internal_users_role_idx" ON "internal_users"("role");

-- CreateIndex
CREATE INDEX "internal_users_is_active_idx" ON "internal_users"("is_active");

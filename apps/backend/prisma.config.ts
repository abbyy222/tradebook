// Prisma CLI can be executed either from repo root or apps/backend.
// We load env files from both possible working directories so migrate/generate
// work reliably in local dev, Render, and CI.
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/backend/.env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const prismaDatasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!prismaDatasourceUrl) {
  throw new Error(
    `Set DIRECT_URL or DATABASE_URL before Prisma commands. Checked env files: ${envCandidates.join(", ")}`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations should use DIRECT_URL first (direct DB connection).
    // Fallback to DATABASE_URL keeps local/dev resilient.
    url: prismaDatasourceUrl,
  },
});

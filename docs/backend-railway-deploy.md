# Backend Deployment on Railway

This repo is an npm-workspaces monorepo. Deploy the backend service from the repo root, not from `apps/backend` directly.

## Railway Service Settings

Use the GitHub repo root as the source.

### Build Command

```bash
npm install && npm run prisma:generate:backend && npm run build:backend
```

### Start Command

```bash
npm run start:backend
```

### Pre-Deploy Command

Run Prisma migrations before the new deployment goes live.

```bash
npm run migrate:deploy:backend
```

## Required Environment Variables

Set these in the Railway service:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=...
DIRECT_URL=...
JWT_SECRET=...
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-netlify-site.netlify.app
```

## Health Check

Railway can use this path for health checks:

```text
/health
```

## Deployment Order

1. Create the Railway service from the GitHub repo.
2. Set the build/start/pre-deploy commands above.
3. Add all required environment variables.
4. Deploy the service.
5. Generate a Railway public domain.
6. Test `GET /health`.
7. Use the Railway domain as `VITE_API_URL` in the frontend host.

## Notes

- `DATABASE_URL` is used by the running backend.
- `DIRECT_URL` is used by Prisma CLI and migrations.
- If you use Supabase, keep both values aligned to the correct production database.
- Rotate secrets before the first public deployment.

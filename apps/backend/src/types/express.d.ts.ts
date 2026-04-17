// src/types/express.d.ts
// TypeScript declaration merging — we're adding our own
// properties to Express's Request interface.
// After this, req.trader and req.requestId are fully typed
// everywhere in the codebase with zero casting.

declare namespace Express {
  interface Request {
    trader?: {
      traderId: string
      actorId: string
      role: 'OWNER' | 'SALESPERSON'
      phoneNumber: string
    }
    requestId?: string
    internalUser?: {
      internalUserId: string
      role: 'PLATFORM_ADMIN' | 'PLATFORM_DEV'
      phoneNumber: string
    }
  }
}

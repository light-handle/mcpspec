import type { MiddlewareHandler } from 'hono';

// Phase 3: pass-through middleware (extensible in later phases)
export function authMiddleware(): MiddlewareHandler {
  return async (_c, next) => {
    return next();
  };
}

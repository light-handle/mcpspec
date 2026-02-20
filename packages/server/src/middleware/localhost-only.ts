import type { MiddlewareHandler } from 'hono';

const LOCALHOST_ADDRS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost']);

export function localhostOnly(): MiddlewareHandler {
  return async (c, next) => {
    const remoteAccess = process.env['MCPSPEC_REMOTE_ACCESS'] === 'true';

    if (remoteAccess) {
      const token = process.env['MCPSPEC_TOKEN'];
      if (token) {
        const authHeader = c.req.header('Authorization');
        if (authHeader !== `Bearer ${token}`) {
          return c.json({ error: 'unauthorized', message: 'Invalid or missing token' }, 401);
        }
      }
      return next();
    }

    // Check if request is from localhost
    const remoteAddr = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
    if (remoteAddr && !LOCALHOST_ADDRS.has(remoteAddr)) {
      return c.json(
        { error: 'forbidden', message: 'Remote access is disabled. Set MCPSPEC_REMOTE_ACCESS=true to enable.' },
        403,
      );
    }

    return next();
  };
}

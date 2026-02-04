import type { Request, Response, NextFunction } from 'express';
import { getTokenByValue, updateToken } from '../db/index.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const tokenValue = authHeader.slice(7);
  const token = getTokenByValue(tokenValue);

  if (!token) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (!token.enabled) {
    res.status(403).json({ error: 'Token is disabled' });
    return;
  }

  // Update last used
  updateToken(token.id, { lastUsed: Date.now() });

  // Attach token info to request
  (req as any).tokenInfo = token;
  next();
}

// Rate limiting per token (simple in-memory)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = (req as any).tokenInfo;
  if (!token || !token.rateLimit) {
    next();
    return;
  }

  const now = Date.now();
  const windowMs = 60000; // 1 minute

  let record = requestCounts.get(token.id);
  if (!record || now >= record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
    requestCounts.set(token.id, record);
  }

  record.count++;

  if (record.count > token.rateLimit) {
    res.status(429).json({
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
      },
    });
    return;
  }

  next();
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

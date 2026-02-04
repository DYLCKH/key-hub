import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import crypto from 'crypto';
import {
  getTokens,
  getTokenById,
  createToken,
  updateToken,
  deleteToken,
} from '../db/index.js';
import type { Token } from '@key-hub/shared';

const router = Router();

const createTokenSchema = z.object({
  name: z.string().min(1).max(100),
  allowedChannels: z.array(z.string()).optional(),
  rateLimit: z.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});

const updateTokenSchema = createTokenSchema.partial();

function generateToken(): string {
  return 'kh-' + crypto.randomBytes(24).toString('hex');
}

// GET /api/tokens
router.get('/', (_req, res) => {
  const tokens = getTokens();
  // Mask token values
  const masked = tokens.map((t) => ({
    ...t,
    token: t.token.slice(0, 6) + '****' + t.token.slice(-4),
  }));
  res.json({ success: true, data: masked });
});

// POST /api/tokens
router.post('/', async (req, res) => {
  try {
    const data = createTokenSchema.parse(req.body);
    const now = Date.now();
    const tokenValue = generateToken();
    const token: Token = {
      id: nanoid(),
      name: data.name,
      token: tokenValue,
      allowedChannels: data.allowedChannels || [],
      rateLimit: data.rateLimit,
      enabled: data.enabled ?? true,
      createdAt: now,
    };
    await createToken(token);
    // Return full token value on creation only
    res.status(201).json({ success: true, data: token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// PUT /api/tokens/:id
router.put('/:id', async (req, res) => {
  try {
    const data = updateTokenSchema.parse(req.body);
    const token = await updateToken(req.params.id, data);
    if (!token) {
      res.status(404).json({ success: false, error: 'Token not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        ...token,
        token: token.token.slice(0, 6) + '****' + token.token.slice(-4),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// DELETE /api/tokens/:id
router.delete('/:id', async (req, res) => {
  const deleted = await deleteToken(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Token not found' });
    return;
  }
  res.json({ success: true, message: 'Token deleted' });
});

export default router;

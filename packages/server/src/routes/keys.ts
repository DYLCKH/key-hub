import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  getApiKeys,
  getApiKeyById,
  createApiKey,
  createApiKeys,
  updateApiKey,
  deleteApiKey,
  getChannelById,
} from '../db/index.js';
import { checkSingleKey, runKeyCheck } from '../scheduler/index.js';
import type { ApiKey } from '@key-hub/shared';

const router = Router();

const createKeySchema = z.object({
  channelId: z.string().min(1),
  key: z.string().min(1),
  alias: z.string().optional(),
  priority: z.number().int().min(1).max(100).optional(),
  weight: z.number().int().min(1).max(100).optional(),
});

const importKeysSchema = z.object({
  channelId: z.string().min(1),
  keys: z.string().min(1),
  delimiter: z.string().optional(),
});

const updateKeySchema = z.object({
  alias: z.string().optional(),
  priority: z.number().int().min(1).max(100).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  status: z.enum(['active', 'invalid', 'quota_exceeded', 'disabled', 'unknown']).optional(),
});

// GET /api/keys
router.get('/', (req, res) => {
  const channelId = req.query.channelId as string | undefined;
  const keys = getApiKeys(channelId);
  // Mask key values
  const maskedKeys = keys.map((k) => ({
    ...k,
    key: maskKey(k.key),
  }));
  res.json({ success: true, data: maskedKeys });
});

// GET /api/keys/:id
router.get('/:id', (req, res) => {
  const key = getApiKeyById(req.params.id);
  if (!key) {
    res.status(404).json({ success: false, error: 'Key not found' });
    return;
  }
  res.json({
    success: true,
    data: { ...key, key: maskKey(key.key) },
  });
});

// POST /api/keys
router.post('/', async (req, res) => {
  try {
    const data = createKeySchema.parse(req.body);

    // Verify channel exists
    const channel = getChannelById(data.channelId);
    if (!channel) {
      res.status(400).json({ success: false, error: 'Channel not found' });
      return;
    }

    const now = Date.now();
    const key: ApiKey = {
      id: nanoid(),
      channelId: data.channelId,
      key: data.key,
      alias: data.alias,
      status: 'unknown',
      priority: data.priority || 50,
      weight: data.weight || 50,
      errorCount: 0,
      totalRequests: 0,
      createdAt: now,
      updatedAt: now,
    };
    await createApiKey(key);
    res.status(201).json({
      success: true,
      data: { ...key, key: maskKey(key.key) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// POST /api/keys/import
router.post('/import', async (req, res) => {
  try {
    const data = importKeysSchema.parse(req.body);

    // Verify channel exists
    const channel = getChannelById(data.channelId);
    if (!channel) {
      res.status(400).json({ success: false, error: 'Channel not found' });
      return;
    }

    const delimiter = data.delimiter || '\n';
    const keyStrings = data.keys
      .split(delimiter)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keyStrings.length === 0) {
      res.status(400).json({ success: false, error: 'No valid keys found' });
      return;
    }

    const now = Date.now();
    const keys: ApiKey[] = keyStrings.map((keyStr) => ({
      id: nanoid(),
      channelId: data.channelId,
      key: keyStr,
      status: 'unknown',
      priority: 50,
      weight: 50,
      errorCount: 0,
      totalRequests: 0,
      createdAt: now,
      updatedAt: now,
    }));

    await createApiKeys(keys);
    res.status(201).json({
      success: true,
      data: {
        imported: keys.length,
        keys: keys.map((k) => ({ ...k, key: maskKey(k.key) })),
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

// PUT /api/keys/:id
router.put('/:id', async (req, res) => {
  try {
    const data = updateKeySchema.parse(req.body);
    const key = await updateApiKey(req.params.id, data);
    if (!key) {
      res.status(404).json({ success: false, error: 'Key not found' });
      return;
    }
    res.json({
      success: true,
      data: { ...key, key: maskKey(key.key) },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// DELETE /api/keys/:id
router.delete('/:id', async (req, res) => {
  const deleted = await deleteApiKey(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Key not found' });
    return;
  }
  res.json({ success: true, message: 'Key deleted' });
});

// POST /api/keys/:id/check
router.post('/:id/check', async (req, res) => {
  try {
    await checkSingleKey(req.params.id);
    const key = getApiKeyById(req.params.id);
    res.json({
      success: true,
      data: key ? { ...key, key: maskKey(key.key) } : null,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Check failed',
    });
  }
});

// POST /api/keys/check-all
router.post('/check-all', async (_req, res) => {
  // Start check in background
  runKeyCheck().catch(console.error);
  res.json({ success: true, message: 'Key check started' });
});

function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export default router;

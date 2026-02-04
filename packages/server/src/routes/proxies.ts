import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  getProxies,
  getProxyById,
  createProxy,
  updateProxy,
  deleteProxy,
} from '../db/index.js';
import { testProxyConnection } from '../services/proxy.js';
import type { Proxy } from '@key-hub/shared';

const router = Router();

const createProxySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['socks5', 'socks5h', 'http', 'https']),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().optional(),
  password: z.string().optional(),
  enabled: z.boolean().optional(),
});

const updateProxySchema = createProxySchema.partial();

// GET /api/proxies
router.get('/', (_req, res) => {
  const proxies = getProxies();
  // Mask passwords
  const masked = proxies.map((p) => ({
    ...p,
    password: p.password ? '****' : undefined,
  }));
  res.json({ success: true, data: masked });
});

// GET /api/proxies/:id
router.get('/:id', (req, res) => {
  const proxy = getProxyById(req.params.id);
  if (!proxy) {
    res.status(404).json({ success: false, error: 'Proxy not found' });
    return;
  }
  res.json({
    success: true,
    data: { ...proxy, password: proxy.password ? '****' : undefined },
  });
});

// POST /api/proxies
router.post('/', async (req, res) => {
  try {
    const data = createProxySchema.parse(req.body);
    const now = Date.now();
    const proxy: Proxy = {
      id: nanoid(),
      name: data.name,
      type: data.type,
      host: data.host,
      port: data.port,
      username: data.username,
      password: data.password,
      enabled: data.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await createProxy(proxy);
    res.status(201).json({ success: true, data: proxy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// PUT /api/proxies/:id
router.put('/:id', async (req, res) => {
  try {
    const data = updateProxySchema.parse(req.body);
    const proxy = await updateProxy(req.params.id, data);
    if (!proxy) {
      res.status(404).json({ success: false, error: 'Proxy not found' });
      return;
    }
    res.json({ success: true, data: proxy });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// DELETE /api/proxies/:id
router.delete('/:id', async (req, res) => {
  const deleted = await deleteProxy(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Proxy not found' });
    return;
  }
  res.json({ success: true, message: 'Proxy deleted' });
});

// POST /api/proxies/:id/test
router.post('/:id/test', async (req, res) => {
  const proxy = getProxyById(req.params.id);
  if (!proxy) {
    res.status(404).json({ success: false, error: 'Proxy not found' });
    return;
  }

  const result = await testProxyConnection(proxy);
  res.json({ success: true, data: result });
});

export default router;

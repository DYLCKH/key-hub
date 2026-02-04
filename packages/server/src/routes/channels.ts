import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import {
  getChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel,
} from '../db/index.js';
import type { Channel } from '@key-hub/shared';

const router = Router();

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['openai', 'anthropic', 'gemini', 'openai-compatible']),
  baseUrl: z.string().url(),
  testMethod: z.enum(['balance', 'chat', 'models']),
  testModel: z.string().optional(),
  proxyId: z.string().optional(),
  loadBalanceStrategy: z.enum(['round-robin', 'weighted', 'priority', 'least-used']).optional(),
  enabled: z.boolean().optional(),
});

const updateChannelSchema = createChannelSchema.partial();

// GET /api/channels
router.get('/', (_req, res) => {
  const channels = getChannels();
  res.json({ success: true, data: channels });
});

// GET /api/channels/:id
router.get('/:id', (req, res) => {
  const channel = getChannelById(req.params.id);
  if (!channel) {
    res.status(404).json({ success: false, error: 'Channel not found' });
    return;
  }
  res.json({ success: true, data: channel });
});

// POST /api/channels
router.post('/', async (req, res) => {
  try {
    const data = createChannelSchema.parse(req.body);
    const now = Date.now();
    const channel: Channel = {
      id: nanoid(),
      name: data.name,
      type: data.type,
      baseUrl: data.baseUrl,
      testMethod: data.testMethod,
      testModel: data.testModel,
      proxyId: data.proxyId,
      loadBalanceStrategy: data.loadBalanceStrategy || 'round-robin',
      enabled: data.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await createChannel(channel);
    res.status(201).json({ success: true, data: channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// PUT /api/channels/:id
router.put('/:id', async (req, res) => {
  try {
    const data = updateChannelSchema.parse(req.body);
    const channel = await updateChannel(req.params.id, data);
    if (!channel) {
      res.status(404).json({ success: false, error: 'Channel not found' });
      return;
    }
    res.json({ success: true, data: channel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors });
      return;
    }
    throw error;
  }
});

// DELETE /api/channels/:id
router.delete('/:id', async (req, res) => {
  const deleted = await deleteChannel(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Channel not found' });
    return;
  }
  res.json({ success: true, message: 'Channel deleted' });
});

export default router;

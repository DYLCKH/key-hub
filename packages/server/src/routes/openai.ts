import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import {
  getChannels,
  getActiveKeysByChannel,
  getChannelById,
  getProxyById,
  updateApiKey,
  addLog,
} from '../db/index.js';
import { selectKey } from '../services/loadBalancer.js';
import { createProxyAgent } from '../services/proxy.js';
import { authMiddleware, rateLimitMiddleware } from '../middleware/index.js';
import type { RequestLog, Token } from '@key-hub/shared';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);
router.use(rateLimitMiddleware);

// Model to channel type mapping
const MODEL_CHANNEL_MAP: Record<string, string[]> = {
  // OpenAI models
  'gpt-4': ['openai', 'openai-compatible'],
  'gpt-4-turbo': ['openai', 'openai-compatible'],
  'gpt-4o': ['openai', 'openai-compatible'],
  'gpt-4o-mini': ['openai', 'openai-compatible'],
  'gpt-3.5-turbo': ['openai', 'openai-compatible'],
  'o1': ['openai', 'openai-compatible'],
  'o1-mini': ['openai', 'openai-compatible'],
  'o1-preview': ['openai', 'openai-compatible'],
  // Anthropic models
  'claude-3-opus': ['anthropic'],
  'claude-3-sonnet': ['anthropic'],
  'claude-3-haiku': ['anthropic'],
  'claude-3.5-sonnet': ['anthropic'],
  'claude-3-5-sonnet': ['anthropic'],
  // Gemini models
  'gemini-pro': ['gemini'],
  'gemini-1.5-pro': ['gemini'],
  'gemini-1.5-flash': ['gemini'],
};

function findChannelForModel(model: string, allowedChannels: string[]): { channel: any; key: any } | null {
  const channels = getChannels().filter((c) => c.enabled);

  // Check if model prefix matches any known type
  let matchingTypes: string[] = [];
  for (const [prefix, types] of Object.entries(MODEL_CHANNEL_MAP)) {
    if (model.startsWith(prefix)) {
      matchingTypes = types;
      break;
    }
  }

  // If no specific match, try openai-compatible
  if (matchingTypes.length === 0) {
    matchingTypes = ['openai', 'openai-compatible'];
  }

  // Filter channels by type and allowed list
  let eligibleChannels = channels.filter((c) => matchingTypes.includes(c.type));
  if (allowedChannels.length > 0) {
    eligibleChannels = eligibleChannels.filter((c) => allowedChannels.includes(c.id));
  }

  // Try each channel until we find one with available keys
  for (const channel of eligibleChannels) {
    const keys = getActiveKeysByChannel(channel.id);
    const key = selectKey(keys, channel.loadBalanceStrategy, channel.id);
    if (key) {
      return { channel, key };
    }
  }

  return null;
}

// POST /v1/chat/completions
router.post('/chat/completions', async (req: Request, res: Response) => {
  const start = Date.now();
  const tokenInfo = (req as any).tokenInfo as Token;
  const model = req.body.model;

  if (!model) {
    res.status(400).json({ error: { message: 'model is required', type: 'invalid_request_error' } });
    return;
  }

  const result = findChannelForModel(model, tokenInfo.allowedChannels);
  if (!result) {
    res.status(503).json({
      error: { message: 'No available API keys for this model', type: 'server_error' },
    });
    return;
  }

  const { channel, key } = result;
  const isStreaming = req.body.stream === true;

  try {
    const baseUrl = channel.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Set auth header based on channel type
    if (channel.type === 'anthropic') {
      headers['x-api-key'] = key.key;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${key.key}`;
    }

    // Prepare fetch options
    const fetchOptions: RequestInit & { agent?: any } = {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    };

    // Add proxy if configured
    if (channel.proxyId) {
      const proxy = getProxyById(channel.proxyId);
      if (proxy && proxy.enabled) {
        fetchOptions.agent = createProxyAgent(proxy);
      }
    }

    // Determine endpoint based on channel type
    let endpoint = `${baseUrl}/v1/chat/completions`;
    if (channel.type === 'anthropic') {
      endpoint = `${baseUrl}/v1/messages`;
    } else if (channel.type === 'gemini') {
      endpoint = `${baseUrl}/v1beta/models/${model}:generateContent?key=${key.key}`;
    }

    const response = await fetch(endpoint, fetchOptions);
    const latency = Date.now() - start;

    // Log request
    const log: RequestLog = {
      id: nanoid(),
      timestamp: Date.now(),
      tokenId: tokenInfo.id,
      channelId: channel.id,
      keyId: key.id,
      model,
      path: '/v1/chat/completions',
      method: 'POST',
      status: response.status,
      latency,
      streaming: isStreaming,
    };

    // Update key stats
    await updateApiKey(key.id, {
      lastUsed: Date.now(),
      totalRequests: key.totalRequests + 1,
      errorCount: response.ok ? 0 : key.errorCount + 1,
    });

    if (isStreaming && response.ok) {
      // Stream response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body?.getReader();
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      res.end();
      await addLog(log);
    } else {
      // Regular response
      const data = await response.json();
      res.status(response.status).json(data);

      if (!response.ok) {
        log.error = JSON.stringify(data);
      }
      await addLog(log);
    }
  } catch (error) {
    const latency = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    // Update error count
    await updateApiKey(key.id, {
      errorCount: key.errorCount + 1,
    });

    // Log failure
    await addLog({
      id: nanoid(),
      timestamp: Date.now(),
      tokenId: tokenInfo.id,
      channelId: channel.id,
      keyId: key.id,
      model,
      path: '/v1/chat/completions',
      method: 'POST',
      status: 500,
      latency,
      streaming: isStreaming,
      error: errorMsg,
    });

    res.status(500).json({
      error: { message: errorMsg, type: 'server_error' },
    });
  }
});

// GET /v1/models
router.get('/models', async (req: Request, res: Response) => {
  const tokenInfo = (req as any).tokenInfo as Token;
  const channels = getChannels().filter((c) => c.enabled);

  // Filter by allowed channels
  let eligibleChannels = channels;
  if (tokenInfo.allowedChannels.length > 0) {
    eligibleChannels = channels.filter((c) => tokenInfo.allowedChannels.includes(c.id));
  }

  // Aggregate models from all eligible channels
  const models: any[] = [];
  const modelSet = new Set<string>();

  for (const [model, types] of Object.entries(MODEL_CHANNEL_MAP)) {
    for (const channel of eligibleChannels) {
      if (types.includes(channel.type)) {
        if (!modelSet.has(model)) {
          modelSet.add(model);
          models.push({
            id: model,
            object: 'model',
            created: Math.floor(Date.now() / 1000),
            owned_by: channel.type,
          });
        }
      }
    }
  }

  res.json({
    object: 'list',
    data: models,
  });
});

// POST /v1/embeddings
router.post('/embeddings', async (req: Request, res: Response) => {
  const tokenInfo = (req as any).tokenInfo as Token;
  const model = req.body.model || 'text-embedding-ada-002';

  const result = findChannelForModel(model, tokenInfo.allowedChannels);
  if (!result) {
    res.status(503).json({
      error: { message: 'No available API keys for embeddings', type: 'server_error' },
    });
    return;
  }

  const { channel, key } = result;
  const baseUrl = channel.baseUrl.replace(/\/+$/, '');

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.key}`,
    };

    const fetchOptions: RequestInit & { agent?: any } = {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    };

    if (channel.proxyId) {
      const proxy = getProxyById(channel.proxyId);
      if (proxy && proxy.enabled) {
        fetchOptions.agent = createProxyAgent(proxy);
      }
    }

    const response = await fetch(`${baseUrl}/v1/embeddings`, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({
      error: { message: error instanceof Error ? error.message : 'Unknown error', type: 'server_error' },
    });
  }
});

// POST /v1/images/generations
router.post('/images/generations', async (req: Request, res: Response) => {
  const tokenInfo = (req as any).tokenInfo as Token;
  const model = req.body.model || 'dall-e-3';

  const result = findChannelForModel(model, tokenInfo.allowedChannels);
  if (!result) {
    res.status(503).json({
      error: { message: 'No available API keys for image generation', type: 'server_error' },
    });
    return;
  }

  const { channel, key } = result;
  const baseUrl = channel.baseUrl.replace(/\/+$/, '');

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.key}`,
    };

    const fetchOptions: RequestInit & { agent?: any } = {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    };

    if (channel.proxyId) {
      const proxy = getProxyById(channel.proxyId);
      if (proxy && proxy.enabled) {
        fetchOptions.agent = createProxyAgent(proxy);
      }
    }

    const response = await fetch(`${baseUrl}/v1/images/generations`, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({
      error: { message: error instanceof Error ? error.message : 'Unknown error', type: 'server_error' },
    });
  }
});

export default router;

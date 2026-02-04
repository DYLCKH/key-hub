import type { Channel, ApiKey, KeyCheckResult, ApiKeyStatus } from '@key-hub/shared';
import { getProxyById } from '../db/index.js';
import { createProxyAgent } from './proxy.js';
import type { Agent } from 'http';

function getAgent(channel: Channel): Agent | undefined {
  if (!channel.proxyId) return undefined;
  const proxy = getProxyById(channel.proxyId);
  if (!proxy || !proxy.enabled) return undefined;
  return createProxyAgent(proxy);
}

async function fetchWithProxy(
  url: string,
  init: RequestInit & { agent?: Agent },
  channel: Channel
): Promise<Response> {
  const agent = getAgent(channel);
  return fetch(url, {
    ...init,
    // @ts-expect-error - agent type
    agent,
    signal: init.signal || AbortSignal.timeout(30000),
  });
}

// OpenAI / OpenAI-compatible provider
async function checkOpenAI(channel: Channel, key: ApiKey): Promise<KeyCheckResult> {
  const baseUrl = channel.baseUrl.replace(/\/+$/, '');
  const headers = {
    'Authorization': `Bearer ${key.key}`,
    'Content-Type': 'application/json',
  };

  try {
    if (channel.testMethod === 'models') {
      const res = await fetchWithProxy(`${baseUrl}/v1/models`, { headers }, channel);
      if (res.ok) {
        return { keyId: key.id, status: 'active', checkedAt: Date.now() };
      }
      return handleErrorResponse(key.id, res);
    }

    if (channel.testMethod === 'balance') {
      const res = await fetchWithProxy(
        `${baseUrl}/dashboard/billing/credit_grants`,
        { headers },
        channel
      );
      if (res.ok) {
        const data = await res.json() as { total_available?: number };
        return {
          keyId: key.id,
          status: 'active',
          balance: data.total_available,
          checkedAt: Date.now(),
        };
      }
      return handleErrorResponse(key.id, res);
    }

    // chat test
    const model = channel.testModel || 'gpt-3.5-turbo';
    const res = await fetchWithProxy(
      `${baseUrl}/v1/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      },
      channel
    );

    if (res.ok) {
      return { keyId: key.id, status: 'active', checkedAt: Date.now() };
    }
    return handleErrorResponse(key.id, res);
  } catch (error) {
    return {
      keyId: key.id,
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Connection failed',
      checkedAt: Date.now(),
    };
  }
}

// Anthropic provider
async function checkAnthropic(channel: Channel, key: ApiKey): Promise<KeyCheckResult> {
  const baseUrl = channel.baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    'x-api-key': key.key,
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };

  try {
    if (channel.testMethod === 'models') {
      const res = await fetchWithProxy(`${baseUrl}/v1/models`, { headers }, channel);
      if (res.ok) {
        return { keyId: key.id, status: 'active', checkedAt: Date.now() };
      }
      return handleErrorResponse(key.id, res);
    }

    // Chat test
    const model = channel.testModel || 'claude-3-haiku-20240307';
    const res = await fetchWithProxy(
      `${baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      },
      channel
    );

    if (res.ok) {
      return { keyId: key.id, status: 'active', checkedAt: Date.now() };
    }
    return handleErrorResponse(key.id, res);
  } catch (error) {
    return {
      keyId: key.id,
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Connection failed',
      checkedAt: Date.now(),
    };
  }
}

// Gemini provider
async function checkGemini(channel: Channel, key: ApiKey): Promise<KeyCheckResult> {
  const baseUrl = channel.baseUrl.replace(/\/+$/, '');

  try {
    if (channel.testMethod === 'models') {
      const res = await fetchWithProxy(
        `${baseUrl}/v1beta/models?key=${key.key}`,
        {},
        channel
      );
      if (res.ok) {
        return { keyId: key.id, status: 'active', checkedAt: Date.now() };
      }
      return handleErrorResponse(key.id, res);
    }

    // Chat test
    const model = channel.testModel || 'gemini-pro';
    const res = await fetchWithProxy(
      `${baseUrl}/v1beta/models/${model}:generateContent?key=${key.key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 1 },
        }),
      },
      channel
    );

    if (res.ok) {
      return { keyId: key.id, status: 'active', checkedAt: Date.now() };
    }
    return handleErrorResponse(key.id, res);
  } catch (error) {
    return {
      keyId: key.id,
      status: 'invalid',
      error: error instanceof Error ? error.message : 'Connection failed',
      checkedAt: Date.now(),
    };
  }
}

async function handleErrorResponse(keyId: string, res: Response): Promise<KeyCheckResult> {
  let errorMsg = `HTTP ${res.status}`;
  let status: ApiKeyStatus = 'invalid';

  try {
    const body = await res.text();
    errorMsg += `: ${body.slice(0, 200)}`;
  } catch {
    // ignore
  }

  if (res.status === 401 || res.status === 403) {
    status = 'invalid';
  } else if (res.status === 429) {
    status = 'quota_exceeded';
  }

  return { keyId, status, error: errorMsg, checkedAt: Date.now() };
}

// Main check function
export async function checkKey(channel: Channel, key: ApiKey): Promise<KeyCheckResult> {
  switch (channel.type) {
    case 'anthropic':
      return checkAnthropic(channel, key);
    case 'gemini':
      return checkGemini(channel, key);
    case 'openai':
    case 'openai-compatible':
    default:
      return checkOpenAI(channel, key);
  }
}

export async function checkKeys(channel: Channel, keys: ApiKey[]): Promise<KeyCheckResult[]> {
  const results: KeyCheckResult[] = [];
  // Check in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((key) => checkKey(channel, key))
    );
    results.push(...batchResults);
    if (i + batchSize < keys.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return results;
}

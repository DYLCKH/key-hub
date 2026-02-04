import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import type { Channel, ApiKey, Proxy, Token, RequestLog } from '@key-hub/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export interface Database {
  channels: Channel[];
  apiKeys: ApiKey[];
  proxies: Proxy[];
  tokens: Token[];
  logs: RequestLog[];
  settings: {
    checkInterval: number;
    maxLogsRetention: number;
  };
}

const defaultData: Database = {
  channels: [],
  apiKeys: [],
  proxies: [],
  tokens: [],
  logs: [],
  settings: {
    checkInterval: 3600000, // 1 hour
    maxLogsRetention: 604800000, // 7 days
  },
};

const adapter = new JSONFile<Database>(join(dataDir, 'db.json'));
export const db = new Low<Database>(adapter, defaultData);

export async function initDb(): Promise<void> {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  // Ensure all arrays exist
  db.data.channels = db.data.channels || [];
  db.data.apiKeys = db.data.apiKeys || [];
  db.data.proxies = db.data.proxies || [];
  db.data.tokens = db.data.tokens || [];
  db.data.logs = db.data.logs || [];
  db.data.settings = db.data.settings || defaultData.settings;
  await db.write();
}

// Channel operations
export function getChannels(): Channel[] {
  return db.data?.channels || [];
}

export function getChannelById(id: string): Channel | undefined {
  return db.data?.channels.find((c) => c.id === id);
}

export async function createChannel(channel: Channel): Promise<Channel> {
  db.data?.channels.push(channel);
  await db.write();
  return channel;
}

export async function updateChannel(id: string, updates: Partial<Channel>): Promise<Channel | null> {
  const index = db.data?.channels.findIndex((c) => c.id === id) ?? -1;
  if (index === -1) return null;
  const channel = { ...db.data!.channels[index], ...updates, updatedAt: Date.now() };
  db.data!.channels[index] = channel;
  await db.write();
  return channel;
}

export async function deleteChannel(id: string): Promise<boolean> {
  const index = db.data?.channels.findIndex((c) => c.id === id) ?? -1;
  if (index === -1) return false;
  db.data!.channels.splice(index, 1);
  // Also delete associated keys
  db.data!.apiKeys = db.data!.apiKeys.filter((k) => k.channelId !== id);
  await db.write();
  return true;
}

// ApiKey operations
export function getApiKeys(channelId?: string): ApiKey[] {
  const keys = db.data?.apiKeys || [];
  return channelId ? keys.filter((k) => k.channelId === channelId) : keys;
}

export function getApiKeyById(id: string): ApiKey | undefined {
  return db.data?.apiKeys.find((k) => k.id === id);
}

export function getActiveKeysByChannel(channelId: string): ApiKey[] {
  return (db.data?.apiKeys || []).filter(
    (k) => k.channelId === channelId && k.status === 'active'
  );
}

export async function createApiKey(key: ApiKey): Promise<ApiKey> {
  db.data?.apiKeys.push(key);
  await db.write();
  return key;
}

export async function createApiKeys(keys: ApiKey[]): Promise<ApiKey[]> {
  db.data?.apiKeys.push(...keys);
  await db.write();
  return keys;
}

export async function updateApiKey(id: string, updates: Partial<ApiKey>): Promise<ApiKey | null> {
  const index = db.data?.apiKeys.findIndex((k) => k.id === id) ?? -1;
  if (index === -1) return null;
  const key = { ...db.data!.apiKeys[index], ...updates, updatedAt: Date.now() };
  db.data!.apiKeys[index] = key;
  await db.write();
  return key;
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const index = db.data?.apiKeys.findIndex((k) => k.id === id) ?? -1;
  if (index === -1) return false;
  db.data!.apiKeys.splice(index, 1);
  await db.write();
  return true;
}

// Proxy operations
export function getProxies(): Proxy[] {
  return db.data?.proxies || [];
}

export function getProxyById(id: string): Proxy | undefined {
  return db.data?.proxies.find((p) => p.id === id);
}

export async function createProxy(proxy: Proxy): Promise<Proxy> {
  db.data?.proxies.push(proxy);
  await db.write();
  return proxy;
}

export async function updateProxy(id: string, updates: Partial<Proxy>): Promise<Proxy | null> {
  const index = db.data?.proxies.findIndex((p) => p.id === id) ?? -1;
  if (index === -1) return null;
  const proxy = { ...db.data!.proxies[index], ...updates, updatedAt: Date.now() };
  db.data!.proxies[index] = proxy;
  await db.write();
  return proxy;
}

export async function deleteProxy(id: string): Promise<boolean> {
  const index = db.data?.proxies.findIndex((p) => p.id === id) ?? -1;
  if (index === -1) return false;
  db.data!.proxies.splice(index, 1);
  // Remove proxy references from channels
  for (const channel of db.data!.channels) {
    if (channel.proxyId === id) {
      channel.proxyId = undefined;
    }
  }
  await db.write();
  return true;
}

// Token operations
export function getTokens(): Token[] {
  return db.data?.tokens || [];
}

export function getTokenById(id: string): Token | undefined {
  return db.data?.tokens.find((t) => t.id === id);
}

export function getTokenByValue(token: string): Token | undefined {
  return db.data?.tokens.find((t) => t.token === token);
}

export async function createToken(token: Token): Promise<Token> {
  db.data?.tokens.push(token);
  await db.write();
  return token;
}

export async function updateToken(id: string, updates: Partial<Token>): Promise<Token | null> {
  const index = db.data?.tokens.findIndex((t) => t.id === id) ?? -1;
  if (index === -1) return null;
  const token = { ...db.data!.tokens[index], ...updates };
  db.data!.tokens[index] = token;
  await db.write();
  return token;
}

export async function deleteToken(id: string): Promise<boolean> {
  const index = db.data?.tokens.findIndex((t) => t.id === id) ?? -1;
  if (index === -1) return false;
  db.data!.tokens.splice(index, 1);
  await db.write();
  return true;
}

// Log operations
export function getLogs(filters?: {
  channelId?: string;
  status?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): { logs: RequestLog[]; total: number } {
  let logs = db.data?.logs || [];

  if (filters?.channelId) {
    logs = logs.filter((l) => l.channelId === filters.channelId);
  }
  if (filters?.status) {
    logs = logs.filter((l) => l.status === filters.status);
  }
  if (filters?.startTime) {
    logs = logs.filter((l) => l.timestamp >= filters.startTime!);
  }
  if (filters?.endTime) {
    logs = logs.filter((l) => l.timestamp <= filters.endTime!);
  }

  // Sort by timestamp desc
  logs = logs.sort((a, b) => b.timestamp - a.timestamp);

  const total = logs.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;

  return {
    logs: logs.slice(offset, offset + limit),
    total,
  };
}

export async function addLog(log: RequestLog): Promise<void> {
  db.data?.logs.push(log);
  // Cleanup old logs
  const maxRetention = db.data?.settings.maxLogsRetention || 604800000;
  const cutoff = Date.now() - maxRetention;
  db.data!.logs = db.data!.logs.filter((l) => l.timestamp > cutoff);
  await db.write();
}

export function getLogsForStats(since: number): RequestLog[] {
  return (db.data?.logs || []).filter((l) => l.timestamp >= since);
}

import type {
  Channel,
  ApiKey,
  Proxy,
  Token,
  RequestLog,
  DashboardStats,
  CreateChannelRequest,
  UpdateChannelRequest,
  CreateApiKeyRequest,
  ImportApiKeysRequest,
  UpdateApiKeyRequest,
  CreateProxyRequest,
  UpdateProxyRequest,
  CreateTokenRequest,
  ApiResponse,
} from '@key-hub/shared';

const API_BASE = '/api';

async function fetchApi<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  return res.json();
}

// Channels
export async function getChannels(): Promise<Channel[]> {
  const res = await fetchApi<Channel[]>('/channels');
  return res.data || [];
}

export async function createChannel(data: CreateChannelRequest): Promise<Channel> {
  const res = await fetchApi<Channel>('/channels', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function updateChannel(id: string, data: UpdateChannelRequest): Promise<Channel> {
  const res = await fetchApi<Channel>(`/channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function deleteChannel(id: string): Promise<void> {
  const res = await fetchApi(`/channels/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error as string);
}

// Keys
export async function getKeys(channelId?: string): Promise<ApiKey[]> {
  const query = channelId ? `?channelId=${channelId}` : '';
  const res = await fetchApi<ApiKey[]>(`/keys${query}`);
  return res.data || [];
}

export async function createKey(data: CreateApiKeyRequest): Promise<ApiKey> {
  const res = await fetchApi<ApiKey>('/keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function importKeys(data: ImportApiKeysRequest): Promise<{ imported: number }> {
  const res = await fetchApi<{ imported: number }>('/keys/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function updateKey(id: string, data: UpdateApiKeyRequest): Promise<ApiKey> {
  const res = await fetchApi<ApiKey>(`/keys/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function deleteKey(id: string): Promise<void> {
  const res = await fetchApi(`/keys/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error as string);
}

export async function checkKey(id: string): Promise<ApiKey> {
  const res = await fetchApi<ApiKey>(`/keys/${id}/check`, { method: 'POST' });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function checkAllKeys(): Promise<void> {
  const res = await fetchApi('/keys/check-all', { method: 'POST' });
  if (!res.success) throw new Error(res.error as string);
}

// Proxies
export async function getProxies(): Promise<Proxy[]> {
  const res = await fetchApi<Proxy[]>('/proxies');
  return res.data || [];
}

export async function createProxy(data: CreateProxyRequest): Promise<Proxy> {
  const res = await fetchApi<Proxy>('/proxies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function updateProxy(id: string, data: UpdateProxyRequest): Promise<Proxy> {
  const res = await fetchApi<Proxy>(`/proxies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function deleteProxy(id: string): Promise<void> {
  const res = await fetchApi(`/proxies/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error as string);
}

export async function testProxy(id: string): Promise<{ success: boolean; latency?: number; error?: string }> {
  const res = await fetchApi<{ success: boolean; latency?: number; error?: string }>(`/proxies/${id}/test`, {
    method: 'POST',
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

// Tokens
export async function getTokens(): Promise<Token[]> {
  const res = await fetchApi<Token[]>('/tokens');
  return res.data || [];
}

export async function createToken(data: CreateTokenRequest): Promise<Token> {
  const res = await fetchApi<Token>('/tokens', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.success) throw new Error(res.error as string);
  return res.data!;
}

export async function deleteToken(id: string): Promise<void> {
  const res = await fetchApi(`/tokens/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error as string);
}

// Stats
export async function getStats(): Promise<DashboardStats> {
  const res = await fetchApi<DashboardStats>('/stats');
  return res.data!;
}

// Logs
export async function getLogs(params?: {
  channelId?: string;
  status?: number;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<{ logs: RequestLog[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.channelId) query.set('channelId', params.channelId);
  if (params?.status) query.set('status', params.status.toString());
  if (params?.startTime) query.set('startTime', params.startTime.toString());
  if (params?.endTime) query.set('endTime', params.endTime.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.offset) query.set('offset', params.offset.toString());
  const queryStr = query.toString();
  const res = await fetchApi<{ logs: RequestLog[]; total: number }>(`/stats/logs${queryStr ? `?${queryStr}` : ''}`);
  return res.data || { logs: [], total: 0 };
}

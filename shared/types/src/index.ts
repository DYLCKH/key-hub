// Channel (渠道/服务商)
export interface Channel {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'gemini' | 'openai-compatible';
  baseUrl: string;
  testMethod: 'balance' | 'chat' | 'models';
  testModel?: string;
  proxyId?: string;
  loadBalanceStrategy: LoadBalanceStrategy;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ApiKey (密钥)
export interface ApiKey {
  id: string;
  channelId: string;
  key: string;
  alias?: string;
  status: ApiKeyStatus;
  priority: number;
  weight: number;
  balance?: number;
  lastChecked?: number;
  lastUsed?: number;
  errorCount: number;
  totalRequests: number;
  createdAt: number;
  updatedAt: number;
}

export type ApiKeyStatus = 'active' | 'invalid' | 'quota_exceeded' | 'disabled' | 'unknown';

// Proxy (代理配置)
export interface Proxy {
  id: string;
  name: string;
  type: 'socks5' | 'socks5h' | 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// Token (访问令牌)
export interface Token {
  id: string;
  name: string;
  token: string;
  allowedChannels: string[];
  rateLimit?: number;
  enabled: boolean;
  createdAt: number;
  lastUsed?: number;
}

// Load Balance Strategy
export type LoadBalanceStrategy = 'round-robin' | 'weighted' | 'priority' | 'least-used';

// Request Log
export interface RequestLog {
  id: string;
  timestamp: number;
  tokenId?: string;
  channelId: string;
  keyId: string;
  model: string;
  path: string;
  method: string;
  status: number;
  latency: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  streaming: boolean;
}

// API Request/Response Types
export interface CreateChannelRequest {
  name: string;
  type: Channel['type'];
  baseUrl: string;
  testMethod: Channel['testMethod'];
  testModel?: string;
  proxyId?: string;
  loadBalanceStrategy?: LoadBalanceStrategy;
  enabled?: boolean;
}

export interface UpdateChannelRequest {
  name?: string;
  type?: Channel['type'];
  baseUrl?: string;
  testMethod?: Channel['testMethod'];
  testModel?: string;
  proxyId?: string | null;
  loadBalanceStrategy?: LoadBalanceStrategy;
  enabled?: boolean;
}

export interface CreateApiKeyRequest {
  channelId: string;
  key: string;
  alias?: string;
  priority?: number;
  weight?: number;
}

export interface ImportApiKeysRequest {
  channelId: string;
  keys: string;
  delimiter?: string;
}

export interface UpdateApiKeyRequest {
  alias?: string;
  priority?: number;
  weight?: number;
  status?: ApiKeyStatus;
}

export interface CreateProxyRequest {
  name: string;
  type: Proxy['type'];
  host: string;
  port: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

export interface UpdateProxyRequest {
  name?: string;
  type?: Proxy['type'];
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  enabled?: boolean;
}

export interface CreateTokenRequest {
  name: string;
  allowedChannels?: string[];
  rateLimit?: number;
  enabled?: boolean;
}

export interface UpdateTokenRequest {
  name?: string;
  allowedChannels?: string[];
  rateLimit?: number;
  enabled?: boolean;
}

// Stats
export interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  invalidKeys: number;
  quotaExceededKeys: number;
  disabledKeys: number;
  totalChannels: number;
  activeChannels: number;
  totalRequests24h: number;
  successRate24h: number;
  channelStats: ChannelStats[];
}

export interface ChannelStats {
  channelId: string;
  channelName: string;
  channelType: Channel['type'];
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  successRate: number;
}

// Key Check Result
export interface KeyCheckResult {
  keyId: string;
  status: ApiKeyStatus;
  balance?: number;
  error?: string;
  checkedAt: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Log filters
export interface LogFilters extends PaginatedRequest {
  channelId?: string;
  status?: number;
  startTime?: number;
  endTime?: number;
  model?: string;
}

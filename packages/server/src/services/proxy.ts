import type { Proxy } from '@key-hub/shared';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type { Agent } from 'http';

export function createProxyAgent(proxy: Proxy): Agent {
  const auth = proxy.username && proxy.password
    ? `${proxy.username}:${proxy.password}@`
    : '';

  if (proxy.type === 'socks5' || proxy.type === 'socks5h') {
    const url = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
    return new SocksProxyAgent(url);
  } else {
    const url = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
    return new HttpsProxyAgent(url);
  }
}

export async function testProxyConnection(proxy: Proxy): Promise<{ success: boolean; error?: string; latency?: number }> {
  const start = Date.now();

  try {
    const agent = createProxyAgent(proxy);

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'HEAD',
      // @ts-expect-error - agent type mismatch
      agent,
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - start;

    return {
      success: true,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

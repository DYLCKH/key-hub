import type { ApiKey, LoadBalanceStrategy } from '@key-hub/shared';

// Round-robin state per channel
const roundRobinIndex = new Map<string, number>();

export function selectKey(
  keys: ApiKey[],
  strategy: LoadBalanceStrategy,
  channelId: string
): ApiKey | null {
  const activeKeys = keys.filter((k) => k.status === 'active');
  if (activeKeys.length === 0) return null;

  switch (strategy) {
    case 'round-robin':
      return roundRobinSelect(activeKeys, channelId);
    case 'weighted':
      return weightedSelect(activeKeys);
    case 'priority':
      return prioritySelect(activeKeys);
    case 'least-used':
      return leastUsedSelect(activeKeys);
    default:
      return roundRobinSelect(activeKeys, channelId);
  }
}

function roundRobinSelect(keys: ApiKey[], channelId: string): ApiKey {
  const currentIndex = roundRobinIndex.get(channelId) || 0;
  const key = keys[currentIndex % keys.length];
  roundRobinIndex.set(channelId, (currentIndex + 1) % keys.length);
  return key;
}

function weightedSelect(keys: ApiKey[]): ApiKey {
  const totalWeight = keys.reduce((sum, k) => sum + k.weight, 0);
  if (totalWeight === 0) return keys[Math.floor(Math.random() * keys.length)];

  let random = Math.random() * totalWeight;
  for (const key of keys) {
    random -= key.weight;
    if (random <= 0) return key;
  }
  return keys[keys.length - 1];
}

function prioritySelect(keys: ApiKey[]): ApiKey {
  const sorted = [...keys].sort((a, b) => b.priority - a.priority);
  // Return highest priority key with lowest error count
  const highestPriority = sorted[0].priority;
  const topKeys = sorted.filter((k) => k.priority === highestPriority);
  return topKeys.reduce((best, k) => (k.errorCount < best.errorCount ? k : best), topKeys[0]);
}

function leastUsedSelect(keys: ApiKey[]): ApiKey {
  return keys.reduce((least, k) => (k.totalRequests < least.totalRequests ? k : least), keys[0]);
}

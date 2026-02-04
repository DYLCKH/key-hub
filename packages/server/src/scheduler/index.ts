import cron from 'node-cron';
import { getChannels, getApiKeys, updateApiKey, getChannelById } from '../db/index.js';
import { checkKey } from '../services/keyChecker.js';

let scheduledTask: cron.ScheduledTask | null = null;

export function startScheduler(cronExpression = '0 * * * *'): void {
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Starting key check job...');
    await runKeyCheck();
    console.log('[Scheduler] Key check job completed.');
  });

  console.log(`[Scheduler] Key check scheduled with cron: ${cronExpression}`);
}

export function stopScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] Stopped.');
  }
}

export async function runKeyCheck(): Promise<void> {
  const channels = getChannels().filter((c) => c.enabled);
  const allKeys = getApiKeys();

  for (const channel of channels) {
    const channelKeys = allKeys.filter(
      (k) => k.channelId === channel.id && k.status !== 'disabled'
    );

    console.log(`[Scheduler] Checking ${channelKeys.length} keys for channel: ${channel.name}`);

    for (const key of channelKeys) {
      try {
        const result = await checkKey(channel, key);
        await updateApiKey(key.id, {
          status: result.status,
          balance: result.balance,
          lastChecked: result.checkedAt,
          errorCount: result.status === 'active' ? 0 : key.errorCount + 1,
        });
      } catch (error) {
        console.error(`[Scheduler] Error checking key ${key.id}:`, error);
      }

      // Small delay between checks
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function checkSingleKey(keyId: string): Promise<void> {
  const keys = getApiKeys();
  const key = keys.find((k) => k.id === keyId);
  if (!key) throw new Error('Key not found');

  const channel = getChannelById(key.channelId);
  if (!channel) throw new Error('Channel not found');

  const result = await checkKey(channel, key);
  await updateApiKey(key.id, {
    status: result.status,
    balance: result.balance,
    lastChecked: result.checkedAt,
    errorCount: result.status === 'active' ? 0 : key.errorCount + 1,
  });
}

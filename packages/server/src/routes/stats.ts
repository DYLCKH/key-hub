import { Router } from 'express';
import {
  getApiKeys,
  getChannels,
  getLogsForStats,
  getLogs,
} from '../db/index.js';
import type { DashboardStats, ChannelStats } from '@key-hub/shared';

const router = Router();

// GET /api/stats
router.get('/', (_req, res) => {
  const channels = getChannels();
  const keys = getApiKeys();
  const last24h = Date.now() - 86400000;
  const recentLogs = getLogsForStats(last24h);

  const totalRequests24h = recentLogs.length;
  const successRequests24h = recentLogs.filter((l) => l.status >= 200 && l.status < 400).length;
  const successRate24h = totalRequests24h > 0 ? successRequests24h / totalRequests24h : 0;

  const channelStats: ChannelStats[] = channels.map((c) => {
    const channelKeys = keys.filter((k) => k.channelId === c.id);
    const channelLogs = recentLogs.filter((l) => l.channelId === c.id);
    const channelSuccess = channelLogs.filter((l) => l.status >= 200 && l.status < 400).length;

    return {
      channelId: c.id,
      channelName: c.name,
      channelType: c.type,
      totalKeys: channelKeys.length,
      activeKeys: channelKeys.filter((k) => k.status === 'active').length,
      totalRequests: channelLogs.length,
      successRate: channelLogs.length > 0 ? channelSuccess / channelLogs.length : 0,
    };
  });

  const stats: DashboardStats = {
    totalKeys: keys.length,
    activeKeys: keys.filter((k) => k.status === 'active').length,
    invalidKeys: keys.filter((k) => k.status === 'invalid').length,
    quotaExceededKeys: keys.filter((k) => k.status === 'quota_exceeded').length,
    disabledKeys: keys.filter((k) => k.status === 'disabled').length,
    totalChannels: channels.length,
    activeChannels: channels.filter((c) => c.enabled).length,
    totalRequests24h,
    successRate24h,
    channelStats,
  };

  res.json({ success: true, data: stats });
});

// GET /api/logs
router.get('/logs', (req, res) => {
  const channelId = req.query.channelId as string | undefined;
  const status = req.query.status ? parseInt(req.query.status as string) : undefined;
  const startTime = req.query.startTime ? parseInt(req.query.startTime as string) : undefined;
  const endTime = req.query.endTime ? parseInt(req.query.endTime as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

  const result = getLogs({ channelId, status, startTime, endTime, limit, offset });
  res.json({ success: true, data: result });
});

export default router;

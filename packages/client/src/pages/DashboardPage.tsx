import { useQuery } from '@tanstack/react-query';
import { getStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Server, Activity, CheckCircle, XCircle, AlertTriangle, Ban } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const statusCards = [
    {
      title: 'Total Keys',
      value: stats?.totalKeys || 0,
      icon: Key,
      color: 'text-blue-500',
    },
    {
      title: 'Active Keys',
      value: stats?.activeKeys || 0,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Invalid Keys',
      value: stats?.invalidKeys || 0,
      icon: XCircle,
      color: 'text-red-500',
    },
    {
      title: 'Quota Exceeded',
      value: stats?.quotaExceededKeys || 0,
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
    {
      title: 'Disabled Keys',
      value: stats?.disabledKeys || 0,
      icon: Ban,
      color: 'text-gray-500',
    },
    {
      title: 'Active Channels',
      value: `${stats?.activeChannels || 0}/${stats?.totalChannels || 0}`,
      icon: Server,
      color: 'text-purple-500',
    },
  ];

  const chartData = stats?.channelStats?.map((c) => ({
    name: c.channelName,
    requests: c.totalRequests,
    successRate: Math.round(c.successRate * 100),
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {stats?.totalRequests24h || 0} requests (24h)
          </span>
          <Badge variant={stats?.successRate24h && stats.successRate24h > 0.95 ? 'success' : 'warning'}>
            {Math.round((stats?.successRate24h || 0) * 100)}% success
          </Badge>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statusCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Channel Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.channelStats && stats.channelStats.length > 0 ? (
              <div className="space-y-4">
                {stats.channelStats.map((c) => (
                  <div key={c.channelId} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.channelName}</div>
                      <div className="text-sm text-muted-foreground">
                        {c.activeKeys}/{c.totalKeys} active keys
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{c.totalRequests} requests</div>
                      <Badge variant={c.successRate > 0.95 ? 'success' : c.successRate > 0.8 ? 'warning' : 'destructive'}>
                        {Math.round(c.successRate * 100)}% success
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No channels configured yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requests by Channel (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No request data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

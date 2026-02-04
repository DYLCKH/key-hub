import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLogs, getChannels } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function LogsPage() {
  const [page, setPage] = useState(0);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const limit = 50;

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['logs', page, channelFilter, statusFilter],
    queryFn: () =>
      getLogs({
        offset: page * limit,
        limit,
        channelId: channelFilter !== 'all' ? channelFilter : undefined,
        status: statusFilter !== 'all' ? parseInt(statusFilter) : undefined,
      }),
    refetchInterval: 10000,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getChannelName = (channelId: string) =>
    channels.find((c) => c.id === channelId)?.name || 'Unknown';

  const formatTime = (ts: number) => new Date(ts).toLocaleString();

  const getStatusBadgeVariant = (status: number) => {
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'warning';
    if (status >= 500) return 'destructive';
    return 'outline';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Request Logs</h1>
        <div className="text-sm text-muted-foreground">{total} total requests</div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="200">2xx Success</SelectItem>
              <SelectItem value="400">4xx Client Error</SelectItem>
              <SelectItem value="500">5xx Server Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No logs found</h3>
          <p className="text-muted-foreground">
            Request logs will appear here when you start using the API
          </p>
        </div>
      ) : (
        <>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Streaming</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </TableCell>
                    <TableCell>{getChannelName(log.channelId)}</TableCell>
                    <TableCell className="font-mono text-sm">{log.model}</TableCell>
                    <TableCell className="font-mono text-sm">{log.path}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(log.status)}>{log.status}</Badge>
                    </TableCell>
                    <TableCell>{log.latency}ms</TableCell>
                    <TableCell>
                      {log.streaming ? (
                        <Badge variant="outline">SSE</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-destructive">
                      {log.error || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getKeys,
  getChannels,
  createKey,
  importKeys,
  updateKey,
  deleteKey,
  checkKey,
  checkAllKeys,
} from '@/lib/api';
import type { ApiKey, ApiKeyStatus } from '@key-hub/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Upload,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Key,
} from 'lucide-react';

const statusBadgeVariant: Record<ApiKeyStatus, 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
  active: 'success',
  invalid: 'destructive',
  quota_exceeded: 'warning',
  disabled: 'secondary',
  unknown: 'outline',
};

export default function KeysPage() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add form
  const [addForm, setAddForm] = useState({ channelId: '', key: '', alias: '' });
  // Import form
  const [importForm, setImportForm] = useState({ channelId: '', keys: '' });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['keys'],
    queryFn: () => getKeys(),
  });

  const createMutation = useMutation({
    mutationFn: createKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setAddDialogOpen(false);
      setAddForm({ channelId: '', key: '', alias: '' });
    },
  });

  const importMutation = useMutation({
    mutationFn: importKeys,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setImportDialogOpen(false);
      setImportForm({ channelId: '', keys: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApiKey> }) => updateKey(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    },
  });

  const checkMutation = useMutation({
    mutationFn: checkKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['keys'] }),
  });

  const checkAllMutation = useMutation({
    mutationFn: checkAllKeys,
    onSuccess: () => {
      // Refetch after a delay since check runs in background
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['keys'] }), 3000);
    },
  });

  const filteredKeys = keys.filter((k) => {
    if (selectedChannel !== 'all' && k.channelId !== selectedChannel) return false;
    if (statusFilter !== 'all' && k.status !== statusFilter) return false;
    return true;
  });

  const getChannelName = (channelId: string) =>
    channels.find((c) => c.id === channelId)?.name || 'Unknown';

  const formatTime = (ts?: number) =>
    ts ? new Date(ts).toLocaleString() : 'Never';

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => checkAllMutation.mutate()} disabled={checkAllMutation.isPending}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Check All
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Key
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="quota_exceeded">Quota Exceeded</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground flex items-center">
          {filteredKeys.length} keys
        </div>
      </div>

      {filteredKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Key className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No API keys</h3>
          <p className="text-muted-foreground mb-4">
            Add keys manually or import them in bulk
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div>
                      <div className="font-mono text-sm">{key.key}</div>
                      {key.alias && (
                        <div className="text-xs text-muted-foreground">{key.alias}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getChannelName(key.channelId)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant[key.status]}>{key.status}</Badge>
                  </TableCell>
                  <TableCell>{key.priority}</TableCell>
                  <TableCell>{key.weight}</TableCell>
                  <TableCell>{key.balance != null ? `$${key.balance.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{key.totalRequests}</TableCell>
                  <TableCell className="text-xs">{formatTime(key.lastChecked)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => checkMutation.mutate(key.id)}
                        disabled={checkMutation.isPending}
                        title="Check key"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newStatus = key.status === 'disabled' ? 'unknown' : 'disabled';
                          updateMutation.mutate({ id: key.id, data: { status: newStatus } });
                        }}
                        title={key.status === 'disabled' ? 'Enable' : 'Disable'}
                      >
                        <Switch checked={key.status !== 'disabled'} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setKeyToDelete(key);
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Key Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add API Key</DialogTitle>
            <DialogDescription>Add a single API key to a channel</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={addForm.channelId} onValueChange={(v) => setAddForm({ ...addForm, channelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                value={addForm.key}
                onChange={(e) => setAddForm({ ...addForm, key: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-2">
              <Label>Alias (optional)</Label>
              <Input
                value={addForm.alias}
                onChange={(e) => setAddForm({ ...addForm, alias: e.target.value })}
                placeholder="My key"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(addForm)}
              disabled={!addForm.channelId || !addForm.key || createMutation.isPending}
            >
              Add Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Keys Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Import API Keys</DialogTitle>
            <DialogDescription>Paste multiple API keys, one per line</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={importForm.channelId}
                onValueChange={(v) => setImportForm({ ...importForm, channelId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Keys (one per line)</Label>
              <Textarea
                value={importForm.keys}
                onChange={(e) => setImportForm({ ...importForm, keys: e.target.value })}
                placeholder="sk-key1...&#10;sk-key2...&#10;sk-key3..."
                rows={10}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => importMutation.mutate(importForm)}
              disabled={!importForm.channelId || !importForm.keys || importMutation.isPending}
            >
              Import Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this key ({keyToDelete?.key})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteMutation.mutate(keyToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

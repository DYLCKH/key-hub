import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProxies, createProxy, updateProxy, deleteProxy, testProxy } from '@/lib/api';
import type { Proxy, CreateProxyRequest } from '@key-hub/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Pencil, Trash2, Globe, Zap } from 'lucide-react';

const proxyTypes = [
  { value: 'socks5', label: 'SOCKS5' },
  { value: 'socks5h', label: 'SOCKS5h' },
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
];

export default function ProxiesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const [proxyToDelete, setProxyToDelete] = useState<Proxy | null>(null);
  const [testResult, setTestResult] = useState<{ proxyId: string; success: boolean; latency?: number; error?: string } | null>(null);

  const [formData, setFormData] = useState<CreateProxyRequest>({
    name: '',
    type: 'socks5',
    host: '',
    port: 1080,
    username: '',
    password: '',
    enabled: true,
  });

  const { data: proxies = [], isLoading } = useQuery({
    queryKey: ['proxies'],
    queryFn: getProxies,
  });

  const createMutation = useMutation({
    mutationFn: createProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Proxy> }) =>
      updateProxy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      setDialogOpen(false);
      setEditingProxy(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies'] });
      setDeleteDialogOpen(false);
      setProxyToDelete(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: testProxy,
    onSuccess: (data, proxyId) => {
      setTestResult({ proxyId, ...data });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'socks5',
      host: '',
      port: 1080,
      username: '',
      password: '',
      enabled: true,
    });
  };

  const handleCreate = () => {
    setEditingProxy(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (proxy: Proxy) => {
    setEditingProxy(proxy);
    setFormData({
      name: proxy.name,
      type: proxy.type,
      host: proxy.host,
      port: proxy.port,
      username: proxy.username || '',
      password: '',
      enabled: proxy.enabled,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = { ...formData };
    if (!data.username) delete data.username;
    if (!data.password) delete data.password;

    if (editingProxy) {
      updateMutation.mutate({ id: editingProxy.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleEnabled = (proxy: Proxy) => {
    updateMutation.mutate({ id: proxy.id, data: { enabled: !proxy.enabled } });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Proxies</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Proxy
        </Button>
      </div>

      {proxies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No proxies configured</h3>
            <p className="text-muted-foreground mb-4">
              Add a proxy to route API requests through it
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Proxy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proxies.map((proxy) => (
            <Card key={proxy.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{proxy.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        {proxyTypes.find((t) => t.value === proxy.type)?.label}
                      </Badge>
                      <Badge variant={proxy.enabled ? 'success' : 'secondary'}>
                        {proxy.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={proxy.enabled}
                    onCheckedChange={() => handleToggleEnabled(proxy)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Address</span>
                    <span className="font-mono">{proxy.host}:{proxy.port}</span>
                  </div>
                  {proxy.username && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span>{proxy.username}</span>
                    </div>
                  )}
                  {testResult && testResult.proxyId === proxy.id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Test Result</span>
                      <span>
                        {testResult.success ? (
                          <Badge variant="success">{testResult.latency}ms</Badge>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(proxy.id)}
                    disabled={testMutation.isPending}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(proxy)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProxyToDelete(proxy);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProxy ? 'Edit Proxy' : 'Add Proxy'}</DialogTitle>
            <DialogDescription>Configure a proxy server for API requests</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Proxy"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {proxyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host</Label>
                <Input
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="127.0.0.1"
                />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                  placeholder="1080"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username (optional)</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="user"
                />
              </div>
              <div className="space-y-2">
                <Label>Password (optional)</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="****"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.host || createMutation.isPending || updateMutation.isPending}
            >
              {editingProxy ? 'Save Changes' : 'Create Proxy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proxy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{proxyToDelete?.name}"? Channels using this proxy will no longer use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => proxyToDelete && deleteMutation.mutate(proxyToDelete.id)}
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

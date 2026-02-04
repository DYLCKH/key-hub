import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getChannels, getProxies, createChannel, updateChannel, deleteChannel } from '@/lib/api';
import type { Channel, CreateChannelRequest } from '@key-hub/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Plus, Pencil, Trash2, Server } from 'lucide-react';

const channelTypes = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
];

const testMethods = [
  { value: 'models', label: 'Model List' },
  { value: 'chat', label: 'Chat Test' },
  { value: 'balance', label: 'Balance Query' },
];

const loadBalanceStrategies = [
  { value: 'round-robin', label: 'Round Robin' },
  { value: 'weighted', label: 'Weighted Random' },
  { value: 'priority', label: 'Priority' },
  { value: 'least-used', label: 'Least Used' },
];

const defaultBaseUrls: Record<string, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  gemini: 'https://generativelanguage.googleapis.com',
  'openai-compatible': '',
};

export default function ChannelsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const [formData, setFormData] = useState<CreateChannelRequest>({
    name: '',
    type: 'openai',
    baseUrl: defaultBaseUrls.openai,
    testMethod: 'models',
    testModel: '',
    proxyId: undefined,
    loadBalanceStrategy: 'round-robin',
    enabled: true,
  });

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const { data: proxies = [] } = useQuery({
    queryKey: ['proxies'],
    queryFn: getProxies,
  });

  const createMutation = useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Channel> }) =>
      updateChannel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      setDialogOpen(false);
      setEditingChannel(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['keys'] });
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'openai',
      baseUrl: defaultBaseUrls.openai,
      testMethod: 'models',
      testModel: '',
      proxyId: undefined,
      loadBalanceStrategy: 'round-robin',
      enabled: true,
    });
  };

  const handleCreate = () => {
    setEditingChannel(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      baseUrl: channel.baseUrl,
      testMethod: channel.testMethod,
      testModel: channel.testModel || '',
      proxyId: channel.proxyId,
      loadBalanceStrategy: channel.loadBalanceStrategy,
      enabled: channel.enabled,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleTypeChange = (type: Channel['type']) => {
    setFormData({
      ...formData,
      type,
      baseUrl: defaultBaseUrls[type] || formData.baseUrl,
    });
  };

  const handleToggleEnabled = (channel: Channel) => {
    updateMutation.mutate({ id: channel.id, data: { enabled: !channel.enabled } });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Channels</h1>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Channel
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No channels configured</h3>
            <p className="text-muted-foreground mb-4">
              Add a channel to start managing your API keys
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <Card key={channel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{channel.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mr-2">
                        {channelTypes.find((t) => t.value === channel.type)?.label}
                      </Badge>
                      <Badge variant={channel.enabled ? 'success' : 'secondary'}>
                        {channel.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={() => handleToggleEnabled(channel)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base URL</span>
                    <span className="truncate max-w-[200px]" title={channel.baseUrl}>
                      {channel.baseUrl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Test Method</span>
                    <span>{testMethods.find((t) => t.value === channel.testMethod)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Load Balance</span>
                    <span>
                      {loadBalanceStrategies.find((s) => s.value === channel.loadBalanceStrategy)?.label}
                    </span>
                  </div>
                  {channel.proxyId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Proxy</span>
                      <span>{proxies.find((p) => p.id === channel.proxyId)?.name || 'Unknown'}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(channel)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChannelToDelete(channel);
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingChannel ? 'Edit Channel' : 'Add Channel'}</DialogTitle>
            <DialogDescription>
              Configure a new LLM provider channel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My OpenAI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Provider Type</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channelTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.openai.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testMethod">Test Method</Label>
                <Select
                  value={formData.testMethod}
                  onValueChange={(v) => setFormData({ ...formData, testMethod: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="testModel">Test Model (optional)</Label>
                <Input
                  id="testModel"
                  value={formData.testModel}
                  onChange={(e) => setFormData({ ...formData, testModel: e.target.value })}
                  placeholder="gpt-3.5-turbo"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loadBalance">Load Balance Strategy</Label>
                <Select
                  value={formData.loadBalanceStrategy}
                  onValueChange={(v) => setFormData({ ...formData, loadBalanceStrategy: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loadBalanceStrategies.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proxy">Proxy (optional)</Label>
                <Select
                  value={formData.proxyId || 'none'}
                  onValueChange={(v) =>
                    setFormData({ ...formData, proxyId: v === 'none' ? undefined : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No proxy</SelectItem>
                    {proxies
                      .filter((p) => p.enabled)
                      .map((proxy) => (
                        <SelectItem key={proxy.id} value={proxy.id}>
                          {proxy.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingChannel ? 'Save Changes' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{channelToDelete?.name}"? This will also delete all
              associated API keys. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => channelToDelete && deleteMutation.mutate(channelToDelete.id)}
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

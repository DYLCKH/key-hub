import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTokens, getChannels, createToken, deleteToken } from '@/lib/api';
import type { Token, CreateTokenRequest } from '@key-hub/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Copy, Check, Ticket } from 'lucide-react';

export default function TokensPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTokenDialogOpen, setNewTokenDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState<Token | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<Token | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<CreateTokenRequest>({
    name: '',
    allowedChannels: [],
    rateLimit: undefined,
    enabled: true,
  });

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: getTokens,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });

  const createMutation = useMutation({
    mutationFn: createToken,
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      setCreateDialogOpen(false);
      setNewToken(token);
      setNewTokenDialogOpen(true);
      setFormData({ name: '', allowedChannels: [], rateLimit: undefined, enabled: true });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      setDeleteDialogOpen(false);
      setTokenToDelete(null);
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (ts?: number) => (ts ? new Date(ts).toLocaleString() : 'Never');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Access Tokens</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      </div>

      {tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No access tokens</h3>
            <p className="text-muted-foreground mb-4">
              Create a token to access the OpenAI-compatible API
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Allowed Channels</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell className="font-mono text-sm">{token.token}</TableCell>
                  <TableCell>
                    {token.allowedChannels.length === 0 ? (
                      <Badge variant="outline">All</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {token.allowedChannels.map((cid) => (
                          <Badge key={cid} variant="secondary">
                            {channels.find((c) => c.id === cid)?.name || cid}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {token.rateLimit ? `${token.rateLimit}/min` : 'Unlimited'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={token.enabled ? 'success' : 'secondary'}>
                      {token.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatTime(token.createdAt)}</TableCell>
                  <TableCell className="text-sm">{formatTime(token.lastUsed)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTokenToDelete(token);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Token Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Access Token</DialogTitle>
            <DialogDescription>
              Create a new token for accessing the OpenAI-compatible API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Token"
              />
            </div>
            <div className="space-y-2">
              <Label>Rate Limit (requests per minute, optional)</Label>
              <Input
                type="number"
                value={formData.rateLimit || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rateLimit: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label>Allowed Channels (leave empty for all)</Label>
              <div className="flex flex-wrap gap-2">
                {channels.map((c) => (
                  <Button
                    key={c.id}
                    variant={formData.allowedChannels?.includes(c.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      const current = formData.allowedChannels || [];
                      const updated = current.includes(c.id)
                        ? current.filter((id) => id !== c.id)
                        : [...current, c.id];
                      setFormData({ ...formData, allowedChannels: updated });
                    }}
                  >
                    {c.name}
                  </Button>
                ))}
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              Create Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Token Display Dialog */}
      <Dialog open={newTokenDialogOpen} onOpenChange={setNewTokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Created</DialogTitle>
            <DialogDescription>
              Copy this token now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <code className="flex-1 font-mono text-sm break-all">{newToken?.token}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => newToken && copyToClipboard(newToken.token)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewTokenDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Token</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{tokenToDelete?.name}"? Applications using this token
              will no longer be able to access the API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => tokenToDelete && deleteMutation.mutate(tokenToDelete.id)}
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

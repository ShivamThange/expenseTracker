'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';

type Group = {
  id: string;
  name: string;
  description?: string;
  currency: string;
  memberIds: string[];
  createdAt: string;
};

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD' });

  const { data, isLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Group created!');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setOpen(false);
      setForm({ name: '', description: '', currency: 'USD' });
    },
    onError: () => toast.error('Something went wrong'),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your shared expense groups</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button>➕ New Group</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Group name *</Label>
                <Input id="name" placeholder="e.g. Paris Trip 2025" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" placeholder="What's this group for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'SGD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={!form.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-medium text-lg">No groups yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">Create a group and invite your friends or roommates</p>
            <Button onClick={() => setOpen(true)}>Create your first group</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{group.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">{group.currency}</Badge>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                    <span className="mx-2">·</span>
                    {new Date(group.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

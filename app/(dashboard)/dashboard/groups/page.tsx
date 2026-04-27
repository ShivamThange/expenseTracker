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
import { Contact, Plus } from 'lucide-react';

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
  const [form, setForm] = useState({ name: '', description: '', currency: 'INR' });

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
      setForm({ name: '', description: '', currency: 'INR' });
    },
    onError: () => toast.error('Something went wrong'),
  });

  const groups = data?.groups ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Manage</p>
          <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">Groups</h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">Manage your expense groups</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={
            <Button className="neon-glow rounded-lg font-bold text-xs h-9 px-5 gap-2 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Create group
            </Button>
          } />
          <DialogContent className="bg-card border-border/50 rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-display italic font-black text-xl tracking-tight">Create group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Group name *</Label>
                <Input id="name" placeholder="e.g. Roommates, Trip, Dinner" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[var(--surface-input)] rounded-lg input-glow border-border focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Description</Label>
                <Textarea id="desc" placeholder="Add details about this group..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="bg-[var(--surface-input)] rounded-lg input-glow border-border focus:border-primary resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger className="bg-[var(--surface-input)] rounded-lg border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50 rounded-xl">
                    {['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'].map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full neon-glow rounded-lg font-bold mt-4" disabled={!form.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? 'Creating…' : 'Create group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl bg-muted" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-xl mb-5">
              <span className="text-primary text-xl">+</span>
            </div>
            <p className="font-bold text-sm mb-1.5">No groups yet</p>
            <p className="text-muted-foreground text-xs mb-7 font-light">Create your first group to start tracking expenses</p>
            <Button onClick={() => setOpen(true)} className="neon-glow rounded-lg font-bold text-xs px-6 h-9">Create group</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="card-glass card-hover rounded-xl cursor-pointer h-full border-border/50 hover:border-primary/25 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-bold text-foreground leading-snug">{group.name}</CardTitle>
                    <Badge className="badge-azure shrink-0 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">{group.currency}</Badge>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5 font-light">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Contact className="w-3.5 h-3.5" />
                    {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
                    <span className="text-primary/30 mx-1">·</span>
                    {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

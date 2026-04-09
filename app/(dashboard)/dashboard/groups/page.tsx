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
          <h1 className="text-3xl font-black uppercase tracking-tighter">Networks</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-widest">Manage your shared ledgers</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6">Initialize Network</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-widest">Initialize Network</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Network Name *</Label>
                <Input id="name" placeholder="E.G. PROJECT OMEGA" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Context</Label>
                <Textarea id="desc" placeholder="Operational parameters..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Base Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'JPY', 'INR', 'AUD', 'CAD', 'SGD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-4" disabled={!form.name.trim() || createMutation.isPending} onClick={() => createMutation.mutate(form)}>
                {createMutation.isPending ? 'Executing...' : 'Deploy'}
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
        <Card className="border-dashed border-border/50 bg-transparent">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-6">
               <span className="text-muted-foreground font-mono text-2xl">+</span>
            </div>
            <p className="font-bold uppercase tracking-wider text-sm mb-2">No Networks Registered</p>
            <p className="text-muted-foreground font-mono text-xs mt-1 mb-8 uppercase tracking-widest">Deploy a protocol to begin</p>
            <Button onClick={() => setOpen(true)} className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs px-6 h-10">Initialize Network</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="card-glass hover:border-primary/50 hover:shadow-[0_0_15px_rgba(200,255,0,0.1)] transition-all cursor-pointer h-full rounded-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug font-bold uppercase tracking-wider">{group.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px] border-secondary text-secondary bg-secondary/5 rounded-sm">{group.currency}</Badge>
                  </div>
                  {group.description && (
                    <p className="text-xs font-mono text-muted-foreground line-clamp-2 mt-2">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    [ {group.memberIds.length} Nodes ]
                    <span className="mx-2 text-primary/50">/</span>
                    {new Date(group.createdAt).toISOString().split('T')[0]}
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

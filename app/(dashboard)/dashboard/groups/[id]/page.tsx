'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

type Member = { id: string; name: string; email: string; avatar?: string };
type Expense = { id: string; description: string; amount: number; category: string; payerId: string; date: string };
type Group = { id: string; name: string; description?: string; currency: string; ownerId: string; members: Member[] };

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [expForm, setExpForm] = useState({ description: '', amount: '', category: 'General', payerId: '' });

  const { data: groupData, isLoading: loadingGroup } = useQuery<{ group: Group }>({
    queryKey: ['group', id],
    queryFn: () => fetch(`/api/groups/${id}`).then((r) => r.json()),
  });

  const { data: expData, isLoading: loadingExp } = useQuery<{ expenses: Expense[]; total: number }>({
    queryKey: ['expenses', id],
    queryFn: () => fetch(`/api/expenses?groupId=${id}`).then((r) => r.json()),
  });

  const addMemberMutation = useMutation({
    mutationFn: (email: string) =>
      fetch(`/api/groups/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Member added!');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setAddMemberOpen(false);
      setMemberEmail('');
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: (body: object) =>
      fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Expense added!');
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
      setAddExpenseOpen(false);
      setExpForm({ description: '', amount: '', category: 'General', payerId: '' });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { toast.success('Group deleted'); router.push('/dashboard/groups'); },
  });

  const group = groupData?.group;
  const expenses = expData?.expenses ?? [];
  const isOwner = group?.ownerId === session?.user?.id;

  const handleAddExpense = () => {
    if (!group) return;
    const amount = parseFloat(expForm.amount);
    if (!expForm.description || isNaN(amount) || amount <= 0) { toast.error('Please fill all required fields'); return; }
    const payerId = expForm.payerId || (session?.user?.id ?? '');
    const perPerson = amount / group.members.length;
    const splits = group.members.map((m) => ({ userId: m.id, amount: Math.round(perPerson * 100) / 100 }));
    // Adjust for rounding
    const diff = Math.round((amount - splits.reduce((s, x) => s + x.amount, 0)) * 100) / 100;
    if (diff !== 0) splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
    addExpenseMutation.mutate({ groupId: id, description: expForm.description, amount, category: expForm.category, payerId, splits });
  };

  if (loadingGroup) return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-64" />
    </div>
  );

  if (!group) return <div className="p-8 text-center text-muted-foreground">Group not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
            <Badge variant="secondary">{group.currency}</Badge>
          </div>
          {group.description && <p className="text-muted-foreground mt-1">{group.description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <a href={`/dashboard/balances?groupId=${id}`}>⚖️ Balances</a>
          </Button>
          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger render={<Button>➕ Add Expense</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Description *</Label>
                  <Input placeholder="e.g. Dinner at restaurant" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount ({group.currency}) *</Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v ?? '' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Paid by</Label>
                  <Select value={(expForm.payerId || (session?.user?.id ?? ''))} onValueChange={(v) => setExpForm({ ...expForm, payerId: v ?? '' })}>
                    <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                    <SelectContent>
                      {group.members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}{m.id === session?.user?.id ? ' (you)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Split equally among all {group.members.length} members.</p>
                <Button className="w-full" disabled={addExpenseMutation.isPending} onClick={handleAddExpense}>
                  {addExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expenses */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-lg">Expenses</h2>
          {loadingExp ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : expenses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-3xl mb-2">💸</p>
                <p className="text-muted-foreground text-sm">No expenses yet. Add the first one!</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {expenses.map((exp, i) => {
                  const payer = group.members.find((m) => m.id === exp.payerId);
                  return (
                    <div key={exp.id}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm">💳</div>
                          <div>
                            <p className="font-medium text-sm">{exp.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Paid by {payer?.name ?? 'Unknown'} · {exp.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{group.currency} {exp.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Members */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Members ({group.members.length})</h2>
            {isOwner && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm">+ Add</Button>} />
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Email address</Label>
                      <Input type="email" placeholder="friend@example.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
                    </div>
                    <Button className="w-full" disabled={!memberEmail || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate(memberEmail)}>
                      {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card>
            <CardContent className="p-0">
              {group.members.map((member, i) => (
                <div key={member.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {member.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}{member.id === session?.user?.id ? ' (you)' : ''}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {member.id === group.ownerId && <Badge variant="outline" className="text-xs shrink-0">Owner</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isOwner && (
            <Button variant="destructive" size="sm" className="w-full" onClick={() => {
              if (confirm('Delete this group and all its expenses? This cannot be undone.')) deleteGroupMutation.mutate();
            }}>
              Delete Group
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { History, Plus, ArrowUpRight, Pencil } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type SplitDTO = { userId: string; amount: number };
type ExpenseDTO = {
  id: string;
  groupId: string;
  groupName?: string;
  description: string;
  amount: number;
  category: string;
  payerId: string;
  splits: SplitDTO[];
  date: string;
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [addPersonalOpen, setAddPersonalOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [personalForm, setPersonalForm] = useState({ description: '', amount: '', category: 'General' });

  const { data: expData, isLoading } = useQuery<{ expenses: ExpenseDTO[]; total: number }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all').then((r) => r.json()),
  });

  const addPersonalExpense = useMutation({
    mutationFn: (body: object) =>
      fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Private record injected.');
      queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
      setAddPersonalOpen(false);
      setPersonalForm({ description: '', amount: '', category: 'General' });
    },
  });

  const updatePersonalExpense = useMutation({
    mutationFn: ({ expenseId, body }: { expenseId: string; body: object }) =>
      fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Private record updated.');
      queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
      setEditPersonalOpen(false);
      resetPersonalEditor();
    },
  });

  const resetPersonalEditor = () => {
    setPersonalForm({ description: '', amount: '', category: 'General' });
    setEditingExpenseId(null);
  };

  const buildPersonalPayload = () => {
    const amount = parseFloat(personalForm.amount);
    if (!personalForm.description || isNaN(amount) || amount <= 0) {
      toast.error('Invalid parameters detected');
      return null;
    }

    const userId = session?.user?.id;
    if (!userId) {
      toast.error('Session not found');
      return null;
    }

    return {
      description: personalForm.description,
      amount,
      category: personalForm.category,
      payerId: userId,
      splits: [{ userId, amount }],
    };
  };

  const handleCreatePersonal = () => {
    const payload = buildPersonalPayload();
    if (!payload) return;

    addPersonalExpense.mutate({
      groupId: '', 
      ...payload,
      date: new Date().toISOString(),
    });
  };

  const handleUpdatePersonal = () => {
    if (!editingExpenseId) return;
    const payload = buildPersonalPayload();
    if (!payload) return;

    updatePersonalExpense.mutate({
      expenseId: editingExpenseId,
      body: payload,
    });
  };

  const openEditPersonal = (expense: ExpenseDTO) => {
    setEditingExpenseId(expense.id);
    setPersonalForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
    });
    setEditPersonalOpen(true);
  };

  const expenses = expData?.expenses ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Global Log</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-widest">Unified Transaction History</p>
        </div>
        <Dialog open={addPersonalOpen} onOpenChange={(open) => {
          setAddPersonalOpen(open);
          if (!open) resetPersonalEditor();
        }}>
          <DialogTrigger render={<Button className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6"><Plus className="w-4 h-4 mr-2" /> Private TX</Button>} />
          <DialogContent className="sm:max-w-md bg-[#0a0a0a] border border-border/50 rounded-sm">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Inject Private Record</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descriptor *</Label>
                <Input value={personalForm.description} onChange={(e) => setPersonalForm({ ...personalForm, description: e.target.value })} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value *</Label>
                <Input type="number" min="0.01" step="0.01" value={personalForm.amount} onChange={(e) => setPersonalForm({ ...personalForm, amount: e.target.value })} className="font-mono text-right bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class</Label>
                <Select value={personalForm.category} onValueChange={(v) => setPersonalForm({ ...personalForm, category: v ?? '' })}>
                  <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-border/50">
                    {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs focus:bg-white/5">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-2" onClick={handleCreatePersonal} disabled={addPersonalExpense.isPending}>
                {addPersonalExpense.isPending ? 'Committing...' : 'Commit Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={editPersonalOpen} onOpenChange={(open) => {
          setEditPersonalOpen(open);
          if (!open) resetPersonalEditor();
        }}>
          <DialogContent className="sm:max-w-md bg-[#0a0a0a] border border-border/50 rounded-sm">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Update Private Record</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descriptor *</Label>
                <Input value={personalForm.description} onChange={(e) => setPersonalForm({ ...personalForm, description: e.target.value })} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value *</Label>
                <Input type="number" min="0.01" step="0.01" value={personalForm.amount} onChange={(e) => setPersonalForm({ ...personalForm, amount: e.target.value })} className="font-mono text-right bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class</Label>
                <Select value={personalForm.category} onValueChange={(v) => setPersonalForm({ ...personalForm, category: v ?? '' })}>
                  <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111] border-border/50">
                    {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                      <SelectItem key={c} value={c} className="font-mono text-xs focus:bg-white/5">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-2" onClick={handleUpdatePersonal} disabled={updatePersonalExpense.isPending}>
                {updatePersonalExpense.isPending ? 'Updating...' : 'Update Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-muted rounded-sm" />)}</div>
        ) : expenses.length === 0 ? (
          <Card className="border-dashed border-border/50 bg-transparent rounded-sm">
            <CardContent className="py-16 text-center">
              <div className="w-12 h-12 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-4">
                 <History className="text-muted-foreground w-6 h-6" />
              </div>
              <p className="font-bold uppercase tracking-wider text-sm mb-2">Log Empty</p>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">No historical data found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-glass rounded-sm overflow-hidden">
            <CardContent className="p-0">
              {expenses.map((exp, i) => {
                const canEditPersonal = exp.groupName === 'Personal' && exp.payerId === session?.user?.id;
                return (
                <div key={exp.id} className="group hover:bg-white/5 transition-colors">
                  {i > 0 && <Separator className="bg-border/40" />}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-sm bg-[#111] border border-border/50 flex flex-shrink-0 items-center justify-center group-hover:border-primary/50 transition-colors mt-0.5">
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-wider text-foreground mb-1">{exp.description}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                           <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{new Date(exp.date).toISOString().split('T')[0]}</span>
                           <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-mono border-border text-muted-foreground bg-black/20 rounded-sm px-1.5 py-0.5">{exp.category}</Badge>
                           {exp.groupName === 'Personal' ? (
                              <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-mono border-secondary text-secondary bg-secondary/5 rounded-sm px-1.5 py-0.5">PRIVATE</Badge>
                           ) : (
                              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center">
                                NET <ArrowUpRight className="w-3 h-3 mx-1 opacity-50" /> <span className="font-bold text-foreground inline-block truncate max-w-[120px]">{exp.groupName}</span>
                              </span>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right pl-14 sm:pl-0">
                       <span className="font-mono font-bold text-foreground block drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
                         {exp.amount.toFixed(2)}
                       </span>
                       <div className="text-[10px] font-mono uppercase tracking-widest text-primary/70 pt-1">
                         {exp.payerId === session?.user?.id ? 'SRC: Self' : 'SRC: External'}
                       </div>
                       {canEditPersonal && (
                         <Button
                           variant="ghost"
                           size="sm"
                           className="mt-2 h-7 px-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground"
                           onClick={() => openEditPersonal(exp)}
                         >
                           <Pencil className="w-3 h-3 mr-1" /> Edit
                         </Button>
                       )}
                    </div>
                  </div>
                </div>
              )})}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

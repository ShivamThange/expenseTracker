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
import { ScrollText, Plus, MoveUpRight, PenLine } from 'lucide-react';
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

const baseCategories = ['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'];

export default function ScrollTextPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [addPersonalOpen, setAddPersonalOpen] = useState(false);
  const [editPersonalOpen, setEditPersonalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [personalForm, setPersonalForm] = useState({ description: '', amount: '', category: 'General' });
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

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
  const categoryOptions = [...baseCategories, ...customCategories];

  const handleAddCategory = () => {
    const next = newCategoryInput.trim();
    if (!next) { toast.error('Category name is required'); return; }

    const existing = categoryOptions.find((category) => category.toLowerCase() === next.toLowerCase());
    if (existing) {
      setPersonalForm({ ...personalForm, category: existing });
      setNewCategoryInput('');
      return;
    }

    setCustomCategories((prev) => [...prev, next]);
    setPersonalForm({ ...personalForm, category: next });
    setNewCategoryInput('');
    toast.success('Category added.');
  };

  const buildPersonalPayload = () => {
    const amount = parseFloat(personalForm.amount);
    if (!personalForm.description || isNaN(amount) || amount <= 0) {
      toast.error('Invalid parameters detected');
      return null;
    }
    const userId = session?.user?.id;
    if (!userId) { toast.error('Session not found'); return null; }

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
    addPersonalExpense.mutate({ groupId: '', ...payload, date: new Date().toISOString() });
  };

  const handleUpdatePersonal = () => {
    if (!editingExpenseId) return;
    const payload = buildPersonalPayload();
    if (!payload) return;
    updatePersonalExpense.mutate({ expenseId: editingExpenseId, body: payload });
  };

  const openEditPersonal = (expense: ExpenseDTO) => {
    setEditingExpenseId(expense.id);
    setPersonalForm({ description: expense.description, amount: String(expense.amount), category: expense.category });
    setEditPersonalOpen(true);
  };

  const expenses = expData?.expenses ?? [];

  const expenseFormFields = (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Description *</Label>
        <Input value={personalForm.description} onChange={(e) => setPersonalForm({ ...personalForm, description: e.target.value })} className="bg-[var(--surface-input)] rounded-lg input-glow border-border" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Amount *</Label>
        <Input type="number" min="0.01" step="0.01" value={personalForm.amount} onChange={(e) => setPersonalForm({ ...personalForm, amount: e.target.value })} className="mono-data text-right bg-[var(--surface-input)] rounded-lg input-glow border-border" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Category</Label>
        <Select value={personalForm.category} onValueChange={(v) => setPersonalForm({ ...personalForm, category: v ?? '' })}>
          <SelectTrigger className="bg-[var(--surface-input)] rounded-lg border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border/50 rounded-xl">
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Add category"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            className="bg-[var(--surface-input)] rounded-lg input-glow border-border"
          />
          <Button type="button" variant="outline" className="rounded-lg text-[10px] font-bold px-3 border-border/60" onClick={handleAddCategory}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-7">
      <div className="flex items-end justify-between gap-4 flex-wrap pt-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Personal & group</p>
          <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">All Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">View all your expenses</p>
        </div>
        <Dialog open={addPersonalOpen} onOpenChange={(open) => {
          setAddPersonalOpen(open);
          if (!open) resetPersonalEditor();
        }}>
          <DialogTrigger render={
            <Button className="neon-glow rounded-lg font-bold text-xs h-9 px-5 gap-2">
              <Plus className="w-3.5 h-3.5" /> Add expense
            </Button>
          } />
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-display italic font-black text-xl tracking-tight">Add expense</DialogTitle>
            </DialogHeader>
            {expenseFormFields}
            <Button className="w-full neon-glow rounded-lg font-bold mt-2" onClick={handleCreatePersonal} disabled={addPersonalExpense.isPending}>
              {addPersonalExpense.isPending ? 'Adding…' : 'Add expense'}
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog open={editPersonalOpen} onOpenChange={(open) => {
          setEditPersonalOpen(open);
          if (!open) resetPersonalEditor();
        }}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-display italic font-black text-xl tracking-tight">Edit expense</DialogTitle>
            </DialogHeader>
            {expenseFormFields}
            <Button className="w-full neon-glow rounded-lg font-bold mt-2" onClick={handleUpdatePersonal} disabled={updatePersonalExpense.isPending}>
              {updatePersonalExpense.isPending ? 'Updating…' : 'Save changes'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 bg-muted rounded-xl" />)}</div>
        ) : expenses.length === 0 ? (
          <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="w-12 h-12 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-xl mb-4">
                 <ScrollText className="text-muted-foreground/60 w-5 h-5" />
              </div>
              <p className="font-bold text-sm mb-1.5">No expenses yet</p>
              <p className="text-muted-foreground text-[11px] font-light">Add an expense to get started</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-glass rounded-xl overflow-hidden border-border/50">
            <CardContent className="p-0">
              {expenses.map((exp, i) => {
                const canEditPersonal = exp.groupName === 'Personal' && exp.payerId === session?.user?.id;
                return (
                <div key={exp.id} className="group hover:bg-white/3 transition-colors">
                  {i > 0 && <Separator className="bg-border/40" />}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex flex-shrink-0 items-center justify-center group-hover:border-primary/30 transition-colors mt-0.5">
                        <MoveUpRight className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground mb-1">{exp.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                           <span className="text-[10px] text-muted-foreground font-medium">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                           <Badge className="text-[9px] border-border/50 text-muted-foreground bg-white/3 rounded-full px-2 py-0.5 font-medium">{exp.category}</Badge>
                           {exp.groupName === 'Personal' ? (
                              <Badge className="badge-azure text-[9px] rounded-full px-2 py-0.5 font-semibold">Personal</Badge>
                           ) : (
                              <span className="text-[10px] text-muted-foreground">{exp.groupName}</span>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right pl-14 sm:pl-0 shrink-0">
                       <span className="mono-data font-bold text-foreground block text-sm">
                         {exp.amount.toFixed(2)}
                       </span>
                       <div className="text-[10px] text-primary/70 pt-0.5 font-medium">
                         {exp.payerId === session?.user?.id ? 'You paid' : 'Others paid'}
                       </div>
                       {canEditPersonal && (
                         <Button
                           variant="ghost"
                           size="sm"
                           className="mt-1.5 h-6 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground gap-1 rounded-md"
                           onClick={() => openEditPersonal(exp)}
                         >
                           <PenLine className="w-3 h-3" /> Edit
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

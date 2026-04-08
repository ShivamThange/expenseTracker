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
      toast.success('Personal expense added!');
      queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
      setAddPersonalOpen(false);
      setPersonalForm({ description: '', amount: '', category: 'General' });
    },
  });

  const handleCreatePersonal = () => {
    const amount = parseFloat(personalForm.amount);
    if (!personalForm.description || isNaN(amount) || amount <= 0) {
      toast.error('Please fill required fields validly');
      return;
    }
    const userId = session?.user?.id;
    if (!userId) return;

    addPersonalExpense.mutate({
      groupId: '', // Will default to personal virtual group
      description: personalForm.description,
      amount,
      category: personalForm.category,
      payerId: userId,
      splits: [{ userId, amount }],
      date: new Date().toISOString(),
    });
  };

  const expenses = expData?.expenses ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global History</h1>
          <p className="text-muted-foreground mt-1">All your transactions across all groups and personal expenses.</p>
        </div>
        <Dialog open={addPersonalOpen} onOpenChange={setAddPersonalOpen}>
          <DialogTrigger render={<Button>➕ Add Personal Expense</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Add Personal Expense</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Input value={personalForm.description} onChange={(e) => setPersonalForm({ ...personalForm, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" min="0.01" step="0.01" value={personalForm.amount} onChange={(e) => setPersonalForm({ ...personalForm, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={personalForm.category} onValueChange={(v) => setPersonalForm({ ...personalForm, category: v ?? '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleCreatePersonal} disabled={addPersonalExpense.isPending}>
                {addPersonalExpense.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : expenses.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-10 text-center"><p>No expenses found in your history.</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {expenses.map((exp, i) => (
                <div key={exp.id}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{exp.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="text-xs text-muted-foreground">{new Date(exp.date).toLocaleDateString()}</span>
                         <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                         {exp.groupName === 'Personal' ? (
                            <Badge variant="secondary" className="text-[10px]">Personal</Badge>
                         ) : (
                            <span className="text-xs text-muted-foreground">in <span className="font-medium">{exp.groupName}</span></span>
                         )}
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="font-semibold text-sm">
                         {exp.amount.toFixed(2)}
                       </span>
                       <div className="text-xs text-muted-foreground pt-1">
                         {exp.payerId === session?.user?.id ? 'You paid' : 'Someone paid'}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

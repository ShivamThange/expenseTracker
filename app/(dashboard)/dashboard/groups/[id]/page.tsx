'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueueExpense } from '@/lib/offline/queue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Sparkles, Eraser, UserRoundPlus, Scroll, ArrowLeftRight, PenLine, Plus, Receipt } from 'lucide-react';

type Member = { id: string; name: string; email: string; avatar?: string };
type Split = { userId: string; amount: number };
type Expense = { id: string; description: string; amount: number; category: string; payerId: string; date: string; splits: Split[] };
type Group = { id: string; name: string; description?: string; currency: string; ownerId: string; members: Member[] };
type ScanBillPayload = {
  imageBase64?: string;
  mimeType?: string;
  message: string;
  members?: Member[];
};
type ScanBillResponse = {
  description?: string;
  amount?: number;
  category?: string;
  memberShares?: Array<{ userId: string; userName?: string; amount: number }>;
  splits?: Split[];
};

const baseCategories = ['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'];
const defaultExpenseForm = { description: '', amount: '', category: 'General', payerId: '' };

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpenseOpen, setEditExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [expForm, setExpForm] = useState(defaultExpenseForm);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

  const [scanMode, setScanMode] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanImageStr, setScanImageStr] = useState<{ base64: string, mime: string } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const [prefix, base64] = result.split(',');
      const mime = prefix.match(/:(.*?);/)?.[1] || 'image/jpeg';
      setScanImageStr({ base64, mime });
    };
    reader.readAsDataURL(file);
  };

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
      toast.success('Member added.');
      queryClient.invalidateQueries({ queryKey: ['group', id] });
      setAddMemberOpen(false);
      setMemberEmail('');
    },
  });

  const { isOnline } = useOnlineStatus();

  const addExpenseMutation = useMutation({
    mutationFn: async (body: object) => {
      if (!isOnline) {
        const tempId = await enqueueExpense(body);
        return { expense: { ...body, id: tempId, _queued: true } };
      }
      return fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
    },
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      if (data.expense?._queued) {
        toast.info('Saved offline — will sync when connected');
      } else {
        toast.success('Expense added.');
      }
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
      setAddExpenseOpen(false);
      resetExpenseEditor();
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ expenseId, body }: { expenseId: string; body: object }) =>
      fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Expense updated.');
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
      setEditExpenseOpen(false);
      resetExpenseEditor();
    },
  });

  const scanBillMutation = useMutation({
    mutationFn: (body: ScanBillPayload) =>
      fetch('/api/ai/scan-bill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
        const text = await r.text();
        console.log('[AI Scan] Raw API response:', { status: r.status, ok: r.ok, text });
        if (!r.ok) {
           let errMessage = text;
           try { const j = JSON.parse(text); if (j.error) errMessage = j.error; } catch {}
           throw new Error(errMessage);
        }
        try { return JSON.parse(text) as ScanBillResponse; } catch { throw new Error(text || 'Failed to parse'); }
      }),
      onSuccess: (data) => {
      setExpForm({
        ...expForm,
        description: data.description || 'Scanned Ledger',
        amount: String(data.amount || ''),
        category: data.category || 'Food',
      });
      setSplitMode('custom');
      const newSplits: Record<string, string> = {};
      const shares = data.memberShares?.length ? data.memberShares : data.splits;
      shares?.forEach((s) => { newSplits[s.userId] = String(s.amount); });
      setCustomSplits(newSplits);
      setScanMode(false);
      toast.success('Receipt scanned! Review and confirm.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { toast.success('Group deleted.'); router.push('/dashboard/groups'); },
  });

  const group = groupData?.group;
  const expenses = expData?.expenses ?? [];
  const isOwner = group?.ownerId === session?.user?.id;
  const categoryOptions = [...baseCategories, ...customCategories];

  const handleAddCategory = () => {
    const next = newCategoryInput.trim();
    if (!next) { toast.error('Category name is required'); return; }
    const existing = categoryOptions.find((c) => c.toLowerCase() === next.toLowerCase());
    if (existing) { setExpForm({ ...expForm, category: existing }); setNewCategoryInput(''); return; }
    setCustomCategories((prev) => [...prev, next]);
    setExpForm({ ...expForm, category: next });
    setNewCategoryInput('');
    toast.success('Category added.');
  };

  const resetExpenseEditor = () => {
    setExpForm(defaultExpenseForm);
    setSplitMode('equal');
    setCustomSplits({});
    setEditingExpenseId(null);
    setScanMode(false);
    setScanMessage('');
    setScanImageStr(null);
  };

  const calculateEqualSplitMode = (amount: number, splits: Split[]) => {
    if (splits.length === 0) return 'equal';
    const roundedBase = Math.round((amount / splits.length) * 100) / 100;
    const diff = Math.round((amount - roundedBase * splits.length) * 100) / 100;
    return splits.every((split, index) => {
      const expected = index === 0 ? Math.round((roundedBase + diff) * 100) / 100 : roundedBase;
      return Math.abs(split.amount - expected) <= 0.01;
    }) ? 'equal' : 'custom';
  };

  const openExpenseEditor = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setExpForm({ description: expense.description, amount: String(expense.amount), category: expense.category, payerId: expense.payerId });
    setSplitMode(calculateEqualSplitMode(expense.amount, expense.splits));
    setCustomSplits(expense.splits.reduce<Record<string, string>>((acc, split) => { acc[split.userId] = String(split.amount); return acc; }, {}));
    setEditExpenseOpen(true);
  };

  const buildExpensePayload = () => {
    if (!group) return;
    const amount = parseFloat(expForm.amount);
    if (!expForm.description || isNaN(amount) || amount <= 0) { toast.error('Please fill in all required fields'); return null; }
    let splits: { userId: string; amount: number }[] = [];
    if (splitMode === 'equal') {
      const perPerson = amount / group.members.length;
      splits = group.members.map((m) => ({ userId: m.id, amount: Math.round(perPerson * 100) / 100 }));
      const diff = Math.round((amount - splits.reduce((s, x) => s + x.amount, 0)) * 100) / 100;
      if (diff !== 0) splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
    } else {
      let customTotal = 0;
      let hasError = false;
      splits = group.members.map((m) => {
        const amt = parseFloat(customSplits[m.id] || '0');
        if (isNaN(amt) || amt < 0) hasError = true;
        customTotal += amt;
        return { userId: m.id, amount: amt };
      });
      if (hasError) { toast.error('Enter valid amounts for each person'); return null; }
      if (Math.abs(customTotal - amount) > 0.01) { toast.error(`Split total (${customTotal.toFixed(2)}) must equal amount (${amount.toFixed(2)})`); return null; }
    }
    const payerId = expForm.payerId || (session?.user?.id ?? '');
    if (!payerId) { toast.error('Select a payer before saving'); return null; }
    return { description: expForm.description, amount, category: expForm.category, payerId, splits };
  };

  const handleAddExpense = () => {
    const payload = buildExpensePayload();
    if (!payload) return;
    addExpenseMutation.mutate({ groupId: id, ...payload });
  };

  const handleUpdateExpense = () => {
    if (!editingExpenseId) return;
    const payload = buildExpensePayload();
    if (!payload) return;
    updateExpenseMutation.mutate({ expenseId: editingExpenseId, body: payload });
  };

  const expenseFormContent = (onSubmit: () => void, isPending: boolean, submitLabel: string) => (
    <div className="space-y-4 pt-2">
      <div className="flex justify-end mb-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setScanMode(true)} className="text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 rounded-lg gap-1.5">
          <Sparkles className="w-3 h-3" /> Scan receipt
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Description *</Label>
        <Input placeholder="e.g., Dinner" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="bg-[var(--surface-input)] rounded-lg input-glow border-border" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Amount ({group?.currency}) *</Label>
        <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="mono-data text-right bg-[var(--surface-input)] rounded-lg input-glow border-border" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Category</Label>
        <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v ?? '' })}>
          <SelectTrigger className="bg-[var(--surface-input)] rounded-lg border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-card border-border/50 rounded-xl">
            {categoryOptions.map((c) => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 mt-2">
          <Input placeholder="Add category" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} className="bg-[var(--surface-input)] rounded-lg input-glow border-border" />
          <Button type="button" variant="outline" className="rounded-lg text-[10px] font-bold px-3 border-border/60" onClick={handleAddCategory}>Add</Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Paid by</Label>
        <Select value={(expForm.payerId || (session?.user?.id ?? ''))} onValueChange={(v) => setExpForm({ ...expForm, payerId: v ?? '' })}>
          <SelectTrigger className="bg-[var(--surface-input)] rounded-lg border-border"><SelectValue placeholder="Select member" /></SelectTrigger>
          <SelectContent className="bg-card border-border/50 rounded-xl">
            {group?.members.map((m) => (<SelectItem key={m.id} value={m.id} className="text-xs">{m.name}{m.id === session?.user?.id ? ' (you)' : ''}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 pt-3 border-t border-border/40">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Split among</Label>
          <div className="flex bg-muted p-1 rounded-lg border border-border/40">
            <button type="button" onClick={() => setSplitMode('equal')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${splitMode === 'equal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Equal</button>
            <button type="button" onClick={() => setSplitMode('custom')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Custom</button>
          </div>
        </div>
        {splitMode === 'equal' ? (
          <p className="text-xs text-muted-foreground pt-1 text-center font-light">Split equally among {group?.members.length} members.</p>
        ) : (
          <div className="space-y-3 mt-3">
            {group?.members.map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold truncate flex-1 text-foreground">{m.name}</span>
                <div className="flex items-center gap-2 max-w-[130px]">
                  <span className="text-[10px] font-mono text-muted-foreground">{group.currency}</span>
                  <Input type="number" min="0" step="0.01" className="h-8 mono-data text-right bg-[var(--surface-input)] rounded-lg input-glow border-border"
                    value={customSplits[m.id] || ''} onChange={e => setCustomSplits({...customSplits, [m.id]: e.target.value})} />
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs font-semibold border-t border-border/40 pt-3">
              <span className="text-muted-foreground">Total:</span>
              <span className={`mono-data font-bold ${Math.abs(Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v)||0), 0) - parseFloat(expForm.amount||'0')) > 0.01 ? 'text-destructive' : 'text-primary'}`}>
                {group?.currency} {Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v)||0), 0).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
      <Button className="w-full neon-glow-lg rounded-lg font-bold mt-4" disabled={isPending} onClick={onSubmit}>
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </div>
  );

  if (loadingGroup) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48 bg-muted rounded-xl" />
      <Skeleton className="h-32 bg-muted rounded-xl" />
      <Skeleton className="h-64 bg-muted rounded-xl" />
    </div>
  );

  if (!group) return <div className="p-4 sm:p-6 lg:p-8 text-center text-muted-foreground text-sm font-medium">Group not found.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">{group.name}</h1>
            <Badge className="badge-azure font-mono text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">{group.currency}</Badge>
          </div>
          {group.description && <p className="text-muted-foreground text-sm mt-1 font-light">{group.description}</p>}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" asChild className="rounded-lg border-border/50 hover:bg-white/4 font-semibold text-xs h-9 px-5 gap-2">
            <a href={`/dashboard/balances?groupId=${id}`}><ArrowLeftRight className="w-4 h-4" /> Balances</a>
          </Button>
          <Dialog open={addExpenseOpen} onOpenChange={(open) => { setAddExpenseOpen(open); if (!open) resetExpenseEditor(); }}>
            <DialogTrigger render={<Button className="neon-glow-lg rounded-lg font-bold text-xs h-9 px-5 gap-2"><Plus className="w-3.5 h-3.5" /> Add expense</Button>} />
            <DialogContent className="sm:max-w-[425px] bg-card border-border/50 rounded-xl">
              <DialogHeader>
                <DialogTitle className="font-display italic font-black text-xl tracking-tight">Add expense</DialogTitle>
              </DialogHeader>
              {scanMode ? (
                <div className="space-y-4 pt-2">
                  <div className="p-6 border border-dashed border-primary/30 rounded-xl text-center space-y-3 bg-primary/5">
                    <Sparkles className="w-7 h-7 text-primary mx-auto mb-2 animate-pulse" />
                    <p className="font-bold text-sm text-primary">AI Receipt Scanner</p>
                    <p className="text-xs text-muted-foreground font-light">Upload a photo to auto-fill expense details.</p>
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={scanBillMutation.isPending} className="font-mono text-xs border-primary/20 bg-background/50 file:bg-primary/20 file:border-0 file:text-primary file:font-bold file:mr-4 file:px-4 file:py-1 file:rounded-lg hover:file:bg-primary/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Additional context (optional)</Label>
                    <textarea className="w-full min-h-[80px] rounded-lg border border-border bg-[var(--surface-input)] px-3 py-2 text-xs input-glow resize-none" placeholder="e.g., Alex only had the salad…" value={scanMessage} onChange={e => setScanMessage(e.target.value)} disabled={scanBillMutation.isPending} />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-lg border-border/50 text-xs font-semibold hover:bg-white/4" onClick={() => setScanMode(false)} disabled={scanBillMutation.isPending}>Cancel</Button>
                    <Button className="flex-1 neon-glow-lg rounded-lg text-xs font-bold" disabled={!scanImageStr || scanBillMutation.isPending} onClick={() => scanBillMutation.mutate({ imageBase64: scanImageStr?.base64, mimeType: scanImageStr?.mime, message: scanMessage, members: group?.members })}>
                      {scanBillMutation.isPending ? 'Scanning…' : 'Scan receipt'}
                    </Button>
                  </div>
                </div>
              ) : expenseFormContent(handleAddExpense, addExpenseMutation.isPending, 'Add expense')}
            </DialogContent>
          </Dialog>
          <Dialog open={editExpenseOpen} onOpenChange={(open) => { setEditExpenseOpen(open); if (!open) resetExpenseEditor(); }}>
            <DialogContent className="sm:max-w-[425px] bg-card border-border/50 rounded-xl">
              <DialogHeader>
                <DialogTitle className="font-display italic font-black text-xl tracking-tight">Edit expense</DialogTitle>
              </DialogHeader>
              {expenseFormContent(handleUpdateExpense, updateExpenseMutation.isPending, 'Save changes')}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Expenses */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display italic font-black text-lg text-foreground tracking-tight">Expenses</h2>
          {loadingExp ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 bg-muted rounded-xl" />)}</div>
          ) : expenses.length === 0 ? (
            <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
              <CardContent className="py-12 text-center">
                <div className="w-11 h-11 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-xl mb-4">
                   <Scroll className="text-muted-foreground/60 w-5 h-5" />
                </div>
                <p className="font-bold text-sm mb-1.5">No expenses yet</p>
                <p className="text-muted-foreground text-xs font-light">Add your first expense to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-glass rounded-xl overflow-hidden border-border/50">
              <CardContent className="p-0">
                {expenses.map((exp, i) => {
                  const payer = group.members.find((m) => m.id === exp.payerId);
                  return (
                    <div key={exp.id} className="group transition-colors hover:bg-white/3">
                      {i > 0 && <Separator className="bg-border/40" />}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                            <Receipt className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{exp.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {payer?.id === session?.user?.id ? 'You paid' : `${payer?.name ?? 'Unknown'} paid`}
                              <span className="text-primary/30 mx-1">·</span>
                              {exp.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-left pl-14 sm:pl-0 sm:text-right shrink-0">
                          <p className="mono-data font-bold text-foreground text-sm">{group.currency} {exp.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <Button variant="ghost" size="sm" className="mt-1.5 h-6 px-2 text-[10px] font-semibold text-muted-foreground hover:text-foreground gap-1 rounded-md" onClick={() => openExpenseEditor(exp)}>
                            <PenLine className="w-3 h-3" /> Edit
                          </Button>
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
            <h2 className="font-display italic font-black text-lg text-foreground tracking-tight">Members ({group.members.length})</h2>
            {isOwner && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs font-semibold border-border/50 rounded-lg hover:bg-white/4 gap-1.5"><UserRoundPlus className="w-3 h-3" /> Add</Button>} />
                <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-xl">
                  <DialogHeader><DialogTitle className="font-display italic font-black text-xl tracking-tight">Invite member</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Email address</Label>
                      <Input type="email" placeholder="member@example.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="bg-[var(--surface-input)] rounded-lg input-glow border-border" />
                    </div>
                    <Button className="w-full neon-glow-lg rounded-lg font-bold mt-2" disabled={!memberEmail || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate(memberEmail)}>
                      {addMemberMutation.isPending ? 'Adding…' : 'Add member'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card className="card-glass rounded-xl border-border/50">
            <CardContent className="p-0">
              {group.members.map((member, i) => (
                <div key={member.id} className="hover:bg-white/3 transition-colors">
                  {i > 0 && <Separator className="bg-border/40" />}
                  <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/30 shrink-0">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/15 text-primary rounded-lg flex items-center justify-center">
                        {member.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground">{member.name}{member.id === session?.user?.id ? <span className="text-muted-foreground font-normal"> (you)</span> : ''}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-light">{member.email}</p>
                    </div>
                    {member.id === group.ownerId && (
                      <Badge className="badge-tangerine text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0">Admin</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isOwner && (
            <div className="space-y-2 mt-2">
              {confirmingDelete ? (
                <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-4 space-y-3 animate-scale-in">
                  <p className="text-sm font-semibold text-destructive">Are you sure?</p>
                  <p className="text-xs text-muted-foreground font-light">This will permanently delete the group and all expenses.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs font-semibold rounded-lg border-destructive/30 hover:bg-destructive/10 text-destructive" onClick={() => setConfirmingDelete(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 text-xs font-bold rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30" disabled={deleteGroupMutation.isPending} onClick={() => deleteGroupMutation.mutate()}>
                      {deleteGroupMutation.isPending ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-semibold text-xs h-9 rounded-lg transition-colors gap-2" onClick={() => setConfirmingDelete(true)}>
                  <Eraser className="w-3.5 h-3.5" /> Delete group
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Sparkles, Trash2, UserPlus, FileText, Scale, Pencil } from 'lucide-react';

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
  splits?: Split[];
};

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
  const [expForm, setExpForm] = useState(defaultExpenseForm);
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
      toast.success('Node added to network.');
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
      toast.success('Transaction registered.');
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
      toast.success('Transaction updated.');
      queryClient.invalidateQueries({ queryKey: ['expenses', id] });
      setEditExpenseOpen(false);
      resetExpenseEditor();
    },
  });

  const scanBillMutation = useMutation({
    mutationFn: (body: ScanBillPayload) =>
      fetch('/api/ai/scan-bill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
        const text = await r.text();
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
      data.splits?.forEach((s) => {
        newSplits[s.userId] = String(s.amount);
      });
      setCustomSplits(newSplits);
      
      setScanMode(false);
      toast.success('AI Analysis complete. Verify parameter matrix.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => fetch(`/api/groups/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { toast.success('Network purged.'); router.push('/dashboard/groups'); },
  });

  const group = groupData?.group;
  const expenses = expData?.expenses ?? [];
  const isOwner = group?.ownerId === session?.user?.id;

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
    setExpForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      payerId: expense.payerId,
    });
    setSplitMode(calculateEqualSplitMode(expense.amount, expense.splits));
    setCustomSplits(
      expense.splits.reduce<Record<string, string>>((acc, split) => {
        acc[split.userId] = String(split.amount);
        return acc;
      }, {})
    );
    setEditExpenseOpen(true);
  };

  const buildExpensePayload = () => {
    if (!group) return;
    const amount = parseFloat(expForm.amount);
    if (!expForm.description || isNaN(amount) || amount <= 0) { toast.error('Invalid parameters detected'); return null; }
    
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
        if (isNaN(amt) || amt < 0) {
          hasError = true;
        }
        customTotal += amt;
        return { userId: m.id, amount: amt };
      });
      if (hasError) {
        toast.error('Invalid custom split matrix');
        return null;
      }
      if (Math.abs(customTotal - amount) > 0.01) {
        toast.error(`Matrix sum (${customTotal.toFixed(2)}) must equal total (${amount.toFixed(2)})`);
        return null;
      }
    }

    const payerId = expForm.payerId || (session?.user?.id ?? '');
    if (!payerId) {
      toast.error('Select a payer before saving');
      return null;
    }

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

  if (loadingGroup) return (
    <div className="p-8 max-w-5xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48 bg-muted" />
      <Skeleton className="h-32 bg-muted" />
      <Skeleton className="h-64 bg-muted" />
    </div>
  );

  if (!group) return <div className="p-8 text-center font-mono text-muted-foreground uppercase tracking-widest">Network 404: Not Found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter uppercase">{group.name}</h1>
            <Badge variant="outline" className="font-mono text-[10px] border-secondary text-secondary bg-secondary/5 rounded-sm">{group.currency}</Badge>
          </div>
          {group.description && <p className="text-muted-foreground font-mono text-xs mt-2 uppercase tracking-widest">{group.description}</p>}
        </div>
        <div className="flex gap-4 flex-wrap">
          <Button variant="outline" asChild className="rounded-sm border-border/50 hover:bg-white/5 font-bold uppercase tracking-widest text-xs h-10 px-6">
            <a href={`/dashboard/balances?groupId=${id}`}><Scale className="w-4 h-4 mr-2" /> Ledgers</a>
          </Button>
          <Dialog open={addExpenseOpen} onOpenChange={(open) => {
            setAddExpenseOpen(open);
            if (!open) resetExpenseEditor();
          }}>
            <DialogTrigger render={<Button className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6">➕ Add Record</Button>} />
            <DialogContent className="sm:max-w-[425px] bg-[#0a0a0a] border border-border/50 rounded-sm">
              <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Insert Record</DialogTitle></DialogHeader>
              {scanMode ? (
                <div className="space-y-4 pt-2">
                  <div className="p-6 border border-dashed border-primary/30 rounded-sm text-center space-y-3 bg-primary/5 transition-all">
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 animate-pulse" />
                    <p className="font-bold uppercase tracking-widest text-sm text-primary">AI Matrix Scanner</p>
                    <p className="text-xs font-mono text-muted-foreground">Upload receipt data for automated parsing.</p>
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={scanBillMutation.isPending} className="font-mono text-xs border-primary/20 bg-background/50 file:bg-primary/20 file:border-0 file:text-primary file:font-bold file:mr-4 file:px-4 file:py-1 file:rounded-sm hover:file:bg-primary/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contextual Directives</Label>
                    <textarea 
                      className="w-full min-h-[80px] rounded-sm font-mono border border-border bg-[#111] px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:border-primary" 
                      placeholder="e.g., node_01 consumed item A..."
                      value={scanMessage} onChange={e => setScanMessage(e.target.value)}
                      disabled={scanBillMutation.isPending}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-sm border-border/50 uppercase tracking-widest text-xs font-bold hover:bg-white/5" onClick={() => setScanMode(false)} disabled={scanBillMutation.isPending}>Abort</Button>
                    <Button className="flex-1 neon-glow rounded-sm uppercase tracking-widest text-xs font-bold" disabled={!scanImageStr || scanBillMutation.isPending} onClick={() => scanBillMutation.mutate({
                       imageBase64: scanImageStr?.base64,
                       mimeType: scanImageStr?.mime,
                       message: scanMessage,
                       members: group?.members,
                    })}>
                      {scanBillMutation.isPending ? 'Analyzing...' : 'Execute Scan'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex justify-end mb-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setScanMode(true)} className="text-xs uppercase tracking-widest font-bold bg-primary/10 text-primary hover:bg-primary/20 rounded-sm">
                      <Sparkles className="w-3 h-3 mr-1.5" /> AI Scan
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descriptor *</Label>
                    <Input placeholder="e.g. Server hosting" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value ({group.currency}) *</Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="font-mono text-right bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class</Label>
                  <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v ?? '' })}>
                    <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111] border-border/50">
                      {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                        <SelectItem key={c} value={c} className="font-mono text-xs focus:bg-white/5">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Source Node</Label>
                  <Select value={(expForm.payerId || (session?.user?.id ?? ''))} onValueChange={(v) => setExpForm({ ...expForm, payerId: v ?? '' })}>
                    <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue placeholder="Select node" /></SelectTrigger>
                    <SelectContent className="bg-[#111] border-border/50">
                      {group.members.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="font-mono text-xs focus:bg-white/5">
                          {m.name}{m.id === session?.user?.id ? ' (Self)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-4 border-t border-border/50 mt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Distribution</Label>
                    <div className="flex bg-[#111] p-1 rounded-sm border border-border/50">
                      <button type="button" onClick={() => setSplitMode('equal')} className={`px-4 py-1 text-xs uppercase tracking-widest font-bold rounded-sm ${splitMode === 'equal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Symmetric</button>
                      <button type="button" onClick={() => setSplitMode('custom')} className={`px-4 py-1 text-xs uppercase tracking-widest font-bold rounded-sm ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Asymmetric</button>
                    </div>
                  </div>
                  {splitMode === 'equal' ? (
                    <p className="text-[10px] font-mono text-muted-foreground pt-2 uppercase tracking-widest text-center">Balanced across {group.members.length} nodes.</p>
                  ) : (
                    <div className="space-y-3 mt-4">
                       {group.members.map(m => (
                         <div key={m.id} className="flex items-center justify-between gap-3">
                           <span className="text-xs font-mono uppercase tracking-widest truncate flex-1">{m.name}</span>
                           <div className="flex items-center gap-2 max-w-[120px]">
                             <span className="text-[10px] font-mono text-muted-foreground">{group.currency}</span>
                             <Input 
                               type="number" min="0" step="0.01" className="h-8 text-right font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" 
                               value={customSplits[m.id] || ''} 
                               onChange={e => setCustomSplits({...customSplits, [m.id]: e.target.value})} 
                             />
                           </div>
                         </div>
                       ))}
                       <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest border-t border-border/50 pt-3 mt-2">
                          <span className="text-muted-foreground">Matrix Sum:</span>
                          <span className={Math.abs(Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v)||0), 0) - parseFloat(expForm.amount||'0')) > 0.01 ? 'text-destructive font-bold' : 'text-primary font-bold'}>
                            {group.currency} {Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v)||0), 0).toFixed(2)}
                          </span>
                       </div>
                    </div>
                  )}
                </div>
                <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-6" disabled={addExpenseMutation.isPending} onClick={handleAddExpense}>
                  {addExpenseMutation.isPending ? 'Committing...' : 'Commit Record'}
                </Button>
              </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={editExpenseOpen} onOpenChange={(open) => {
            setEditExpenseOpen(open);
            if (!open) resetExpenseEditor();
          }}>
            <DialogContent className="sm:max-w-[425px] bg-[#0a0a0a] border border-border/50 rounded-sm">
              <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Update Record</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descriptor *</Label>
                  <Input placeholder="e.g. Server hosting" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Value ({group.currency}) *</Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} className="font-mono text-right bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Class</Label>
                  <Select value={expForm.category} onValueChange={(v) => setExpForm({ ...expForm, category: v ?? '' })}>
                    <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#111] border-border/50">
                      {['General', 'Food', 'Transport', 'Accommodation', 'Entertainment', 'Shopping', 'Utilities'].map((c) => (
                        <SelectItem key={c} value={c} className="font-mono text-xs focus:bg-white/5">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Source Node</Label>
                  <Select value={(expForm.payerId || (session?.user?.id ?? ''))} onValueChange={(v) => setExpForm({ ...expForm, payerId: v ?? '' })}>
                    <SelectTrigger className="font-mono bg-[#111] rounded-sm"><SelectValue placeholder="Select node" /></SelectTrigger>
                    <SelectContent className="bg-[#111] border-border/50">
                      {group.members.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="font-mono text-xs focus:bg-white/5">
                          {m.name}{m.id === session?.user?.id ? ' (Self)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-4 border-t border-border/50 mt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Distribution</Label>
                    <div className="flex bg-[#111] p-1 rounded-sm border border-border/50">
                      <button type="button" onClick={() => setSplitMode('equal')} className={`px-4 py-1 text-xs uppercase tracking-widest font-bold rounded-sm ${splitMode === 'equal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Symmetric</button>
                      <button type="button" onClick={() => setSplitMode('custom')} className={`px-4 py-1 text-xs uppercase tracking-widest font-bold rounded-sm ${splitMode === 'custom' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Asymmetric</button>
                    </div>
                  </div>
                  {splitMode === 'equal' ? (
                    <p className="text-[10px] font-mono text-muted-foreground pt-2 uppercase tracking-widest text-center">Balanced across {group.members.length} nodes.</p>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {group.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between gap-3">
                          <span className="text-xs font-mono uppercase tracking-widest truncate flex-1">{m.name}</span>
                          <div className="flex items-center gap-2 max-w-[120px]">
                            <span className="text-[10px] font-mono text-muted-foreground">{group.currency}</span>
                            <Input
                              type="number" min="0" step="0.01" className="h-8 text-right font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary"
                              value={customSplits[m.id] || ''}
                              onChange={e => setCustomSplits({ ...customSplits, [m.id]: e.target.value })}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest border-t border-border/50 pt-3 mt-2">
                        <span className="text-muted-foreground">Matrix Sum:</span>
                        <span className={Math.abs(Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0) - parseFloat(expForm.amount || '0')) > 0.01 ? 'text-destructive font-bold' : 'text-primary font-bold'}>
                          {group.currency} {Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-6" disabled={updateExpenseMutation.isPending} onClick={handleUpdateExpense}>
                  {updateExpenseMutation.isPending ? 'Updating...' : 'Update Record'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expenses */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Transaction Ledger</h2>
          {loadingExp ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20 bg-muted rounded-sm" />)}</div>
          ) : expenses.length === 0 ? (
            <Card className="border-dashed border-border/50 bg-transparent rounded-sm">
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-4">
                   <FileText className="text-muted-foreground w-5 h-5" />
                </div>
                <p className="font-bold uppercase tracking-wider text-sm mb-2">Ledger Empty</p>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest">No transactions detected</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-glass rounded-sm overflow-hidden">
              <CardContent className="p-0">
                {expenses.map((exp, i) => {
                  const payer = group.members.find((m) => m.id === exp.payerId);
                  return (
                    <div key={exp.id} className="group transition-colors hover:bg-white/5">
                      {i > 0 && <Separator className="bg-border/40" />}
                      <div className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-sm bg-[#111] border border-border/50 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm uppercase tracking-wider text-foreground">{exp.description}</p>
                            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                              SRC: {payer?.name ?? 'Unknown'} <span className="text-primary/50 mx-1">|</span> {exp.category}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{group.currency} {exp.amount.toFixed(2)}</p>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                            {new Date(exp.date).toISOString().split('T')[0]}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground"
                            onClick={() => openExpenseEditor(exp)}
                          >
                            <Pencil className="w-3 h-3 mr-1" /> Edit
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Nodes [{group.members.length}]</h2>
            {isOwner && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest border-border/50 rounded-sm hover:bg-white/5"><UserPlus className="w-3 h-3 mr-1" /> Connect</Button>} />
                <DialogContent className="sm:max-w-md bg-[#0a0a0a] border border-border/50 rounded-sm">
                  <DialogHeader><DialogTitle className="font-black uppercase tracking-widest">Connect Node</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Identifier (Email)</Label>
                      <Input type="email" placeholder="node@network.local" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className="font-mono bg-[#111] rounded-sm focus:ring-1 focus:ring-primary focus:border-primary" />
                    </div>
                    <Button className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest mt-2" disabled={!memberEmail || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate(memberEmail)}>
                      {addMemberMutation.isPending ? 'Connecting...' : 'Establish Link'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card className="card-glass rounded-sm">
            <CardContent className="p-0">
              {group.members.map((member, i) => (
                <div key={member.id} className="hover:bg-white/5 transition-colors">
                  {i > 0 && <Separator className="bg-border/40" />}
                  <div className="flex items-center gap-3 p-4">
                    <Avatar className="h-8 w-8 rounded-sm ring-1 ring-border">
                      <AvatarFallback className="text-[10px] font-bold bg-[#111] text-foreground rounded-sm flex items-center justify-center">
                        {member.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider truncate">{member.name}{member.id === session?.user?.id ? ' (Self)' : ''}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{member.email}</p>
                    </div>
                    {member.id === group.ownerId && <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-bold border-primary text-primary bg-primary/5 rounded-sm px-1.5">Admin</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isOwner && (
            <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive uppercase tracking-widest font-bold text-xs h-10 rounded-sm mt-4 transition-colors" onClick={() => {
              if (confirm('Critical Action: Purge entire network and ledger history? This is irreversible.')) deleteGroupMutation.mutate();
            }}>
              <Trash2 className="w-4 h-4 mr-2" /> Purge Network
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

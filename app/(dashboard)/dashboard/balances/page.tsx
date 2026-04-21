'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { Scale, AlertCircle, CheckCircle2 } from 'lucide-react';

type Settlement = { from: string; to: string; amount: number };
type BalanceEntry = { userId: string; balance: number };
type BalancesResponse = {
  groupId: string;
  currency: string;
  balances: BalanceEntry[];
  settlements: Settlement[];
  summary: { userId: string; owes: number }[];
  recordedSettlements: {
    id: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: 'pending' | 'confirmed';
    createdAt: string;
  }[];
};
type Group = { id: string; name: string; currency: string; members: { id: string; name: string }[] };
type MutationResponse = { error?: string };

function BalancesContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  const { data: session } = useSession();

  const { data: groupsData, isLoading: loadingGroups } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  });

  const selectedGroup = groupId
    ? groupsData?.groups.find((g) => g.id === groupId)
    : groupsData?.groups[0];

  const { data: balancesData, isLoading: loadingBalances } = useQuery<BalancesResponse>({
    queryKey: ['balances', selectedGroup?.id],
    queryFn: () => fetch(`/api/groups/${selectedGroup!.id}/balances`).then((r) => r.json()),
    enabled: !!selectedGroup?.id,
  });

  const { data: groupDetail } = useQuery<{ group: { members: { id: string; name: string }[] } }>({
    queryKey: ['group', selectedGroup?.id],
    queryFn: () => fetch(`/api/groups/${selectedGroup!.id}`).then((r) => r.json()),
    enabled: !!selectedGroup?.id,
  });

  const members = groupDetail?.group?.members ?? [];
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(-6);

  const queryClient = useQueryClient();

  const markPaidMutation = useMutation({
    mutationFn: (body: { groupId: string; toUserId: string; amount: number }) =>
      fetch('/api/settlements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    onSuccess: (data: MutationResponse) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Transfer initiated. Awaiting verification.');
      queryClient.invalidateQueries({ queryKey: ['balances', selectedGroup?.id] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/settlements/${id}/confirm`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: (data: MutationResponse) => {
      if (data.error) { toast.error(data.error); return; }
      toast.success('Funds Verified.');
      queryClient.invalidateQueries({ queryKey: ['balances', selectedGroup?.id] });
    },
  });

  const loading = loadingGroups || loadingBalances;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">Ledger Balances</h1>
        <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-widest">Network settlement matrix</p>
      </div>

      {/* Group selector */}
      {groupsData && groupsData.groups.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {groupsData.groups.map((g) => {
            const isSelected = g.id === selectedGroup?.id;
            return (
              <a key={g.id} href={`/dashboard/balances?groupId=${g.id}`}>
                <Badge 
                  variant={isSelected ? 'default' : 'outline'} 
                  className={`cursor-pointer px-4 py-1.5 rounded-sm font-bold uppercase tracking-wider text-xs transition-all ${
                    isSelected ? 'neon-glow bg-primary text-primary-foreground' : 'border-border/50 text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  {g.name}
                </Badge>
              </a>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 bg-muted rounded-sm" />
          <Skeleton className="h-48 bg-muted rounded-sm" />
        </div>
      ) : !selectedGroup ? (
        <Card className="border-dashed border-border/50 bg-transparent rounded-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-6">
               <Scale className="text-muted-foreground w-6 h-6" />
            </div>
            <p className="font-bold uppercase tracking-wider text-sm mb-2">No Networks Registered</p>
            <p className="text-muted-foreground font-mono text-xs mt-1 uppercase tracking-widest">Deploy a protocol to view ledgers</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Per-user balances */}
          <Card className="card-glass rounded-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-black/20">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Net Balances: {selectedGroup.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(balancesData?.balances ?? []).length === 0 ? (
                <p className="p-6 text-xs font-mono text-muted-foreground uppercase tracking-widest">Ledger is empty.</p>
              ) : (
                balancesData!.balances.map((entry, i) => {
                  const isPositive = entry.balance >= 0;
                  return (
                    <div key={entry.userId} className="hover:bg-white/5 transition-colors">
                      {i > 0 && <Separator className="bg-border/40" />}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-9 w-9 rounded-sm ring-1 ring-border border border-[#111]">
                            <AvatarFallback className="text-[10px] bg-[#111] font-bold text-foreground rounded-sm flex items-center justify-center">
                              {getName(entry.userId).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-bold uppercase tracking-wider">
                            {getName(entry.userId)}
                            {entry.userId === session?.user?.id ? ' (Self)' : ''}
                          </span>
                        </div>
                        <span className={`pl-14 sm:pl-0 font-mono font-bold tracking-widest text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                          {isPositive ? '+' : ''}{balancesData!.currency} {Math.abs(entry.balance).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Settlement plan */}
          <Card className="card-glass rounded-sm overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-black/20">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Settlement Vector</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {(balancesData?.settlements ?? []).length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Matrix Fully Resolved
                </p>
              ) : (
                <div className="space-y-4">
                  {balancesData!.settlements.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-sm border border-border/50 bg-[#111]">
                      <Avatar className="h-8 w-8 rounded-sm">
                        <AvatarFallback className="text-[10px] font-bold rounded-sm bg-background/50 border border-border">{getName(s.from).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs uppercase tracking-widest flex-1 leading-relaxed">
                        <span className="font-bold text-foreground">{getName(s.from)}</span>
                        {' -> TX -> '}
                        <span className="font-bold text-foreground">{getName(s.to)}</span>
                      </span>
                      <div className="flex items-center gap-4 border-l border-border/50 pl-4">
                        <Badge variant="outline" className="font-mono text-[10px] font-bold border-secondary text-secondary bg-secondary/5 rounded-sm px-2 py-0.5">
                          {balancesData!.currency} {s.amount.toFixed(2)}
                        </Badge>
                        {s.from === session?.user?.id && (
                          <Button size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest rounded-sm neon-glow" disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate({ groupId: selectedGroup!.id, toUserId: s.to, amount: s.amount })}>
                            Execute TX
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Reimbursements */}
          {balancesData?.recordedSettlements?.some(s => s.status === 'pending') && (
            <Card className="bg-[#111] border border-yellow-500/20 rounded-sm overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-yellow-500/5">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Pending Confirmations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  {balancesData.recordedSettlements.filter(s => s.status === 'pending').map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-sm border border-yellow-500/20 bg-background">
                      <div className="text-xs font-mono uppercase tracking-widest leading-relaxed break-words">
                        <span className="font-bold whitespace-nowrap">{getName(s.fromUserId)}</span>
                        <span className="text-muted-foreground mx-2">TRANSFERRED</span>
                        <span className="font-bold text-yellow-500 whitespace-nowrap">{balancesData.currency} {s.amount.toFixed(2)}</span>
                        <span className="text-muted-foreground mx-2">TO</span>
                        <span className="font-bold whitespace-nowrap">{getName(s.toUserId)}</span>
                      </div>
                      {s.toUserId === session?.user?.id ? (
                        <Button size="sm" variant="default" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-yellow-500 hover:bg-yellow-400 text-black rounded-sm sm:ml-4 shadow-[0_0_10px_rgba(234,179,8,0.3)]" onClick={() => confirmMutation.mutate(s.id)} disabled={confirmMutation.isPending}>
                          Verify Auth
                        </Button>
                      ) : (
                        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse sm:ml-4">Authenticating...</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

export default function BalancesPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8"><Skeleton className="h-96 bg-muted rounded-sm" /></div>}>
      <BalancesContent />
    </Suspense>
  );
}

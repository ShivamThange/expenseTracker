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
import { ArrowLeftRight, TriangleAlert, BadgeCheck } from 'lucide-react';

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
    ? groupsData?.groups?.find((g) => g.id === groupId)
    : groupsData?.groups?.[0];

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-7">
      <div className="pt-2">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Settlement</p>
        <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">Balances</h1>
        <p className="text-muted-foreground text-sm mt-1.5 font-light">See who owes whom</p>
      </div>

      {/* Group selector */}
      {(groupsData?.groups?.length ?? 0) > 0 && (
        <div className="flex gap-2 flex-wrap">
          {groupsData!.groups.map((g) => {
            const isSelected = g.id === selectedGroup?.id;
            return (
              <a key={g.id} href={`/dashboard/balances?groupId=${g.id}`}>
                <Badge
                  className={`cursor-pointer px-4 py-1.5 rounded-full font-semibold text-xs transition-all ${
                    isSelected
                      ? 'neon-glow bg-primary text-primary-foreground'
                      : 'badge-azure hover:bg-white/5'
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
        <div className="space-y-5">
          <Skeleton className="h-32 bg-muted rounded-xl" />
          <Skeleton className="h-48 bg-muted rounded-xl" />
        </div>
      ) : !selectedGroup ? (
        <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-xl mb-5">
               <ArrowLeftRight className="text-muted-foreground/60 w-5 h-5" />
            </div>
            <p className="font-bold text-sm mb-1.5">No groups yet</p>
            <p className="text-muted-foreground text-xs mt-1 font-light">Create a group to start tracking balances</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Per-user balances */}
          <Card className="card-glass rounded-xl overflow-hidden border-border/50">
            <CardHeader className="border-b border-border/40 bg-black/15 px-5 py-3.5">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Balances in {selectedGroup.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(balancesData?.balances ?? []).length === 0 ? (
                <p className="p-5 text-xs text-muted-foreground font-light">No expenses yet</p>
              ) : (
                balancesData!.balances.map((entry, i) => {
                  const isPositive = entry.balance >= 0;
                  return (
                    <div key={entry.userId} className="hover:bg-white/3 transition-colors">
                      {i > 0 && <Separator className="bg-border/40" />}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-9 w-9 rounded-lg ring-1 ring-border">
                            <AvatarFallback className="text-[10px] bg-muted font-bold text-foreground rounded-lg flex items-center justify-center">
                              {getName(entry.userId).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-foreground">
                            {getName(entry.userId)}
                            {entry.userId === session?.user?.id ? <span className="text-muted-foreground font-normal"> (you)</span> : ''}
                          </span>
                        </div>
                        <span className={`pl-14 sm:pl-0 mono-data font-bold text-base ${isPositive ? 'text-primary' : 'text-destructive'}`}
                          style={isPositive ? { textShadow: '0 0 12px rgba(240,112,64,0.3)' } : {}}>
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
          <Card className="card-glass rounded-xl overflow-hidden border-border/50">
            <CardHeader className="border-b border-border/40 bg-black/15 px-5 py-3.5">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Payments needed</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {(balancesData?.settlements ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2 font-light">
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" /> All settled up!
                </p>
              ) : (
                <div className="space-y-3">
                  {balancesData!.settlements.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-white/2">
                      <Avatar className="h-8 w-8 rounded-lg shrink-0">
                        <AvatarFallback className="text-[10px] font-bold rounded-lg bg-muted border border-border text-foreground">{getName(s.from).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs flex-1 leading-relaxed">
                        <span className="font-semibold text-foreground">{getName(s.from)}</span>
                        <span className="text-muted-foreground"> owes </span>
                        <span className="font-semibold text-foreground">{getName(s.to)}</span>
                      </span>
                      <div className="flex items-center gap-3 border-l border-border/50 pl-4 shrink-0">
                        <Badge className="badge-azure mono-data font-bold text-[10px] px-2 py-0.5 rounded-full">
                          {balancesData!.currency} {s.amount.toFixed(2)}
                        </Badge>
                        {s.from === session?.user?.id && (
                          <Button size="sm" className="h-7 text-[10px] font-bold rounded-lg neon-glow px-3" disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate({ groupId: selectedGroup!.id, toUserId: s.to, amount: s.amount })}>
                            Mark paid
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
            <Card className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl overflow-hidden">
              <CardHeader className="border-b border-yellow-500/15 bg-yellow-500/5 px-5 py-3.5">
                <CardTitle className="text-xs font-bold text-yellow-500 flex items-center gap-2">
                  <TriangleAlert className="w-3.5 h-3.5" /> Pending confirmations
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-3">
                  {balancesData!.recordedSettlements.filter(s => s.status === 'pending').map((s) => (
                    <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-yellow-500/20 bg-background/50">
                      <div className="text-xs leading-relaxed break-words">
                        <span className="font-semibold whitespace-nowrap text-foreground">{getName(s.fromUserId)}</span>
                        <span className="text-muted-foreground mx-2">sent</span>
                        <span className="mono-data font-bold text-yellow-500 whitespace-nowrap">{balancesData.currency} {s.amount.toFixed(2)}</span>
                        <span className="text-muted-foreground mx-2">to</span>
                        <span className="font-semibold whitespace-nowrap text-foreground">{getName(s.toUserId)}</span>
                      </div>
                      {s.toUserId === session?.user?.id ? (
                        <Button size="sm" className="h-8 text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg sm:ml-4 shadow-[0_0_12px_rgba(234,179,8,0.25)] px-4" onClick={() => confirmMutation.mutate(s.id)} disabled={confirmMutation.isPending}>
                          Confirm
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground animate-pulse sm:ml-4 font-medium">Waiting…</span>
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
    <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8"><Skeleton className="h-96 bg-muted rounded-xl" /></div>}>
      <BalancesContent />
    </Suspense>
  );
}

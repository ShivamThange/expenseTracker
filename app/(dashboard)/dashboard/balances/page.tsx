'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Suspense } from 'react';

type Settlement = { from: string; to: string; amount: number };
type BalanceEntry = { userId: string; balance: number };
type BalancesResponse = {
  groupId: string;
  currency: string;
  balances: BalanceEntry[];
  settlements: Settlement[];
  summary: { userId: string; owes: number }[];
};
type Group = { id: string; name: string; currency: string; members: { id: string; name: string }[] };

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

  // We need member info from the group detail API to map IDs to names
  const { data: groupDetail } = useQuery<{ group: { members: { id: string; name: string }[] } }>({
    queryKey: ['group', selectedGroup?.id],
    queryFn: () => fetch(`/api/groups/${selectedGroup!.id}`).then((r) => r.json()),
    enabled: !!selectedGroup?.id,
  });

  const members = groupDetail?.group?.members ?? [];
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id.slice(-6);

  const loading = loadingGroups || loadingBalances;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Balances</h1>
        <p className="text-muted-foreground mt-1">See who owes what and how to settle up</p>
      </div>

      {/* Group selector */}
      {groupsData && groupsData.groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {groupsData.groups.map((g) => (
            <a key={g.id} href={`/dashboard/balances?groupId=${g.id}`}>
              <Badge variant={g.id === selectedGroup?.id ? 'default' : 'secondary'} className="cursor-pointer px-3 py-1">
                {g.name}
              </Badge>
            </a>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      ) : !selectedGroup ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-muted-foreground">No groups yet. Create a group to see balances.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Per-user balances */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Net Balances in {selectedGroup.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(balancesData?.balances ?? []).length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">No expenses yet.</p>
              ) : (
                balancesData!.balances.map((entry, i) => {
                  const isPositive = entry.balance >= 0;
                  return (
                    <div key={entry.userId}>
                      {i > 0 && <Separator />}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getName(entry.userId).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {getName(entry.userId)}
                            {entry.userId === session?.user?.id ? ' (you)' : ''}
                          </span>
                        </div>
                        <span className={`font-semibold text-sm ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How to Settle Up</CardTitle>
            </CardHeader>
            <CardContent>
              {(balancesData?.settlements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">🎉 Everyone is settled up!</p>
              ) : (
                <div className="space-y-3">
                  {balancesData!.settlements.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{getName(s.from).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm flex-1">
                        <span className="font-medium">{getName(s.from)}</span>
                        {' pays '}
                        <span className="font-medium">{getName(s.to)}</span>
                      </span>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        {balancesData!.currency} {s.amount.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function BalancesPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-96" /></div>}>
      <BalancesContent />
    </Suspense>
  );
}

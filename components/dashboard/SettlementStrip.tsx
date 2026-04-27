'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  currency: string;
}

interface BalancesResponse {
  groupId: string;
  currency: string;
  summary: { userId: string; owes: number }[];
  recordedSettlements: {
    id: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    status: 'pending' | 'confirmed';
    createdAt: string;
  }[];
}

interface Member {
  id: string;
  name: string;
}

interface GroupDetail {
  group: {
    members: Member[];
  };
}

interface Settlement {
  personId: string;
  personName: string;
  groupName: string;
  amount: number;
  daysAgo: number;
  groupId: string;
}

export function SettlementStrip() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: groupsData, isLoading: groupsLoading } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  });

  const groupIds = groupsData?.groups.map((g) => g.id) ?? [];

  const balancesQueries = useQuery({
    queryKey: ['balances', 'all', groupIds],
    queryFn: async () => {
      if (!groupIds.length) return { balancesByGroup: {} };
      const results: Record<string, BalancesResponse> = {};
      for (const groupId of groupIds) {
        const data = await fetch(`/api/groups/${groupId}/balances`).then((r) => r.json());
        results[groupId] = data;
      }
      return { balancesByGroup: results };
    },
    enabled: groupIds.length > 0,
  });

  const groupDetailsQueries = useQuery({
    queryKey: ['group-details', 'all', groupIds],
    queryFn: async () => {
      if (!groupIds.length) return { detailsByGroup: {} };
      const results: Record<string, GroupDetail> = {};
      for (const groupId of groupIds) {
        const data = await fetch(`/api/groups/${groupId}`).then((r) => r.json());
        results[groupId] = data;
      }
      return { detailsByGroup: results };
    },
    enabled: groupIds.length > 0,
  });

  const isLoading = groupsLoading || balancesQueries.isLoading || groupDetailsQueries.isLoading;

  const settlements: Settlement[] = (() => {
    if (!balancesQueries.data || !groupDetailsQueries.data || !userId) return [];

    const result: Settlement[] = [];
    const { balancesByGroup } = balancesQueries.data;
    const { detailsByGroup } = groupDetailsQueries.data;

    for (const group of groupsData?.groups ?? []) {
      const balanceData = balancesByGroup[group.id];
      const groupDetail = detailsByGroup[group.id];
      const members = groupDetail?.group?.members ?? [];

      if (!balanceData?.recordedSettlements) continue;

      for (const settlement of balanceData.recordedSettlements) {
        const isOwnedToUser = settlement.toUserId === userId;
        const isOwnedByUser = settlement.fromUserId === userId;

        if (!isOwnedToUser && !isOwnedByUser) continue;

        const otherUserId = isOwnedToUser ? settlement.fromUserId : settlement.toUserId;
        const otherMember = members.find((m) => m.id === otherUserId);
        const daysAgo = Math.floor((Date.now() - new Date(settlement.createdAt).getTime()) / (1000 * 60 * 60 * 24));

        result.push({
          personId: otherUserId,
          personName: otherMember?.name ?? `User ${otherUserId.slice(-4)}`,
          groupName: group.name,
          amount: isOwnedToUser ? settlement.amount : -settlement.amount,
          daysAgo: Math.max(0, daysAgo),
          groupId: group.id,
        });
      }
    }

    return result.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  })();

  const totalOwedToMe = settlements.filter((s) => s.amount > 0).reduce((sum, s) => sum + s.amount, 0);
  const totalIOwe = Math.abs(settlements.filter((s) => s.amount < 0).reduce((sum, s) => sum + s.amount, 0));

  if (isLoading) {
    return (
      <Card className="card-glass rounded-xl border-border/50">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass rounded-xl border-border/50 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Balances & Settlements</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 border border-white/5 rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">Owed to you</p>
            <p className="mono-data text-xl font-bold" style={{ color: '#52C8A8' }}>
              ₹{totalOwedToMe.toFixed(2)}
            </p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">You owe</p>
            <p className="mono-data text-xl font-bold" style={{ color: '#E05252' }}>
              ₹{totalIOwe.toFixed(2)}
            </p>
          </div>
        </div>

        {settlements.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground font-light">No pending settlements</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {settlements.map((settlement) => {
              const initials = settlement.personName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={`${settlement.personId}-${settlement.groupId}`}
                  className="flex items-center justify-between py-3 border-t border-white/5"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 rounded text-[10px] font-bold shrink-0">
                      <AvatarFallback className={settlement.amount > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{settlement.personName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{settlement.groupName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="mono-data text-sm font-bold" style={{ color: settlement.amount > 0 ? '#52C8A8' : '#E05252' }}>
                        {settlement.amount > 0 ? '+' : '-'}₹{Math.abs(settlement.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{settlement.daysAgo}d ago</p>
                    </div>
                    {settlement.amount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-semibold rounded border-border/50 hover:bg-white/4 gap-1"
                        onClick={() => toast.success(`Reminder sent to ${settlement.personName}`)}
                      >
                        <Bell className="w-3 h-3" />
                        <span className="hidden sm:inline">Remind</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

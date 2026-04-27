'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  payerId: string;
  date: string;
}

interface Subscription {
  name: string;
  lastDate: Date;
  amount: number;
  daysUntilRenewal: number;
}

const COLORS = ['#F07040', '#4B8BF4', '#52C8A8', '#E8B847', '#9B6EE8', '#E05252'];

export function SubscriptionRadar() {
  const { data: expData, isLoading } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all&limit=1000').then((r) => r.json()),
  });

  const { subscriptions, totalMonthly, upcomingCount, upcomingDays } = useMemo(() => {
    if (!expData?.expenses) return { subscriptions: [], totalMonthly: 0, upcomingCount: 0, upcomingDays: 0 };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const subMap = new Map<string, { lastDate: Date; amount: number }>();

    for (const exp of expData.expenses.filter((e) => e.category === 'Subscriptions')) {
      const expTime = new Date(exp.date).getTime();
      const key = exp.description.toLowerCase();

      if (!subMap.has(key) || new Date(exp.date) > subMap.get(key)!.lastDate) {
        subMap.set(key, { lastDate: new Date(exp.date), amount: exp.amount });
      }
    }

    const subscriptions: Subscription[] = [];
    let totalMonthly = 0;
    let upcomingCount = 0;
    let upcomingDays = 999;

    for (const [name, { lastDate, amount }] of subMap.entries()) {
      const renewalDate = new Date(lastDate);
      renewalDate.setMonth(renewalDate.getMonth() + 1);
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 5 && daysUntil >= 0) {
        upcomingCount++;
        upcomingDays = Math.min(upcomingDays, daysUntil);
      }

      subscriptions.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        lastDate,
        amount,
        daysUntilRenewal: daysUntil,
      });

      // Add to monthly total if within this month
      const expTime = lastDate.getTime();
      if (expTime >= thisMonthStart && expTime <= thisMonthEnd) {
        totalMonthly += amount;
      }
    }

    return {
      subscriptions: subscriptions.sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal),
      totalMonthly,
      upcomingCount,
      upcomingDays: upcomingDays === 999 ? 0 : upcomingDays,
    };
  }, [expData]);

  if (isLoading) {
    return (
      <Card className="card-glass rounded-xl border-border/50">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <Skeleton className="h-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
          <Skeleton className="h-12 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass rounded-xl border-border/50 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Subscription Radar</p>
          <p className="text-xs text-muted-foreground font-light">Recurring charges this month</p>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 font-light">No subscriptions tracked</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {subscriptions.slice(0, 4).map((sub, i) => (
                <div key={sub.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{sub.name}</p>
                    <p className="text-[10px] text-muted-foreground">Renews in {sub.daysUntilRenewal}d</p>
                  </div>
                  <p className="mono-data text-sm font-bold text-foreground shrink-0">₹{sub.amount.toFixed(0)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-3 mt-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">Total monthly</p>
              <p className="mono-data text-xl font-bold text-foreground">₹{totalMonthly.toFixed(0)}</p>
            </div>

            {upcomingCount > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/25 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-500 mb-0.5">Renewals coming</p>
                  <p className="text-[10px] text-blue-500/80 font-light">
                    {upcomingCount} subscription{upcomingCount > 1 ? 's' : ''} renew in {upcomingDays} day{upcomingDays > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

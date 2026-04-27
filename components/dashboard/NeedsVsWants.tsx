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
  payerId: string;
  date: string;
}

const NEEDS = ['Utilities', 'Transport', 'Healthcare', 'Education', 'Accommodation', 'Groceries'];
const WANTS = ['Food', 'Entertainment', 'Shopping', 'Subscriptions', 'Travel', 'General'];

export function NeedsVsWants() {
  const { data: expData, isLoading } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all&limit=1000').then((r) => r.json()),
  });

  const { needsThisMonth, wantsThisMonth, needsLastMonth, wantsLastMonth, topWantCategory } = useMemo(() => {
    if (!expData?.expenses) return { needsThisMonth: 0, wantsThisMonth: 0, needsLastMonth: 0, wantsLastMonth: 0, topWantCategory: '' };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    let needsThis = 0,
      wantsThis = 0,
      needsLast = 0,
      wantsLast = 0;
    const wantsCatMap = new Map<string, number>();

    for (const exp of expData.expenses) {
      const expTime = new Date(exp.date).getTime();
      const isNeed = NEEDS.includes(exp.category);
      const isWant = WANTS.includes(exp.category);

      if (expTime >= thisMonthStart && expTime <= thisMonthEnd) {
        if (isNeed) needsThis += exp.amount;
        if (isWant) {
          wantsThis += exp.amount;
          wantsCatMap.set(exp.category, (wantsCatMap.get(exp.category) ?? 0) + exp.amount);
        }
      }

      if (expTime >= lastMonthStart && expTime <= lastMonthEnd) {
        if (isNeed) needsLast += exp.amount;
        if (isWant) wantsLast += exp.amount;
      }
    }

    const topWant = Array.from(wantsCatMap.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      needsThisMonth: needsThis,
      wantsThisMonth: wantsThis,
      needsLastMonth: needsLast,
      wantsLastMonth: wantsLast,
      topWantCategory: topWant?.[0] ?? '',
    };
  }, [expData]);

  const total = needsThisMonth + wantsThisMonth;
  const needsPct = total > 0 ? Math.round((needsThisMonth / total) * 100) : 0;
  const wantsPct = total > 0 ? Math.round((wantsThisMonth / total) * 100) : 0;

  const wantsIncreased = wantsThisMonth > wantsLastMonth;
  const wantsDiff = wantsThisMonth - wantsLastMonth;

  if (isLoading) {
    return (
      <Card className="card-glass rounded-xl border-border/50">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-6 rounded-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass rounded-xl border-border/50 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Needs vs Wants</p>
          <p className="text-xs text-muted-foreground font-light">This month's spending breakdown</p>
        </div>

        <div className="flex gap-2 h-2 rounded-full bg-muted overflow-hidden border border-border/40">
          <div className="rounded-full transition-all" style={{ width: `${needsPct}%`, background: '#E05252' }} />
          <div className="rounded-full transition-all" style={{ width: `${wantsPct}%`, background: '#E8B847' }} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#E05252' }} />
              <p className="text-xs font-bold text-foreground">Needs</p>
            </div>
            <p className="mono-data text-2xl font-bold text-foreground">₹{needsThisMonth.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-light">Utilities, Transport, Food, Healthcare</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: '#E8B847' }} />
              <p className="text-xs font-bold text-foreground">Wants</p>
            </div>
            <p className="mono-data text-2xl font-bold text-foreground">₹{wantsThisMonth.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-light">Entertainment, Shopping, Travel</p>
          </div>
        </div>

        {wantsIncreased && (
          <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-yellow-500 mb-0.5">Wants are up</p>
              <p className="text-[10px] text-yellow-500/80 font-light">
                ₹{wantsDiff.toFixed(0)} more than last month, mostly from {topWantCategory}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

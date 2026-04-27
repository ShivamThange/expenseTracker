'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useSession } from 'next-auth/react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  payerId: string;
  date: string;
}

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  savedVsLastMonth: number;
  achievements: string[];
}

export function StreakAndWins() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: expData } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all&limit=1000').then((r) => r.json()),
  });

  const { data: budgetData } = useQuery<{ budget: number }>({
    queryKey: ['budget'],
    queryFn: () => fetch('/api/user/budget').then((r) => r.json()),
  });

  const { currentStreak, bestStreak, savedVsLastMonth, achievements } = useMemo(() => {
    if (!expData?.expenses || !userId) return { currentStreak: 0, bestStreak: 0, savedVsLastMonth: 0, achievements: [] };

    const budget = budgetData?.budget ?? 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyBudget = budget > 0 ? budget / daysInMonth : 0;

    // Calculate spending by day (only user's expenses)
    const dailySpend = new Map<string, number>();
    let lastMonthTotal = 0,
      thisMonthTotal = 0;

    for (const exp of expData.expenses.filter((e) => e.payerId === userId)) {
      const expTime = new Date(exp.date).getTime();
      const expDate = new Date(exp.date);
      const dateKey = expDate.toISOString().split('T')[0];

      if (expTime >= monthStart && expTime <= monthEnd) {
        thisMonthTotal += exp.amount;
        dailySpend.set(dateKey, (dailySpend.get(dateKey) ?? 0) + exp.amount);
      }

      if (expTime >= lastMonthStart && expTime <= lastMonthEnd) {
        lastMonthTotal += exp.amount;
      }
    }

    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < daysInMonth; i++) {
      const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const dateKey = date.toISOString().split('T')[0];
      const daySpend = dailySpend.get(dateKey) ?? 0;

      const isUnderBudget = dailyBudget === 0 || daySpend === 0 || daySpend < dailyBudget;

      if (isUnderBudget && date <= now) {
        tempStreak++;
        if (i === daysInMonth - 1 || date.getDate() === now.getDate()) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      bestStreak = Math.max(bestStreak, tempStreak);
    }

    // Achievements
    const achievements: string[] = [];

    if (currentStreak >= 5) {
      achievements.push(`On fire · ${currentStreak} days`);
    }

    const noShoppingOrEntertainment = !expData.expenses.some(
      (e) =>
        e.payerId === userId && (e.category === 'Shopping' || e.category === 'Entertainment') && new Date(e.date).getTime() >= Date.now() - 3 * 24 * 60 * 60 * 1000,
    );

    if (noShoppingOrEntertainment) {
      achievements.push('No impulse buys · 3 days');
    }

    if (thisMonthTotal > 0 && lastMonthTotal > 0 && thisMonthTotal < lastMonthTotal) {
      achievements.push('Spending down · vs last month');
    }

    const savedVsLastMonth = Math.max(0, lastMonthTotal - thisMonthTotal);

    return {
      currentStreak,
      bestStreak,
      savedVsLastMonth,
      achievements: achievements.slice(0, 3),
    };
  }, [expData, budgetData, userId]);

  const isLoading = !expData || !budgetData;

  if (isLoading) {
    return (
      <Card className="card-glass rounded-xl border-border/50">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <Skeleton className="h-8 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-glass rounded-xl border-border/50 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Streak & Wins</p>
          <p className="text-xs text-muted-foreground font-light">Your monthly progress</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="mono-data text-2xl font-bold text-green-400">{currentStreak}</p>
                <p className="text-[10px] text-muted-foreground font-light">days under budget</p>
              </div>
            </div>
          </div>

          <div className="bg-white/3 border border-white/5 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">💰</span>
              <div>
                <p className="mono-data text-2xl font-bold text-blue-400">₹{savedVsLastMonth.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground font-light">saved vs last month</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Best streak: {bestStreak} days</p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all"
              style={{ width: `${Math.min((bestStreak / 31) * 100, 100)}%` }}
            />
          </div>
        </div>

        {achievements.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {achievements.map((achievement) => (
              <div key={achievement} className="bg-primary/15 border border-primary/30 rounded-full px-3 py-1.5 text-[10px] font-semibold text-primary">
                ✓ {achievement}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

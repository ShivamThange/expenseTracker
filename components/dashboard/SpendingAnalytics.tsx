'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, TrendingUp, TrendingDown, TriangleAlert, Crosshair } from 'lucide-react';

interface Expense {
  id: string;
  amount: number;
  category: string;
  payerId: string;
  date: string;
}

interface CategorySpend {
  category: string;
  amount: number;
  pct: number;
}

export function SpendingAnalytics() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const { data: budgetData } = useQuery<{ budget: number }>({
    queryKey: ['budget'],
    queryFn: () => fetch('/api/user/budget').then(r => r.json()),
  });
  const budget = budgetData?.budget ?? 0;

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const effectiveBudgetInput = budgetInput === '' && budget > 0 ? String(budget) : budgetInput;

  const setBudgetMutation = useMutation({
    mutationFn: (val: number) =>
      fetch('/api/user/budget', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budget: val }) }).then(r => r.json()),
    onSuccess: () => {
      toast.success('Budget locked in.');
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      setBudgetOpen(false);
    },
  });

  const { data: expData } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all&limit=1000').then(r => r.json()),
  });

  const now = new Date();
  const monthStartMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEndMs = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  const monthEnd = new Date(monthEndMs);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();

  const myExpensesThisMonth = (() => {
    if (!expData?.expenses || !userId) return [];
    return expData.expenses.filter(e => {
      const d = new Date(e.date).getTime();
      return e.payerId === userId && d >= monthStartMs && d <= monthEndMs;
    });
  })();

  const totalSpent = myExpensesThisMonth.reduce((sum, e) => sum + e.amount, 0);

  const categoryBreakdown: CategorySpend[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of myExpensesThisMonth) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [myExpensesThisMonth, totalSpent]);

  const budgetPct = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;
  const remaining = budget > 0 ? Math.max(budget - totalSpent, 0) : 0;
  const isOverBudget = budget > 0 && totalSpent > budget;
  const dailyAvgSpend = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projectedMonthly = dailyAvgSpend * daysInMonth;

  const getBarClasses = useCallback((pct: number) => {
    if (pct >= 100) return 'progress-danger';
    if (pct >= 75) return 'progress-warning';
    return 'progress-lime';
  }, []);

  const categoryColors = ['#F07040', '#4B8BF4', '#52C8A8', '#E8B847', '#9B6EE8', '#E05252'];

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display italic font-black text-xl text-foreground tracking-tight">Spending</h2>
          <span className="text-[11px] text-muted-foreground font-medium">{monthLabel}</span>
        </div>
        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogTrigger render={
            <Button variant="outline" size="sm" className="h-7 text-xs font-semibold border-border/50 rounded-lg hover:bg-white/4 gap-1.5">
              <Settings className="w-3 h-3" /> {budget > 0 ? 'Edit budget' : 'Set budget'}
            </Button>
          } />
          <DialogContent className="sm:max-w-sm bg-card border-border/50 rounded-xl">
            <DialogHeader>
              <DialogTitle className="font-display italic font-black text-lg tracking-tight">Set monthly budget</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Your spending limit for this month</p>
                <Input
                  type="number" min="0" step="100" placeholder="e.g. 5000"
                  value={effectiveBudgetInput} onChange={e => setBudgetInput(e.target.value)}
                  className="mono-data text-right bg-[var(--surface-input)] rounded-lg text-lg h-12 input-glow border-border focus:border-primary"
                />
              </div>
              <Button
                className="w-full neon-glow-lg rounded-lg font-bold"
                disabled={setBudgetMutation.isPending}
                onClick={() => {
                  const val = parseFloat(effectiveBudgetInput);
                  if (isNaN(val) || val < 0) { toast.error('Enter a valid amount'); return; }
                  setBudgetMutation.mutate(val);
                }}
              >
                {setBudgetMutation.isPending ? 'Saving…' : 'Set budget'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main spending card */}
        <Card className="card-glass rounded-xl lg:col-span-2 overflow-hidden border-border/50">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Top metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total spent</p>
                <p className={`mono-data text-3xl font-bold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                  {totalSpent.toFixed(2)}
                </p>
              </div>
              {budget > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Remaining</p>
                  <p className={`mono-data text-3xl font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}
                    style={!isOverBudget ? { textShadow: '0 0 16px rgba(240,112,64,0.3)' } : {}}>
                    {isOverBudget ? `-${(totalSpent - budget).toFixed(2)}` : remaining.toFixed(2)}
                  </p>
                </div>
              )}
              {budget > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Safe to spend today</p>
                  <p className="mono-data text-3xl font-bold text-foreground">
                    {(daysInMonth > dayOfMonth ? remaining / (daysInMonth - dayOfMonth + 1) : 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-light">
                    {dailyAvgSpend > (daysInMonth > dayOfMonth ? remaining / (daysInMonth - dayOfMonth + 1) : 0) ? '📉 Behind pace' : '📈 On track'}
                  </p>
                </div>
              )}
            </div>

            {/* Budget progress */}
            {budget > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOverBudget ? (
                      <TriangleAlert className="w-3.5 h-3.5 text-destructive" />
                    ) : budgetPct >= 75 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {isOverBudget ? 'Over budget' : `${budgetPct}% of budget`}
                    </span>
                  </div>
                  <span className="mono-data text-[11px] text-muted-foreground">{budget.toFixed(2)}</span>
                </div>

                <div className="relative h-2 rounded-full bg-muted border border-border/40 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 rounded-full ${getBarClasses(budgetPct)} ${isOverBudget ? 'animate-pulse' : ''}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                  <div className="absolute top-0 bottom-0 left-[75%] w-px bg-yellow-500/25" />
                </div>

                {dayOfMonth < daysInMonth && (
                  <p className="text-[11px] text-muted-foreground text-center font-medium">
                    On pace for:{' '}
                    <span className={`font-bold mono-data ${projectedMonthly > budget ? 'text-destructive' : 'text-primary'}`}>
                      {projectedMonthly.toFixed(2)}
                    </span>
                    {projectedMonthly > budget && ' — over budget'}
                  </p>
                )}
              </div>
            )}

            {/* No budget CTA */}
            {budget === 0 && (
              <div className="border border-dashed border-primary/25 rounded-xl p-6 text-center animate-float">
                <div className="flex justify-center mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Crosshair className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                  </div>
                </div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 font-light">Set a monthly budget to track your spending</p>
                <Button variant="outline" size="sm" className="h-7 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10" onClick={() => setBudgetOpen(true)}>
                  Set budget
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="card-glass rounded-xl overflow-hidden border-border/50">
          <CardHeader className="border-b border-border/40 bg-black/15 px-5 py-3.5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">By category</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 font-light">No spending data yet</p>
            ) : (
              categoryBreakdown.slice(0, 6).map((cat, i) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-medium">{cat.pct}%</span>
                      <span className="mono-data text-xs text-foreground font-bold">{cat.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.pct}%`, background: categoryColors[i % categoryColors.length] }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

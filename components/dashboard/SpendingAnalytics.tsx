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
import { Settings, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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
  pct: number; // percentage of total
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SpendingAnalytics() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  // Budget
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

  // All expenses (current month)
  const { data: expData } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', 'all'],
    queryFn: () => fetch('/api/expenses?groupId=all&limit=1000').then(r => r.json()),
  });

  // Compute spending metrics
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

  // Category breakdown
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

  // Budget calculations
  const budgetPct = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0;
  const remaining = budget > 0 ? Math.max(budget - totalSpent, 0) : 0;
  const isOverBudget = budget > 0 && totalSpent > budget;
  const dailyAvgSpend = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;
  const projectedMonthly = dailyAvgSpend * daysInMonth;

  // Bar color
  const getBarColor = useCallback((pct: number) => {
    if (pct >= 100) return 'bg-destructive';
    if (pct >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  }, []);

  const categoryColors = ['bg-primary', 'bg-secondary', 'bg-blue-500', 'bg-yellow-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500'];

  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Spending Analytics — {monthLabel}
        </h2>
        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogTrigger render={
            <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest border-border/50 rounded-sm hover:bg-white/5">
              <Settings className="w-3 h-3 mr-1.5" /> {budget > 0 ? 'Edit Budget' : 'Set Budget'}
            </Button>
          } />
          <DialogContent className="sm:max-w-sm bg-[#0a0a0a] border border-border/50 rounded-sm">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-widest text-sm">Monthly Budget</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Set your spending limit for this month</p>
                <Input
                  type="number" min="0" step="100" placeholder="e.g. 5000"
                  value={effectiveBudgetInput} onChange={e => setBudgetInput(e.target.value)}
                  className="font-mono text-right bg-[#111] rounded-sm text-lg h-12 focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <Button
                className="w-full neon-glow rounded-sm font-bold uppercase tracking-widest"
                disabled={setBudgetMutation.isPending}
                onClick={() => {
                  const val = parseFloat(effectiveBudgetInput);
                  if (isNaN(val) || val < 0) { toast.error('Enter a valid amount'); return; }
                  setBudgetMutation.mutate(val);
                }}
              >
                {setBudgetMutation.isPending ? 'Saving...' : 'Lock Budget'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main spending card with budget progress */}
        <Card className="card-glass rounded-sm lg:col-span-2 overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Top metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Spent</p>
                <p className={`text-xl sm:text-2xl font-mono font-bold ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
                  {totalSpent.toFixed(2)}
                </p>
              </div>
              {budget > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Remaining</p>
                  <p className={`text-xl sm:text-2xl font-mono font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                    {isOverBudget ? `-${(totalSpent - budget).toFixed(2)}` : remaining.toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Daily Avg</p>
                <p className="text-xl sm:text-2xl font-mono font-bold text-foreground">
                  {dailyAvgSpend.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Budget progress bar */}
            {budget > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOverBudget ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : budgetPct >= 75 ? (
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-mono uppercase tracking-widest">
                      {isOverBudget ? 'Over Budget' : `${budgetPct}% Used`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    Budget: {budget.toFixed(2)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-3 rounded-full bg-[#111] border border-border/50 overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${getBarColor(budgetPct)} ${isOverBudget ? 'animate-pulse' : ''}`}
                    style={{ width: `${Math.min(budgetPct, 100)}%` }}
                  />
                  {/* 75% marker */}
                  <div className="absolute top-0 bottom-0 left-[75%] w-px bg-yellow-500/50" />
                </div>

                {/* Projected */}
                {dayOfMonth < daysInMonth && (
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-center">
                    Projected month-end: <span className={`font-bold ${projectedMonthly > budget ? 'text-destructive' : 'text-primary'}`}>{projectedMonthly.toFixed(2)}</span>
                    {projectedMonthly > budget && ' ⚠ Exceeds budget'}
                  </p>
                )}
              </div>
            )}

            {/* No budget set CTA */}
            {budget === 0 && (
              <div className="border border-dashed border-border/50 rounded-sm p-4 text-center">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">No budget configured</p>
                <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold tracking-widest rounded-sm border-primary/30 text-primary hover:bg-primary/10" onClick={() => setBudgetOpen(true)}>
                  Set Monthly Budget
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card className="card-glass rounded-sm overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-black/20 p-4">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest">By Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {categoryBreakdown.length === 0 ? (
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-center py-4">No spending data</p>
            ) : (
              categoryBreakdown.slice(0, 6).map((cat, i) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[9px] border-border rounded-sm px-1 py-0">{cat.pct}%</Badge>
                      <span className="text-xs font-mono text-foreground">{cat.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#111] border border-border/30 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${categoryColors[i % categoryColors.length]}`}
                      style={{ width: `${cat.pct}%` }}
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

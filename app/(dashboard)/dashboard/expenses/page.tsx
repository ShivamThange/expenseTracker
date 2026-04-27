'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Receipt, ArrowRight } from 'lucide-react';

type Group = { id: string; name: string; currency: string };
type Expense = { id: string; description: string; amount: number; category: string; date: string; payerId: string };

export default function ExpensesPage() {
  const { data: groupsData, isLoading: loadingGroups } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  });

  const groups = groupsData?.groups ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="pt-2">
        <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Across all groups</p>
        <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">All Expenses</h1>
        <p className="text-muted-foreground text-sm mt-1.5 font-light">See all expenses across your groups</p>
      </div>

      {loadingGroups ? (
        <div className="space-y-6">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 bg-muted rounded-xl" />)}</div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="w-14 h-14 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-xl mb-5">
               <Receipt className="text-muted-foreground/60 w-6 h-6" />
            </div>
            <p className="font-bold text-sm mb-1.5">No expenses yet</p>
            <p className="text-muted-foreground text-xs mt-1 mb-7 font-light">Create a group to start tracking expenses</p>
            <Button asChild className="neon-glow rounded-lg font-bold text-xs h-9 px-6">
              <Link href="/dashboard/groups">Create a group</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {groups.map((group) => (
            <GroupExpenses key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupExpenses({ group }: { group: Group }) {
  const { data, isLoading } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', group.id],
    queryFn: () => fetch(`/api/expenses?groupId=${group.id}&limit=5`).then((r) => r.json()),
  });

  const expenses = data?.expenses ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/groups/${group.id}`} className="font-bold text-sm uppercase tracking-widest text-foreground hover:text-primary transition-colors flex items-center group">
            {group.name}
            <ArrowRight className="w-3.5 h-3.5 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
          </Link>
          <Badge className="badge-azure font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
            {group.currency}
          </Badge>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 bg-muted rounded-xl" />
      ) : expenses.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2 font-light">No expenses yet</p>
      ) : (
        <Card className="card-glass rounded-xl overflow-hidden border-border/50">
          <CardContent className="p-0">
            {expenses.map((exp, i) => (
              <div key={exp.id} className="group hover:bg-white/3 transition-colors">
                {i > 0 && <Separator className="bg-border/40" />}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center group-hover:border-primary/30 transition-colors shrink-0">
                      <Receipt className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{exp.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {exp.category} <span className="text-primary/30 mx-1">·</span> {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <p className="mono-data font-bold text-foreground pl-14 sm:pl-0 text-left sm:text-right text-sm">
                    {group.currency} {exp.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

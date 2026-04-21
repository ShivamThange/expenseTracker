'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">Global Ledger</h1>
        <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-widest">Aggregated network transactions</p>
      </div>

      {loadingGroups ? (
        <div className="space-y-6">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 bg-muted rounded-sm" />)}</div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent rounded-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-6">
               <FileText className="text-muted-foreground w-6 h-6" />
            </div>
            <p className="font-bold uppercase tracking-wider text-sm mb-2">No Transactions Detected</p>
            <p className="text-muted-foreground font-mono text-xs mt-1 mb-8 uppercase tracking-widest">Deploy a network to begin tracking</p>
            <Button asChild className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6">
              <Link href="/dashboard/groups">Initialize Network</Link>
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
          <Link href={`/dashboard/groups/${group.id}`} className="font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors flex items-center group">
            {group.name}
            <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
          </Link>
          <Badge variant="outline" className="font-mono text-[10px] border-secondary text-secondary bg-secondary/5 rounded-sm px-1.5 py-0">
            {group.currency}
          </Badge>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 bg-muted rounded-sm" />
      ) : expenses.length === 0 ? (
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest py-2">Ledger Empty.</p>
      ) : (
        <Card className="card-glass rounded-sm overflow-hidden">
          <CardContent className="p-0">
            {expenses.map((exp, i) => (
              <div key={exp.id} className="group hover:bg-white/5 transition-colors">
                {i > 0 && <Separator className="bg-border/40" />}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-sm bg-[#111] border border-border/50 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-wider text-foreground">{exp.description}</p>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                        {exp.category} <span className="text-primary/50 mx-1">|</span> {new Date(exp.date).toISOString().split('T')[0]}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono font-bold text-foreground drop-shadow-[0_0_5px_rgba(255,255,255,0.2)] pl-14 sm:pl-0 text-left sm:text-right">
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

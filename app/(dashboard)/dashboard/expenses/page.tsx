'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Group = { id: string; name: string; currency: string };
type Expense = { id: string; description: string; amount: number; category: string; date: string; payerId: string };

export default function ExpensesPage() {
  const { data: groupsData, isLoading: loadingGroups } = useQuery<{ groups: Group[] }>({
    queryKey: ['groups'],
    queryFn: () => fetch('/api/groups').then((r) => r.json()),
  });

  const groups = groupsData?.groups ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground mt-1">All expenses across your groups</p>
      </div>

      {loadingGroups ? (
        <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-4xl mb-3">💳</p>
            <p className="font-medium">No expenses yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">Create a group to start adding expenses</p>
            <Button asChild><Link href="/dashboard/groups">Go to Groups</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
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
      <div className="flex items-center justify-between mb-3">
        <Link href={`/dashboard/groups/${group.id}`} className="font-semibold hover:text-primary transition-colors">
          {group.name}
        </Link>
        <Badge variant="secondary">{group.currency}</Badge>
      </div>
      {isLoading ? (
        <Skeleton className="h-20" />
      ) : expenses.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No expenses yet.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            {expenses.map((exp, i) => (
              <div key={exp.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-xs">💳</div>
                    <div>
                      <p className="text-sm font-medium">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">{exp.category} · {new Date(exp.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{group.currency} {exp.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

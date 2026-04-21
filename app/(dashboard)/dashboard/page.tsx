import { auth } from '@/lib/auth/auth';
import { getGroupsByUser } from '@/lib/db/queries/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SpendingAnalytics } from '@/components/dashboard/SpendingAnalytics';

export const metadata: Metadata = { title: 'Overview' };

export default async function DashboardPage() {
  const session = await auth();
  const groups = await getGroupsByUser(session!.user!.id!);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">Terminal Overview</h1>
        <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-widest">
          Welcome back, {firstName} | Status: Online
        </p>
      </div>

    {/* Stats row */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Card className="card-glass border-t-2 border-t-primary/50 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
        <CardContent className="pt-6 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Networks</p>
          <p className="text-4xl font-mono mt-2 text-foreground drop-shadow-[0_0_10px_rgba(200,255,0,0.3)]">{groups.length}</p>
        </CardContent>
      </Card>
      <Card className="card-glass border-t-2 border-t-secondary/50 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-all" />
        <CardContent className="pt-6 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Nodes</p>
          <p className="text-4xl font-mono mt-2 text-foreground drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
            {[...new Set(groups.flatMap((g) => g.memberIds))].length}
          </p>
        </CardContent>
      </Card>
      <Card className="card-glass border-t-2 border-t-primary/50 relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
        <CardContent className="pt-6 relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fiat Pairs</p>
          <p className="text-4xl font-mono mt-2 text-foreground drop-shadow-[0_0_10px_rgba(200,255,0,0.3)]">
            {[...new Set(groups.map((g) => g.currency))].length}
          </p>
        </CardContent>
      </Card>
    </div>

      {/* Spending Analytics */}
      <SpendingAnalytics />

    {/* Groups section */}
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Networks</h2>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold uppercase tracking-wider rounded-sm border-border/50 hover:bg-white/5" asChild>
          <Link href="/dashboard/groups">View All / [01]</Link>
        </Button>
      </div>

      {groups.length === 0 ? (
        <Card className="border-dashed border-border/50 bg-transparent">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 mx-auto border border-dashed border-muted-foreground/30 flex items-center justify-center rounded-sm mb-4">
              <span className="text-muted-foreground font-mono text-xl">+</span>
            </div>
            <p className="font-bold uppercase tracking-wider text-sm mb-2">No Networks Found</p>
            <p className="text-muted-foreground font-mono text-xs mb-6 uppercase tracking-widest">Awaiting initialization</p>
            <Button asChild className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6">
              <Link href="/dashboard/groups">Initialize Network</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.slice(0, 4).map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="card-glass hover:border-primary/50 hover:shadow-[0_0_15px_rgba(200,255,0,0.1)] transition-all cursor-pointer h-full rounded-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-bold uppercase tracking-wider">{group.name}</CardTitle>
                    <Badge variant="outline" className="font-mono text-[10px] border-secondary text-secondary bg-secondary/5 rounded-sm">{group.currency}</Badge>
                  </div>
                  {group.description && (
                    <p className="text-xs font-mono text-muted-foreground line-clamp-1 mt-2">{group.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    [ {group.memberIds.length} Nodes ]
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>

    {/* Quick actions */}
    <div>
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Quick Actions</h2>
      <div className="flex flex-wrap gap-4">
        <Button asChild className="neon-glow rounded-sm font-bold uppercase tracking-widest text-xs h-10 px-6">
          <Link href="/dashboard/groups">Initialize Network</Link>
        </Button>
        <Button variant="outline" asChild className="rounded-sm border-border/50 hover:bg-white/5 font-bold uppercase tracking-widest text-xs h-10 px-6">
          <Link href="/dashboard/balances">Review Ledgers</Link>
        </Button>
      </div>
    </div>
  </div>
  );
}

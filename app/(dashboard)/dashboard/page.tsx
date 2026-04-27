import { auth } from '@/lib/auth/auth';
import { getGroupsByUser } from '@/lib/db/queries/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SpendingAnalytics } from '@/components/dashboard/SpendingAnalytics';
import { SettlementStrip } from '@/components/dashboard/SettlementStrip';
import { NeedsVsWants } from '@/components/dashboard/NeedsVsWants';
import { SubscriptionRadar } from '@/components/dashboard/SubscriptionRadar';
import { StreakAndWins } from '@/components/dashboard/StreakAndWins';
import { Plus, ArrowRight, ArrowLeftRight, Contact } from 'lucide-react';

export const metadata: Metadata = { title: 'Overview' };

export default async function DashboardPage() {
  const session = await auth();
  const groups = await getGroupsByUser(session!.user!.id!);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 pt-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Dashboard</p>
          <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">
            Hey, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">
            Here's a snapshot of your shared expenses.
          </p>
        </div>
        <Button asChild className="neon-glow-lg rounded-lg font-bold text-xs h-9 px-4 w-fit sm:mt-1">
          <Link href="/dashboard/groups" className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>New group</span>
          </Link>
        </Button>
      </div>

      {/* Settlement Strip */}
      <SettlementStrip />

      {/* Spending Analytics */}
      <SpendingAnalytics />

      {/* Needs vs Wants */}
      <NeedsVsWants />

      {/* Subscription Radar and Streak & Wins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SubscriptionRadar />
        <StreakAndWins />
      </div>

      {/* Groups section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="font-display italic font-black text-xl text-foreground tracking-tight">Your groups</h2>
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold rounded-lg border-border/50 hover:bg-white/4 gap-1.5" asChild>
            <Link href="/dashboard/groups">
              See all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card className="border-dashed border-border/50 bg-transparent rounded-xl">
            <CardContent className="py-12 text-center">
              <div className="w-11 h-11 mx-auto border border-dashed border-primary/30 flex items-center justify-center rounded-lg mb-4">
                <span className="text-primary text-lg">+</span>
              </div>
              <p className="font-bold text-sm mb-1.5">No groups yet</p>
              <p className="text-muted-foreground text-xs mb-6 font-light">Create a group to start tracking expenses</p>
              <Button asChild className="neon-glow rounded-lg font-bold text-xs h-9 px-6">
                <Link href="/dashboard/groups">Create a group</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {groups.slice(0, 4).map((group) => (
              <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                <Card className="card-glass card-hover rounded-xl h-full border-border/50 hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-bold text-foreground">{group.name}</CardTitle>
                      <Badge className="badge-azure text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">{group.currency}</Badge>
                    </div>
                    {group.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1.5 font-light">{group.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Contact className="w-3.5 h-3.5" />
                      {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-display italic font-black text-xl text-foreground tracking-tight mb-5">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="neon-glow-lg rounded-lg font-bold text-xs h-9 px-6 gap-2">
            <Link href="/dashboard/groups">
              <Plus className="w-3.5 h-3.5" />
              Create group
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-lg border-border/50 hover:bg-white/4 font-semibold text-xs h-9 px-6 gap-2">
            <Link href="/dashboard/balances">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              View balances
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

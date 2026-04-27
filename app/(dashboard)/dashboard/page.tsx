import { auth } from '@/lib/auth/auth';
import { getGroupsByUser } from '@/lib/db/queries/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SpendingAnalytics } from '@/components/dashboard/SpendingAnalytics';
import { Share2, Contact, Coins, Plus, ArrowRight, ArrowLeftRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Overview' };

export default async function DashboardPage() {
  const session = await auth();
  const groups = await getGroupsByUser(session!.user!.id!);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 sm:space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pt-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1.5">Dashboard</p>
          <h1 className="font-display italic font-black text-3xl sm:text-4xl tracking-tight text-foreground">
            Hey, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 font-light">
            Here's a snapshot of your shared expenses.
          </p>
        </div>
        <Button asChild className="neon-glow-lg rounded-lg font-bold text-xs h-9 px-4 shrink-0 mt-1">
          <Link href="/dashboard/groups" className="flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            <span>New group</span>
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Groups', value: groups.length, icon: Share2, color: '#F07040', bg: 'rgba(240,112,64,0.1)', border: 'rgba(240,112,64,0.2)' },
          { label: 'Members', value: [...new Set(groups.flatMap((g) => g.memberIds))].length, icon: Contact, color: '#4B8BF4', bg: 'rgba(75,139,244,0.1)', border: 'rgba(75,139,244,0.2)' },
          { label: 'Currencies', value: [...new Set(groups.map((g) => g.currency))].length, icon: Coins, color: '#52C8A8', bg: 'rgba(82,200,168,0.1)', border: 'rgba(82,200,168,0.2)' },
        ].map((stat) => (
          <Card key={stat.label} className="card-glass border-border/50 card-hover rounded-xl overflow-hidden">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{stat.label}</p>
                  <p className="mono-data text-4xl font-bold" style={{ color: stat.color, textShadow: `0 0 20px ${stat.color}40` }}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                  <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color, width: 18, height: 18 }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spending Analytics */}
      <SpendingAnalytics />

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

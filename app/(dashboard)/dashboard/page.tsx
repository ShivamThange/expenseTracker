import { auth } from '@/lib/auth/auth';
import { getGroupsByUser } from '@/lib/db/queries/groups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Overview' };

export default async function DashboardPage() {
  const session = await auth();
  const groups = await getGroupsByUser(session!.user!.id!);

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hey, {firstName} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening across your groups.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Groups</p>
            <p className="text-3xl font-bold mt-1">{groups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="text-3xl font-bold mt-1">
              {[...new Set(groups.flatMap((g) => g.memberIds))].length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Currencies Used</p>
            <p className="text-3xl font-bold mt-1">
              {[...new Set(groups.map((g) => g.currency))].length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Groups section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Groups</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/groups">View all</Link>
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-medium">No groups yet</p>
              <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first group to start splitting expenses</p>
              <Button asChild>
                <Link href="/dashboard/groups">Create a group</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.slice(0, 4).map((group) => (
              <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      <Badge variant="secondary">{group.currency}</Badge>
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{group.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
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
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/groups">➕ New Group</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/balances">⚖️ View Balances</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-lg">SplitWise</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button asChild><Link href="/register">Get started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <Badge variant="secondary" className="mb-6 text-primary">✨ Smart expense splitting</Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Split bills, not{' '}
            <span className="text-primary">friendships</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Track shared expenses, split bills effortlessly, and settle up with friends in seconds.
            No more awkward money conversations.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link href="/register">Start for free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '👥',
                title: 'Group Expenses',
                desc: 'Create groups for trips, roommates, or any shared expense. Add members and start tracking instantly.',
              },
              {
                icon: '⚡',
                title: 'Smart Splits',
                desc: 'Split equally or set custom amounts per person. The math is done for you automatically.',
              },
              {
                icon: '💸',
                title: 'Settle Up',
                desc: 'Our algorithm minimises the number of payments needed to settle all debts between the group.',
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="text-3xl mb-3">{feature.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SplitWise. Built with Next.js & ❤️
      </footer>
    </div>
  );
}

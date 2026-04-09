import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Activity, Repeat } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[30%] h-[50%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <header className="border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded shrink-0 bg-primary flex items-center justify-center neon-glow">
              <span className="text-primary-foreground font-black text-sm tracking-tighter">NP</span>
            </div>
            <span className="font-bold text-lg uppercase tracking-wider text-foreground">Neon Pulse</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="uppercase tracking-wider text-xs font-semibold hover:text-primary transition-colors" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button className="uppercase tracking-wider text-xs font-bold neon-glow rounded-sm" asChild>
              <Link href="/register">Launch Terminal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center relative z-10">
        <section className="max-w-6xl mx-auto px-6 pt-32 pb-24 text-center">
          <Badge variant="outline" className="mb-6 uppercase tracking-widest text-[10px] border-secondary text-secondary bg-secondary/5 font-bold py-1 px-3">
             <Zap className="w-3 h-3 mr-1 inline-block" /> High-frequency Settlements
          </Badge>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6 uppercase leading-[0.9]">
            Own The <br />
            <span className="text-primary drop-shadow-[0_0_15px_rgba(200,255,0,0.5)]">Momentum</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 font-mono tracking-tight leading-relaxed">
            Experience equity trading that reacts to your pulse. High-energy data visualizations meets institutional-grade assets in a vacuum of pure kinetic power. (Or simply: the best expense tracker ever built).
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild className="h-14 px-10 text-sm uppercase tracking-widest font-bold neon-glow rounded-sm">
              <Link href="/register">Launch Terminal</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-14 px-10 text-sm uppercase tracking-widest font-bold border-border/50 hover:bg-white/5 rounded-sm">
              <Link href="/login">Explore [ UI ]</Link>
            </Button>
          </div>
        </section>

        {/* Features Matrix */}
        <section className="max-w-6xl mx-auto px-6 pb-32">
          <div className="mt-12">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-8 text-center">
              The Asymmetric Advantage
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Activity,
                  title: 'Alpha Dynamics',
                  desc: 'Real-time ledger updates across decentralised systems.',
                  glow: 'hover:shadow-[0_0_30px_rgba(200,255,0,0.15)] hover:border-primary/50'
                },
                {
                  icon: Zap,
                  title: 'Quantum Rebalancing',
                  desc: 'Our proprietary engine shifts weight dynamically across your sub-accounts.',
                  glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] hover:border-secondary/50'
                },
                {
                  icon: Repeat,
                  title: 'Instant Settlements',
                  desc: 'Sub-second netting matrix reduces your total payment flows by 80%.',
                  glow: 'hover:shadow-[0_0_30px_rgba(200,255,0,0.15)] hover:border-primary/50'
                },
              ].map((feature, i) => (
                <Card key={feature.title} className={`border-border/40 bg-[#111] transition-all duration-300 ${feature.glow} rounded-sm overflow-hidden group`}>
                  <CardContent className="p-8">
                    <div className="mb-6 inline-flex p-3 rounded bg-white/5 group-hover:bg-white/10 transition-colors">
                       <feature.icon className={`w-6 h-6 ${i === 1 ? 'text-secondary' : 'text-primary'}`} />
                    </div>
                    <h3 className="font-bold text-lg mb-3 tracking-wide uppercase">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm font-mono leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-background/80 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between font-mono text-xs text-muted-foreground tracking-widest uppercase">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
             <div className="w-2 mx-2 h-px bg-primary/50"></div>
             <span>© {new Date().getFullYear()} Neon Pulse Terminal</span>
          </div>
          <div className="flex items-center gap-8">
             <Link href="#" className="hover:text-primary transition-colors">Documentation</Link>
             <Link href="#" className="hover:text-primary transition-colors">Status</Link>
             <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

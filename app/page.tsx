import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ScanLine, Share2, ArrowLeftRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">

      {/* ── Background atmosphere ─────────────────────────── */}
      <div className="absolute inset-0 bg-cross pointer-events-none opacity-60" />
      <div className="absolute top-[-15%] right-[5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,112,64,0.07) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(75,139,244,0.06) 0%, transparent 70%)' }} />

      {/* ── Nav ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center animate-glow-pulse shrink-0">
              <span className="text-primary-foreground font-black text-[11px] tracking-tight">RV</span>
            </div>
            <span className="font-display font-bold text-base italic text-foreground tracking-tight">
              Riven
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors h-8 px-3" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="text-xs font-bold neon-glow h-8 px-4 rounded-md" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10">
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-24 pb-20 sm:pt-36 sm:pb-32 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-16 lg:gap-12 items-center">

            {/* Left — headline */}
            <div className="space-y-8">
              <Badge className="badge-tangerine text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                Split without the stress
              </Badge>

              <div>
                <h1 className="font-display font-black italic text-5xl sm:text-6xl xl:text-7xl leading-[1.0] tracking-tightest text-foreground mb-3">
                  Split Bills.
                </h1>
                <h1 className="font-display font-black italic text-5xl sm:text-6xl xl:text-7xl leading-[1.0] tracking-tightest"
                  style={{ color: '#F07040', textShadow: '0 0 60px rgba(240,112,64,0.25)' }}>
                  Keep Friends.
                </h1>
              </div>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md font-light">
                Track shared expenses, settle debts intelligently, and stop doing the math in your head.
                Built for people who actually go outside together.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" asChild className="h-12 px-8 text-sm font-bold neon-glow-lg rounded-md">
                  <Link href="/register" className="flex items-center gap-2">
                    Start for free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 text-sm font-semibold border-border/60 hover:bg-white/4 hover:border-border rounded-md text-muted-foreground hover:text-foreground transition-all">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>

              {/* Social proof / trust signal */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex -space-x-2">
                  {['A', 'B', 'C', 'D'].map((l, i) => (
                    <div key={l} className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold"
                      style={{ background: i % 2 === 0 ? 'rgba(240,112,64,0.3)' : 'rgba(75,139,244,0.3)', color: i % 2 === 0 ? '#F07040' : '#4B8BF4' }}>
                      {l}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  Used by groups of <span className="text-foreground font-semibold">roommates, travelers & teams</span>
                </span>
              </div>
            </div>

            {/* Right — floating ledger card */}
            <div className="relative hidden lg:flex flex-col gap-4 animate-float">
              {/* Main card */}
              <div className="card-glass rounded-xl border border-white/8 p-6 space-y-5 accent-line-top"
                style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 40px rgba(240,112,64,0.05)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">This Month</span>
                  <span className="badge-azure text-[9px] font-bold px-2 py-0.5 rounded-full">Live</span>
                </div>

                <div>
                  <p className="text-[11px] text-muted-foreground mb-1 font-medium">Total tracked</p>
                  <p className="mono-data text-4xl font-bold text-foreground tracking-tight">
                    $3,<span style={{ color: '#F07040' }}>841</span>.50
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white/3 border border-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">You're owed</p>
                    <p className="mono-data text-lg font-bold" style={{ color: '#F07040' }}>+$124.00</p>
                  </div>
                  <div className="bg-white/3 border border-white/5 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground mb-1">You owe</p>
                    <p className="mono-data text-lg font-bold" style={{ color: '#4B8BF4' }}>$48.50</p>
                  </div>
                </div>

                {/* Mini expense list */}
                <div className="space-y-2 pt-1">
                  {[
                    { label: 'Dinner at Nobu', amount: '120.00', cat: 'Food', c: '#F07040' },
                    { label: 'Airbnb — Barcelona', amount: '840.00', cat: 'Travel', c: '#4B8BF4' },
                    { label: 'Groceries run', amount: '63.40', cat: 'Food', c: '#F07040' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-t border-white/5">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.cat}</p>
                      </div>
                      <span className="mono-data text-sm font-bold" style={{ color: item.c }}>${item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge below */}
              <div className="card-glass rounded-xl border border-white/8 px-5 py-4 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">3 friends settling up</p>
                  <p className="text-[10px] text-muted-foreground">Barcelona Trip · $1,240 total</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
              </div>
            </div>

          </div>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <section className="relative">
          {/* Diagonal separator */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="mb-14">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-4">Why it works</p>
              <h2 className="font-display italic font-black text-3xl sm:text-4xl text-foreground tracking-tight leading-snug">
                Everything you need.<br />
                <span style={{ color: '#F07040' }}>Nothing you don't.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  icon: ScanLine,
                  title: 'AI Receipt Scan',
                  desc: 'Photograph any bill. Our AI extracts amounts, splits by person, and handles the math instantly.',
                  accent: '#F07040',
                  bg: 'rgba(240,112,64,0.08)',
                  border: 'rgba(240,112,64,0.15)',
                },
                {
                  icon: Share2,
                  title: 'Group Management',
                  desc: 'Create groups for any occasion — trips, roommates, work lunches. Each with its own currency.',
                  accent: '#4B8BF4',
                  bg: 'rgba(75,139,244,0.08)',
                  border: 'rgba(75,139,244,0.15)',
                },
                {
                  icon: ArrowLeftRight,
                  title: 'Smart Settlements',
                  desc: 'See exactly who owes whom. Confirm payments, track status — no spreadsheets required.',
                  accent: '#52C8A8',
                  bg: 'rgba(82,200,168,0.08)',
                  border: 'rgba(82,200,168,0.15)',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl p-6 border transition-all duration-300 group cursor-default"
                  style={{ background: f.bg, borderColor: f.border }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${f.accent}20`, border: `1px solid ${f.accent}25` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-light">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA band ────────────────────────────────────── */}
        <section className="relative border-y border-border/40">
          <div className="absolute inset-0 bg-dot opacity-30 pointer-events-none" />
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20 text-center relative z-10">
            <h2 className="font-display italic font-black text-3xl sm:text-5xl text-foreground tracking-tight mb-4">
              Ready to stop doing the math?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto font-light">
              Free to use. No credit card. Just fair splits and settled debts.
            </p>
            <Button size="lg" asChild className="h-12 px-10 text-sm font-bold neon-glow-lg rounded-md">
              <Link href="/register" className="flex items-center gap-2">
                Create your account
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-[9px]">RV</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              © {new Date().getFullYear()} Riven
            </span>
          </div>
          <div className="flex items-center gap-8">
            {['Docs', 'Status', 'Privacy'].map((l) => (
              <Link key={l} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

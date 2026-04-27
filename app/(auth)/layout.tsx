import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">

      {/* ── Background atmosphere ── */}
      <div className="absolute inset-0 bg-dot pointer-events-none opacity-30" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(240,112,64,0.06) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(75,139,244,0.05) 0%, transparent 70%)' }} />

      {/* ── Left brand panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-12 border-r border-border/40 relative">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group w-fit">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center animate-glow-pulse shrink-0">
            <span className="text-primary-foreground font-black text-sm tracking-tight">RV</span>
          </div>
          <span className="font-display font-bold italic text-base text-foreground tracking-tight">
            Riven
          </span>
        </Link>

        {/* Large decorative heading */}
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-5">Trusted by thousands</p>
            <h2 className="font-display italic font-black text-4xl xl:text-5xl text-foreground leading-[1.05] tracking-tight">
              Fair splits.<br />
              <span style={{ color: '#F07040' }}>No drama.</span>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs font-light">
            Track what everyone owes, settle debts in a tap, and never do mental math at the restaurant table again.
          </p>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'Expenses tracked', value: '50K+' },
              { label: 'Groups created', value: '8K+' },
              { label: 'Settled debts', value: '$2M+' },
              { label: 'Happy users', value: '12K+' },
            ].map((s) => (
              <div key={s.label} className="bg-white/3 border border-white/6 rounded-lg px-4 py-3">
                <p className="mono-data text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Divider gradient line at bottom */}
        <div className="divider-gradient mt-8" />
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-12 relative z-10">
        {/* Mobile brand */}
        <Link href="/" className="flex items-center gap-2.5 mb-8 lg:hidden">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center animate-glow-pulse">
            <span className="text-primary-foreground font-black text-[11px] tracking-tight">RV</span>
          </div>
          <span className="font-display font-bold italic text-sm text-foreground tracking-tight">Riven</span>
        </Link>

        <div className="w-full max-w-[400px]">
          {/* Card with top accent line */}
          <div className="relative card-glass rounded-xl border border-white/8 p-8 sm:p-9 accent-line-top"
            style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 0 30px rgba(240,112,64,0.04)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

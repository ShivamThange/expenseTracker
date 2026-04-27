'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { TriangleAlert, BadgeCheck, Check, X } from 'lucide-react';

const PASSWORD_CHECKS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const results = PASSWORD_CHECKS.map(c => ({ ...c, met: c.test(password) }));
  const score = results.filter(r => r.met).length;

  const segments = 4;
  const filled = score <= 1 ? 1 : score <= 3 ? score - 1 : 4;
  const segmentColor =
    score <= 2 ? '#E05252' :
    score === 3 ? '#E8B847' :
    '#F07040';
  const label = ['', 'Weak', 'Weak', 'Fair', 'Strong', 'Strong'][score];

  return (
    <div className="space-y-3 pt-1">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{
                background: i < filled ? segmentColor : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
        <span
          className="text-[10px] font-bold w-10 text-right transition-colors duration-300"
          style={{ color: segmentColor }}
        >
          {label}
        </span>
      </div>

      {/* Requirements */}
      <div className="grid grid-cols-1 gap-1">
        {results.map(({ label, met }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
              style={{
                background: met ? 'rgba(240,112,64,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${met ? 'rgba(240,112,64,0.4)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {met
                ? <Check className="w-2 h-2" style={{ color: '#F07040' }} />
                : <X className="w-2 h-2 text-muted-foreground/40" />
              }
            </div>
            <span
              className="text-[11px] transition-colors duration-200"
              style={{ color: met ? 'rgba(237,234,212,0.75)' : 'rgba(107,100,88,0.9)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const score = PASSWORD_CHECKS.filter(c => c.test(password)).length;
    if (score < 3) {
      setError('Password is too weak. Please meet at least 3 requirements.');
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(json.error || 'Something went wrong');
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center w-full animate-scale-in space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center animate-glow-pulse">
            <BadgeCheck className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div>
          <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">You're in!</h1>
          <p className="text-muted-foreground text-sm font-light">Account created successfully.</p>
        </div>
        <Link
          href="/login"
          className="inline-block px-7 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all neon-glow-lg active:scale-[0.98]"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">
          Create account
        </h1>
        <p className="text-sm text-muted-foreground font-light">Join in seconds, split forever</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg flex items-center gap-2.5">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Your name"
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Confirm password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 mt-2 neon-glow-lg"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-[11px]">
          <span className="bg-card px-3 text-muted-foreground font-medium">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="w-full py-3 px-4 border border-border/60 bg-white/3 hover:bg-white/6 text-foreground rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i < filled ? segmentColor : 'rgba(255,255,255,0.08)' }}
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

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  if (!token) {
    return (
      <div className="w-full text-center animate-scale-in space-y-5">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-xl bg-destructive/10 border border-destructive/25 flex items-center justify-center">
            <TriangleAlert className="w-7 h-7 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">Invalid link</h1>
          <p className="text-muted-foreground text-sm font-light">
            This reset link has expired or is invalid.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-block px-7 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all active:scale-[0.98] neon-glow-lg"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const score = PASSWORD_CHECKS.filter(c => c.test(password)).length;
    if (score < 3) {
      setError('Password is too weak. Please meet at least 3 requirements.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
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
          <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">Password updated</h1>
          <p className="text-muted-foreground text-sm font-light">Your new password is set. You're good to go.</p>
        </div>
        <Link
          href="/login"
          className="inline-block px-7 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all active:scale-[0.98] neon-glow-lg"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">
          New password
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          Create a strong password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg flex items-center gap-2.5">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">New password</label>
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
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center w-full py-8">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

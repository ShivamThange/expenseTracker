'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, TriangleAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
          <div className="w-14 h-14 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center">
            <Mail className="w-7 h-7 text-secondary" />
          </div>
        </div>
        <div>
          <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">Check your inbox</h1>
          <p className="text-muted-foreground text-sm font-light">
            If that email exists, a reset link is on its way.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block px-7 py-3 border border-border/60 hover:border-border text-foreground rounded-lg font-semibold text-sm transition-all active:scale-[0.98] hover:bg-white/4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground font-light">
          We'll send a link to your email
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
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Email address</label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 mt-2 neon-glow-lg"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Remember it?{' '}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

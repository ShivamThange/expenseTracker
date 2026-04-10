'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function RegisterPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
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
      <div className="text-center w-full">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">Initialization Complete</h1>
        <p className="text-muted-foreground font-mono text-sm mb-6">
          Your account has been successfully created. You may now authenticate.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm font-bold uppercase tracking-widest transition-all neon-glow"
        >
          Authenticate
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Initialize</h1>
        <p className="text-sm font-mono text-muted-foreground mt-2 uppercase tracking-widest">Join Neon Pulse today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-sm font-mono">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Full Name</label>
          <input
            name="name"
            type="text"
            required
            className="w-full px-4 py-3 border border-border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary bg-[#111] text-foreground font-mono transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Email Address</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-4 py-3 border border-border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary bg-[#111] text-foreground font-mono transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary bg-[#111] text-foreground font-mono transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="w-full px-4 py-3 border border-border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary bg-[#111] text-foreground font-mono transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm font-bold shadow transition-all disabled:opacity-50 mt-6 uppercase tracking-widest neon-glow"
        >
          {loading ? 'Initializing...' : 'Execute'}
        </button>
      </form>

      <div className="relative mt-8 mb-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-mono">Or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        className="w-full py-3 px-4 border border-border bg-white/5 hover:bg-white/10 text-foreground rounded-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Execute via Google
      </button>

      <p className="mt-8 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Already initialized?{' '}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Authenticate
        </Link>
      </p>
    </div>
  );
}

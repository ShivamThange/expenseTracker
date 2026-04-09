'use client';

import { useState } from 'react';
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
        <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">Check your email</h1>
        <p className="text-muted-foreground font-mono text-sm mb-6">
          We&apos;ve sent a verification link to your email address. Please verify your email before logging in.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm font-bold uppercase tracking-widest transition-all neon-glow"
        >
          Return to Terminal
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

      <p className="mt-8 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Already initialized?{' '}
        <Link href="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Authenticate
        </Link>
      </p>
    </div>
  );
}

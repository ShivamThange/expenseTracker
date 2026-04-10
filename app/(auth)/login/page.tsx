'use client';


import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (!res?.error) {
        router.push('/dashboard');
        router.refresh();
      } else if (res.error === 'CredentialsSignin') {
        // Could be wrong password OR unverified email.
        // Check with our own API to distinguish.
        const check = await fetch('/api/auth/check-verified', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (check.status === 403) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.');
        } else {
          setError('Invalid email or password.');
        }
      } else {
        setError(res.error);
      }
    } catch (err: unknown) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground">Terminal Access</h1>
        <p className="text-sm text-muted-foreground font-mono mt-2 tracking-widest uppercase">Authenticate to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-sm font-mono">
            {error}
          </div>
        )}

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
            className="w-full px-4 py-3 border border-border rounded-sm focus:ring-1 focus:ring-primary focus:border-primary bg-[#111] text-foreground font-mono transition-colors"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <Link href="/forgot-password" className="text-xs uppercase tracking-wider text-secondary hover:text-secondary/80 focus:outline-none transition-colors">
            Breach Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 neon-glow mt-6"
        >
          {loading ? 'Authenticating...' : 'Initiate Session'}
        </button>
      </form>

      <p className="mt-8 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Awaiting credentials?{' '}
        <Link href="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Initialize
        </Link>
      </p>
    </div>
  );
}

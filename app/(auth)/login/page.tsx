'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

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
        setError('Invalid email or password.');
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
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h1 className="font-display italic font-black text-2xl text-foreground tracking-tight mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground font-light">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg flex items-center gap-2.5">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

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
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Password</label>
            <Link href="/forgot-password" className="text-[11px] text-secondary hover:text-secondary/80 transition-colors font-medium">
              Forgot?
            </Link>
          </div>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-border rounded-lg bg-[var(--surface-input)] text-foreground text-sm transition-all duration-200 input-glow placeholder:text-muted-foreground/40 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 mt-2 neon-glow-lg"
        >
          {loading ? 'Signing in…' : 'Sign in'}
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
        No account?{' '}
        <Link href="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

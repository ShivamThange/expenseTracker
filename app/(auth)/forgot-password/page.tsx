'use client';

import { useState } from 'react';
import Link from 'next/link';

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
      <div className="text-center w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          If an account with that email exists, we have sent a password reset link.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg font-medium transition-colors"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Forgot Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Enter your email to receive a password reset link
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
          <input
            name="email"
            type="email"
            required
            className="w-full mt-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg font-medium shadow transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Sending link...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

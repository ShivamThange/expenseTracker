'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Invalid Link</h1>
        <p className="text-red-500 dark:text-red-400 mb-6">Missing password reset token.</p>
        <Link
          href="/forgot-password"
          className="inline-block px-6 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg font-medium transition-colors"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

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
      <div className="text-center w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your password has been updated. You can now log in with your new password.
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Create New Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Please enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full mt-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            className="w-full mt-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg font-medium shadow transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Resetting password...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

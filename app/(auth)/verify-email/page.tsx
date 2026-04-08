'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const json = await res.json();

        if (res.ok) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(json.error || 'Invalid or expired token.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error occurred.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="w-full text-center">
      {status === 'loading' && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Verifying Email</h1>
          <p className="text-gray-500 dark:text-gray-400">Please wait while we verify your email address...</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <svg className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Email Verified!</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Your email address has been successfully verified.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black text-white rounded-lg font-medium shadow transition-colors"
          >
            Continue to Login
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <svg className="h-6 w-6 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">Verification Failed</h1>
          <p className="text-red-500 dark:text-red-400 mb-6">{message}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Loading verification...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

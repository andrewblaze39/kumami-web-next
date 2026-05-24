'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/');

  const { login, loginWithGoogle, resetPassword, currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve returnUrl from query param or sessionStorage
  useEffect(() => {
    const queryReturn = searchParams.get('returnUrl');
    if (queryReturn) {
      setReturnUrl(queryReturn);
    } else {
      const stored = sessionStorage.getItem('redirectAfterSignup') || sessionStorage.getItem('redirectAfterLogin');
      if (stored) {
        setReturnUrl(stored);
        sessionStorage.removeItem('redirectAfterSignup');
        sessionStorage.removeItem('redirectAfterLogin');
      }
    }
  }, [searchParams]);

  // Redirect once logged in
  useEffect(() => {
    if (currentUser) {
      router.replace(returnUrl);
    }
  }, [currentUser, returnUrl, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // Redirect handled by currentUser useEffect above
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/user-not-found') setError('No account found with this email.');
      else if (code === 'auth/wrong-password') setError('Incorrect password.');
      else if (code === 'auth/too-many-requests') setError('Too many attempts. Please try again later.');
      else if (err.message?.includes('verify your email')) setError('Please verify your email before logging in.');
      else setError('Unable to sign in. Please try again.');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      // Redirect handled by currentUser useEffect above
    } catch (err: any) {
      setError('Failed to sign in with Google: ' + err.message);
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    try {
      setMessage('');
      setError('');
      await resetPassword(email);
      setMessage('Check your inbox for password reset instructions.');
    } catch (err: any) {
      setError('Failed to reset password: ' + err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Log In</h2>
        <p className="text-white/50 text-center text-sm mb-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#96EDD6] hover:underline">Sign Up</Link>
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 text-sm mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#96EDD6]/50 transition"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#96EDD6]/50 transition"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-white/40 hover:text-[#96EDD6] transition"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#96EDD6] text-black font-semibold py-2.5 rounded-lg hover:bg-[#7de0c5] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-sm">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-2.5 rounded-lg hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-3-11.3-7.3l-6.5 5C9.7 39.7 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <LoginForm />
    </Suspense>
  );
}

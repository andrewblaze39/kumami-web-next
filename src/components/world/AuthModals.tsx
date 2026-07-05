'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const REDIRECT_TARGET = '/world/news';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#FFC107"
      d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-7.9 19.7-20 0-1.3-.1-2.7-.1-4z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.7-3-11.3-7.3l-6.5 5C9.7 39.7 16.3 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.5l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"
    />
  </svg>
);

// ─── Sign-Up Modal ───────────────────────────────────────────────────────────

interface SignUpModalProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function SignUpModal({ onClose, onSwitchToLogin }: SignUpModalProps) {
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    try {
      setError('');
      setLoading(true);
      // Store name in sessionStorage — it gets written to Firestore by AuthContext.setupUser
      // after email verification; the name field is displayed post-login.
      if (name.trim()) {
        sessionStorage.setItem('pendingDisplayName', name.trim());
      }
      await signup(email, password);
      setVerificationSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account.';
      setError(msg);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    try {
      setError('');
      setLoading(true);
      // After Google sign-in, AuthContext sets currentUser → the page.tsx
      // useEffect will redirect to REDIRECT_TARGET.
      sessionStorage.setItem('redirectAfterSignup', REDIRECT_TARGET);
      await loginWithGoogle();
      router.replace(REDIRECT_TARGET);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="w-auth-ov" onClick={onClose}>
      <div
        className="w-auth-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-title"
      >
        <button className="w-auth-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {verificationSent ? (
          <>
            <h2 id="signup-title">Check your inbox</h2>
            <p className="w-sub">
              We sent a verification link to <strong>{email}</strong>. Click it,
              then log in.
            </p>
            <button
              className="w-btn w-btn-primary"
              onClick={() => {
                sessionStorage.setItem('redirectAfterSignup', REDIRECT_TARGET);
                onClose();
                onSwitchToLogin();
              }}
            >
              Go to Log In
            </button>
          </>
        ) : (
          <>
            <h2 id="signup-title">Create your account</h2>
            <p className="w-sub">Free to start — no wallet needed.</p>

            {error && <div className="w-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="w-field">
                <label htmlFor="su-name">Name</label>
                <input
                  id="su-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="w-field">
                <label htmlFor="su-email">Email</label>
                <input
                  id="su-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="w-field">
                <label htmlFor="su-password">Password</label>
                <input
                  id="su-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="w-btn w-btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Sign Up'}
              </button>
            </form>

            <div className="w-divider">or</div>

            <button
              type="button"
              className="w-google-btn"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="w-auth-alt">
              Already have an account?{' '}
              <b onClick={onSwitchToLogin}>Log In</b>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Log-In Modal ────────────────────────────────────────────────────────────

interface LogInModalProps {
  onClose: () => void;
  onSwitchToSignUp: () => void;
}

export function LogInModal({ onClose, onSwitchToSignUp }: LogInModalProps) {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      onClose();
      router.replace(REDIRECT_TARGET);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/user-not-found') setError('No account found with this email.');
      else if (code === 'auth/wrong-password') setError('Incorrect password.');
      else if (code === 'auth/too-many-requests')
        setError('Too many attempts. Please try again later.');
      else if ((err as Error).message?.includes('verify your email'))
        setError('Please verify your email before logging in.');
      else setError('Unable to sign in. Please try again.');
    }
    setLoading(false);
  }

  async function handleGoogle() {
    try {
      setError('');
      setLoading(true);
      sessionStorage.setItem('redirectAfterSignup', REDIRECT_TARGET);
      await loginWithGoogle();
      onClose();
      router.replace(REDIRECT_TARGET);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
      setError(msg);
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email above, then click Forgot Password.');
      return;
    }
    try {
      setError('');
      setMessage('');
      await resetPassword(email);
      setMessage('Check your inbox for reset instructions.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset email.';
      setError(msg);
    }
  }

  return (
    <div className="w-auth-ov" onClick={onClose}>
      <div
        className="w-auth-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button className="w-auth-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 id="login-title">Welcome back</h2>
        <p className="w-sub">Sign in to continue to Kumami World.</p>

        {error && <div className="w-error">{error}</div>}
        {message && <div className="w-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="w-field">
            <label htmlFor="li-email">Email</label>
            <input
              id="li-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="w-field">
            <label htmlFor="li-password">Password</label>
            <input
              id="li-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-btn w-btn-primary"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <div className="w-divider">or</div>

        <button
          type="button"
          className="w-google-btn"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="w-auth-alt">
          Don&apos;t have an account?{' '}
          <b onClick={onSwitchToSignUp}>Sign Up</b>
        </p>
      </div>
    </div>
  );
}

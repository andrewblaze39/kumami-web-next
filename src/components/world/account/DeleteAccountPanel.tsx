'use client'

/* Profile → Profile → "Delete my account" (GDPR / CCPA, app stores).
 * Type DELETE + sign in again, then DELETE /api/v1/me removes the account. */
import { useState } from 'react'
import { EmailAuthProvider, GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { isProActive } from '@/lib/pro'
import { isStaff } from '@/lib/account/deletion'
import { ApiError, v1 } from '@/lib/billing/clientApi'

export default function DeleteAccountPanel() {
  const { currentUser, userData } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!currentUser) return null
  const usesPassword = currentUser.providerData.some((p) => p.providerId === 'password')
  const staff = isStaff(userData ?? null)
  const pro = isProActive((userData ?? {}) as Parameters<typeof isProActive>[0])
  const source = userData?.proSource as string | undefined
  const balance = Number(userData?.referralBalanceCents ?? 0)
  const ready = confirm.trim() === 'DELETE' && (!usesPassword || password.length > 0) && !busy

  const submit = async () => {
    if (!ready) return
    setBusy(true)
    setError(null)
    try {
      // Fresh sign-in: the server only accepts a token signed in within 5 minutes.
      if (usesPassword) await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email ?? '', password))
      else await reauthenticateWithPopup(currentUser, new GoogleAuthProvider())
      await currentUser.getIdToken(true)
      await v1('/me', { method: 'DELETE' })
      try { sessionStorage.clear() } catch { /* storage blocked */ }
      await signOut(auth).catch(() => {})
      window.location.replace('/?accountDeleted=1')
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setError(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? 'That password is not right.'
          : code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? 'Sign-in was cancelled — your account was not deleted.'
          : code === 'auth/user-mismatch' ? 'Please sign in with the same Google account.'
          : e instanceof ApiError ? e.message
          : 'Could not delete your account — please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-red-900/60 bg-[#221616] p-6" data-testid="delete-account">
      <h3 className="mb-2 text-lg font-semibold text-red-400">Delete my account</h3>
      {staff ? (
        <p className="text-sm text-gray-400">
          This is a staff account. Ask a superadmin to remove your admin role first, then you can delete it here.
        </p>
      ) : !open ? (
        <>
          <p className="mb-4 text-sm text-gray-400">
            Permanently delete your Kumami account and your data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded border border-red-500 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            Delete my account
          </button>
        </>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="text-gray-300">
            <p className="mb-2">We will delete straight away:</p>
            <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-400">
              <li>your profile, name and email</li>
              <li>your course progress, Kuma chats, watchlists, wallet tracker and Pro tool settings</li>
              <li>your referral code and your sign-in</li>
            </ul>
            <p className="text-gray-400">
              We keep payment and invoice records (without your name or email) for as long as tax law requires.
              See the <a href="/privacy#retention" className="text-[#00c2c7] underline">privacy policy</a>.
            </p>
          </div>

          {(pro || balance > 0) && (
            <ul className="space-y-1 rounded border border-amber-700/60 bg-amber-950/30 p-3 text-amber-300" data-testid="delete-warnings">
              {pro && source === 'stripe' && <li>Your card subscription is cancelled now. There is no refund for the rest of this period.</li>}
              {pro && source !== 'stripe' && <li>Your remaining Pro time is lost. There is no refund.</li>}
              {balance > 0 && <li>Your referral balance (${(balance / 100).toFixed(2)}) is lost.</li>}
            </ul>
          )}

          <label className="block">
            <span className="mb-1 block text-gray-400">Type <b className="text-white">DELETE</b> to confirm</span>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              aria-label="Type DELETE to confirm"
              className="w-full rounded border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
            />
          </label>
          {usesPassword ? (
            <label className="block">
              <span className="mb-1 block text-gray-400">Your password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-label="Your password"
                className="w-full rounded border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
              />
            </label>
          ) : (
            <p className="text-gray-400">You will be asked to sign in with Google again to confirm.</p>
          )}

          {error && <p className="text-red-400" role="alert">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              className="rounded bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500 disabled:opacity-40"
            >
              {busy ? 'Deleting…' : 'Permanently delete my account'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirm(''); setPassword(''); setError(null) }}
              disabled={busy}
              className="rounded border border-[#444] px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

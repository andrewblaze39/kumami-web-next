'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { updateProfile } from 'firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import { isProActive } from '@/lib/pro'
import { Loader } from 'lucide-react'
import SubscriptionPanel from '@/components/world/billing/SubscriptionPanel'
import ReferralPanel from '@/components/world/billing/ReferralPanel'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FirestoreTimestamp {
  seconds: number
  nanoseconds: number
}

interface UserDataRaw {
  email?: string
  isPremium?: boolean
  createdAt?: FirestoreTimestamp | Date | null
}

interface ProfileUserData extends UserDataRaw {
  createdAtString?: string | null
}

type TabKey = 'profile' | 'subscription' | 'referrals'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatFirestoreDate(
  timestamp: FirestoreTimestamp | Date | null | undefined,
): string | null {
  if (!timestamp) return null

  // Firestore Timestamp object
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Native Date
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/* Name shown across Kumami (sidebar, profile). Saved on users/{uid}.displayName
 * and the Firebase Auth profile; existing users without a name add one here. */
function NameEditor() {
  const { currentUser, userData } = useAuth()
  const current = (userData?.displayName as string | undefined) || currentUser?.displayName || ''
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const dirty = value.trim() !== current && value.trim().length > 0
  const save = async () => {
    if (!currentUser || !dirty) return
    setSaving(true)
    setMsg(null)
    try {
      const name = value.trim().slice(0, 60)
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName: name })
      await updateProfile(currentUser, { displayName: name })
      window.location.reload()
    } catch {
      setMsg('Could not save your name — try again.')
      setSaving(false)
    }
  }
  return (
    <div className="mb-4 flex flex-col gap-2 border-b border-[#333] pb-4 sm:flex-row sm:items-center">
      <label htmlFor="profile-name" className="w-40 font-medium text-gray-400">Name:</label>
      <input
        id="profile-name"
        className="flex-1 rounded border border-[#444] bg-[#1a1a1a] px-3 py-2 text-white"
        value={value}
        placeholder="Add your name"
        maxLength={60}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="rounded bg-gradient-to-br from-[#6e45e2] to-[#88d3ce] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {msg && <span className="text-xs text-red-400">{msg}</span>}
    </div>
  )
}

export default function ProfileContent() {
  const { currentUser } = useAuth()
  const [userData, setUserData] = useState<ProfileUserData | null>(null)
  const [loading, setLoading] = useState(true)
  // Deep link: /world/profile?tab=subscription|referrals (Stripe's card page returns here).
  const tabParam = useSearchParams().get('tab')
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabParam === 'subscription' || tabParam === 'referrals' ? tabParam : 'profile',
  )
  const [tappedTab, setTappedTab] = useState<TabKey | null>(null)

  /* ---- Tab change ---- */
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setTappedTab(tab)
    setTimeout(() => setTappedTab(null), 500)
  }, [])

  /* ---- Fetch user data (subscription + referrals load in their own panels via /api/v1) ---- */
  useEffect(() => {
    async function fetchUserData() {
      if (!currentUser) {
        setLoading(false)
        return
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const raw = userDoc.data() as UserDataRaw
          setUserData({
            ...raw,
            // Expired grants (proUntil in the past) are not Pro.
            isPremium: isProActive(raw as Parameters<typeof isProActive>[0]),
            createdAtString: formatFirestoreDate(raw.createdAt ?? null),
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [currentUser])

  /* ---------------------------------------------------------------- */
  /*  Render states                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-[#96EDD6]" />
        <span className="ml-3 text-lg text-gray-300">Loading profile...</span>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-white">
        <h1 className="mb-4 text-2xl font-bold">User Profile</h1>
        <p>
          Please{' '}
          <Link href="/login" className="text-[#96EDD6] underline hover:text-[#40e0d0]">
            log in
          </Link>{' '}
          to view your profile.
        </p>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Tabs config                                                      */
  /* ---------------------------------------------------------------- */

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'subscription', label: 'Subscription' },
    { key: 'referrals', label: 'Referrals' },
  ]

  /* ---------------------------------------------------------------- */
  /*  Main render                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto my-8 max-w-[1000px] rounded-xl bg-[#1a1a1a] p-4 text-white sm:p-8">
      {/* ---------- Header ---------- */}
      <div className="mb-8 border-b border-[#333] pb-6 text-center">
        <h1 className="mb-4 text-2xl font-bold">My Account</h1>

        {/* Avatar */}
        <div className="mx-auto mb-4 flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6e45e2] to-[#88d3ce]">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl font-bold text-white">
              {currentUser.email
                ? currentUser.email.charAt(0).toUpperCase()
                : 'U'}
            </span>
          )}
        </div>

        <h2 className="text-xl font-semibold">
          {currentUser.displayName || currentUser.email}
        </h2>

        {userData?.isPremium && (
          <span className="mt-2 inline-block rounded-full bg-gradient-to-br from-[#6e45e2] to-[#88d3ce] px-4 py-1 text-sm font-bold text-white">
            Pro
          </span>
        )}
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="mb-8 flex flex-col border-b border-[#333] sm:flex-row sm:justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`relative min-w-[120px] flex-1 border-b border-[#333] px-6 py-3 text-center text-base transition-all duration-300 sm:flex-initial sm:border-b-0 ${
              activeTab === tab.key ? 'text-white' : 'text-gray-500 hover:text-white'
            } ${tappedTab === tab.key ? 'bg-[rgba(110,69,226,0.2)]' : ''}`}
          >
            {tab.label}
            {/* Active indicator — bottom on desktop, left+right on mobile */}
            {activeTab === tab.key && (
              <>
                <span className="absolute bottom-[-1px] left-0 hidden h-[3px] w-full bg-gradient-to-r from-[#6e45e2] to-[#88d3ce] sm:block" />
                <span className="absolute left-0 top-0 block h-full w-1 bg-gradient-to-b from-[#6e45e2] to-[#88d3ce] sm:hidden" />
                <span className="absolute right-0 top-0 block h-full w-1 bg-gradient-to-b from-[#6e45e2] to-[#88d3ce] sm:hidden" />
              </>
            )}
          </button>
        ))}
      </div>

      {/* ---------- Tab content ---------- */}
      <div className="min-h-[300px]">
        {/* ===== PROFILE TAB ===== */}
        {activeTab === 'profile' && (
          <div className="rounded-lg bg-[#222] p-6 shadow-md">
            <h3 className="mb-6 text-lg font-semibold text-white">
              Account Information
            </h3>

            <NameEditor />

            <DetailRow label="Email:" value={currentUser.email ?? ''} />

            <DetailRow
              label="Member since:"
              value={userData?.createdAtString ?? 'July 1, 2025'}
            />

            <DetailRow
              label="Email verified:"
              value={currentUser.emailVerified ? 'Yes' : 'No'}
              valueClassName={
                currentUser.emailVerified ? 'text-green-500' : 'text-red-500'
              }
            />

            {!currentUser.emailVerified && (
              <button className="mt-4 inline-block rounded bg-gradient-to-br from-[#6e45e2] to-[#88d3ce] px-6 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:from-[#5d39c1] hover:to-[#7abfbb]">
                Resend Verification Email
              </button>
            )}
          </div>
        )}

        {/* ===== SUBSCRIPTION TAB ===== */}
        {activeTab === 'subscription' && <SubscriptionPanel />}

        {/* ===== REFERRALS TAB ===== */}
        {activeTab === 'referrals' && <ReferralPanel />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared sub-component                                               */
/* ------------------------------------------------------------------ */

function DetailRow({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="mb-4 flex flex-col justify-between border-b border-[#333] pb-2 sm:flex-row">
      <span className="mb-1 text-gray-500 sm:mb-0">{label}</span>
      <span className={`font-medium ${valueClassName}`}>{value}</span>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Copy, Check, Loader } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FirestoreTimestamp {
  seconds: number
  nanoseconds: number
}

interface SubscriptionData {
  userId: string
  planName: string
  planId: string
  status: string
  startDate: FirestoreTimestamp | null
  endDate: FirestoreTimestamp | null
  cancelledAt?: FirestoreTimestamp | null
}

interface UserDataRaw {
  email?: string
  isPremium?: boolean
  createdAt?: FirestoreTimestamp | Date | null
  referralCode?: string
  referralCount?: number
  referralRewards?: number
  subscriptionStatus?: string
}

interface ProfileUserData extends UserDataRaw {
  subscriptionId?: string
  subscriptionPlan?: string
  subscriptionEndDate?: FirestoreTimestamp | null
  subscriptionStartDate?: FirestoreTimestamp | null
  subscriptionStatus?: string
  subscriptionPlanId?: string
  subscriptionStartDateString?: string | null
  subscriptionEndDateString?: string | null
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

export default function ProfileContent() {
  const { currentUser } = useAuth()
  const [userData, setUserData] = useState<ProfileUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [tappedTab, setTappedTab] = useState<TabKey | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  /* ---- Tab change ---- */
  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setTappedTab(tab)
    setTimeout(() => setTappedTab(null), 500)
  }, [])

  /* ---- Unsubscribe ---- */
  const handleUnsubscribe = useCallback(
    async (type: 'end-period' | 'immediate') => {
      const confirmMessage =
        type === 'end-period'
          ? 'Are you sure you want to unsubscribe? You will retain access to premium features until the end of your current billing period.'
          : 'Are you sure you want to unsubscribe immediately? You will lose access to premium features right away and no refund will be issued for the remaining period.'

      if (!window.confirm(confirmMessage)) return

      try {
        if (userData?.subscriptionId) {
          await updateDoc(doc(db, 'subscriptions', userData.subscriptionId), {
            status: type === 'immediate' ? 'cancelled-immediate' : 'cancelled',
            cancelledAt: serverTimestamp(),
          })
        }

        const userUpdate: Record<string, string | boolean> = {
          subscriptionStatus:
            type === 'immediate' ? 'cancelled-immediate' : 'cancelled',
        }
        if (type === 'immediate') {
          userUpdate.isPremium = false
        }

        if (currentUser) {
          await updateDoc(doc(db, 'users', currentUser.uid), userUpdate)
        }

        const successMessage =
          type === 'end-period'
            ? 'You have successfully unsubscribed. You will retain access to premium features until the end of your current billing period.'
            : 'You have successfully unsubscribed immediately. You no longer have access to premium features.'

        alert(successMessage)
        window.location.reload()
      } catch (error) {
        console.error('Error cancelling subscription:', error)
        alert(
          'There was an error cancelling your subscription. Please try again later.',
        )
      }
    },
    [currentUser, userData?.subscriptionId],
  )

  /* ---- Copy to clipboard ---- */
  const copyToClipboard = useCallback(
    (text: string, type: 'code' | 'link') => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (type === 'code') {
            setCopiedCode(true)
            setTimeout(() => setCopiedCode(false), 2000)
          } else {
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
          }
        })
        .catch((err) => console.error('Failed to copy:', err))
    },
    [],
  )

  /* ---- Fetch user + subscription data ---- */
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
          const isPremium = raw.isPremium === true

          // Query active subscriptions
          const subsRef = collection(db, 'subscriptions')
          const q = query(
            subsRef,
            where('userId', '==', currentUser.uid),
            where('status', '==', 'active'),
          )
          const subsSnap = await getDocs(q)

          if (!subsSnap.empty) {
            const sorted = subsSnap.docs.sort((a, b) => {
              const da = (a.data() as SubscriptionData).startDate?.seconds ?? 0
              const db2 = (b.data() as SubscriptionData).startDate?.seconds ?? 0
              return db2 - da
            })

            const subDoc = sorted[0]
            const sub = subDoc.data() as SubscriptionData

            setUserData({
              ...raw,
              isPremium,
              subscriptionId: subDoc.id,
              subscriptionPlan: sub.planName,
              subscriptionEndDate: sub.endDate,
              subscriptionStartDate: sub.startDate,
              subscriptionStatus: sub.status,
              subscriptionPlanId: sub.planId,
              subscriptionStartDateString: formatFirestoreDate(sub.startDate),
              subscriptionEndDateString: formatFirestoreDate(sub.endDate),
              createdAtString: formatFirestoreDate(raw.createdAt ?? null),
            })
          } else {
            setUserData({
              ...raw,
              isPremium,
              createdAtString: formatFirestoreDate(raw.createdAt ?? null),
            })
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching user data:', error)
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
            Premium
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
        {activeTab === 'subscription' && (
          <div className="rounded-lg bg-[#222] p-6 shadow-md">
            <h3 className="mb-6 text-lg font-semibold text-white">
              Subscription Status
            </h3>

            {/* Status banner */}
            {userData?.isPremium === true ? (
              userData?.subscriptionStatus === 'cancelled' ? (
                <div className="mb-6 flex items-center rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-3">
                  <span className="mr-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-sm font-bold">
                    i
                  </span>
                  <span className="font-medium text-orange-500">
                    Ending Soon &mdash; Premium Until{' '}
                    {userData.subscriptionEndDateString ??
                      'end of billing period'}
                  </span>
                </div>
              ) : (
                <div className="mb-6 flex items-center rounded-md border border-green-500/30 bg-green-500/10 px-3 py-3">
                  <span className="mr-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-bold">
                    &#10003;
                  </span>
                  <span className="font-medium text-green-500">Active</span>
                </div>
              )
            ) : (
              <div className="mb-6 flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-3 py-3">
                <span className="mr-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-sm font-bold">
                  !
                </span>
                <span className="font-medium text-red-500">
                  No Active Subscription
                </span>
              </div>
            )}

            {/* Premium details */}
            {userData?.isPremium === true ? (
              <>
                <DetailRow
                  label="Plan:"
                  value={userData.subscriptionPlan ?? 'Premium'}
                />

                {userData.subscriptionStartDateString && (
                  <DetailRow
                    label="Started:"
                    value={userData.subscriptionStartDateString}
                  />
                )}

                <DetailRow
                  label="Next billing:"
                  value={
                    userData.subscriptionPlanId === 'lifetime'
                      ? 'Never (Lifetime)'
                      : (userData.subscriptionEndDateString ?? 'Not available')
                  }
                />

                {userData.subscriptionStatus === 'cancelled' && (
                  <div className="my-4 rounded border-l-[3px] border-orange-500 bg-orange-500/10 px-4 py-3">
                    <p className="flex items-center text-sm text-white">
                      <span className="mr-2 text-base">&#x2139;&#xFE0F;</span>
                      You&apos;ve unsubscribed but can still use all premium
                      features until{' '}
                      {userData.subscriptionEndDateString ??
                        'your billing period ends'}
                      .
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start">
                  <Link
                    href="/subscribe"
                    className="inline-block rounded bg-gradient-to-br from-[#6e45e2] to-[#88d3ce] px-6 py-3 font-medium text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:from-[#5d39c1] hover:to-[#7abfbb]"
                  >
                    Manage Subscription
                  </Link>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUnsubscribe('end-period')}
                      className="rounded bg-gradient-to-br from-orange-500 to-orange-300 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90"
                    >
                      Unsubscribe at Period End
                    </button>
                    <button
                      onClick={() => handleUnsubscribe('immediate')}
                      className="rounded bg-gradient-to-br from-red-600 to-red-400 px-4 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:opacity-90"
                    >
                      Unsubscribe Immediately
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mb-4 text-gray-300">
                  Upgrade to Premium to access exclusive content and features.
                </p>
                <Link
                  href="/subscribe"
                  className="inline-block rounded bg-gradient-to-br from-[#6e45e2] to-[#88d3ce] px-6 py-3 font-medium text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:from-[#5d39c1] hover:to-[#7abfbb]"
                >
                  Subscribe Now
                </Link>
              </>
            )}
          </div>
        )}

        {/* ===== REFERRALS TAB ===== */}
        {activeTab === 'referrals' && (
          <div className="rounded-lg bg-[#222] p-6 shadow-md">
            <h3 className="mb-6 text-lg font-semibold text-white">
              My Referrals
            </h3>

            {userData?.referralCode ? (
              <>
                {/* Referral code */}
                <div className="mb-4 flex flex-col justify-between border-b border-[#333] pb-2 sm:flex-row sm:items-center">
                  <span className="mb-1 text-gray-500 sm:mb-0">
                    Your referral code:
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="max-w-[200px] truncate rounded bg-[rgba(110,69,226,0.1)] px-2 py-1 font-mono text-sm font-medium md:max-w-[300px]">
                      {userData.referralCode}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(userData.referralCode!, 'code')
                      }
                      className="flex items-center justify-center p-1.5 text-[#6e45e2] transition-all duration-200 hover:scale-110 hover:text-[#88d3ce]"
                      aria-label="Copy referral code"
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Referral link */}
                <div className="mb-4 flex flex-col justify-between border-b border-[#333] pb-2 sm:flex-row sm:items-center">
                  <span className="mb-1 text-gray-500 sm:mb-0">
                    Your referral link:
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="max-w-[200px] truncate rounded bg-[rgba(110,69,226,0.1)] px-2 py-1 font-mono text-sm font-medium md:max-w-[300px]">
                      {`https://kumami.world/subscribe?ref=${userData.referralCode}`}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `https://kumami.world/subscribe?ref=${userData.referralCode}`,
                          'link',
                        )
                      }
                      className="flex items-center justify-center p-1.5 text-[#6e45e2] transition-all duration-200 hover:scale-110 hover:text-[#88d3ce]"
                      aria-label="Copy referral link"
                    >
                      {copiedLink ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <DetailRow
                  label="Referrals:"
                  value={String(userData.referralCount ?? 0)}
                />

                <DetailRow
                  label="Rewards earned:"
                  value={`$${userData.referralRewards ?? 0}`}
                />
              </>
            ) : (
              <p className="text-gray-400">
                Referral program not available for your account.
              </p>
            )}
          </div>
        )}
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

# Plan — Self-serve account deletion · 14 Oct 2026

To-do 629973ef (high). Needed for GDPR/CCPA and the Apple/Google app stores. Andrew's answer: "/privacy" — follow the Privacy Policy (account data deleted, payment records kept up to 7 years). Gates skipped; my recommended defaults applied.

## Decisions
1. Immediate deletion (the policy allows up to 30 days; self-serve is instant).
2. Live card subscription → cancelled in Stripe immediately, **no refund**; crypto/admin Pro time and referral balance are forfeited. All warned in the UI.
3. Staff (any role ≠ `user`, or legacy `isAdmin`) can't self-delete; a superadmin must remove the role first.
4. Confirmation: type `DELETE` + re-authenticate (password, or Google popup); server requires `auth_time` ≤ 5 min.
5. One endpoint for web and Flutter: `DELETE /api/v1/me`.

## Build
- `src/lib/account/deletion.ts` — pure rules (`deletionBlocker`, `liveStripeSubscriptionId`, `deleteAccount` ordering) + unit tests.
- `src/lib/account/firestoreDeletion.ts` — Admin SDK deps: Stripe cancel (tolerates `resource_missing`), revoke sessions, `recursiveDelete` users/{uid}, user_prefs/{uid}, watchlists/{uid}; batch-delete alerts + referralCodes by userId; delete Auth user.
- `src/app/api/v1/me/route.ts` — `verifyIdToken(token, true)`, rate limit, blocker → 401/403, run.
- Guards so nothing recreates a deleted user: Stripe `invoice.paid` (payment still recorded), `applyReferralReward` (`payer_missing`), `reverseReferralReward` (no balance write on a missing user), Kuma callback (404).
- UI: `src/components/world/account/DeleteAccountPanel.tsx` in Profile → Profile; gate notice on `/?accountDeleted=1`.
- Privacy Policy wording: self-serve deletion in Profile.

## Kept on purpose
payments, checkout_orders, subscriptions, webhook_events, referral_rewards, referral_ledger, admin_audit (uid only).

## QA checklist
- [ ] 401 without a token; 403 `staff_account` for a staff role (nothing deleted)
- [ ] qa3 sees the staff message and no button
- [ ] Panel: lists deleted/kept, warnings for Pro time + referral balance, button disabled until exact `DELETE` + password, Cancel closes
- [ ] Wrong password → error, nothing deleted
- [ ] Right password → 200, lands on `/` with a visible notice; Auth user + every personal doc gone; billing rows kept
- [ ] Late Kuma callback → 404 and no chat data recreated
- [ ] Old password can't sign in
- [ ] Desktop + mobile screenshots reviewed
- [ ] Regression: smoke, access matrix, legal, payments-referrals

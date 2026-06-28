# Plan — Migrate Chatbot Endpoints from Cloud Functions to Next.js Routes

**Status:** Ready to execute (not started)
**Trigger phrase:** "run the chatbot migration plan"
**Estimated work:** 60–90 minutes
**Revert:** flip one env var (`NEXT_PUBLIC_API_URL`) + one n8n field. No code rollback needed.

---

## What we're moving

Currently the chatbot uses 2 endpoints on the Cloud Function at `https://api-h4o777ecua-uc.a.run.app/api/...`:

| Endpoint | Purpose | Caller |
|---|---|---|
| `POST /api/chat` | Save user message, kick off n8n with chatroomId | Frontend (`KumaAIChatTab.tsx`) |
| `POST /api/save-chat` | Save the AI's response (called back from n8n) | n8n HTTP Request node (`callbackUrl`) |

We're moving **just these two**. Stripe, NOWPayments, crypto-payments, chat-history, crypto/listings stay on the Cloud Function (separate concerns, separate migration).

Source today: `C:/Users/Andrew/CascadeProjects/kumami-web/functions/index.js` (L543–L701)

---

## Target architecture (after migration)

```
Browser                                    Next.js (same domain)                          n8n
─────────                                  ────────────────────                          ────
KumaAIChatTab.tsx
    │
    │  fetch('/api/chat', ...)
    ▼
                              src/app/api/chat/route.ts
                              (firebase-admin: save user msg, find/create chatroom)
                                    │
                                    │  fetch(N8N_WEBHOOK_URL, body + callbackUrl)
                                    ▼
                                                                              n8n workflow runs
                                                                              (Gemini, tools)
                                    ◀────── fire-and-forget ────────────
                              returns 202 to browser immediately
        ◀────── 202 ─────────

Later, n8n calls back:
                              src/app/api/save-chat/route.ts ◀────── POST callbackUrl ──── n8n
                              (firebase-admin: save AI msg → Firestore)

                              Frontend onSnapshot listener picks up the new message
                              and renders it.
```

Both new endpoints use `src/lib/firebase-admin.ts` (already in this repo) and `fetch` (no axios needed).

---

## Pre-flight checklist (do before triggering)

- [ ] Confirm `FIREBASE_SERVICE_ACCOUNT_JSON` is set in `.env.local` (firebase-admin needs it). Check with: `node -e "console.log(!!process.env.FIREBASE_SERVICE_ACCOUNT_JSON)"` after loading .env. If not set: download a Firebase service account key from Console → Project Settings → Service Accounts → Generate new private key, paste the entire JSON as a single line.
- [ ] Confirm chatbot's n8n webhook URL: `https://n8n.srv1258054.hstgr.cloud/webhook/5e6bb706-b2c6-4024-91a7-33da36297030` (this is what's currently used)
- [ ] Confirm no other client besides this Next.js app calls `/api/chat` or `/api/save-chat` on Cloud Run (you confirmed CRA is retired)

---

## Decisions before execution

| # | Decision | Default |
|---|---|---|
| M1 | Keep `chatMessages` collection paths exactly as today (`users/{uid}/chatrooms/{id}/messages`)? | **Yes — same paths**, so existing chats keep working |
| M2 | Migrate `/api/chat-history/:userId` too? | **No** — frontend uses `onSnapshot` directly, not this endpoint. Leave on Cloud Function for now. |
| M3 | Should `/api/chat` await n8n response or fire-and-forget? | **Fire-and-forget** (return 202) — UI already uses Firestore listener for AI reply. Matches current behavior except no useless `n8nResponse.data` payload returned. |
| M4 | Use a feature-flag env var to switch back instantly? | **Yes** — keep `NEXT_PUBLIC_API_URL` as the switch. Setting it to empty string means "use Next.js routes". Setting it back to the Cloud Run URL reverts. |

---

## Execution steps (what I'll do when you trigger)

### Step 1 — Create `src/app/api/chat/route.ts`

Port the logic from `functions/index.js:543-638` using `firebase-admin` from `@/lib/firebase-admin`. Behavior:
- Read `{ message, metadata: { userId, chatRoomId, source } }` from request body
- Validate userId + non-empty message → 400 if bad
- Resolve `chatRoomId` (use provided, else fetch user.activeChatRoomId, else create new chatroom)
- Save user message to `users/{uid}/chatrooms/{id}/messages`
- POST to n8n webhook with `{ message, chatroomId, source, userId, callbackUrl: <new save-chat URL> }`
- Return 202 with `{ chatRoomId }` immediately (don't await n8n)

Env vars used:
- `N8N_CHAT_WEBHOOK_URL` (new — explicit, doesn't reuse the portfolio scan one)
- `NEXT_PUBLIC_SITE_URL` (the base URL for callbackUrl construction)

### Step 2 — Create `src/app/api/save-chat/route.ts`

Port `functions/index.js:641-701`. Behavior:
- Read `{ userId, aiResponse, chatRoomId }` from body
- Validate → 400 if missing
- Resolve target chatroom (use provided, else activeChatRoomId, else create)
- Save assistant message to `users/{uid}/chatrooms/{id}/messages`
- Update chatroom `updatedAt`
- Return `{ success: true, messageId, chatRoomId }`

### Step 3 — Update the n8n chatbot workflow

The existing `Kuma AI Agent` workflow has an HTTP Request node that POSTs to `$('Webhook').item.json.body.callbackUrl`. **No workflow change needed** — the callbackUrl comes from the request payload, so as long as Next.js sends the right URL in step 1, n8n calls back to the new endpoint automatically.

Quick verification I'll do: read the n8n workflow file (`C:/Users/Andrew/Downloads/Kuma AI Agent.json`) to confirm it dereferences callbackUrl from the body and doesn't hardcode the Cloud Run URL anywhere.

### Step 4 — Update env vars

Add to `.env.local` and `.env.production.local`:
```
N8N_CHAT_WEBHOOK_URL=https://n8n.srv1258054.hstgr.cloud/webhook/5e6bb706-b2c6-4024-91a7-33da36297030
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # in dev
# NEXT_PUBLIC_SITE_URL=https://kumami.world  # in prod
```

Flip the switch (still in env):
```
# BEFORE migration (Cloud Function active):
NEXT_PUBLIC_API_URL=https://api-h4o777ecua-uc.a.run.app

# AFTER migration (Next.js routes active):
NEXT_PUBLIC_API_URL=
```

When `NEXT_PUBLIC_API_URL` is empty, the existing `fetch(\`${process.env.NEXT_PUBLIC_API_URL}/api/chat\`, ...)` becomes `fetch('/api/chat', ...)` which hits the Next.js route on the same domain.

### Step 5 — Smoke test

1. `npm run dev`
2. Open `/pro` → Kuma AI Chat tab → send a message
3. Verify: user message appears immediately, n8n executes (check executions log), AI reply appears in chat within ~5s via Firestore listener
4. Check no console errors, no 404/500 in Network tab

### Step 6 — Deploy

1. Set the same env vars on Vercel (or your host)
2. Deploy
3. Test the same flow on production

### Step 7 — Leave Cloud Function alive (don't delete yet)

Keep it running for 1–2 weeks as a safety net. The `NEXT_PUBLIC_API_URL` env var is your kill switch — if anything breaks, flip it back to the Cloud Run URL and chat instantly falls back to the function.

---

## Rollback

If the migration breaks something in production:

1. **Vercel → Project Settings → Environment Variables** → set `NEXT_PUBLIC_API_URL` back to `https://api-h4o777ecua-uc.a.run.app`
2. Redeploy (or trigger an env-only redeploy; Vercel does this for you)
3. Chat is back on the Cloud Function within ~30 seconds. Zero code change.

No Firestore data migration to undo (same collection paths). No n8n change to undo (callbackUrl was always read from request body).

---

## After 2 weeks of stability — cleanup (separate task)

- [ ] Confirm no `/api/chat` or `/api/save-chat` requests in Cloud Function logs for 7 days
- [ ] Remove just those two routes from `functions/index.js` (leave Stripe / NOWPayments alone)
- [ ] `firebase deploy --only functions` from the old CRA repo
- [ ] Optionally remove `NEXT_PUBLIC_API_URL` entirely if no other endpoint uses it (audit first: `grep -r NEXT_PUBLIC_API_URL src/`)

---

## Why this is safe

- **Same Firestore paths** → no data migration, existing chats keep working both during and after
- **Same n8n workflow** → no changes to the LLM logic
- **One-knob revert** → `NEXT_PUBLIC_API_URL` env var is the on/off switch
- **Cloud Function stays deployed** → instant fallback for ~2 weeks
- **No client code changes after the env flip** → the `fetch` call already templates the API URL prefix

## What could go wrong

| Risk | Detection | Mitigation |
|---|---|---|
| `firebase-admin` initialization fails (bad service account) | First call returns 500 | Caught in pre-flight checklist; smoke test catches in dev |
| n8n posts callback before save endpoint is deployed | AI reply doesn't appear in chat | Ship `/api/save-chat` first, verify it 200s, then flip the env switch |
| `NEXT_PUBLIC_SITE_URL` wrong → n8n callback hits wrong URL | AI replies never save | curl the callback URL after deploy to confirm |
| Cold start on serverless adds latency | Slightly slower first message | Acceptable; Cloud Run had cold starts too |

---

## How to trigger

When you're ready: tell me **"run the chatbot migration plan"** (or any clear variant). I'll:
1. Re-read this file for current decisions
2. Execute Steps 1–4 (code + env scaffolding)
3. Stop and ask you to run Step 5 (smoke test)
4. After you confirm, Step 6 (deploy) is on you; Step 7 (Cloud Function lifeline) is automatic

# Kumami Calendar, Admin Authoring & Following Alerts — Discovery PRD

**Status:** discovery-in-progress
**Owner:** Andrew
**Created:** 2026-10-28 WIB

## 1. Product summary

Kumami’s Calendar should be a visual planning surface rather than a filtered event list. Admins need to publish rich calendar events and decide whether each event is visible to Plus, Pro, or both. Users need a compact calendar in the Plus Market Console, a full Google Calendar-like monthly view, and a clearer Following & Alerts surface inspired by CoinMarketCap.

## 2. Confirmed requirements

1. Admin text-entry surfaces should support **bold**, *italic*, and underline for editorial text.
2. The calendar event form no longer requires a category selector.
3. The public calendar removes category, asset, and impact filters.
4. Calendar data includes admin-published events, airdrops, and token unlocks.
5. Admins can select whether each event is visible to **Plus**, **Pro**, or **both**.
6. The Plus Market Console replaces the current seven-day agenda with a compact month-calendar preview.
7. Full Calendar uses a Google Calendar-like, colour-coded month grid.
8. Following & Alerts should move toward CoinMarketCap-style asset following and configurable alerts, with an in-app trigger state and opt-in browser notification permission.
9. Airdrops are **Calendar Pro / Pro-user only**. They must not appear anywhere in the Plus Calendar or Plus Console mini-calendar.

## 3. Product principles

- Keep public calendar data source-honest: no fabricated airdrop or unlock entries.
- Hide no event merely because it is not in the current user’s entitlement; label the tier access state honestly.
- Use a single canonical event schema across Console, Calendar, and admin authoring.
- Avoid a category field in admin authoring; event kind is inferred from the source and optional structured fields.
- Preserve existing Firestore records and legacy category rendering during migration.
- Do not change production Firestore rules, feeds, or deployments in this slice.

## 4. Information architecture

### Event sources

- **Admin editorial events:** `pro_calendar` Firestore records.
- **Airdrop / whitelist milestones:** published `pro_airdrops` records with a dated claim/TGE milestone.
- **Token unlocks:** enabled CoinGlass feed.
- **Macro events:** enabled CoinGlass feed; retained in the data model but not exposed as an interactive public filter.

### Visibility

New admin fields:

- `audience.plus: boolean`
- `audience.pro: boolean`

Default for a new manual event: both enabled. Missing fields on legacy events are treated as both enabled.

### Calendar surfaces

- **Plus Market Console:** compact month-grid preview, today state, colour-coded dots/bars, a bounded upcoming-event rail, and a link to the full Calendar.
- **Full Calendar:** Google Calendar-like month grid, month navigation, colour-coded event chips, event detail on selection, and visible tier badge/state where relevant.
- **Pro:** receives the same canonical events, with Pro-only events visible only to Pro users.

## 5. Following & Alerts — proposed default

Implement the CMC-inspired interaction model in phases:

1. Follow/unfollow supported assets from watchlist/market surfaces.
2. Alert builder supports a symbol and condition: percentage movement, absolute target price, or percentage volume change.
3. Each alert can be enabled, paused, edited, deleted, and re-armed after it triggers.
4. Initial delivery is an in-product triggered state with optional browser notification only when permission is already granted. No email, Telegram, or push provider is added in this slice.

**Open decision:** whether Andrew expects actual off-app notifications (browser push, email, Telegram) now. This requires a notification delivery service, permission UX, rate limits, and an explicit operating authority.

## 6. Acceptance criteria

- [ ] Admin content fields use the shared rich-text editor where compatible; bold, italic, and underline survive save/read.
- [ ] Creating/editing a calendar event requires title/date but not category.
- [ ] Admin can set Plus and Pro visibility independently; legacy records are visible to both.
- [ ] Calendar API merges eligible airdrop, unlock, admin, and macro events without exposing unpublished content.
- [ ] Plus Console renders a compact monthly calendar, not a seven-day agenda.
- [ ] Full Calendar has colour-coded events with accessible non-colour labels.
- [ ] Category/asset/impact filters are absent from the public Calendar page.
- [ ] Follow/alert settings persist per signed-in user and support configure, pause, delete, and re-arm.
- [ ] Existing calendar and alert data remains readable after migration.
- [ ] Local tests, typecheck, production build, and screenshot evidence pass before any release consideration.

## 7. Scope and non-goals

### In scope

Calendar schema/UI, admin authoring, Plus/Pro visibility, console mini calendar, rich text in applicable admin content forms, and local-only CMC-inspired in-product alert controls.

### Explicitly deferred

- external notification delivery
- background/server-side alert evaluation
- Firestore security-rule changes
- CoinGlass feed activation or provider configuration changes
- deployment or production data migration

## 8. Risks and decisions

- Existing admin text fields are mixed plain-text and rich-content data; migration must be additive and preserve string content.
- Token unlock availability depends on the existing feed setting and provider response; no fictional data is allowed.
- User-tier filtering requires confirming the entitlement source already used by Plus/Pro layouts.
- The phrase “CMC alerts” can mean in-app, browser, email, or push notifications. The recommended safe default is CMC-style alert configuration plus in-product triggers first.

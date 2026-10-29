# Design Brief — Kumami Calendar Pro

**PRD:** `docs/PRD_Calendar_Admin_Alerts_2026-10-28.md`
**Surface:** authenticated Plus/Pro market workspace and admin dashboard

## User job

See what matters to the portfolio this month, understand event type/urgency at a glance, then configure personal follows and alerts without navigating a dense filter stack.

## Visual direction

- Google Calendar-inspired monthly rhythm: seven equal columns, clear day headers, events as short coloured bars/chips, selected day detail.
- Preserve Kumami’s dark Market Console visual language; do not import Google branding or light-theme styling.
- Colour is semantic only when paired with a label/icon/tooltip: macro, unlock, airdrop, Kumami editorial.
- The Plus Console mini calendar is compact, scannable, and links directly to the full Calendar; it is not a scaled-down agenda list.

## Required states

- loading skeleton
- no events this month
- partially unavailable feed with remaining sources still rendered
- empty event day
- admin draft vs published
- Plus-only / Pro-only / both visibility
- legacy event with no audience field
- alert armed, paused, triggered, unavailable-symbol

## Admin authoring

- Title and date are required.
- No category control.
- Audience has two explicit switches: Plus and Pro; at least one must be enabled.
- Description uses shared rich text where its stored data contract supports it. Short labels/titles remain plain text.
- Admin controls must not silently enable market feeds.

## Anti-patterns

- No category, asset, or impact filter chips on the public Calendar.
- No fabricated token unlock/airdrop records.
- No reliance on colour alone.
- No claimed external push/email/Telegram delivery until a delivery service is built and verified.
- No destructive migration of existing `pro_calendar` records.

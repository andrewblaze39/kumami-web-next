# Kumami World Design System

> Last updated: 2026-07-10
> CSS source: `src/app/world/world.css` (all styles scoped under `.world-root`)

This document defines the visual language for Kumami World. **Mobile-first** — the mobile view is the primary design target because it serves as the basis for the Flutter mobile app. Every component must work on mobile before desktop polish is added.

---

## 1. Color System

### Brand & Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#00c2c7` | Primary interactive: buttons, links, active states, focus rings |
| `--accent-strong` | `#40e0d0` | Hover/elevated accent |
| `--accent-soft` | `#aafafc` | Soft highlights, selection tint |
| `--on-accent` | `#00272a` | Text on accent backgrounds |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--ink` | `#f1f7f4` | Primary text (off-white) |
| `--muted` | `#8ea69c` | Secondary text, labels |
| `--muted-2` | `#5f786e` | Tertiary text, disabled, placeholders |

### Backgrounds & Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0a0a0f` | App background |
| `--bg-2` | `#060609` | Sidebar background |
| `--topbar` | `#050508` | Topbar background |
| `--panel` | `#101014` | Card/panel background |
| `--panel-2` | `#15151b` | Secondary panel, input fields |
| `--panel-3` | `#1a1a22` | Tertiary panel, hover states |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--bull` | `#46e3a0` | Bullish/positive/up — trends, gains, success |
| `--bear` | `#ff6b81` | Bearish/negative/down — losses, errors, drops |
| `--amber` / `--gold` | `#f0cd7e` | Warning, caution, Advanced tier badge |
| `--purple` | `#b9a4ff` | Pro tier, AI features |
| `--accent2` | `#56dfe6` | Secondary accent, Macro/Regulatory category |
| `--danger` | `#ff7a7a` | Error states, destructive actions |
| `--neutral` | `#f0b65e` | Neutral market sentiment |

### Borders & Lines
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `rgba(255,255,255,0.08)` | Subtle borders (8% white) |
| `--border-2` | `rgba(255,255,255,0.14)` | Stronger borders (14% white) |
| `--line` | `rgba(150,158,170,0.18)` | Dividers, grid lines |

### Advanced Mode Surface Tokens
Aliased to the standard neutral panel tokens. Used on Console, On-Chain, Intel, Watchlist pages via `--adv-*` variable names for historical reasons, but resolve to the same neutral values as the rest of the app.

| Token | Resolves to | Usage |
|-------|------------|-------|
| `--adv-surface` | `var(--panel)` | Panel background |
| `--adv-surface-2` | `var(--panel-2)` | Secondary surface |
| `--adv-surface-3` | `var(--panel-3)` | Tertiary surface |
| `--adv-border` | `var(--border)` | Panel borders |
| `--adv-border-2` | `var(--border-2)` | Stronger panel borders |
| `--grid-line` | `var(--line)` | Internal grid lines |

### Education Embedded Pages
Education pages (`/world/education` subtabs, course reader) render inside an `<EduEmbed>` wrapper that applies the `edu-app` scope with its own token set in `src/app/education/education.css`. These tokens are aligned to the standard neutral palette:

| Token | Hex | Matches |
|-------|-----|---------|
| `--bg` | `#0a0a0f` | `var(--bg)` |
| `--bg-2` | `#060609` | `var(--bg-2)` |
| `--surface` | `#101014` | `var(--panel)` |
| `--surface-2` | `#15151b` | `var(--panel-2)` |
| `--surface-3` | `#1a1a22` | `var(--panel-3)` |
| text-on-accent | `#00272a` | `var(--on-accent)` |

### Coin Brand Colors
Used in coin badges, chart labels, and asset selectors:

| Coin | Color | | Coin | Color |
|------|-------|-|------|-------|
| BTC | `#f7931a` | | DOGE | `#d8b34a` |
| ETH | `#6f8ce8` | | AVAX | `#ff6b81` |
| SOL | `#27c4a6` | | LINK | `#4f86ff` |
| BNB | `#f0b65e` | | SUI | `#56dfe6` |
| GOLD | `#e7c06a` | | HYPE | `#31d0aa` |
| XRP | `#9fb0bd` | | Fallback | `var(--accent)` |

### Intelligence Category Colors
| Category | Color | Background |
|----------|-------|-----------|
| Macro / Regulatory | `#56dfe6` | `rgba(86,223,230,0.13)` |
| Trade | `#b9a4ff` | `rgba(167,139,250,0.14)` |
| Narrative | `#e7c06a` | `rgba(231,192,106,0.13)` |
| Security | `#ff6b81` | `rgba(255,107,129,0.16)` |

---

## 2. Typography

### Font
**Plus Jakarta Sans** — loaded via `next/font/google` in `src/app/world/layout.tsx`.
- CSS variable: `--font-jakarta`
- Weights loaded: 400, 500, 600, 700, 800
- Display strategy: `swap`
- Fallback stack: `system-ui, sans-serif`
- Anti-aliasing: `-webkit-font-smoothing: antialiased`

### Type Scale

| Role | Size | Weight | Letter-spacing | Usage |
|------|------|--------|---------------|-------|
| Page title | 30px | 800 | -0.025em | Main page headings (`h1`) |
| Section heading | 26px | 800 | -0.02em | Panel hero values, large numbers |
| Panel title | 15px | 800 | -0.01em | Panel headers (`w-apanel-h .w-ttl`) |
| Card title | 16px | 800 | -0.01em | Card headings, list item titles |
| Body | 14.5px | 600 | — | Standard paragraph text |
| Body small | 13.5px | 600 | — | Secondary body, links |
| Caption | 12px | 700 | — | Labels, metadata, timestamps |
| Small caption | 11.5px | 600–700 | — | Chip text, footnotes |
| Micro label | 10px | 800 | 0.1em | Uppercase tags, badge text |
| Button | 14.5px | 700 | — | Button labels |

### Text rendering
- `text-rendering: optimizeLegibility`
- Selection: `color-mix(in srgb, var(--accent) 30%, transparent)` background

---

## 3. Layout System

### Shell Structure (Desktop)
```
+--[Sidebar 248px]--+--[Main]-----------------------------------------+
|                    | [Topbar 62px, sticky]                           |
|  Brand/logo        | [Breadcrumb] [Spacer] [Mode Toggle] [Kuma FAB] |
|  Navigation        |------------------------------------------------|
|  groups            | [Content area, scrolls]                         |
|                    |   max-width: 1180px                             |
|                    |   padding: 30px 40px 90px                       |
|  Profile (bottom)  |                                                 |
+--------------------+-------------------------------------------------+
```

### Key Layout Values
| Element | Value |
|---------|-------|
| Sidebar width | `248px` (`--sidebar`) |
| Sidebar padding | `12px 14px` |
| Nav item padding | `7px 12px` |
| Nav item font | `14px / 700` |
| Nav item icon | `17px` |
| Nav label padding | `10px 12px 4px` |
| Topbar height | `62px` (sticky) |
| Content max-width | `1180px` (`--maxw`) |
| Content padding (desktop) | `30px 40px 90px` |
| Content padding (mobile) | `24px 18px 80px` |
| Kuma dock width | `380px` (`--kuma-w`) |

### Scrolling
**Only `.w-main` scrolls.** Sidebar, topbar, and Kuma dock are fixed/sticky — they never scroll independently. This ensures consistent shell chrome on all screen sizes.

---

## 4. Responsive Breakpoints

### Mobile-First Priority
The mobile layout is the **primary design target**. It must be complete and usable before desktop enhancements are added. Rationale: the Flutter mobile app mirrors the web views, so the mobile web layout IS the mobile app layout reference.

### Breakpoints

| Width | Name | Key Changes |
|-------|------|-------------|
| >1080px | Desktop | Full sidebar visible, multi-column grids |
| <=1080px | Tablet | Sidebar collapses to overlay (hamburger menu), grids drop to 1-2 columns, content padding reduces, breadcrumb stays |
| <=760px | Mobile | Breadcrumb hidden, mode toggle shows icons only for inactive modes, Kuma dock becomes full-screen overlay, most grids become single column |
| <=600px | Small mobile | On-chain tiles → single column, pro grid → single column, heatmap labels truncated |

### Sidebar Behavior
- **Desktop (>1080px):** Fixed left sidebar, always visible
- **Mobile (<=1080px):** Hidden off-screen (`translateX(-100%)`), slides in on hamburger tap, dark backdrop overlay behind it (`rgba(4,4,6,0.55)` + `blur(3px)`)

### Kuma AI Dock
- **Desktop:** Slides in from right, `380px` max, pushes content
- **Mobile (<=760px):** Full-screen overlay (`position: fixed`, `width: 92vw`)

### Touch Targets
Minimum interactive element sizes: `36-38px` for FABs and icon buttons, `44px` recommended for primary actions. Gaps between tappable elements: `12-16px` minimum.

---

## 5. Component Library

### Buttons (`.w-btn`)

**Base:**
- Padding: `12px 20px`
- Border-radius: `13px`
- Font: `14.5px / 700`
- Transition: `0.16s`
- Display: `inline-flex`, gap: `9px`
- Icon size: `17px`

**Variants:**

| Class | Background | Text | Border | Usage |
|-------|-----------|------|--------|-------|
| `.w-btn-primary` | `var(--accent)` | `var(--on-accent)` | none | Primary CTA |
| `.w-btn-ghost` | transparent | `var(--ink)` | `var(--border-2)` | Secondary action |
| `.w-btn-surface` | `var(--panel-2)` | `var(--ink)` | `var(--border)` | Tertiary/inline action |
| `.w-btn-pro` | gold gradient | dark | none | Pro upgrade CTA |

**Sizes:**

| Class | Padding | Font | Radius |
|-------|---------|------|--------|
| `.w-btn-sm` | `8px 14px` | `13px` | `11px` |
| (default) | `12px 20px` | `14.5px` | `13px` |
| `.w-btn-lg` | `15px 26px` | `16px` | `15px` |
| `.w-btn-pill` | (any) | (any) | `999px` |

### Badges & Tags

**Tier Badges (`.w-tag-badge`):**
- Font: `10px / 800`, uppercase, `letter-spacing: 0.06em`
- Padding: `4px 9px`, radius: `7px`

| Class | Style | Usage |
|-------|-------|-------|
| `.w-tag-adv` | Gold border + gradient bg, `#f0cd7e` text | Advanced content marker |
| `.w-tag-pro` | Purple border + gradient bg, `#c4b3ff` text | Pro content marker |

**Category Chips (`.w-np-cat`):**
- Border: `1px solid var(--border)`
- Background: `var(--panel-2)`
- Padding: `7px 14px`, radius: `9px`
- Font: `12.5px / 700`
- Active (`.is-active`): bg → `var(--accent)`, text → `var(--on-accent)`

**On-Chain Tags (`.w-oc-tag`):**
- Font: `10px / 800`, uppercase, `letter-spacing: 0.04em`
- Padding: `4px 9px`, radius: `6px`

| Variant class | Background | Text |
|--------------|-----------|------|
| `.red` | `rgba(255,107,129,0.16)` | `#ff6b81` |
| `.amber` | `rgba(231,192,106,0.16)` | `#e7c06a` |
| `.neutral` | `var(--adv-surface-3)` | `var(--muted)` |
| `.mint` / `.green` | `rgba(70,227,160,0.15)` | `var(--bull)` |
| `.ggreen` | `rgba(70,227,160,0.09)` | `#8fd6b4` |
| `.gred` | `rgba(255,107,129,0.09)` | `#d69aa4` |

**Intelligence Tier Badges (`.w-tier`):**
- Size: `26px x 26px`, radius: `8px`
- Font: `13px / 800`

| Class | Color | Background | Meaning |
|-------|-------|-----------|---------|
| `.w-tier-A` | `#ff6b81` | `rgba(255,107,129,0.16)` | Market-moving |
| `.w-tier-B` | `#e7c06a` | `rgba(231,192,106,0.16)` | Notable |
| `.w-tier-C` | `var(--muted)` | `rgba(120,200,170,0.12)` | Context |

### Cards & Panels

**Advanced Panel (`.w-apanel`):**
```
+--[Header: .w-apanel-h]--[padding: 16px 20px]--+
| [Icon .w-ic] Title .w-ttl    [Right side .sub] |
+---------[border-bottom]------------------------+
| [Body: .w-apanel-b]          [padding: 18px 20px]
|                                                 |
+---------[border-top]----------------------------+
| [Footer: .w-apanel-foot]    [padding: 13px 20px]
| [Meta .w-fmeta]                      [Link →]  |
+-------------------------------------------------+
```
- Background: `var(--adv-surface)`, border: `var(--adv-border)`, radius: `18px`

**Locked Card (`.w-locked-card`):**
- Same as panel but with blur overlay + lock icon
- `.w-lock-veil`: gradient overlay with `backdrop-filter: blur(3px)`

**Regime Chips (`.w-regime-chip`):**
- Grid: `repeat(5, minmax(0,1fr))`, gap: `12px`
- Each chip: radius `14px`, padding `14px 16px`
- Left accent bar (`::after`): `3px` wide, color from `--rc` variable
- Hover: `translateY(-2px)`

### Mode Toggle (`.w-mode-switch`)

Three-way segmented control in the topbar:

| Mode | Knob color | Text color (active) | Icon |
|------|-----------|---------------------|------|
| Beginner | `var(--accent)` solid | `var(--on-accent)` | Seedling |
| Advanced | Gold gradient | `#1a1405` | Star |
| Pro | Purple gradient | `#1c1336` | Bolt + lock glyph |

- Inactive buttons: transparent, `var(--muted)` text
- At <=760px: inactive buttons show icon only (labels hidden)
- Animated knob slides between positions (`.w-knob`, `0.26s` transition)

---

## 6. Icons

### Lucide React
Primary icon library. Usage: `import { Lock, X, ChevronDown } from 'lucide-react'`.

### Custom SVG Icon Set
Located in `src/components/world/panels/console-ui.tsx`. The `WIcon` component renders inline SVGs:

Available icons: `spark`, `layers`, `flame`, `doc`, `news`, `bookmark`, `clock`, `star`, `arrowR`, `bolt`, `shield`, `lock`, `chevD`, `users`, `building`

Properties:
- ViewBox: `0 0 24 24`
- Stroke: `currentColor` (inherits text color)
- Default size: `17px`

### Coin Badges
Circular badges with coin-brand background color and first letter:
```tsx
<span className="w-coin" style={{ background: coinC('BTC') }}>B</span>
```
Sizes: `17px` (small, in tabs), `22px` (standard), `30px` (large).

---

## 7. Shadows & Elevation

| Context | Shadow |
|---------|--------|
| Panels, dropdowns | `0 18px 50px -20px rgba(0,0,0,0.7)` |
| Kuma dock (open) | `-16px 0 40px -24px rgba(0,0,0,0.7)` |
| Primary button hover | `0 16px 40px -14px color-mix(in srgb, var(--accent) 60%, transparent)` |
| Pro card hover | `0 12px 36px -16px rgba(240,205,126,0.18)` |
| Focus ring (FAB) | `0 0 0 4px color-mix(in srgb, var(--accent) 14%, transparent)` |
| Live indicator dot | `0 0 0 3px rgba(70,227,160,0.18)` |

### Glass/Blur
| Context | Background | Blur |
|---------|-----------|------|
| Topbar | `rgba(6,6,9,0.78)` | `blur(14px)` |
| Auth modal overlay | `rgba(4,4,6,0.72)` | `blur(8px)` |
| Mobile sidebar backdrop | `rgba(4,4,6,0.55)` | `blur(3px)` |
| Lock veil | gradient | `blur(3px)` |

---

## 8. Animations

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| `w-pop` | 0.2s | ease | Entrance pop (scale 0.98→1 + fadeUp) |
| `w-fadeUp` | 0.3s | ease | Fade + slide up |
| `w-pulse` | 2s | infinite | Opacity pulse (loading dots) |
| `w-spin` | 0.7s | linear infinite | Spinner rotation |
| `w-logo-pulse` | 1.6s | ease-in-out infinite | Gate logo breathing |
| `w-tk-marquee` | 40s | linear infinite | Ticker tape scroll |
| `w-kuma-dot` | 1.2s | infinite | Kuma typing indicator |
| `w-shimmer` | 1.5s | ease infinite | Skeleton loader |

### Transition Speeds
| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | `0.14s` | Hover states, micro-interactions |
| Standard | `0.15-0.16s` | Buttons, toggles, color changes |
| Smooth | `0.18s` | Card borders, larger hover effects |
| Slow | `0.26s` | Mode toggle knob |
| Very slow | `0.34s` | Kuma panel slide, sidebar slide |

---

## 9. Corner Radii

| Size | Value | Usage |
|------|-------|-------|
| Pill | `999px` | Buttons (pill variant), badges, toggle knobs |
| Large | `26px` | Gate card, large modals |
| Standard | `18px` | Cards, panels (`.w-apanel`) |
| Medium | `13-15px` | Buttons, large inputs |
| Small | `11-12px` | Small buttons, inputs, category chips |
| Chip | `9px` | Tags, small chips |
| Badge | `7-8px` | Tier badges, on-chain tags |

---

## 10. Spacing Scale

The app uses a consistent spacing scale (not a strict token system, but these values recur):

`2 · 3 · 4 · 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 30 · 40 · 90px`

Most common: `8`, `12`, `14`, `16`, `20` for component internals; `24`, `30`, `40` for page-level spacing.

---

## 11. Grid Patterns

| Pattern | Columns | Gap | Used in |
|---------|---------|-----|---------|
| News portal (lead+aside) | `1.7fr 1fr` | `26px` | News hero grid |
| Regime chips | `repeat(5, 1fr)` | `12px` | Console regime row |
| Market tiles | `repeat(4, 1fr)` | `14px` | On-chain funding/liq/netflow/LS |
| Bento 2-up | `1.45fr 1fr` | `16px` | Console panels R2 |
| Bento 2-up wide | `1.6fr 1fr` | `16px` | Console panels R3 |
| Chart panels 3-up | `repeat(3, 1fr)` | `16px` | On-chain CVD/Premium/ETF |
| Treemap | `repeat(8, 1fr)` | `5px` | Console heatmap, auto-rows `64px` |
| Education cards | `repeat(auto-fill, minmax(280px, 1fr))` | `20px` | Research/education grids |

All multi-column grids collapse to `1fr` at `<=760px`.

---

## 12. Scrollbar Styling

**Main scrollbar (`.world-root`):**
- Width: `11px`
- Thumb: `rgba(255,255,255,0.1)`, radius `20px`, `3px` border (transparent)
- Thumb hover: `rgba(255,255,255,0.18)`

**Kuma messages (narrow):**
- Width: `4px`
- Thumb: `color-mix(in srgb, var(--accent) 18%, transparent)`

---

## 13. Mobile Design Checklist

When building any new component or page, verify:

- [ ] **Single column at <=760px** — no horizontal scrolling
- [ ] **Touch targets >= 44px** for primary actions, >= 36px for secondary
- [ ] **Tap gaps >= 12px** between adjacent interactive elements
- [ ] **Text readable at 14px minimum** — no body text below 12px
- [ ] **No hover-only interactions** — everything accessible via tap
- [ ] **Sidebar closed by default** on mobile
- [ ] **Kuma dock is full-screen overlay** on mobile, not side panel
- [ ] **Bottom padding >= 80px** on content to clear mobile nav/dock
- [ ] **Images/charts scale** — use `width: 100%` with constrained aspect ratios
- [ ] **Mode toggle labels hidden** for inactive modes at <=760px (icons only)
- [ ] **Breadcrumb hidden** at <=760px
- [ ] **Test the component by narrowing the browser** before considering it done
- [ ] **This view will be mirrored in the Flutter app** — keep layout simple and translatable

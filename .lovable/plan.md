# Vakansie — Design Blueprint (signed-in product)

One direction: **"Reisdossier"** — a calm, editorial travel dossier. Not a dashboard, not a feed. The product looks like a well-kept document about your trip, with a quiet assistant living inside it.

## 1. Design language

**Palette (restrained, replaces bright green accent)**
- Canvas: warm off-white `38 30% 97%` / dark `220 18% 9%`
- Ink (primary text + header bars): near-black ink `220 20% 12%`
- Accent: deep sea teal `188 62% 26%` — used only for state, links, active nav, primary action. Never for large fills.
- Signal colors used sparingly and only semantically: amber `36 78% 46%` = nog te regelen, sea teal = bevestigd, muted grey = niet relevant.
- No gradients, no glass, no colored cards. Color earns its place by carrying meaning.

**Typography**
- Display/headings: one confident grotesk with tight tracking (keep Plus Jakarta Sans, weight 800, `tracking-tight`). Section labels: 11px uppercase, `tracking-[0.18em]`, muted.
- Body: DM Sans 15px/1.5. Numbers in headline positions use tabular figures.
- Hierarchy comes from size + weight + whitespace, not from boxes.

**Surfaces & borders**
- Default surface = the canvas itself. Content is separated by hairline rules (`1px border` at 8% ink) and 24–32px vertical rhythm, not by stacked cards.
- Cards exist only for *objects you can open* (a trip, a trip item, a task, a document). One card style: radius 14px, hairline border, no shadow at rest, subtle shadow only while dragging/open.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Page gutter 20px on 390px.

**Icons & imagery**
- Lucide, 18–20px, stroke 1.5, always muted unless active. Icons never decorate — only label or act.
- Imagery: destination photography only at the top of a trip (a 120px tall banded image strip behind the trip header, ink-tinted overlay). No photos on lists, no stock illustration, no empty-state mascots. Empty states are one line of text + one text action.

## 2. Home / Mijn reizen

Order on a 390px phone, top to bottom:
1. **Ink header bar** (48px): "Vakansie" wordmark left, notification + avatar right. Avatar opens Profiel/instellingen sheet — no separate nav item.
2. **Greeting line** (one line, small caps muted): "Hoi Hans".
3. **Actieve reis — the hero row.** Not a card grid. A full-width block: destination image strip, trip name in display 26px, dates + countdown ("over 47 dagen"), then a single **readiness line**: a thin 3px segmented bar (bevestigd / nog te regelen) with one sentence under it — "8 van 12 geregeld · 2 dingen vragen aandacht". Tapping anywhere opens the trip.
4. **Nu belangrijk** — max 3 rows, hairline-separated, each: icon, one-line label, right chevron. These are cross-trip action items, the real value of the home screen.
5. **Andere reizen** — compact one-line rows (name · dates · readiness dot). Never 2-column tiles.
6. **Archief** — collapsed disclosure row, count in the label.
7. Primary action "Nieuwe reis" as a bottom-anchored ink pill button only when the list is short; otherwise a text action in the "Andere reizen" section header.

Empty account: one sentence + one link, no giant illustrated card.

## 3. Trip shell & navigation

- **Trip header (sticky, ink):** back chevron to Mijn reizen, trip name (tap = trip switcher sheet), overflow `⋯` for Reisinstellingen. Height 48px. Below it, when scrolled to top only, a 2-line context strip: dates + destination + readiness dot.
- **Bottom nav:** exactly three items — Overzicht / Reis / Samen. Ink bar, 56px + safe area, active item = teal icon + label, inactive = 45% white. No badges except a single dot for genuinely new activity in Samen.
- **Inside a section, no pill-tab rows.** Reis is one chronological scroll (Vandaag → tijdlijn → documenten). Samen uses an inline segmented control of *at most three* segments (Taken / Keuzes / Kosten) with "Voor jou" and Mensen living inside Overzicht — not five chips.
- Settings and Profiel are never bottom-nav items: Profiel from the account header on /trips, Reisinstellingen from the trip `⋯`.

## 4. Hansie

Hansie stops being a floating bubble.

- **In-context entry:** a persistent, full-width **ask bar** docked directly above the bottom nav inside a trip: hairline top border, ink-tinted, left a small spark glyph, placeholder "Vraag Hansie wat er nog moet gebeuren". It is 44px tall, always present, never covers content (page padding accounts for it).
- **Opening:** tapping expands it upward into a sheet that fills ~85vh with a spring-free instant transition. The ask bar becomes the sheet's input, so the interaction feels like the bar grew — no new floating object appears.
- **Visual weight:** medium. Ink surface, teal caret, assistant replies as plain typographic text on canvas (no bubbles for Hansie), user messages as small right-aligned ink pills. Structured answers render as the same hairline rows used elsewhere, so "wat staat vast" looks like the product, not like a chat log.
- **Entry points outside a trip:** on /trips Hansie is a single line row under "Nu belangrijk" ("Vraag Hansie over je reizen"), not a floating button. Not present on Profiel or Beheer.
- Hansie always states what is stored fact versus suggestion, with stored facts rendered as rows and suggestions as prose.

## 5. Beheer console (/ops)

Deliberately a different product skin, so no one confuses it with the consumer app.
- Denser: 13px base, 8px rhythm, full-bleed tables instead of cards, sticky column headers.
- Neutral-only palette: grey scale + one alert red. No teal, no imagery, no rounded hero blocks.
- Top: a single-line status strip (counts as inline `label · value` pairs separated by dividers) plus a systeemgezondheid line — **not** eight equal KPI cards.
- Left/inline section list: Overzicht, Gebruikers, Reizen, Meldingen, Auditlog. Opens on Overzicht.
- Detail opens in a right-side panel on desktop, full sheet on mobile. Every mutation shows an explicit confirm with the audited action name.

## 6. Above the fold on 390px

- **/trips:** header bar, greeting, active-trip hero with readiness line, and the first 1–2 "Nu belangrijk" rows.
- **/trip/:id (Overzicht):** trip header + context strip, countdown, readiness sentence, "Voor jou" first item, start of Nu belangrijk. Ask bar visible at the bottom.
- **Reis:** header, "Vandaag/Volgende" block, first two timeline entries.
- **Samen:** header, "Voor jou" line, segmented control, first two rows.

## 7. Anti-patterns to remove

- 2x2 / 2x4 KPI card grids (Samen summary cards, Ops eight-card grid) → inline label·value strips.
- Oversized empty-state cards with headline + illustration + big button → one sentence + text link.
- Pill/chip tab overload (five horizontally scrolling section chips) → max three segments.
- Floating circular FAB for Hansie → docked ask bar.
- Everything-in-a-card layouts → hairline-separated rows with real whitespace.
- Colored status backgrounds and green fills everywhere → color only where it encodes state.
- Duplicated navigation (nav item + header link + dropdown for the same destination).
- Uppercase section headers used as decoration on every block; keep them for genuine section breaks only.

## Technical notes (for the build agent)

- Recolor via tokens in `src/index.css` only (`--background`, `--foreground`, `--primary` → teal, add `--warning-soft`, `--rule` hairline token). No hardcoded color utilities in components.
- New shared primitives: `SectionLabel`, `RowItem` (icon · title · meta · chevron), `ReadinessBar`, `StatStrip` (inline label·value), `AskBar`. Rebuild pages on these instead of ad-hoc cards.
- `HansieWidget` changes from fixed FAB + sheet to `AskBar` + expanding sheet; bottom padding of trip pages must add ask-bar height.
- Ops gets its own layout wrapper with a denser type scale, not `AppLayout`.
- Ship in this order: tokens/primitives → /trips → trip shell + AskBar → Reis → Samen → Ops.

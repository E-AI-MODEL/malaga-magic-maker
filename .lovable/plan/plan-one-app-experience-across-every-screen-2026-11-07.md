# Plan: one app experience across every screen

The goal: every screen fits on the phone without scrolling the page, every screen says plainly what you need to do, and Hansie is always one tap away from the menu bar at the bottom. No new features and no database changes.

## 1. Hansie moves into the bottom menu bar
- Remove the purple Hansie bar that sits above the menu.
- The bottom bar becomes: Overzicht · Reis · Samen · Knaakie (orange) · Hansie (lilac, round "H"). Hansie always opens the same chat panel for this trip. That panel already has the ready-made question tiles, focused on being at your destination.
- Overzicht, Reis and Samen keep their place, so the trip menu itself does not change.
- This frees up about 70px of height on every trip screen.

## 2. No page scrolling: fixed layout per screen
Each trip screen gets the same frame:

```text
[ Home ]                         [ ... ]   floating buttons over the photo or title
Title (one line) + one action
---------------------------------------
Content area: fixed tiles
(only long lists scroll, inside their own box)
---------------------------------------
Overzicht  Reis  Samen  Knaakie  Hansie
```

- **Title:** dates and destination go on one short line ("22 jul – 12 aug · La Pobla"), with no line break under the floating buttons. The title moves down so it never sits under the Home button.
- **Samen:**
  - The row of people becomes one compact line: little avatars plus "Uitnodigen", no large circles.
  - "Recente activiteit" goes, because it is old content that adds nothing.
  - Taken / Keuzes / Kosten stay as three large tiles in a row, each with one plain line saying what is expected of you (see 3).
- **Kosten (Knaakie):** the dark "Nog geen kosten" block becomes the orange Knaakie tile in the same style as the homepage, with two mini buttons, "Scan bon" and "Vul in".
- **Reis and Overzicht:** show at most 3 rows. More opens in a panel instead of making the page longer.
- **Home (/trips):** the product tiles, the next trip, the next step and "Voor jou" (at most 3). "Andere reizen" and the archive go into one tile that opens a panel.
- **Settings, Profiel, forms:** same frame. Anything that is too long goes in a panel that slides up from the bottom; the page itself never scrolls.

## 3. Clear language: what is the app asking you to do?
Every row says the action, not the topic. Examples:

| Now | New |
|---|---|
| Waar verblijven we? · 6 opties · 0 stemmen · Stemmen open | Kies jullie verblijf · 6 opties · Stem nu |
| Taken 0 | Taken · Niets voor jou |
| Keuzes 1 | Keuzes · 1 wacht op je stem |
| Kosten | Kosten · Nog niets betaald / Je krijgt € 40 |
| Nu doen | Eerst dit |
| Nog niets ingepland. Naar Reis | Zet je vlucht of verblijf erin |
| Iets betaald voor de groep? Maak een foto van je bonnetje. | Scan je bon |

- Copy rule: short commands without explanation. No "AI does X for you", no reassuring add-on sentences, no rhetorical questions. A button says the action ("Scan bon", "Stem nu", "Nodig uit"); a line says the fact ("1 wacht op je stem"). Anything that does not tell you what to do or what the state is gets deleted.
- The backend keeps the stored title "Waar verblijven we?" so voting and choosing keep working. The app only displays it as "Kies jullie verblijf".
- Sweep for old leftovers: "Recente activiteit", "Wacht op jouw stem", "Stemmen open", status labels in yellow, upper-case section labels.

## 4. The new style everywhere
- Every pressable item is a tile with depth: tile-plain, or the Knaakie, Vakansie or Hansie colours.
- One orange main action per screen.
- No yellow, green or grey legacy status colours. Status is in the text instead.
- Section labels are normal sentence case, and the old upper-case labels go.
- This applies to: Overzicht, Reis, Samen (Taken/Keuzes/Kosten), the detail panels for a choice/task/cost, Reisinstellingen, Documenten, Profiel and the login screens.

## 5. Checks
- Screenshots of every screen at 393x706 with your trip "Zomer 2027": the page must not scroll (page height equals screen height).
- Tests for the new labels per choice/task/cost state.
- Typecheck, lint, tests and build.

## Technical details
- `BottomNav.tsx` gets a 5th button that triggers HansieWidget through the existing Hansie bus. `HansieWidget` loses its `floating` bar, and AppLayout's bottom padding goes back to the nav height only.
- New `AppScreen` primitive (h-[100dvh] grid: header / min-h-0 content / nav) used by trip pages, `/trips`, Profiel and TripSettings. Lists live in `overflow-y-auto` areas only.
- Display mapping in `src/features/together/labels.ts` (decision/task/expense to an action line), plus `ACCOMMODATION_DECISION_TITLE` keeps the stored value with a display alias. No migration or RPC change.
- `TripPageHeader`: one-line meta (short date + first part of the destination).
- Remove the activity feed from Samen.
- Update the AGENTS.md rule about the mobile Hansie entry strip: Hansie now lives in the trip bottom bar.
- Out of scope: new features, backend, Beheer.

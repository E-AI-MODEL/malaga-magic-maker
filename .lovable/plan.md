

## Plan: A. Verwijder page transitions + B. AI Reisplanner

### A. Verwijder alle motion-animaties

**Probleem**: `motion.main` in `AppLayout.tsx` veroorzaakt stuitering bij elke pagina-navigatie.

**Wijzigingen**:
- `src/components/AppLayout.tsx`: Vervang `motion.main` door gewone `<main>` tags (regel 75-82 en 107-114). Verwijder `framer-motion` import.
- `src/components/PageSkeleton.tsx`: Verwijder `PageTransition` component en `framer-motion` imports.
- `src/pages/Taken.tsx`, `src/pages/Uitslag.tsx`, `src/pages/Wensen.tsx`: Verwijder ongebruikte `PageTransition` import.

---

### B. AI Reisplanner — "Wat moeten we doen?"

Een AI-assistent die de groepsvoorkeuren (intake submissions) kent en concrete suggesties doet voor restaurants, activiteiten en dagtripjes op de Costa del Sol. Dit is de killer feature: geen enkele groepsreis-app heeft een AI die je groepsprofiel kent.

**Architectuur**:

```text
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend   │────▶│ Edge Function     │────▶│ Lovable AI      │
│  /reisplanner│    │ trip-ai-chat      │     │ (gemini-3-flash) │
│  Chat UI    │◀───│ Streams SSE       │◀───│                 │
└─────────────┘     └──────────────────┘     └─────────────────┘
                         │
                         ▼ reads
                    ┌──────────┐
                    │ Supabase │ submissions, accommodations,
                    │ DB       │ trip, profiles, tasks
                    └──────────┘
```

**1. Edge Function: `supabase/functions/trip-ai-chat/index.ts`**
- Ontvangt `{ messages, tripId }` van de client
- Haalt groepscontext op via service role key: submissions (voorkeuren, budget, dieet, activiteiten), trip info (data, locatie, groepsgrootte), accommodaties (naam + locatie van de gekozen/actieve), en taken (wat is al geregeld)
- Bouwt een rijke system prompt in het Nederlands met al deze context
- Streamt het antwoord via SSE terug (Lovable AI gateway, model `google/gemini-3-flash-preview`)
- Handelt 429/402 errors af

**2. Frontend pagina: `src/pages/Reisplanner.tsx`**
- Chat-interface met streaming responses
- Snelkeuze-chips bovenaan: "Restaurant tips", "Dagtripjes", "Activiteiten", "Avondprogramma"
- Markdown rendering van AI responses (`react-markdown` nodig als dependency)
- Glasmorphism-stijl message bubbles passend bij het design
- Responsive: op mobiel full-screen chat, op desktop in de standaard layout

**3. Navigatie toevoegen**
- `src/components/BottomNav.tsx`: Voeg "Planner" toe als 4e tab (voor "Meer"), icoon `Sparkles`
- `src/components/AppSidebar.tsx`: Voeg `/reisplanner` toe aan mainLinks
- `src/App.tsx`: Voeg route `/reisplanner` toe met lazy loading en TripGuard

**4. System prompt bevat**:
- Trip details (bestemming, data, groepsgrootte)
- Samenvatting van alle voorkeuren (budget mediaan, dieet, activiteiten, prioriteiten)
- Bekende accommodatie(s) met locatie
- Wat al geregeld is (taken met progress=100)
- Instructie: antwoord in het Nederlands, wees concreet (namen, prijzen, adressen), focus op de Costa del Sol regio

**Bestanden**:

| Bestand | Actie |
|---------|-------|
| `src/components/AppLayout.tsx` | Verwijder motion |
| `src/components/PageSkeleton.tsx` | Verwijder PageTransition |
| `src/pages/Taken.tsx` | Cleanup import |
| `src/pages/Uitslag.tsx` | Cleanup import |
| `src/pages/Wensen.tsx` | Cleanup import |
| `supabase/functions/trip-ai-chat/index.ts` | **Nieuw** — edge function |
| `src/pages/Reisplanner.tsx` | **Nieuw** — chat UI |
| `src/components/BottomNav.tsx` | Voeg Planner tab toe |
| `src/components/AppSidebar.tsx` | Voeg Planner link toe |
| `src/App.tsx` | Voeg route toe |

**Dependency**: `react-markdown` voor het renderen van AI responses.


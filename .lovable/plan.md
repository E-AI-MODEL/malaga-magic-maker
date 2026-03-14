

## Plan: Bewerkbare AI-prompt + floating AI-widget

### Deel 1 — Bewerkbare systemprompt in Admin

**Wat verandert:**
- De huidige hardcoded systemprompt in de edge function (`trip-ai-chat`) wordt verplaatst naar de database (`app_settings`, key: `ai_guide_prompt`).
- In het Admin dashboard komt een nieuw accordion-item "AI Reisgids prompt" met een groot textarea dat de volledige prompt toont — 1-op-1, geen vertaling of abstractie.
- De admin kan de prompt bewerken en opslaan. De edge function leest de prompt bij elk verzoek uit de database.
- Template-variabelen (zoals `{{group_size}}`, `{{trip_name}}`, `{{start_date}}`, `{{end_date}}`, `{{location}}`, `{{avg_budget}}`, `{{diets}}`, `{{activities}}`, `{{mobility}}`, `{{submissions_count}}`, `{{accommodations_list}}`, `{{completed_tasks}}`, `{{open_tasks}}`) worden server-side door de edge function vervangen met actuele data. De admin ziet deze variabelen als `{{...}}` in de prompt en kan ze verplaatsen/verwijderen.
- Een "Reset naar standaard"-knop herstelt de originele prompt.

**Database:**
- Nieuwe `app_settings` row: key = `ai_guide_prompt`, value = de huidige hardcoded prompt-tekst (met `{{...}}` placeholders in plaats van JS template literals).

**Edge function wijziging (`trip-ai-chat`):**
- Haalt `ai_guide_prompt` op uit `app_settings` (naast `ai_guide_location`).
- Als er geen custom prompt is, gebruikt hij een ingebouwde fallback (de huidige prompt).
- Vervangt alle `{{...}}` placeholders met de berekende waarden.

**Admin UI:**
- Nieuw accordion-item onder de bestaande "AI Reisgids locatie" sectie.
- Textarea met monospace font, volledige prompt zichtbaar.
- Toelichting welke `{{variabelen}}` beschikbaar zijn.
- Opslaan-knop + Reset-knop.

---

### Deel 2 — AI-widget op alle pagina's

**Wat verandert:**
- De chat-functionaliteit uit `Reisplanner.tsx` wordt geëxtraheerd naar een standalone `AiChatWidget` component.
- Dit component wordt als floating widget in `AppLayout.tsx` geplaatst, zodat het op elke pagina beschikbaar is.
- De `/reisplanner` pagina blijft bestaan maar gebruikt dezelfde widget (of redirect naar de widget).

**Widget design:**
- **Gesloten staat:** Een floating action button (FAB) rechtsonder (boven de BottomNav op mobiel). Icoontje + "AI" label.
- **Open staat mobiel:** Full-screen overlay (sheet van onderaf), met dezelfde chat UI: header, berichten, menu-popover, input.
- **Open staat desktop:** Panel rechtsonder (ca. 400×600px), afgeronde hoeken, schaduw.
- Gesprek blijft behouden zolang de gebruiker niet refresht (state in context of in het widget zelf).
- Het bestaande menu (MENU-categorieën), streaming, markdown-rendering en font-size controls worden 1-op-1 overgenomen.

**Bestanden:**
1. `src/components/AiChatWidget.tsx` — Bevat de FAB + chat panel/sheet. Hergebruikt de `streamChat`, `AssistantMessage`, en `MENU` logica uit Reisplanner.
2. `src/components/AppLayout.tsx` — Voegt `<AiChatWidget />` toe naast de bestaande layout.
3. `src/pages/Reisplanner.tsx` — Wordt vereenvoudigd of verwijderd; de route kan redirecten naar `/taken` met de widget open, of de pagina kan blijven als landing die de widget automatisch opent.


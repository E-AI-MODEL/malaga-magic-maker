

## Plan: Bewerk/Opslaan flow, @mentions in commentaren, en notificaties

### Samenvatting
De taakdetails worden niet meer automatisch opgeslagen maar via een expliciete "Bewerk"/"Opslaan" flow. Na opslaan ziet iedereen een gestileerde read-only weergave. Commentaren ondersteunen @mentions. Taakeigenaren krijgen een mini-notificatie bij inloggen over nieuwe reacties.

---

### 1. Database migratie

**Nieuwe tabel `notifications`:**
- `id` uuid PK
- `user_id` uuid (ontvanger)
- `from_user_id` uuid (afzender)
- `task_id` uuid nullable (referentie naar taak)
- `message` text
- `read` boolean default false
- `created_at` timestamptz

RLS: gebruiker kan alleen eigen notificaties lezen/updaten.

---

### 2. Bewerk/Opslaan flow in Taken.tsx

**Huidige situatie:** Eigenaar/backup ziet altijd de invoervelden, auto-save op blur.

**Nieuw:**
- Eigenaar/backup/admin ziet standaard de **read-only weergave** (groene/gekleurde achtergrond, nette layout met iconen)
- Een "Bewerken" knop schakelt naar edit-modus met de invoervelden
- Een "Opslaan" knop slaat op en schakelt terug naar read-only
- Voortgangsslider en foto-upload zijn ook onderdeel van de edit-modus
- State `editingTaskId` bepaalt welke taak in edit-modus staat

---

### 3. @Mentions in commentaren (SectionComments.tsx)

- Typ `@` in het invoerveld om een dropdown te tonen met alle profielnamen
- Selecteer een naam om `@Naam` in te voegen
- In de weergave worden @mentions vetgedrukt weergegeven
- Bij het plaatsen van een comment met @mention wordt een notificatie aangemaakt voor de genoemde gebruiker

---

### 4. Login-notificatie popup

- Bij laden van de Taken-pagina worden ongelezen notificaties opgehaald
- Een klein toast/popover toont "Je hebt X nieuwe reacties op je taken"
- Klik om te sluiten markeert als gelezen
- Gebruikt de bestaande `sonner` toast library

---

### 5. Bestanden die wijzigen

- **Database**: migratie voor `notifications` tabel + RLS
- **`src/pages/Taken.tsx`**: bewerk/opslaan toggle, notificatie-check bij mount
- **`src/components/SectionComments.tsx`**: @mention dropdown + notificatie insert bij comment


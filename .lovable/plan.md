

## Analyse: rechtenmodel in het huidige plan

Het bestaande rechtenmodel in de code is al drielaags:

1. **`canEditTask(task)`** (regel 155-159) — retourneert `true` voor admin, eigenaar (`assigned_to`) en backup (`backup_to`). Dit bewaakt de "Bewerken" knop, voortgang, details-editor en foto-upload.
2. **`isAdmin`** (regel 488) — bewaakt eigenaar/backup-selectie, kosten, betaald-door, cost-split en taak-verwijderen.
3. **Overige gebruikers** — zien alleen read-only content, foto's, context-link, reacties en comments.

### Antwoord op je vraag

Ja, het goedgekeurde plan houdt hier rekening mee. Bij de refactor naar een Drawer/bottom sheet wordt het als volgt:

| Functie | Wie ziet het | Waar |
|---|---|---|
| Taakdetails, foto's, voortgang-balk, context-link, reacties, comments | **Iedereen** | Hoofdkaart (altijd zichtbaar) |
| Voortgang-knoppen, details bewerken, foto upload | **Eigenaar + Backup + Admin** | Drawer (via `canEditTask`) |
| Eigenaar/backup toewijzen, kosten, betaald-door, cost-split, taak verwijderen | **Alleen Admin** | Drawer (via `isAdmin`, apart admin-blok) |
| Tandwiel-icoon om Drawer te openen | **Eigenaar + Backup + Admin** | Hoofdkaart (alleen zichtbaar als `canEditTask` true is) |

De bestaande `canEditTask` functie en `isAdmin` check worden 1-op-1 overgenomen in de Drawer. Normale gebruikers zien het tandwiel-icoon niet en kunnen de Drawer niet openen. Het RLS-beleid op de `tasks` tabel bevestigt dit ook server-side (alleen admin, owner of backup kan updaten).

### Implementatie

| Bestand | Wijziging |
|---|---|
| `src/pages/Taken.tsx` | Verplaats edit/admin blokken (regels 391-583) naar een `Drawer` component. Toon het tandwiel-icoon alleen als `canEditTask(task)`. Binnen de Drawer: bovenaan de owner/backup-controls (`canEditTask`), onderaan de admin-only sectie (`isAdmin`). |


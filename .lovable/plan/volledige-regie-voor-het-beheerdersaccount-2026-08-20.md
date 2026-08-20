# Volledige regie voor het beheerdersaccount

Vandaag is je adminrol maar half doorgevoerd: Hansie-vragen kennen al een adminuitzondering, maar het aanmaken van een reis niet — die controleert alleen Pro, dus je liep terecht tegen "één actieve reis" aan. Verder kan Beheer nu alleen lezen plus de reisstatus wijzigen. Deze build maakt de adminrol overal doorslaggevend en geeft je echte schakelaars.

## 1. Adminrechten die altijd gelden

- Reis aanmaken: adminrol slaat de gratis-limiet over (die uitzondering ontbreekt nu).
- Documentlimiet per reis: adminrol praktisch onbeperkt.
- Hansie: adminuitzondering blijft, met ruime daglimiet.
- Planstatus toont voor jou "beheerder — geen limieten" in plaats van Free.
- Elke reis openen en bewerken, ook zonder lidmaatschap.
- Pro toekennen of intrekken per gebruiker vanuit Beheer, los van betaling, met reden en audit-registratie.
- Reis of gebruiker verwijderen vanuit Beheer, met bevestiging en audit-registratie.

## 2. Platformschakelaars (Beheer > Instellingen)

Nieuw tabblad met schakelaars die direct in de hele app werken:

- Registratie open of dicht (nieuwe aanmeldingen blokkeren; bestaande gebruikers houden toegang).
- Hansie aan of uit (globaal, bijvoorbeeld bij kosten).
- Betalingen/Pro-checkout tonen of verbergen, plus de bestaande sandbox-Pro-schakelaar.
- Onderhoudsmodus: app tijdelijk dicht met nette melding; beheerders houden altijd toegang.

Elke wijziging schrijft een regel in het logboek: wie, wat, van welke waarde naar welke.

## 3. Subtiele adminbalk

Een dunne, grijze balk boven in beeld wanneer je als beheerder buiten je normale rechten kijkt of handelt — bijvoorbeeld in een reis waar je geen deelnemer van bent, of wanneer een platformschakelaar van de standaard afwijkt. Met een directe link terug naar Beheer. Onzichtbaar voor gewone gebruikers, geen invloed op de consumentenlayout.

## Technische uitvoering

Databasemigratie (nieuwe voorwaartse migratie, bestaande blijven ongemoeid):
- `create_trip_with_owner`, `reserve_trip_document` en `get_my_plan_status`: `has_role(auth.uid(),'admin')` als bypass naast `is_pro_user`.
- Nieuwe RPC's, SECURITY DEFINER met adminrolcontrole en schrijven naar `admin_audit_log`:
  `ops_set_setting`, `ops_list_settings`, `ops_grant_pro`, `ops_revoke_pro`, `ops_delete_trip`, `ops_delete_user`.
- `app_settings` uitbreiden met `signups_open`, `hansie_enabled`, `payments_enabled`, `maintenance_mode`; leesbaar voor ingelogde gebruikers, schrijven alleen via RPC.
- RLS: adminclausule toevoegen op de trip-gebonden tabellen waar die nog ontbreekt, zodat "elke reis openen en bewerken" server-side klopt (UI-checks blijven niet-autoritatief).
- `consume_hansie_quota` respecteert `hansie_enabled`, behalve voor admins.

Frontend:
- `src/features/ops/data.ts` plus een nieuwe sectie `Instellingen` in `src/pages/Ops.tsx` en `OpsShell.tsx`.
- Pro-toekenning en verwijderacties in de bestaande gebruikers- en reisdetailpanelen, met bevestigingsdialoog.
- Nieuwe hook `usePlatformSettings`; toegepast op signup (`Signup.tsx`, `Login.tsx`), Hansie-invoer, checkout (`Steun.tsx`, `ProCheckout.tsx`) en een onderhoudsscherm in `AppLayout.tsx`.
- `usePlanStatus`/`limits.ts` tonen de beheerdersstatus.
- Adminbalk als klein component in `AppLayout.tsx`, alleen bij `isAdmin`.

Kwaliteitscontrole: typecheck, lint, tests, productiebuild, mobiele controle op 390px van Beheer, en een test dat een niet-admin op elke nieuwe RPC `42501` krijgt.
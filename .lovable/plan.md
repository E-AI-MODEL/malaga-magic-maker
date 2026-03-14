

## Diagnose: Login werkt technisch, maar UI reageert niet

De login API-calls retourneren succesvol (200), maar de pagina navigeert niet door. De oorzaak zit in `src/lib/auth.tsx`:

**Het probleem:** De `AUTH_VERSION` check in het `useEffect` doet een `return` voordat de `onAuthStateChange` listener wordt opgezet. Na de forced signout is er dus geen listener actief. Wanneer de gebruiker daarna inlogt, slaagt de API-call, maar de `user` state wordt nooit bijgewerkt omdat er geen listener luistert.

```text
useEffect flow (first visit):
  AUTH_VERSION mismatch? → signOut() → return  ← STOP: listener never created
  ↓ (never reached)
  onAuthStateChange subscription
  getSession()
```

**De fix:** Herstructureer het useEffect zodat de `onAuthStateChange` listener altijd wordt opgezet, ongeacht de AUTH_VERSION check. De forced signout kan asynchroon plaatsvinden terwijl de listener al actief is -- de signout triggert dan zelf de listener met `session = null`, en de volgende login wordt correct opgepikt.

### Wijziging in `src/lib/auth.tsx`

Verplaats de `onAuthStateChange` subscription en `getSession` call naar buiten de AUTH_VERSION guard, zodat ze altijd draaien. De AUTH_VERSION check doet alleen nog de eenmalige signout zonder het effect vroegtijdig te beëindigen.


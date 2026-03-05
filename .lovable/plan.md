

## Plan: Zoom-preventie (alle browsers) + glassmorphism popups

### Probleem

Op mobiel (iOS Safari en Chrome/Android) zoomt de browser automatisch in wanneer een input met font-size < 16px focus krijgt. Dit verschuift de viewport en laat horizontaal scrollen toe. De huidige viewport meta tag mist de zoom-restricties en er is geen CSS-level bescherming.

### Aanpak

#### 1. Viewport meta tag (`index.html`)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

Dit werkt cross-browser: Safari, Chrome, Firefox, Samsung Internet.

#### 2. CSS-level bescherming (`src/index.css`)

```css
html, body {
  overflow-x: hidden;
  overscroll-behavior-x: none;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* Voorkom auto-zoom op alle mobiele browsers */
@media (max-width: 767px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}
```

`-webkit-text-size-adjust: 100%` voorkomt dat Chrome op Android tekst automatisch opschaalt. `position: fixed` op de root wrapper is niet nodig; `overflow-x: hidden` op html/body is voldoende.

#### 3. Glassmorphism styling op alle popups/dialogs

Alle bestaande `DialogContent` en `SheetContent` componenten krijgen een glassmorphism-stijl. Dit doe ik centraal in de UI-componenten zodat het overal automatisch doorwerkt:

**`src/components/ui/dialog.tsx`** -- `DialogContent`:
```
bg-background/80 backdrop-blur-xl border-white/10 shadow-2xl
```

**`src/components/ui/sheet.tsx`** -- `SheetContent`:
```
bg-background/80 backdrop-blur-xl border-white/10 shadow-2xl
```

**`src/components/ui/drawer.tsx`** -- `DrawerContent`:
```
bg-background/80 backdrop-blur-xl border-white/10
```

Dit zorgt ervoor dat alle popups (lightbox, intake popup, "Meer" menu, admin edit, disclaimers) automatisch de glassmorphism-stijl krijgen zonder per-pagina aanpassingen.

---

### Bestanden

| Bestand | Wijziging |
|---|---|
| `index.html` | viewport: `maximum-scale=1.0, user-scalable=no` |
| `src/index.css` | overflow-x, text-size-adjust, 16px inputs |
| `src/components/ui/dialog.tsx` | glassmorphism op DialogContent |
| `src/components/ui/sheet.tsx` | glassmorphism op SheetContent |
| `src/components/ui/drawer.tsx` | glassmorphism op DrawerContent |


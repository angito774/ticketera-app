# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ticketera
**Generated:** 2026-09-25 20:29:40 (curated manually from ui-ux-pro-max "Local Events & Discovery" + "Marketplace/Directory" matches — see note below)
**Category:** Events / Ticketing Marketplace (buyer-facing, no seller onboarding)
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 4/10 (Standard) | Density 5/10 (Standard)

> **Curation note:** the tool's raw aggregate query landed on a generic "Directory" palette (green/teal) and an editorial Inter/Playfair pairing. Both were swapped below for a closer domain match — the "Local Events & Discovery" color result and the user's explicit Poppins-only requirement — while keeping the tool-verified "Marketplace / Directory" page pattern, spacing, motion and accessibility checklist as-is.

---

## Global Rules

### Color Palette

> **v2 (2026-09-29, `docs/specs/tickets/purchase-flow.md`)**: the user chose to migrate from the original orange-primary palette to the indigo palette of the Claude Design mockups (Features 2–8). Indigo is the brand color; orange is reserved for purchase CTAs only.

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#4F46E5` | `--primary` | Brand, links, active nav/category, selected zone/seat |
| On Primary | `#FFFFFF` | `--primary-foreground` | |
| CTA | `#F97316` (hover `#EA580C`) | `--cta` / `--cta-hover` | Purchase CTAs only ("Comprar entradas", "Continuar", "Pagar") — `Button variant="cta"` |
| On CTA | `#18181B` | `--cta-foreground` | Verified ≥4.5:1 on `#F97316` |
| Secondary | `#F4F4F5` | `--secondary` | Neutral secondary buttons (shadcn semantics) |
| Accent | `#EEF2FF` | `--accent` | Soft highlight: selected list row, menu hover |
| On Accent | `#4338CA` | `--accent-foreground` | |
| Warning | `#FFEDD5` / `#9A3412` | `--warning` / `--warning-foreground` | "Últimas entradas" badge |
| Brand deep | `#1E1B4B` / `#E0E7FF` | `--brand-deep` / `--brand-deep-foreground` | Dark indigo panels (event detail hero) |
| Background | `#FFFFFF` | `--background` | Page background |
| Surface Warm | `#FFF7ED` | `--surface-warm` | Promo banner only |
| Foreground | `#18181B` | `--foreground` | Body text |
| Muted | `#F4F4F5` | `--muted` | Chips, subtle sections, sold-out zones, taken seats |
| Muted Foreground | `#52525B` | `--muted-foreground` | Meta text |
| Border / Input | `#E4E4E7` | `--border` / `--input` | |
| Destructive | `#DC2626` | `--destructive` | "Agotado", errors |
| Ring | `#818CF8` | `--ring` | Focus ring |
| Zone scale | `#312E81` `#4F46E5` `#818CF8` `#A5B4FC` `#C7D2FE` | `--zone-1` … `--zone-5` | Venue map zones, 1 = most expensive. Text: `--zone-foreground-strong` (white) on 1–2, `--zone-foreground-soft` (`#1E1B4B`) on 3–5 |

**Color notes:** one brand hue (indigo) + one action hue (orange, CTAs only) + zinc neutrals. Never use orange for non-purchase actions.

### Typography

- **Font:** Poppins (single family for the whole project — headings and body). Validated via `--domain google-fonts`: geometric sans, 18 static weights, Popularity Rank #8, `latin`/`latin-ext` subsets.
- **Weights used:** 400 (body), 500 (nav/labels/meta), 600 (card titles, subheadings), 700 (hero headline, section titles).
- **Mood:** modern, geometric, friendly, energetic — fits an entertainment/ticketing product without a second display font competing for attention.
- **Google Fonts:** https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
```

**Type scale:**

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-hero` | `2.5rem` → `3.5rem` (responsive) | 700 | Hero headline |
| `--text-section` | `1.5rem` → `2rem` | 700 | Section titles ("Eventos destacados", "Conciertos") |
| `--text-card-title` | `1.125rem` | 600 | Event card title |
| `--text-body` | `1rem` | 400 | Body copy |
| `--text-meta` | `0.875rem` | 500 | Date, venue, category label |
| `--text-small` | `0.75rem` | 500 | Badges, footer fine print |

### Spacing Variables

*Density: 5/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

Use shadcn/ui `Button` rather than hand-rolled CSS:

- `variant="default"` — indigo primary (`--primary`), general actions.
- `variant="cta"` — orange (`--cta`, hover `--cta-hover`), purchase flow only.
- `variant="outline"` / `"ghost"` / `"secondary"` — neutral zinc.

### Cards (event card — shadcn `Card`)

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E4E4E7;
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-sm); /* keep it light — flat/minimal, not shadow-md+ everywhere */
  transition: box-shadow 200ms ease, transform 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

### Inputs (shadcn `Input`)

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E4E4E7;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #818CF8;
  outline: none;
  box-shadow: 0 0 0 3px #818CF820;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

### Hero — Dark Gradient + Floating Search + Bento Grid (v2)

> Supersedes the original flat `--surface-warm` Hero background. Confirmed with the user against `joinnus.com` (dark gradient strip + solid white search bar) and `ticketmaster.com` (bento-style image grid). Scoped to the Hero only — `--surface-warm` stays in use for the promo/newsletter banner.

**Backdrop:** a dark, neutral navy/black gradient — deliberately **not** the primary orange — replicating the "depth" of Joinnus's top strip. Radial, anchored top-center, three stops:

```css
background: radial-gradient(ellipse at top, #1a2332 0%, #0a0e1a 45%, #000000 100%);
```

This is the only place in the product where a gradient backdrop is used; it is an intentional, scoped exception to the Flat Design "no gradients" default below (see Anti-Patterns note). Implemented as a Tailwind arbitrary-value utility directly on the Hero section — not promoted to a `globals.css` custom property, since it has a single consumer today (YAGNI). If a second page/section needs the same backdrop, promote it to `--color-hero-gradient-*` tokens at that time.

**Floating search card:** the existing search row (Input + Button, still visual-only) is wrapped in a `bg-card` panel (`--card` = `#FFFFFF` in light mode — no new color needed) with rounded corners (`rounded-2xl`/`rounded-3xl`) and a pronounced shadow (`shadow-xl`), so it reads as a solid white element "floating" over the dark backdrop, matching Joinnus's search bar treatment.

**Bento image grid:** below the search card, a grid of image tiles (1 large "hero" tile + several smaller tiles, Ticketmaster-style), each tile:
- a `next/image` (`fill` + `sizes`, same pattern as `EventCard`) covering the tile,
- a dark gradient overlay (`bg-gradient-to-t from-black/70 via-black/10 to-transparent`) for text legibility,
- the tile's title overlaid in white, bottom-aligned.

Tile images must be distinct from the `EventCard` dataset in `events.service.ts` — different Unsplash photos, even when a tile's title references the same event universe. Collapses to a narrower column count on mobile; no horizontal scroll.

Full contract and implementation detail: `docs/specs/events/hero-redesign.md`.

---

## Style Guidelines

**Style:** Flat Design

**Keywords:** 2D, minimalist, bold colors, no shadows, clean lines, simple shapes, typography-focused, modern, icon-heavy

**Best For:** Web apps, mobile apps, cross-platform, startup MVPs, user-friendly, SaaS, dashboards, corporate

**Key Effects:** No gradients/shadows, simple hover (color/opacity shift), fast loading, clean transitions (150-200ms ease), minimal icons

> **Scoped exception:** the Hero's dark gradient backdrop and bento-tile image overlays (see Component Specs → "Hero — Dark Gradient + Floating Search + Bento Grid (v2)") intentionally use gradients, confirmed against the joinnus.com/ticketmaster.com references. Do not extend gradients to other components without the same explicit user direction.

### Page Pattern

**Pattern Name:** Marketplace / Directory (adapted: buyer-only, no seller-onboarding CTA)

- **Conversion Strategy:** Search/discovery is the primary path. For the featured-events carousel, provide previous/next and play/pause controls, full keyboard access, and a single-pointer alternative to swiping; stop auto-rotation on focus, hover, offscreen, or reduced motion and render the selected event as the static final state.
- **CTA Placement:** Hero search bar (visual-only in this phase) + "Ver entradas" per event card
- **Section Order (Ticketera landing):** Header (logo + category nav + Login/Signup placeholder) → Hero (search, visual-only) → Category quick-nav → Eventos destacados (carousel) → Conciertos (row) → Teatro y espectáculos (row) → Todos los eventos (grid) → Promo/newsletter banner → Footer

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger; Use matchMedia('(prefers-reduced-motion: reduce)') to skip non-essential motion and render the final state immediately

- ✅ Combine with from: 'center' for a bento-grid layout to draw the eye inward first
- ❌ Don't use back.out on dense data tables; the overshoot reads as sloppy on informational UI
- ⚡ Group DOM writes; avoid interleaving layout reads (getBoundingClientRect) between staggered tweens

---

## Anti-Patterns (Do NOT Use)

- ❌ No trust cues
- ❌ Text-heavy cards
- ❌ hidden filters

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

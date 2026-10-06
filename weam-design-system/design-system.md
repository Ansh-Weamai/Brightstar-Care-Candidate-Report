# Weam Design System

A single-file design spec — paste this whole document into an AI coding tool
(bolt.new, emergent, v0, Cursor, ChatGPT, Claude, etc.) as project context, or
point it at the `tokens.json` / `tokens.css` files in this folder.

## Logo

The Weam mark is `assets/logo/weam-logo.png` — a cursive wordmark with a
trailing brand-purple dot. Use it exactly as supplied: don't redraw, recolor,
stretch, or drop the dot. Give it clear space of at least the dot's height on
every side, and don't run it smaller than the point the letterforms start to
close up.

## Color

| Token | Hex | Use |
|---|---|---|
| `brand` | `#6637EC` | Primary buttons, links, active states (6.32:1 on `surface`) |
| `brand-strong` | `#493582` | Hover/pressed state of brand actions; strong headings (9.93:1 on `surface`) |
| `brand-tint` | `#E1D7FF` | Light tint for badges/highlighted panels |
| `accent` | `#5B3FD9` | Secondary interactive accent (alt CTA / link-hover) |
| `ink` | `#000000` | Primary text/icons on `surface`, `surface-alt` |
| `ink-soft` | `#111111` | Alternate near-black for large headings |
| `text-secondary` | `#505050` | Secondary/supporting text on `surface` (8.06:1) |
| `surface` | `#FFFFFF` | Default page/card background |
| `surface-alt` | `#ECECEC` | Alternate neutral surface for cards/sections |
| `surface-tint` | `#F1F6F9` | Soft alternate page background |
| `border` | `#DEE2E6` | Decorative dividers only (1.3:1) — never for focus, error or disabled states |

Dark marketing sections (hero/footer) use a small palette of their own — these
five pair together only, never mixed with the light tokens above:

| Token | Hex | Use |
|---|---|---|
| `midnight` | `#211B36` | Dark section background |
| `on-midnight` | `#F8F8FB` | Headings/body copy on `midnight` (15.54:1) |
| `on-midnight-muted` | `#9DA3A6` | Secondary text on `midnight` ONLY (6.45:1) — fails on light surfaces (2.55:1) |
| `on-midnight-accent` | `#7C66FC` | Large text (24px+), links or icon accents on `midnight` ONLY (4.05:1) |
| `highlight-gold` | `#DEC852` | Sparing accent on `midnight` (9.80:1) |
| `highlight-mauve` | `#CCB4C4` | Sparing accent on `midnight` (8.55:1) |

## Type

**No brand typeface was supplied**, so `sans` is a temporary system-font stack
(`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
sans-serif`). Swap it for Weam's real font the moment you have the name or
files — every style below rides the same `sans` family.

| Style | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display` | 56px | 1.05 | 700 | Hero/marketing headlines |
| `h1` | 36px | 1.15 | 700 | Page titles |
| `h2` | 24px | 1.25 | 600 | Section headings |
| `body` | 16px | 1.5 | 400 | Default body copy (`ink` on `surface`) |
| `caption` | 13px | 1.4 | 500 | Labels, metadata (`text-secondary`) |

## Spacing

Standard default scale (none was supplied in the source files — replace with
real values if you have them): `space-1` 4px, `space-2` 8px, `space-3` 12px,
`space-4` 16px, `space-5` 24px, `space-6` 32px.

## Radius

`radius-sm` 4px (inputs, chips) · `radius-md` 8px (buttons, cards) ·
`radius-lg` 16px (large surfaces, modals) — also a standard default, flagged
the same way.

## Iconography

No icon set was supplied. Until one is, keep icons as simple line marks in
`ink` (or `on-midnight` on dark grounds), sized to the type scale.

## Files in this folder

- `tokens.json` — the structured source of truth (colors, type, spacing, radius)
- `tokens.css` — the same tokens as CSS custom properties + utility classes
- `tailwind.config.js` — the tokens mapped into a Tailwind theme extension
- `assets/logo/weam-logo.png` — the logo file
- `README.md` — quick-start notes for using this folder

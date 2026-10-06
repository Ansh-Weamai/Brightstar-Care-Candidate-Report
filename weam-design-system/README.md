# Weam Design System — portable package

Everything here is built from Weam's real brand files (the color CSS and the
logo) — nothing invented except type, spacing and radius, which weren't in
the source and are clearly flagged as placeholders below.

## Quick start by tool

- **bolt.new / emergent / v0 / similar AI builders:** upload this whole folder
  (or drag it into the project), then reference `design-system.md` in your
  prompt — e.g. "use the design system in design-system.md for all colors,
  type and spacing." If the tool scaffolds Tailwind, also drop in
  `tailwind.config.js`.
- **ChatGPT / Claude / another LLM chat:** paste the contents of
  `design-system.md` directly into the conversation as context.
- **A codebase:** import `tokens.css` for CSS custom properties, or merge
  `tailwind.config.js`'s `theme.extend` into your own Tailwind config.
  `tokens.json` is the structured source if you need to generate anything else
  from it (Style Dictionary, Figma tokens, etc.).

## What's inside

```
weam-design-system/
├── README.md              — this file
├── design-system.md       — single-file spec, ideal for pasting into an LLM prompt
├── tokens.json            — structured tokens (colors, type, spacing, radius)
├── tokens.css             — CSS custom properties + type utility classes
├── tailwind.config.js     — tokens mapped to a Tailwind theme
└── assets/
    └── logo/
        ├── weam-logo.png  — the Weam wordmark, as supplied
        └── usage.md       — logo usage notes
```

## Known gaps

Weam's actual UI typeface, spacing scale and corner-radius scale weren't in
the files this was built from, so `design-system.md`, `tokens.json`,
`tokens.css` and `tailwind.config.js` all use a plain system-font stack and a
standard 4/8px spacing and radius scale as placeholders. Swap them out the
moment you have the real values — every place they're used is commented or
noted as temporary.

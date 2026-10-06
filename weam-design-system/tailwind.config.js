/**
 * Weam design tokens, mapped into a Tailwind theme extension.
 * Drop this into a project's tailwind.config.js (merge the `extend` block
 * into your own config) — handy for tools like bolt.new or emergent that
 * scaffold Tailwind + React projects.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        "ink-soft": "#111111",
        "text-secondary": "#505050",
        surface: "#FFFFFF",
        "surface-alt": "#ECECEC",
        "surface-tint": "#F1F6F9",
        border: "#DEE2E6",
        brand: "#6637EC",
        "brand-strong": "#493582",
        "brand-tint": "#E1D7FF",
        accent: "#5B3FD9",
        midnight: "#211B36",
        "on-midnight": "#F8F8FB",
        "on-midnight-muted": "#9DA3A6",
        "on-midnight-accent": "#7C66FC",
        "highlight-gold": "#DEC852",
        "highlight-mauve": "#CCB4C4",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "24px",
        6: "32px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
      },
      fontFamily: {
        // No brand typeface was supplied — temporary system-font stack.
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["56px", { lineHeight: "1.05", fontWeight: "700" }],
        h1: ["36px", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.25", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
      },
    },
  },
};

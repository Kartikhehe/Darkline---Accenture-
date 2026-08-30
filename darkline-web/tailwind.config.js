/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // Every colour resolves through a CSS variable so the theme can swap at
      // runtime without rebuilding class names.
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        card: "var(--card)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-lt": "var(--accent-lt)",
        amber: "var(--amber)",
        red: "var(--red)",
        green: "var(--green)",
        cyan: "var(--cyan)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        label: ["11px", { lineHeight: "1.4", letterSpacing: "0.08em" }],
        body: ["13px", { lineHeight: "1.5" }],
        hero: ["34px", { lineHeight: "1.1" }],
      },
      borderRadius: { card: "8px", btn: "6px" },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [],
}

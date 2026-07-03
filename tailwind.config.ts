import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        raised: "hsl(var(--raised) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / <alpha-value>)",
        stroke: "hsl(var(--stroke) / <alpha-value>)",
        "stroke-strong": "hsl(var(--stroke-strong) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        "ink-mid": "hsl(var(--ink-mid) / <alpha-value>)",
        "ink-dim": "hsl(var(--ink-dim) / <alpha-value>)",
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          soft: "hsl(var(--accent-soft) / <alpha-value>)",
        },
        gain: "hsl(var(--gain) / <alpha-value>)",
        loss: "hsl(var(--loss) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.3), 0 0 0 1px hsl(var(--stroke))",
        pop: "0 12px 40px -8px rgb(0 0 0 / 0.55), 0 0 0 1px hsl(var(--stroke-strong))",
        glow: "0 0 24px -4px hsl(var(--accent) / 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.35s ease-out both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

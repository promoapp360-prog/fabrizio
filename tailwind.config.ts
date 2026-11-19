import type { Config } from "tailwindcss";
// Palette ricavata dal Brandguide Vecciarì: nero profondo, oro (gradiente), bianco.
// I valori sono CSS variables: l'admin li modifica da Impostazioni > Aspetto.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        coal: "rgb(var(--c-coal) / <alpha-value>)",
        gold: "rgb(var(--c-gold) / <alpha-value>)",
        "gold-deep": "rgb(var(--c-gold-deep) / <alpha-value>)",
        cream: "rgb(var(--c-cream) / <alpha-value>)",
      },
      fontFamily: { display: ["Kurdis", "system-ui", "sans-serif"], body: ["Aloevera", "system-ui", "sans-serif"] },
      backgroundImage: { "gold-grad": "linear-gradient(135deg,#F6E27A 0%,#E9C23A 40%,#C9961E 100%)" },
    },
  },
  plugins: [],
} satisfies Config;

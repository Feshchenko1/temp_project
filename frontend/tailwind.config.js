import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#3b82f6",     /* Electric Blue */
          "primary-content": "#ffffff",
          "secondary": "#a855f7",
          "accent": "#22d3ee",
          "neutral": "#2a323c",
          "base-100": "#121212",    /* Deep Charcoal */
          "base-200": "#1e1e1e",    /* Secondary Charcoal */
          "base-300": "#2d2d2d",    /* Teriary Charcoal */
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
        light: {
          "primary": "#3b82f6",     /* Electric Blue */
          "primary-content": "#ffffff",
          "secondary": "#a855f7",
          "accent": "#22d3ee",
          "neutral": "#3d4451",
          "base-100": "#ffffff",    /* White */
          "base-200": "#f3f4f6",    /* Light Gray */
          "base-300": "#e5e7eb",    /* Gray border */
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
    ],
  },
};

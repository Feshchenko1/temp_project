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
          "primary": "#3b82f6",
          "primary-content": "#ffffff",
          "secondary": "#a855f7",
          "accent": "#22d3ee",
          "neutral": "#2a323c",
          "base-100": "#121212",
          "base-200": "#1e1e1e",
          "base-300": "#2d2d2d",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
        light: {
          "primary": "#3b82f6",
          "primary-content": "#ffffff",
          "secondary": "#a855f7",
          "accent": "#22d3ee",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "base-200": "#f3f4f6",
          "base-300": "#e5e7eb",
          "info": "#3abff8",
          "success": "#36d399",
          "warning": "#fbbd23",
          "error": "#f87272",
        },
      },
    ],
  },
};

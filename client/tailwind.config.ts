import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        noir: {
          950: "#060608",
          900: "#0a0a0c",
          850: "#0f0f14",
          800: "#121217",
          750: "#16161f",
          700: "#1a1a24",
          600: "#262635",
          500: "#3d3d52",
          400: "#717188",
          300: "#a1a1b5",
          200: "#d1d1de",
          100: "#ededf3",
        },
        blood: {
          900: "#450a0a",
          800: "#7f1d1d",
          700: "#991b1b",
          600: "#b91c1c",
          500: "#dc2626",
          400: "#ef4444",
          300: "#f87171",
        },
        amberGold: {
          500: "#f59e0b",
          400: "#fbbf24",
          300: "#fcd34d",
        },
        policeBlue: {
          600: "#2563eb",
          500: "#3b82f6",
          400: "#60a5fa",
        },
        doctorGreen: {
          600: "#059669",
          500: "#10b981",
          400: "#34d399",
        }
      },
      boxShadow: {
        'glow-crimson': '0 0 25px -5px rgba(220, 38, 38, 0.45)',
        'glow-crimson-lg': '0 0 40px 0px rgba(239, 68, 68, 0.5)',
        'glow-gold': '0 0 25px -5px rgba(245, 158, 11, 0.45)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.45)',
        'glow-green': '0 0 25px -5px rgba(16, 185, 129, 0.45)',
        'card-noir': '0 10px 30px -10px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'flicker': 'flicker 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
          '70%': { opacity: '0.95' },
          '85%': { opacity: '0.75' },
        }
      }
    },
  },
  plugins: [],
};

export default config;

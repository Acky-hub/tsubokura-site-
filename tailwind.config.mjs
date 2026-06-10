// tailwind.config.mjs
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          card: '#1a1a1a',
        },
        text: {
          DEFAULT: '#f5f5f5',
          sub: '#a0a0a0',
        },
        accent: '#c9a84c',
        border: '#2a2a2a',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

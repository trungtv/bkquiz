import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* =========================
           Background Layers
        ========================= */
        bg: {
          // Charcoal neutral – gần với swatch bạn gửi
          page: '#101010',
          section: '#141414',
          card: '#181818',
          cardHover: '#202020',
          // Alias cho spec `bg-bg-elevated` và `bg-bg-hover`
          elevated: '#202020',
          hover: '#202020',
        },

        /* =========================
           Text System
        ========================= */
        text: {
          heading: '#F5F6FA',
          body: '#CFD3E1',
          muted: '#9AA1B5',
          disabled: '#6B728A',
          // Alias cho spec `text-text-base`
          base: '#CFD3E1',
          // Text trên primary CTA
          onPrimary: '#05060E',
        },

        /* =========================
           Primary / Accent
           (BKquiz: CTA cam, outline charcoal)
        ========================= */
        primary: {
          DEFAULT: '#FF5A00', // Solid orange CTA
          hover: '#FF6A1A',
          active: '#E64900',
          subtle: 'rgba(255,90,0,0.14)',
        },

        accent: {
          silver: '#E6EAF2',
        },

        /* =========================
           Semantic Colors
        ========================= */
        success: '#3FD1A2',
        warning: '#F0B45A',
        danger: '#E05A6F',

        /* =========================
           Borders & Dividers
        ========================= */
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.12)',
        },
      },

      /* =========================
         Typography
      ========================= */
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '30px' }],
        '2xl': ['24px', { lineHeight: '34px' }],
        '3xl': ['30px', { lineHeight: '40px' }],
      },

      /* =========================
         Custom breakpoints (SaaS dashboard)
      ========================= */
      screens: {
        'xs': '360px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      },

      /* =========================
         Spacing (Dashboard friendly)
      ========================= */
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
        30: '7.5rem',
        // Tap target tối thiểu cho mobile
        touch: '44px',
      },

      /* =========================
         Border Radius
      ========================= */
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },

      /* =========================
         Shadows (Framer-style depth)
      ========================= */
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.03), 0 12px 24px rgba(0,0,0,0.4)',
        hover:
          '0 0 0 1px rgba(255,255,255,0.06), 0 16px 32px rgba(0,0,0,0.45)',
        focus: '0 0 0 2px rgba(91,124,250,0.6)',
      },

      /* =========================
         Transitions & Motion
      ========================= */
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      transitionDuration: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
      },
    },
  },
  plugins: [],
};
export default config;

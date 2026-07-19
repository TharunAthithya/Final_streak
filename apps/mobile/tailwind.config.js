const Colors = {
  background: '#F8F9F7',
  surface: '#FFFFFF',
  primary: '#256D4A',
  primaryPressed: '#1D5239',
  primarySoft: '#E7F2EC',
  textPrimary: '#1C211E',
  textSecondary: '#6B726D',
  textMuted: '#9AA19C',
  border: '#E6E9E6',
  streakAccent: '#F59E42',
  streakSoft: '#FFF2DF',
  error: '#D95C5C',
  missedDayNeutral: '#D8DDD9',
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

const Radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: Colors.background,
        surface: Colors.surface,
        primary: Colors.primary,
        primaryPressed: Colors.primaryPressed,
        primarySoft: Colors.primarySoft,
        textPrimary: Colors.textPrimary,
        textSecondary: Colors.textSecondary,
        textMuted: Colors.textMuted,
        border: Colors.border,
        streakAccent: Colors.streakAccent,
        streakSoft: Colors.streakSoft,
        error: Colors.error,
        missedDayNeutral: Colors.missedDayNeutral,
        premiumBg: '#12110E',
        premiumSurface: '#1E1C18',
        premiumSurfaceHover: '#2A2722',
        premiumGold: '#C5A880',
        premiumGoldMuted: '#3B352E',
        premiumTextMuted: '#8A8276',
      },
      spacing: {
        xs: `${Spacing.xs}px`,
        sm: `${Spacing.sm}px`,
        md: `${Spacing.md}px`,
        lg: `${Spacing.lg}px`,
        xl: `${Spacing.xl}px`,
        xxl: `${Spacing.xxl}px`,
      },
      borderRadius: {
        sm: `${Radii.sm}px`,
        md: `${Radii.md}px`,
        lg: `${Radii.lg}px`,
        xl: `${Radii.xl}px`,
      },
    },
  },
  plugins: [],
}


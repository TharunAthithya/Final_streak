export const Colors = {
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
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Typography = {
  families: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
  },
  sizes: {
    displayNumber: 32,
    pageTitle: 24,
    sectionTitle: 14,
    habitName: 16,
    body: 15,
    secondary: 13,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

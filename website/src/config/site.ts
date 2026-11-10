/**
 * Single source of truth for everything you may need to change without touching components.
 * Values marked TODO are placeholders — replace them before launch.
 */
export const SITE = {
  name: 'Streak',
  tagline: 'Keep your promises. Keep your streak.',
  apk: {
    /** Point this at a GitHub Release asset to avoid host file-size limits. */
    url: 'https://github.com/TharunAthithya/Final_streak/releases/download/v1.0.0/streak.4.apk',
    version: '1.0.0',
    sizeLabel: '100 MB',
    minAndroid: 'Android 7.0+',
  },
  /** Front-end only waitlist. Leave empty to hide the form (no fake success). */
  waitlistEndpoint: '',
  links: {
    privacy: '', // TODO: needed before a Play Store listing
    contact: '', // e.g. 'mailto:you@example.com'
    instagram: '',
    x: '',
  },
} as const;

/** Screens live in /public/screens. Drop real screenshots in with the same file names. */
export const SCREENS = {
  home: { src: 'screens/home.png', alt: 'Streak Today screen: 2 of 4 promises kept, a 50% progress ring and a 6-day streak' },
  rooms: { src: 'screens/rooms.png', alt: 'Morning Runners room: 1 of 2 habits completed today' },
  lesson: { src: 'screens/lesson.png', alt: 'Before You Begin: a short morning lesson with a slide-to-begin control' },
  freeze: { src: 'screens/freeze.png', alt: 'A habit card asking to confirm a freeze for a missed day' },
  profile: { src: 'screens/profile.png', alt: 'Profile screen showing level 4 and 40 of 100 XP' },
  grid: { src: 'screens/streak-grid.png', alt: 'The Streak Grid: two weeks of kept, frozen and missed days for one habit' },
} as const;

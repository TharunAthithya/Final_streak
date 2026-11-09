/**
 * All marketing copy in one place. Items with `review: true` are drafts that must be
 * confirmed against the real app before launch (see PROGRESS.md).
 */
import { SCREENS } from './config/site';

export const MARQUEE = ['Run', 'Read', 'Meditate', 'Sleep early', 'Drink water', 'Stretch', 'Journal'];

export const STATEMENT = 'Streak is a habit app for people who keep starting over.';

export const BELIEFS = [
  { title: 'Small promises', body: 'One small promise a day is easier to keep than a big plan you abandon by Friday.' },
  { title: 'Never alone', body: 'Rooms put your habits next to your friends’ habits, so someone notices when you show up.' },
  { title: 'Progress you can see', body: 'Every kept day fills in your Streak Grid. Look back, and the steps are all there.' },
];

export const TOUR = [
  { key: 'promise', label: 'Today', title: 'One promise a day', stat: { value: 2, suffix: ' of 4 kept' }, body: 'Your Today screen shows only what you promised for today. Check habits off and watch the ring fill: 2 of 4 kept is already a day that counts.', screen: SCREENS.home },
  { key: 'streak', label: 'Streaks', title: 'Streaks that feel earned', stat: { value: 12, suffix: '-day streak' }, body: 'Keep at least half of today’s habits and the day joins your streak. Missed one? Each habit gets one freeze a week.', screen: SCREENS.freeze },
  { key: 'rooms', label: 'Rooms', title: 'Rooms with friends', stat: { value: 50, suffix: '% of the room done today' }, body: 'Share habits with a small group and see who has already shown up today.', screen: SCREENS.rooms },
  { key: 'lesson', label: 'Lessons', title: 'Start every day with a short lesson', stat: null, body: 'Before You Begin: a two-minute read on why habits slip, ending with one tiny way to start anyway.', screen: SCREENS.lesson },
];

/** Demo content only — shown with a visible "example" note. */
export const PINGS = [
  { name: 'Priya', habit: 'Morning run', color: '#8FB59A' },
  { name: 'Rahul', habit: 'Stretch 10 min', color: '#E3C28D' },
  { name: 'Meera', habit: 'Morning run', color: '#C9B6E8' },
];

export const PRINCIPLES = [
  { title: 'Tiny by design', body: 'One small promise a day.', review: true },
  { title: 'Never alone', body: 'Rooms keep you accountable together.', review: true },
  { title: 'Progress you can see', body: 'The Streak Grid and the streak flame.', review: true },
  { title: 'Starts your day right', body: 'A short lesson before you begin.', review: true },
  { title: 'Made for people who keep starting over', body: 'No shame, just the next step.', review: true },
];

export const GALLERY = [
  { label: 'Today', screen: SCREENS.home },
  { label: 'Morning lesson', screen: SCREENS.lesson },
  { label: 'Rooms', screen: SCREENS.rooms },
  { label: 'Freeze a missed day', screen: SCREENS.freeze },
  { label: 'Levels', screen: SCREENS.profile },
];

export const FAQ = [
  { q: 'Is it free?', a: 'Yes, Streak is free to download.', review: true },
  { q: 'Is it safe to install an APK?', a: 'Android shows a warning for any app installed outside the Play Store. Only download Streak from this site, and Android will ask you once to allow installs from your browser.', review: true },
  { q: 'Why isn’t it on the Play Store?', a: 'This is Streak’s first release, so it’s shared directly for now.', review: true },
  { q: 'When is iPhone coming?', a: 'It’s in development. There’s no release date yet.', review: false },
  { q: 'How do rooms work?', a: 'Create a room, invite friends by @username or a 6-character code, and choose which habits the room tracks. Everyone sees who has completed them today.', review: false },
  { q: 'Can I use it without friends?', a: 'Yes. Habits, streaks, freezes and the daily lesson all work on your own.', review: false },
];

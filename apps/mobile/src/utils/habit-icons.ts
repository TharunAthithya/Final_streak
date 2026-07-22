// Keyword dictionary for automatic per-habit smart icon resolution
export const HABIT_KEYWORD_MAP: Record<string, string> = {
  read: 'book-open-variant',
  book: 'book-open-variant',
  novel: 'book-open-variant',
  water: 'water',
  hydrate: 'water',
  drink: 'water',
  code: 'code-tags',
  program: 'code-tags',
  dsa: 'code-tags',
  leetcode: 'code-tags',
  walk: 'run',
  run: 'run',
  jog: 'run',
  gym: 'run',
  workout: 'run',
  exercise: 'run',
  meditate: 'meditation',
  mindful: 'meditation',
  breathe: 'meditation',
  sleep: 'moon-waning-crescent',
  bed: 'moon-waning-crescent',
  journal: 'notebook-outline',
  write: 'notebook-outline',
  diary: 'notebook-outline',
  study: 'school-outline',
  revise: 'school-outline',
  learn: 'school-outline',
};

// Fallback icon when no keyword or override matches
export const DEFAULT_HABIT_ICON = 'checkbox-marked-circle-outline';

// Available icons for manual selection in Icon Picker
export const AVAILABLE_HABIT_ICONS = [
  { name: 'book-open-variant', label: 'Reading' },
  { name: 'water', label: 'Water' },
  { name: 'code-tags', label: 'Coding' },
  { name: 'run', label: 'Exercise' },
  { name: 'meditation', label: 'Meditation' },
  { name: 'moon-waning-crescent', label: 'Sleep' },
  { name: 'notebook-outline', label: 'Journaling' },
  { name: 'school-outline', label: 'Studying' },
  { name: 'dumbbell', label: 'Gym' },
  { name: 'heart-pulse', label: 'Health' },
  { name: 'food-apple-outline', label: 'Nutrition' },
  { name: 'cup-water', label: 'Hydration' },
  { name: 'coffee', label: 'Coffee' },
  { name: 'music-note', label: 'Music' },
  { name: 'image-outline', label: 'Art' },
  { name: 'calculator', label: 'Math' },
  { name: 'cash', label: 'Finance' },
  { name: 'briefcase-outline', label: 'Work' },
  { name: 'home-outline', label: 'Chores' },
  { name: 'checkbox-marked-circle-outline', label: 'General' },
];

/**
 * Resolves a habit icon based on priority:
 * 1. Manual override
 * 2. Predefined suggested action
 * 3. Keyword match (case-insensitive whole-word boundary matching)
 * 4. Fallback default icon
 */
export function resolveHabitIcon(
  habitName: string,
  manualOverride?: string | null,
  suggestedActionIcon?: string | null
): string {
  // 1. Manual override
  if (manualOverride && manualOverride.trim().length > 0) {
    return manualOverride;
  }

  // 2. Predefined suggested action
  if (suggestedActionIcon && suggestedActionIcon.trim().length > 0) {
    return suggestedActionIcon;
  }

  // 3. Keyword match (using word boundary split to avoid partial substring false positives)
  if (habitName) {
    const tokens = habitName.toLowerCase().split(/[^a-z0-9]+/);
    for (const token of tokens) {
      if (HABIT_KEYWORD_MAP[token]) {
        return HABIT_KEYWORD_MAP[token];
      }
    }
  }

  // 4. Fallback default
  return DEFAULT_HABIT_ICON;
}

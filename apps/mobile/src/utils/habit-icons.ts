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
export const DEFAULT_HABIT_ICON = 'target';

// Available icons for manual selection in Icon Picker
export const AVAILABLE_HABIT_ICONS = [
  // Learning & Mind
  { name: 'book-open-variant', label: 'Reading', category: 'Mind & Study' },
  { name: 'notebook-outline', label: 'Journaling', category: 'Mind & Study' },
  { name: 'school-outline', label: 'Studying', category: 'Mind & Study' },
  { name: 'brain', label: 'Brain', category: 'Mind & Study' },
  { name: 'pencil-outline', label: 'Writing', category: 'Mind & Study' },
  
  // Fitness & Health
  { name: 'dumbbell', label: 'Gym', category: 'Fitness & Health' },
  { name: 'run', label: 'Running', category: 'Fitness & Health' },
  { name: 'heart-pulse', label: 'Heart', category: 'Fitness & Health' },
  { name: 'food-apple-outline', label: 'Nutrition', category: 'Fitness & Health' },
  { name: 'water', label: 'Water', category: 'Fitness & Health' },
  { name: 'bike', label: 'Bicycle', category: 'Fitness & Health' },

  // Wellness
  { name: 'meditation', label: 'Meditation', category: 'Wellness' },
  { name: 'moon-waning-crescent', label: 'Sleep', category: 'Wellness' },
  { name: 'bed-outline', label: 'Bed', category: 'Wellness' },
  { name: 'leaf', label: 'Nature', category: 'Wellness' },
  { name: 'coffee', label: 'Coffee', category: 'Wellness' },
  { name: 'cup-water', label: 'Hydration', category: 'Wellness' },

  // Productivity
  { name: 'laptop', label: 'Laptop', category: 'Productivity' },
  { name: 'code-tags', label: 'Coding', category: 'Productivity' },
  { name: 'briefcase-outline', label: 'Work', category: 'Productivity' },
  { name: 'clock-outline', label: 'Clock', category: 'Productivity' },
  { name: 'calendar-outline', label: 'Calendar', category: 'Productivity' },
  { name: 'target', label: 'Target', category: 'Productivity' },

  // Home
  { name: 'home-outline', label: 'Home', category: 'Home & Chores' },
  { name: 'flower-outline', label: 'Plant', category: 'Home & Chores' },
  { name: 'broom', label: 'Cleaning', category: 'Home & Chores' },
  { name: 'pot-mix-outline', label: 'Cooking', category: 'Home & Chores' },

  // Creativity
  { name: 'music-note', label: 'Music', category: 'Creativity' },
  { name: 'palette-outline', label: 'Art', category: 'Creativity' },
  { name: 'camera-outline', label: 'Camera', category: 'Creativity' },
  { name: 'guitar-acoustic', label: 'Guitar', category: 'Creativity' },

  // Finance
  { name: 'wallet-outline', label: 'Wallet', category: 'Finance' },
  { name: 'calculator', label: 'Calculator', category: 'Finance' },
  { name: 'cash', label: 'Finance', category: 'Finance' },
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

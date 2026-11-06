export type OnboardingSection = 'LESSON' | 'TODAY' | 'HABIT' | 'ROOMS' | 'ROOM' | 'DONE';

/** Where a step's card is rendered. 'root' = measured card on the tab screens; others live inside a modal. */
export type OnboardingLayerId = 'root' | 'lesson' | 'habit' | 'roomCreate';

export type OnboardingScreen = 'today' | 'rooms';

/** info = Next button; action = waits for a real app event; final = completion step. */
export type StepKind = 'info' | 'action' | 'final';

export type OnboardingEvent =
  | 'LESSON_OPENED'
  | 'LESSON_CLOSED'
  | 'HABIT_SHEET_OPENED'
  | 'HABIT_NAME_ENTERED'
  | 'HABIT_ICON_SELECTED'
  | 'SCHEDULE_SELECTED'
  | 'DAYS_SELECTED'
  | 'HABIT_CREATED'
  | 'ROOMS_OPENED'
  | 'CREATE_ROOM_OPENED'
  | 'ROOM_CREATED'
  | 'ROOM_OPENED';

export interface OnboardingContext {
  hasHabits: boolean;
  roomCount: number;
  scheduleType: 'DAILY' | 'SPECIFIC_DAYS';
  createdHabit: boolean;
  createdRoomId: string | null;
}

export interface OnboardingStep {
  id: string;
  section: OnboardingSection;
  layer: OnboardingLayerId;
  screen?: OnboardingScreen;
  target?: string;
  kind: StepKind;
  event?: OnboardingEvent;
  label: string;
  title: string;
  body: string;
  instruction?: string;
  /** Copy used instead of title/body when the user already had habits (not created in the tutorial). */
  altTitle?: string;
  altBody?: string;
  skipIf?: (ctx: OnboardingContext) => boolean;
}

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type NavDirection = 'fwd' | 'back' | 'skip';

export interface PersistedOnboarding {
  currentStepId: string | null;
  history: string[];
  completedSteps: string[];
  skippedSections: OnboardingSection[];
  isCompleted: boolean;
  isDismissed: boolean;
  createdHabit: boolean;
  createdRoomId: string | null;
  startedAt?: string;
  completedAt?: string;
}

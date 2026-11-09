export type OnboardingSection = 'LESSON' | 'TODAY' | 'HABIT' | 'ROOMS' | 'ROOM';

export type StepType = 'ACTION' | 'EXPLANATION' | 'OBSERVE';

export type OnboardingCompletionEvent =
  | 'LESSON_OPENED'
  | 'LESSON_STARTED'
  | 'LESSON_COMPLETED'
  | 'LESSON_CLOSED'
  | 'HABIT_SHEET_OPENED'
  | 'HABIT_NAME_ENTERED'
  | 'HABIT_ICON_SELECTED'
  | 'SCHEDULE_SELECTED'
  | 'SPECIFIC_DAYS_SELECTED'
  | 'HABIT_CREATED'
  | 'ROOMS_OPENED'
  | 'CREATE_ROOM_OPENED'
  | 'JOIN_ROOM_OPENED'
  | 'ROOM_CREATED'
  | 'ROOM_OPENED'
  | 'NEXT_EXPLANATION';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface TargetRegistration {
  id: string;
  rect: TargetRect;
  modalLayer?: string;
}

export interface OnboardingStep {
  id: string;
  section: OnboardingSection;
  targetId?: string;
  modalLayer?: string;
  route?: string;
  title: string;
  description: string;
  stepType: StepType;
  completionEvent?: OnboardingCompletionEvent;
  canSkipSection?: boolean;
  isOptional?: boolean;
  isConditional?: boolean;
  actionInstruction?: string;
  actionText?: string;
  hintText?: string;
}

export interface OnboardingState {
  userId: string | null;
  currentStepId: string | null;
  currentSection: OnboardingSection | null;
  isActive: boolean;
  isCompleted: boolean;
  isDismissed: boolean;
  startedAt?: string;
  completedAt?: string;
  skippedSections: OnboardingSection[];
  stepHistory: string[];
  targets: Record<string, TargetRegistration>;
  activeModalLayer: string | null;
  
  startForUser: (userId: string, hasHabits?: boolean, hasRooms?: boolean) => Promise<void>;
  loadForUser: (userId: string) => Promise<void>;
  clearSession: () => void;
  replay: (userId?: string) => Promise<void>;
  setNavigator: (nav: ((route: string) => void) | null) => void;
  setConditionalFlag: (stepId: string, enabled: boolean) => void;
  conditionalFlags: Record<string, boolean>;
  completeEvent: (event: OnboardingCompletionEvent) => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  goToStep: (stepId: string) => Promise<void>;
  skipSection: () => Promise<void>;
  exit: () => Promise<void>;
  complete: () => Promise<void>;
  resetForUser: (userId: string) => Promise<void>;
  registerTarget: (registration: TargetRegistration) => void;
  unregisterTarget: (id: string) => void;
  setActiveModalLayer: (layer: string | null) => void;
}

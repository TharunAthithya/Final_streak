import { create } from 'zustand';

export type ScreenName =
  | 'SPLASH'
  | 'WELCOME'
  | 'SIGNIN'
  | 'SIGNUP'
  | 'FORGOT'
  | 'ONBOARDING'
  | 'MAIN'
  | 'HABIT_DETAIL'
  | 'HABIT_CREATE'
  | 'ROOM_DETAIL'
  | 'ROOM_CREATE'
  | 'ROOM_JOIN'
  | 'SETTINGS';

export type TabName = 'TODAY' | 'ROOMS' | 'ACTIVITY' | 'YOU';

interface NavigationState {
  currentScreen: ScreenName;
  currentTab: TabName;
  params: any;
  historyStack: Array<{ screen: ScreenName; params: any }>;
  navigate: (screen: ScreenName, params?: any) => void;
  setTab: (tab: TabName) => void;
  goBack: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentScreen: 'SPLASH',
  currentTab: 'TODAY',
  params: {},
  historyStack: [],

  navigate: (screen, params = {}) => {
    const stack = [...get().historyStack];
    // Don't add auth screens to backstack once logged in
    if (screen !== 'SPLASH' && screen !== 'WELCOME') {
      stack.push({ screen: get().currentScreen, params: get().params });
    }
    set({ currentScreen: screen, params, historyStack: stack });
  },

  setTab: (tab) => {
    set({ currentScreen: 'MAIN', currentTab: tab, params: {} });
  },

  goBack: () => {
    const stack = [...get().historyStack];
    if (stack.length > 0) {
      const prev = stack.pop();
      set({ currentScreen: prev?.screen || 'MAIN', params: prev?.params || {}, historyStack: stack });
    } else {
      set({ currentScreen: 'MAIN' });
    }
  },
}));

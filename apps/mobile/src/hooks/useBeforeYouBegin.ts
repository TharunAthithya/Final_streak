import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useReflectionStore } from '../store/reflection-store';
import NetInfo from '@react-native-community/netinfo';

const PROMPTS = [
  'Why is today important?',
  'What kind of person are you becoming?',
  'What would make today a successful day?',
  'Which habit matters most today?',
  'What promise are you keeping today?',
];

function getLocalDateString(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function useBeforeYouBegin() {
  const { apiClient } = useAuthStore();
  const {
    reflections,
    drafts,
    fetchReflection,
    submitReflection,
    saveDraft,
    loadDrafts,
    syncPendingReflections,
  } = useReflectionStore();

  const [isOffline, setIsOffline] = useState(false);
  const [localDate, setLocalDate] = useState(getLocalDateString());

  // Pick prompt deterministically based on day of month
  const dayOfMonth = parseInt(localDate.split('-')[2], 10) || new Date().getDate();
  const currentPrompt = PROMPTS[dayOfMonth % PROMPTS.length];

  // Refresh local date string
  const refreshDate = () => {
    const freshDate = getLocalDateString();
    if (freshDate !== localDate) {
      setLocalDate(freshDate);
    }
  };

  useEffect(() => {
    // 1. Load drafts from storage
    loadDrafts();

    // 2. Fetch today's reflection if available
    fetchReflection(apiClient, localDate);

    // 3. Sync if connection resumes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOffline(!online);
      if (online) {
        syncPendingReflections(apiClient).then(() => {
          fetchReflection(apiClient, localDate);
        });
      }
    });

    return () => unsubscribe();
  }, [localDate]);

  const reflection = reflections[localDate] || null;
  const hasCompletedToday = !!reflection;
  const draftText = drafts[localDate] || '';

  const saveDraftText = async (text: string) => {
    await saveDraft(localDate, text);
  };

  const completeRitual = async (textResponse?: string) => {
    const netState = await NetInfo.fetch();
    const online = !!netState.isConnected && !!netState.isInternetReachable;
    
    await submitReflection(
      apiClient,
      localDate,
      currentPrompt,
      textResponse || draftText,
      !online
    );
  };

  return {
    hasCompletedToday,
    reflection,
    draftText,
    saveDraftText,
    completeRitual,
    currentPrompt,
    refreshDate,
  };
}

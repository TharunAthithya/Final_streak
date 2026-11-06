import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle, LayoutChangeEvent, GestureResponderHandlers } from 'react-native';
import { OnboardingStep } from './onboarding-types';
import { ONBOARDING_STEPS } from './onboarding-constants';
import { OnboardingExitModal } from './OnboardingExitModal';
import { Icon } from '../components/ui/Icon';
import { useOnboardingStore } from '../store/onboarding-store';

interface OnboardingCoachmarkProps {
  step: OnboardingStep;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  /** When provided, a drag handle is shown so the user can move the card out of the way. */
  dragHandlers?: GestureResponderHandlers;
}

/** Contextual tutorial card. Presentational; positioning is handled by its container. */
export const OnboardingCoachmark: React.FC<OnboardingCoachmarkProps> = ({ step, style, onLayout, dragHandlers }) => {
  const [exitOpen, setExitOpen] = useState(false);

  const ctx = useOnboardingStore((s) => s.ctx);
  const canGoBack = useOnboardingStore((s) => s.history.length > 0);
  const isDone = useOnboardingStore((s) => s.completedSteps.includes(step.id));
  const next = useOnboardingStore((s) => s.next);
  const previous = useOnboardingStore((s) => s.previous);
  const skipSection = useOnboardingStore((s) => s.skipSection);
  const exitTutorial = useOnboardingStore((s) => s.exitTutorial);

  const { position, total } = useMemo(() => {
    const visible = ONBOARDING_STEPS.filter((s) => s.id === step.id || !s.skipIf || !s.skipIf(ctx));
    return { position: visible.findIndex((s) => s.id === step.id) + 1, total: visible.length };
  }, [ctx, step.id]);

  const useAlt = ctx.hasHabits && !ctx.createdHabit && !!step.altTitle;
  const title = useAlt ? (step.altTitle as string) : step.title;
  const body = useAlt ? (step.altBody as string) : step.body;

  const isFinal = step.kind === 'final';
  const waitingForAction = step.kind === 'action' && !isDone;
  const showNext = step.kind === 'info' || (step.kind === 'action' && isDone);

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: '#241E1A',
          borderColor: '#E8C08A',
          borderWidth: 1.5,
          borderRadius: 18,
          paddingHorizontal: 16,
          paddingVertical: 14,
          elevation: 14,
          shadowColor: '#E8C08A',
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {dragHandlers ? (
        <View {...dragHandlers} style={{ alignItems: 'center', paddingBottom: 8, marginTop: -6 }} hitSlop={{ top: 10, bottom: 6, left: 40, right: 40 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#65605A' }} />
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-[10px] font-bold text-[#8C6B3F] uppercase tracking-widest flex-1 pr-2" numberOfLines={1}>
          {step.label}
        </Text>
        {!isFinal && (
          <TouchableOpacity
            onPress={() => setExitOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-6 h-6 rounded-full bg-[#241E1A] border border-[#2B2521] items-center justify-center"
          >
            <Icon name="close" size={12} color="#9C958C" />
          </TouchableOpacity>
        )}
      </View>

      <Text className="text-lg text-[#F5F2EC] mb-1" style={{ fontFamily: 'Baloo 2', lineHeight: 24 }}>
        {title}
      </Text>
      <Text className="text-[13px] text-[#9C958C] leading-[19px]">{body}</Text>

      {step.instruction && waitingForAction && (
        <View className="mt-3 bg-[#3A2E1F] rounded-xl px-3 py-2">
          <Text className="text-xs font-semibold text-[#E8C08A]">{step.instruction}</Text>
        </View>
      )}
      {step.kind === 'action' && isDone && (
        <View className="mt-3 bg-[#221C16] rounded-xl px-3 py-2">
          <Text className="text-xs font-semibold text-[#9C958C]">Already done — nothing to repeat here.</Text>
        </View>
      )}

      <View className="flex-row items-center justify-between mt-3.5">
        <View style={{ minWidth: 72 }}>
          {canGoBack && !isFinal ? (
            <TouchableOpacity onPress={previous} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-xs font-semibold text-[#9C958C]">Previous</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!isFinal && <Text className="text-[11px] text-[#65605A]">{`${position} / ${total}`}</Text>}

        <View style={{ minWidth: 72, alignItems: 'flex-end' }}>
          {isFinal ? (
            <TouchableOpacity onPress={next} className="bg-[#E8C08A] px-4 py-2 rounded-xl">
              <Text className="text-xs font-bold text-[#241C14]">{step.instruction || 'Finish'}</Text>
            </TouchableOpacity>
          ) : showNext ? (
            <TouchableOpacity onPress={next} className="bg-[#E8C08A] px-4 py-2 rounded-xl">
              <Text className="text-xs font-bold text-[#241C14]">Next</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <OnboardingExitModal
        visible={exitOpen}
        onContinue={() => setExitOpen(false)}
        onSkipSection={() => {
          setExitOpen(false);
          skipSection();
        }}
        onExit={() => {
          setExitOpen(false);
          exitTutorial();
        }}
      />
    </View>
  );
};

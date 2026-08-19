import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { OnboardingStep } from './onboarding-types';
import { Icon } from '../components/ui/Icon';
import { useOnboardingStore } from '../store/onboarding-store';

interface OnboardingCoachmarkProps {
  step: OnboardingStep;
  onNext: () => void;
  onPrevious: () => void;
  onRequestExit: () => void;
  style?: StyleProp<ViewStyle>;
}

export const OnboardingCoachmark: React.FC<OnboardingCoachmarkProps> = ({
  step,
  onNext,
  onPrevious,
  onRequestExit,
  style,
}) => {
  const stepHistory = useOnboardingStore((s) => s.stepHistory);
  const canGoPrevious = stepHistory.length > 0;

  const isActionStep = step.stepType === 'ACTION';
  const isObserveOrExplain = step.stepType === 'EXPLANATION' || step.stepType === 'OBSERVE';

  return (
    <View
      style={[
        {
          backgroundColor: '#181513',
          borderColor: '#2B2521',
          borderWidth: 1,
          borderRadius: 18,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 12,
        },
        style,
      ]}
      className="w-full max-w-sm"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[10px] font-bold text-[#8C6B3F] uppercase tracking-widest">
          {step.section} TUTORIAL
        </Text>
        <TouchableOpacity
          onPress={onRequestExit}
          className="w-6 h-6 rounded-full bg-[#241E1A] items-center justify-center border border-[#2B2521]"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="x" size={12} color="#9C958C" />
        </TouchableOpacity>
      </View>

      <Text
        className="text-lg font-bold text-[#F5F2EC] mb-1.5"
        style={{ fontFamily: 'Baloo 2', lineHeight: 24 }}
      >
        {step.title}
      </Text>

      <Text className="text-xs text-[#9C958C] leading-relaxed mb-4">
        {step.description}
      </Text>

      <View className="flex-row items-center justify-between pt-2 border-t border-[#2B2521]/60">
        {isObserveOrExplain ? (
          <>
            {canGoPrevious ? (
              <TouchableOpacity
                onPress={onPrevious}
                className="px-3 py-1.5 rounded-xl border border-[#2B2521] bg-[#1F1A16]"
              >
                <Text className="text-xs font-semibold text-[#9C958C]">Previous</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}

            <TouchableOpacity
              onPress={onNext}
              className="bg-[#E8C08A] px-4 py-2 rounded-xl flex-row items-center shadow-sm"
            >
              <Text className="text-xs font-bold text-[#241C14]">
                {step.actionText || 'Next'}
              </Text>
            </TouchableOpacity>
          </>
        ) : isActionStep ? (
          <View className="w-full bg-[#3A2E1F]/60 border border-[#E8C08A]/30 px-3 py-2 rounded-xl flex-row items-center justify-between">
            <Text className="text-xs font-semibold text-[#E8C08A]">
              {step.actionInstruction || step.hintText || 'Perform action to continue'}
            </Text>
            <Icon name="arrow-right" size={14} color="#E8C08A" />
          </View>
        ) : null}
      </View>
    </View>
  );
};

import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

interface OnboardingExitModalProps {
  visible: boolean;
  onContinue: () => void;
  onSkipSection: () => void;
  onExit: () => void;
}

export const OnboardingExitModal: React.FC<OnboardingExitModalProps> = ({
  visible,
  onContinue,
  onSkipSection,
  onExit,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View className="flex-1 bg-black/80 items-center justify-center px-6">
        <View className="w-full max-w-sm bg-[#181513] border border-[#2B2521] p-6 rounded-2xl">
          <Text className="text-xl font-bold text-[#F5F2EC] mb-2" style={{ fontFamily: 'Baloo 2' }}>
            What would you like to do?
          </Text>
          <Text className="text-xs text-[#9C958C] leading-relaxed mb-6">
            You can continue learning, skip this topic, or explore Streak on your own.
          </Text>

          <View className="space-y-2.5">
            <TouchableOpacity
              onPress={onContinue}
              className="w-full bg-[#E8C08A] py-3 rounded-xl items-center mb-2"
            >
              <Text className="text-xs font-bold text-[#241C14]">Continue tutorial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSkipSection}
              className="w-full bg-[#241E1A] border border-[#2B2521] py-3 rounded-xl items-center mb-2"
            >
              <Text className="text-xs font-semibold text-[#F5F2EC]">Skip this section</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onExit}
              className="w-full bg-[#181513] border border-[#2B2521]/60 py-2.5 rounded-xl items-center"
            >
              <Text className="text-xs font-medium text-[#65605A]">Exit tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

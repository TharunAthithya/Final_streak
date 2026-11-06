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
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
    <View className="flex-1 bg-black/70 items-center justify-center px-6">
      <View className="w-full max-w-sm bg-[#181513] border border-[#2B2521] p-6 rounded-2xl">
        <Text className="text-xl font-bold text-[#F5F2EC] mb-2" style={{ fontFamily: 'Baloo 2' }}>
          Leaving the tutorial?
        </Text>
        <Text className="text-sm text-[#9C958C] leading-relaxed mb-6">
          You can continue where you left off, skip this section, or leave the tutorial completely.
        </Text>

        <TouchableOpacity onPress={onContinue} className="w-full bg-[#E8C08A] py-3.5 rounded-xl items-center mb-2.5">
          <Text className="text-sm font-bold text-[#241C14]">Continue Tutorial</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSkipSection}
          className="w-full bg-[#241E1A] border border-[#2B2521] py-3.5 rounded-xl items-center mb-2.5"
        >
          <Text className="text-sm font-semibold text-[#F5F2EC]">Skip This Section</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExit} className="w-full py-3 rounded-xl items-center">
          <Text className="text-sm font-medium text-[#9C958C]">Exit Tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

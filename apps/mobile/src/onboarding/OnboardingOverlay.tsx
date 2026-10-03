import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  useWindowDimensions,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { useOnboardingStore } from '../store/onboarding-store';
import { ONBOARDING_STEPS } from './onboarding-constants';
import { OnboardingCoachmark } from './OnboardingCoachmark';
import { OnboardingExitModal } from './OnboardingExitModal';
import { calculateTutorialPosition } from './onboarding-positioning';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingOverlayProps {
  modalLayer?: string;
  useNativeModal?: boolean;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  modalLayer,
  useNativeModal = true,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isActive = useOnboardingStore((s) => s.isActive);
  const currentStepId = useOnboardingStore((s) => s.currentStepId);
  const targets = useOnboardingStore((s) => s.targets);
  const next = useOnboardingStore((s) => s.next);
  const previous = useOnboardingStore((s) => s.previous);
  const skipSection = useOnboardingStore((s) => s.skipSection);
  const exit = useOnboardingStore((s) => s.exit);

  useEffect(() => {
    if (!isActive) return;
    const onBackPress = () => {
      setShowExitConfirm(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isActive]);

  if (!isActive || !currentStepId) return null;

  const currentStep = ONBOARDING_STEPS.find((s) => s.id === currentStepId);
  if (!currentStep) return null;

  const stepModalLayer = currentStep.modalLayer || null;
  const currentModalLayer = modalLayer || null;
  if (stepModalLayer !== currentModalLayer) return null;

  const targetId = currentStep.targetId;
  const targetReg = targetId ? targets[targetId] : undefined;
  const targetRect = targetReg?.rect;

  const cardSize = { width: Math.min(320, windowWidth - 32), height: 180 };
  const safeArea = {
    top: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 32),
    bottom: Math.max(insets.bottom, 40),
  };

  const pos = calculateTutorialPosition(
    targetRect,
    cardSize,
    { width: windowWidth, height: windowHeight },
    safeArea
  );

  const canvas = (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: cardSize.width,
        }}
      >
        <OnboardingCoachmark
          step={currentStep}
          onNext={next}
          onPrevious={previous}
          onRequestExit={() => setShowExitConfirm(true)}
        />
      </View>

      <OnboardingExitModal
        visible={showExitConfirm}
        onContinue={() => setShowExitConfirm(false)}
        onSkipSection={() => {
          setShowExitConfirm(false);
          skipSection();
        }}
        onExit={() => {
          setShowExitConfirm(false);
          exit();
        }}
      />
    </View>
  );

  if (useNativeModal) {
    return (
      <Modal
        visible
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setShowExitConfirm(true)}
      >
        {canvas}
      </Modal>
    );
  }

  return canvas;
};

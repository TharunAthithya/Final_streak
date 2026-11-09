import React, { useState, useEffect, useCallback } from 'react';
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

const SPOTLIGHT_PADDING = 6;
const BACKDROP_COLOR = 'rgba(8, 7, 6, 0.78)';

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  modalLayer,
  useNativeModal = false,
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

  const handleRequestExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleContinue = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  const handleSkipSection = useCallback(() => {
    setShowExitConfirm(false);
    skipSection();
  }, [skipSection]);

  const handleExit = useCallback(() => {
    setShowExitConfirm(false);
    exit();
  }, [exit]);

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

  const cardSize = { width: Math.min(320, windowWidth - 32), height: 190 };
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

  const isActionStep = currentStep.stepType === 'ACTION';

  // Compute spotlight hole coordinates with padding
  const hole = targetRect
    ? {
        x: Math.max(0, targetRect.x - SPOTLIGHT_PADDING),
        y: Math.max(0, targetRect.y - SPOTLIGHT_PADDING),
        width: Math.min(windowWidth, targetRect.width + SPOTLIGHT_PADDING * 2),
        height: Math.min(windowHeight, targetRect.height + SPOTLIGHT_PADDING * 2),
        borderRadius: (targetRect.borderRadius ?? 16) + 4,
      }
    : null;

  const canvas = (
    <View style={[StyleSheet.absoluteFill, styles.rootContainer]} pointerEvents="box-none">
      {/* Dimmed Backdrop Panels & Spotlight Cutout */}
      {hole ? (
        <>
          {/* Top panel */}
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: 0,
                left: 0,
                right: 0,
                height: hole.y,
              },
            ]}
          />
          {/* Bottom panel */}
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: hole.y + hole.height,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          {/* Left panel */}
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: hole.y,
                left: 0,
                width: hole.x,
                height: hole.height,
              },
            ]}
          />
          {/* Right panel */}
          <View
            pointerEvents="auto"
            style={[
              styles.backdropPanel,
              {
                top: hole.y,
                left: hole.x + hole.width,
                right: 0,
                height: hole.height,
              },
            ]}
          />
          {/* Spotlight Hole Ring (touch-through for ACTION steps, blocks touches for EXPLANATION/OBSERVE) */}
          <View
            pointerEvents={isActionStep ? 'none' : 'auto'}
            style={[
              styles.spotlightRing,
              {
                top: hole.y,
                left: hole.x,
                width: hole.width,
                height: hole.height,
                borderRadius: hole.borderRadius,
              },
            ]}
          />
        </>
      ) : (
        /* Full-screen dim when there is no specific target (e.g. onboarding.complete) */
        <View
          pointerEvents={isActionStep ? 'none' : 'auto'}
          style={[StyleSheet.absoluteFill, styles.backdropPanel]}
        />
      )}

      {/* Coachmark Card */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: cardSize.width,
          zIndex: 10,
        }}
      >
        <OnboardingCoachmark
          step={currentStep}
          onNext={next}
          onPrevious={previous}
          onRequestExit={handleRequestExit}
        />
      </View>

      <OnboardingExitModal
        visible={showExitConfirm}
        onContinue={handleContinue}
        onSkipSection={handleSkipSection}
        onExit={handleExit}
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
        onRequestClose={handleRequestExit}
      >
        {canvas}
      </Modal>
    );
  }

  return canvas;
};

const styles = StyleSheet.create({
  rootContainer: {
    zIndex: 9999,
    elevation: 9999,
  },
  backdropPanel: {
    position: 'absolute',
    backgroundColor: BACKDROP_COLOR,
  },
  spotlightRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#E8C08A',
  },
});

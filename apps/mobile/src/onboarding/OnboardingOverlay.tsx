import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, LayoutChangeEvent, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth-store';
import { useCurrentStep, useOnboardingStore } from '../store/onboarding-store';
import { OnboardingLayerId, TargetRect } from './onboarding-types';
import { TAB_BAR_HEIGHT } from './onboarding-constants';
import { OnboardingCoachmark } from './OnboardingCoachmark';
import { computeCardPlacement } from './onboarding-positioning';

const DEFAULT_CARD_HEIGHT = 190;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Registers a modal as open so Previous never lands in a modal that has closed. */
export function useOnboardingLayerOpen(layer: OnboardingLayerId, open: boolean) {
  const setLayerOpen = useOnboardingStore((s) => s.setLayerOpen);
  useEffect(() => {
    setLayerOpen(layer, open);
    return () => setLayerOpen(layer, false);
  }, [layer, open, setLayerOpen]);
}

/**
 * Card rendered inside a modal. 'inline' sits in the normal layout flow (it shrinks the content
 * instead of covering it); 'top' floats in the free area above a bottom sheet.
 */
export const OnboardingLayer: React.FC<{ layer: Exclude<OnboardingLayerId, 'root'>; mode: 'inline' | 'top' }> = ({
  layer,
  mode,
}) => {
  const step = useCurrentStep();
  const insets = useSafeAreaInsets();
  if (!step || step.layer !== layer) return null;

  if (mode === 'inline') {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <OnboardingCoachmark step={step} />
      </View>
    );
  }
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 50, alignItems: 'center' }}
    >
      <OnboardingCoachmark step={step} style={{ width: '100%', maxWidth: 360 }} />
    </View>
  );
};

/** Root-level host: account scoping, screen routing, and measured cards for the tab screens. */
export const OnboardingHost: React.FC = () => {
  const userId: string | null = useAuthStore((s) => s.user?.id ?? null);
  const startForUser = useOnboardingStore((s) => s.startForUser);
  const step = useCurrentStep();
  const targets = useOnboardingStore((s) => s.targets);

  const segments = useSegments();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  // The tutorial layer is the coordinate space for everything we draw. Targets are measured in window
  // coordinates, so we measure where this layer starts and subtract it (cancels status bar / notch offsets).
  const layerRef = useRef<View>(null);
  const [layer, setLayer] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const measureLayer = () => {
    layerRef.current?.measureInWindow((x, y, w, h) => {
      if (w <= 0 || h <= 0) return;
      setLayer((prev) =>
        prev && prev.x === x && prev.y === y && prev.w === w && prev.h === h ? prev : { x, y, w, h }
      );
    });
  };
  const width = layer ? layer.w : winW;
  const height = layer ? layer.h : winH;
  const originX = layer ? layer.x : 0;
  const originY = layer ? layer.y : 0;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // 0 until the card for the current step has been measured (it stays invisible until then)
  const [cardHeight, setCardHeight] = useState(0);

  // Dragging: the card can be moved out of the way; it snaps back next to its target on every step change.
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStart = useRef({ x: 0, y: 0 });
  const dragNow = useRef({ x: 0, y: 0 });
  const bounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  // Long-press (~0.35s) anywhere on the card arms dragging; normal taps and the buttons keep working.
  const armed = useRef(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressOrigin = useRef({ x: 0, y: 0 });
  const lift = useRef(new Animated.Value(1)).current;
  const clearPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const disarm = () => {
    clearPress();
    if (armed.current) {
      armed.current = false;
      Animated.spring(lift, { toValue: 1, useNativeDriver: true }).start();
    }
  };
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: () => armed.current,
      onMoveShouldSetPanResponder: () => armed.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => disarm(),
      onPanResponderTerminate: () => disarm(),
      onPanResponderGrant: () => {
        dragStart.current = { ...dragNow.current };
      },
      onPanResponderMove: (_e, g) => {
        const b = bounds.current;
        const x = clamp(dragStart.current.x + g.dx, b.minX, b.maxX);
        const y = clamp(dragStart.current.y + g.dy, b.minY, b.maxY);
        dragNow.current = { x, y };
        pan.setValue({ x, y });
      },
    })
  ).current;

  const inTabs = (segments as string[])[0] === '(tabs)';
  const currentScreen = inTabs ? (segments as string[])[1] : undefined;
  const screenRef = useRef<string | undefined>(currentScreen);
  screenRef.current = currentScreen;

  // Each account has its own state; switching accounts swaps it in memory.
  useEffect(() => {
    startForUser(userId);
  }, [userId, startForUser]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // When the step changes (Previous, skip, resume), make sure the right tab is showing.
  const stepId = step?.id;
  const stepScreen = step?.screen;

  useEffect(() => {
    dragNow.current = { x: 0, y: 0 };
    armed.current = false;
    pan.setValue({ x: 0, y: 0 });
    setCardHeight(0);
  }, [stepId, pan]);
  useEffect(() => {
    const here = screenRef.current;
    if (stepScreen && here && (here === 'today' || here === 'rooms' || here === 'profile') && here !== stepScreen) {
      router.navigate(`/(tabs)/${stepScreen}` as any);
    }
  }, [stepId, stepScreen, router]);

  if (!userId || !step || step.layer !== 'root' || !inTabs) return null;

  let target: TargetRect | undefined;
  if (step.target === 'tabRooms') {
    target = { x: width / 3, y: height - TAB_BAR_HEIGHT, width: width / 3, height: TAB_BAR_HEIGHT };
  } else if (step.target && currentScreen === step.screen) {
    const t = targets[step.target];
    if (t) target = { x: t.x - originX, y: t.y - originY, width: t.width, height: t.height };
  }

  const placement = computeCardPlacement({
    target,
    winWidth: width,
    winHeight: height,
    insetTop: Math.max(0, insets.top - originY),
    tabBarHeight: TAB_BAR_HEIGHT,
    keyboardHeight,
    cardHeight: cardHeight || DEFAULT_CARD_HEIGHT,
  });

  const measuredHeight = cardHeight || DEFAULT_CARD_HEIGHT;
  bounds.current = {
    minX: 16 - placement.left,
    maxX: width - 16 - placement.width - placement.left,
    minY: Math.max(0, insets.top - originY) + 8 - placement.top,
    maxY: height - 8 - measuredHeight - placement.top,
  };

  const outlined = target && target.width > 0 && target.height > 0 && target.y >= 0 && target.y + target.height <= height;
  const roundish = !!target && Math.abs(target.width - target.height) < 4;

  const onCardLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && Math.abs(h - cardHeight) > 1) setCardHeight(h);
  };

  return (
    <View
      ref={layerRef}
      collapsable={false}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      onLayout={measureLayer}
    >
      {outlined && target ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: target.x - 3,
            top: target.y - 3,
            width: target.width + 6,
            height: target.height + 6,
            borderRadius: roundish ? (target.width + 6) / 2 : 18,
            borderWidth: 1,
            borderColor: 'rgba(232,192,138,0.85)',
          }}
        />
      ) : null}
      <Animated.View
        key={step.id}
        style={{
          position: 'absolute',
          top: placement.top,
          left: placement.left,
          width: placement.width,
          opacity: cardHeight > 0 ? 1 : 0,
          transform: [...pan.getTranslateTransform(), { scale: lift }],
        }}
        {...panResponder.panHandlers}
        onTouchStart={(e) => {
          pressOrigin.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
          clearPress();
          pressTimer.current = setTimeout(() => {
            armed.current = true;
            Animated.spring(lift, { toValue: 1.02, useNativeDriver: true }).start();
          }, 350);
        }}
        onTouchMove={(e) => {
          if (armed.current) return;
          const dx = e.nativeEvent.pageX - pressOrigin.current.x;
          const dy = e.nativeEvent.pageY - pressOrigin.current.y;
          if (dx * dx + dy * dy > 100) clearPress();
        }}
        onTouchEnd={disarm}
        onTouchCancel={disarm}
      >
        <OnboardingCoachmark step={step} onLayout={onCardLayout} />
      </Animated.View>
    </View>
  );
};

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { ContributionState } from './ContributionDay';

interface SelectedDayInfoProps {
  dateStr?: string | null;
  state?: ContributionState | null;
}

export const SelectedDayInfo: React.FC<SelectedDayInfoProps> = ({ dateStr, state }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0.4);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [dateStr, state]);

  if (!dateStr || !state || state === 'Pad' || state === 'Future') {
    return (
      <View className="bg-[#181513] border border-[#2B2521] rounded-xl p-3 items-center justify-center my-3">
        <Text className="text-xs text-[#9C958C] font-medium">Tap any past day cell to view status</Text>
      </View>
    );
  }

  // Format YYYY-MM-DD into a human-readable date e.g. "Monday, Jul 20, 2026"
  const formatDateLabel = (str: string) => {
    const parts = str.split('-');
    if (parts.length !== 3) return str;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPillStyle = () => {
    switch (state) {
      case 'Completed':
        return {
          bg: 'bg-[#3A2E1F]',
          border: 'border-[#E8C08A]',
          text: 'text-[#E8C08A]',
          label: 'Completed',
        };
      case 'Missed':
        return {
          bg: 'bg-[#3A1F24]',
          border: 'border-[#E8899A]',
          text: 'text-[#E8899A]',
          label: 'Missed (Eligible)',
        };
      case 'MissedExpired':
        return {
          bg: 'bg-[#26181B]',
          border: 'border-[#5A383F]',
          text: 'text-[#9C958C]',
          label: 'Expired',
        };
      case 'Frozen':
        return {
          bg: 'bg-[#112A38]',
          border: 'border-[#38BDF8]',
          text: 'text-[#38BDF8]',
          label: 'Frozen',
        };
      case 'Not scheduled':
      default:
        return {
          bg: 'bg-[#181513]',
          border: 'border-[#2B2521]',
          text: 'text-[#9C958C]',
          label: 'Not scheduled',
        };
    }
  };

  const pill = getPillStyle();

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className="bg-[#181513] border border-[#2B2521] rounded-xl px-4 py-3 flex-row justify-between items-center my-3"
    >
      <Text className="text-xs font-semibold text-[#F5F2EC]">
        {formatDateLabel(dateStr)}
      </Text>
      <View className={`px-3 py-1 rounded-full border ${pill.bg} ${pill.border}`}>
        <Text className={`text-[11px] font-bold ${pill.text}`}>
          {pill.label}
        </Text>
      </View>
    </Animated.View>
  );
};

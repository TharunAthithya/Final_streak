import React from 'react';
import { View, TouchableOpacity } from 'react-native';

export type SessionStatus = 'completed' | 'freeze' | 'missed' | 'pending' | 'not_scheduled';

interface RecentSessionsStripProps {
  statuses: SessionStatus[];
  dates?: string[];
  freezableDates?: string[];
  onPressDot?: (dateStr: string) => void;
}

export const RecentSessionsStrip: React.FC<RecentSessionsStripProps> = ({
  statuses,
  dates = [],
  freezableDates = [],
  onPressDot,
}) => {
  // Ensure we have exactly 14 statuses
  const items = [...statuses];
  while (items.length < 14) {
    items.unshift('pending'); // Pad from start (older items)
  }
  const paddedItems = items.slice(-14); // Keep last 14

  // Split into 2 rows of 7
  const row1 = paddedItems.slice(0, 7);
  const row2 = paddedItems.slice(7, 14);

  const renderDot = (status: SessionStatus, cellIndex: number) => {
    let dotStyle = 'rounded-full';
    switch (status) {
      case 'completed':
        dotStyle += ' w-2.5 h-2.5 bg-[#E8C08A]';
        break;
      case 'freeze':
        dotStyle += ' w-2.5 h-2.5 bg-slate-500';
        break;
      case 'missed':
        dotStyle += ' w-2.5 h-2.5 bg-[#E8899A]';
        break;
      case 'not_scheduled':
        dotStyle += ' w-1.5 h-1.5 bg-[#221C16] border border-[#3A2E1F]';
        break;
      case 'pending':
      default:
        dotStyle += ' w-2 h-2 border border-[#65605A] bg-transparent';
        break;
    }

    const dateStr = dates[cellIndex];
    const isFreezable = dateStr && freezableDates.includes(dateStr) && onPressDot;

    if (isFreezable) {
      return (
        <TouchableOpacity
          key={cellIndex}
          onPress={() => onPressDot(dateStr)}
          className="w-6 h-6 justify-center items-center"
          activeOpacity={0.6}
        >
          <View className={dotStyle} />
        </TouchableOpacity>
      );
    }

    return (
      <View key={cellIndex} className="w-6 h-6 justify-center items-center">
        <View className={dotStyle} />
      </View>
    );
  };

  return (
    <View className="flex-col items-start">
      <View className="flex-row">
        {row1.map((status, index) => renderDot(status, index))}
      </View>
      <View className="flex-row mt-[2px]">
        {row2.map((status, index) => renderDot(status, index + 7))}
      </View>
    </View>
  );
};

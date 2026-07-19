import React from 'react';
import { View } from 'react-native';

export type SessionStatus = 'completed' | 'missed' | 'pending';

interface RecentSessionsStripProps {
  statuses: SessionStatus[];
}

export const RecentSessionsStrip: React.FC<RecentSessionsStripProps> = ({ statuses }) => {
  // Ensure we have exactly 14 statuses
  const items = [...statuses];
  while (items.length < 14) {
    items.unshift('pending'); // Pad from start (older items)
  }
  const paddedItems = items.slice(-14); // Keep last 14

  // Split into 2 rows of 7
  const row1 = paddedItems.slice(0, 7);
  const row2 = paddedItems.slice(7, 14);

  const renderDot = (status: SessionStatus, index: number) => {
    let dotStyle = 'w-2 h-2 rounded-full m-1';
    switch (status) {
      case 'completed':
        dotStyle += ' bg-premiumGold';
        break;
      case 'missed':
        dotStyle += ' border border-error bg-transparent';
        break;
      case 'pending':
      default:
        dotStyle += ' border border-premiumGoldMuted bg-transparent';
        break;
    }
    return <View key={index} className={dotStyle} />;
  };

  return (
    <View className="flex-col items-start">
      <View className="flex-row">
        {row1.map((status, index) => renderDot(status, index))}
      </View>
      <View className="flex-row">
        {row2.map((status, index) => renderDot(status, index + 7))}
      </View>
    </View>
  );
};

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
  // Get today's local date string (YYYY-MM-DD)
  const todayObj = new Date();
  const yyyy = todayObj.getFullYear();
  const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(todayObj.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

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
    const dateStr = dates[cellIndex];
    const isToday = dates && dateStr && dateStr === todayStr;
    const isFuture = dates && dateStr && dateStr > todayStr;

    if (isToday) {
      let outerBorderColor = 'border-[#65605A]';
      let innerBgColor = 'bg-transparent';
      let innerBorderColor = 'border-[#65605A]';

      if (status === 'completed') {
        outerBorderColor = 'border-[#E8C08A]';
        innerBgColor = 'bg-[#E8C08A]';
        innerBorderColor = 'border-[#E8C08A]';
      } else if (status === 'freeze') {
        outerBorderColor = 'border-[#38BDF8]';
        innerBgColor = 'bg-[#38BDF8]';
        innerBorderColor = 'border-[#38BDF8]';
      } else if (status === 'missed') {
        outerBorderColor = 'border-[#E8899A]';
        innerBgColor = 'bg-[#E8899A]';
        innerBorderColor = 'border-[#E8899A]';
      } else if (status === 'not_scheduled') {
        return (
          <View key={cellIndex} className="w-6 h-6 justify-center items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-[#221C16] border border-[#3A2E1F]" />
          </View>
        );
      }

      return (
        <View key={cellIndex} className="w-6 h-6 justify-center items-center">
          <View className={`w-4 h-4 rounded-full border ${outerBorderColor} justify-center items-center`}>
            <View className={`w-1.5 h-1.5 rounded-full ${innerBgColor} border ${innerBorderColor}`} />
          </View>
        </View>
      );
    }

    let dotStyle = 'rounded-full';
    if (isFuture) {
      dotStyle += ' w-2 h-2 bg-[#1C1816] border border-[#2B2521]';
    } else {
      switch (status) {
        case 'completed':
          dotStyle += ' w-2.5 h-2.5 bg-[#E8C08A]';
          break;
        case 'freeze':
          dotStyle += ' w-2.5 h-2.5 bg-[#38BDF8]';
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
    }

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

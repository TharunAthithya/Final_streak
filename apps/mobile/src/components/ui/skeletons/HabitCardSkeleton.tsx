import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';

export const HabitCardSkeleton: React.FC = () => {
  return (
    <View className="bg-[#181513] border border-[#2B2521] rounded-2xl p-4 mb-3 flex-col">
      <View className="flex-row items-center mb-3">
        {/* Icon placeholder */}
        <SkeletonBox width={40} height={40} borderRadius={12} className="mr-3" />
        <View className="flex-1">
          {/* Title bar */}
          <SkeletonBox width="60%" height={16} borderRadius={4} className="mb-2" />
          {/* Subtitle bar */}
          <SkeletonBox width="40%" height={12} borderRadius={4} />
        </View>
        {/* Circle status button placeholder */}
        <SkeletonBox width={28} height={28} borderRadius={14} />
      </View>
      {/* Calendar dots placeholder */}
      <View className="flex-row items-center justify-between pl-12 pt-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBox key={i} width={12} height={12} borderRadius={6} />
        ))}
      </View>
    </View>
  );
};

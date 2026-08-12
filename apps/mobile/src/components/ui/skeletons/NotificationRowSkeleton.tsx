import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';

export const NotificationRowSkeleton: React.FC = () => {
  return (
    <View className="bg-[#181513] border border-[#2B2521] p-4 rounded-2xl mb-3 flex-row items-center">
      {/* Icon circle */}
      <SkeletonBox width={36} height={36} borderRadius={18} className="mr-3" />
      <View className="flex-1">
        {/* Title */}
        <SkeletonBox width="70%" height={14} borderRadius={4} className="mb-2" />
        {/* Subtitle */}
        <SkeletonBox width="45%" height={10} borderRadius={4} />
      </View>
    </View>
  );
};

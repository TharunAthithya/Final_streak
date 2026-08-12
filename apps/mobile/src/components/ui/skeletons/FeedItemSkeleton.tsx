import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';

export const FeedItemSkeleton: React.FC = () => {
  return (
    <View className="p-3 mb-2 flex-row items-start">
      {/* Avatar */}
      <SkeletonBox width={32} height={32} borderRadius={16} className="mr-3 mt-1" />
      <View className="flex-1">
        {/* User name & timestamp */}
        <SkeletonBox width="40%" height={12} borderRadius={4} className="mb-2" />
        {/* Activity text */}
        <SkeletonBox width="85%" height={14} borderRadius={4} />
      </View>
    </View>
  );
};

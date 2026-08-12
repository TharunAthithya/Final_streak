import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';

export const RoomCardSkeleton: React.FC = () => {
  return (
    <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-4 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1 pr-4">
        {/* Room Icon */}
        <SkeletonBox width={48} height={48} borderRadius={16} className="mr-4" />
        <View className="flex-1">
          {/* Title */}
          <SkeletonBox width="55%" height={18} borderRadius={4} className="mb-2" />
          {/* Description */}
          <SkeletonBox width="80%" height={12} borderRadius={4} className="mb-2" />
          {/* Footer info */}
          <SkeletonBox width="35%" height={10} borderRadius={4} />
        </View>
      </View>
    </View>
  );
};

import React from 'react';
import { View } from 'react-native';
import { SkeletonBox } from '../SkeletonBox';

export const ProfileSkeleton: React.FC = () => {
  return (
    <View className="flex-1 px-6 pt-16 bg-[#0B0B0C]">
      {/* Header */}
      <SkeletonBox width={80} height={28} borderRadius={6} className="mb-6" />

      {/* Hero Profile Card */}
      <View className="bg-[#181513] border border-[#2B2521] p-6 rounded-3xl items-center mb-6">
        <SkeletonBox width={80} height={80} borderRadius={40} className="mb-4" />
        <SkeletonBox width={140} height={20} borderRadius={4} className="mb-2" />
        <SkeletonBox width={100} height={12} borderRadius={4} className="mb-4" />
        <SkeletonBox width="90%" height={10} borderRadius={4} />
      </View>

      {/* Stats Card */}
      <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6">
        <SkeletonBox width={100} height={14} borderRadius={4} className="mb-4" />
        <View className="flex-row justify-around">
          <SkeletonBox width={80} height={40} borderRadius={8} />
          <SkeletonBox width={80} height={40} borderRadius={8} />
        </View>
      </View>
    </View>
  );
};

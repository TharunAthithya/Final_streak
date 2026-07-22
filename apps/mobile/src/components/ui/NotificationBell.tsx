import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Icon } from './Icon';

interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-10 h-10 bg-[#181513] border border-[#2B2521] rounded-full items-center justify-center relative"
      activeOpacity={0.7}
    >
      <Icon name="bell" size={18} color="#E8C08A" />
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-[#E8C08A] min-w-[18px] h-[18px] rounded-full px-1 items-center justify-center border-2 border-[#0B0B0C]">
          <Text className="text-[10px] font-bold text-[#241C14]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'error' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  className = '',
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-primarySoft text-primary';
      case 'accent':
        return 'bg-[#FFF2DF] text-[#F59E42]';
      case 'error':
        return 'bg-[#FCDCDC] text-error';
      case 'neutral':
        return 'bg-border text-textSecondary';
      default:
        return 'bg-primary text-white';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return 'text-primary';
      case 'accent':
        return 'text-[#F59E42]';
      case 'error':
        return 'text-error';
      case 'neutral':
        return 'text-textSecondary';
      default:
        return 'text-white';
    }
  };

  return (
    <View className={`px-2.5 py-0.5 rounded-full items-center justify-center ${getStyles().split(' ')[0]} ${className}`}>
      <Text className={`text-xs font-bold ${getTextColor()}`}>
        {label}
      </Text>
    </View>
  );
};

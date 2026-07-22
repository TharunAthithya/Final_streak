import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Icon } from '../ui/Icon';

interface CompletionButtonProps {
  status: 'pending' | 'completed' | 'disabled';
  onPress: () => void;
  size?: number;
}

export const CompletionButton: React.FC<CompletionButtonProps> = ({
  status,
  onPress,
  size = 40,
}) => {
  const getStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-[#E8C08A] border border-[#E8C08A]';
      case 'disabled':
        return 'border border-[#2B2521] opacity-30';
      case 'pending':
      default:
        return 'border-[1.5px] border-[#2B2521] bg-transparent';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={status === 'disabled'}
      style={{ width: size, height: size }}
      className={`rounded-full justify-center items-center ${getStyles()}`}
    >
      {status === 'completed' && (
        <Icon name="check" size={size * 0.5} color="#241C14" />
      )}
    </TouchableOpacity>
  );
};

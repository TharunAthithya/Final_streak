import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

interface CompletionButtonProps {
  status: 'pending' | 'completed' | 'disabled';
  onPress: () => void;
  size?: number;
}

export const CompletionButton: React.FC<CompletionButtonProps> = ({
  status,
  onPress,
  size = 36,
}) => {
  const getStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-premiumGold border border-premiumGold';
      case 'disabled':
        return 'border border-premiumGoldMuted opacity-30';
      case 'pending':
      default:
        return 'border border-premiumGold bg-transparent';
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
        <Text style={{ fontSize: size * 0.5 }} className="text-premiumBg font-bold">
          ✓
        </Text>
      )}
    </TouchableOpacity>
  );
};

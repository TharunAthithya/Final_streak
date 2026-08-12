import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { DotPulse } from './DotPulse';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-primarySoft active:opacity-90';
      case 'outline':
        return 'border border-primary bg-transparent active:bg-primarySoft';
      case 'danger':
        return 'bg-error active:opacity-90';
      default:
        return 'bg-primary active:bg-primaryPressed';
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return 'text-primary font-semibold';
      case 'outline':
        return 'text-primary font-semibold';
      case 'danger':
        return 'text-white font-semibold';
      default:
        return 'text-white font-semibold';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`px-5 py-3.5 rounded-xl flex-row justify-center items-center ${getStyles()} ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <DotPulse color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#E8C08A'} size={6} />
      ) : (
        <Text className={`text-base ${getTextStyle()}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

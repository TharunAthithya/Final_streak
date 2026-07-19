import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  children: React.ReactNode;
  variant?: 'display' | 'title' | 'section' | 'habit' | 'body' | 'secondary' | 'muted';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  className?: string;
}

export const Text: React.FC<TextProps> = ({
  children,
  variant = 'body',
  weight = 'regular',
  className = '',
  ...props
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'display':
        return 'text-3xl text-textPrimary';
      case 'title':
        return 'text-2xl text-textPrimary';
      case 'section':
        return 'text-sm text-textSecondary uppercase tracking-wider';
      case 'habit':
        return 'text-base text-textPrimary font-semibold';
      case 'secondary':
        return 'text-sm text-textSecondary';
      case 'muted':
        return 'text-xs text-textMuted';
      default:
        return 'text-base text-textPrimary';
    }
  };

  const getWeightStyle = () => {
    switch (weight) {
      case 'bold':
        return 'font-bold';
      case 'semibold':
        return 'font-semibold';
      case 'medium':
        return 'font-medium';
      default:
        return 'font-normal';
    }
  };

  return (
    <RNText
      className={`${getVariantStyle()} ${getWeightStyle()} ${className}`}
      {...props}
    >
      {children}
    </RNText>
  );
};

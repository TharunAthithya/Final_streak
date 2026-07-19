import React from 'react';
import { View } from 'react-native';

interface DividerProps {
  className?: string;
  horizontal?: boolean;
}

export const Divider: React.FC<DividerProps> = ({
  className = '',
  horizontal = true,
}) => {
  return (
    <View
      className={`${horizontal ? 'h-[1px] w-full' : 'w-[1px] h-full'} bg-border ${className}`}
    />
  );
};

import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padded = true,
  ...props
}) => {
  return (
    <View
      className={`bg-surface border border-border rounded-xl shadow-sm ${padded ? 'p-md' : ''} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};

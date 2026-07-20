import React from 'react';
import { Feather } from '@expo/vector-icons';
import { cssInterop } from 'react-native-css-interop';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

// Enable NativeWind styling support on the Feather icon component
cssInterop(Feather, {
  className: {
    target: 'style',
  },
});

// Map custom icon names used throughout the app to standard Feather icon names
const iconMap: Record<string, keyof typeof Feather.glyphMap> = {
  streak: 'zap',
  fire: 'zap',
  check: 'check',
  success: 'check',
  user: 'user',
  profile: 'user',
  group: 'users',
  room: 'users',
  rooms: 'users',
  trophy: 'award',
  rank: 'award',
  settings: 'settings',
  add: 'plus',
  plus: 'plus',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  bell: 'bell',
  reminder: 'bell',
  clock: 'clock',
  calendar: 'calendar',
  repeat: 'repeat',
  book: 'book-open',
  reading: 'book-open',
  water: 'droplet',
  coding: 'code',
  walking: 'user',
  trash: 'trash-2',
  'arrow-right': 'arrow-right',
  'arrow-left': 'arrow-left',
  logout: 'log-out',
  feed: 'compass',
  activity: 'compass',
  alert: 'alert-triangle',
  info: 'info',
  freeze: 'wind',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#256D4A',
  className = '',
}) => {
  const normalizedName = name.toLowerCase();
  const featherName = iconMap[normalizedName] || 'help-circle';

  return (
    <Feather
      name={featherName}
      size={size}
      color={color}
      className={className}
    />
  );
};

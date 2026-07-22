import React from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { cssInterop } from 'react-native-css-interop';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  family?: 'feather' | 'material';
}

// Enable NativeWind styling support on icon components
cssInterop(Feather, {
  className: {
    target: 'style',
  },
});

cssInterop(MaterialCommunityIcons, {
  className: {
    target: 'style',
  },
});

// Map custom icon names used throughout the app to standard Feather icon names
const featherIconMap: Record<string, keyof typeof Feather.glyphMap> = {
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
  close: 'x',
  x: 'x',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  bell: 'bell',
  reminder: 'bell',
  clock: 'clock',
  calendar: 'calendar',
  repeat: 'repeat',
  book: 'book-open',
  trash: 'trash-2',
  'arrow-right': 'arrow-right',
  'arrow-left': 'arrow-left',
  logout: 'log-out',
  feed: 'compass',
  activity: 'compass',
  alert: 'alert-triangle',
  info: 'info',
  freeze: 'wind',
  edit: 'edit',
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#E8C08A',
  className = '',
  family,
}) => {
  const normalizedName = name.toLowerCase();

  // If explicit family is material, or if the name is not in feather map and looks like a material icon name
  const isMaterial =
    family === 'material' ||
    (!featherIconMap[normalizedName] && (name.includes('-') || name === 'water' || name === 'run' || name === 'coffee' || name === 'meditation' || name === 'cash'));

  if (isMaterial) {
    return (
      <MaterialCommunityIcons
        name={name as any}
        size={size}
        color={color}
        className={className}
      />
    );
  }

  const featherName = featherIconMap[normalizedName] || 'help-circle';
  return (
    <Feather
      name={featherName}
      size={size}
      color={color}
      className={className}
    />
  );
};

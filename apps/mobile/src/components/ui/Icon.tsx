import React from 'react';
import { Text } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

// Simple fallback Icon component mapping popular names to unicode/emoji.
// Can be replaced with lucide-react-native or expo/vector-icons during UI implementation.
export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#256D4A',
  className = '',
}) => {
  const getIconEmoji = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'streak':
      case 'fire':
        return '🔥';
      case 'check':
      case 'success':
        return '✓';
      case 'user':
      case 'profile':
        return '👤';
      case 'group':
      case 'room':
      case 'rooms':
        return '👥';
      case 'trophy':
      case 'rank':
        return '🏆';
      case 'settings':
        return '⚙️';
      case 'add':
      case 'plus':
        return '＋';
      case 'chevron-right':
        return '→';
      case 'chevron-left':
        return '←';
      case 'bell':
      case 'reminder':
        return '🔔';
      case 'clock':
        return '🕒';
      default:
        return '🌱';
    }
  };

  return (
    <Text
      style={{ fontSize: size, color }}
      className={className}
    >
      {getIconEmoji(name)}
    </Text>
  );
};

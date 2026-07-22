import React from 'react';
import { View, Text } from 'react-native';

const IDENTITY_COLORS = ['#E8C08A', '#E8899A', '#B2A4E8', '#8FBF9E'];

export function getIdentityColor(name: string): string {
  if (!name) return IDENTITY_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % IDENTITY_COLORS.length;
  return IDENTITY_COLORS[index];
}

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 28, color }) => {
  const identityColor = color || getIdentityColor(name);
  const mark = (name && name[0]) ? name[0].toUpperCase() : 'U';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${identityColor}2A`,
        borderColor: `${identityColor}66`,
        borderWidth: 1,
      }}
      className="items-center justify-center shrink-0"
    >
      <Text
        style={{
          color: identityColor,
          fontSize: size * 0.42,
        }}
        className="font-bold text-center"
      >
        {mark}
      </Text>
    </View>
  );
};

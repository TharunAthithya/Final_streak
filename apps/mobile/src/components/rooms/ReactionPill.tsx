import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { Icon } from '../ui/Icon';

export type ReactionKind = 'heart' | 'fire' | 'thumb';

interface ReactionPillProps {
  kind: ReactionKind;
  count: number;
  active: boolean;
  onToggle: () => void;
  compact?: boolean;
}

const REACTION_META: Record<ReactionKind, { icon: string; family: 'feather' | 'material'; tint: string }> = {
  heart: { icon: 'heart', family: 'material', tint: '#E8899A' },
  fire: { icon: 'fire', family: 'feather', tint: '#E8A05A' },
  thumb: { icon: 'thumb-up', family: 'material', tint: '#8FBF9E' },
};

export const ReactionPill: React.FC<ReactionPillProps> = ({
  kind,
  count,
  active,
  onToggle,
  compact = true,
}) => {
  const meta = REACTION_META[kind] || REACTION_META.heart;
  const tint = meta.tint;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      style={{
        paddingHorizontal: compact ? 8 : 12,
        paddingVertical: compact ? 4 : 6,
        backgroundColor: active ? `${tint}26` : '#201B18',
        borderColor: active ? tint : '#2B2521',
        borderWidth: 1,
        borderRadius: 999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 2,
      }}
      className="flex-row items-center space-x-1"
    >
      <Icon
        name={meta.icon}
        size={12}
        color={active ? tint : '#9C958C'}
        family={meta.family}
      />
      {count > 0 && (
        <Text
          style={{
            color: active ? '#F5F2EC' : '#9C958C',
            fontSize: 11,
          }}
          className="font-bold ml-1"
        >
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );
};

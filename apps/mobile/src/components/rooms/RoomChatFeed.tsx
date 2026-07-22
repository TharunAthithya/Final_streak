import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Avatar, getIdentityColor } from './Avatar';
import { ReactionPill, ReactionKind } from './ReactionPill';
import { Icon } from '../ui/Icon';

export interface RoomFeedItem {
  id: string;
  kind: 'origin' | 'date' | 'join' | 'msg';
  label?: string;
  name?: string;
  habit?: string;
  message?: string;
  time?: string;
  isOwn?: boolean;
  isFirstInRun?: boolean;
  isLastInRun?: boolean;
  reactions?: Record<ReactionKind, { count: number; active: boolean }>;
}

interface RoomChatFeedProps {
  items: RoomFeedItem[];
  onToggleReaction: (activityId: string, reactionKind: ReactionKind) => void;
}

export const RoomChatFeed: React.FC<RoomChatFeedProps> = ({ items, onToggleReaction }) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Auto-scroll to bottom on load/updates
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [items.length]);

  return (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1 px-4"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
    >
      {items.map((item) => {
        if (item.kind === 'origin') {
          return (
            <View key={item.id} className="flex-row items-center my-4 px-2">
              <View className="flex-1 h-[1px] bg-[#2B2521]" />
              <Text className="text-[11px] text-[#65605A] px-3 font-medium">
                🌱 {item.label || 'Room created'}
              </Text>
              <View className="flex-1 h-[1px] bg-[#2B2521]" />
            </View>
          );
        }

        if (item.kind === 'date') {
          return (
            <View key={item.id} className="items-center my-3">
              <View className="bg-[#1B1512] border border-[#2B2521] px-3.5 py-1 rounded-full">
                <Text className="text-[11px] font-bold text-[#9C958C] tracking-wide">
                  {item.label}
                </Text>
              </View>
            </View>
          );
        }

        if (item.kind === 'join') {
          return (
            <View key={item.id} className="items-center my-2">
              <View className="bg-[#181513] border border-dashed border-[#453C34] px-3.5 py-1.5 rounded-full flex-row items-center">
                <Text className="text-xs text-[#9C958C]">
                  👋 <Text className="font-semibold text-[#F5F2EC]">{item.name}</Text> joined the room{item.time ? ` · ${item.time}` : ''}
                </Text>
              </View>
            </View>
          );
        }

        // Message row (Check-in activity)
        const isOwn = item.isOwn;
        const isFirstInRun = item.isFirstInRun ?? true;
        const isLastInRun = item.isLastInRun ?? true;
        const actorName = item.name || 'Member';
        const identityColor = getIdentityColor(actorName);

        const borderRadii = {
          borderTopLeftRadius: 17,
          borderTopRightRadius: 17,
          borderBottomLeftRadius: !isOwn && isLastInRun ? 4 : 17,
          borderBottomRightRadius: isOwn && isLastInRun ? 4 : 17,
        };

        return (
          <View
            key={item.id}
            className={`flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}
            style={{ marginTop: isFirstInRun ? 12 : 4 }}
          >
            {!isOwn && (
              <View className="mr-2 justify-end w-7 pb-1">
                {isFirstInRun ? <Avatar name={actorName} size={28} /> : null}
              </View>
            )}

            <View className="max-w-[78%]" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              {isFirstInRun && !isOwn && (
                <Text
                  style={{ color: identityColor }}
                  className="text-[11.5px] font-bold ml-1 mb-1"
                >
                  {actorName}
                </Text>
              )}

              <View
                style={{
                  backgroundColor: isOwn ? '#2A2013' : '#1B1714',
                  borderColor: isOwn ? 'rgba(232, 192, 138, 0.23)' : '#2B2521',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  ...borderRadii,
                }}
              >
                <Text className="text-[13.5px] text-[#F5F2EC] leading-relaxed">
                  {!isOwn && <Text className="text-[#9C958C]">completed </Text>}
                  <Text className="font-semibold">{item.habit || item.message}</Text>
                </Text>
                <View className="flex-row items-center justify-end mt-1 space-x-1">
                  <Text style={{ color: isOwn ? '#8C6B3F' : '#65605A' }} className="text-[10px]">
                    {item.time || ''}
                  </Text>
                  {isOwn && <Icon name="check" size={12} color="#8C6B3F" />}
                </View>
              </View>

              {/* Reaction Pills under bubble */}
              {item.reactions && (
                <View
                  className="flex-row items-center space-x-1.5 z-10"
                  style={{
                    marginTop: -8,
                    paddingLeft: isOwn ? 0 : 6,
                    paddingRight: isOwn ? 6 : 0,
                  }}
                >
                  {(['heart', 'fire', 'thumb'] as ReactionKind[]).map((kind) => {
                    const rData = item.reactions![kind];
                    return (
                      <ReactionPill
                        key={kind}
                        kind={kind}
                        count={rData?.count || 0}
                        active={rData?.active || false}
                        onToggle={() => onToggleReaction(item.id, kind)}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

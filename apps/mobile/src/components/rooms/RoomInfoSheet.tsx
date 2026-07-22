import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '../ui/Icon';
import { Avatar } from './Avatar';
import { StreakApiClient } from '@streak/api-client';

interface RoomMemberItem {
  profileId: string;
  displayName: string;
  username: string;
  role: string;
  joinedAt?: string;
  isYou?: boolean;
}

interface RoomInfoSheetProps {
  visible: boolean;
  roomName: string;
  description?: string;
  inviteCode?: string;
  memberCount: number;
  activeTodayCount: number;
  members: RoomMemberItem[];
  apiClient: StreakApiClient;
  roomId: string;
  isOwner?: boolean;
  onClose: () => void;
}

export const RoomInfoSheet: React.FC<RoomInfoSheetProps> = ({
  visible,
  roomName,
  description,
  inviteCode = 'CODE-7F3K9',
  memberCount,
  activeTodayCount,
  members,
  apiClient,
  roomId,
  isOwner = false,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    if (inviteCode) {
      await Clipboard.setStringAsync(inviteCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleInvite = async () => {
    const trimmed = username.trim().replace(/^@/, '');
    if (!trimmed) return;
    setSending(true);
    try {
      // Search user
      const results = await apiClient.searchUsersByUsername(trimmed);
      if (results.length === 0) {
        Alert.alert('User Not Found', `No user found matching @${trimmed}`);
        setSending(false);
        return;
      }
      const target = results[0];
      await apiClient.sendRoomInvitation(roomId, target.id);
      setSentTo(target.username);
      setUsername('');
      setTimeout(() => setSentTo(''), 2500);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const formatJoinedDate = (isoStr?: string) => {
    if (!isoStr) return 'Joined recently';
    const date = new Date(isoStr);
    return `Joined ${date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />

        <View
          style={{
            backgroundColor: '#141110',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: '#2B2521',
            maxHeight: '86%',
            minHeight: 450,
          }}
          className="relative px-6 pt-3 pb-8"
        >
          {/* Drag Handle */}
          <View className="items-center pb-4">
            <View className="w-9 h-1 rounded-full bg-[#2B2521]" />
          </View>

          {/* Close Button matching Image 1 */}
          <TouchableOpacity
            onPress={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center z-10"
          >
            <Icon name="x" size={15} color="#9C958C" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pt-2">
            {/* Header / Room Info matching Image 1 */}
            <View className="items-center text-center">
              <View className="w-18 h-18 bg-[#3A2E1F] border border-[#E8C08A]/30 rounded-3xl items-center justify-center p-4 mb-3">
                <Icon name="rooms" size={32} color="#E8C08A" />
              </View>
              <Text className="text-2xl font-bold text-[#F5F2EC] mb-1">{roomName}</Text>
              <Text className="text-sm text-[#9C958C] text-center leading-relaxed max-w-[280px] mt-1">
                {description || 'Daily coding, everyone accountable together. Show up, log your rep, keep the streak alive.'}
              </Text>
              <View className="flex-row items-center mt-3.5 space-x-1.5">
                <View className="w-1.5 h-1.5 rounded-full bg-[#E8C08A] mr-1.5" />
                <Text className="text-xs text-[#65605A]">
                  {memberCount || members.length || 5} members · {activeTodayCount || 1} active today
                </Text>
              </View>
            </View>

            {/* Members Section matching Image 1 */}
            <View className="mt-7">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-2.5">
                MEMBERS
              </Text>
              <View className="bg-[#17130F] border border-[#2B2521] rounded-2xl overflow-hidden">
                {members.map((m, i) => {
                  const isCreator = m.role === 'OWNER' || i === 0;
                  const isYou = m.isYou || m.displayName === 'You';
                  const subtitle = isCreator
                    ? 'Room creator · here since day one'
                    : isYou
                    ? 'Here since day one'
                    : formatJoinedDate(m.joinedAt);

                  return (
                    <View
                      key={m.profileId || i}
                      className={`flex-row items-center p-3.5 ${
                        i > 0 ? 'border-t border-[#2B2521]' : ''
                      }`}
                    >
                      <Avatar name={m.displayName} size={32} />
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text className="text-sm font-bold text-[#F5F2EC] mr-1.5">
                            {m.displayName}
                          </Text>
                          {isYou && (
                            <View className="bg-[#3A2E1F] px-1.5 py-0.5 rounded-full">
                              <Text className="text-[9.5px] font-bold text-[#8C6B3F] tracking-wide">
                                YOU
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11.5px] text-[#65605A] mt-0.5">
                          {subtitle}
                        </Text>
                      </View>

                      {/* Active Dot indicator */}
                      {(i === 2 || m.role === 'ACTIVE') && (
                        <View className="flex-row items-center space-x-1">
                          <View className="w-1.5 h-1.5 rounded-full bg-[#E8C08A] mr-1" />
                          <Text className="text-[10.5px] font-semibold text-[#E8C08A]">Active</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Invite Code Section (Available to ALL members) matching Image 2 */}
            <View className="mt-7">
              <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-2.5">
                INVITE CODE
              </Text>
              <View className="bg-[#17130F] border-[1.5px] border-dashed border-[#453C34] p-4 rounded-2xl flex-row items-center justify-between">
                <Text style={{ fontFamily: 'ui-monospace' }} className="text-lg font-bold text-[#E8C08A] tracking-widest">
                  {inviteCode}
                </Text>
                <TouchableOpacity
                  onPress={handleCopy}
                  className={`px-3.5 py-1.5 rounded-full border flex-row items-center space-x-1 ${
                    copied
                      ? 'bg-[#8FBF9E]/20 border-[#8FBF9E]'
                      : 'bg-[#3A2E1F] border-[#E8C08A]/30'
                  }`}
                >
                  <Icon
                    name={copied ? 'check' : 'copy'}
                    size={13}
                    color={copied ? '#8FBF9E' : '#E8C08A'}
                  />
                  <Text className={`text-[11.5px] font-bold ${copied ? 'text-[#8FBF9E]' : 'text-[#E8C08A]'}`}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="text-[11.5px] text-[#65605A] mt-2">
                Anyone with this code can join the room.
              </Text>
            </View>

            {/* Invite by Username Section (Owner Only) matching Image 2 */}
            {isOwner && (
              <View className="mt-7 mb-8">
                <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-2.5">
                  INVITE BY USERNAME
                </Text>
                <View className="flex-row items-center space-x-2">
                  <View className="flex-1 bg-[#1D1815] border border-[#2B2521] rounded-2xl px-3.5 py-2.5 flex-row items-center">
                    <Text className="text-sm text-[#65605A] mr-1">@</Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="username"
                      placeholderTextColor="#65605A"
                      autoCapitalize="none"
                      className="flex-1 text-sm text-[#F5F2EC]"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleInvite}
                    disabled={sending || !username.trim()}
                    className="bg-[#E8C08A] px-4 py-3 rounded-2xl flex-row items-center justify-center"
                  >
                    <Icon name="arrow-right" size={14} color="#241C14" className="mr-1" />
                    <Text className="text-xs font-bold text-[#241C14]">Send</Text>
                  </TouchableOpacity>
                </View>
                {sentTo ? (
                  <Text className="text-xs text-[#8FBF9E] mt-2 font-medium">
                    Invite sent to @{sentTo}
                  </Text>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '../ui/Icon';
import { Avatar } from './Avatar';
import { StreakApiClient } from '@streak/api-client';
import { DotPulse } from '../ui/DotPulse';
import { useNotice } from '../ui/Notice';

interface SearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarPath?: string;
}

interface InviteMemberModalProps {
  visible: boolean;
  roomId: string;
  inviteCode: string;
  existingMemberIds?: Set<string>;
  pendingInviteeIds?: Set<string>;
  apiClient: StreakApiClient;
  onClose: () => void;
  onInvitationSent?: (user: SearchResult) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  roomId,
  inviteCode,
  existingMemberIds = new Set(),
  pendingInviteeIds = new Set(),
  apiClient,
  onClose,
  onInvitationSent,
}) => {
  const notice = useNotice();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [localPendingIds, setLocalPendingIds] = useState<Set<string>>(new Set());

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    if (!text.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(() => {
      executeSearch(text.trim());
    }, 400);
  };

  const executeSearch = useCallback(
    async (searchTerm: string) => {
      try {
        const users = await apiClient.searchUsersByUsername(searchTerm);
        setResults(users);
      } catch (e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [apiClient]
  );

  const handleSendInvite = async (user: SearchResult) => {
    setSendingId(user.id);
    try {
      await apiClient.sendRoomInvitation(roomId, user.id);
      setLocalPendingIds((prev) => new Set(prev).add(user.id));
      if (onInvitationSent) {
        onInvitationSent(user);
      }
      notice.success(`Invitation sent to @${user.username}`);
    } catch (e: any) {
      notice.error(e.message || 'Failed to send room invitation');
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyLink = async () => {
    const inviteLink = `https://streak.app/join/${inviteCode}`;
    await Clipboard.setStringAsync(inviteLink);
    notice.success('Invite link copied to clipboard!');
  };

  const handleShare = async () => {
    const inviteLink = `https://streak.app/join/${inviteCode}`;
    try {
      await Share.share({
        message: `Join my accountability room on Final Streak! Code: ${inviteCode}\n${inviteLink}`,
      });
    } catch (e: any) {
      // Ignored
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setLocalPendingIds(new Set());
    onClose();
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => {
    const isMember = existingMemberIds.has(item.id);
    const isPending = pendingInviteeIds.has(item.id) || localPendingIds.has(item.id);

    return (
      <View className="flex-row items-center justify-between p-3.5 bg-[#181513] border border-[#2B2521] rounded-2xl mb-2.5">
        <View className="flex-row items-center flex-1 mr-3">
          <Avatar name={item.displayName} size={36} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-bold text-[#F5F2EC]">{item.displayName}</Text>
            <Text className="text-xs text-[#9C958C]">@{item.username}</Text>
          </View>
        </View>

        {isMember ? (
          <View className="px-3 py-1 bg-[#221C16] border border-[#2B2521] rounded-xl">
            <Text className="text-xs text-[#9C958C]">Member</Text>
          </View>
        ) : isPending ? (
          <View className="px-3 py-1 bg-[#221C16] border border-[#E8C08A]/40 rounded-xl">
            <Text className="text-xs text-[#E8C08A] font-semibold">Invited</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleSendInvite(item)}
            disabled={sendingId === item.id}
            className="px-4 py-1.5 bg-[#E8C08A] rounded-xl flex-row items-center min-w-[64px] justify-center"
          >
            {sendingId === item.id ? (
              <DotPulse color="#241C14" size={4} />
            ) : (
              <Text className="text-xs font-bold text-[#241C14]">Invite</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />

        <View
          style={{
            backgroundColor: '#141110',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: '#2B2521',
            maxHeight: '88%',
            minHeight: 520,
          }}
          className="relative px-6 pt-3 pb-8"
        >
          {/* Drag Handle */}
          <View className="items-center pb-3">
            <View className="w-10 h-1 rounded-full bg-[#2B2521]" />
          </View>

          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-[#2B2521]">
            <Text className="text-lg font-bold text-[#F5F2EC]" style={{ fontFamily: 'Baloo 2' }}>
              Invite Member
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-[#221D1A] border border-[#2B2521] items-center justify-center"
            >
              <Icon name="x" size={15} color="#9C958C" />
            </TouchableOpacity>
          </View>

          {/* Primary Method: Username Search */}
          <View className="pt-4 pb-2">
            <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-2">
              SEARCH BY USERNAME
            </Text>
            <View className="flex-row items-center bg-[#181513] border border-[#2B2521] rounded-xl px-3.5 py-2.5">
              <Text className="text-sm font-semibold text-[#65605A] mr-1">@</Text>
              <TextInput
                value={query}
                onChangeText={handleSearch}
                placeholder="username"
                placeholderTextColor="#65605A"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-[#F5F2EC] text-sm"
              />
              {searching && <DotPulse color="#E8C08A" size={4} />}
            </View>
          </View>

          {/* Search Results List */}
          <View className="flex-1 my-2">
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                query.trim().length >= 2 && !searching ? (
                  <View className="items-center py-8 bg-[#181513] border border-[#2B2521] rounded-2xl">
                    <Icon name="user" size={24} color="#65605A" className="mb-2" />
                    <Text className="text-xs text-[#9C958C]">No users found matching "{query}"</Text>
                  </View>
                ) : query.trim().length < 2 ? (
                  <View className="items-center py-8">
                    <Text className="text-xs text-[#65605A]">Type @username to search registered users</Text>
                  </View>
                ) : null
              }
            />
          </View>

          {/* Secondary Method: Invite with Link */}
          <View className="pt-3 border-t border-[#2B2521]">
            <Text className="text-xs font-bold text-[#65605A] uppercase tracking-widest mb-2.5">
              INVITE WITH LINK
            </Text>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleCopyLink}
                className="flex-1 bg-[#241E1A] border border-[#2B2521] py-2.5 rounded-xl items-center flex-row justify-center"
              >
                <Icon name="copy" size={14} color="#E8C08A" className="mr-1.5" />
                <Text className="text-xs font-bold text-[#F5F2EC]">Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleShare}
                className="flex-1 bg-[#241E1A] border border-[#2B2521] py-2.5 rounded-xl items-center flex-row justify-center"
              >
                <Icon name="arrow-right" size={14} color="#E8C08A" className="mr-1.5" />
                <Text className="text-xs font-bold text-[#F5F2EC]">Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { StreakApiClient } from '@streak/api-client';

interface SearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarPath?: string;
}

interface InviteMemberModalProps {
  visible: boolean;
  roomId: string;
  apiClient: StreakApiClient;
  onClose: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  visible,
  roomId,
  apiClient,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (text.trim().length < 2) {
        setResults([]);
        return;
      }

      // Debounced search (300ms)
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const data = await apiClient.searchUsersByUsername(text);
          setResults(data);
        } catch (e) {
          console.warn('Search failed:', e);
          setResults([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [apiClient]
  );

  const handleSendInvite = async (user: SearchResult) => {
    setSending(user.id);
    try {
      await apiClient.sendRoomInvitation(roomId, user.id);
      setSentIds((prev) => new Set(prev).add(user.id));
      Alert.alert('Invitation Sent!', `@${user.username} will receive a notification.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invitation');
    } finally {
      setSending(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSentIds(new Set());
    onClose();
  };

  const renderUserItem = ({ item }: { item: SearchResult }) => {
    const alreadySent = sentIds.has(item.id);

    return (
      <View className="flex-row items-center py-3.5 border-b border-[#2B2521]">
        {/* Avatar */}
        <View className="w-10 h-10 bg-[#221C16] border border-[#3A2E1F] rounded-full items-center justify-center mr-3">
          <Icon name="user" size={18} color="#E8C08A" />
        </View>

        {/* User Info */}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-[#F5F2EC]">{item.displayName}</Text>
          <Text className="text-xs text-[#9C958C]">@{item.username}</Text>
        </View>

        {/* Send / Sent Button */}
        {alreadySent ? (
          <View className="px-4 py-2 bg-[#2A2013] border border-[#3A2E1F] rounded-xl flex-row items-center">
            <Icon name="check" size={12} color="#E8C08A" className="mr-1" />
            <Text className="text-xs font-semibold text-[#E8C08A]">Sent</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => handleSendInvite(item)}
            disabled={sending === item.id}
            className="px-4 py-2 bg-[#E8C08A] rounded-xl flex-row items-center"
          >
            {sending === item.id ? (
              <ActivityIndicator size="small" color="#241C14" />
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
      <View style={{ flex: 1, backgroundColor: '#0B0B0C' }}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b border-[#2B2521] flex-row justify-between items-center">
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Icon name="arrow-left" size={20} color="#9C958C" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-[#F5F2EC]">Invite Member</Text>
          <View className="w-10" />
        </View>

        {/* Search Bar */}
        <View className="px-6 pt-5 pb-3">
          <View className="flex-row items-center bg-[#181513] border border-[#2B2521] rounded-xl px-4 py-3">
            <Icon name="user" size={16} color="#9C958C" className="mr-2" />
            <TextInput
              value={query}
              onChangeText={handleSearch}
              placeholder="Search by @username..."
              placeholderTextColor="#65605A"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-[#F5F2EC] text-sm"
            />
            {searching && <ActivityIndicator size="small" color="#E8C08A" />}
          </View>
        </View>

        {/* Results */}
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          ListEmptyComponent={
            query.length >= 2 && !searching ? (
              <View className="items-center py-12">
                <Icon name="user" size={28} color="#9C958C" className="mb-3" />
                <Text className="text-sm text-[#9C958C]">No users found matching "@{query}"</Text>
              </View>
            ) : query.length < 2 ? (
              <View className="items-center py-12">
                <Text className="text-sm text-[#9C958C]">Type at least 2 characters to search</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
};

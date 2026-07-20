import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { Icon } from '../../src/components/ui/Icon';

export default function ActivityScreen() {
  const { apiClient, user } = useAuthStore();
  const [activities, setActivities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchActivities();

    // Configure Realtime Subscription (respects Database RLS)
    const channel = apiClient.supabase
      .channel('room-activities-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: selectedRoomId ? `room_id=eq.${selectedRoomId}` : undefined,
        },
        () => {
          fetchActivities(); // Refresh feed automatically on insert
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => {
          fetchActivities(); // Refresh feed automatically on reaction updates
        }
      )
      .subscribe();

    return () => {
      apiClient.supabase.removeChannel(channel);
    };
  }, [selectedRoomId]);

  const fetchRooms = async () => {
    try {
      const data = await apiClient.getRooms();
      setRooms(data);
      if (data.length > 0) {
        setSelectedRoomId(data[0].id); // Default to first room
      }
    } catch (e: any) {
      console.warn('Failed to load rooms for filter:', e.message);
    }
  };

  const fetchActivities = async () => {
    if (!selectedRoomId) return;
    setLoading(true);
    try {
      const data = await apiClient.getRoomActivity(selectedRoomId);
      setActivities(data);
    } catch (e: any) {
      console.warn('Failed to load activities:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (activityId: string, type: string) => {
    try {
      await apiClient.reactToActivity(activityId, type);
      // Realtime subscription will trigger reload, but update locally for responsive UI
      fetchActivities();
    } catch (e: any) {
      Alert.alert('Reaction failed', e.message);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F8F9F7] p-6">
      {/* Header & Filter */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-[#1C211E] mb-4">Accountability Feed</Text>
        
        {/* Room Filter Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {rooms.map((room) => {
            const isSelected = selectedRoomId === room.id;
            return (
              <TouchableOpacity
                key={room.id}
                onPress={() => setSelectedRoomId(room.id)}
                className={`px-4 py-2 rounded-xl mr-3 border ${isSelected ? 'bg-[#256D4A] border-[#256D4A]' : 'bg-white border-[#E6E9E6]'}`}
              >
                <Text className={`font-semibold ${isSelected ? 'text-white' : 'text-[#6B726D]'}`}>{room.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Social Feed List */}
      {loading && activities.length === 0 ? (
        <ActivityIndicator size="large" color="#256D4A" className="mt-10" />
      ) : activities.length === 0 ? (
        <View className="bg-white border border-[#E6E9E6] p-8 rounded-2xl items-center mt-4">
          <Icon name="bell" size={32} color="#256D4A" className="mb-2" />
          <Text className="text-base font-semibold text-[#1C211E]">No Activity Yet</Text>
          <Text className="text-sm text-[#6B726D] text-center mt-1">Activities appear here when linked room habits are completed.</Text>
        </View>
      ) : (
        activities.map((activity) => (
          <View
            key={activity.id}
            className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-4 shadow-sm"
          >
            {/* Header info */}
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-[#E7F2EC] rounded-full items-center justify-center mr-3">
                <Icon name="user" size={18} color="#256D4A" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#1C211E]">{activity.actorDisplayName}</Text>
                <Text className="text-xs text-[#6B726D]">
                  {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E7F2EC] text-[#256D4A]">
                {activity.type.replace('_', ' ')}
              </Text>
            </View>

            {/* Content message */}
            <Text className="text-sm text-[#1C211E] mb-4 leading-relaxed">{activity.message}</Text>

            {/* Reactions section */}
            <View className="flex-row items-center space-x-3 border-t border-[#E6E9E6] pt-3">
              {['❤️', '🔥', '👏'].map((emoji) => {
                const reaction = activity.reactions?.find((r: any) => r.type === emoji);
                const count = reaction?.count || 0;
                const userReacted = !!reaction?.userReacted;

                return (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReact(activity.id, emoji)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${userReacted ? 'bg-[#FFF2DF] border-[#F59E42]' : 'bg-[#F8F9F7] border-[#E6E9E6]'}`}
                  >
                    <Text className="text-sm">{emoji}</Text>
                    {count > 0 && (
                      <Text className={`text-xs font-bold ml-1.5 ${userReacted ? 'text-[#F59E42]' : 'text-[#6B726D]'}`}>
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

import React, { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { Icon } from '../../src/components/ui/Icon';

export default function ProfileScreen() {
  const { user, loading, updateUser, signOut, deleteUserAccount } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');

  const handleUpdate = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display Name cannot be empty.');
      return;
    }
    try {
      await updateUser(displayName.trim(), bio.trim(), timezone.trim());
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated habits, streaks, and data. This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserAccount();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8F9F7]">
        <ActivityIndicator size="large" color="#256D4A" />
      </View>
    );
  }

  // Calculate level progress
  const xpInCurrentLevel = user.xp % 100;
  const xpProgressPercent = xpInCurrentLevel / 100;

  return (
    <ScrollView className="flex-1 bg-[#F8F9F7] p-6">
      <View className="items-center mb-6">
        <View className="w-20 h-20 bg-[#E7F2EC] rounded-full items-center justify-center mb-3">
          <Icon name="user" size={40} color="#256D4A" />
        </View>
        <Text className="text-xl font-bold text-[#1C211E]">{user.displayName}</Text>
        <Text className="text-sm text-[#6B726D]">@{user.username || 'username'}</Text>
      </View>

      {/* Level & XP Card */}
      <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-6 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-sm font-semibold text-[#6B726D]">Level {user.level || 1}</Text>
          <Text className="text-sm font-semibold text-[#256D4A]">{xpInCurrentLevel} / 100 XP</Text>
        </View>
        {/* Progress Bar */}
        <View className="w-full h-3 bg-[#E6E9E6] rounded-full overflow-hidden">
          <View
            className="h-full bg-[#256D4A] rounded-full"
            style={{ width: `${xpProgressPercent * 100}%` }}
          />
        </View>
        <Text className="text-xs text-[#6B726D] mt-2">Earn 10 XP for every completed habit check-in.</Text>
      </View>

      {/* Edit Profile Form / Detail Card */}
      {isEditing ? (
        <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-base font-bold text-[#1C211E] mb-4">Edit Profile</Text>

          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Display Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />

          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Write a brief bio..."
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />

          <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Timezone</Text>
          <TextInput
            value={timezone}
            onChangeText={setTimezone}
            className="px-4 py-3 border border-[#E6E9E6] rounded-xl mb-4"
          />

          <View className="flex-row mt-2">
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={loading}
              className="flex-1 bg-[#256D4A] py-3 rounded-xl items-center mr-2"
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              className="flex-1 bg-[#E6E9E6] py-3 rounded-xl items-center ml-2"
            >
              <Text className="text-[#6B726D] font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-base font-bold text-[#1C211E]">Profile Details</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text className="text-[#256D4A] font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>

          {user.bio ? (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-1">Bio</Text>
              <Text className="text-sm text-[#1C211E]">{user.bio}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-1">Timezone</Text>
            <Text className="text-sm text-[#1C211E]">{user.timezone || 'UTC'}</Text>
          </View>

          <View>
            <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-1">Member Since</Text>
            <Text className="text-sm text-[#1C211E]">
              {new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' })}
            </Text>
          </View>
        </View>
      )}

      {/* Account Settings / Actions */}
      <View className="bg-white border border-[#E6E9E6] p-5 rounded-2xl mb-12 shadow-sm">
        <Text className="text-base font-bold text-[#1C211E] mb-4">Account Settings</Text>

        <TouchableOpacity
          onPress={signOut}
          className="py-3 border-b border-[#E6E9E6] flex-row justify-between items-center"
        >
          <Text className="text-sm font-semibold text-[#6B726D]">Sign Out</Text>
          <Icon name="logout" size={16} color="#6B726D" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          className="py-3 flex-row justify-between items-center mt-2"
        >
          <Text className="text-sm font-semibold text-[#D95C5C]">Delete Account</Text>
          <Icon name="trash" size={16} color="#D95C5C" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

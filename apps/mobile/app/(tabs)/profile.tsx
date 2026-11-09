import React, { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useAuthStore } from '../../src/store/auth-store';
import { Icon } from '../../src/components/ui/Icon';
import { ProfileSkeleton } from '../../src/components/ui/skeletons/ProfileSkeleton';
import { DotPulse } from '../../src/components/ui/DotPulse';
import { useNotice } from '../../src/components/ui/Notice';
import { ConfirmDialog } from '../../src/components/ui/ConfirmDialog';
import { useDelayedLoading } from '../../src/hooks/useDelayedLoading';
import { useOnboardingStore } from '../../src/store/onboarding-store';

export default function ProfileScreen() {
  const { user, loading, updateUser, signOut, deleteUserAccount } = useAuthStore();
  const notice = useNotice();
  const showSkeleton = useDelayedLoading(loading || !user);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');

  const handleUpdate = async () => {
    if (!displayName.trim()) {
      notice.warning('Display Name cannot be empty.');
      return;
    }
    try {
      await updateUser(displayName.trim(), bio.trim(), timezone.trim());
      setIsEditing(false);
      notice.success('Profile updated successfully.');
    } catch (e: any) {
      notice.error(e.message || 'Failed to update profile');
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await deleteUserAccount();
    } catch (e: any) {
      notice.error(e.message || 'Failed to delete account');
    }
  };

  const handleReplayTutorial = async () => {
    if (!user?.id) return;
    await useOnboardingStore.getState().replay(user.id);
  };

  if (showSkeleton || !user) {
    return <ProfileSkeleton />;
  }

  // Calculate level progress
  const xpInCurrentLevel = user.xp % 100;
  const xpProgressPercent = xpInCurrentLevel / 100;

  return (
    <View className="flex-1 bg-[#0B0B0C]">
      <ScrollView className="flex-1 px-6 pt-16" showsVerticalScrollIndicator={false}>
        {/* Screen Header matching Figma */}
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-3xl font-bold text-[#F5F2EC]">You</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)} className="p-2">
            <Icon name="settings" size={22} color="#9C958C" />
          </TouchableOpacity>
        </View>

        {/* Profile Identity matching Figma */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-[#221C16] border border-[#3A2E1F] rounded-full items-center justify-center mb-3">
            <Icon name="user" size={38} color="#E8C08A" />
          </View>
          <Text className="text-xl font-bold text-[#F5F2EC]">{user.displayName || 'User'}</Text>
          <Text className="text-sm text-[#9C958C] mt-0.5">@{user.username || 'username'}</Text>
        </View>

        {/* Level & XP Card matching Figma */}
        <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-bold text-[#F5F2EC]">Level {user.level || 1}</Text>
            <Text className="text-xs font-semibold text-[#E8C08A]">
              {xpInCurrentLevel} / 100 XP
            </Text>
          </View>

          {/* XP Progress Bar */}
          <View className="w-full h-2 bg-[#2B2521] rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-[#E8C08A] rounded-full"
              style={{ width: `${Math.max(5, xpProgressPercent * 100)}%` }}
            />
          </View>

          <Text className="text-xs text-[#9C958C] leading-relaxed">
            Earn 10 XP for every completed habit check-in.
          </Text>
        </View>

        {/* Edit Profile Form / Profile Details Card matching Figma */}
        {isEditing ? (
          <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6 shadow-sm">
            <Text className="text-base font-bold text-[#F5F2EC] mb-4">Edit Profile</Text>

            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />

            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Write a brief bio..."
              placeholderTextColor="#65605A"
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />

            <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-2">Timezone</Text>
            <TextInput
              value={timezone}
              onChangeText={setTimezone}
              className="px-4 py-3 bg-[#0B0B0C] border border-[#2B2521] text-[#F5F2EC] rounded-xl mb-4"
            />

            <View className="flex-row mt-2">
              <TouchableOpacity
                onPress={handleUpdate}
                disabled={loading}
                className="flex-1 bg-[#E8C08A] py-3 rounded-xl items-center mr-2"
              >
                {loading ? <DotPulse color="#241C14" size={5} /> : <Text className="text-[#241C14] font-bold text-sm">Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                className="flex-1 bg-[#221C16] border border-[#3A2E1F] py-3 rounded-xl items-center ml-2"
              >
                <Text className="text-[#9C958C] font-semibold text-sm">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-6 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-[#F5F2EC]">Profile Details</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text className="text-xs font-bold text-[#E8C08A] tracking-wider uppercase">EDIT</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-1">TIMEZONE</Text>
              <Text className="text-sm text-[#F5F2EC]">{user.timezone || 'UTC'}</Text>
            </View>

            <View>
              <Text className="text-xs font-semibold text-[#65605A] uppercase tracking-wider mb-1">MEMBER SINCE</Text>
              <Text className="text-sm text-[#F5F2EC]">
                {new Date(user.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' })}
              </Text>
            </View>
          </View>
        )}

        {/* Account Settings Card matching Figma */}
        <View className="bg-[#181513] border border-[#2B2521] p-5 rounded-2xl mb-12 shadow-sm">
          <Text className="text-base font-bold text-[#F5F2EC] mb-4">Account Settings</Text>

          <TouchableOpacity
            onPress={handleReplayTutorial}
            className="py-3.5 border-b border-[#2B2521] flex-row justify-between items-center"
          >
            <View className="flex-row items-center">
              <Icon name="book-open" size={16} color="#E8C08A" className="mr-2.5" />
              <Text className="text-sm text-[#F5F2EC] font-medium">Replay Tutorial</Text>
            </View>
            <Icon name="arrow-right" size={16} color="#E8C08A" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            className="py-3.5 border-b border-[#2B2521] flex-row justify-between items-center"
          >
            <Text className="text-sm text-[#F5F2EC] font-medium">Sign Out</Text>
            <Icon name="arrow-right" size={16} color="#9C958C" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            className="py-3.5 flex-row justify-between items-center mt-1"
          >
            <Text className="text-sm text-[#E8899A] font-medium">Delete Account</Text>
            <Icon name="trash" size={16} color="#E8899A" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Account Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Account"
        message="This will permanently delete your account and all associated habits, streaks, and data. This action CANNOT be undone."
        confirmLabel="Delete Permanently"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </View>
  );
}

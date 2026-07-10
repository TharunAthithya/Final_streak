import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';

export default function RegisterScreen() {
  const { signUp, loading, error } = useAuthStore();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setLocalError('Username must be alphanumeric and at least 3 characters.');
      return;
    }
    setLocalError('');
    try {
      await signUp(email.trim(), password, username.trim(), name.trim());
    } catch (e: any) {
      // Error handled by store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F8F9F7]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-10">
          {/* Header */}
          <View className="mb-8 items-center">
            <Text className="text-3xl font-bold text-[#1C211E] tracking-tight">Create Account</Text>
            <Text className="text-sm text-[#6B726D] mt-2">Start your social habit transformation</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Display Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#9AA19C"
                className="w-full px-4 py-3 bg-white border border-[#E6E9E6] rounded-xl text-[#1C211E] focus:border-[#256D4A]"
              />
            </View>

            <View className="mt-4">
              <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="johndoe_99"
                placeholderTextColor="#9AA19C"
                autoCapitalize="none"
                className="w-full px-4 py-3 bg-white border border-[#E6E9E6] rounded-xl text-[#1C211E] focus:border-[#256D4A]"
              />
            </View>

            <View className="mt-4">
              <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9AA19C"
                autoCapitalize="none"
                keyboardType="email-address"
                className="w-full px-4 py-3 bg-white border border-[#E6E9E6] rounded-xl text-[#1C211E] focus:border-[#256D4A]"
              />
            </View>

            <View className="mt-4">
              <Text className="text-xs font-semibold text-[#6B726D] uppercase tracking-wider mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor="#9AA19C"
                secureTextEntry
                className="w-full px-4 py-3 bg-white border border-[#E6E9E6] rounded-xl text-[#1C211E] focus:border-[#256D4A]"
              />
            </View>
          </View>

          {/* Errors */}
          {(error || localError) ? (
            <View className="mt-6 p-4 bg-[#FCDCDC] border border-[#F59E9E] rounded-xl">
              <Text className="text-sm text-[#D95C5C] font-medium">{localError || error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="w-full mt-8 bg-[#256D4A] active:bg-[#1D5239] py-4 rounded-xl items-center justify-center shadow-sm"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Redirect */}
          <View className="flex-row justify-center mt-6 space-x-1">
            <Text className="text-[#6B726D]">Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-[#256D4A] font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

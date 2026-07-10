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

export default function LoginScreen() {
  const { signIn, loading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password.');
      return;
    }
    setLocalError('');
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      // Error handled by store, but we catch it here to prevent crash
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#F8F9F7]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="mb-10 items-center">
            <View className="w-16 h-16 bg-[#256D4A] rounded-2xl items-center justify-center mb-4 shadow-sm">
              <Text className="text-white text-3xl font-bold">S</Text>
            </View>
            <Text className="text-3xl font-bold text-[#1C211E] tracking-tight">Welcome Back</Text>
            <Text className="text-sm text-[#6B726D] mt-2">Sign in to resume your habit streak</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
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
                placeholder="Enter your password"
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
            onPress={handleLogin}
            disabled={loading}
            className="w-full mt-8 bg-[#256D4A] active:bg-[#1D5239] py-4 rounded-xl items-center justify-center shadow-sm"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Redirect */}
          <View className="flex-row justify-center mt-8 space-x-1">
            <Text className="text-[#6B726D]">Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-[#256D4A] font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

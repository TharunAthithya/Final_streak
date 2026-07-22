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
      // Handled in store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#12110E]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-12">
          {/* Header */}
          <View className="mb-10 items-center">
            {/* Gold logo container matching Figma */}
            <View className="w-16 h-16 bg-[#C5A880] rounded-2xl items-center justify-center mb-6 shadow-sm">
              <Text className="text-[#12110E] text-3xl font-bold">S</Text>
            </View>
            <Text className="text-3xl font-bold text-white tracking-tight mb-2">Welcome back</Text>
            <Text className="text-sm text-[#8A8276]">Sign in to keep your streak going.</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#8A8276] uppercase tracking-wider mb-2">
                EMAIL ADDRESS
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#5C4E3D"
                autoCapitalize="none"
                keyboardType="email-address"
                className="w-full px-4 py-3.5 bg-[#1E1C18] border border-[#3E3831] rounded-xl text-white focus:border-[#C5A880]"
              />
            </View>

            <View className="mb-2">
              <Text className="text-xs font-semibold text-[#8A8276] uppercase tracking-wider mb-2">
                PASSWORD
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#5C4E3D"
                secureTextEntry
                className="w-full px-4 py-3.5 bg-[#1E1C18] border border-[#3E3831] rounded-xl text-white focus:border-[#C5A880]"
              />
            </View>

            <View className="align-self-end flex-row justify-end mb-4">
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text className="text-xs text-[#C5A880] font-semibold">Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Errors */}
          {(error || localError) ? (
            <View className="mb-4 p-4 bg-[#2A1C1C] border border-[#D95C5C] rounded-xl">
              <Text className="text-sm text-[#D95C5C] font-medium">{localError || error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="w-full mt-4 bg-[#C5A880] active:bg-[#B3966E] py-4 rounded-xl items-center justify-center shadow-sm"
          >
            {loading ? (
              <ActivityIndicator color="#12110E" />
            ) : (
              <Text className="text-[#12110E] font-bold text-base">Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Register Redirect */}
          <View className="flex-row justify-center mt-8 space-x-1">
            <Text className="text-[#8A8276] text-sm">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-[#C5A880] text-sm font-bold">Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

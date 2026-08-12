import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth-store';
import { Icon } from '../../src/components/ui/Icon';
import { DotPulse } from '../../src/components/ui/DotPulse';

export default function RegisterScreen() {
  const { signUp, loading, error } = useAuthStore();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      className="flex-1 bg-[#12110E]"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-6 py-10">
          {/* Header */}
          <View className="mb-8 items-center">
            {/* Gold logo container matching Figma */}
            <View className="w-16 h-16 bg-[#C5A880] rounded-2xl items-center justify-center mb-6 shadow-sm">
              <Text className="text-[#12110E] text-3xl font-bold">S</Text>
            </View>
            <Text className="text-3xl font-bold text-white tracking-tight mb-2">Create account</Text>
            <Text className="text-sm text-[#8A8276]">Start becoming who you want to be.</Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#8A8276] uppercase tracking-wider mb-2">
                DISPLAY NAME
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor="#5C4E3D"
                className="w-full px-4 py-3.5 bg-[#1E1C18] border border-[#3E3831] rounded-xl text-white focus:border-[#C5A880]"
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#8A8276] uppercase tracking-wider mb-2">
                USERNAME
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="johndoe_99"
                placeholderTextColor="#5C4E3D"
                autoCapitalize="none"
                className="w-full px-4 py-3.5 bg-[#1E1C18] border border-[#3E3831] rounded-xl text-white focus:border-[#C5A880]"
              />
            </View>

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

            <View className="mb-4">
              <Text className="text-xs font-semibold text-[#8A8276] uppercase tracking-wider mb-2">
                PASSWORD
              </Text>
              <View className="w-full bg-[#1E1C18] border border-[#3E3831] rounded-xl flex-row items-center px-4">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#5C4E3D"
                  secureTextEntry={!showPassword}
                  className="flex-1 py-3.5 text-white"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="p-1 ml-2"
                  activeOpacity={0.7}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8A8276" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Errors */}
          {(error || localError) ? (
            <View className="mt-2 mb-4 p-4 bg-[#2A1C1C] border border-[#D95C5C] rounded-xl">
              <Text className="text-sm text-[#D95C5C] font-medium">{localError || error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            className="w-full mt-4 bg-[#C5A880] active:bg-[#B3966E] py-4 rounded-xl items-center justify-center shadow-sm"
          >
            {loading ? (
              <DotPulse color="#12110E" size={6} />
            ) : (
              <Text className="text-[#12110E] font-bold text-base">Sign up</Text>
            )}
          </TouchableOpacity>

          {/* Login Redirect */}
          <View className="flex-row justify-center mt-6 space-x-1">
            <Text className="text-[#8A8276] text-sm">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-[#C5A880] text-sm font-bold">Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

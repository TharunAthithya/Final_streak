import React from 'react';
import { View, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox } from './SkeletonBox';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  loading?: boolean;
  className?: string;
  safe?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  loading = false,
  className = '',
  safe = true,
}) => {
  const Container = safe ? SafeAreaView : View;
  const InnerContainer = scrollable ? ScrollView : View;

  return (
    <Container className="flex-1 bg-[#0B0B0C]">
      <StatusBar barStyle="light-content" backgroundColor="#0B0B0C" />
      {loading ? (
        <View className="flex-1 justify-center items-center px-6">
          <SkeletonBox width="80%" height={24} borderRadius={8} className="mb-4" />
          <SkeletonBox width="60%" height={16} borderRadius={6} />
        </View>
      ) : (
        <InnerContainer
          className={`flex-1 ${className}`}
          contentContainerStyle={scrollable ? { flexGrow: 1 } : undefined}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </InnerContainer>
      )}
    </Container>
  );
};

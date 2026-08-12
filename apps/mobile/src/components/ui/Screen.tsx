import React from 'react';
import { View, ScrollView, SafeAreaView, StatusBar } from 'react-native';
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
    <Container className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9F7" />
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

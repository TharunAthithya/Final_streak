import { ExpoConfig, ConfigContext } from 'expo/config';
import dotenv from 'dotenv';
import path from 'path';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Determine environment: APP_ENV takes precedence, defaulting to development
  const appEnv = process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');

  // Load environment file (.env.development or .env.production) with override & quiet mode
  dotenv.config({ path: path.resolve(__dirname, `.env.${appEnv}`), override: true, quiet: true });
  dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });

  const isProd = appEnv === 'production';
  const appName = isProd ? 'Streak' : `Streak (${appEnv.toUpperCase()})`;
  const bundleId = isProd ? 'com.streak.app' : `com.streak.app.${appEnv}`;

  return {
    ...config,
    name: appName,
    slug: 'streak-app',
    scheme: 'streak-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleId,
    },
    android: {
      package: bundleId,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F8F9F7',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-font',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#F8F9F7',
          image: './assets/splash.png',
          imageWidth: 200,
        },
      ],
    ],
    extra: {
      appEnv,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
  };
};

import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'production' | 'test';

export interface EnvConfig {
  APP_ENV: AppEnvironment;
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  IS_DEV: boolean;
  IS_PROD: boolean;
}

const getEnvVar = (key: string, extraKey?: string): string => {
  // 1. Check process.env (injected by Expo CLI at bundle time for EXPO_PUBLIC_*)
  if (process.env[key]) {
    return process.env[key] as string;
  }
  // 2. Check Constants.expoConfig?.extra fallback
  if (extraKey && Constants.expoConfig?.extra?.[extraKey]) {
    return Constants.expoConfig.extra[extraKey] as string;
  }
  return '';
};

const rawAppEnv = (getEnvVar('EXPO_PUBLIC_APP_ENV', 'appEnv') || 'development').toLowerCase() as AppEnvironment;
const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl').trim();
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey').trim();

// Placeholder detection list to catch unconfigured production/development envs
const PLACEHOLDER_PATTERNS = [
  'your-supabase-project-url',
  'your-supabase-project-id',
  'your-supabase-anon-key',
  'your-production-project',
  'your-production-anon-key',
];

const isPlaceholder = (val: string): boolean => {
  if (!val) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => val.includes(pattern));
};

// Startup validation safety checks
if (!supabaseUrl || isPlaceholder(supabaseUrl)) {
  const errMsg =
    `[ENV CONFIG ERROR] EXPO_PUBLIC_SUPABASE_URL is missing or unconfigured for environment "${rawAppEnv}". ` +
    `Please set a valid EXPO_PUBLIC_SUPABASE_URL in your '.env.${rawAppEnv}' file or EAS secrets.`;
  console.error(errMsg);
  if (rawAppEnv === 'production') {
    throw new Error(errMsg);
  }
}

if (!supabaseAnonKey || isPlaceholder(supabaseAnonKey)) {
  const errMsg =
    `[ENV CONFIG ERROR] EXPO_PUBLIC_SUPABASE_ANON_KEY is missing or unconfigured for environment "${rawAppEnv}". ` +
    `Please set a valid EXPO_PUBLIC_SUPABASE_ANON_KEY in your '.env.${rawAppEnv}' file or EAS secrets.`;
  console.error(errMsg);
  if (rawAppEnv === 'production') {
    throw new Error(errMsg);
  }
}

// Log active configuration during startup for developer transparency (omits secret keys)
if (rawAppEnv !== 'production' && supabaseUrl) {
  try {
    const parsedHost = new URL(supabaseUrl).hostname;
    console.log(`[ENV Config] Active Environment: ${rawAppEnv.toUpperCase()} | Supabase Host: ${parsedHost}`);
  } catch {
    console.log(`[ENV Config] Active Environment: ${rawAppEnv.toUpperCase()}`);
  }
}

export const env: EnvConfig = {
  APP_ENV: rawAppEnv,
  EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
  IS_DEV: rawAppEnv === 'development',
  IS_PROD: rawAppEnv === 'production',
};

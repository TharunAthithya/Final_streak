import Constants from 'expo-constants';

export type AppEnvironment = 'development' | 'production' | 'test';

export interface EnvConfig {
  APP_ENV: AppEnvironment;
  EXPO_PUBLIC_SUPABASE_URL: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  IS_DEV: boolean;
  IS_PROD: boolean;
}

// Explicit property access allows Metro transform-inline-environment-variables
// to statically substitute values at build time during Metro bundling.
const rawAppEnv = (
  process.env.EXPO_PUBLIC_APP_ENV ||
  (Constants.expoConfig?.extra?.appEnv as string) ||
  'development'
).toLowerCase() as AppEnvironment;

const supabaseUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  (Constants.expoConfig?.extra?.supabaseUrl as string) ||
  ''
).trim();

const supabaseAnonKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (Constants.expoConfig?.extra?.supabaseAnonKey as string) ||
  ''
).trim();

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

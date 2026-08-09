# Multi-Environment Configuration Guide

This document outlines the multi-environment setup for the Final Streak Expo React Native application and Supabase backends.

---

## 1. Overview & Architecture

The application supports two isolated backends without requiring developers to manually edit environment variables or swap code configuration:

1. **Development (`development`)**: Used exclusively by developers for active feature iteration, debugging, and schema migrations.
2. **Production (`production`)**: Used by beta testers, internal QA (preview builds), and end-users in production releases.

| Environment | Config File | Bundle ID / Package | App Display Name | EAS Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | `.env.development` | `com.streak.app.development` | `Streak (DEVELOPMENT)` | `development` |
| **Preview / Beta** | `.env.production` | `com.streak.app.production` | `Streak (PRODUCTION)` | `preview` |
| **Production** | `.env.production` | `com.streak.app` | `Streak` | `production` |

---

## 2. Environment Variables & Storage

Environment variables are defined in environment-specific `.env` files located inside `apps/mobile/`:

- `apps/mobile/.env.development`: Active development credentials (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- `apps/mobile/.env.production`: Template for production credentials (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- `apps/mobile/.env.example`: Template for new developers setting up their workspace.

> **Security Note**: All `.env`, `.env.development`, `.env.production`, and `.env.local` files are ignored in Git (`.gitignore`) to prevent leaking production database keys into repositories.

### Required Environment Variables

```ini
# Environment Identifier ('development' | 'production')
EXPO_PUBLIC_APP_ENV=development

# Supabase Project URL
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co

# Supabase Anonymous Public API Key
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 3. How Environments Work Under the Hood

1. **Dynamic Expo Configuration (`app.config.ts`)**:
   - `app.config.ts` reads `APP_ENV` (defaults to `development`).
   - `dotenv` loads the matching file (`.env.development` or `.env.production`).
   - Expo automatically bundles variables prefixed with `EXPO_PUBLIC_` into the JS bundle at compile time.
2. **Centralized Environment Validation (`apps/mobile/src/config/env.ts`)**:
   - Acts as the single source of truth for runtime config.
   - Validates that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are defined and non-placeholder.
   - Throws clear startup errors if missing or invalid.
3. **Supabase SDK Client (`apps/mobile/src/store/auth-store.ts`)**:
   - Initializes `StreakApiClient` using `env.EXPO_PUBLIC_SUPABASE_URL` and `env.EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

## 4. How to Run Locally

### Run Development App (Default)
Points to **Development Supabase** (`.env.development`):
```bash
# From workspace root:
npm run dev

# Or from apps/mobile:
npm run dev
# or
npm run android
```

### Run Local App with Production Backend
To test against the **Production Supabase** backend locally:
```bash
# From apps/mobile:
npm run dev:prod
```

---

## 5. How to Build APKs & Binaries with EAS Build

### Build Development APK (Internal Dev Client)
```bash
# From workspace root:
npm run build:development

# Direct EAS command in apps/mobile:
eas build --platform android --profile development
```

### Build Preview APK (Production Backend for Beta Testers)
```bash
# From workspace root:
npm run build:preview

# Direct EAS command in apps/mobile:
eas build --platform android --profile preview
```

### Build Store Production Binary (AAB/APK for Google Play / App Store)
```bash
# From workspace root:
npm run build:production

# Direct EAS command in apps/mobile:
eas build --platform android --profile production
```

---

## 6. Configuring EAS Secrets for Production Builds

When running EAS builds in GitHub Actions or EAS Cloud, set environment variables via **EAS Secrets**:

```bash
# Set Production Supabase URL in EAS
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-prod-project.supabase.co" --scope project

# Set Production Supabase Anon Key in EAS
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-production-anon-key" --scope project
```

---

## 7. How to Switch Environments

- **For local dev**: Simply use `npm run dev` (development) or `npm run dev:prod` (production).
- **For EAS builds**: Select the profile (`--profile development`, `--profile preview`, or `--profile production`).

The build toolchain automatically binds the proper environment file and settings without manual file edits.

---

## 8. Common Mistakes & Pitfalls to Avoid

1. **Hardcoding URLs or Keys**: Never pass raw strings to `createClient()` or `StreakApiClient`. Always import `env` from `@/config/env` (or `../config/env`).
2. **Committing Credentials**: Do not remove `.env.development` or `.env.production` from `.gitignore`.
3. **Using Placeholder Credentials**: If building for production, ensure `.env.production` contains valid Supabase URL and Anon Key (or set EAS Secrets). The app will throw an explicit error at startup if placeholders are detected in production.
4. **Mixing Database Instances**: Development and Production DB schemas must be kept in sync using migration scripts in `supabase/migrations/`.

---
name: git-workflow
description: Enforces code review standards and formats commit messages using Conventional Commits. Use this skill when analyzing code diffs, staging changes, or generating commit messages.
---

# Git Workflow & Code Review Standards

When asked to review code, stage changes, or write commit messages, you must strictly follow these two phases:

## Phase 1: Pre-Commit Code Review
Before creating a commit message, analyze the current diff and verify the following:
- **Clean Code:** Ensure no debugging statements (`console.log`, `debugger`) or commented-out dead code are left behind.
- **Type Safety:** Ensure there are no implicit `any` types or ignored TypeScript warnings (`@ts-ignore`) in the modified lines.
- **Completeness:** Verify that the code handles edge cases (e.g., loading states, error boundaries, or empty list fallbacks in React Native).
- **Action:** If any of these fail, warn the user and offer to fix the issues before proceeding with the commit.

## Phase 2: Conventional Commits
All commit messages must strictly adhere to the Conventional Commits specification.

**Format:** `type(scope): short summary in lowercase`

**Allowed Types:**
- `feat`: A new feature for the user (e.g., adding task creation).
- `fix`: A bug fix (e.g., resolving a crash on the login screen).
- `refactor`: A code change that neither fixes a bug nor adds a feature (e.g., extracting a UI component).
- `style`: Changes that do not affect the meaning of the code (formatting, missing semi-colons).
- `perf`: A code change that improves performance (e.g., memoizing a React component).
- `chore`: Updating build tasks, package manager configs, etc. (e.g., updating Expo SDK).

**Guidelines:**
- **Scope:** Always include a scope in parentheses that indicates the area of the codebase affected (e.g., `auth`, `navigation`, `ui`, `db`).
- **Summary:** Write the summary in the imperative, present tense ("add feature" not "added feature"). Do not capitalize the first letter and do not use a period at the end.
- **Body:** For complex changes, add a blank line after the summary and include a detailed explanation of *why* the change was made.
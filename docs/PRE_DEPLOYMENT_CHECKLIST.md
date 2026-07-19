# Streak — Pre-Deployment Checklist

## Overview

This document tracks every item that must be completed, verified, or audited before the first production release.

New items should be appended throughout development.

---

# Authentication

- `[ ]` Verify refresh token race conditions (only one refresh request occurs while concurrent requests wait).
- `[ ]` Verify session restoration after app restart, force stop, and device reboot.
- `[ ]` Verify complete logout cleanup (SecureStore, cached profile, Zustand state, navigation history).
- `[ ]` Verify offline authentication behavior when access token expires.
- `[ ]` Verify automatic session recovery after reconnecting to the internet.
- `[ ]` Verify protected routes cannot be accessed without authentication.
- `[ ]` Test the complete Forgot Password and Reset Password flow.
- `[ ]` Verify authentication state synchronization through Supabase auth state change events.
- `[ ]` Perform security audit of authentication implementation before release.

---

# Offline Synchronization

_To be completed._

---

# User Experience & Polish

_To be completed._

---

# Performance

_To be completed._

---

# Accessibility

_To be completed._

---

# Security

_To be completed._

---

# Notifications & Reminders

_To be completed._

---

# Analytics & Crash Reporting

_To be completed._

---

# Testing

_To be completed._

---

# App Store Readiness

_To be completed._

---

# Final Release Audit

_To be completed._

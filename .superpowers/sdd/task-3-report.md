# Task 3 Report: Add testSMSConnection to API Client

**Status:** ✅ Complete

## Changes Made

**File:** `src/lib/apiClient.ts`

1. **Updated comment** (line 76): Changed `// SMS - Envoi réel via Twilio` → `// SMS - Envoi réel via Twilio ou Telnyx`
2. **Added `testSMSConnection` function** (lines 108-120): New exported async function that calls the `send-sms` edge function with `action: 'test'`, `provider`, and `testNumber` parameters. Returns `{ success, error?, provider }`.

## Commits

No commits — changes staged for commit with other tasks.

## Concerns

None. The function follows the existing `callFunction` pattern and is type-safe with the provider union type `'twilio' | 'telnyx'`.

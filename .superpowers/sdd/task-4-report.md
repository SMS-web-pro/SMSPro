# Task 4: Settings UI — New SMSTab with provider selector

**Status:** COMPLETE

## Changes Made

### `src/pages/Settings.tsx`

1. **Added `Send` import** from `lucide-react` (line 31)
2. **Added `testSMSConnection` import** from `@/lib/apiClient` (line 44)
3. **Replaced entire `SMSTab` function** (was lines 482-703) with new implementation containing:
   - Provider selector card (toggle between Twilio and Telnyx)
   - Twilio config card with Account SID, Auth Token, Sender Number, Test Number
   - Telnyx config card with API Key, Sender Number, Test Number
   - Action buttons (Test + Save)
   - Webhook card with provider-specific setup instructions
   - Real `handleTest()` that calls `testSMSConnection()` and shows success/error toast
   - `handleSave()` saves both provider configs as `sms_config` JSONB
   - Migration fallback: reads `twilio_config` if `sms_config` is missing
4. **Updated tab label** from "SMS & Twilio" to "SMS & Providers"

### Minor fix

- Removed unused `currentConfig` variable (TS6133 error from plan code)

## Verification

- `npx tsc --noEmit` — clean (no errors)
- All imports verified: `testSMSConnection` exists in `apiClient.ts`, `Send` exists in `lucide-react`

## Concerns

- The `handleTest` calls `handleSave()` before testing, which triggers a second toast on success. This is intentional per the plan (save before test to ensure DB is up to date).
- The `handleSave` saves to localStorage key `smspro-settings-twilio` for demo mode, which is reused for both providers. This is fine as a demo fallback.

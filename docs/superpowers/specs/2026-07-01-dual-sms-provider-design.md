# Dual SMS Provider — Twilio + Telnyx

**Date:** 2026-07-01
**Status:** Approved
**Approach:** Single Edge Function with provider switch

## Goal

Allow users to choose between Twilio and Telnyx as their SMS provider, configure credentials from the platform UI, and switch providers without code changes or env var modifications.

## Problem

- Current Edge Function reads Twilio credentials from Deno env vars, ignoring what's stored in the DB
- Settings UI stores credentials in `users.twilio_config` but they're never used by the Edge Function
- Test button is fake (simulates success)
- Twilio trial accounts require per-number verification, making bulk SMS impractical
- No way to use an alternative provider (Telnyx) without code changes

## Design

### 1. Database Schema

Replace `twilio_config` with `sms_config` in the `users` table:

```sql
ALTER TABLE users ADD COLUMN sms_config JSONB DEFAULT '{
  "activeProvider": "twilio",
  "twilio": {
    "accountSid": "",
    "authToken": "",
    "senderNumber": "",
    "testNumber": ""
  },
  "telnyx": {
    "apiKey": "",
    "senderNumber": "",
    "testNumber": ""
  }
}'::jsonb;
```

Migration: copy existing `twilio_config` data into `sms_config.twilio`.

### 2. Edge Function (`send-sms/index.ts`)

The Edge Function reads `sms_config` from the `users` table and routes to the correct provider:

```
Request → Auth → Read sms_config → Route by activeProvider
  ├─ "twilio" → Twilio REST API (Basic Auth)
  └─ "telnyx" → Telnyx REST API (Bearer token)
```

New utility: `sendViaTelnyx(apiKey, from, to, text)`.

Two action modes:
- `action: "send"` — send SMS to contacts (existing behavior)
- `action: "test"` — send a single test SMS and return success/failure

### 3. Settings UI (`Settings.tsx` → SMSTab)

- Provider selector at the top (toggle between Twilio and Telnyx)
- Dynamic form fields based on selected provider
- Real "Test" button that sends an actual SMS via the Edge Function
- Test number field saved per provider in `sms_config`
- Webhook URL displayed (common to both providers)

### 4. API Client

New function `testSMSConnection(provider, testNumber)` that calls the Edge Function with `action: "test"`.

### 5. Migration & Backward Compatibility

- If `sms_config` is null but `twilio_config` exists, migrate automatically
- If neither exists, default to Twilio with empty fields
- Remove dependency on `TWILIO_*` env vars (no longer required)

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-sms/index.ts` | Add Telnyx provider, read from `sms_config`, add test action |
| `src/pages/Settings.tsx` | New SMSTab with provider selector, dynamic fields, real test |
| `src/lib/apiClient.ts` | Add `testSMSConnection` function |
| `src/lib/supabaseClient.ts` | Update `fetchUserSettings` for new schema |
| `src/hooks/useApi.ts` | Update error messages for dual provider |

## Pricing Reference

| Provider | Morocco SMS | Global | Free Tier |
|----------|------------|--------|-----------|
| Twilio | ~$0.08 | 180+ countries | $15 trial credit |
| Telnyx | ~$0.02-0.05 | 190+ countries | $10 credit |

## Verification

1. Configure Twilio in Settings → Test → SMS delivered ✅
2. Switch to Telnyx → Configure → Test → SMS delivered ✅
3. Send campaign with Telnyx → SMS delivered ✅
4. Switch back to Twilio → Send campaign → SMS delivered ✅
5. No env vars needed in Supabase secrets

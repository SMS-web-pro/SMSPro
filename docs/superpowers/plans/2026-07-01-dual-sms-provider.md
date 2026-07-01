# Dual SMS Provider — Twilio + Telnyx Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telnyx as an alternative SMS provider alongside Twilio, with provider switching from the Settings UI and all credentials stored in Supabase.

**Architecture:** Single Edge Function `send-sms` reads `sms_config` from the `users` table, routes to Twilio or Telnyx based on `activeProvider`. Settings UI provides a provider selector with dynamic fields and a real test button.

**Tech Stack:** Deno (Edge Function), React 19, Zustand, Supabase PostgreSQL, REST APIs (Twilio + Telnyx)

## Global Constraints

- React 19.2.6, Zustand v5 with persist middleware
- Supabase Edge Functions (Deno runtime)
- Vite with `viteSingleFile()` plugin
- All credentials stored in DB (`users.sms_config` JSONB), NOT in env vars
- E.164 phone format required (`+CCXXXXXXXXX`)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `supabase/functions/send-sms/index.ts` | SMS sending engine — reads `sms_config`, routes to Twilio or Telnyx |
| `src/pages/Settings.tsx` | SMSTab — provider selector, dynamic form, real test |
| `src/lib/apiClient.ts` | `sendSMS()` + new `testSMSConnection()` |
| `src/lib/supabaseClient.ts` | `fetchUserSettings()` — reads `sms_config` |
| `src/hooks/useApi.ts` | `useSendSMS` — error messages for dual provider |

---

### Task 1: Database Migration — Add `sms_config` column

**Files:**
- Create: SQL migration snippet (run in Supabase SQL Editor)

**Interfaces:**
- Produces: `users.sms_config` JSONB column with default value

- [ ] **Step 1: Run migration SQL**

Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor):

```sql
-- Add sms_config column with default value
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_config JSONB DEFAULT '{
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

-- Migrate existing twilio_config data to sms_config
UPDATE users
SET sms_config = jsonb_build_object(
  'activeProvider', 'twilio',
  'twilio', jsonb_build_object(
    'accountSid', COALESCE(twilio_config->>'accountSid', ''),
    'authToken', COALESCE(twilio_config->>'authToken', ''),
    'senderNumber', COALESCE(twilio_config->>'senderNumber', ''),
    'testNumber', ''
  ),
  'telnyx', jsonb_build_object(
    'apiKey', '',
    'senderNumber', '',
    'testNumber', ''
  )
)
WHERE twilio_config IS NOT NULL
  AND twilio_config != 'null'::jsonb
  AND (sms_config IS NULL OR sms_config = 'null'::jsonb);
```

- [ ] **Step 2: Verify migration**

Run in SQL Editor:

```sql
SELECT id, sms_config FROM users WHERE sms_config IS NOT NULL;
```

Expected: rows with `sms_config` containing `activeProvider: "twilio"` and migrated credentials.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/
git commit -m "docs: add dual SMS provider implementation plan"
```

---

### Task 2: Edge Function — Add Telnyx provider and read from `sms_config`

**Files:**
- Modify: `supabase/functions/send-sms/index.ts` (full rewrite)

**Interfaces:**
- Consumes: `users.sms_config` from DB
- Produces: `{ success, total, sent, failed, results[] }` (unchanged shape)
- New: `action: "test"` mode for real SMS testing

- [ ] **Step 1: Add Telnyx send function**

Add after the `sendTwilioSMS` function (after line 53):

```typescript
// Client Telnyx via REST API (Edge Function compatible)
async function sendTelnyxSMS(
  to: string,
  from: string,
  body: string,
  apiKey: string,
) {
  const url = 'https://api.telnyx.com/v2/messages'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      text: body,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      success: false,
      error: data.errors?.[0]?.detail || data.message || 'Erreur Telnyx',
      code: data.errors?.[0]?.code,
    }
  }

  return {
    success: true,
    messageSid: data.data?.id,
    status: data.data?.to?.[0]?.status,
    to: data.data?.to?.[0]?.phone_number,
    from: data.data?.from,
    price: data.data?.cost?.amount,
    errorCode: undefined,
    errorMessage: undefined,
  }
}
```

- [ ] **Step 2: Add helper to read sms_config**

Replace lines 116-136 (config reading block) with:

```typescript
    // Récupérer la config SMS de l'utilisateur
    const { data: profile } = await supabase
      .from('users')
      .select('sms_config, twilio_config')
      .eq('id', user.id)
      .single()

    // Support migration: use sms_config, fallback to twilio_config
    const smsConfig = profile?.sms_config || profile?.twilio_config
    const activeProvider = smsConfig?.activeProvider || 'twilio'

    let from = ''
    let providerConfig: any = null

    if (activeProvider === 'telnyx') {
      providerConfig = smsConfig?.telnyx
      from = senderNumber || providerConfig?.senderNumber || ''
      if (!providerConfig?.apiKey || !from) {
        return new Response(JSON.stringify({
          error: 'Telnyx non configuré. Configurez-le dans Paramètres → SMS',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Default: Twilio
      providerConfig = smsConfig?.twilio
      from = senderNumber || providerConfig?.senderNumber || ''
      if (!providerConfig?.accountSid || !providerConfig?.authToken || !from) {
        return new Response(JSON.stringify({
          error: 'Twilio non configuré. Configurez-le dans Paramètres → SMS',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
```

- [ ] **Step 3: Add test action handler**

Add this block inside the `Deno.serve` handler, after auth (after line 83) and before the existing logic:

```typescript
    const body = await req.json()

    // Test action: send a single test SMS
    if (body.action === 'test') {
      const { provider, testNumber } = body
      if (!testNumber) {
        return new Response(JSON.stringify({ error: 'Numéro de test requis' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const { data: profile } = await supabase
        .from('users')
        .select('sms_config, twilio_config')
        .eq('id', user.id)
        .single()

      const smsConfig = profile?.sms_config || profile?.twilio_config
      const activeProvider = provider || smsConfig?.activeProvider || 'twilio'

      let result: any

      if (activeProvider === 'telnyx') {
        const apiKey = smsConfig?.telnyx?.apiKey
        const senderNumber = smsConfig?.telnyx?.senderNumber
        if (!apiKey || !senderNumber) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Telnyx non configuré. Renseignez API Key et Numéro.',
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        result = await sendTelnyxSMS(testNumber, senderNumber, 'Test SMS depuis SMSPro ✓', apiKey)
      } else {
        const accountSid = smsConfig?.twilio?.accountSid
        const authToken = smsConfig?.twilio?.authToken
        const senderNumber = smsConfig?.twilio?.senderNumber
        if (!accountSid || !authToken || !senderNumber) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Twilio non configuré. Renseignez SID, Token et Numéro.',
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        result = await sendTwilioSMS(testNumber, senderNumber, 'Test SMS depuis SMSPro ✓', accountSid, authToken)
      }

      return new Response(JSON.stringify({
        success: result.success,
        error: result.error || null,
        provider: activeProvider,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { campaignId, contactIds, message, senderNumber } = body
```

- [ ] **Step 4: Replace Twilio-only send with provider-aware send**

Replace the send loop (lines 142-183) with:

```typescript
    // Envoyer les SMS un par un
    const results = []
    for (const contact of contacts || []) {
      // Personnaliser le message
      let personalizedMessage = message
        .replace(/\{prenom\}/gi, contact.first_name || '')
        .replace(/\{nom\}/gi, contact.last_name || '')
        .replace(/\{ville\}/gi, contact.city || '')

      let result: any

      if (activeProvider === 'telnyx') {
        result = await sendTelnyxSMS(
          contact.phone,
          from,
          personalizedMessage,
          providerConfig.apiKey,
        )
      } else {
        const projectUrl = Deno.env.get('SUPABASE_URL') || ''
        const projectRef = projectUrl.split('//')[1]?.split('.')[0] || ''
        const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/twilio-status`
        result = await sendTwilioSMS(
          contact.phone,
          from,
          personalizedMessage,
          providerConfig.accountSid,
          providerConfig.authToken,
          webhookUrl
        )
      }

      // Enregistrer le log
      if (campaignId) {
        await supabase.from('sms_logs').insert({
          campaign_id: campaignId,
          contact_id: contact.id,
          phone: contact.phone,
          message: personalizedMessage,
          message_sid: result.messageSid,
          status: result.success ? 'sent' : 'failed',
          error_code: result.code,
          error_message: result.error,
          cost: result.price ? Math.abs(parseFloat(result.price)) : 0.08,
          sent_at: new Date().toISOString(),
        })
      }

      results.push({
        contactId: contact.id,
        phone: contact.phone,
        success: result.success,
        messageSid: result.messageSid,
        error: result.error,
      })
    }
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/send-sms/index.ts
git commit -m "feat: add Telnyx provider support to send-sms Edge Function"
```

---

### Task 3: API Client — Add `testSMSConnection` function

**Files:**
- Modify: `src/lib/apiClient.ts:75-106`

**Interfaces:**
- Produces: `testSMSConnection(provider, testNumber)` → `{ success, error, provider }`

- [ ] **Step 1: Add testSMSConnection function**

Add after the `sendSMS` function (after line 106):

```typescript
/**
 * Teste la connexion SMS avec un provider donné
 */
export async function testSMSConnection(
  provider: 'twilio' | 'telnyx',
  testNumber: string
): Promise<{ data: { success: boolean; error?: string; provider: string } | null; error: string | null }> {
  return callFunction<{ success: boolean; error?: string; provider: string }>('send-sms', {
    action: 'test',
    provider,
    testNumber,
  })
}
```

- [ ] **Step 2: Update sendSMS comment**

Change line 76 from:
```typescript
// SMS - Envoi réel via Twilio
```
to:
```typescript
// SMS - Envoi réel via Twilio ou Telnyx
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/apiClient.ts
git commit -m "feat: add testSMSConnection function to API client"
```

---

### Task 4: Settings UI — New SMSTab with provider selector

**Files:**
- Modify: `src/pages/Settings.tsx:482-703` (SMSTab component)

**Interfaces:**
- Consumes: `fetchUserSettings()`, `updateUserSettings()`, `testSMSConnection()`
- Produces: Full SMSTab with provider selector, dynamic fields, real test

- [ ] **Step 1: Replace SMSTab with new implementation**

Replace the entire `SMSTab` function (lines 482-703) with:

```typescript
// ====================== TAB: SMS ======================
function SMSTab() {
  const { addToast, isDemo } = useStore()
  const [activeProvider, setActiveProvider] = useState<'twilio' | 'telnyx'>('twilio')
  const [twilioConfig, setTwilioConfig] = useState({
    accountSid: '',
    authToken: '',
    senderNumber: '',
    testNumber: '',
  })
  const [telnyxConfig, setTelnyxConfig] = useState({
    apiKey: '',
    senderNumber: '',
    testNumber: '',
  })
  const [showSecrets, setShowSecrets] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)

  const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || ''
  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'YOUR-PROJECT'
  const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/twilio-status`

  useEffect(() => {
    async function load() {
      try {
        if (!isDemo && isSupabaseConfigured()) {
          const data = await fetchUserSettings()
          if (data?.sms_config) {
            setActiveProvider(data.sms_config.activeProvider || 'twilio')
            if (data.sms_config.twilio) {
              setTwilioConfig({
                accountSid: data.sms_config.twilio.accountSid || '',
                authToken: data.sms_config.twilio.authToken || '',
                senderNumber: data.sms_config.twilio.senderNumber || '',
                testNumber: data.sms_config.twilio.testNumber || '',
              })
            }
            if (data.sms_config.telnyx) {
              setTelnyxConfig({
                apiKey: data.sms_config.telnyx.apiKey || '',
                senderNumber: data.sms_config.telnyx.senderNumber || '',
                testNumber: data.sms_config.telnyx.testNumber || '',
              })
            }
          } else if (data?.twilio_config) {
            // Migration fallback
            setTwilioConfig({
              accountSid: data.twilio_config.accountSid || '',
              authToken: data.twilio_config.authToken || '',
              senderNumber: data.twilio_config.senderNumber || '',
              testNumber: '',
            })
          }
        } else {
          const saved = localStorage.getItem('smspro-settings-twilio')
          if (saved) {
            const parsed = JSON.parse(saved)
            setTwilioConfig({
              accountSid: parsed.accountSid || '',
              authToken: parsed.authToken || '',
              senderNumber: parsed.senderNumber || '',
              testNumber: parsed.testNumber || '',
            })
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [isDemo])

  const currentConfig = activeProvider === 'twilio' ? twilioConfig : telnyxConfig
  const isConfigured = activeProvider === 'twilio'
    ? !!(twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.senderNumber)
    : !!(telnyxConfig.apiKey && telnyxConfig.senderNumber)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (activeProvider === 'twilio') {
        if (twilioConfig.accountSid && !twilioConfig.accountSid.startsWith('AC')) {
          addToast({ type: 'error', title: 'Account SID invalide', description: 'Doit commencer par AC...' })
          setSaving(false)
          return
        }
        if (twilioConfig.senderNumber && !/^\+\d{6,15}$/.test(twilioConfig.senderNumber.replace(/[\s\-().]/g, ''))) {
          addToast({ type: 'error', title: 'Numéro invalide', description: 'Format: +CCXXXXXXXXX' })
          setSaving(false)
          return
        }
      } else {
        if (telnyxConfig.senderNumber && !/^\+\d{6,15}$/.test(telnyxConfig.senderNumber.replace(/[\s\-().]/g, ''))) {
          addToast({ type: 'error', title: 'Numéro invalide', description: 'Format: +CCXXXXXXXXX' })
          setSaving(false)
          return
        }
      }

      const smsConfig = {
        activeProvider,
        twilio: twilioConfig,
        telnyx: telnyxConfig,
      }

      if (isDemo || !isSupabaseConfigured()) {
        localStorage.setItem('smspro-settings-twilio', JSON.stringify(smsConfig))
      } else {
        await updateUserSettings({ sms_config: smsConfig })
      }
      addToast({ type: 'success', title: `Configuration ${activeProvider === 'twilio' ? 'Twilio' : 'Telnyx'} enregistrée` })
    } catch (err) {
      addToast({ type: 'error', title: 'Erreur', description: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    const testNumber = activeProvider === 'twilio' ? twilioConfig.testNumber : telnyxConfig.testNumber
    if (!testNumber) {
      addToast({ type: 'error', title: 'Numéro de test requis', description: 'Entrez un numéro pour tester' })
      return
    }
    if (!isConfigured) {
      addToast({ type: 'error', title: 'Configuration incomplète', description: 'Renseignez les identifiants du provider' })
      return
    }

    // Save before testing
    await handleSave()

    setTesting(true)
    try {
      const result = await testSMSConnection(activeProvider, testNumber)
      if (result.error) {
        addToast({ type: 'error', title: 'Échec du test', description: result.error })
      } else if (result.data?.success) {
        addToast({ type: 'success', title: `Test ${activeProvider === 'twilio' ? 'Twilio' : 'Telnyx'} réussi ✓`, description: `SMS envoyé au ${testNumber}` })
      } else {
        addToast({ type: 'error', title: 'Échec du test', description: result.data?.error || 'Erreur inconnue' })
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erreur de test', description: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl)
    setWebhookCopied(true)
    addToast({ type: 'success', title: 'URL webhook copiée !' })
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Provider Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-blue-500" />
            Fournisseur SMS
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Sélectionnez le service d'envoi de SMS à utiliser
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveProvider('twilio')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                activeProvider === 'twilio'
                  ? 'border-red-500 bg-red-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeProvider === 'twilio' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Twilio</p>
                  <p className="text-xs text-slate-500">180+ pays · $15 crédit gratuit</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveProvider('telnyx')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                activeProvider === 'telnyx'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activeProvider === 'telnyx' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Send className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Telnyx</p>
                  <p className="text-xs text-slate-500">190+ pays · $10 crédit gratuit</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Twilio Config */}
      {activeProvider === 'twilio' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-red-500" />
                  Configuration Twilio
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Service d'envoi SMS - Twilio Programmable Messaging
                </p>
              </div>
              <StatusBadge status={isConfigured ? 'active' : 'inactive'} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Account SID"
              value={twilioConfig.accountSid}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              leftIcon={<KeyRound className="h-4 w-4" />}
            />
            <Input
              label="Auth Token"
              type={showSecrets ? 'text' : 'password'}
              value={twilioConfig.authToken}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
              placeholder="Votre token secret Twilio"
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowSecrets(!showSecrets)}>
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              label="Numéro de téléphone expéditeur"
              value={twilioConfig.senderNumber}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, senderNumber: e.target.value })}
              placeholder="+32470123456"
              leftIcon={<PhoneIcon className="h-4 w-4" />}
            />
            <Input
              label="Numéro de test"
              value={twilioConfig.testNumber}
              onChange={(e) => setTwilioConfig({ ...twilioConfig, testNumber: e.target.value })}
              placeholder="+212XXXXXXXXX"
              leftIcon={<PhoneIcon className="h-4 w-4" />}
            />
            <p className="text-xs text-slate-500">
              💡 Format E.164 international. Exemples : 🇧🇪 +32, 🇫🇷 +33, 🇲🇦 +212, 🇨🇦 +1
            </p>
          </CardContent>
        </Card>
      )}

      {/* Telnyx Config */}
      {activeProvider === 'telnyx' && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  Configuration Telnyx
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Service d'envoi SMS - Telnyx Messaging API
                </p>
              </div>
              <StatusBadge status={isConfigured ? 'active' : 'inactive'} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API Key"
              type={showSecrets ? 'text' : 'password'}
              value={telnyxConfig.apiKey}
              onChange={(e) => setTelnyxConfig({ ...telnyxConfig, apiKey: e.target.value })}
              placeholder="KEYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              leftIcon={<KeyRound className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowSecrets(!showSecrets)}>
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              label="Numéro de téléphone expéditeur"
              value={telnyxConfig.senderNumber}
              onChange={(e) => setTelnyxConfig({ ...telnyxConfig, senderNumber: e.target.value })}
              placeholder="+14424511120"
              leftIcon={<PhoneIcon className="h-4 w-4" />}
            />
            <Input
              label="Numéro de test"
              value={telnyxConfig.testNumber}
              onChange={(e) => setTelnyxConfig({ ...telnyxConfig, testNumber: e.target.value })}
              placeholder="+212XXXXXXXXX"
              leftIcon={<PhoneIcon className="h-4 w-4" />}
            />
            <p className="text-xs text-slate-500">
              💡 Format E.164 international. Obtenez votre API Key depuis portal.telnyx.com → Auth → API Keys
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleTest}
          loading={testing}
          disabled={testing || !isConfigured}
        >
          {testing ? 'Test en cours...' : 'Tester la connexion'}
        </Button>
        <Button
          onClick={handleSave}
          loading={saving}
          leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-purple-500" />
            Webhook Status Callback
          </CardTitle>
          <p className="text-xs text-slate-500 mt-1">
            Reçoit les statuts en temps réel (delivered, failed, etc.)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">URL à copier dans votre console SMS :</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 block rounded bg-slate-900 text-slate-100 px-3 py-2 text-xs font-mono break-all">
                {webhookUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyWebhook}
                leftIcon={webhookCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              >
                {webhookCopied ? 'Copié !' : 'Copier'}
              </Button>
            </div>
          </div>

          {activeProvider === 'twilio' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">📋 Configuration Twilio :</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Connectez-vous sur <strong>console.twilio.com</strong></li>
                <li>Allez dans <strong>Phone Numbers → Manage → Active numbers</strong></li>
                <li>Cliquez sur votre numéro</li>
                <li>Section <strong>"Messaging"</strong> → collez l'URL ci-dessus</li>
                <li>Méthode : <strong>POST</strong> → <strong>Save</strong></li>
              </ol>
            </div>
          )}

          {activeProvider === 'telnyx' && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-900 mb-2">📋 Configuration Telnyx :</p>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Connectez-vous sur <strong>portal.telnyx.com</strong></li>
                <li>Allez dans <strong>Messaging → Messaging Profiles</strong></li>
                <li>Cliquez sur votre profil</li>
                <li>Onglet <strong>"Inbound"</strong> → collez l'URL ci-dessus</li>
                <li><strong>Save</strong></li>
              </ol>
            </div>
          )}

          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <p className="text-xs font-semibold text-purple-900 mb-2">🚀 Déploiement de la fonction :</p>
            <code className="block bg-purple-100 px-3 py-2 rounded text-xs font-mono text-purple-900">
              supabase functions deploy send-sms
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "feat: new SMSTab with provider selector, dynamic fields, real test"
```

---

### Task 5: Update error messages for dual provider

**Files:**
- Modify: `src/hooks/useApi.ts:410-420`

**Interfaces:**
- Consumes: error string from Edge Function

- [ ] **Step 1: Update useSendSMS error handling**

Replace lines 410-420 in `useApi.ts`:

```typescript
    if (result.error) {
      addToast({ type: 'error', title: 'Erreur d\'envoi', description: result.error })
    } else if (result.data) {
      if (result.data.failed > 0 && result.data.sent === 0) {
        const firstError = result.data.results?.find((r: any) => r.error)?.error || 'Échoué'
        const hint = firstError.includes('unverified')
          ? ' Compte Twilio trial : vérifiez le numéro dans Twilio Console.'
          : firstError.includes('Telnyx')
          ? ' Vérifiez votre API Key et numéro dans Paramètres → SMS.'
          : ''
        addToast({
          type: 'error',
          title: 'Échec d\'envoi',
          description: `${result.data.failed} SMS échoué(s).${hint}`,
        })
      } else if (result.data.failed > 0) {
        addToast({
          type: 'warning',
          title: 'Envoi partiel',
          description: `✓ ${result.data.sent} envoyés · ✗ ${result.data.failed} échoués`,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Campagne envoyée',
          description: `✓ ${result.data.sent} SMS envoyés avec succès`,
        })
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useApi.ts
git commit -m "feat: update error messages for dual SMS provider"
```

---

### Task 6: Deploy and verify

- [ ] **Step 1: Deploy Edge Function**

```bash
supabase functions deploy send-sms
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual verification**

1. Open Settings → SMS
2. Select Telnyx → Enter API Key, Sender Number, Test Number → Save
3. Click "Tester la connexion" → SMS received ✅
4. Switch to Twilio → Enter credentials → Save → Test → SMS received ✅
5. Send campaign with Telnyx → SMS delivered ✅

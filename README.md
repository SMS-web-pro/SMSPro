# SMSPro — Plateforme de campagnes SMS

> **Plateforme professionnelle de gestion de campagnes SMS marketing**
> Conçue pour fonctionner dans tous les pays et tous les marchés.

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** via Supabase Auth (vrais comptes, pas de simulation)
- 🎭 **Mode démo** accessible depuis la page de login
- 📊 **Dashboard** avec KPIs et graphiques en temps réel
- 👥 **Gestion des contacts** : CRUD, import CSV, filtres, tags
- 💬 **Création de campagnes** : 3 étapes guidées
- 📈 **Tracking d'engagement** : lecture, clics, réponses, désabonnements
- 📥 **Boîte de réception** type messagerie avec détection de mots-clés
- ⚡ **Auto-répondeurs** : STOP, START, OUI, INFO, RDV, etc.
- 🎫 **Coupons** : pourcentage, montant fixe, livraison, cadeau
- 📨 **Invitations** : événements, RSVP, lien unique
- 📉 **Analytics** complètes par campagne
- ⚙️ **Paramètres** : Supabase + Twilio + RGPD
- 🌍 **Multi-pays** : 17 pays supportés, format E.164
- 🇪🇺 **Conformité RGPD** : opt-in, STOP, export, suppression
- 📖 **Mode d'emploi intégré** imprimable en PDF (14 chapitres)
- 🛠️ **Assistant de configuration** au premier lancement

## 🚀 Démarrage rapide

### Pré-requis
- Node.js ≥ 18
- Un projet Supabase (https://supabase.com)
- Un compte Twilio pour l'envoi SMS (optionnel en démo)

### Installation

```bash
npm install
npm run dev
```

L'application démarre sur `http://localhost:5173`.

### Build production

```bash
npm run build
npm run preview
```

## 🛠️ Configuration

### Option 1 : Via l'interface (recommandé et sécurisé)

**Vos credentials ne sont JAMAIS exposés sur GitHub :**

1. Allez sur `/setup` depuis la page de login
2. Suivez les 4 étapes de l'assistant
3. Configurez Supabase dans **Paramètres → Connexion Supabase**
4. Configurez Twilio dans **Paramètres → SMS & Twilio**

Les credentials sont stockés dans le **localStorage** du navigateur (jamais commit sur GitHub).

### Option 2 : Variables d'environnement (pour production)

Pour Vercel/déploiement, configurez via :
- **Vercel** : Settings → Environment Variables

Le fichier `.env.local` est **.gitignored** (jamais sur GitHub).

NE METTEZ JAMAIS vos credentials dans `.env.example` (versionné publiquement).

## 🔐 Sécurité des credentials

- ❌ **Ne jamais** commit `.env.local` ou credentials sur GitHub
- ✅ Utilisez l'interface (`/setup`) pour configurer en local
- ✅ Utilisez les variables d'environnement Vercel en production
- ✅ Activez 2FA sur votre compte Supabase
- ✅ Activez 2FA sur votre compte Twilio

## 📂 Structure du projet

```
src/
├── components/
│   ├── ui/                  # Composants primitifs (Button, Card, Modal...)
│   ├── layout/              # Sidebar, Header, AppLayout
│   ├── campaigns/           # EngagementTracker
│   ├── EmptyState.tsx
│   └── ErrorBoundary.tsx
├── pages/
│   ├── auth/                # Login, Register
│   ├── Dashboard.tsx
│   ├── Contacts.tsx
│   ├── Campaigns.tsx
│   ├── NewCampaign.tsx
│   ├── CampaignDetail.tsx
│   ├── Inbox.tsx
│   ├── AutoReply.tsx
│   ├── Coupons.tsx
│   ├── Invitations.tsx
│   ├── Analytics.tsx
│   ├── Settings.tsx
│   ├── UserGuide.tsx        # 📖 Mode d'emploi imprimable
│   └── SetupWizard.tsx      # 🛠️ Assistant de config
├── store/
│   └── useStore.ts          # Store Zustand global
├── lib/
│   ├── utils.ts             # Helpers principaux
│   ├── intlPhone.ts         # Validation téléphone internationale
│   ├── supabaseClient.ts    # Auth Supabase + gestion credentials
│   ├── demoData.ts          # Données de démo (mode preview)
│   ├── mockData.ts          # Segments prédéfinis
│   └── printUtils.ts         # Export PDF mode d'emploi
├── types/
│   └── index.ts             # Types TypeScript
├── utils/
│   └── cn.ts                # Helper classes Tailwind
└── App.tsx
```

## 🔐 Authentification

L'application utilise **Supabase Auth** pour une vraie sécurité.

### Créer le compte admin

1. **Dashboard Supabase** → Authentication → Users
2. **"Add user" → "Create new user"**
3. Email + mot de passe (min. 8 caractères)
4. ☑️ **Auto Confirm User** (important)
5. **Créer**

Cet utilisateur peut maintenant se connecter sur `/login`.

### Désactiver l'inscription publique

L'inscription publique est désactivée par défaut. Vous seul (en tant qu'admin) créez les comptes.

## 🇪🇺 RGPD

L'application intègre :
- ✅ Consentement opt-in explicite
- ✅ Mot-clé STOP (désabonnement)
- ✅ Export des données personnelles
- ✅ Logs d'audit
- ✅ Rétention configurable

## 🚢 Déploiement

### Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

Configurez les variables d'environnement dans :
**Vercel Dashboard → Settings → Environment Variables**

## 📖 Mode d'emploi

Une page intégrée `/user-guide` documente toutes les fonctionnalités avec captures d'écran. Imprimable en PDF.

## 🧪 Tests

Tests unitaires dans `src/lib/__tests__/utils.test.ts` :

```bash
npm test
```

Couvre : formatage téléphone, validation, dates, XSS, emails.

## 🛡️ Sécurité

- ✅ Échappement HTML (anti-XSS)
- ✅ Validation Zod des formulaires
- ✅ Row Level Security (RLS) Supabase
- ✅ Rate limiting (30 actions/min/client)
- ✅ Sanitization CSV
- ✅ Routes protégées
- ✅ ErrorBoundary global

## 📞 Support

- 📧 Email : support@votre-domaine.com
- 📖 Mode d'emploi : `/user-guide` dans l'app
- 🛠️ Setup : `/setup` depuis la page de login

# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2024-XX-XX

### ✨ Ajouté
- Authentification mono-utilisateur (compte créé manuellement par l'admin)
- Mode démo en lecture/écriture avec données pré-chargées
- Dashboard avec 4 KPIs et graphique d'évolution
- Gestion complète des contacts (CRUD + import CSV + filtres + tags)
- Création de campagnes SMS en 3 étapes guidées
- Tracking d'engagement (taux de lecture, clics, réponses, désabonnements)
- Boîte de réception type messagerie avec détection de mots-clés
- Auto-répondeurs avec actions automatiques (STOP, opt-out, envoi coupon, tags)
- Système de coupons (%, montant fixe, livraison offerte, cadeau)
- Invitations événementielles avec RSVP et lien unique
- Analytics détaillées par campagne
- Paramètres (intégrations SMS provider, base de données, RGPD)
- Mode d'emploi intégré imprimable en PDF (14 chapitres)
- Conformité RGPD complète (opt-in, STOP, export, suppression, audit)

### 🔒 Sécurité
- Échappement HTML automatique sur tous les messages (anti-XSS)
- Validation des numéros au format belge +32XXXXXXXXX
- Sanitization CSV anti-injection lors de l'import
- Rate limiting côté client (max 30 actions/min par type)
- Validation Zod sur tous les formulaires
- Routes protégées (redirection auto vers /login)
- ErrorBoundary global pour éviter les écrans blancs
- Génération d'ID monotone (pas de collision avec Math.random)
- Tokens sécurisés (crypto.randomUUID) pour les invitations

### 🛠️ Technique
- React 19 + Vite 7
- TypeScript 5 strict
- Tailwind CSS 4
- Zustand avec persistance localStorage
- React Router v6
- React Hook Form + Zod
- Recharts pour les graphiques
- Lucide React pour les icônes
- jsPDF + html2canvas pour l'export PDF

### 📚 Documentation
- README.md complet
- Mode d'emploi intégré (14 chapitres)
- Fichier .env.example
- Commentaires JSDoc dans le code critique

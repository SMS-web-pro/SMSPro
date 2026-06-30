#!/bin/bash
# =====================================================
# Script d'initialisation Git + Push GitHub
# Usage : ./scripts/init-git.sh <github-repo-url>
# =====================================================

set -e

REPO_URL=${1:-""}

if [ -z "$REPO_URL" ]; then
  echo "❌ Erreur : URL du repo GitHub requise"
  echo "Usage : ./scripts/init-git.sh git@github.com:username/smspro.git"
  exit 1
fi

echo "🚀 Initialisation du repo Git..."

# 1. Vérifier que c'est bien un projet Node
if [ ! -f "package.json" ]; then
  echo "❌ Erreur : package.json introuvable. Êtes-vous dans le bon dossier ?"
  exit 1
fi

# 2. Vérifier que .gitignore existe
if [ ! -f ".gitignore" ]; then
  echo "❌ Erreur : .gitignore manquant"
  exit 1
fi

# 3. Initialiser Git (si pas déjà fait)
if [ ! -d ".git" ]; then
  echo "📦 git init..."
  git init
  git config user.name "SMSPro Dev"
  git config user.email "dev@smspro.app"
fi

# 4. Vérifier le remote
if git remote get-url origin > /dev/null 2>&1; then
  echo "✅ Remote 'origin' déjà configuré : $(git remote get-url origin)"
  read -p "Voulez-vous le remplacer ? (o/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Oo]$ ]]; then
    git remote set-url origin "$REPO_URL"
    echo "✅ Remote mis à jour"
  fi
else
  echo "🔗 Ajout du remote 'origin'..."
  git remote add origin "$REPO_URL"
fi

# 5. S'assurer d'être sur main
git branch -M main

# 6. Premier commit
echo "📝 Premier commit..."
git add .
git status --short

read -p "Continuer avec le commit ? (o/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
  echo "❌ Annulé"
  exit 1
fi

git commit -m "feat: initial commit - SMSPro v1.0

- Plateforme complète de gestion de campagnes SMS
- Mode mono-utilisateur avec compte créé par admin
- Mode démo accessible depuis la page de login
- 14 chapitres de mode d'emploi imprimable
- Conformité RGPD complète
- Stack : React 19 + Vite 7 + TypeScript + Tailwind 4"

# 7. Push
echo "🚀 Push vers GitHub..."
git push -u origin main

echo ""
echo "✅ Terminé ! Votre projet est sur GitHub :"
echo "   $REPO_URL"
echo ""
echo "📋 Prochaines étapes :"
echo "   1. Connectez-vous sur https://github.com"
echo "   2. Vérifiez que le code est bien présent"
echo "   3. Connectez Vercel : https://vercel.com"
echo "   4. Importez le repo et configurez les env vars"

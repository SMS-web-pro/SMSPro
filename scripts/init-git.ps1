# =====================================================
# Script d'initialisation Git + Push GitHub (Windows PowerShell)
# Usage : .\scripts\init-git.ps1 -RepoUrl "git@github.com:user/repo.git"
# =====================================================

param(
  [Parameter(Mandatory=$true)]
  [string]$RepoUrl
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Initialisation du repo Git..." -ForegroundColor Cyan

# 1. Vérifier package.json
if (-not (Test-Path "package.json")) {
  Write-Host "❌ Erreur : package.json introuvable" -ForegroundColor Red
  exit 1
}

# 2. Vérifier .gitignore
if (-not (Test-Path ".gitignore")) {
  Write-Host "❌ Erreur : .gitignore manquant" -ForegroundColor Red
  exit 1
}

# 3. git init si nécessaire
if (-not (Test-Path ".git")) {
  Write-Host "📦 git init..." -ForegroundColor Yellow
  git init
  git config user.name "SMSPro Dev"
  git config user.email "dev@smspro.app"
}

# 4. Remote
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
  Write-Host "✅ Remote 'origin' déjà configuré : $existingRemote" -ForegroundColor Green
  $response = Read-Host "Voulez-vous le remplacer ? (o/N)"
  if ($response -eq "o") {
    git remote set-url origin $RepoUrl
  }
} else {
  Write-Host "🔗 Ajout du remote 'origin'..." -ForegroundColor Yellow
  git remote add origin $RepoUrl
}

# 5. Branche main
git branch -M main

# 6. Status
Write-Host "📝 Fichiers à commit :" -ForegroundColor Cyan
git add .
git status --short

$response = Read-Host "Continuer avec le commit ? (o/N)"
if ($response -ne "o") {
  Write-Host "❌ Annulé" -ForegroundColor Red
  exit 1
}

git commit -m "feat: initial commit - SMSPro v1.0

- Plateforme complète de gestion de campagnes SMS
- Mode mono-utilisateur avec compte créé par admin
- Mode démo accessible depuis la page de login
- 14 chapitres de mode d'emploi imprimable
- Conformité RGPD complète
- Stack : React 19 + Vite 7 + TypeScript + Tailwind 4"

Write-Host "🚀 Push vers GitHub..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host "✅ Terminé !" -ForegroundColor Green
Write-Host "📋 Prochaines étapes :"
Write-Host "   1. Vérifiez sur GitHub"
Write-Host "   2. Connectez Vercel : https://vercel.com"
Write-Host "   3. Importez le repo et configurez les env vars"

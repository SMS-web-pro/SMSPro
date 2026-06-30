import { useRef } from 'react'
import {
  Download,
  Printer,
  Smartphone,
  Users,
  MessageSquare,
  BarChart3,
  Zap,
  Ticket,
  Mail,
  ArrowRight,
  CheckCircle2,
  Info,
  Eye,
  MousePointerClick,
  AlertCircle,
  Lightbulb,
  AlertTriangle,
  Gift,
  Percent,
} from 'lucide-react'
import jsPDF from 'jspdf'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { printElement } from '@/lib/printUtils'

/**
 * Mode d'emploi complet de SMSPro
 * - Optimisé pour l'impression PDF via le navigateur
 * - Inclut des diagrammes ASCII, captures SVG, tableaux
 * - 14 chapitres couvrant 100% des fonctionnalités
 */
export function UserGuidePage() {
  const contentRef = useRef<HTMLDivElement>(null)
  const { addToast } = useStore()

  const handlePrint = () => {
    if (contentRef.current) {
      printElement(contentRef.current, 'SMSPro - Mode d\'emploi')
    }
  }

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return
    addToast({ type: 'info', title: 'Génération du PDF...', description: 'Cela peut prendre quelques secondes' })
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // marges
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight - 20

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight - 20
      }

      pdf.save('SMSPro-Mode-Emploi.pdf')
      addToast({ type: 'success', title: 'PDF téléchargé !' })
    } catch (err) {
      // Fallback : utiliser la fonction d'impression du navigateur
      addToast({
        type: 'info',
        title: 'Utilisation de l\'impression navigateur',
        description: 'Choisissez "Enregistrer en PDF" dans la fenêtre d\'impression',
      })
      handlePrint()
    }
  }

  return (
    <div className="space-y-6">
      {/* Barre d'actions */}
      <div className="sticky top-16 z-10 bg-slate-50 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900">📖 Mode d'emploi SMSPro</h1>
          <p className="text-xs text-slate-500">Guide complet d'utilisation • 14 chapitres</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
            Imprimer
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} leftIcon={<Download className="h-4 w-4" />}>
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Contenu imprimable */}
      <div ref={contentRef} className="bg-white">
        <GuideContent />
      </div>
    </div>
  )
}

function GuideContent() {
  return (
    <article className="max-w-4xl mx-auto p-8 lg:p-12 space-y-12 prose prose-slate max-w-none">
      {/* === COUVERTURE === */}
      <header className="text-center pb-12 border-b-2 border-slate-200">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl shadow-primary-200 mb-6">
          <Smartphone className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-3">SMSPro</h1>
        <p className="text-xl text-slate-600 mb-2">Mode d'emploi complet</p>
        <p className="text-sm text-slate-500">Plateforme professionnelle de gestion de campagnes SMS</p>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
          <span>📖 14 chapitres</span>
          <span>•</span>
          <span>🎯 100% des fonctionnalités</span>
          <span>•</span>
          <span>📅 v1.0 — {new Date().toLocaleDateString('fr-BE', { year: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {/* === SOMMAIRE === */}
      <section>
        <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 text-base font-bold">📑</span>
          Sommaire
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose">
          {[
            { n: 1, t: 'Introduction & premiers pas', i: '🚀' },
            { n: 2, t: 'Connexion & authentification', i: '🔐' },
            { n: 3, t: 'Tableau de bord (Dashboard)', i: '📊' },
            { n: 4, t: 'Gestion des contacts', i: '👥' },
            { n: 5, t: 'Création d\'une campagne SMS', i: '✉️' },
            { n: 6, t: 'Suivi de l\'engagement', i: '📈' },
            { n: 7, t: 'Boîte de réception SMS', i: '📥' },
            { n: 8, t: 'Auto-répondeurs (mots-clés)', i: '⚡' },
            { n: 9, t: 'Coupons & promotions', i: '🎫' },
            { n: 10, t: 'Invitations événementielles', i: '📨' },
            { n: 11, t: 'Analytics détaillées', i: '📉' },
            { n: 12, t: 'Paramètres & intégrations', i: '⚙️' },
            { n: 13, t: 'Conformité RGPD', i: '🇪🇺' },
            { n: 14, t: 'FAQ & résolution de problèmes', i: '❓' },
          ].map((c) => (
            <a
              key={c.n}
              href={`#chapitre-${c.n}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <span className="text-2xl">{c.i}</span>
              <div>
                <p className="text-xs text-slate-500">Chapitre {c.n}</p>
                <p className="text-sm font-medium text-slate-900">{c.t}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* === CHAPITRE 1 === */}
      <Chapter num={1} title="Introduction & premiers pas" icon="🚀">
        <p>
          Bienvenue dans <strong>SMSPro</strong>, votre plateforme tout-en-un pour gérer des campagnes SMS marketing professionnelles,
          conformes RGPD et optimisées pour la Belgique.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">🎯 Que pouvez-vous faire avec SMSPro ?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose">
          {[
            { i: <Users className="h-5 w-5" />, t: 'Gérer des contacts', d: 'Import CSV, ajout manuel, tags, segmentation' },
            { i: <MessageSquare className="h-5 w-5" />, t: 'Créer des campagnes', d: 'SMS personnalisés, envoi immédiat ou planifié' },
            { i: <Zap className="h-5 w-5" />, t: 'Auto-répondre', d: 'Mots-clés STOP, OUI, INFO... configurables' },
            { i: <Ticket className="h-5 w-5" />, t: 'Codes promo', d: 'Coupons avec tracking des utilisations' },
            { i: <Mail className="h-5 w-5" />, t: 'Invitations', d: 'Événements, RSVP, lien unique' },
            { i: <BarChart3 className="h-5 w-5" />, t: 'Analytics', d: 'Taux de lecture, clics, conversions' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600 flex-shrink-0">
                {f.i}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{f.t}</p>
                <p className="text-xs text-slate-600">{f.d}</p>
              </div>
            </div>
          ))}
        </div>

        <InfoBox type="info" title="Architecture technique (résumé)">
          SMSPro s'appuie sur les meilleures technologies : <strong>React</strong> pour l'interface, <strong>Twilio</strong> pour l'envoi
          de SMS, et une base de données sécurisée pour stocker vos contacts et campagnes.
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 2 === */}
      <Chapter num={2} title="Connexion & authentification" icon="🔐">
        <p>Pour des raisons de sécurité, <strong>chaque compte est créé manuellement par l'administrateur</strong>.</p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Se connecter à votre compte</h3>
        <Step n={1} title="Accéder à la page de connexion">
          Ouvrez votre navigateur et allez sur l'URL de SMSPro. Vous arrivez sur la page de connexion :
        </Step>
        <ScreenshotMockup title="Page de connexion">
          <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 mb-3">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">SMSPro</h3>
              <p className="text-xs text-slate-500">Connexion</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Email</label>
                <div className="mt-1 h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 flex items-center text-xs text-slate-400">
                  vous@entreprise.com
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Mot de passe</label>
                <div className="mt-1 h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 flex items-center text-xs text-slate-400">
                  ••••••••
                </div>
              </div>
              <div className="h-10 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center justify-center">
                Se connecter
              </div>
            </div>
          </div>
        </ScreenshotMockup>

        <Step n={2} title="Saisir vos identifiants">
          Renseignez l'email et le mot de passe qui vous ont été communiqués par votre administrateur.
        </Step>
        <Step n={3} title="Cliquer sur Se connecter">
          Vous serez redirigé automatiquement vers le tableau de bord.
        </Step>

        <InfoBox type="success" title="💡 Astuce">
          Cochez la case <em>"Rester connecté"</em> pour ne pas avoir à ressaisir vos identifiants à chaque visite.
        </InfoBox>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Découvrir l'application avec la démo</h3>
        <p>
          Vous voulez explorer l'application <strong>sans créer de compte</strong> ? Cliquez sur le bouton
          <strong> "Voir la démo"</strong> en bas de la page de connexion. Vous accédez à toutes les fonctionnalités
          avec des données de démonstration pré-chargées.
        </p>

        <InfoBox type="warning" title="⚠️ Mode démo">
          Les données modifiées en mode démo sont <strong>locales uniquement</strong>. Elles disparaissent
          à la déconnexion. Pour sauvegarder votre travail, utilisez votre vrai compte.
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 3 === */}
      <Chapter num={3} title="Tableau de bord (Dashboard)" icon="📊">
        <p>
          Le tableau de bord est votre <strong>vue d'ensemble</strong>. Il affiche les indicateurs clés (KPIs)
          et les graphiques de performance.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Anatomie du tableau de bord</h3>
        <ScreenshotMockup title="Dashboard">
          <div className="space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Contacts', v: '25', c: 'bg-blue-50 text-blue-700' },
                { l: 'Campagnes', v: '4', c: 'bg-emerald-50 text-emerald-700' },
                { l: 'Délivrés', v: '95%', c: 'bg-purple-50 text-purple-700' },
                { l: 'Coût', v: '4,16€', c: 'bg-orange-50 text-orange-700' },
              ].map((k) => (
                <div key={k.l} className={`p-2 rounded-lg ${k.c}`}>
                  <p className="text-[9px] font-medium opacity-80">{k.l}</p>
                  <p className="text-base font-bold">{k.v}</p>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-xs font-semibold mb-2">Évolution des envois (30j)</p>
              <div className="h-20 flex items-end gap-1">
                {[10, 15, 22, 18, 25, 30, 28, 35, 32, 40, 45, 42, 50, 48, 55, 52, 60, 58, 65, 62, 70, 68, 75, 72, 80, 78, 85, 82, 90, 88].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-primary-500 to-primary-300 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
        </ScreenshotMockup>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Les 4 KPIs essentiels</h3>
        <table className="w-full text-sm not-prose">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">KPI</th>
              <th className="px-4 py-2 text-left font-semibold">Signification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr><td className="px-4 py-2 font-medium">📇 Contacts actifs</td><td className="px-4 py-2">Nombre de contacts ayant donné leur consentement (RGPD)</td></tr>
            <tr><td className="px-4 py-2 font-medium">✉️ Campagnes (mois)</td><td className="px-4 py-2">Campagnes créées ou envoyées ce mois-ci</td></tr>
            <tr><td className="px-4 py-2 font-medium">✅ Taux de délivrance</td><td className="px-4 py-2">% de SMS confirmés livrés par l'opérateur (Twilio)</td></tr>
            <tr><td className="px-4 py-2 font-medium">💰 Coût total</td><td className="px-4 py-2">Somme des coûts d'envoi (≈ 0.08€ / SMS)</td></tr>
          </tbody>
        </table>

        <InfoBox type="info" title="Actions rapides">
          3 boutons sont disponibles en haut du dashboard : <strong>Nouvelle campagne</strong>,
          <strong>Importer contacts</strong>, <strong>Voir analytics</strong>. Utilisez-les pour aller plus vite !
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 4 === */}
      <Chapter num={4} title="Gestion des contacts" icon="👥">
        <p>
          Les contacts sont le cœur de votre activité. SMSPro vous permet de les gérer de manière fine,
          avec respect du RGPD.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Ajouter un contact manuellement</h3>
        <Step n={1} title="Aller dans le menu Contacts">Cliquez sur <strong>Contacts</strong> dans la sidebar.</Step>
        <Step n={2} title="Cliquer sur Ajouter contact">Bouton bleu en haut à droite.</Step>
        <Step n={3} title="Remplir le formulaire">
          Au minimum, le <strong>téléphone au format +32XXXXXXXXX</strong> est requis. Les autres champs sont optionnels.
        </Step>
        <Step n={4} title="Cocher opt-in (RGPD)">
          <strong>Important</strong> : ne cochez "Consentement opt-in donné" que si le contact a explicitement
          accepté de recevoir vos SMS. Sinon vous risquez de lourdes sanctions RGPD.
        </Step>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Importer un fichier CSV</h3>
        <p>L'import CSV vous permet de charger des centaines de contacts d'un coup :</p>

        <Step n={1} title="Préparer votre CSV">
          Créez un fichier avec ces colonnes : <code className="px-1 bg-slate-100 rounded">phone</code>,
          <code className="px-1 bg-slate-100 rounded">first_name</code>,
          <code className="px-1 bg-slate-100 rounded">last_name</code>,
          <code className="px-1 bg-slate-100 rounded">email</code>,
          <code className="px-1 bg-slate-100 rounded">city</code>.
        </Step>

        <CodeBlock language="csv">
{`phone,first_name,last_name,email,city
+32470123456,Lucas,Peeters,lucas@email.com,Bruxelles
+32471234567,Emma,Janssens,emma@email.com,Anvers
+32472345678,Hugo,Martin,hugo@email.com,Liège`}
        </CodeBlock>

        <Step n={2} title="Cliquer sur Importer CSV">Bouton en haut de la page contacts.</Step>
        <Step n={3} title="Sélectionner votre fichier">
          Les numéros invalides sont automatiquement rejetés avec un rapport d'erreurs.
        </Step>
        <Step n={4} title="Vérifier l'aperçu puis Importer">
          Un aperçu vous montre les X premiers contacts à importer. Cliquez sur <strong>Importer</strong>.
        </Step>

        <InfoBox type="warning" title="⚠️ Validation automatique">
          Les numéros sont normalisés au format international (<code>+32...</code>). Tout numéro invalide
          est rejeté. Les doublons (même téléphone) sont ignorés automatiquement.
        </InfoBox>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Filtrer et rechercher</h3>
        <ul className="space-y-2">
          <li><strong>🔍 Recherche</strong> : tapez un nom, téléphone ou email dans la barre de recherche</li>
          <li><strong>Filtre Statut</strong> : Tous / Actifs / Désabonnés</li>
          <li><strong>Filtre Ville</strong> : sélectionnez une ou plusieurs villes</li>
          <li><strong>Tri</strong> : cliquez sur les en-têtes de colonnes</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Actions en masse</h3>
        <p>Cochez plusieurs contacts pour :</p>
        <ul className="space-y-1">
          <li>📤 <strong>Exporter en CSV</strong> la sélection</li>
          <li>🏷️ <strong>Ajouter des tags</strong> (VIP, Newsletter...)</li>
          <li>🗑️ <strong>Supprimer</strong> (irréversible)</li>
        </ul>
      </Chapter>

      {/* === CHAPITRE 5 === */}
      <Chapter num={5} title="Création d'une campagne SMS" icon="✉️">
        <p>
          La création d'une campagne se fait en <strong>3 étapes guidées</strong> : message → destinataires → planification.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Vue d'ensemble du processus</h3>
        <FlowDiagram steps={[
          { n: '1', t: 'Composer le message', d: 'Texte + variables' },
          { n: '2', t: 'Choisir les destinataires', d: 'Tous / Segment / Manuel' },
          { n: '3', t: 'Planifier l\'envoi', d: 'Immédiat ou plus tard' },
        ]} />

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Étape 1 : Composer le message</h3>
        <ScreenshotMockup title="Éditeur de message">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <label className="text-xs font-semibold text-slate-700">Message SMS</label>
            <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              Bonjour <span className="bg-amber-100 px-1 rounded">{'{prenom}'}</span>, profitez de -20% avec le code <strong>PROMO20</strong>. Valable jusqu'au 31/12.
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>112 / 160 caractères • 1 SMS</span>
              <span>Variables: {'{prenom}'} {'{nom}'} {'{ville}'}</span>
            </div>
          </div>
        </ScreenshotMockup>

        <h4 className="text-lg font-semibold text-slate-900 mt-4 mb-2">Les variables de personnalisation</h4>
        <table className="w-full text-sm not-prose">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left">Variable</th>
              <th className="px-4 py-2 text-left">Remplacée par</th>
              <th className="px-4 py-2 text-left">Exemple</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr><td className="px-4 py-2"><code>{'{prenom}'}</code></td><td className="px-4 py-2">Prénom du contact</td><td className="px-4 py-2">Lucas</td></tr>
            <tr><td className="px-4 py-2"><code>{'{nom}'}</code></td><td className="px-4 py-2">Nom de famille</td><td className="px-4 py-2">Peeters</td></tr>
            <tr><td className="px-4 py-2"><code>{'{ville}'}</code></td><td className="px-4 py-2">Ville du contact</td><td className="px-4 py-2">Bruxelles</td></tr>
          </tbody>
        </table>

        <InfoBox type="tip" title="📏 Limites SMS">
          <ul className="text-xs space-y-1 mt-1">
            <li>• 1 SMS = 160 caractères (alphabet latin)</li>
            <li>• Caractères spéciaux (€, é, à) = comptés double</li>
            <li>• Au-delà de 160 caractères = 2, 3, 4... SMS facturés</li>
          </ul>
        </InfoBox>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Étape 2 : Choisir les destinataires</h3>
        <p>Trois modes de sélection :</p>
        <ul className="space-y-2">
          <li><strong>Tous les contacts actifs</strong> : envoi massif aux contacts ayant consenti</li>
          <li><strong>Segment spécifique</strong> : ex. "Clients VIP" ou "Contacts Bruxelles"</li>
          <li><strong>Sélection manuelle</strong> : choisir un par un (utile pour tests)</li>
        </ul>
        <InfoBox type="info" title="💡 Astuce">
          Un récapitulatif affiche en temps réel : <strong>"X contacts ciblés"</strong> et
          <strong> "Coût estimé : Y€"</strong> (0.08€ / SMS).
        </InfoBox>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Étape 3 : Planifier l'envoi</h3>
        <ul className="space-y-2">
          <li><strong>Immédiat</strong> : la campagne part dès que vous cliquez sur "Envoyer"</li>
          <li><strong>Planifier</strong> : choisissez date + heure. Fuseau Europe/Brussels.</li>
        </ul>

        <h4 className="text-lg font-semibold text-slate-900 mt-4 mb-2">🧪 Tester avant d'envoyer</h4>
        <p>
          Avant l'envoi final, vous pouvez <strong>envoyer un SMS test</strong> à votre propre numéro
          pour vérifier le rendu sur un vrai téléphone.
        </p>
      </Chapter>

      {/* === CHAPITRE 6 === */}
      <Chapter num={6} title="Suivi de l'engagement" icon="📈">
        <p>
          Une fois votre campagne envoyée, suivez en temps réel les performances détaillées.
        </p>

        <InfoBox type="info" title="💡 Comment fonctionne le tracking ?">
          Les SMS standards (protocole Twilio) confirment uniquement la <strong>délivrance</strong> (SMS reçu
          par l'opérateur). Pour savoir si le destinataire a <strong>lu</strong> le message, SMSPro intègre
          un <strong>lien court tracké</strong> dans chaque SMS. Le clic sur ce lien = confirmation de lecture.
        </InfoBox>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Les 4 métriques d'engagement</h3>
        <table className="w-full text-sm not-prose">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left">Métrique</th>
              <th className="px-4 py-2 text-left">Signification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3 text-emerald-600" /> <strong>Taux de lecture</strong></span></td>
              <td className="px-4 py-2">% de contacts ayant cliqué le lien tracké (= lu)</td>
            </tr>
            <tr>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3 text-purple-600" /> <strong>Taux de clic</strong></span></td>
              <td className="px-4 py-2">% de lecteurs ayant cliqué vers votre URL cible</td>
            </tr>
            <tr>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3 text-amber-600" /> <strong>Réponses</strong></span></td>
              <td className="px-4 py-2">Nombre de contacts ayant répondu (mots-clés)</td>
            </tr>
            <tr>
              <td className="px-4 py-2"><span className="inline-flex items-center gap-1"><AlertCircle className="h-3 w-3 text-red-600" /> <strong>Désabonnements</strong></span></td>
              <td className="px-4 py-2">Contacts ayant répondu STOP (RGPD)</td>
            </tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Détail d'une campagne</h3>
        <p>Depuis la liste des campagnes, cliquez sur une campagne pour voir :</p>
        <ul className="space-y-1">
          <li>📊 <strong>4 KPIs</strong> (envoyés, délivrés, échoués, coût)</li>
          <li>📈 <strong>Graphique temporel</strong> des envois par heure</li>
          <li>👁️ <strong>Onglet Engagement</strong> avec entonnoir et pie chart</li>
          <li>📋 <strong>Onglet Logs détaillés</strong> : table par destinataire avec filtres (lus/non lus/cliqués)</li>
          <li>📤 <strong>Export CSV</strong> pour analyse Excel</li>
        </ul>
      </Chapter>

      {/* === CHAPITRE 7 === */}
      <Chapter num={7} title="Boîte de réception SMS" icon="📥">
        <p>
          Tous les <strong>réponses SMS reçues</strong> de vos contacts apparaissent dans la boîte de réception.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Navigation</h3>
        <p>L'interface type messagerie :</p>
        <ul className="space-y-1">
          <li>📋 <strong>Colonne gauche</strong> : liste des conversations avec filtres (Toutes / Non lues / Auto / Manuel)</li>
          <li>💬 <strong>Colonne droite</strong> : détail de la conversation + zone de réponse</li>
          <li>🔴 <strong>Badge rouge</strong> dans la sidebar = nombre de messages non lus</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Détection des mots-clés</h3>
        <p>Quand un contact envoie <code className="px-1 bg-slate-100 rounded">"OUI"</code>, vous voyez :</p>
        <ScreenshotMockup title="Message reçu avec mot-clé détecté">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">LP</div>
                <div>
                  <p className="text-xs font-semibold">Lucas Peeters</p>
                  <p className="text-[10px] text-slate-500">+32470123456</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                  <Zap className="h-2.5 w-2.5" /> OUI
                </span>
              </div>
              <p className="text-xs">OUI</p>
            </div>
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
              <p className="text-[10px] font-semibold text-emerald-900">⚡ Auto-répondeur déclenché</p>
              <p className="text-[10px] text-emerald-800">Réponse automatique envoyée</p>
            </div>
          </div>
        </ScreenshotMockup>
      </Chapter>

      {/* === CHAPITRE 8 === */}
      <Chapter num={8} title="Auto-répondeurs (mots-clés)" icon="⚡">
        <p>
          Configurez des <strong>réponses automatiques</strong> quand un contact envoie un mot-clé par SMS.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Mots-clés recommandés</h3>
        <table className="w-full text-sm not-prose">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left">Mot-clé</th>
              <th className="px-4 py-2 text-left">Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr><td className="px-4 py-2"><code className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">STOP</code></td><td className="px-4 py-2">Désabonnement (RGPD obligatoire)</td></tr>
            <tr><td className="px-4 py-2"><code className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">START</code></td><td className="px-4 py-2">Réinscription</td></tr>
            <tr><td className="px-4 py-2"><code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">OUI</code></td><td className="px-4 py-2">Confirmation d'intérêt</td></tr>
            <tr><td className="px-4 py-2"><code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">INFO</code></td><td className="px-4 py-2">Demande d'informations</td></tr>
            <tr><td className="px-4 py-2"><code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">RDV</code></td><td className="px-4 py-2">Prise de rendez-vous</td></tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Créer une règle</h3>
        <Step n={1} title="Aller dans Auto-répondeurs">Menu de gauche.</Step>
        <Step n={2} title="Nouvelle règle">Cliquez sur le bouton bleu.</Step>
        <Step n={3} title="Configurer">
          <ul className="space-y-1 mt-2 text-sm">
            <li>• <strong>Mot-clé</strong> : ex. <code>STOP</code> (insensible à la casse par défaut)</li>
            <li>• <strong>Type de correspondance</strong> : Exact / Contient / Commence par</li>
            <li>• <strong>Message de réponse</strong> : ce qui sera envoyé automatiquement</li>
          </ul>
        </Step>
        <Step n={4} title="Ajouter des actions automatiques (optionnel)">
          <ul className="space-y-1 mt-2 text-sm">
            <li>• 🔴 <strong>Désactiver les SMS</strong> (marquer le contact opt-out)</li>
            <li>• 🎁 <strong>Envoyer un coupon</strong> automatiquement</li>
            <li>• 🏷️ <strong>Ajouter un tag</strong> au contact (ex: "engaged")</li>
          </ul>
        </Step>

        <InfoBox type="warning" title="⚠️ STOP est obligatoire (RGPD)">
          La règle <strong>STOP</strong> avec l'action "Désactiver les SMS" est <strong>obligatoire</strong>
          pour respecter le RGPD. Sans elle, vous risquez de lourdes sanctions.
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 9 === */}
      <Chapter num={9} title="Coupons & promotions" icon="🎫">
        <p>
          Créez des <strong>codes promo</strong> que vos contacts utilisent en magasin ou en ligne.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">4 types de coupons</h3>
        <div className="grid grid-cols-2 gap-3 not-prose">
          <div className="rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-500 to-blue-700 p-3 text-white">
            <Percent className="h-5 w-5 mb-1" />
            <p className="text-xs opacity-90">Pourcentage</p>
            <p className="text-2xl font-bold">-20%</p>
          </div>
          <div className="rounded-lg border-2 border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-700 p-3 text-white">
            <span className="text-xl">€</span>
            <p className="text-xs opacity-90 mt-1">Montant fixe</p>
            <p className="text-2xl font-bold">-5€</p>
          </div>
          <div className="rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-500 to-purple-700 p-3 text-white">
            <span className="text-xl">🚚</span>
            <p className="text-xs opacity-90 mt-1">Livraison</p>
            <p className="text-2xl font-bold">GRATUIT</p>
          </div>
          <div className="rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-500 to-orange-600 p-3 text-white">
            <Gift className="h-5 w-5 mb-1" />
            <p className="text-xs opacity-90">Cadeau</p>
            <p className="text-2xl font-bold">GIFT</p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Suivi des coupons</h3>
        <p>Pour chaque coupon, SMSPro affiche :</p>
        <ul className="space-y-1">
          <li>📊 <strong>Nombre d'utilisations</strong> / max autorisé</li>
          <li>📈 <strong>Barre de progression</strong> visuelle</li>
          <li>💰 <strong>Revenu généré</strong> (somme des commandes)</li>
          <li>👤 <strong>Limite par contact</strong> (ex: 1 fois par client)</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">🧪 Tester un coupon</h3>
        <p>Une zone de test permet de simuler une utilisation en sélectionnant un contact + un code.
        Utile pour vérifier que tout fonctionne avant d'envoyer la campagne.</p>
      </Chapter>

      {/* === CHAPITRE 10 === */}
      <Chapter num={10} title="Invitations événementielles" icon="📨">
        <p>
          Envoyez des <strong>invitations personnalisées</strong> avec lien unique de réponse.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Types d'invitations</h3>
        <ul className="space-y-1">
          <li>🎉 <strong>Événement</strong> : soirée, salon, conférence</li>
          <li>📅 <strong>Rendez-vous</strong> : confirmation RDV médical, coiffeur...</li>
          <li>🎁 <strong>Offre spéciale</strong> : invitation VIP à une vente privée</li>
          <li>⭐ <strong>VIP</strong> : accès anticipé à une collection</li>
          <li>⏰ <strong>Rappel</strong> : événement à venir</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Suivi des réponses</h3>
        <p>Pour chaque invitation, voyez :</p>
        <ul className="space-y-1">
          <li>📊 <strong>Pie chart</strong> des réponses (accepté / refusé / peut-être / en attente)</li>
          <li>👥 <strong>Compteur d'invités</strong> (1 personne + accompagnants)</li>
          <li>🔗 <strong>Lien unique</strong> copiable pour partage direct</li>
        </ul>

        <InfoBox type="info" title="Astuce">
          Cliquez sur une invitation pour voir le détail des réponses et tester différents scénarios.
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 11 === */}
      <Chapter num={11} title="Analytics détaillées" icon="📉">
        <p>
          La page <strong>Analytics</strong> vous donne une vue d'ensemble de vos performances sur la durée.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">KPIs disponibles</h3>
        <table className="w-full text-sm not-prose">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left">KPI</th>
              <th className="px-4 py-2 text-left">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr><td className="px-4 py-2"><strong>SMS envoyés</strong></td><td className="px-4 py-2">Volume total d'envoi sur la période</td></tr>
            <tr><td className="px-4 py-2"><strong>Délivrés</strong></td><td className="px-4 py-2">Confirmés livrés par l'opérateur + taux</td></tr>
            <tr><td className="px-4 py-2"><strong>Échoués</strong></td><td className="px-4 py-2">Numéros invalides, blacklistés, etc.</td></tr>
            <tr><td className="px-4 py-2"><strong>Coût total</strong></td><td className="px-4 py-2">Somme des SMS facturés</td></tr>
          </tbody>
        </table>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Graphiques</h3>
        <ul className="space-y-1">
          <li>📈 <strong>Évolution sur 30 jours</strong> : courbe envoyés vs délivrés</li>
          <li>🥧 <strong>Répartition globale</strong> : pie chart des statuts</li>
          <li>🏆 <strong>Top campagnes</strong> : classement par performance</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Insights intelligents</h3>
        <InfoBox type="success" title="Recommandations">
          SMSPro affiche automatiquement :
          <ul className="text-xs space-y-1 mt-2">
            <li>✓ Votre <strong>meilleur taux de délivrance</strong> vs moyenne secteur (95%)</li>
            <li>✓ Le <strong>meilleur créneau horaire</strong> pour envoyer (14h-16h en semaine)</li>
            <li>✓ Le <strong>délai moyen de délivrance</strong> (≈ 2.4s en Belgique)</li>
          </ul>
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 12 === */}
      <Chapter num={12} title="Paramètres & intégrations" icon="⚙️">
        <p>Configurez votre compte et vos intégrations depuis la page Paramètres.</p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Onglet Général</h3>
        <ul className="space-y-1">
          <li>Nom de l'entreprise</li>
          <li>Email de contact</li>
          <li>Fuseau horaire (Europe/Brussels par défaut)</li>
          <li>Langue de l'interface (FR / NL / EN)</li>
          <li>Logo personnalisé</li>
        </ul>

        <h3 className="text-xl font-bold text-slate-900 mt-8 mb-3">Onglet Intégrations</h3>
        <p>Deux intégrations clés :</p>

        <h4 className="text-lg font-semibold text-slate-900 mt-4 mb-2">📱 SMS Provider</h4>
        <p>Connectez votre compte pour l'envoi des SMS. Renseignez :</p>
        <ul className="space-y-1 text-sm">
          <li>• Account SID</li>
          <li>• Auth Token</li>
          <li>• Numéro de téléphone expéditeur (format international)</li>
        </ul>
        <p className="text-xs text-slate-500 mt-2">Cliquez sur <strong>"Tester"</strong> pour vérifier la connexion.</p>

        <h4 className="text-lg font-semibold text-slate-900 mt-4 mb-2">💾 Base de données</h4>
        <p>Connexion à votre base PostgreSQL sécurisée (URL + clés).</p>
      </Chapter>

      {/* === CHAPITRE 13 === */}
      <Chapter num={13} title="Conformité RGPD" icon="🇪🇺">
        <p>
          SMSPro est conçu pour être <strong>100% conforme RGPD</strong>. Voici ce que vous devez savoir.
        </p>

        <h3 className="text-xl font-bold text-slate-900 mt-6 mb-3">Les 5 piliers RGPD</h3>
        <div className="space-y-3 not-prose">
          {[
            { i: '✅', t: 'Consentement opt-in explicite', d: 'Chaque contact coche lui-même la case de consentement (jamais de pré-coché).' },
            { i: '🚫', t: 'Désinscription facile (STOP)', d: 'Un simple STOP par SMS désabonne immédiatement le contact.' },
            { i: '📤', t: 'Droit à l\'export (Art. 15 & 20)', d: 'Le contact peut demander ses données : elles sont exportables en JSON.' },
            { i: '🗑️', t: 'Droit à l\'effacement (Art. 17)', d: 'Suppression complète de toutes les données du contact.' },
            { i: '📋', t: 'Logs d\'audit', d: 'Toutes les actions sont tracées pour prouver la conformité.' },
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200">
              <span className="text-2xl">{p.i}</span>
              <div>
                <p className="font-semibold text-slate-900">{p.t}</p>
                <p className="text-xs text-slate-600">{p.d}</p>
              </div>
            </div>
          ))}
        </div>

        <InfoBox type="warning" title="⚠️ Bonnes pratiques">
          <ul className="text-xs space-y-1 mt-1">
            <li>• N'achetez <strong>jamais</strong> de listes de numéros</li>
            <li>• Incluez toujours un moyen de se désinscrire dans vos messages</li>
            <li>• Documentez la preuve du consentement (date, source, IP)</li>
            <li>• Ne conservez pas les données plus longtemps que nécessaire</li>
          </ul>
        </InfoBox>
      </Chapter>

      {/* === CHAPITRE 14 === */}
      <Chapter num={14} title="FAQ & résolution de problèmes" icon="❓">
        <h3 className="text-xl font-bold text-slate-900 mt-2 mb-4">Questions fréquentes</h3>

        <FAQ q="Mon SMS n'a pas été délivré. Pourquoi ?">
          <p>Raisons possibles :</p>
          <ul className="text-sm space-y-1">
            <li>• Numéro invalide ou inexistant</li>
            <li>• Opérateur en panne</li>
            <li>• Contact blacklisté (a répondu STOP)</li>
            <li>• Téléphone éteint depuis + de 24h</li>
          </ul>
        </FAQ>

        <FAQ q="Comment savoir si quelqu'un a lu mon SMS ?">
          <p>Incluez un <strong>lien tracké</strong> dans votre message. Le clic sur ce lien = confirmation de lecture.
          Vous verrez le taux dans l'onglet Engagement de chaque campagne.</p>
        </FAQ>

        <FAQ q="Puis-je envoyer à l'étranger ?">
          <p>Oui, les SMS fonctionnent à l'international. Les tarifs varient selon la destination.
          Vérifiez les tarifs Twilio avant d'envoyer.</p>
        </FAQ>

        <FAQ q="Comment recharger mon compte ?">
          <p>Allez dans Paramètres → Intégrations → SMS Provider pour vérifier votre solde actuel.
          Le rechargement se fait via la console du fournisseur SMS.</p>
        </FAQ>

        <FAQ q="Puis-je programmer un envoi à l'avance ?">
          <p>Oui ! Lors de la création d'une campagne (étape 3), choisissez <strong>"Planifier pour plus tard"</strong>
          et sélectionnez date + heure.</p>
        </FAQ>

        <FAQ q="Comment exporter mes contacts ?">
          <p>Sélectionnez les contacts (ou tous), puis cliquez sur <strong>"Exporter"</strong>. Un fichier CSV est téléchargé.</p>
        </FAQ>

        <FAQ q="Que se passe-t-il si un contact répond STOP ?">
          <p>Avec l'auto-répondeur STOP configuré :
          <ol className="text-sm space-y-1 mt-1 list-decimal list-inside">
            <li>Le contact reçoit une confirmation de désabonnement</li>
            <li>Son statut passe automatiquement à "Désabonné"</li>
            <li>Il ne recevra plus aucun de vos SMS</li>
          </ol>
        </p>
        </FAQ>

        <FAQ q="Y a-t-il une limite de SMS par jour ?">
          <p>Pas de limite technique, mais votre fournisseur SMS peut avoir un seuil. En Belgique,
          comptez environ 100-500 SMS/minute selon votre forfait.</p>
        </FAQ>

        <hr className="my-12 border-slate-200" />

        <div className="text-center py-8">
          <p className="text-sm text-slate-500 mb-2">Besoin d'aide supplémentaire ?</p>
          <p className="text-base font-semibold text-slate-900">
            📧 support@votre-domaine.com
          </p>
          <p className="text-xs text-slate-400 mt-4">
            SMSPro v1.0 • © {new Date().getFullYear()} • Conforme RGPD
          </p>
        </div>
      </Chapter>
    </article>
  )
}

// ==================== COMPOSANTS UTILITAIRES ====================

function Chapter({ num, title, icon, children }: { num: number; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={`chapitre-${num}`} className="scroll-mt-20">
      <h2 className="text-3xl font-bold text-slate-900 mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xl flex-shrink-0">
          {icon}
        </span>
        <div>
          <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">Chapitre {num}</span>
          <br />
          <span>{title}</span>
        </div>
      </h2>
      <div className="text-slate-700 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 my-3 not-prose">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-bold flex-shrink-0">
        {n}
      </div>
      <div className="flex-1 pt-1">
        <p className="font-semibold text-slate-900 mb-1">{title}</p>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  )
}

function InfoBox({ type, title, children }: { type: 'info' | 'success' | 'warning' | 'tip'; title: string; children: React.ReactNode }) {
  const config = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: <Info className="h-4 w-4 text-blue-600" /> },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
    tip: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: <Lightbulb className="h-4 w-4 text-purple-600" /> },
  }
  const c = config[type]
  return (
    <div className={`rounded-lg ${c.bg} ${c.border} border p-4 my-4 not-prose`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{c.icon}</div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${c.text} mb-1`}>{title}</p>
          <div className={`text-sm ${c.text}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  return (
    <div className="not-prose my-4">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2 rounded-t-lg">
        <span className="text-xs text-slate-400 font-mono uppercase">{language}</span>
        <button
          onClick={() => navigator.clipboard.writeText(children)}
          className="text-xs text-slate-400 hover:text-white"
        >
          Copier
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 px-4 py-3 rounded-b-lg overflow-x-auto text-xs font-mono">
        {children}
      </pre>
    </div>
  )
}

function ScreenshotMockup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <figure className="not-prose my-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Browser chrome */}
          <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 text-center text-[10px] text-slate-500 font-medium">{title}</div>
            <div className="w-12" />
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
      <figcaption className="text-center text-xs text-slate-500 mt-2 italic">Capture d'écran — {title}</figcaption>
    </figure>
  )
}

function FlowDiagram({ steps }: { steps: Array<{ n: string; t: string; d: string }> }) {
  return (
    <div className="not-prose my-6">
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-base font-bold shadow-md">
                {s.n}
              </div>
              <p className="text-sm font-semibold text-slate-900 mt-2 text-center">{s.t}</p>
              <p className="text-[11px] text-slate-500 text-center">{s.d}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="not-prose group rounded-lg border border-slate-200 p-4 my-3">
      <summary className="cursor-pointer font-semibold text-slate-900 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">?</span>
          {q}
        </span>
        <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="mt-3 pl-8 text-slate-700">{children}</div>
    </details>
  )
}

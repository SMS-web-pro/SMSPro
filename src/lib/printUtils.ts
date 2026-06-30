/**
 * Utilitaires pour l'impression / génération PDF
 */

/**
 * Ouvre la fenêtre d'impression du navigateur avec le contenu d'un élément HTML.
 * L'utilisateur peut choisir "Enregistrer en PDF" dans la fenêtre d'impression.
 */
export function printElement(element: HTMLElement, documentTitle = 'Document'): void {
  // Créer une fenêtre d'impression dédiée
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    alert('Veuillez autoriser les pop-ups pour générer le PDF.')
    return
  }

  // Récupérer tous les stylesheets de la page actuelle
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n')
      } catch {
        // CORS block on external stylesheets
        return ''
      }
    })
    .join('\n')

  // Construire le HTML de la fenêtre d'impression
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${documentTitle}</title>
        <style>
          ${styles}
          @page {
            size: A4;
            margin: 15mm 12mm;
          }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            color: #0f172a;
            background: white;
            margin: 0;
            padding: 0;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            h2, h3 { page-break-after: avoid; }
            section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `)

  printWindow.document.close()

  // Attendre le chargement puis imprimer
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
      // Optionnel : fermer après impression
      // printWindow.close()
    }, 300)
  }
}

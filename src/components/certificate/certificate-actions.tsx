'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * « Télécharger en PDF ».
 *
 * Le certificat est mis en page pour l'impression A4 paysage ; l'impression du
 * navigateur propose « Enregistrer au format PDF » sur ordinateur comme sur
 * téléphone. Le titre du document est changé le temps de l'impression : c'est
 * lui qui devient le nom du fichier proposé — « Certificat - Awa Koné - …pdf »
 * plutôt que « Votre certificat — BIZELAN.pdf ».
 */
export function DownloadCertificateButton({ fileName }: { fileName: string }) {
  return (
    <Button
      type="button"
      onClick={() => {
        const previous = document.title
        document.title = fileName
        window.print()
        // L'impression est bloquante dans la plupart des navigateurs ; le
        // délai couvre ceux où elle ne l'est pas.
        window.setTimeout(() => {
          document.title = previous
        }, 1000)
      }}
    >
      <Download className="h-4 w-4" aria-hidden />
      Télécharger en PDF
    </Button>
  )
}

/**
 * Règles d'impression propres à la page du certificat : une seule page A4
 * paysage, sans marge, et RIEN d'autre que le certificat. Injectées par la
 * page elle-même, elles ne touchent pas l'impression du reste du site.
 */
export function CertificatePrintStyles() {
  return (
    <style
      // Contenu fixe, aucune donnée saisie : pas de risque d'injection.
      dangerouslySetInnerHTML={{
        __html: `
@page { size: A4 landscape; margin: 0; }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  body * { visibility: hidden !important; }
  .bz-certificate, .bz-certificate * { visibility: visible !important; }
  .bz-certificate {
    position: fixed !important; left: 0 !important; top: 0 !important;
    width: 297mm !important; height: 210mm !important; aspect-ratio: auto !important;
    box-shadow: none !important; border-radius: 0 !important;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}`,
      }}
    />
  )
}

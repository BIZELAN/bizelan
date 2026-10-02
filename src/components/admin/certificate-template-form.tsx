'use client'

import { useActionState, useState } from 'react'

import { saveCertificateTemplate, type CertificateResult } from '@/app/actions/certificates'
import { ActionFeedback, SaveButton } from '@/components/admin/form-bits'
import { ColorPicker } from '@/components/admin/color-picker'
import { MediaField } from '@/components/admin/media-input'
import { FormSection } from '@/components/admin/shell'
import { CertificateDocument } from '@/components/certificate/certificate-document'
import { Checkbox, Field, Input } from '@/components/ui/field'
import { DEFAULT_CERTIFICATE, type CertificateStyle, type CertificateTemplate } from '@/lib/certificate'
import { cn } from '@/lib/utils'

const STYLES: { value: CertificateStyle; label: string; hint: string }[] = [
  { value: 'classique', label: 'Classique', hint: 'Double cadre, sceau central, sobre et officiel.' },
  { value: 'moderne', label: 'Moderne', hint: 'Bandeau de couleur à gauche, mise en page aérée.' },
  { value: 'prestige', label: 'Prestige', hint: 'Fond de couleur et lettres dorées.' },
]

/**
 * Réglage du modèle de certificat, avec aperçu en direct.
 *
 * L'aperçu utilise le composant même qui sert aux apprenants : ce qu'on voit
 * ici est exactement ce qu'ils téléchargeront.
 */
export function CertificateTemplateForm({
  initial,
  siteName,
  siteLogoUrl,
  siteUrl,
}: {
  initial: CertificateTemplate
  siteName: string
  siteLogoUrl: string | null
  siteUrl: string
}) {
  const [state, action] = useActionState<CertificateResult | null, FormData>(saveCertificateTemplate, null)
  const [t, setT] = useState<CertificateTemplate>(initial)
  const set = <K extends keyof CertificateTemplate>(key: K, value: CertificateTemplate[K]) =>
    setT((prev) => ({ ...prev, [key]: value }))

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <input type="hidden" name="template" value={JSON.stringify(t)} />

      <div className="min-w-0 space-y-6">
        <ActionFeedback state={state} />

        <FormSection title="Style">
          <div className="grid gap-2" role="radiogroup" aria-label="Style du certificat">
            {STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={t.style === s.value}
                onClick={() => set('style', s.value)}
                className={cn(
                  'rounded-md border p-3 text-left transition-colors',
                  t.style === s.value
                    ? 'border-primary-text bg-primary-subtle'
                    : 'border-line hover:border-line-strong hover:bg-canvas-subtle',
                )}
              >
                <span className="block text-sm font-semibold text-fg">{s.label}</span>
                <span className="block text-xs text-fg-subtle">{s.hint}</span>
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection title="Textes">
          <Field label="Titre">
            <Input value={t.title} onChange={(e) => set('title', e.target.value)} maxLength={80} />
          </Field>
          <Field label="Sous-titre">
            <Input value={t.subtitle} onChange={(e) => set('subtitle', e.target.value)} maxLength={80} />
          </Field>
          <Field label="Avant le nom">
            <Input value={t.intro} onChange={(e) => set('intro', e.target.value)} maxLength={120} />
          </Field>
          <Field label="Avant le titre de la formation">
            <Input value={t.body} onChange={(e) => set('body', e.target.value)} maxLength={160} />
          </Field>
          <Field label="Mention complémentaire" help="Accréditation, nombre d’heures, lieu… Facultatif.">
            <Input value={t.mention} onChange={(e) => set('mention', e.target.value)} maxLength={240} />
          </Field>
        </FormSection>

        <FormSection title="Organisme">
          <Field label="Nom de l’organisme" help={`Vide : « ${siteName} ».`}>
            <Input value={t.issuerName} onChange={(e) => set('issuerName', e.target.value)} placeholder={siteName} />
          </Field>
          <Field label="Logo" help="Vide : le logo du site. Un PNG à fond transparent rend le mieux.">
            <MediaField value={t.logoUrl} onChange={(v) => set('logoUrl', v)} accept="image" height="h-20" />
          </Field>
          <Field label="Texte du sceau">
            <Input value={t.sealText} onChange={(e) => set('sealText', e.target.value)} maxLength={24} />
          </Field>
        </FormSection>

        <FormSection title="Signatures">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Signataire">
              <Input value={t.signerName} onChange={(e) => set('signerName', e.target.value)} placeholder="Prénom Nom" />
            </Field>
            <Field label="Fonction">
              <Input value={t.signerTitle} onChange={(e) => set('signerTitle', e.target.value)} placeholder="Directeur" />
            </Field>
          </div>
          <Field label="Signature manuscrite" help="Image de la signature, idéalement sur fond transparent.">
            <MediaField value={t.signatureUrl} onChange={(v) => set('signatureUrl', v)} accept="image" height="h-16" />
          </Field>
          <details className="rounded-md border border-line p-3">
            <summary className="cursor-pointer text-sm font-medium text-fg">Second signataire (facultatif)</summary>
            <div className="mt-3 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom">
                  <Input value={t.secondSignerName} onChange={(e) => set('secondSignerName', e.target.value)} />
                </Field>
                <Field label="Fonction">
                  <Input value={t.secondSignerTitle} onChange={(e) => set('secondSignerTitle', e.target.value)} placeholder="Formateur" />
                </Field>
              </div>
              <MediaField value={t.secondSignatureUrl} onChange={(v) => set('secondSignatureUrl', v)} accept="image" height="h-16" />
            </div>
          </details>
        </FormSection>

        <FormSection title="Couleurs">
          <ColorRow label="Couleur principale" value={t.accentColor} onChange={(v) => set('accentColor', v)} />
          <ColorRow label="Couleur des filets et du sceau" value={t.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        </FormSection>

        <FormSection title="Options">
          <Checkbox
            checked={t.showDuration}
            onChange={(e) => set('showDuration', e.target.checked)}
            label="Afficher la durée de la formation"
          />
          <Checkbox
            checked={t.showVerification}
            onChange={(e) => set('showVerification', e.target.checked)}
            label="Afficher le numéro et l’adresse de vérification"
          />
        </FormSection>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton label="Enregistrer le modèle" />
          <button
            type="button"
            onClick={() => setT(DEFAULT_CERTIFICATE)}
            className="text-sm font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Revenir au modèle par défaut
          </button>
        </div>
      </div>

      <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Aperçu</p>
        <div className="overflow-hidden rounded-lg shadow-e3 ring-1 ring-line">
          <CertificateDocument
            template={t}
            siteName={siteName}
            siteLogoUrl={siteLogoUrl}
            data={{
              recipientName: 'Awa Mariam KONÉ',
              courseTitle: 'Construire un plan d’affaires agricole finançable',
              issuedAt: new Date().toISOString(),
              code: 'BZ-CERT-EXEMPLE00',
              durationLabel: '12 heures',
              verifyUrl: `${siteUrl}/verifier/BZ-CERT-EXEMPLE00`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">
          Exemple avec un nom et une formation fictifs. Chaque apprenant reçoit son nom, sa formation
          et un numéro vérifiable en ligne.
        </p>
      </div>
    </form>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md border border-line-control px-3 py-2 text-left text-sm hover:bg-canvas-subtle"
      >
        <span className="h-6 w-6 shrink-0 rounded border border-line" style={{ backgroundColor: value }} aria-hidden />
        <span className="flex-1 font-medium text-fg">{label}</span>
        <span className="font-mono text-xs uppercase text-fg-subtle">{value}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-line p-3">
          <ColorPicker
            value={value}
            onPick={(c) => {
              onChange(c)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

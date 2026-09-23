'use client'

import { useActionState } from 'react'

import { saveSettings, type AdminResult } from '@/app/actions/admin'
import { FormActions, FormSection } from '@/components/admin/shell'
import { ActionFeedback, ObjectListEditor, SaveButton } from '@/components/admin/form-bits'
import { ImageInput } from '@/components/admin/image-input'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/misc'
import { asArray } from '@/lib/utils'
import type { OpeningHour, SiteSettings } from '@/lib/types'

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState<AdminResult | null, FormData>(saveSettings, null)
  const social = settings.social_links ?? {}

  return (
    <form action={action} className="space-y-6">
      <ActionFeedback state={state} />

      <FormSection title="Identité du site">
        <Field label="Nom du site" htmlFor="site_name" required>
          <Input id="site_name" name="site_name" defaultValue={settings.site_name} required />
        </Field>

        <Field label="Phrase de présentation" htmlFor="tagline">
          <Textarea id="tagline" name="tagline" rows={2} defaultValue={settings.tagline ?? ''} />
        </Field>

        <Field label="Logo" help="Format PNG ou SVG, fond transparent de préférence.">
          <ImageInput name="logo_url" defaultValue={settings.logo_url} label="Logo" />
        </Field>

        <Field label="Favicon" help="Petite icône affichée dans l’onglet du navigateur.">
          <ImageInput name="favicon_url" defaultValue={settings.favicon_url} label="Favicon" />
        </Field>
      </FormSection>

      <FormSection title="Coordonnées">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="E-mail de contact" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={settings.email ?? ''} />
          </Field>
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={settings.phone ?? ''} />
          </Field>
        </div>

        <Field
          label="Numéro WhatsApp"
          htmlFor="whatsapp"
          help="Sans le « + » ni espaces. Exemple : 22997868289"
        >
          <Input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp ?? ''} />
        </Field>

        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" defaultValue={settings.address ?? ''} />
        </Field>

        <Field
          label="Carte Google Maps"
          htmlFor="map_embed_url"
          help="Sur Google Maps : « Partager » puis l’onglet « Intégrer une carte ». Collez ici ce qui est proposé — le code &lt;iframe&gt; entier convient, l’URL seule aussi."
        >
          <Input id="map_embed_url" name="map_embed_url" defaultValue={settings.map_embed_url ?? ''} />
        </Field>

        <Field label="Horaires d’ouverture">
          <ObjectListEditor
            name="opening_hours"
            itemLabel="Ligne"
            defaultValue={asArray<OpeningHour>(settings.opening_hours) as unknown as Record<string, unknown>[]}
            fields={[
              { key: 'label', label: 'Jours', type: 'text', placeholder: 'Lundi – Vendredi' },
              { key: 'value', label: 'Horaires', type: 'text', placeholder: '08h – 18h' },
            ]}
          />
        </Field>

        <Field label="Réseaux sociaux">
          <div className="grid gap-3 sm:grid-cols-2">
            {['facebook', 'linkedin', 'youtube', 'instagram'].map((network) => (
              <div key={network}>
                <label className="mb-1 block text-xs font-medium capitalize text-fg-muted">
                  {network}
                </label>
                <Input
                  name={`social_${network}`}
                  defaultValue={social[network] ?? ''}
                  placeholder="https://…"
                />
              </div>
            ))}
          </div>
          {/* Recomposé côté serveur en JSON depuis les champs ci-dessus */}
          <SocialLinksBridge social={social} />
        </Field>
      </FormSection>

      <FormSection title="Bandeau d’annonce" description="Affiché en haut de toutes les pages.">
        <Field label="Texte de l’annonce" htmlFor="announcement">
          <Input
            id="announcement"
            name="announcement"
            defaultValue={settings.announcement ?? ''}
            placeholder="-40 % sur la formation Plan d’Affaires Agricole"
          />
        </Field>
        <Checkbox
          name="announcement_active"
          defaultChecked={settings.announcement_active}
          label="Afficher le bandeau d’annonce"
        />
      </FormSection>

      <FormSection title="Paiements">
        <Checkbox
          name="payments_kkiapay_enabled"
          defaultChecked={settings.payments_kkiapay_enabled}
          label="Proposer le paiement Mobile Money (KkiaPay)"
        />
        <Checkbox
          name="payments_transfer_enabled"
          defaultChecked={settings.payments_transfer_enabled}
          label="Proposer le dépôt manuel / virement"
        />

        <Field
          label="Instructions de paiement manuel"
          htmlFor="bank_transfer_instructions"
          help="Affiché au client qui choisit le dépôt manuel, et repris dans son e-mail."
        >
          <Textarea
            id="bank_transfer_instructions"
            name="bank_transfer_instructions"
            rows={4}
            defaultValue={settings.bank_transfer_instructions ?? ''}
          />
        </Field>

        <Alert tone="info">
          Les clés KkiaPay se configurent dans les variables d’environnement du projet
          (NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY, KKIAPAY_PRIVATE_KEY, KKIAPAY_SECRET), pas ici — elles ne
          doivent jamais être stockées en base.
        </Alert>
      </FormSection>

      <FormSection title="Référencement par défaut">
        <Field label="Titre par défaut" htmlFor="default_seo_title">
          <Input
            id="default_seo_title"
            name="default_seo_title"
            defaultValue={settings.default_seo_title ?? ''}
          />
        </Field>
        <Field label="Description par défaut" htmlFor="default_seo_description">
          <Textarea
            id="default_seo_description"
            name="default_seo_description"
            rows={2}
            defaultValue={settings.default_seo_description ?? ''}
          />
        </Field>
      </FormSection>

      <FormSection title="Textes légaux" description="Markdown accepté.">
        <Field label="Mentions légales" htmlFor="legal_notice">
          <Textarea
            id="legal_notice"
            name="legal_notice"
            rows={6}
            defaultValue={settings.legal_notice ?? ''}
          />
        </Field>
        <Field label="Conditions générales de vente" htmlFor="terms">
          <Textarea id="terms" name="terms" rows={6} defaultValue={settings.terms ?? ''} />
        </Field>
        <Field label="Politique de confidentialité" htmlFor="privacy_policy">
          <Textarea
            id="privacy_policy"
            name="privacy_policy"
            rows={6}
            defaultValue={settings.privacy_policy ?? ''}
          />
        </Field>
      </FormSection>

      <FormActions>
        <SaveButton label="Enregistrer les paramètres" />
      </FormActions>
    </form>
  )
}

/**
 * Regroupe les champs « social_* » en un seul JSON envoyé au serveur.
 * Recalculé à la volée pour rester synchronisé avec la saisie.
 */
function SocialLinksBridge({ social }: { social: Record<string, string> }) {
  return (
    <input
      type="hidden"
      name="social_links"
      defaultValue={JSON.stringify(social)}
      ref={(node) => {
        if (!node) return
        const form = node.closest('form')
        if (!form) return

        const sync = () => {
          const data = new FormData(form)
          const next: Record<string, string> = {}
          for (const network of ['facebook', 'linkedin', 'youtube', 'instagram']) {
            const value = String(data.get(`social_${network}`) ?? '').trim()
            if (value) next[network] = value
          }
          node.value = JSON.stringify(next)
        }

        form.addEventListener('input', sync)
        form.addEventListener('submit', sync)
        sync()
      }}
    />
  )
}

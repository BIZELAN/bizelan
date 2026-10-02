import type { CSSProperties } from 'react'

import type { CertificateData, CertificateTemplate } from '@/lib/certificate'
import { formatDate } from '@/lib/utils'

/**
 * Certificat de fin de formation, au format A4 paysage.
 *
 * Toutes les dimensions sont exprimées en `cqw` (pourcentage de la largeur
 * du certificat) : le document garde exactement ses proportions à l'écran
 * d'un téléphone, dans l'aperçu de l'administration et sur la page imprimée.
 *
 * Il est toujours sur PAPIER CLAIR (`data-theme="light"`), quel que soit le
 * thème du site : c'est un document destiné à être imprimé et partagé.
 */
export function CertificateDocument({
  template,
  data,
  siteName,
  siteLogoUrl,
}: {
  template: CertificateTemplate
  data: CertificateData
  siteName: string
  siteLogoUrl?: string | null
}) {
  const issuer = template.issuerName || siteName
  const logo = template.logoUrl || siteLogoUrl || ''
  const accent = template.accentColor
  const gold = template.secondaryColor
  const issued = data.issuedAt ? formatDate(data.issuedAt) : formatDate(new Date().toISOString())
  const verifyHost = data.verifyUrl.replace(/^https?:\/\//, '')

  const cq = (n: number): string => `${n}cqw`
  const prestige = template.style === 'prestige'
  const moderne = template.style === 'moderne'

  const paper = prestige ? accent : '#fffdf8'
  const ink = prestige ? '#f8f5ec' : '#1d2327'
  const muted = prestige ? 'rgba(248,245,236,0.78)' : '#4f5b62'
  const titleColor = prestige ? gold : accent

  const root: CSSProperties = {
    containerType: 'inline-size',
    aspectRatio: '297 / 210',
    backgroundColor: paper,
    color: ink,
    fontFamily: 'Georgia, "Times New Roman", serif',
  }

  const signers = [
    { name: template.signerName, title: template.signerTitle, signature: template.signatureUrl },
    { name: template.secondSignerName, title: template.secondSignerTitle, signature: template.secondSignatureUrl },
  ].filter((s) => s.name || s.signature)

  return (
    <div data-theme="light" className="bz-certificate relative w-full overflow-hidden" style={root}>
      {/* --- Cadre ----------------------------------------------------- */}
      {!moderne && (
        <>
          <div
            className="pointer-events-none absolute"
            style={{ inset: cq(1.6), border: `${cq(0.45)} solid ${prestige ? gold : accent}` }}
          />
          <div
            className="pointer-events-none absolute"
            style={{ inset: cq(2.5), border: `${cq(0.12)} solid ${gold}` }}
          />
          {/* Ornements d'angle */}
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => (
            <span
              key={corner}
              aria-hidden
              className="pointer-events-none absolute"
              style={{
                width: cq(5),
                height: cq(5),
                [corner.startsWith('top') ? 'top' : 'bottom']: cq(1.1),
                [corner.endsWith('left') ? 'left' : 'right']: cq(1.1),
                borderColor: gold,
                borderStyle: 'solid',
                borderWidth: 0,
                [`border${corner.startsWith('top') ? 'Top' : 'Bottom'}Width`]: cq(0.6),
                [`border${corner.endsWith('left') ? 'Left' : 'Right'}Width`]: cq(0.6),
              }}
            />
          ))}
        </>
      )}

      {moderne && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{
            width: cq(24),
            background: `linear-gradient(160deg, ${accent} 0%, ${accent} 60%, ${gold} 160%)`,
          }}
        />
      )}

      {/* Filigrane discret */}
      {logo && !moderne && (
        <img
          src={logo}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
          style={{ width: cq(42), opacity: prestige ? 0.06 : 0.045 }}
        />
      )}

      {/* --- Contenu --------------------------------------------------- */}
      <div
        className="absolute flex flex-col"
        style={
          moderne
            ? { top: cq(5), bottom: cq(4.5), left: cq(29), right: cq(5), alignItems: 'flex-start', textAlign: 'left' }
            : { top: cq(5.2), bottom: cq(4.8), left: cq(7), right: cq(7), alignItems: 'center', textAlign: 'center' }
        }
      >
        {/* En-tête : logo et émetteur */}
        {!moderne && (
          <div className="flex flex-col items-center" style={{ gap: cq(0.6) }}>
            {logo && <img src={logo} alt={issuer} className="object-contain" style={{ height: cq(5.2), maxWidth: cq(26) }} />}
            <p
              style={{
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: cq(1.15),
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: muted,
                fontWeight: 600,
              }}
            >
              {issuer}
            </p>
          </div>
        )}

        <h2
          style={{
            marginTop: moderne ? 0 : cq(1.6),
            fontSize: cq(moderne ? 4.6 : 4.3),
            lineHeight: 1.05,
            color: titleColor,
            fontWeight: 700,
            letterSpacing: moderne ? '0.01em' : '0.04em',
            textTransform: moderne ? 'none' : 'uppercase',
          }}
        >
          {template.title}
        </h2>

        {template.subtitle && (
          <p
            style={{
              marginTop: cq(0.7),
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: cq(1.2),
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: prestige ? ink : gold,
              fontWeight: 600,
            }}
          >
            {template.subtitle}
          </p>
        )}

        <p style={{ marginTop: cq(moderne ? 3.4 : 2.6), fontSize: cq(1.55), fontStyle: 'italic', color: muted }}>
          {template.intro}
        </p>

        <p
          style={{
            marginTop: cq(0.9),
            fontSize: cq(data.recipientName.length > 28 ? 3.7 : 4.6),
            lineHeight: 1.1,
            fontWeight: 700,
            color: ink,
            paddingBottom: cq(0.8),
            borderBottom: `${cq(0.15)} solid ${gold}`,
            minWidth: cq(42),
            maxWidth: '100%',
          }}
        >
          {data.recipientName}
        </p>

        <p style={{ marginTop: cq(1.8), fontSize: cq(1.5), color: muted, fontStyle: 'italic' }}>{template.body}</p>

        <p
          style={{
            marginTop: cq(0.8),
            fontSize: cq(data.courseTitle.length > 60 ? 2 : 2.5),
            lineHeight: 1.2,
            fontWeight: 700,
            color: titleColor,
            maxWidth: cq(moderne ? 62 : 78),
          }}
        >
          « {data.courseTitle} »
        </p>

        {(template.mention || (template.showDuration && data.durationLabel)) && (
          <p
            style={{
              marginTop: cq(1),
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: cq(1.1),
              color: muted,
            }}
          >
            {[template.showDuration && data.durationLabel ? `Durée : ${data.durationLabel}` : null, template.mention || null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {/* --- Pied : date, sceau, signatures ------------------------------ */}
        <div
          className="mt-auto flex w-full items-end"
          style={{ gap: cq(3), justifyContent: moderne ? 'flex-start' : 'space-between' }}
        >
          <SignatureBlock label="Délivré le" value={issued} cq={cq} ink={ink} muted={muted} line={gold} />

          {!moderne && <Seal text={template.sealText || 'Certifié'} accent={prestige ? gold : accent} ring={gold} cq={cq} />}

          {signers.length === 0 ? (
            <SignatureBlock label="Pour l’organisme" value={issuer} cq={cq} ink={ink} muted={muted} line={gold} />
          ) : (
            signers.map((s, i) => (
              <SignatureBlock
                key={i}
                label={s.title || 'Signataire'}
                value={s.name}
                signature={s.signature}
                cq={cq}
                ink={ink}
                muted={muted}
                line={gold}
              />
            ))
          )}

          {moderne && (
            <div className="ml-auto">
              <Seal text={template.sealText || 'Certifié'} accent={accent} ring={gold} cq={cq} />
            </div>
          )}
        </div>

        {template.showVerification && (
          <p
            style={{
              marginTop: cq(1.6),
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: cq(0.85),
              color: muted,
              letterSpacing: '0.04em',
            }}
          >
            N° {data.code} · Vérifiable sur {verifyHost}
          </p>
        )}
      </div>

      {/* Bandeau gauche du style moderne : logo et émetteur */}
      {moderne && (
        <div
          className="absolute inset-y-0 left-0 flex flex-col items-center justify-between text-center"
          style={{ width: cq(24), padding: `${cq(5)} ${cq(2.4)}`, color: '#ffffff' }}
        >
          {logo ? (
            <span className="flex items-center justify-center rounded-lg bg-white" style={{ padding: cq(1.2) }}>
              <img src={logo} alt={issuer} className="object-contain" style={{ height: cq(6), maxWidth: cq(16) }} />
            </span>
          ) : (
            <span />
          )}
          <p
            style={{
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              fontSize: cq(1.3),
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {issuer}
          </p>
          <span style={{ width: cq(6), height: cq(0.3), background: gold }} />
        </div>
      )}
    </div>
  )
}

function SignatureBlock({
  label,
  value,
  signature,
  cq,
  ink,
  muted,
  line,
}: {
  label: string
  value: string
  signature?: string
  cq: (n: number) => string
  ink: string
  muted: string
  line: string
}) {
  return (
    <div className="flex flex-col items-center text-center" style={{ minWidth: cq(17), maxWidth: cq(24) }}>
      <div className="flex items-end justify-center" style={{ height: cq(5.5) }}>
        {signature ? (
          <img src={signature} alt="" className="object-contain" style={{ maxHeight: cq(5.5), maxWidth: cq(20) }} />
        ) : (
          <span style={{ fontSize: cq(1.55), color: ink, fontWeight: 600 }}>{value}</span>
        )}
      </div>
      <span style={{ display: 'block', width: '100%', height: cq(0.12), background: line, marginTop: cq(0.5) }} />
      {signature && value && (
        <span style={{ marginTop: cq(0.5), fontSize: cq(1.15), color: ink, fontWeight: 600 }}>{value}</span>
      )}
      <span
        style={{
          marginTop: cq(0.3),
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: cq(0.95),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: muted,
        }}
      >
        {label}
      </span>
    </div>
  )
}

/** Sceau rond, dessiné en SVG : net à toutes les tailles et à l'impression. */
function Seal({ text, accent, ring, cq }: { text: string; accent: string; ring: string; cq: (n: number) => string }) {
  const id = `seal-${text.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x'}`
  const label = `${text.toUpperCase()} · ${text.toUpperCase()} · `
  return (
    <svg viewBox="0 0 120 120" style={{ width: cq(11), height: cq(11) }} aria-hidden>
      <defs>
        <path id={id} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      {/* Dentelure */}
      <circle cx="60" cy="60" r="58" fill={ring} />
      <circle cx="60" cy="60" r="54" fill={accent} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={ring} strokeWidth="1.2" />
      <circle cx="60" cy="60" r="34" fill="none" stroke={ring} strokeWidth="1.2" />
      <text fill="#ffffff" fontSize="9.5" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="700" letterSpacing="2">
        <textPath href={`#${id}`} startOffset="0">
          {label.repeat(2).slice(0, 44)}
        </textPath>
      </text>
      {/* Étoile centrale */}
      <path
        d="M60 38 L66 54 L83 54 L69 64 L74 81 L60 71 L46 81 L51 64 L37 54 L54 54 Z"
        fill={ring}
      />
    </svg>
  )
}

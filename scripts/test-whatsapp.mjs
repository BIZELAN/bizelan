/**
 * Vérifie le bouton WhatsApp flottant et son icône.
 *
 *     node scripts/test-whatsapp.mjs
 *
 * Trois choses sont éprouvées :
 *
 * 1. `whatsappLink` — le numéro vient d'une saisie libre dans la console, avec
 *    espaces, tirets et parfois un « + ». Un lien mal formé mène à une page
 *    d'erreur WhatsApp, et personne ne le signale : le visiteur s'en va.
 *
 * 2. L'intégrité du tracé SVG. C'est un logo de marque repris de simple-icons ;
 *    le « simplifier » ou le retaper de mémoire donne un glyphe approximatif
 *    qui se remarque et engage l'image du client. La somme de contrôle le gèle.
 *
 * 3. Que la position soit filtrée aux deux bouts. La base contraint la colonne
 *    à `left` ou `right` ; si l'action serveur ne filtrait pas aussi, une
 *    valeur inattendue ferait rejeter l'enregistrement ENTIER des réglages, et
 *    l'administrateur perdrait toutes ses autres modifications.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { whatsappLink } from '../src/lib/utils.ts'

let fails = 0
const check = (label, ok, detail = '') => {
  if (!ok) fails++
  console.log(`  ${ok ? 'OK   ' : 'ECHEC'} ${label.padEnd(50)} ${detail}`)
}

const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

/* ------------------------------------------------------------------ */
console.log('\n  LIEN WHATSAPP')

for (const [entree, attendu, pourquoi] of [
  ['22997868289', 'https://wa.me/22997868289', 'numéro nu'],
  ['+229 01 97 86 82 89', 'https://wa.me/2290197868289', 'avec indicatif et espaces'],
  ['229-97-86-82-89', 'https://wa.me/22997868289', 'avec tirets'],
  ['(229) 97868289', 'https://wa.me/22997868289', 'avec parenthèses'],
  [null, null, 'absent'],
  ['', null, 'vide'],
  ['   ', null, 'espaces seuls'],
  ['abc', null, 'aucun chiffre'],
]) {
  check(pourquoi, whatsappLink(entree) === attendu, String(whatsappLink(entree)))
}

const avecMessage = whatsappLink('22997868289', 'Bonjour & merci ?')
check(
  'le message est encodé pour l’URL',
  avecMessage === 'https://wa.me/22997868289?text=Bonjour%20%26%20merci%20%3F',
  avecMessage,
)
// Un message vide ne doit pas produire `?text=` : WhatsApp ouvre alors une
// conversation avec un brouillon vide, ce qui n'est pas la même chose.
check('un message vide n’ajoute pas de paramètre',
  whatsappLink('22997868289', '') === 'https://wa.me/22997868289',
  String(whatsappLink('22997868289', '')))

/* ------------------------------------------------------------------ */
console.log('\n  INTEGRITE DU LOGO')

const brand = lire('../src/components/ui/brand-icons.ts')
// Le tracé vit dans une constante et non dans du JSX : le fichier est un `.ts`
// pour rester chargeable par `test-icons.mjs` sous Node, qui ne transforme pas
// le JSX.
const tracé = /WHATSAPP_PATH =\s*'([^']+)'/.exec(brand)?.[1] ?? ''

// Somme de contrôle du tracé officiel WhatsApp (simple-icons v13,
// `icons/whatsapp.svg`). Si elle change, c'est que le logo a été modifié :
// soit la mise à jour est voulue et il faut remplacer cette valeur, soit
// quelqu'un l'a retapé et le glyphe est désormais approximatif.
const OFFICIEL = '8bbe960a5a29b570b477b5730b454f2693b365d5d9edd088783ad25ee1666cc1'
const LONGUEUR_OFFICIELLE = 1104
const empreinte = createHash('sha256').update(tracé).digest('hex')
check('le tracé est celui de simple-icons', empreinte === OFFICIEL, empreinte.slice(0, 16) + '…')
check('longueur du tracé inchangée', tracé.length === LONGUEUR_OFFICIELLE, tracé.length)
check('un seul chemin, aucun tracé ajouté',
  (brand.match(/createElement\('path'/g) ?? []).length === 1)
check('viewBox 0 0 24 24', brand.includes("viewBox: '0 0 24 24'"))
// Rempli et non tracé au contour : une classe `stroke-*` n'aurait aucun effet,
// et un `fill="none"` hérité rendrait le glyphe invisible.
check('rempli avec currentColor', brand.includes("fill: 'currentColor'"))
check('le vert officiel est expose comme constante', brand.includes("'#25D366'"))
// Sans JSX, donc chargeable par Node : c'est ce qui permet à `test-icons.mjs`
// de vérifier le registre d'icônes, qui importe ce fichier.
check('aucun JSX (le registre d’icônes doit rester vérifiable)',
  !/<(svg|path)/.test(brand))

/* ------------------------------------------------------------------ */
console.log('\n  LE BOUTON FLOTTANT')

const float = lire('../src/components/public/whatsapp-float.tsx')

check('position fixe', float.includes("'fixed bottom-5") || float.includes('fixed bottom-5'))
// La consigne est qu'il ne bouge pas : aucune transformation, ni au survol ni
// au defilement.
check('aucune transformation au survol',
  !/hover:(scale|translate|rotate)/.test(float), /hover:\w+/.exec(float)?.[0] ?? '')
check('aucune apparition au defilement', !float.includes('scrollY') && !float.includes('useState'))
check('composant serveur (aucun use client)', !float.includes("'use client'"))
check('les deux positions sont gerees',
  float.includes("'left-5'") && float.includes("'right-5'"))
check('masque si desactive ou sans numero',
  /if \(!enabled \|\| !href\) return null/.test(float))
check('nouvel onglet protege', float.includes('rel="noopener noreferrer"'))
check('libelle accessible', float.includes('aria-label='))
// Cible tactile : 56 px de cote, au-dela des 44 px recommandes.
check('cible tactile suffisante', float.includes('h-14 w-14'))
check('anneau de focus visible', float.includes('focus-visible:ring-2'))
// Le vert WhatsApp contre une page claire mesure 1,99:1 : c'est la frontiere
// qui detache le bouton, pas sa couleur.
check('frontiere par liseré et ombre',
  float.includes('ring-line-strong') && float.includes('shadow-e3'))
check('encoche iOS prise en compte', float.includes('safe-area-inset-bottom'))
check('masque a l’impression', float.includes('print:hidden'))

/* ------------------------------------------------------------------ */
console.log('\n  POSITION FILTREE AUX DEUX BOUTS')

const migration = lire('../supabase/migrations/0012_whatsapp_float.sql')
check('la base contraint la colonne',
  /check \(whatsapp_float_position in \('left', 'right'\)\)/.test(migration))
check('les trois colonnes sont ajoutees',
  ['whatsapp_float_enabled', 'whatsapp_float_message', 'whatsapp_float_position']
    .every((c) => migration.includes(c)))
check('valeur par defaut a droite', migration.includes("default 'right'"))

const action = lire('../src/app/actions/admin.ts')
check('l’action serveur filtre aussi',
  /whatsapp_float_position:\s*\n?\s*str\(formData, 'whatsapp_float_position'\) === 'left' \? 'left' : 'right'/
    .test(action))

/* ------------------------------------------------------------------ */
console.log('\n  L ICONE GENERIQUE A DISPARU')

// `MessageCircle` servait de pis-aller : une bulle de dialogue que personne ne
// reconnait comme WhatsApp, alors que c'est le premier canal de contact ici.
for (const fichier of [
  '../src/components/public/site-footer.tsx',
  '../src/app/(public)/contact/page.tsx',
]) {
  const source = lire(fichier)
  const nom = fichier.split('/').pop()
  check(`${nom} : plus de MessageCircle`, !source.includes('MessageCircle'))
  check(`${nom} : utilise WhatsAppIcon`, source.includes('WhatsAppIcon'))
}

const icons = lire('../src/lib/icons.ts')
check('l’icone est dans la bibliothèque de la console',
  icons.includes("['WhatsApp', 'WhatsApp'"))
check('la bulle générique ne répond plus à « whatsapp »',
  !/\['MessageCircle'[^\]]*whatsapp/.test(icons))

console.log(fails ? `\n${fails} CAS EN ECHEC` : '\nTous les cas passent.')
process.exitCode = fails ? 1 : 0

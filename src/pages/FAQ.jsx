import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import Reveal from '../components/Reveal'
import { IconPlus, IconMinus } from '../components/icons'

const SECTIONS = [
  {
    title: 'Commandes & livraison',
    items: [
      { q: 'Quel est le délai de livraison en Tunisie ?', a: "Les commandes sont expédiées sous 24 heures, du lundi au samedi. La livraison prend 1 à 5 jours ouvrables selon votre gouvernorat. Vous serez informé par SMS/WhatsApp dès l'expédition de votre commande." },
      { q: 'Combien coûte la livraison ?', a: "Les frais de livraison sont fixés par gouvernorat et affichés clairement au moment de la validation, avant votre confirmation. Vous voyez toujours le montant exact avant de payer." },
      { q: 'Puis-je suivre ma commande ?', a: "Oui. Dès que vous confirmez, nous vous appelons sur le numéro que vous avez laissé pour valider l'envoi. Ensuite, contactez-nous avec votre numéro de commande et nous vous confirmerons son statut actuel." },
    ],
  },
  {
    title: 'Paiements',
    items: [
      { q: 'Proposez-vous le paiement à la livraison ?', a: 'Oui — le paiement à la livraison est disponible partout en Tunisie. Vous réglez le livreur à la réception de votre commande.' },
      { q: 'Le paiement par carte en ligne est-il disponible ?', a: 'Nous déployons le paiement sécurisé par carte en ligne. D’ici là, toutes les commandes sont payées à la livraison.' },
      { q: 'Les prix sont-ils en dinars tunisiens ?', a: 'Oui. Tous les prix, frais de livraison et totaux sont affichés en dinars tunisiens (TND), taxes comprises.' },
    ],
  },
  {
    title: 'Retours & échanges',
    items: [
      { q: 'Quelle est votre politique de retour ?', a: 'Les articles non portés, dans leur état d’origine et avec leurs étiquettes intactes, peuvent être retournés dans les 14 jours suivant la livraison pour un remboursement intégral ou un échange.' },
      { q: 'Comment initier un retour ?', a: "Contactez-nous via la page contact ou par email avec votre numéro de commande. Nous vous guiderons dans les 1 à 2 jours ouvrables." },
      { q: 'Que faire si mon article est endommagé ou non conforme ?', a: 'Si vous avez reçu un article défectueux ou non conforme, contactez-nous immédiatement avec des photos et nous réglerons le problème — remplacement ou remboursement — sans aucun frais pour vous.' },
    ],
  },
  {
    title: 'Tailles & commande',
    items: [
      { q: 'Comment connaître ma taille ?', a: "Chaque fiche produit contient un guide des tailles. Si vous êtes entre deux tailles, nous vous recommandons de prendre au-dessus — nos coupes taillent légèrement près du corps." },
      { q: 'Ai-je besoin d’un compte pour commander ?', a: 'Non, vous commandez en tant qu’invité : aucun compte n’est nécessaire. Renseignez simplement votre nom, votre numéro de téléphone, votre adresse et votre gouvernorat au moment de confirmer la commande.' },
      { q: 'Puis-je modifier ou annuler ma commande ?', a: "Tant que la commande n’a pas été expédiée, contactez-nous dès que possible et nous ferons au mieux pour la modifier ou l’annuler." },
    ],
  },
]

export default function FAQ() {
  useDocumentMeta('FAQ — COBRA TN', 'Questions fréquentes sur les commandes, la livraison, les paiements et les retours.')
  const [open, setOpen] = useState([0])

  const toggle = (i) => setOpen((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))

  return (
    <div className="container-page pb-24 pt-24 lg:pb-32 lg:pt-32">
      <div className="mx-auto max-w-3xl">
        <p className="label text-neutral-400">Centre d'aide</p>
        <h1 className="section-title">Vos questions, nos réponses</h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-500">
          Tout ce qu'il faut savoir pour commander chez COBRA TN. Vous ne trouvez pas votre réponse ?{' '}
          <Link to="/contact" className="font-semibold text-black underline underline-offset-4">Nous contacter.</Link>
        </p>

        <div className="mt-12 space-y-12">
          {SECTIONS.map((section, si) => {
            let acc = si * SECTIONS.reduce((n, s) => n + s.items.length, 0)
            return (
              <section key={section.title}>
                <h2 className="border-b border-black/10 pb-3 text-xs font-extrabold uppercase tracking-wide3">{section.title}</h2>
                <div className="divide-y divide-black/10">
                  {section.items.map((item, ii) => {
                    const idx = acc + ii
                    const isOpen = open.includes(idx)
                    return (
                      <Reveal key={item.q} delay={ii * 60}>
                        <div className="py-5">
                          <button type="button" onClick={() => toggle(idx)} className="flex w-full items-center justify-between gap-4 text-left" aria-expanded={isOpen}>
                            <span className="text-sm font-bold">{item.q}</span>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-black/15">
                              {isOpen ? <IconMinus className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                          {isOpen && <p className="mt-3 pl-0 text-sm leading-relaxed text-neutral-500">{item.a}</p>}
                        </div>
                      </Reveal>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
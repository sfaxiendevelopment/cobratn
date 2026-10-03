import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import useSiteSettings from '../hooks/useSiteSettings'
import Reveal from '../components/Reveal'
import { IconInstagram, IconTiktok, IconFacebook } from '../components/icons'

const VALUES = [
  { n: '01', title: 'Ancré', body: "Né en Tunisie, porté partout. Chaque pièce porte la morsure du cobra — retenue, tension, précision." },
  { n: '02', title: 'Rare', body: "Petites séries, sorties délibérées. Quand une pièce est épuisée, elle l'est pour de bon. C'est le but." },
  { n: '03', title: 'Résistant', body: 'Coton premium et construction dense. Nous créons des pièces qui justifient leur prix sur des années, pas des semaines.' },
  { n: '04', title: 'Honnête', body: 'Prix justes, paiement à la livraison, support sincère. Pas de cirque marketing, pas de rareté artificielle.' },
]

export default function About() {
  useDocumentMeta('À propos — COBRA TN', "L'histoire, les valeurs et les personnes derrière COBRA TN.")
  const { social } = useSiteSettings()

  return (
    <div className="pb-24 pt-24 lg:pb-32 lg:pt-32">
      {/* Intro */}
      <section className="container-page">
        <p className="label text-neutral-400">Notre histoire</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-4xl font-black uppercase leading-none tracking-wide lg:text-6xl">
            COBRA <span className="text-neutral-400">TN</span>
          </h1>
          <p className="mt-8 text-base leading-relaxed text-neutral-600 lg:text-lg">
            COBRA TN est né d'une simple frustration : les pièces qui semblaient justes — coton épais, coupes nettes, palettes sombres —
            étaient toujours hors de portée. Alors nous les avons fabriquées nous-mêmes. Une marque de streetwear tunisienne avec un petit
            catalogue, une sélection stricte et rien qui ne mérite sa place.
          </p>
          <p className="mt-4 text-base leading-relaxed text-neutral-600 lg:text-lg">
            Nous ne suivons pas les saisons. Nous obsédons un seul t-shirt noir jusqu'à ce qu'il soit parfait, puis nous passons à autre
            chose. Le cobra reste silencieux jusqu'à sa frappe — c'est l'énergie qui nous inspire.
          </p>
        </div>
      </section>

      {/* Editorial image */}
      <section className="mt-16">
        <div className="relative h-[420px] overflow-hidden lg:h-[560px]">
          <img src="/images/placeholder-editorial.svg" alt="Éditorial COBRA TN" className="h-full w-full object-cover" onError={(e) => (e.currentTarget.src = '/images/placeholder-hero.svg')} />
          <div className="absolute inset-0 bg-black/25" />
          <p className="absolute bottom-8 left-8 text-[10px] font-bold uppercase tracking-widest2 text-white/80 lg:left-16">
            La force tranquille.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="container-page mt-20">
        <h2 className="section-title">Ce qui nous guide</h2>
        <div className="mt-10 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2">
          {VALUES.map((v, i) => (
            <Reveal key={v.n} delay={i * 80} className="bg-white">
              <div className="p-8 lg:p-10">
                <span className="text-[10px] font-bold tracking-widest2 text-neutral-400">{v.n}</span>
                <h3 className="mt-3 text-xl font-extrabold uppercase tracking-wide">{v.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Numbers */}
      <section className="container-page mt-20">
        <div className="grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
          {[
            ['2019', 'Fondée à Tunis'],
            ['24', 'Gouvernorats livrés'],
            ['24h', "Expédition pour chaque commande"],
          ].map(([num, label]) => (
            <div key={label} className="bg-neutral-50 p-8 text-center lg:p-10">
              <p className="text-4xl font-black uppercase">{num}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page mt-20">
        <div className="flex flex-col items-start justify-between gap-6 border border-black/10 bg-black p-10 text-white lg:flex-row lg:items-center lg:p-14">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-wide lg:text-3xl">Portez la frappe.</h2>
            <p className="mt-2 text-sm text-white/60">De nouvelles pièces arrivent souvent. N'hésitez pas.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/shop" className="btn bg-white text-black hover:bg-neutral-200">Voir la boutique</Link>
            <Link to="/contact" className="border border-white/30 px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-white hover:text-black">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>

      {/* Socials */}
      <section className="container-page mt-20">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest2 text-neutral-400">Suivez les sorties</p>
          <div className="flex gap-2">
            <a href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconInstagram /></a>
            <a href={social.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="flex h-11 w-11 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconTiktok /></a>
            <a href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center border border-black/15 hover:bg-black hover:text-white"><IconFacebook /></a>
          </div>
        </div>
      </section>
    </div>
  )
}
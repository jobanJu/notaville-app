export const metadata = {
  title: "Mentions légales — Notaville",
};

// Contenu de base, à compléter avant une vraie mise en ligne (voir les
// champs entre crochets) -- une mention légale doit être exacte, donc
// on ne remplit jamais un SIRET, une adresse ou un hébergeur au hasard.
export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-extrabold">Mentions légales</h1>
      <p className="mt-2 text-sm text-text-soft">
        Page en construction — à compléter avant la mise en ligne définitive du site.
      </p>

      <div className="mt-8 flex flex-col gap-8 text-sm">
        <section>
          <h2 className="font-display text-base font-bold">Éditeur du site</h2>
          <p className="mt-2 text-text-soft">
            Notaville est édité par JulLab.
            <br />
            Responsable de la publication : Jonathan Julliard.
            <br />
            Statut juridique : [à compléter — ex. entreprise individuelle, micro-entreprise, société]
            <br />
            SIRET : [à compléter]
            <br />
            Adresse : [à compléter]
            <br />
            Contact : [à compléter — adresse email de contact]
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">Hébergement</h2>
          <p className="mt-2 text-text-soft">
            Nom de l&apos;hébergeur : [à compléter]
            <br />
            Adresse de l&apos;hébergeur : [à compléter]
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">Propriété intellectuelle</h2>
          <p className="mt-2 text-text-soft">
            La structure du site Notaville, sa charte graphique et ses éléments techniques sont la
            propriété de JulLab, sauf mention contraire. Les données de ville, quartier et statistiques
            proviennent en partie de sources publiques (dont l&apos;INSEE) et en partie des contributions
            de la communauté Notaville, régies par les{" "}
            <a href="/cgu" className="text-amber-ink hover:underline">
              conditions générales d&apos;utilisation
            </a>
            . Les photos affichées sur le site proviennent de deux sources : des photos de ville issues de
            Wikipédia, qui restent soumises à leur licence d&apos;origine, et des photos publiées par les
            utilisateurs eux-mêmes dans le cadre de leurs contributions (notamment les défis photo). Toute
            personne s&apos;estimant lésée par l&apos;utilisation d&apos;une photo peut en demander le
            retrait via [à compléter — contact].
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">Données personnelles</h2>
          <p className="mt-2 text-text-soft">
            Le traitement des données personnelles des utilisateurs (compte, contributions, préférences)
            est décrit dans les{" "}
            <a href="/cgu" className="text-amber-ink hover:underline">
              conditions générales d&apos;utilisation
            </a>
            . Conformément au RGPD, tout utilisateur dispose d&apos;un droit d&apos;accès, de
            rectification et de suppression de ses données, à exercer auprès de [à compléter — contact
            RGPD].
          </p>
        </section>
      </div>
    </div>
  );
}

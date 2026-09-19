export const metadata = {
  title: "Mentions légales — Notaville",
};

// Éditeur identifié via l'extrait d'immatriculation public (Pappers,
// SIRET 982 872 426 00019 -- Jonathan Julliard, entrepreneur individuel,
// immatriculé le 29/12/2023) et les informations données par
// l'utilisateur. Nom commercial affiché : JulLab -- à la demande de
// l'utilisateur, qui est en train de renommer officiellement son
// entreprise individuelle de "Julliard Web Développement" (nom encore
// affiché sur Pappers/societe.com au moment d'écrire ceci) vers JulLab,
// déjà utilisé comme marque publique ailleurs sur le site (voir
// components/Footer.js). À vérifier/mettre à jour si besoin une fois le
// changement de nom commercial reflété sur le registre public. Adresse
// volontairement limitée à la ville (Lille) à la demande de
// l'utilisateur -- l'adresse complète du siège, publique sur Pappers,
// n'est pas reprise ici. Hébergeur (Vercel Inc.) : adresse reprise
// telle qu'affichée sur vercel.com/legal/privacy-policy, section
// "Contact Us" -- pas une adresse inventée.
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
            Notaville est édité par Jonathan Julliard, exerçant sous le nom commercial{" "}
            <strong>JulLab</strong>.
            <br />
            Responsable de la publication : Jonathan Julliard.
            <br />
            Statut juridique : Entrepreneur individuel.
            <br />
            SIRET : 982 872 426 00019
            <br />
            Adresse : Lille (59000), France
            <br />
            Contact : <a href="mailto:jonathan@getvib.fr" className="text-amber-ink hover:underline">jonathan@getvib.fr</a>
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">Hébergement</h2>
          <p className="mt-2 text-text-soft">
            Nom de l&apos;hébergeur : Vercel Inc.
            <br />
            Adresse de l&apos;hébergeur : 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">Propriété intellectuelle</h2>
          <p className="mt-2 text-text-soft">
            La structure du site Notaville, sa charte graphique et ses éléments techniques sont la
            propriété de JulLab, sauf mention contraire. Les données de ville,
            quartier et statistiques proviennent en partie de sources publiques (dont l&apos;INSEE) et en
            partie des contributions de la communauté Notaville, régies par les{" "}
            <a href="/cgu" className="text-amber-ink hover:underline">
              conditions générales d&apos;utilisation
            </a>
            . Les photos affichées sur le site proviennent de deux sources : des photos de ville issues de
            Wikipédia, qui restent soumises à leur licence d&apos;origine, et des photos publiées par les
            utilisateurs eux-mêmes dans le cadre de leurs contributions (notamment les défis photo). Toute
            personne s&apos;estimant lésée par l&apos;utilisation d&apos;une photo peut en demander le
            retrait via{" "}
            <a href="mailto:jonathan@getvib.fr" className="text-amber-ink hover:underline">
              jonathan@getvib.fr
            </a>
            .
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
            rectification et de suppression de ses données, à exercer auprès de{" "}
            <a href="mailto:jonathan@getvib.fr" className="text-amber-ink hover:underline">
              jonathan@getvib.fr
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

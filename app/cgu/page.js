export const metadata = {
  title: "CGU — Notaville",
};

// Premier brouillon de conditions générales d'utilisation -- couvre
// les points essentiels pour un site participatif comme Notaville
// (compte, contributions, Notacoins), mais reste à faire relire par un
// professionnel avant une vraie mise en ligne : ce n'est pas un avis
// juridique.
export default function CGUPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-extrabold">Conditions générales d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-text-soft">
        Brouillon de travail — à faire relire par un professionnel avant la mise en ligne définitive.
      </p>

      <div className="mt-8 flex flex-col gap-7 text-sm">
        <section>
          <h2 className="font-display text-base font-bold">1. Objet</h2>
          <p className="mt-2 text-text-soft">
            Notaville est un service participatif de notation et de découverte des villes et quartiers
            de France : notes des habitants et des voyageurs, statistiques de coût de la vie
            crowdsourcées, comparateur de villes, défis et récompenses en Notacoins, offres chez des
            commerçants partenaires. Les présentes CGU encadrent l&apos;utilisation du service par tout
            utilisateur, avec ou sans compte.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">2. Accès au service</h2>
          <p className="mt-2 text-text-soft">
            Les statistiques de ville, le comparateur et les offres partenaires sont consultables sans
            compte. La création d&apos;un compte est nécessaire pour noter, contribuer, relever des
            défis et cumuler des Notacoins. L&apos;inscription est gratuite.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">3. Contenu déposé par les utilisateurs</h2>
          <p className="mt-2 text-text-soft">
            En publiant un avis, une photo, une donnée de coût de la vie ou toute autre contribution,
            l&apos;utilisateur garantit qu&apos;il en est l&apos;auteur ou dispose des droits nécessaires,
            et s&apos;engage à ne publier aucun contenu faux, injurieux, diffamatoire ou portant atteinte
            aux droits d&apos;un tiers. Notaville se réserve le droit de modérer, refuser ou retirer tout
            contenu ne respectant pas ces règles, et de suspendre un compte en cas d&apos;abus manifeste
            (contributions frauduleuses, spam, incohérences volontaires) — y compris en annulant les
            Notacoins obtenus de cette façon.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">4. Notacoins et défis</h2>
          <p className="mt-2 text-text-soft">
            Les Notacoins sont la monnaie interne du service, attribuée selon des règles propres à
            chaque défi ou action (avis, notation, photo, jeu...), précisées au moment de leur
            réalisation. Ils ne sont pas transférables entre utilisateurs, non convertibles en argent
            réel, et dépensables uniquement dans la boutique du service (badges, cadres, couleurs de
            pseudo, titres cosmétiques). Notaville peut faire évoluer le catalogue de défis et les
            montants de récompense à tout moment.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">
            4 bis. Notacoins convertibles (offres partenaires publicitaires)
          </h2>
          <p className="mt-2 text-text-soft">
            Distincts des Notacoins de l&apos;article 4, les <strong>Notacoins convertibles</strong> sont
            crédités uniquement lorsqu&apos;un utilisateur complète une offre publicitaire partenaire
            (ex. AdGem) rapportant un revenu réel à Notaville. Ce revenu est partagé à hauteur de{" "}
            <strong>60&nbsp;% pour l&apos;utilisateur, 40&nbsp;% conservés par Notaville</strong>, au taux
            fixe de <strong>10&nbsp;000 Notacoins convertibles = 1&nbsp;€</strong> :
          </p>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-card-edge">
            <table className="w-full min-w-[460px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-card-edge bg-card">
                  <th className="px-4 py-2.5 font-semibold">Revenu AdGem</th>
                  <th className="px-4 py-2.5 font-semibold">Notacoins convertibles</th>
                  <th className="px-4 py-2.5 font-semibold">Valeur utilisateur</th>
                  <th className="px-4 py-2.5 font-semibold">Marge Notaville</th>
                </tr>
              </thead>
              <tbody className="text-text-soft">
                {[
                  ["0,50 €", "3 000", "0,30 €", "0,20 €"],
                  ["1 €", "6 000", "0,60 €", "0,40 €"],
                  ["2 €", "12 000", "1,20 €", "0,80 €"],
                  ["5 €", "30 000", "3 €", "2 €"],
                  ["10 €", "60 000", "6 €", "4 €"],
                  ["20 €", "120 000", "12 €", "8 €"],
                  ["50 €", "300 000", "30 €", "20 €"],
                ].map(([revenu, nc, valeur, marge], i, arr) => (
                  <tr key={revenu} className={i < arr.length - 1 ? "border-b border-card-edge" : ""}>
                    <td className="px-4 py-2.5">{revenu}</td>
                    <td className="px-4 py-2.5">{nc}</td>
                    <td className="px-4 py-2.5">{valeur}</td>
                    <td className="px-4 py-2.5">{marge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-text-soft">
            Cette proportion (60 / 40) garantit une marge positive sur chaque conversion, quel que soit le
            volume — elle n&apos;est jamais calculée sur une moyenne ou une hypothèse globale.
          </p>

          <p className="mt-4 text-text-soft">
            Le revenu publicitaire display (AdSense) est distinct et reste intégralement acquis à
            Notaville : il ne donne lieu à aucun crédit de Notacoins, convertibles ou non.
          </p>

          <p className="mt-4 text-text-soft">
            À partir de <strong>100&nbsp;000 Notacoins convertibles (10&nbsp;€)</strong>, un utilisateur
            peut demander un virement en contactant la modération depuis{" "}
            <a href="/messages" className="text-amber-ink hover:underline">
              Messages → Contacter la modération
            </a>
            , en précisant le montant à convertir et ses coordonnées de virement. La demande est traitée
            manuellement par un modérateur, qui vérifie le solde et effectue le virement ; les Notacoins
            convertibles utilisés sont alors déduits du solde. Notaville se réserve le droit de refuser ou
            de différer une conversion en cas de doute sur son origine (voir article 3 — contenu
            frauduleux).
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">5. Offres partenaires</h2>
          <p className="mt-2 text-text-soft">
            Les réductions affichées sur le service sont proposées par des commerces partenaires tiers.
            Notaville n&apos;est pas partie à la transaction entre l&apos;utilisateur et le commerçant, et
            n&apos;est pas responsable des conditions d&apos;application de l&apos;offre, qui relèvent du
            commerçant.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">6. Données personnelles</h2>
          <p className="mt-2 text-text-soft">
            Les données de compte et de contribution sont utilisées pour faire fonctionner le service
            (affichage des profils, calcul des statistiques agrégées, attribution des Notacoins). Les
            statistiques de coût de la vie affichées publiquement sont toujours des moyennes, jamais des
            contributions individuelles. Conformément au RGPD, chaque utilisateur peut demander l&apos;accès,
            la rectification ou la suppression de ses données (voir les{" "}
            <a href="/mentions-legales" className="text-amber-ink hover:underline">
              mentions légales
            </a>{" "}
            pour le contact).
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">7. Responsabilité</h2>
          <p className="mt-2 text-text-soft">
            Les informations affichées (statistiques, comparateur, offres) sont fournies à titre
            indicatif, à partir de données déclaratives ou de sources publiques, et ne constituent ni un
            conseil personnalisé ni un engagement contractuel. Notaville met en œuvre des moyens
            raisonnables pour assurer la disponibilité du service, sans garantie de continuité absolue.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold">8. Modification des CGU</h2>
          <p className="mt-2 text-text-soft">
            Notaville peut modifier les présentes CGU à tout moment ; les utilisateurs en seront informés
            via le service. La poursuite de l&apos;utilisation du service après modification vaut
            acceptation des nouvelles CGU.
          </p>
        </section>
      </div>
    </div>
  );
}

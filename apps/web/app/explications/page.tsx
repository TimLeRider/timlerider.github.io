"use client";

import { useSimulation } from "@/lib/simulationContext";
import { useDerivedResults } from "@/lib/useDerivedResults";

function euros(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default function ExplicationsPage() {
  const { data } = useSimulation();
  const r = useDerivedResults(data);

  return (
    <div>
      <div className="card">
        <h2>Pourquoi ces résultats ?</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          Chaque montant affiché dans la simulation provient d&apos;un calcul explicite. Voici
          comment ils sont obtenus, avec vos propres chiffres.
        </p>
      </div>

      <div className="card">
        <h3>Pourquoi ma mensualité maximale est-elle de {euros(r.capacite.maxRecommendedMonthlyPayment)} ?</h3>
        <p>
          Revenus mensuels pris en compte ({euros(r.revenuMensuelBancaire)}) × taux
          d&apos;endettement cible ({data.tauxEndettementMax}%) − mensualités de crédits en cours
          ({euros(data.creditsEnCoursMensualites)}) − pension alimentaire (
          {euros(data.pensionAlimentaire)}).
        </p>
      </div>

      <div className="card">
        <h3>Pourquoi mon taux d&apos;endettement est-il de {r.tauxEndettementProjet}% ?</h3>
        <p>
          Mensualité totale du projet ({euros(r.pretBancaire.mensualite.totalMonthlyPayment)},
          assurance incluse) + charges existantes, le tout divisé par vos revenus mensuels (
          {euros(r.revenuMensuelBancaire)}).
        </p>
      </div>

      <div className="card">
        <h3>
          Pourquoi mon PTZ est de{" "}
          {r.ptz.montantPtz !== null ? euros(r.ptz.montantPtz) : "0 € (non éligible ou non calculé)"} ?
        </h3>
        <p>
          Le PTZ retient le coût de l&apos;opération (prix + travaux), plafonné selon votre zone et
          la taille de votre foyer ({r.ptz.coutRetenu !== null ? euros(r.ptz.coutRetenu) : "—"}),
          puis lui applique une quotité déterminée par votre tranche de revenus (
          {r.ptz.trancheId ?? "—"} → {r.ptz.quotitePercent ?? "—"}%).
        </p>
        <p className="help-text">
          Ces paramètres proviennent du fichier de configuration <code>ptz_rules.json</code>,
          modifiable sans changer le code de l&apos;application, et à reconfirmer sur une source
          officielle avant toute décision réelle.
        </p>
      </div>

      <div className="card">
        <h3>Pourquoi mes frais de notaire sont-ils de {euros(r.fraisNotaireEstimes)} ?</h3>
        <p>
          Estimation par défaut : environ 7,5 % du prix du bien pour un logement ancien (2,5 % pour
          un logement neuf), taux usuels en France. Un devis notarié donnera un montant exact.
        </p>
      </div>

      <div className="card">
        <h3>Pourquoi le ratio travaux est-il de {r.workRatio.ratioPercent}% ?</h3>
        <p>
          Montant des travaux ({euros(data.montantTravaux)}) divisé par le coût total de
          l&apos;opération ({euros(data.prixMaison + data.montantTravaux)}). Ce ratio doit
          atteindre au moins 25 % pour prétendre au PTZ ancien avec travaux (dans la configuration
          actuelle — à reconfirmer).
        </p>
      </div>

      <div className="card">
        <h3>Pourquoi ma zone détermine-t-elle mon éligibilité ?</h3>
        <p>
          Le PTZ ancien avec travaux n&apos;est actuellement configuré comme éligible qu&apos;en
          zones B2 et C (zones moins tendues), l&apos;objectif étant de favoriser la rénovation du
          bâti ancien en dehors des grandes métropoles. Les zones A bis, A et B1 restent réservées
          au neuf dans cette configuration.
        </p>
      </div>

      <div className="disclaimer">
        ⚠️ Simulation indicative. Le montant réellement accordé dépend de l&apos;établissement
        bancaire, de votre situation financière, des règles PTZ en vigueur et de
        l&apos;éligibilité définitive du projet.
      </div>
    </div>
  );
}

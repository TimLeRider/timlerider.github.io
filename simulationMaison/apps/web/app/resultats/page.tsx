"use client";

import Link from "next/link";
import { useSimulation } from "@/lib/simulationContext";
import { useDerivedResults } from "@/lib/useDerivedResults";
import { humanReadableReason } from "@/lib/ptz-engine/engine";
import { Gauge } from "@/components/Gauge";
import { BreakdownChart } from "@/components/BreakdownChart";

function euros(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default function ResultatsPage() {
  const { data } = useSimulation();
  const r = useDerivedResults(data);

  const capaciteChoisie = r.capacite.byDuration.find(
    (d) => d.durationYears === data.dureePretAnnees
  );

  return (
    <div>
      {r.pretDepasseCapacite && (
        <div className="disclaimer" style={{ borderColor: "#e0a0a0", background: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
          ⚠️ <strong>Le montage actuel dépasse votre capacité d&apos;emprunt.</strong> Le prêt
          nécessaire pour boucler le plan de financement ({euros(r.pretBancaire.montant)}) est
          supérieur au maximum que vos revenus permettent de rembourser sur {data.dureePretAnnees}{" "}
          ans ({euros(r.capaciteMaxPourDureeChoisie)}). Concrètement, la mensualité réelle du
          projet ({euros(r.pretBancaire.mensualite.totalMonthlyPayment)}/mois) dépasse la
          mensualité cible de {euros(Math.abs(r.ecartMensualite))}/mois. Pour rééquilibrer :
          augmentez l&apos;apport, allongez la durée, ou réduisez le prix du bien et/ou des
          travaux.
        </div>
      )}

      <div className="card">
        <h2>Votre simulation</h2>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Salaire net</td>
              <td className="num">{euros(data.salaireNetMensuel)}/mois</td>
            </tr>
            <tr>
              <td>Apport</td>
              <td className="num">{euros(data.apportPersonnel)}</td>
            </tr>
            <tr>
              <td>Mensualité cible (plafond soutenable)</td>
              <td className="num">≈ {euros(r.capacite.maxRecommendedMonthlyPayment)}/mois</td>
            </tr>
            <tr>
              <td>
                Mensualité réelle du montage actuel{" "}
                {r.pretDepasseCapacite && <span className="badge badge-danger">au-delà du plafond</span>}
              </td>
              <td className="num">≈ {euros(r.pretBancaire.mensualite.totalMonthlyPayment)}/mois</td>
            </tr>
            <tr>
              <td>Prêt bancaire nécessaire sur {data.dureePretAnnees} ans</td>
              <td className="num">≈ {euros(r.pretBancaire.montant)}</td>
            </tr>
            <tr>
              <td>PTZ potentiel</td>
              <td className="num">
                {r.ptz.montantPtz !== null ? `≈ ${euros(r.ptz.montantPtz)}` : "Non déterminé"}
              </td>
            </tr>
            <tr>
              <td>
                <strong>Budget total théorique</strong>
              </td>
              <td className="num">
                <strong>{euros(r.financement.totalFinancingProvided)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Capacité d&apos;emprunt</h2>
        <div className="card-grid">
          <div className="stat">
            <div className="stat-label">Mensualité maximale recommandée</div>
            <div className="stat-value">
              ≈ {euros(r.capacite.maxRecommendedMonthlyPayment)}/mois
            </div>
          </div>
          {r.capacite.byDuration.map((d) => (
            <div className="stat" key={d.durationYears}>
              <div className="stat-label">Capital empruntable sur {d.durationYears} ans (assurance incluse dans le calcul)</div>
              <div className="stat-value" style={{ fontSize: 19 }}>
                {euros(d.maxBorrowableCapital)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Gauge
            label="Taux d'endettement du montage actuel (prêt nécessaire, pas la mensualité cible)"
            valuePercent={r.tauxEndettementProjet}
            thresholds={{ good: data.tauxEndettementMax - 5, warning: data.tauxEndettementMax }}
          />
        </div>
      </div>

      <div className="card">
        <h2>Votre PTZ</h2>
        <div className="card-grid" style={{ marginBottom: 16 }}>
          <div className="stat">
            <div className="stat-label">Éligibilité</div>
            <div className="stat-value" style={{ fontSize: 18 }}>
              {r.ptz.eligible ? (
                <span className="badge badge-success">✅ Éligible</span>
              ) : (
                <span className="badge badge-danger">❌ Non éligible</span>
              )}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Zone</div>
            <div className="stat-value" style={{ fontSize: 18 }}>
              {data.zone ?? "—"}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Tranche PTZ</div>
            <div className="stat-value" style={{ fontSize: 18 }}>
              {r.ptz.trancheId ?? "—"}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Montant PTZ</div>
            <div className="stat-value" style={{ fontSize: 18 }}>
              {r.ptz.montantPtz !== null ? euros(r.ptz.montantPtz) : "—"}
            </div>
          </div>
        </div>

        {r.ptz.reasons.length > 0 && (
          <ul className="reasons-list">
            {r.ptz.reasons.map((reason) => (
              <li key={reason}>{humanReadableReason(reason)}</li>
            ))}
          </ul>
        )}

        {r.ptz.warnings.length > 0 && (
          <div className="disclaimer">
            {r.ptz.warnings.map((w, i) => (
              <div key={i}>⚠️ {w}</div>
            ))}
          </div>
        )}

        <p className="help-text">{r.ptz.disclaimer}</p>
        <Link href="/financement" className="btn btn-secondary">
          Voir le détail du financement →
        </Link>
      </div>

      <div className="card">
        <h2>Graphiques</h2>
        <div className="card-grid">
          <BreakdownChart
            title="Répartition du financement"
            data={[
              { name: "Apport", value: data.apportPersonnel },
              { name: "Prêt bancaire", value: r.pretBancaire.montant },
              { name: "PTZ", value: r.ptz.montantPtz ?? 0 },
            ]}
          />
          <BreakdownChart
            title="Coût du projet"
            data={[
              { name: "Maison", value: data.prixMaison },
              { name: "Travaux", value: data.montantTravaux },
              { name: "Frais de notaire", value: r.fraisNotaireEstimes },
              { name: "Autres frais", value: data.autresFrais + data.fraisDossier + data.fraisGarantie },
            ]}
          />
        </div>
      </div>

      {!r.financement.isCoherent && (
        <div className="disclaimer">
          ⚠️ Le plan de financement actuel ne couvre pas entièrement le coût du projet. Reste à
          financer estimé : <strong>{euros(r.financement.remainingToFinance)}</strong>. Ajustez
          votre apport, la durée du prêt ou le montant des travaux.
        </div>
      )}
    </div>
  );
}

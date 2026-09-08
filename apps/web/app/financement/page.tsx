"use client";

import { useSimulation } from "@/lib/simulationContext";
import { useDerivedResults } from "@/lib/useDerivedResults";

function euros(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
}

export default function FinancementPage() {
  const { data } = useSimulation();
  const r = useDerivedResults(data);

  // Échéancier simplifié : on regroupe par année pour rester lisible
  const parAnnee: Array<{
    annee: number;
    capitalRembourse: number;
    interets: number;
    assurance: number;
  }> = [];
  r.echeancierBancaire.forEach((row, index) => {
    const annee = Math.floor(index / 12) + 1;
    if (!parAnnee[annee - 1]) {
      parAnnee[annee - 1] = { annee, capitalRembourse: 0, interets: 0, assurance: 0 };
    }
    parAnnee[annee - 1]!.capitalRembourse += row.principalPaid;
    parAnnee[annee - 1]!.interets += row.interestPaid;
    parAnnee[annee - 1]!.assurance += row.insurancePaid;
  });

  return (
    <div>
      <div className="card">
        <h2>Détail du prêt bancaire</h2>
        <div className="card-grid">
          <div className="stat">
            <div className="stat-label">Montant emprunté</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              {euros(r.pretBancaire.montant)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Mensualité hors assurance</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              {euros(r.pretBancaire.mensualite.monthlyPaymentExcludingInsurance)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Assurance mensuelle</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              {euros(r.pretBancaire.mensualite.monthlyInsurance)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Mensualité totale</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              {euros(r.pretBancaire.mensualite.totalMonthlyPayment)}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Coût total du crédit</div>
            <div className="stat-value" style={{ fontSize: 19 }}>
              {euros(r.pretBancaire.mensualite.totalCreditCost)}
            </div>
            <div className="stat-sub">
              dont {euros(r.pretBancaire.mensualite.totalInterest)} d&apos;intérêts et{" "}
              {euros(r.pretBancaire.mensualite.totalInsurance)} d&apos;assurance
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Condition de travaux (PTZ ancien)</h2>
        <p>
          Travaux : <strong>{euros(data.montantTravaux)}</strong> — Coût total :{" "}
          <strong>{euros(data.prixMaison + data.montantTravaux)}</strong> — Ratio travaux :{" "}
          <strong>{r.workRatio.ratioPercent}%</strong>
        </p>
        {r.workRatio.ratioPercent >= 25 ? (
          <span className="badge badge-success">✅ Conditions de travaux PTZ respectées (≥ 25 %)</span>
        ) : (
          <span className="badge badge-danger">❌ Conditions de travaux PTZ non respectées (&lt; 25 %)</span>
        )}
      </div>

      <div className="card">
        <h2>Vérification de la cohérence du plan de financement</h2>
        <table className="data-table">
          <tbody>
            <tr>
              <td>Coût total du projet</td>
              <td className="num">{euros(r.financement.totalProjectCost)}</td>
            </tr>
            <tr>
              <td>Financement apporté (apport + prêt + PTZ)</td>
              <td className="num">{euros(r.financement.totalFinancingProvided)}</td>
            </tr>
            <tr>
              <td>
                <strong>Reste à financer</strong>
              </td>
              <td className="num">
                <strong>{euros(r.financement.remainingToFinance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        {r.financement.isCoherent ? (
          <span className="badge badge-success">✅ Plan de financement cohérent</span>
        ) : (
          <span className="badge badge-warning">⚠️ Financement incomplet — ajustez apport, durée ou budget travaux</span>
        )}
      </div>

      <div className="card">
        <h2>Échéancier simplifié (par année)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Année</th>
              <th className="num">Capital remboursé</th>
              <th className="num">Intérêts</th>
              <th className="num">Assurance</th>
            </tr>
          </thead>
          <tbody>
            {parAnnee.map((row) => (
              <tr key={row.annee}>
                <td>Année {row.annee}</td>
                <td className="num">{euros(Math.round(row.capitalRembourse))}</td>
                <td className="num">{euros(Math.round(row.interets))}</td>
                <td className="num">{euros(Math.round(row.assurance))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

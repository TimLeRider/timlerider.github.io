import Link from "next/link";

export default function HomePage() {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>
        Simulez l&apos;achat de votre maison ancienne à rénover
      </h1>
      <p style={{ color: "var(--color-text-muted)", maxWidth: 560, margin: "0 auto 24px" }}>
        Capacité d&apos;emprunt, PTZ, éligibilité de votre commune, plan de financement complet :
        obtenez une estimation indicative en quelques minutes.
      </p>
      <Link href="/simulation" className="btn btn-primary">
        Démarrer ma simulation
      </Link>
      <div className="disclaimer" style={{ marginTop: 32, textAlign: "left" }}>
        ⚠️ Simulation indicative. Le montant réellement accordé dépend de l&apos;établissement
        bancaire, de votre situation financière, des règles PTZ en vigueur et de l&apos;éligibilité
        définitive du projet.
      </div>
    </div>
  );
}

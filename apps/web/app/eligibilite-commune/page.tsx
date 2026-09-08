"use client";

import { useState } from "react";
import Link from "next/link";
import { useSimulation } from "@/lib/simulationContext";
import type { CommuneInfo, CommuneWithZone } from "@/lib/communes/types";

const ZONE_LABELS: Record<string, string> = {
  A_BIS: "Zone A bis",
  A: "Zone A",
  B1: "Zone B1",
  B2: "Zone B2",
  C: "Zone C",
};

export default function EligibiliteCommunePage() {
  const { data, update } = useSimulation();
  const [query, setQuery] = useState(data.communeNom || "");
  const [results, setResults] = useState<CommuneInfo[]>([]);
  const [selected, setSelected] = useState<CommuneWithZone | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [nearby, setNearby] = useState<CommuneWithZone[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch(`/api/communes/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      setResults(json.communes);
    } catch (err: any) {
      setError(
        err.message ??
          "Impossible de joindre le service de recherche de communes (geo.api.gouv.fr). Vérifiez votre connexion réseau."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCommune(commune: CommuneInfo) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/communes/zone?codeInsee=${commune.codeInsee}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      setSelected(json.commune);
      update({
        communeNom: commune.nom,
        codePostal: commune.codePostal,
        codeInsee: commune.codeInsee,
        departement: commune.departement,
        zone: json.commune.zone,
      });
    } catch (err: any) {
      setError(err.message ?? "Impossible de récupérer le zonage de cette commune.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFindNearby() {
    if (!data.codeInsee) return;
    setNearbyLoading(true);
    try {
      const res = await fetch(
        `/api/communes/nearby?codeInsee=${data.codeInsee}&radiusKm=${radiusKm}`
      );
      const json = await res.json();
      if (res.ok) setNearby(json.communes);
    } finally {
      setNearbyLoading(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h2>2. Éligibilité de la commune</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          Recherche via l&apos;API officielle{" "}
          <a href="https://geo.api.gouv.fr" target="_blank" rel="noreferrer">
            geo.api.gouv.fr
          </a>{" "}
          (nom ou code postal). Le zonage PTZ est ensuite recherché dans une base séparée — voir
          l&apos;avertissement ci-dessous si la donnée n&apos;est pas encore disponible pour votre
          commune.
        </p>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom de la commune ou code postal"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Recherche..." : "Rechercher"}
          </button>
        </form>

        {error && (
          <div className="disclaimer" style={{ marginTop: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {results.length > 0 && !selected && (
          <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
            {results.map((c) => (
              <li key={c.codeInsee} style={{ marginBottom: 6 }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => handleSelectCommune(c)}
                  type="button"
                >
                  {c.nom} — {c.codePostal} ({c.departement})
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="card">
          <h2>Commune : {selected.nom}</h2>
          <div className="card-grid">
            <div className="stat">
              <div className="stat-label">Code INSEE</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {selected.codeInsee}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Zone</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {selected.zone ? ZONE_LABELS[selected.zone] : "Inconnue"}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">PTZ ancien avec travaux</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {selected.zone === "B2" || selected.zone === "C" ? (
                  <span className="badge badge-success">✅ Éligible (zone)</span>
                ) : selected.zone ? (
                  <span className="badge badge-danger">❌ Non éligible (zone)</span>
                ) : (
                  <span className="badge badge-warning">⚠️ Zone inconnue</span>
                )}
              </div>
            </div>
          </div>

          {!selected.zone && (
            <div className="disclaimer">
              ⚠️ Le zonage n&apos;a pas pu être déterminé pour cette commune (service
              parcelle-info.fr injoignable, quota dépassé, ou donnée non couverte pour ce point).
              Aucune valeur n&apos;a été inventée : vérifiez la zone sur service-public.fr ou
              auprès de l&apos;ANIL avant de poursuivre.
            </div>
          )}

          {selected.zone && (
            <p className="help-text">
              Zonage fourni par{" "}
              <a href="https://parcelle-info.fr" target="_blank" rel="noreferrer">
                parcelle-info.fr
              </a>{" "}
              — source déclarée : Zonage A/B/C du logement, Ministère de la Transition
              écologique, licence Licence Ouverte 2.0.
              {typeof (selected as any).priceM2Median === "number" &&
                ` Prix médian indicatif : ${(selected as any).priceM2Median.toLocaleString("fr-FR")} €/m² (DVF, DGFiP/Etalab).`}
            </p>
          )}

          {selected.zone && (
            <p style={{ color: "var(--color-text-muted)" }}>
              Cette commune est en {ZONE_LABELS[selected.zone]}. Pour un logement ancien avec
              travaux, le PTZ n&apos;est actuellement considéré éligible (dans la configuration de
              cette application) qu&apos;en zones B2 et C, sous réserve d&apos;au moins 25 % de
              travaux et d&apos;un DPE D minimum après travaux — conditions à reconfirmer, voir
              l&apos;onglet Explications.
            </p>
          )}

          <div className="btn-row">
            <div className="field" style={{ maxWidth: 220 }}>
              <label>Rayon de recherche</label>
              <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                {[5, 10, 15, 20, 30].map((r) => (
                  <option key={r} value={r}>
                    {r} km
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={handleFindNearby} type="button">
              {nearbyLoading ? "Recherche..." : "Trouver les communes éligibles autour de moi"}
            </button>
            <Link href="/resultats" className="btn btn-primary">
              Voir mes résultats →
            </Link>
          </div>
        </div>
      )}

      {nearby.length > 0 && (
        <div className="card">
          <h2>Communes dans un rayon de {radiusKm} km</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Commune</th>
                <th>Distance</th>
                <th>Zone</th>
                <th>PTZ ancien</th>
                <th>Prix médian indicatif</th>
              </tr>
            </thead>
            <tbody>
              {nearby.map((c: any) => (
                <tr key={c.codeInsee}>
                  <td>{c.nom}</td>
                  <td>{c.distanceKm} km</td>
                  <td>{c.zone ? ZONE_LABELS[c.zone] : "Inconnue"}</td>
                  <td>
                    {c.zone === "B2" || c.zone === "C" ? "✅" : c.zone ? "❌" : "⚠️"}
                  </td>
                  <td>
                    {typeof c.priceM2Median === "number"
                      ? `${c.priceM2Median.toLocaleString("fr-FR")} €/m²`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="help-text" style={{ marginTop: 10 }}>
            Zonage et prix médian au m² fournis par{" "}
            <a href="https://parcelle-info.fr" target="_blank" rel="noreferrer">
              parcelle-info.fr
            </a>{" "}
            (source déclarée : Zonage A/B/C du logement — Ministère de la Transition
            écologique ; DVF — DGFiP/Etalab), licence Licence Ouverte 2.0. Au-delà des{" "}
            {15} communes les plus proches, le zonage n&apos;est pas interrogé (quota par
            adresse IP de l&apos;API, sans clé) et reste marqué « Inconnue ».
          </p>
        </div>
      )}
    </div>
  );
}

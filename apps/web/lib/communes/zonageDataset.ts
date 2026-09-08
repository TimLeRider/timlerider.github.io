import type { ZonagePtzZone } from "./types";

export interface ZoneEntry {
  zone: ZonagePtzZone;
  source: string;
  verifiedAt: string;
  /** Prix médian au m² de la commune (DVF), s'il a pu être extrait de la même réponse. */
  priceM2Median?: number | null;
}

const PARCELLE_INFO_BASE_URL = "https://parcelle-info.fr";

/**
 * Zonage PTZ/ABC réel, via l'API publique parcelle-info.fr.
 *
 * Confirmé le 2026-09-08 sur un exemple réel (Labarthe-sur-Lèze, 31860) : la donnée
 * de zonage A/B/C n'est pas dans un bloc dédié "zonage" mais dans le bloc "rent"
 * (loyers), sous la clé `rent.zoning_abc`, avec une valeur texte du type
 * `"B1 — marché tendu"`. Source déclarée dans le fait lui-même :
 * producteur "Ministère de la Transition écologique", dataset "Zonage A/B/C du
 * logement", licence LO-2.0 (data.gouv.fr).
 *
 * Le prix médian au m² (utile pour la section "communes à proximité") est disponible
 * dans le bloc "market", clé `market.commune.price_m2_median`.
 *
 * L'API interroge par texte libre (paramètre `q`), pas par code INSEE. Comme ces deux
 * données sont à la maille "commune" (geometry_match: "commune"), n'importe quelle
 * requête qui résout correctement sur la commune convient : on utilise
 * `"<nom de la commune> <code postal>"`.
 *
 * Limites connues (documentées par le fournisseur) :
 * - Pas de clé API, quota par adresse IP, réponse 429 en cas de dépassement — d'où
 *   l'usage du paramètre `blocks` pour ne demander que ce dont on a besoin, et le
 *   cache HTTP (`revalidate`) posé côté appelant dans geoApiGouvProvider.ts.
 * - Attribution obligatoire (licence LO-2.0) : le texte exact à afficher est renvoyé
 *   dans le tableau `attributions` de chaque réponse ; voir le README pour l'endroit
 *   où l'afficher dans l'interface.
 * - Ce service est décrit par son éditeur comme récent et pouvant évoluer ou
 *   s'interrompre sans préavis : gardez un chemin de repli (cache long, ou retour à
 *   un jeu de données statique) avant une mise en production réelle.
 */
export async function lookupZoneByCommune(
  communeName: string,
  postalCode: string
): Promise<ZoneEntry | null> {
  const q = `${communeName} ${postalCode}`.trim();
  if (!q) return null;

  const params = new URLSearchParams({ q });
  params.append("blocks", "rent");
  params.append("blocks", "market");
  const url = `${PARCELLE_INFO_BASE_URL}/v1/profile?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
  } catch {
    // Service injoignable : on ne devine jamais une zone, on renvoie "inconnue".
    return null;
  }

  if (!response.ok) {
    // Inclut le cas 429 (quota dépassé) : on renvoie "inconnue" plutôt que d'inventer.
    return null;
  }

  const data = await response.json();

  const rentBlock = (data.blocks as any[])?.find((b) => b.block === "rent");
  const marketBlock = (data.blocks as any[])?.find((b) => b.block === "market");

  const zoningFact = rentBlock?.facts?.find((f: any) => f.key === "rent.zoning_abc");
  if (!zoningFact || typeof zoningFact.value !== "string") {
    // Bloc "rent" en status "partial"/"not_covered"/"error", ou fait absent : inconnue.
    return null;
  }

  const zone = parseZoneCode(zoningFact.value);
  if (!zone) return null;

  const priceFact = marketBlock?.facts?.find(
    (f: any) => f.key === "market.commune.price_m2_median"
  );

  return {
    zone,
    source: `${zoningFact.source_label} (${zoningFact.producer}), millésime ${zoningFact.data_date ?? "inconnu"}, via parcelle-info.fr`,
    verifiedAt: zoningFact.retrieved_at ?? new Date().toISOString(),
    priceM2Median: typeof priceFact?.value === "number" ? priceFact.value : null,
  };
}

/**
 * Extrait le code de zone (ex: "B1") d'une valeur texte du type
 * "B1 — marché tendu" ou "A bis — marché très tendu" renvoyée par l'API.
 */
function parseZoneCode(raw: string): ZonagePtzZone | null {
  const label = raw.split("—")[0]?.trim().toUpperCase().replace(/\s+/g, "_") ?? "";

  const known: Record<string, ZonagePtzZone> = {
    A_BIS: "A_BIS",
    ABIS: "A_BIS",
    A: "A",
    B1: "B1",
    B2: "B2",
    C: "C",
  };

  return known[label] ?? null;
}

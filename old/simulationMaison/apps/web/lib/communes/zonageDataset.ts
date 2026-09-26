import type { ZonagePtzZone } from "./types";

export interface ZoneEntry {
  zone: ZonagePtzZone;
  source: string;
  verifiedAt: string;
  priceM2Median?: number | null;
  loyerM2Moyen?: number | null;
}

let communesCache: Record<string, any> | null = null;

async function loadCommunesDb(): Promise<Record<string, any>> {
  if (communesCache) return communesCache;
  try {
    const res = await fetch("/communes-db.json");
    if (!res.ok) throw new Error("Impossible de charger communes-db.json");
    communesCache = await res.json();
    return communesCache ?? {};
  } catch (err) {
    console.error("Erreur de chargement de la base local communes-db.json :", err);
    return {}; // Retourne un objet vide au lieu de null
  }
}

export async function fetchZoneFromLocal(codeInsee: string): Promise<ZoneEntry | null> {
  const db = await loadCommunesDb();
  if (!db) return null; //  Correction TS : évite l'accès sur null

  const entry = db[codeInsee];
  if (!entry) return null;

  let rawZone = entry.zonage_ptz?.zone ?? "C";
  if (rawZone === "Abis") rawZone = "A_BIS";

  return {
    zone: rawZone as ZonagePtzZone,
    source: "Base de données locale (Zonage ABC / Carte des Loyers)",
    verifiedAt: new Date().toISOString(),
    priceM2Median: null,
    loyerM2Moyen: entry.loyers?.loyer_m2_moyen ?? null,
  };
}

export const lookupZoneByCommune = fetchZoneFromLocal;
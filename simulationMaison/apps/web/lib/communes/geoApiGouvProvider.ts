import type { CommuneProvider, CommuneInfo, CommuneWithZone } from "./types";
import { fetchZoneFromLocal } from "./zonageDataset";

let communesCache: Record<string, any> | null = null;

async function getDb() {
  if (communesCache) return communesCache;
  const res = await fetch("/communes-db.json");
  communesCache = await res.json();
  return communesCache;
}

export class GeoApiGouvCommuneProvider implements CommuneProvider {
  async searchCommunes(query: string): Promise<CommuneInfo[]> {
    if (!query || query.trim().length < 2) return [];

    const db = await getDb();
    if (!db) return [];
    const term = query.toLowerCase().trim();
    const isPostalCode = /^\d{2,5}$/.test(term);

    const matches: CommuneInfo[] = [];

    for (const item of Object.values(db) as any[]) {
      const c = item.commune;
      const matchNom = c.nom.toLowerCase().includes(term);
      const matchCP = c.codes_postaux.some((cp: string) => cp.startsWith(term));
      const matchInsee = c.code_insee.startsWith(term);

      if ((isPostalCode && (matchCP || matchInsee)) || (!isPostalCode && matchNom)) {
        matches.push({
          nom: c.nom,
          codeInsee: c.code_insee,
          codePostal: c.codes_postaux[0] ?? "",
          departement: c.departement ?? "",
          region: c.region ?? null,
          centre: item.adresse_centre?.latitude ? {
            lat: item.adresse_centre.latitude,
            lon: item.adresse_centre.longitude,
          } : null,
        });
      }

      if (matches.length >= 10) break; // Limite aux 10 premiers résultats
    }

    return matches;
  }

  async getZone(codeInsee: string): Promise<CommuneWithZone | null> {
    const db = await getDb();
    if (!db) return null; //  Correction : renvoie null au lieu de []

    const item = db[codeInsee];
    if (!item) return null;

    const c = item.commune;
    const info: CommuneInfo = {
      nom: c.nom,
      codeInsee: c.code_insee,
      codePostal: c.codes_postaux[0] ?? "",
      departement: c.departement ?? "",
      region: c.region ?? null,
      centre: item.adresse_centre?.latitude ? {
        lat: item.adresse_centre.latitude,
        lon: item.adresse_centre.longitude,
      } : null,
    };

    const zoneEntry = await fetchZoneFromLocal(codeInsee);

    return {
      ...info,
      zone: zoneEntry?.zone ?? null,
      zoneSource: zoneEntry?.source ?? null,
      zoneVerifiedAt: zoneEntry?.verifiedAt ?? null,
      priceM2Median: zoneEntry?.loyerM2Moyen ?? null,
    };
  }

  async findNearbyCommunes(codeInsee: string, radiusKm: number): Promise<CommuneWithZone[]> {
    const db = await getDb();
    if (!db) return [];
    const centerCommune = db[codeInsee];
    if (!centerCommune || !centerCommune.adresse_centre?.latitude) return [];

    const lat1 = centerCommune.adresse_centre.latitude;
    const lon1 = centerCommune.adresse_centre.longitude;

    const withinRadius: (CommuneWithZone & { distanceKm: number })[] = [];

    for (const [code, item] of Object.entries(db) as [string, any][]) {
      if (!item.adresse_centre?.latitude) continue;

      const lat2 = item.adresse_centre.latitude;
      const lon2 = item.adresse_centre.longitude;
      const distanceKm = haversineDistanceKm(lat1, lon1, lat2, lon2);

      if (distanceKm <= radiusKm) {
        let rawZone = item.zonage_ptz?.zone ?? "C";
        if (rawZone === "Abis") rawZone = "A_BIS";

        withinRadius.push({
          nom: item.commune.nom,
          codeInsee: code,
          codePostal: item.commune.codes_postaux[0] ?? "",
          departement: item.commune.departement ?? "",
          region: item.commune.region ?? null,
          centre: { lat: lat2, lon: lon2 },
          distanceKm,
          zone: rawZone as any,
          zoneSource: "Base de données locale",
          zoneVerifiedAt: new Date().toISOString(),
          priceM2Median: item.loyers?.loyer_m2_moyen ?? null,
        });
      }
    }

    return withinRadius.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
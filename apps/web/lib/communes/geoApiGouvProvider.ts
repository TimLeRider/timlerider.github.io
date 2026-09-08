import type { CommuneProvider, CommuneInfo, CommuneWithZone } from "./types";
import { lookupZoneByCommune } from "./zonageDataset";

/** Nombre maximum de communes interrogées sur parcelle-info.fr pour un même appel
 * "communes à proximité", afin de ne pas dépasser le quota par IP (pas de clé API). */
const MAX_ZONE_LOOKUPS_PER_NEARBY_CALL = 15;

const BASE_URL = "https://geo.api.gouv.fr";

/**
 * Fournisseur réel basé sur l'API officielle "Découpage administratif" (geo.api.gouv.fr),
 * gratuite et sans clé, opérée par l'État français (Etalab / DINUM).
 *
 * IMPORTANT : cette API donne le nom, le code INSEE, le(s) code(s) postal(aux),
 * le département, la région et les coordonnées d'une commune — mais PAS le zonage
 * PTZ/ABC. Le zonage provient d'un jeu de données séparé (voir zonageDataset.ts),
 * car il n'existe pas d'API officielle unifiée et gratuite pour ce zonage à ce jour.
 * Ce fichier doit être appelé UNIQUEMENT côté serveur (route API), jamais depuis le
 * navigateur, conformément à l'architecture "pas de clé/API sensible côté frontend"
 * (même si cette API en particulier ne nécessite pas de clé, on garde la même règle
 * pour toutes les intégrations externes).
 */
export class GeoApiGouvCommuneProvider implements CommuneProvider {
  async searchCommunes(query: string): Promise<CommuneInfo[]> {
    if (!query || query.trim().length < 2) return [];

    const isPostalCode = /^\d{2,5}$/.test(query.trim());
    const params = new URLSearchParams({
      fields: "nom,code,codesPostaux,departement,region,centre",
      boost: "population",
      limit: "10",
    });

    if (isPostalCode) {
      params.set("codePostal", query.trim());
    } else {
      params.set("nom", query.trim());
    }

    const url = `${BASE_URL}/communes?${params.toString()}`;
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });

    if (!response.ok) {
      throw new Error(
        `Échec de la recherche de commune auprès de geo.api.gouv.fr (statut ${response.status})`
      );
    }

    const data = await response.json();
    return (data as any[]).map(mapRawCommune);
  }

  async getZone(codeInsee: string): Promise<CommuneWithZone | null> {
    const url = `${BASE_URL}/communes/${codeInsee}?fields=nom,code,codesPostaux,departement,region,centre`;
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!response.ok) return null;

    const raw = await response.json();
    const info = mapRawCommune(raw);
    const zoneEntry = await lookupZoneByCommune(info.nom, info.codePostal);

    return {
      ...info,
      zone: zoneEntry?.zone ?? null,
      zoneSource: zoneEntry?.source ?? null,
      zoneVerifiedAt: zoneEntry?.verifiedAt ?? null,
      priceM2Median: zoneEntry?.priceM2Median ?? null,
    };
  }

  async findNearbyCommunes(codeInsee: string, radiusKm: number): Promise<CommuneWithZone[]> {
    const centerResponse = await fetch(
      `${BASE_URL}/communes/${codeInsee}?fields=centre`,
      { next: { revalidate: 60 * 60 * 24 } }
    );
    if (!centerResponse.ok) return [];
    const center = await centerResponse.json();
    const { lat, lon } = center.centre?.coordinates
      ? { lon: center.centre.coordinates[0], lat: center.centre.coordinates[1] }
      : { lat: null, lon: null };

    if (lat === null || lon === null) return [];

    // Pas de `boost=population` ici : ce paramètre est fait pour la recherche
    // textuelle par nom (favoriser les grandes villes homonymes), et perturbait le
    // tri par distance d'une recherche géographique lat/lon — corrigé le 2026-09-08.
    const url = `${BASE_URL}/communes?lat=${lat}&lon=${lon}&fields=nom,code,codesPostaux,departement,region,centre&limit=100`;
    const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!response.ok) return [];

    const data = (await response.json()) as any[];

    const withinRadius = data
      .map(mapRawCommune)
      .map((info) => ({
        ...info,
        distanceKm: info.centre
          ? haversineDistanceKm(lat, lon, info.centre.lat, info.centre.lon)
          : Infinity,
      }))
      .filter((c) => c.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Le zonage vient d'une API tierce sans clé (quota par IP) : on ne l'interroge
    // que pour les communes les plus proches, pas pour toute la liste filtrée.
    const results: CommuneWithZone[] = [];
    for (const [index, info] of withinRadius.entries()) {
      if (index >= MAX_ZONE_LOOKUPS_PER_NEARBY_CALL) {
        results.push({
          ...info,
          zone: null,
          zoneSource: null,
          zoneVerifiedAt: null,
          priceM2Median: null,
        });
        continue;
      }
      const zoneEntry = await lookupZoneByCommune(info.nom, info.codePostal);
      results.push({
        ...info,
        zone: zoneEntry?.zone ?? null,
        zoneSource: zoneEntry?.source ?? null,
        zoneVerifiedAt: zoneEntry?.verifiedAt ?? null,
        priceM2Median: zoneEntry?.priceM2Median ?? null,
      });
    }

    return results;
  }
}

function mapRawCommune(raw: any): CommuneInfo {
  return {
    nom: raw.nom,
    codeInsee: raw.code,
    codePostal: raw.codesPostaux?.[0] ?? "",
    departement: raw.departement?.nom ?? raw.departement?.code ?? "",
    region: raw.region?.nom ?? null,
    centre: raw.centre?.coordinates
      ? { lon: raw.centre.coordinates[0], lat: raw.centre.coordinates[1] }
      : null,
  };
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

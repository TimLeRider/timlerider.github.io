export type ZonagePtzZone = "A_BIS" | "A" | "B1" | "B2" | "C";

export interface CommuneInfo {
  nom: string;
  codeInsee: string;
  codePostal: string;
  departement: string;
  region: string | null;
  centre: { lat: number; lon: number } | null;
}

export interface CommuneWithZone extends CommuneInfo {
  /** null = zone inconnue, à ne JAMAIS remplacer par une valeur devinée */
  zone: ZonagePtzZone | null;
  zoneSource: string | null;
  zoneVerifiedAt: string | null;
  /** Prix médian indicatif au m² (DVF), si disponible depuis la même source que le zonage */
  priceM2Median?: number | null;
  /** Distance en km depuis la commune de référence, renseignée uniquement par findNearbyCommunes */
  distanceKm?: number;
}

/**
 * Interface d'abstraction pour la recherche de communes et leur zonage PTZ.
 * Permet de remplacer facilement le fournisseur (API officielle, base locale, etc.)
 * sans toucher au reste de l'application.
 */
export interface CommuneProvider {
  /** Recherche par nom (autocomplete) ou code postal */
  searchCommunes(query: string): Promise<CommuneInfo[]>;
  /** Récupère le zonage ABC/PTZ d'une commune par son code INSEE. Renvoie null si inconnu (ne jamais inventer). */
  getZone(codeInsee: string): Promise<CommuneWithZone | null>;
  /** Trouve les communes dans un rayon donné (km) autour d'une commune de référence */
  findNearbyCommunes(codeInsee: string, radiusKm: number): Promise<CommuneWithZone[]>;
}

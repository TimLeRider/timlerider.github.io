import type { CommuneProvider, CommuneInfo, CommuneWithZone } from "./types";

const SAMPLE_COMMUNES: CommuneWithZone[] = [
  {
    nom: "Labarthe-sur-Lèze",
    codeInsee: "31254",
    codePostal: "31860",
    departement: "Haute-Garonne",
    region: "Occitanie",
    centre: { lat: 43.4667, lon: 1.4167 },
    zone: "B2",
    zoneSource: "MOCK_TEST_DATA",
    zoneVerifiedAt: "N/A",
  },
  {
    nom: "Toulouse",
    codeInsee: "31555",
    codePostal: "31000",
    departement: "Haute-Garonne",
    region: "Occitanie",
    centre: { lat: 43.6045, lon: 1.4442 },
    zone: "B1",
    zoneSource: "MOCK_TEST_DATA",
    zoneVerifiedAt: "N/A",
  },
];

/** Fournisseur factice utilisé dans les tests unitaires — aucun appel réseau. */
export class MockCommuneProvider implements CommuneProvider {
  async searchCommunes(query: string): Promise<CommuneInfo[]> {
    return SAMPLE_COMMUNES.filter((c) =>
      c.nom.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getZone(codeInsee: string): Promise<CommuneWithZone | null> {
    return SAMPLE_COMMUNES.find((c) => c.codeInsee === codeInsee) ?? null;
  }

  async findNearbyCommunes(codeInsee: string): Promise<CommuneWithZone[]> {
    return SAMPLE_COMMUNES.filter((c) => c.codeInsee !== codeInsee);
  }
}

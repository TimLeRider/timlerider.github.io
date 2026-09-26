import { describe, it, expect } from "vitest";
import { checkPtzEligibility } from "@/lib/ptz-engine/engine";

describe("checkPtzEligibility — logement ancien avec travaux", () => {
  it("est inéligible si la zone n'autorise pas l'ancien avec travaux (zone A)", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "A",
      occupantsCount: 1,
      rfr: 20000,
      propertyPrice: 120000,
      workAmount: 40000,
      isPrimoAccedant: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("ZONE_NON_ELIGIBLE_ANCIEN");
  });

  it("est inéligible si le ratio travaux est insuffisant", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "B2",
      occupantsCount: 1,
      rfr: 15000,
      propertyPrice: 120000,
      workAmount: 5000, // ratio bien < 25%
      isPrimoAccedant: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("RATIO_TRAVAUX_INSUFFISANT");
  });

  it("est inéligible si les revenus dépassent le plafond de ressources", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "B2",
      occupantsCount: 1,
      rfr: 500000, // très au-dessus de tout plafond réaliste
      propertyPrice: 120000,
      workAmount: 40000,
      isPrimoAccedant: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("REVENUS_SUPERIEURS_AU_PLAFOND");
  });

  it("est inéligible si la condition de primo-accession n'est pas remplie", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "B2",
      occupantsCount: 1,
      rfr: 15000,
      propertyPrice: 120000,
      workAmount: 40000,
      isPrimoAccedant: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("PRIMO_ACCESSION_NON_REMPLIE");
  });

  it("calcule un montant PTZ positif quand toutes les conditions sont réunies", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "B2",
      occupantsCount: 1,
      rfr: 15000,
      propertyPrice: 120000,
      workAmount: 40000, // ratio = 40000/160000 = 25% -> OK
      isPrimoAccedant: true,
      dpeAfterWorks: "D",
    });
    expect(result.eligible).toBe(true);
    expect(result.montantPtz).not.toBeNull();
    expect(result.montantPtz).toBeGreaterThan(0);
    expect(result.ratioTravauxPercent).toBe(25);
  });

  it("plafonne le coût retenu au plafond d'opération de la zone", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "C", // plafond opération 1 pers = 100 000
      occupantsCount: 1,
      rfr: 15000,
      propertyPrice: 300000,
      workAmount: 100000, // coût brut 400 000, largement au-dessus du plafond
      isPrimoAccedant: true,
    });
    expect(result.coutRetenu).toBe(100000);
  });

  it("inclut toujours le disclaimer et ne masque jamais les avertissements", () => {
    const result = checkPtzEligibility({
      housingType: "ANCIEN_AVEC_TRAVAUX",
      zone: "B2",
      occupantsCount: 1,
      rfr: 15000,
      propertyPrice: 120000,
      workAmount: 40000,
      isPrimoAccedant: true,
    });
    expect(result.disclaimer).toContain("indicative");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("checkPtzEligibility — logement neuf", () => {
  it("est éligible en zone A bis pour un logement neuf si toutes conditions réunies", () => {
    const result = checkPtzEligibility({
      housingType: "NEUF",
      zone: "A_BIS",
      occupantsCount: 2,
      rfr: 40000,
      propertyPrice: 220000,
      workAmount: 0,
      isPrimoAccedant: true,
    });
    expect(result.reasons).not.toContain("ZONE_NON_ELIGIBLE_ANCIEN");
  });
});

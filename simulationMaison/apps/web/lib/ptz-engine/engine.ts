import ptzRules from "@/lib/config/ptz_rules.json";
import { calculateWorkRatio } from "@/lib/calculations/loan";

export type PtzZone = "A_BIS" | "A" | "B1" | "B2" | "C";
export type HousingType = "NEUF" | "ANCIEN_AVEC_TRAVAUX";

export interface PtzEligibilityInput {
  housingType: HousingType;
  zone: PtzZone;
  /** Nombre de personnes qui occuperont le logement */
  occupantsCount: number;
  /** Revenu fiscal de référence du foyer (année N-2) */
  rfr: number;
  /** Prix d'achat du bien */
  propertyPrice: number;
  /** Montant des travaux (0 si non concerné) */
  workAmount: number;
  /** Frais annexes/notaire à exclure du coût retenu PTZ si nécessaire (le coût PTZ exclut les frais de notaire) */
  isPrimoAccedant: boolean;
  /** DPE atteint après travaux, si connu (ex: "D", "C"...) — optionnel */
  dpeAfterWorks?: string;
}

export type PtzIneligibilityReason =
  | "ZONE_NON_ELIGIBLE_ANCIEN"
  | "RATIO_TRAVAUX_INSUFFISANT"
  | "REVENUS_SUPERIEURS_AU_PLAFOND"
  | "PRIMO_ACCESSION_NON_REMPLIE"
  | "DPE_INSUFFISANT"
  | "DONNEES_INSUFFISANTES";

export interface PtzResult {
  eligible: boolean;
  reasons: PtzIneligibilityReason[];
  zone: PtzZone;
  occupantsCount: number;
  rfr: number;
  plafondRessources: number | null;
  plafondOperation: number | null;
  coutRetenu: number | null;
  ratioTravauxPercent: number | null;
  trancheId: string | null;
  quotitePercent: number | null;
  montantPtz: number | null;
  dureeRemboursementAnnees: number | null;
  differeAnnees: number | null;
  /** Avertissements qui n'empêchent pas le calcul mais méritent vérification humaine */
  warnings: string[];
  /** Rappel : ce résultat n'est pas une décision bancaire */
  disclaimer: string;
}

type OccupantsKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8_et_plus";

function occupantsToKey(count: number): OccupantsKey {
  if (count <= 1) return "1";
  if (count >= 8) return "8_et_plus";
  return String(count) as OccupantsKey;
}

function occupantsToOperationKey(count: number): "1" | "2" | "3" | "4" | "5_et_plus" {
  if (count <= 1) return "1";
  if (count >= 5) return "5_et_plus";
  return String(count) as "2" | "3" | "4";
}

const DISCLAIMER =
  "Simulation indicative fondée sur une configuration de règles (ptz_rules.json) construite à partir de sources secondaires. Ne constitue ni une offre bancaire ni une décision d'éligibilité officielle. Vérifiez toujours les conditions définitives auprès d'un établissement bancaire, de l'ANIL ou d'une source officielle (service-public.fr, Légifrance).";

/**
 * Vérifie l'éligibilité au PTZ et calcule le montant potentiel, en s'appuyant
 * uniquement sur la configuration `ptz_rules.json` (aucune règle en dur).
 */
export function checkPtzEligibility(input: PtzEligibilityInput): PtzResult {
  const reasons: PtzIneligibilityReason[] = [];
  const warnings: string[] = [];

  if (ptzRules.primoAccedant.verified === false) {
    warnings.push(
      "Condition de primo-accession non vérifiée officiellement dans la configuration actuelle."
    );
  }
  if (!input.isPrimoAccedant && ptzRules.primoAccedant.requisPourEligibilite) {
    reasons.push("PRIMO_ACCESSION_NON_REMPLIE");
  }

  // --- Zone éligible ---
  const zonesEligibles: string[] =
    input.housingType === "NEUF"
      ? ptzRules.logementNeuf.zonesEligibles
      : ptzRules.logementAncienAvecTravaux.zonesEligibles;

  if (input.housingType === "ANCIEN_AVEC_TRAVAUX") {
    if (ptzRules.logementAncienAvecTravaux.zoneCVerified === false && input.zone === "C") {
      warnings.push(ptzRules.logementAncienAvecTravaux.zoneCNote);
    }
    if (ptzRules.logementAncienAvecTravaux.ratioTravauxNote) {
      warnings.push(ptzRules.logementAncienAvecTravaux.ratioTravauxNote);
    }
  }

  if (!zonesEligibles.includes(input.zone)) {
    reasons.push("ZONE_NON_ELIGIBLE_ANCIEN");
  }

  // --- Coût retenu (hors frais de notaire, conformément aux règles PTZ usuelles) ---
  const rawCost = input.propertyPrice + input.workAmount;

  const zoneConfig = (ptzRules.zones as Record<string, any>)[input.zone];
  const plafondOperation: number | null = zoneConfig
    ? zoneConfig.plafondsOperationParPersonnes[occupantsToOperationKey(input.occupantsCount)]
    : null;
  const plafondRessources: number | null = zoneConfig
    ? zoneConfig.plafondsRessourcesParPersonnes[occupantsToKey(input.occupantsCount)]
    : null;

  if (plafondOperation === null || plafondRessources === null) {
    reasons.push("DONNEES_INSUFFISANTES");
  }

  const coutRetenu =
    plafondOperation !== null ? Math.min(rawCost, plafondOperation) : null;

  // --- Ratio travaux (uniquement pertinent pour l'ancien) ---
  let ratioTravauxPercent: number | null = null;
  if (input.housingType === "ANCIEN_AVEC_TRAVAUX") {
    const ratio = calculateWorkRatio({
      workAmount: input.workAmount,
      totalOperationCost: rawCost,
    });
    ratioTravauxPercent = ratio.ratioPercent;
    if (ratioTravauxPercent < ptzRules.logementAncienAvecTravaux.ratioTravauxMinimumPercent) {
      reasons.push("RATIO_TRAVAUX_INSUFFISANT");
    }
    if (
      input.dpeAfterWorks &&
      !isDpeAtLeast(input.dpeAfterWorks, ptzRules.logementAncienAvecTravaux.dpeMinimumApresTravaux)
    ) {
      reasons.push("DPE_INSUFFISANT");
    } else if (!input.dpeAfterWorks) {
      warnings.push(
        `Aucun DPE renseigné : l'exigence de classe ${ptzRules.logementAncienAvecTravaux.dpeMinimumApresTravaux} minimum après travaux n'a pas pu être vérifiée.`
      );
    }
  }

  // --- Plafond de ressources ---
  if (plafondRessources !== null && input.rfr > plafondRessources) {
    reasons.push("REVENUS_SUPERIEURS_AU_PLAFOND");
  }

  // --- Tranche et quotité ---
  let trancheId: string | null = null;
  let quotitePercent: number | null = null;
  let differeAnnees: number | null = null;
  let dureeRemboursementAnnees: number | null = null;

  if (plafondRessources !== null && plafondRessources > 0) {
    const coefficientFamilial: number =
      ptzRules.tranchesQuotite.coefficientFamilial[occupantsToKey(input.occupantsCount)];
    const ratio = input.rfr / (plafondRessources * coefficientFamilial);

    const tranche = ptzRules.tranchesQuotite.tranches.find((t) => ratio <= t.ratioMax);
    if (tranche) {
      trancheId = tranche.id;
      quotitePercent = tranche.quotitePercent;
      differeAnnees = tranche.differeMaxAnnees;
      dureeRemboursementAnnees =
        (ptzRules.dureeRemboursementParTrancheAnnees as Record<string, number>)[tranche.id] ??
        null;
    }
  }

  const montantPtz =
    coutRetenu !== null && quotitePercent !== null && reasons.length === 0
      ? round2(coutRetenu * (quotitePercent / 100))
      : null;

  return {
    eligible: reasons.length === 0,
    reasons,
    zone: input.zone,
    occupantsCount: input.occupantsCount,
    rfr: input.rfr,
    plafondRessources,
    plafondOperation,
    coutRetenu,
    ratioTravauxPercent,
    trancheId,
    quotitePercent,
    montantPtz,
    dureeRemboursementAnnees,
    differeAnnees,
    warnings,
    disclaimer: DISCLAIMER,
  };
}

/** Comparaison grossière de classes DPE (A meilleur, G pire) */
function isDpeAtLeast(achieved: string, required: string): boolean {
  const order = ["A", "B", "C", "D", "E", "F", "G"];
  const achievedIndex = order.indexOf(achieved.toUpperCase());
  const requiredIndex = order.indexOf(required.toUpperCase());
  if (achievedIndex === -1 || requiredIndex === -1) return true; // donnée non interprétable -> ne bloque pas
  return achievedIndex <= requiredIndex;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function humanReadableReason(reason: PtzIneligibilityReason): string {
  switch (reason) {
    case "ZONE_NON_ELIGIBLE_ANCIEN":
      return "❌ Commune non éligible au PTZ ancien avec travaux dans sa zone actuelle.";
    case "RATIO_TRAVAUX_INSUFFISANT":
      return "❌ Montant des travaux insuffisant par rapport au coût total de l'opération.";
    case "REVENUS_SUPERIEURS_AU_PLAFOND":
      return "❌ Revenus (RFR) supérieurs au plafond de ressources applicable.";
    case "PRIMO_ACCESSION_NON_REMPLIE":
      return "❌ Condition de primo-accession non remplie.";
    case "DPE_INSUFFISANT":
      return "❌ Le DPE après travaux n'atteint pas la classe minimale requise.";
    case "DONNEES_INSUFFISANTES":
      return "⚠️ Données insuffisantes pour déterminer l'éligibilité (zone ou effectif du foyer non reconnus).";
    default:
      return reason;
  }
}

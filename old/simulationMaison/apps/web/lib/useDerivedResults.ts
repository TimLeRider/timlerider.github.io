import { useMemo } from "react";
import type { SimulationData } from "@/lib/simulationContext";
import {
  calculateMonthlyPayment,
  calculateBorrowingCapacity,
  calculateDebtRatio,
  calculateNotaryFees,
  calculateWorkRatio,
  calculateTotalFinancing,
  generateAmortizationSchedule,
} from "@/lib/calculations/loan";
import { checkPtzEligibility, type PtzResult } from "@/lib/ptz-engine/engine";

export interface DerivedResults {
  revenuMensuelBancaire: number;
  fraisNotaireEstimes: number;
  chargesExistantesMensuelles: number;
  capacite: ReturnType<typeof calculateBorrowingCapacity>;
  workRatio: ReturnType<typeof calculateWorkRatio>;
  ptz: PtzResult;
  pretBancaire: {
    montant: number;
    mensualite: ReturnType<typeof calculateMonthlyPayment>;
  };
  tauxEndettementProjet: number;
  financement: ReturnType<typeof calculateTotalFinancing>;
  echeancierBancaire: ReturnType<typeof generateAmortizationSchedule>;
  /** Capacité maximale empruntable pour la durée choisie (issue du bloc "capacité d'emprunt") */
  capaciteMaxPourDureeChoisie: number;
  /** true si le prêt réellement nécessaire dépasse ce que les revenus permettent de rembourser */
  pretDepasseCapacite: boolean;
  /** Différence mensuelle entre la mensualité réelle du prêt nécessaire et la mensualité cible */
  ecartMensualite: number;
}

/**
 * Combine tous les moteurs de calcul (prêt, PTZ, notaire, cohérence du plan)
 * à partir des données de simulation. Fonction pure appelée depuis un hook
 * mémoïsé pour éviter les recalculs inutiles à chaque rendu.
 */
export function computeDerivedResults(data: SimulationData): DerivedResults {
  const revenuMensuelBancaire = data.salaireNetMensuel + data.autresRevenusMensuels;
  const chargesExistantesMensuelles = data.creditsEnCoursMensualites;

  const fraisNotaireEstimes =
    data.fraisNotaire ??
    calculateNotaryFees({
      propertyPrice: data.prixMaison,
      isNewProperty: data.typeLogement === "NEUF",
    });

  const capacite = calculateBorrowingCapacity({
    monthlyIncome: revenuMensuelBancaire,
    existingMonthlyDebt: chargesExistantesMensuelles,
    monthlyAlimony: data.pensionAlimentaire,
    targetDebtRatioPercent: data.tauxEndettementMax,
    annualRatePercent: data.tauxInteretAnnuel,
    annualInsuranceRatePercent: data.tauxAssuranceAnnuel,
    durationsYears: [15, 20, 25, 30],
  });

  const coutTotalOperation = data.prixMaison + data.montantTravaux;
  const workRatio = calculateWorkRatio({
    workAmount: data.montantTravaux,
    totalOperationCost: coutTotalOperation,
  });

  const ptz =
    data.zone !== null
      ? checkPtzEligibility({
          housingType: data.typeLogement,
          zone: data.zone,
          occupantsCount: data.nombrePersonnesFoyer,
          rfr: data.revenuFiscalReference,
          propertyPrice: data.prixMaison,
          workAmount: data.montantTravaux,
          isPrimoAccedant: data.primoAccedant,
          dpeAfterWorks: data.dpeApresTravaux || undefined,
        })
      : {
          eligible: false,
          reasons: ["DONNEES_INSUFFISANTES"] as const,
          zone: "C" as const,
          occupantsCount: data.nombrePersonnesFoyer,
          rfr: data.revenuFiscalReference,
          plafondRessources: null,
          plafondOperation: null,
          coutRetenu: null,
          ratioTravauxPercent: null,
          trancheId: null,
          quotitePercent: null,
          montantPtz: null,
          dureeRemboursementAnnees: null,
          differeAnnees: null,
          warnings: [
            "Aucune commune sélectionnée : renseignez d'abord votre projet immobilier dans l'onglet Éligibilité commune.",
          ],
          disclaimer:
            "Simulation indicative. Sélectionnez une commune pour évaluer votre éligibilité au PTZ.",
        };

  const montantPtz = ptz.montantPtz ?? 0;
  const restantAFinancerAvantPret =
    data.prixMaison +
    data.montantTravaux +
    fraisNotaireEstimes +
    data.autresFrais +
    data.fraisDossier +
    data.fraisGarantie -
    data.apportPersonnel -
    montantPtz;

  const montantPretBancaire = Math.max(0, round2(restantAFinancerAvantPret));

  const mensualitePret = calculateMonthlyPayment({
    principal: montantPretBancaire,
    annualRatePercent: data.tauxInteretAnnuel,
    durationYears: data.dureePretAnnees,
    annualInsuranceRatePercent: data.tauxAssuranceAnnuel,
  });

  const tauxEndettementProjet = calculateDebtRatio({
    monthlyIncome: revenuMensuelBancaire,
    totalMonthlyDebtPayments:
      mensualitePret.totalMonthlyPayment + chargesExistantesMensuelles + data.pensionAlimentaire,
  });

  const financement = calculateTotalFinancing({
    propertyPrice: data.prixMaison,
    workAmount: data.montantTravaux,
    notaryFees: fraisNotaireEstimes,
    otherFees: data.autresFrais + data.fraisDossier + data.fraisGarantie,
    personalContribution: data.apportPersonnel,
    bankLoanAmount: montantPretBancaire,
    ptzAmount: montantPtz,
  });

  const echeancierBancaire = generateAmortizationSchedule({
    principal: montantPretBancaire,
    annualRatePercent: data.tauxInteretAnnuel,
    durationYears: data.dureePretAnnees,
    annualInsuranceRatePercent: data.tauxAssuranceAnnuel,
  });

  const capaciteMaxPourDureeChoisie =
    capacite.byDuration.find((d) => d.durationYears === data.dureePretAnnees)
      ?.maxBorrowableCapital ?? 0;
  const pretDepasseCapacite = montantPretBancaire > capaciteMaxPourDureeChoisie;
  const ecartMensualite = round2(
    mensualitePret.totalMonthlyPayment - capacite.maxRecommendedMonthlyPayment
  );

  return {
    revenuMensuelBancaire,
    fraisNotaireEstimes,
    chargesExistantesMensuelles,
    capacite,
    workRatio,
    ptz: ptz as PtzResult,
    pretBancaire: { montant: montantPretBancaire, mensualite: mensualitePret },
    tauxEndettementProjet,
    financement,
    echeancierBancaire,
    capaciteMaxPourDureeChoisie,
    pretDepasseCapacite,
    ecartMensualite,
  };
}

export function useDerivedResults(data: SimulationData): DerivedResults {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => computeDerivedResults(data), [JSON.stringify(data)]);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

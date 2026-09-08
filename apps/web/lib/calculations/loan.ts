/**
 * Fonctions de calcul financier pures — aucune dépendance UI, aucune règle PTZ ici.
 * Toutes les fonctions sont déterministes et testées unitairement (voir /tests).
 */

export interface MonthlyPaymentInput {
  /** Capital emprunté en euros */
  principal: number;
  /** Taux d'intérêt annuel nominal, en pourcentage (ex: 3.5 pour 3.5%) */
  annualRatePercent: number;
  /** Durée du prêt en années */
  durationYears: number;
  /** Taux d'assurance annuel sur le capital initial, en pourcentage (ex: 0.34) */
  annualInsuranceRatePercent?: number;
}

export interface MonthlyPaymentResult {
  /** Mensualité hors assurance */
  monthlyPaymentExcludingInsurance: number;
  /** Part assurance de la mensualité (assurance calculée sur capital initial, méthode la plus courante) */
  monthlyInsurance: number;
  /** Mensualité totale (crédit + assurance) */
  totalMonthlyPayment: number;
  /** Total des intérêts payés sur toute la durée */
  totalInterest: number;
  /** Total de l'assurance payée sur toute la durée */
  totalInsurance: number;
  /** Coût total du crédit (intérêts + assurance), hors capital */
  totalCreditCost: number;
  /** Nombre de mensualités */
  numberOfPayments: number;
}

/**
 * Calcule la mensualité d'un prêt amortissable à taux fixe :
 * M = C × [t × (1+t)^n] / [(1+t)^n - 1]
 */
export function calculateMonthlyPayment(input: MonthlyPaymentInput): MonthlyPaymentResult {
  const { principal, annualRatePercent, durationYears, annualInsuranceRatePercent = 0 } = input;

  if (principal < 0) throw new Error("Le capital emprunté ne peut pas être négatif.");
  if (durationYears <= 0) throw new Error("La durée du prêt doit être positive.");
  if (annualRatePercent < 0) throw new Error("Le taux d'intérêt ne peut pas être négatif.");

  const numberOfPayments = Math.round(durationYears * 12);
  const monthlyRate = annualRatePercent / 100 / 12;

  let monthlyPaymentExcludingInsurance: number;
  if (principal === 0) {
    monthlyPaymentExcludingInsurance = 0;
  } else if (monthlyRate === 0) {
    // Taux à 0% (ex: PTZ) : simple répartition du capital
    monthlyPaymentExcludingInsurance = principal / numberOfPayments;
  } else {
    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    monthlyPaymentExcludingInsurance = (principal * (monthlyRate * factor)) / (factor - 1);
  }

  // Assurance calculée sur le capital initial (méthode "assurance sur capital initial",
  // la plus répandue en France, par opposition à l'assurance sur capital restant dû).
  const monthlyInsurance = (principal * (annualInsuranceRatePercent / 100)) / 12;

  const totalMonthlyPayment = monthlyPaymentExcludingInsurance + monthlyInsurance;
  const totalPaidExcludingInsurance = monthlyPaymentExcludingInsurance * numberOfPayments;
  const totalInterest = Math.max(0, totalPaidExcludingInsurance - principal);
  const totalInsurance = monthlyInsurance * numberOfPayments;
  const totalCreditCost = totalInterest + totalInsurance;

  return {
    monthlyPaymentExcludingInsurance: round2(monthlyPaymentExcludingInsurance),
    monthlyInsurance: round2(monthlyInsurance),
    totalMonthlyPayment: round2(totalMonthlyPayment),
    totalInterest: round2(totalInterest),
    totalInsurance: round2(totalInsurance),
    totalCreditCost: round2(totalCreditCost),
    numberOfPayments,
  };
}

export interface BorrowingCapacityInput {
  /** Revenus mensuels nets pris en compte pour la capacité bancaire (salaire + autres revenus stables) */
  monthlyIncome: number;
  /** Mensualités de crédits déjà en cours */
  existingMonthlyDebt: number;
  /** Pension alimentaire versée mensuellement */
  monthlyAlimony?: number;
  /** Taux d'endettement maximum cible, en pourcentage (ex: 35) */
  targetDebtRatioPercent: number;
  /** Taux d'intérêt annuel pour le prêt simulé */
  annualRatePercent: number;
  /** Taux d'assurance annuel */
  annualInsuranceRatePercent?: number;
  /** Durées à simuler, en années */
  durationsYears: number[];
}

export interface BorrowingCapacityResult {
  /** Mensualité maximale recommandée, toutes charges existantes déduites */
  maxRecommendedMonthlyPayment: number;
  /** Pour chaque durée simulée, le capital empruntable correspondant */
  byDuration: Array<{
    durationYears: number;
    maxBorrowableCapital: number;
  }>;
}

/**
 * Calcule la mensualité maximale recommandée à partir des revenus et du taux d'endettement cible,
 * puis en déduit le capital empruntable pour chaque durée demandée.
 */
export function calculateBorrowingCapacity(input: BorrowingCapacityInput): BorrowingCapacityResult {
  const {
    monthlyIncome,
    existingMonthlyDebt,
    monthlyAlimony = 0,
    targetDebtRatioPercent,
    annualRatePercent,
    annualInsuranceRatePercent = 0,
    durationsYears,
  } = input;

  if (monthlyIncome < 0) throw new Error("Le revenu mensuel ne peut pas être négatif.");
  if (targetDebtRatioPercent <= 0 || targetDebtRatioPercent > 100) {
    throw new Error("Le taux d'endettement cible doit être compris entre 0 et 100.");
  }

  const maxTotalDebtPayment = monthlyIncome * (targetDebtRatioPercent / 100);
  const maxRecommendedMonthlyPayment = Math.max(
    0,
    maxTotalDebtPayment - existingMonthlyDebt - monthlyAlimony
  );

  const byDuration = durationsYears.map((durationYears) => {
    const numberOfPayments = Math.round(durationYears * 12);
    const monthlyRate = annualRatePercent / 100 / 12;
    // On retire la part assurance de la mensualité max avant de calculer le capital,
    // car l'assurance ne contribue pas au remboursement du capital.
    // Résolution itérative simple : assurance = capital * tauxAssurance / 12,
    // donc mensualitéCrédit + capital*tauxAssurance/12 = maxRecommendedMonthlyPayment
    // => on résout pour capital.
    const insuranceMonthlyRate = annualInsuranceRatePercent / 100 / 12;

    let maxBorrowableCapital: number;
    if (monthlyRate === 0) {
      maxBorrowableCapital =
        maxRecommendedMonthlyPayment / (1 / numberOfPayments + insuranceMonthlyRate);
    } else {
      const factor = Math.pow(1 + monthlyRate, numberOfPayments);
      const creditFactor = (monthlyRate * factor) / (factor - 1);
      maxBorrowableCapital = maxRecommendedMonthlyPayment / (creditFactor + insuranceMonthlyRate);
    }

    return {
      durationYears,
      maxBorrowableCapital: round2(Math.max(0, maxBorrowableCapital)),
    };
  });

  return {
    maxRecommendedMonthlyPayment: round2(maxRecommendedMonthlyPayment),
    byDuration,
  };
}

export interface DebtRatioInput {
  monthlyIncome: number;
  totalMonthlyDebtPayments: number;
}

/** Calcule le taux d'endettement (%) = mensualités totales / revenus mensuels */
export function calculateDebtRatio(input: DebtRatioInput): number {
  const { monthlyIncome, totalMonthlyDebtPayments } = input;
  if (monthlyIncome <= 0) return 0;
  return round2((totalMonthlyDebtPayments / monthlyIncome) * 100);
}

export interface NotaryFeesInput {
  /** Prix du bien */
  propertyPrice: number;
  /** true si le bien est neuf (frais réduits ~2-3%), false si ancien (~7-8%) */
  isNewProperty: boolean;
  /** Permet de surcharger le taux si l'utilisateur a une estimation précise de son notaire */
  overrideRatePercent?: number;
}

/**
 * Estime les frais de notaire.
 * Ordres de grandeur usuels en France (à affiner par un notaire pour un chiffre exact) :
 * - Ancien : ~7 à 8 % du prix
 * - Neuf : ~2 à 3 % du prix
 */
export function calculateNotaryFees(input: NotaryFeesInput): number {
  const { propertyPrice, isNewProperty, overrideRatePercent } = input;
  if (propertyPrice < 0) throw new Error("Le prix du bien ne peut pas être négatif.");

  const ratePercent = overrideRatePercent ?? (isNewProperty ? 2.5 : 7.5);
  return round2(propertyPrice * (ratePercent / 100));
}

export interface WorkRatioInput {
  workAmount: number;
  totalOperationCost: number;
}

export interface WorkRatioResult {
  ratioPercent: number;
  workAmount: number;
  totalOperationCost: number;
}

/** Calcule le ratio travaux / coût total de l'opération, utilisé notamment pour le PTZ ancien. */
export function calculateWorkRatio(input: WorkRatioInput): WorkRatioResult {
  const { workAmount, totalOperationCost } = input;
  if (totalOperationCost <= 0) {
    return { ratioPercent: 0, workAmount, totalOperationCost };
  }
  return {
    ratioPercent: round2((workAmount / totalOperationCost) * 100),
    workAmount,
    totalOperationCost,
  };
}

export interface TotalFinancingInput {
  propertyPrice: number;
  workAmount: number;
  notaryFees: number;
  otherFees: number;
  personalContribution: number;
  bankLoanAmount: number;
  ptzAmount: number;
  otherFinancingAmount?: number;
}

export interface TotalFinancingResult {
  totalProjectCost: number;
  totalFinancingProvided: number;
  /** Positif = il manque du financement, négatif = financement excédentaire */
  remainingToFinance: number;
  isCoherent: boolean;
}

/**
 * Vérifie la cohérence du plan de financement :
 * prix du bien + travaux + frais = apport + prêt bancaire + PTZ + autres financements
 * Ne se contente jamais d'additionner sans vérifier l'équilibre.
 */
export function calculateTotalFinancing(input: TotalFinancingInput): TotalFinancingResult {
  const {
    propertyPrice,
    workAmount,
    notaryFees,
    otherFees,
    personalContribution,
    bankLoanAmount,
    ptzAmount,
    otherFinancingAmount = 0,
  } = input;

  const totalProjectCost = propertyPrice + workAmount + notaryFees + otherFees;
  const totalFinancingProvided =
    personalContribution + bankLoanAmount + ptzAmount + otherFinancingAmount;
  const remainingToFinance = round2(totalProjectCost - totalFinancingProvided);

  return {
    totalProjectCost: round2(totalProjectCost),
    totalFinancingProvided: round2(totalFinancingProvided),
    remainingToFinance,
    // Tolérance de 1€ pour les arrondis
    isCoherent: Math.abs(remainingToFinance) <= 1,
  };
}

export interface AmortizationRow {
  month: number;
  principalPaid: number;
  interestPaid: number;
  insurancePaid: number;
  remainingCapital: number;
}

/** Génère un échéancier simplifié (utile pour affichage graphique, pas pour usage comptable/légal). */
export function generateAmortizationSchedule(
  input: MonthlyPaymentInput
): AmortizationRow[] {
  const { principal, annualRatePercent, durationYears, annualInsuranceRatePercent = 0 } = input;
  const numberOfPayments = Math.round(durationYears * 12);
  const monthlyRate = annualRatePercent / 100 / 12;
  const { monthlyPaymentExcludingInsurance } = calculateMonthlyPayment(input);
  const monthlyInsurance = (principal * (annualInsuranceRatePercent / 100)) / 12;

  const rows: AmortizationRow[] = [];
  let remainingCapital = principal;

  for (let month = 1; month <= numberOfPayments; month++) {
    const interestPaid = remainingCapital * monthlyRate;
    let principalPaid = monthlyPaymentExcludingInsurance - interestPaid;
    if (month === numberOfPayments || principalPaid > remainingCapital) {
      principalPaid = remainingCapital;
    }
    remainingCapital = round2(Math.max(0, remainingCapital - principalPaid));

    rows.push({
      month,
      principalPaid: round2(principalPaid),
      interestPaid: round2(interestPaid),
      insurancePaid: round2(monthlyInsurance),
      remainingCapital,
    });
  }

  return rows;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

import { describe, it, expect } from "vitest";
import {
  calculateMonthlyPayment,
  calculateBorrowingCapacity,
  calculateDebtRatio,
  calculateNotaryFees,
  calculateWorkRatio,
  calculateTotalFinancing,
  generateAmortizationSchedule,
} from "@/lib/calculations/loan";

describe("calculateMonthlyPayment", () => {
  it("calcule correctement une mensualité standard", () => {
    // Vérifié avec la formule d'amortissement standard :
    // 100 000 € sur 20 ans à 3% annuel -> mensualité ≈ 554,60 €
    const result = calculateMonthlyPayment({
      principal: 100000,
      annualRatePercent: 3,
      durationYears: 20,
    });
    expect(result.monthlyPaymentExcludingInsurance).toBeCloseTo(554.6, 1);
    expect(result.numberOfPayments).toBe(240);
  });

  it("gère un taux à 0% (cas du PTZ)", () => {
    const result = calculateMonthlyPayment({
      principal: 24000,
      annualRatePercent: 0,
      durationYears: 20,
    });
    expect(result.monthlyPaymentExcludingInsurance).toBeCloseTo(100, 2);
    expect(result.totalInterest).toBe(0);
  });

  it("ajoute correctement l'assurance", () => {
    const result = calculateMonthlyPayment({
      principal: 100000,
      annualRatePercent: 3,
      durationYears: 20,
      annualInsuranceRatePercent: 0.34,
    });
    expect(result.monthlyInsurance).toBeCloseTo((100000 * 0.0034) / 12, 2);
    expect(result.totalMonthlyPayment).toBeCloseTo(
      result.monthlyPaymentExcludingInsurance + result.monthlyInsurance,
      2
    );
  });

  it("rejette un capital négatif", () => {
    expect(() =>
      calculateMonthlyPayment({ principal: -100, annualRatePercent: 3, durationYears: 20 })
    ).toThrow();
  });

  it("rejette une durée nulle ou négative", () => {
    expect(() =>
      calculateMonthlyPayment({ principal: 1000, annualRatePercent: 3, durationYears: 0 })
    ).toThrow();
  });
});

describe("calculateBorrowingCapacity", () => {
  it("calcule la mensualité max recommandée à partir de l'exemple du cahier des charges", () => {
    // 1800 €/mois, 35% -> 630 €
    const result = calculateBorrowingCapacity({
      monthlyIncome: 1800,
      existingMonthlyDebt: 0,
      targetDebtRatioPercent: 35,
      annualRatePercent: 3,
      durationsYears: [20],
    });
    expect(result.maxRecommendedMonthlyPayment).toBeCloseTo(630, 2);
  });

  it("déduit les mensualités de crédits existants et la pension alimentaire", () => {
    const result = calculateBorrowingCapacity({
      monthlyIncome: 2000,
      existingMonthlyDebt: 200,
      monthlyAlimony: 100,
      targetDebtRatioPercent: 35,
      annualRatePercent: 3,
      durationsYears: [20],
    });
    // 2000*0.35 = 700, -200 -200(alim+debt)... calc: 700-200-100=400
    expect(result.maxRecommendedMonthlyPayment).toBeCloseTo(400, 2);
  });

  it("ne renvoie jamais une mensualité négative", () => {
    const result = calculateBorrowingCapacity({
      monthlyIncome: 1000,
      existingMonthlyDebt: 900,
      targetDebtRatioPercent: 35,
      annualRatePercent: 3,
      durationsYears: [20],
    });
    expect(result.maxRecommendedMonthlyPayment).toBe(0);
    expect(result.byDuration[0]!.maxBorrowableCapital).toBe(0);
  });

  it("calcule un capital empruntable cohérent avec calculateMonthlyPayment (aller-retour)", () => {
    const capacity = calculateBorrowingCapacity({
      monthlyIncome: 3000,
      existingMonthlyDebt: 0,
      targetDebtRatioPercent: 33,
      annualRatePercent: 3.2,
      durationsYears: [25],
    });
    const capital = capacity.byDuration[0]!.maxBorrowableCapital;
    const payment = calculateMonthlyPayment({
      principal: capital,
      annualRatePercent: 3.2,
      durationYears: 25,
    });
    expect(payment.monthlyPaymentExcludingInsurance).toBeCloseTo(
      capacity.maxRecommendedMonthlyPayment,
      1
    );
  });
});

describe("calculateDebtRatio", () => {
  it("calcule le taux d'endettement", () => {
    expect(calculateDebtRatio({ monthlyIncome: 2000, totalMonthlyDebtPayments: 700 })).toBe(35);
  });

  it("renvoie 0 si le revenu est nul", () => {
    expect(calculateDebtRatio({ monthlyIncome: 0, totalMonthlyDebtPayments: 700 })).toBe(0);
  });
});

describe("calculateNotaryFees", () => {
  it("applique un taux ancien par défaut (~7.5%)", () => {
    expect(calculateNotaryFees({ propertyPrice: 150000, isNewProperty: false })).toBeCloseTo(
      11250,
      2
    );
  });

  it("applique un taux neuf par défaut (~2.5%)", () => {
    expect(calculateNotaryFees({ propertyPrice: 200000, isNewProperty: true })).toBeCloseTo(
      5000,
      2
    );
  });

  it("permet de surcharger le taux", () => {
    expect(
      calculateNotaryFees({ propertyPrice: 100000, isNewProperty: false, overrideRatePercent: 8 })
    ).toBe(8000);
  });
});

describe("calculateWorkRatio", () => {
  it("calcule le ratio travaux/coût total conforme à l'exemple du cahier des charges", () => {
    const result = calculateWorkRatio({ workAmount: 30000, totalOperationCost: 150000 });
    expect(result.ratioPercent).toBe(20);
  });
});

describe("calculateTotalFinancing", () => {
  it("détecte un plan de financement cohérent", () => {
    const result = calculateTotalFinancing({
      propertyPrice: 120000,
      workAmount: 30000,
      notaryFees: 11250,
      otherFees: 2000,
      personalContribution: 25000,
      bankLoanAmount: 100000,
      ptzAmount: 38250,
    });
    expect(result.isCoherent).toBe(true);
    expect(result.remainingToFinance).toBeCloseTo(0, 0);
  });

  it("détecte un plan de financement incohérent (financement insuffisant)", () => {
    const result = calculateTotalFinancing({
      propertyPrice: 200000,
      workAmount: 50000,
      notaryFees: 15000,
      otherFees: 3000,
      personalContribution: 10000,
      bankLoanAmount: 100000,
      ptzAmount: 20000,
    });
    expect(result.isCoherent).toBe(false);
    expect(result.remainingToFinance).toBeGreaterThan(0);
  });
});

describe("generateAmortizationSchedule", () => {
  it("le capital restant dû atteint 0 à la fin du prêt", () => {
    const schedule = generateAmortizationSchedule({
      principal: 100000,
      annualRatePercent: 3,
      durationYears: 20,
    });
    expect(schedule).toHaveLength(240);
    expect(schedule[schedule.length - 1]!.remainingCapital).toBe(0);
  });

  it("la somme des principals remboursés égale le capital emprunté", () => {
    const schedule = generateAmortizationSchedule({
      principal: 50000,
      annualRatePercent: 2.5,
      durationYears: 15,
    });
    const totalPrincipal = schedule.reduce((sum, row) => sum + row.principalPaid, 0);
    expect(totalPrincipal).toBeCloseTo(50000, 0);
  });
});

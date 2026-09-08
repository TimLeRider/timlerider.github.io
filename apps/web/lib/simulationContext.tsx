"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { PtzZone, HousingType } from "@/lib/ptz-engine/engine";

export interface SimulationData {
  // Situation
  situationFamiliale: "celibataire" | "couple";
  nombrePersonnesFoyer: number;
  nombreEnfants: number;
  situationHandicap: boolean;
  primoAccedant: boolean;
  proprietaireResidencePrincipale: boolean;

  // Revenus
  salaireNetMensuel: number;
  autresRevenusMensuels: number;
  revenuFiscalReference: number;
  anneeRfr: number;
  evolutionSalairePrevu: boolean;
  salaireFuturEstime: number;

  // Situation financière
  apportPersonnel: number;
  epargneRestante: number;
  creditsEnCoursMensualites: number;
  pensionAlimentaire: number;
  autresChargesFixes: number;

  // Projet immobilier
  communeNom: string;
  codePostal: string;
  codeInsee: string;
  departement: string;
  zone: PtzZone | null;
  typeLogement: HousingType;
  prixMaison: number;
  montantTravaux: number;
  fraisNotaire: number | null; // null = à calculer automatiquement
  autresFrais: number;
  dureePretAnnees: 15 | 20 | 25 | 30;
  dpeApresTravaux: string;

  // Paramètres bancaires
  tauxInteretAnnuel: number;
  tauxAssuranceAnnuel: number;
  tauxEndettementMax: number;
  fraisDossier: number;
  fraisGarantie: number;
}

export const DEFAULT_SIMULATION: SimulationData = {
  situationFamiliale: "celibataire",
  nombrePersonnesFoyer: 1,
  nombreEnfants: 0,
  situationHandicap: false,
  primoAccedant: true,
  proprietaireResidencePrincipale: false,

  salaireNetMensuel: 1800,
  autresRevenusMensuels: 0,
  revenuFiscalReference: 15000,
  anneeRfr: new Date().getFullYear() - 2,
  evolutionSalairePrevu: false,
  salaireFuturEstime: 0,

  apportPersonnel: 25000,
  epargneRestante: 0,
  creditsEnCoursMensualites: 0,
  pensionAlimentaire: 0,
  autresChargesFixes: 0,

  communeNom: "",
  codePostal: "",
  codeInsee: "",
  departement: "",
  zone: null,
  typeLogement: "ANCIEN_AVEC_TRAVAUX",
  prixMaison: 120000,
  montantTravaux: 40000,
  fraisNotaire: null,
  autresFrais: 2000,
  dureePretAnnees: 20,
  dpeApresTravaux: "",

  tauxInteretAnnuel: 3.5,
  tauxAssuranceAnnuel: 0.34,
  tauxEndettementMax: 35,
  fraisDossier: 800,
  fraisGarantie: 1500,
};

const STORAGE_KEY = "ptz-simulateur:simulation-v1";

interface SimulationContextValue {
  data: SimulationData;
  update: (patch: Partial<SimulationData>) => void;
  reset: () => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SimulationData>(DEFAULT_SIMULATION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData({ ...DEFAULT_SIMULATION, ...JSON.parse(raw) });
      }
    } catch {
      // Stockage indisponible ou corrompu : on garde les valeurs par défaut.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Stockage plein ou indisponible : on continue sans persister.
    }
  }, [data, hydrated]);

  function update(patch: Partial<SimulationData>) {
    setData((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setData(DEFAULT_SIMULATION);
  }

  return (
    <SimulationContext.Provider value={{ data, update, reset }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation doit être utilisé dans un SimulationProvider");
  return ctx;
}

"use client";

import Link from "next/link";
import { useSimulation } from "@/lib/simulationContext";
import { NumberField, SelectField, CheckboxField, TextField, Section } from "@/components/FormFields";

export default function SimulationPage() {
  const { data, update, reset } = useSimulation();

  return (
    <div>
      <div className="card">
        <h2>Votre projet en quelques minutes</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          Renseignez votre situation, vos revenus et votre projet immobilier. Tous les champs
          peuvent rester à 0 si non applicables. Vous pourrez vérifier l&apos;éligibilité PTZ de
          votre commune dans l&apos;onglet suivant.
        </p>
      </div>

      <div className="card">
        <Section title="Situation">
          <SelectField
            label="Situation familiale"
            value={data.situationFamiliale}
            onChange={(v) => update({ situationFamiliale: v })}
            options={[
              { value: "celibataire", label: "Célibataire" },
              { value: "couple", label: "Couple" },
            ]}
          />
          <NumberField
            label="Nombre de personnes dans le foyer"
            value={data.nombrePersonnesFoyer}
            onChange={(v) => update({ nombrePersonnesFoyer: Math.max(1, v) })}
            min={1}
          />
          <NumberField
            label="Nombre d'enfants"
            value={data.nombreEnfants}
            onChange={(v) => update({ nombreEnfants: v })}
          />
          <CheckboxField
            label="Situation de handicap"
            checked={data.situationHandicap}
            onChange={(v) => update({ situationHandicap: v })}
          />
          <CheckboxField
            label="Primo-accédant"
            checked={data.primoAccedant}
            onChange={(v) => update({ primoAccedant: v })}
          />
          <CheckboxField
            label="Propriétaire de sa résidence principale actuellement"
            checked={data.proprietaireResidencePrincipale}
            onChange={(v) => update({ proprietaireResidencePrincipale: v })}
          />
        </Section>

        <Section title="Revenus">
          <NumberField
            label="Salaire net mensuel"
            value={data.salaireNetMensuel}
            onChange={(v) => update({ salaireNetMensuel: v })}
            suffix="€"
          />
          <NumberField
            label="Autres revenus mensuels"
            value={data.autresRevenusMensuels}
            onChange={(v) => update({ autresRevenusMensuels: v })}
            suffix="€"
          />
          <NumberField
            label="Revenu fiscal de référence (RFR)"
            value={data.revenuFiscalReference}
            onChange={(v) => update({ revenuFiscalReference: v })}
            suffix="€"
            help="Utilisé pour le PTZ — différent du salaire net."
          />
          <NumberField
            label="Année du RFR"
            value={data.anneeRfr}
            onChange={(v) => update({ anneeRfr: v })}
          />
          <CheckboxField
            label="Évolution de salaire prévue"
            checked={data.evolutionSalairePrevu}
            onChange={(v) => update({ evolutionSalairePrevu: v })}
          />
          {data.evolutionSalairePrevu && (
            <NumberField
              label="Salaire futur estimé"
              value={data.salaireFuturEstime}
              onChange={(v) => update({ salaireFuturEstime: v })}
              suffix="€/mois"
            />
          )}
        </Section>

        <Section title="Situation financière">
          <NumberField
            label="Apport personnel"
            value={data.apportPersonnel}
            onChange={(v) => update({ apportPersonnel: v })}
            suffix="€"
          />
          <NumberField
            label="Épargne restante après achat"
            value={data.epargneRestante}
            onChange={(v) => update({ epargneRestante: v })}
            suffix="€"
          />
          <NumberField
            label="Mensualités de crédits en cours"
            value={data.creditsEnCoursMensualites}
            onChange={(v) => update({ creditsEnCoursMensualites: v })}
            suffix="€/mois"
          />
          <NumberField
            label="Pension alimentaire versée"
            value={data.pensionAlimentaire}
            onChange={(v) => update({ pensionAlimentaire: v })}
            suffix="€/mois"
          />
          <NumberField
            label="Autres charges fixes"
            value={data.autresChargesFixes}
            onChange={(v) => update({ autresChargesFixes: v })}
            suffix="€/mois"
          />
        </Section>

        <Section title="Projet immobilier">
          <TextField
            label="Commune (sélectionnée via l'onglet Éligibilité commune)"
            value={data.communeNom}
            onChange={(v) => update({ communeNom: v })}
            help={data.zone ? `Zone détectée : ${data.zone}` : "Aucune commune sélectionnée pour le moment."}
          />
          <SelectField
            label="Type de logement"
            value={data.typeLogement}
            onChange={(v) => update({ typeLogement: v })}
            options={[
              { value: "ANCIEN_AVEC_TRAVAUX", label: "Ancien avec travaux" },
              { value: "NEUF", label: "Neuf" },
            ]}
          />
          <NumberField
            label="Prix de la maison"
            value={data.prixMaison}
            onChange={(v) => update({ prixMaison: v })}
            suffix="€"
          />
          <NumberField
            label="Montant des travaux"
            value={data.montantTravaux}
            onChange={(v) => update({ montantTravaux: v })}
            suffix="€"
          />
          <NumberField
            label="Autres frais"
            value={data.autresFrais}
            onChange={(v) => update({ autresFrais: v })}
            suffix="€"
          />
          <TextField
            label="DPE estimé après travaux (A à G, optionnel)"
            value={data.dpeApresTravaux}
            onChange={(v) => update({ dpeApresTravaux: v.toUpperCase().slice(0, 1) })}
            help="Le PTZ ancien exige généralement une classe D minimum après travaux."
          />
          <SelectField
            label="Durée du prêt"
            value={String(data.dureePretAnnees) as "15" | "20" | "25" | "30"}
            onChange={(v) => update({ dureePretAnnees: Number(v) as 15 | 20 | 25 | 30 })}
            options={[
              { value: "15", label: "15 ans" },
              { value: "20", label: "20 ans" },
              { value: "25", label: "25 ans" },
              { value: "30", label: "30 ans" },
            ]}
          />
        </Section>

        <Section title="Paramètres bancaires">
          <NumberField
            label="Taux immobilier annuel"
            value={data.tauxInteretAnnuel}
            onChange={(v) => update({ tauxInteretAnnuel: v })}
            step={0.05}
            suffix="%"
          />
          <NumberField
            label="Taux assurance annuel"
            value={data.tauxAssuranceAnnuel}
            onChange={(v) => update({ tauxAssuranceAnnuel: v })}
            step={0.01}
            suffix="%"
          />
          <NumberField
            label="Taux d'endettement maximum"
            value={data.tauxEndettementMax}
            onChange={(v) => update({ tauxEndettementMax: v })}
            suffix="%"
          />
          <NumberField
            label="Frais de dossier"
            value={data.fraisDossier}
            onChange={(v) => update({ fraisDossier: v })}
            suffix="€"
          />
          <NumberField
            label="Frais de garantie"
            value={data.fraisGarantie}
            onChange={(v) => update({ fraisGarantie: v })}
            suffix="€"
          />
        </Section>

        <div className="btn-row">
          <Link href="/eligibilite-commune" className="btn btn-primary">
            Vérifier l&apos;éligibilité de cette commune →
          </Link>
          <Link href="/resultats" className="btn btn-secondary">
            Voir mes résultats
          </Link>
          <button className="btn btn-secondary" onClick={reset} type="button">
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}

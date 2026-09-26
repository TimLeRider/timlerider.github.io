# Simulateur d'achat immobilier ancien & PTZ

Simulateur de financement pour l'achat d'une maison ancienne à rénover : capacité d'emprunt,
prêt bancaire, PTZ (Prêt à Taux Zéro), éligibilité de la commune, cohérence du plan de
financement.

## ⚠️ État du projet — à lire avant tout usage réel

Ce projet est **fonctionnel et testé** (27 tests unitaires passent, build de production OK),
mais deux points nécessitent une action de votre part avant un usage en conditions réelles :

1. **Règles PTZ** (`apps/web/lib/config/ptz_rules.json`) : construites à partir de recherches
   web sur des sources secondaires (blogs spécialisés citant des décrets), pas directement sur
   Légifrance/service-public.fr. Chaque section a un champ `verified: false` quand une valeur
   n'est pas confirmée à 100 %. **Revérifiez ces valeurs avant mise en production**, notamment :
   - l'éligibilité de la zone C au PTZ ancien (sources contradictoires) ;
   - la condition "25 % de travaux" vs. une possible restriction aux zones ANRU uniquement ;
   - les plafonds de ressources et d'opération (probablement corrects dans l'ordre de grandeur,
     mais à confirmer chiffre par chiffre).
2. **Zonage ABC des communes** (`apps/web/lib/communes/zonageDataset.ts`) : branché depuis le
   2026-09-08 sur l'API tierce publique [parcelle-info.fr](https://parcelle-info.fr), qui agrège
   elle-même le dataset officiel "Zonage A/B/C du logement" (Ministère de la Transition
   écologique, licence LO-2.0). Ce n'est **pas** une API officielle de l'État : c'est un service
   tiers qui republie des données officielles, décrit par son éditeur comme récent et pouvant
   évoluer ou s'interrompre sans préavis. Pas de clé API, mais quota par adresse IP (429 en cas
   de dépassement) — d'où la limite de 15 communes interrogées par recherche "à proximité"
   (`MAX_ZONE_LOOKUPS_PER_NEARBY_CALL` dans `geoApiGouvProvider.ts`) et le cache HTTP de 7 jours.
   Fournit aussi, en bonus, le prix médian au m² (DVF) affiché dans le tableau des communes
   proches. **Attribution obligatoire** (licence LO-2.0) : affichée dans
   `app/eligibilite-commune/page.tsx`, à ne pas retirer.

Le principe de conception du projet est justement de **ne jamais coder ces règles en dur** :
tout est piloté par `ptz_rules.json` et par le jeu de données de zonage, tous deux modifiables
sans toucher au code applicatif.

## Architecture

```
apps/web/
├── app/                    Next.js 14 (App Router), TypeScript
│   ├── simulation/         1. Formulaire principal
│   ├── eligibilite-commune/ 2. Recherche commune + zonage + communes à proximité
│   ├── resultats/          3. Résultats + graphiques
│   ├── financement/        4. Détail prêt bancaire + échéancier
│   ├── explications/       5. Pédagogie ("Pourquoi ?")
│   └── api/communes/*      Routes serveur (proxy vers geo.api.gouv.fr)
├── components/             UI réutilisable (formulaires, jauges, graphiques)
├── lib/
│   ├── calculations/loan.ts   Fonctions pures : mensualité, capacité, endettement, notaire...
│   ├── ptz-engine/engine.ts   Moteur PTZ piloté par ptz_rules.json
│   ├── communes/               Adapters (geo.api.gouv.fr, zonage, mock pour tests)
│   └── config/ptz_rules.json   Règles PTZ versionnées et sourcées
└── tests/                   Tests Vitest (27 tests : calculs + règles PTZ)
```

## Installation

Prérequis : Node.js ≥ 18.

```bash
cd apps/web
npm install
npm run test    # 27 tests doivent passer
npm run build   # build de production
npm run dev     # démarre sur http://localhost:3000
```

## Variables d'environnement

Aucune clé API n'est requise pour le fonctionnement de base : la recherche de communes utilise
`geo.api.gouv.fr`, une API publique française sans authentification.

Si vous souhaitez enrichir le projet, voici les intégrations prévues par l'architecture
(interfaces déjà en place, implémentation à ajouter) :

| Donnée | API suggérée | Pourquoi | Variable `.env` |
|---|---|---|---|
| Zonage ABC officiel | Fichier data.gouv.fr "zonage ABC logement" (à charger en base) | Le zonage n'a pas d'API live gratuite ; nécessite un import périodique | `DATABASE_URL` si vous stockez le zonage en Postgres/Supabase |
| Prix immobiliers indicatifs | DVF — Demandes de Valeurs Foncières (data.gouv.fr / api.gouv.fr) | Alimente le tableau "communes à proximité" | `DVF_API_KEY` (si l'implémentation choisie en requiert une) |
| Persistance simulation multi-appareil | Postgres/Supabase | Actuellement, la simulation est stockée uniquement en `localStorage` du navigateur | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

**Règle de sécurité respectée** : toute clé API (si vous en ajoutez une) doit être utilisée
uniquement dans `app/api/*/route.ts` (code serveur), jamais dans un composant `"use client"`.

## Zonage : dépendance à un service tiers, et repli possible

Le zonage passe aujourd'hui par `parcelle-info.fr`, un service tiers non garanti dans la durée
(voir avertissement affiché sur son propre site). Si vous voulez un chemin de repli indépendant
de ce service :

1. Téléchargez le fichier officiel de zonage ABC le plus récent directement depuis data.gouv.fr
   ("zonage ABC logement") ou l'arrêté correspondant sur legifrance.gouv.fr.
2. Importez-le dans une table indexée par code INSEE : `code_insee`, `zone`, `source`,
   `date_arrete`.
3. Remplacez le corps de `lookupZoneByCommune()` dans
   `apps/web/lib/communes/zonageDataset.ts` par une requête vers cette table (en gardant la même
   signature `async (communeName, postalCode) => ZoneEntry | null`, aucun autre fichier n'a besoin
   de changer).

## Tests

```bash
npm run test        # une passe
npm run test:watch  # mode watch
```

Les tests couvrent :
- `tests/loan.test.ts` : mensualité, capacité d'emprunt, taux d'endettement, frais de notaire,
  ratio travaux, cohérence du plan de financement, échéancier.
- `tests/ptzEngine.test.ts` : éligibilité par zone, ratio travaux, plafond de ressources,
  primo-accession, plafonnement du coût retenu, présence systématique du disclaimer.

## Ce qui n'est pas encore implémenté (prochaines étapes suggérées)

- Carte interactive Leaflet/OpenStreetMap des zones (section 16 du cahier des charges).
- Comparaison de plusieurs scénarios côte à côte (section 18).
- Persistance base de données (actuellement `localStorage` uniquement, ce qui respecte
  nativement la contrainte "aucun compte requis").
- Import automatisé du fichier officiel de zonage ABC.
- Données de prix immobiliers indicatifs (DVF).

## Sources consultées pour les règles PTZ 2026

- Décret n° 2024-304 du 2 avril 2024 (plafonds) — à vérifier sur Légifrance.
- Décret n° 2025-299 du 29 mars 2025 (quotités/tranches) — à vérifier sur Légifrance.
- Arrêté du 23 juin 2026 (zonage) — à vérifier sur Légifrance.
- service-public.fr — simulateur et fiche PTZ officielle.
- ANIL — pour la vérification commune par commune.

**Rappel affiché dans l'application** : les règles PTZ et les données de zonage peuvent évoluer.
Vérifiez toujours les conditions définitives auprès d'un établissement bancaire, de l'ANIL ou
d'une source officielle.

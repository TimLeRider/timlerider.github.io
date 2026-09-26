/**
 * points.js — Système de points "Système 1", saison 2026/2027
 *
 * Toute la logique de calcul de points est centralisée ici.
 * Ne pas dupliquer ces règles ailleurs dans le code.
 */

// Barème fixe pour les 10 premières places
const BASE_POINTS = {
  1: 100,
  2: 80,
  3: 65,
  4: 55,
  5: 45,
  6: 35,
  7: 25,
  8: 15,
  9: 10,
  10: 5,
};

// À partir de la 11e place : 1 point fixe (pas un bonus, un score)
const POINTS_FROM_11TH = 1;

/**
 * Points de base pour une position donnée.
 * @param {number} position - position finale (1 = vainqueur)
 * @returns {number}
 */
function getBasePoints(position) {
  if (!Number.isInteger(position) || position < 1) {
    throw new Error(`Position invalide: ${position}`);
  }
  if (position <= 10) {
    return BASE_POINTS[position];
  }
  return POINTS_FROM_11TH;
}

/**
 * Nombre de joueurs "dans les points" (ITM) pour un tournoi.
 * Règle : environ 20% des participants, arrondie.
 * La règle d'arrondi est ICI et nulle part ailleurs :
 * on utilise Math.round pour arrondir au plus proche.
 * (Modifiable facilement si besoin : Math.floor / Math.ceil / Math.round)
 *
 * @param {number} totalPlayers - nombre total de participants au tournoi
 * @returns {number} nombre de joueurs ITM (minimum 1 si totalPlayers > 0)
 */
function calculateITM(totalPlayers) {
  if (!Number.isInteger(totalPlayers) || totalPlayers < 0) {
    throw new Error(`Nombre de joueurs invalide: ${totalPlayers}`);
  }
  if (totalPlayers === 0) return 0;

  // >>> RÈGLE D'ARRONDI (modifiable ici uniquement) <<<
  const raw = totalPlayers * 0.2;
  const itmCount = Math.round(raw);

  return Math.max(1, itmCount);
}

/**
 * Montant du bonus ITM attribué à CHAQUE joueur ITM (pas un total à
 * partager), selon la taille du tournoi.
 *  1 à 10 joueurs   -> 0
 *  11 à 20 joueurs  -> 10
 *  21 joueurs et +  -> 20
 *
 * @param {number} totalPlayers
 * @returns {number} bonus attribué à chaque joueur ITM
 */
function getITMBonusPool(totalPlayers) {
  if (!Number.isInteger(totalPlayers) || totalPlayers < 0) {
    throw new Error(`Nombre de joueurs invalide: ${totalPlayers}`);
  }
  if (totalPlayers <= 10) return 0;
  if (totalPlayers <= 20) return 10;
  return 20;
}

/**
 * Bonus ITM pour un joueur donné : chaque joueur ITM reçoit le montant
 * plein du bonus (pas une part divisée entre les joueurs ITM).
 *
 *  1 à 10 joueurs   -> chaque joueur ITM : +0
 *  11 à 20 joueurs  -> chaque joueur ITM : +10
 *  21 joueurs et +  -> chaque joueur ITM : +20
 *
 * @param {number} totalPlayers
 * @param {boolean} isITM - le joueur concerné est-il dans les places payées ?
 * @returns {number} bonus
 */
function calculateITMBonus(totalPlayers, isITM) {
  if (!isITM) return 0;
  return getITMBonusPool(totalPlayers);
}

/**
 * Calcul complet des points d'un joueur pour un tournoi.
 *
 * @param {number|null} position - position finale, ou null/undefined si absent
 * @param {number} totalPlayers - nombre total de participants (calculé automatiquement)
 * @param {boolean} isITM - le joueur est-il dans les places payées pour ce tournoi ?
 * @returns {{basePoints:number, itmBonus:number, total:number}}
 */
function calculateTournamentPoints(position, totalPlayers, isITM) {
  // Absent => 0 point, aucun bonus
  if (position === null || position === undefined) {
    return { basePoints: 0, itmBonus: 0, total: 0 };
  }
  const basePoints = getBasePoints(position);
  const itmBonus = calculateITMBonus(totalPlayers, isITM);
  const total = basePoints + itmBonus;
  return { basePoints, itmBonus, total };
}

/**
 * Détermine automatiquement si une position donnée est ITM pour un
 * tournoi de totalPlayers participants.
 * @param {number} position
 * @param {number} totalPlayers
 * @returns {boolean}
 */
function isPositionITM(position, totalPlayers) {
  const itmCount = calculateITM(totalPlayers);
  return position <= itmCount;
}

module.exports = {
  BASE_POINTS,
  POINTS_FROM_11TH,
  getBasePoints,
  calculateITM,
  getITMBonusPool,
  calculateITMBonus,
  calculateTournamentPoints,
  isPositionITM,
};

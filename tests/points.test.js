/**
 * Tests du système de points — exécuter avec : npm test
 * (pas de framework externe, juste assert)
 */
const assert = require('assert');
const {
  getBasePoints,
  calculateITM,
  getITMBonusPool,
  calculateITMBonus,
  calculateTournamentPoints,
  isPositionITM,
} = require('../lib/points');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error('   ' + err.message);
    process.exitCode = 1;
  }
}

// --- Barème de base (10 joueurs) ---
test('10 joueurs — barème complet', () => {
  assert.strictEqual(getBasePoints(1), 100);
  assert.strictEqual(getBasePoints(2), 80);
  assert.strictEqual(getBasePoints(3), 65);
  assert.strictEqual(getBasePoints(10), 5);
});

// --- 11 joueurs : la 11e place vaut 1 point fixe ---
test('11 joueurs — 11e place = 1 point', () => {
  assert.strictEqual(getBasePoints(10), 5);
  assert.strictEqual(getBasePoints(11), 1);
});

// --- 15 joueurs : 11e à 15e = 1 point chacun ---
test('15 joueurs — 11e à 15e = 1 point chacun', () => {
  for (let pos = 11; pos <= 15; pos++) {
    assert.strictEqual(getBasePoints(pos), 1, `position ${pos}`);
  }
});

// --- 20 joueurs : 11e à 20e = 1 point ---
test('20 joueurs — 11e à 20e = 1 point', () => {
  for (let pos = 11; pos <= 20; pos++) {
    assert.strictEqual(getBasePoints(pos), 1, `position ${pos}`);
  }
});

// --- 21 joueurs : 11e à 21e = 1 point ---
test('21 joueurs — 11e à 21e = 1 point', () => {
  for (let pos = 11; pos <= 21; pos++) {
    assert.strictEqual(getBasePoints(pos), 1, `position ${pos}`);
  }
});

// --- Bonus ITM selon la taille du tournoi ---
test('Bonus ITM — pool selon nombre de joueurs', () => {
  assert.strictEqual(getITMBonusPool(5), 0);
  assert.strictEqual(getITMBonusPool(10), 0);
  assert.strictEqual(getITMBonusPool(11), 10);
  assert.strictEqual(getITMBonusPool(20), 10);
  assert.strictEqual(getITMBonusPool(21), 20);
  assert.strictEqual(getITMBonusPool(50), 20);
});

// --- Calcul ITM (~20%, arrondi) ---
test('calculateITM — arrondi à 20%', () => {
  assert.strictEqual(calculateITM(10), 2); // 2.0 -> 2
  assert.strictEqual(calculateITM(18), 4); // 3.6 -> 4
  assert.strictEqual(calculateITM(21), 4); // 4.2 -> 4
});

// --- Bonus ITM : chaque joueur ITM reçoit le montant plein ---
test('calculateITMBonus — montant plein pour chaque joueur ITM', () => {
  assert.strictEqual(calculateITMBonus(18, true), 10); // tranche 11-20
  assert.strictEqual(calculateITMBonus(18, false), 0);
  assert.strictEqual(calculateITMBonus(25, true), 20); // tranche 21+
  assert.strictEqual(calculateITMBonus(8, true), 0); // tranche 1-10
});

// --- Joueur absent : 0 point, pas de bonus ---
test('Joueur absent — 0 point, aucun bonus', () => {
  const result = calculateTournamentPoints(null, 18, false);
  assert.deepStrictEqual(result, { basePoints: 0, itmBonus: 0, total: 0 });
});

// --- Exemple complet avec 18 participants (énoncé) ---
test('18 participants — barème complet conforme à l\'exemple', () => {
  const expected = {
    1: 100, 2: 80, 3: 65, 4: 55, 5: 45, 6: 35, 7: 25, 8: 15, 9: 10, 10: 5,
    11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1,
  };
  for (const [pos, pts] of Object.entries(expected)) {
    assert.strictEqual(getBasePoints(Number(pos)), pts, `position ${pos}`);
  }
});

// --- isPositionITM cohérent avec calculateITM ---
test('isPositionITM — cohérence avec calculateITM', () => {
  const totalPlayers = 18;
  const itmCount = calculateITM(totalPlayers); // 4
  assert.strictEqual(isPositionITM(itmCount, totalPlayers), true);
  assert.strictEqual(isPositionITM(itmCount + 1, totalPlayers), false);
});

console.log(`\n${passed} test(s) réussi(s).`);

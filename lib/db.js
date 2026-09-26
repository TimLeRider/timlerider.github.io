/**
 * db.js — Accès unique et sécurisé au fichier data/data.json
 *
 * - Le serveur est le SEUL point d'accès à ce fichier.
 * - Lecture en mémoire, écriture atomique (fichier temporaire + rename).
 * - File d'attente d'écriture pour éviter toute corruption en cas
 *   d'écritures concurrentes (deux requêtes API en même temps).
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const EMPTY_DB = {
  users: [],
  players: [],
  seasons: [{ id: '2026-2027', name: '2026/2027' }],
  tournaments: [],
  results: [],
};

// File d'attente simple : chaque écriture attend la précédente.
let writeQueue = Promise.resolve();

function ensureDataFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2), {
      mode: 0o600,
    });
  }
}

/**
 * Lit le fichier data.json et retourne l'objet JS correspondant.
 * Ne jamais exposer ce résultat brut au frontend sans filtrage
 * (ex. passwordHash ne doit jamais sortir de ce module vers une réponse HTTP).
 */
async function readDB() {
  ensureDataFileExists();
  const raw = await fsp.readFile(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error('Fichier de données corrompu ou invalide: ' + err.message);
  }
}

/**
 * Écrit l'objet JS fourni dans data.json de façon atomique :
 * 1. sérialise en JSON
 * 2. écrit dans un fichier temporaire unique
 * 3. renomme le fichier temporaire vers data.json (opération atomique sur
 *    la plupart des systèmes de fichiers)
 *
 * Les écritures sont mises en file d'attente : deux appels concurrents à
 * writeDB() s'exécutent l'un après l'autre, jamais en parallèle.
 */
function writeDB(data) {
  writeQueue = writeQueue.then(() => performAtomicWrite(data));
  return writeQueue;
}

async function performAtomicWrite(data) {
  ensureDataFileExists();
  const tmpFile = path.join(
    DATA_DIR,
    `.data.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  const json = JSON.stringify(data, null, 2);
  await fsp.writeFile(tmpFile, json, { mode: 0o600 });
  await fsp.rename(tmpFile, DATA_FILE);
}

/**
 * Utilitaire de haut niveau : lit, modifie via un callback, puis réécrit.
 * Le callback peut être async. Garantit qu'aucune autre écriture ne peut
 * s'intercaler grâce à la file d'attente de writeDB().
 *
 * @param {(db: object) => (object|Promise<object>)} mutator
 */
async function updateDB(mutator) {
  // On chaîne la lecture + mutation + écriture sur la file d'attente pour
  // éviter les "race conditions" lecture-modification-écriture.
  writeQueue = writeQueue.then(async () => {
    const current = await readDB();
    const updated = await mutator(current);
    await performAtomicWrite(updated);
    return updated;
  });
  return writeQueue;
}

module.exports = {
  DATA_FILE,
  readDB,
  writeDB,
  updateDB,
  ensureDataFileExists,
};

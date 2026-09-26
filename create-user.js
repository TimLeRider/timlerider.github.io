/**
 * create-user.js — Script en ligne de commande pour créer un compte
 * (typiquement le premier compte administrateur).
 *
 * Il n'y a volontairement aucune page d'inscription publique dans
 * l'application : les comptes sont créés par l'administrateur via ce
 * script, exécuté directement sur le serveur.
 *
 * Usage :
 *   node create-user.js admin@example.com "MotDePasse123!" admin
 *   node create-user.js membre@example.com "AutrePassword!" user
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./lib/db');

async function main() {
  const [, , email, password, role = 'user', nickname] = process.argv;

  if (!email || !password) {
    console.log('Usage: node create-user.js <email> <mot_de_passe> [admin|user] [pseudo]');
    process.exit(1);
  }
  if (!['admin', 'user'].includes(role)) {
    console.log('Le rôle doit être "admin" ou "user".');
    process.exit(1);
  }
  if (password.length < 8) {
    console.log('Le mot de passe doit contenir au moins 8 caractères.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const updated = await db.updateDB((data) => {
    data.users = data.users || [];
    const existing = data.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = role;
      if (nickname) existing.nickname = nickname;
      return data;
    }
    data.users.push({
      id: 'user_' + crypto.randomBytes(6).toString('hex'),
      email,
      passwordHash,
      role,
      nickname: nickname || email.split('@')[0],
    });
    return data;
  });

  console.log(`Compte "${email}" (${role}) créé/mis à jour avec succès.`);
  console.log(`Nombre total de comptes: ${updated.users.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});

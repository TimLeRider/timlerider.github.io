/**
 * server.js — Serveur unique de l'application "Monkeys Poker Club"
 *
 * Responsabilités :
 *  - servir le frontend statique (public/)
 *  - authentification par session (cookie httpOnly)
 *  - lecture/écriture du fichier data/data.json (jamais exposé directement)
 *  - calcul des points et du classement général
 *  - permissions admin / utilisateur vérifiées côté serveur
 */

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');

const db = require('./lib/db');
const points = require('./lib/points');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  console.error(
    '\n[ERREUR] La variable SESSION_SECRET est manquante (.env). ' +
      'Copiez .env.example vers .env et renseignez une valeur secrète.\n'
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Sécurité de base
// ---------------------------------------------------------------------------
app.disable('x-powered-by');
app.set('trust proxy', 1); // nécessaire derrière un proxy HTTPS (Render, Railway, etc.)

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.json({ limit: '256kb' }));

// Sessions stockées sur disque (survivent à un redémarrage du serveur),
// séparées du fichier de données métier.
app.use(
  session({
    store: new FileStore({
      path: path.join(__dirname, 'sessions_data'),
      ttl: 60 * 60 * 8, // 8h
      logFn: () => {}, // silencieux
    }),
    name: 'poker.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PROD, // cookie "secure" uniquement en HTTPS (prod)
      maxAge: 1000 * 60 * 60 * 8, // 8h d'inactivité max
    },
  })
);

// Limitation des tentatives de connexion (anti brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

// Limitation générale de l'API (anti abus)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Middlewares d'authentification / permissions
// ---------------------------------------------------------------------------
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}

// Validation minimale d'entrée
function isNonEmptyString(v, maxLen = 200) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

// ---------------------------------------------------------------------------
// Fichiers statiques (le frontend) — ne contient JAMAIS data.json
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!isNonEmptyString(email) || !isNonEmptyString(password, 500)) {
      return res.status(400).json({ error: 'Identifiants invalides.' });
    }

    const data = await db.readDB();
    const user = (data.users || []).find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );

    // Message générique volontairement identique dans les deux cas,
    // pour ne pas révéler si l'email existe.
    const genericError = { error: 'Email ou mot de passe incorrect.' };
    if (!user) return res.status(401).json(genericError);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json(genericError);

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Erreur serveur.' });
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.nickname = user.nickname || user.email;
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        nickname: req.session.nickname,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('poker.sid');
    res.json({ ok: true });
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    role: req.session.role,
    nickname: req.session.nickname,
  });
});

// Tout ce qui suit nécessite d'être connecté
app.use('/api', requireAuth);

// ---------------------------------------------------------------------------
// JOUEURS
// ---------------------------------------------------------------------------
app.get('/api/players', async (req, res) => {
  const data = await db.readDB();
  res.json(data.players || []);
});

app.post('/api/players', requireAdmin, async (req, res) => {
  const { nickname } = req.body || {};
  if (!isNonEmptyString(nickname, 40)) {
    return res.status(400).json({ error: 'Pseudo invalide.' });
  }
  try {
    const updated = await db.updateDB((data) => {
      const trimmed = nickname.trim();
      const exists = data.players.some(
        (p) => p.nickname.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) throw new Error('DUPLICATE');
      data.players.push({
        id: 'player_' + crypto.randomBytes(6).toString('hex'),
        nickname: trimmed,
        active: true,
      });
      return data;
    });
    const created = updated.players[updated.players.length - 1];
    res.status(201).json(created);
  } catch (err) {
    if (err.message === 'DUPLICATE') {
      return res.status(409).json({ error: 'Ce pseudo existe déjà.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.put('/api/players/:id', requireAdmin, async (req, res) => {
  const { nickname, active } = req.body || {};
  try {
    let notFound = false;
    let duplicate = false;
    const updated = await db.updateDB((data) => {
      const player = data.players.find((p) => p.id === req.params.id);
      if (!player) {
        notFound = true;
        return data;
      }
      if (nickname !== undefined) {
        if (!isNonEmptyString(nickname, 40)) throw new Error('BAD_NICKNAME');
        const trimmed = nickname.trim();
        const dup = data.players.some(
          (p) =>
            p.id !== player.id &&
            p.nickname.toLowerCase() === trimmed.toLowerCase()
        );
        if (dup) {
          duplicate = true;
          return data;
        }
        player.nickname = trimmed;
      }
      if (active !== undefined) {
        player.active = Boolean(active);
      }
      return data;
    });
    if (notFound) return res.status(404).json({ error: 'Joueur introuvable.' });
    if (duplicate) return res.status(409).json({ error: 'Ce pseudo existe déjà.' });
    const player = updated.players.find((p) => p.id === req.params.id);
    res.json(player);
  } catch (err) {
    if (err.message === 'BAD_NICKNAME') {
      return res.status(400).json({ error: 'Pseudo invalide.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ---------------------------------------------------------------------------
// TOURNOIS
// ---------------------------------------------------------------------------
app.get('/api/tournaments', async (req, res) => {
  const data = await db.readDB();
  const tournaments = (data.tournaments || []).map((t) => enrichTournament(t, data));
  res.json(tournaments);
});

app.get('/api/tournaments/:id', async (req, res) => {
  const data = await db.readDB();
  const t = (data.tournaments || []).find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Tournoi introuvable.' });
  res.json(enrichTournament(t, data));
});

function enrichTournament(tournament, data) {
  const results = (data.results || []).filter((r) => r.tournamentId === tournament.id);
  return {
    ...tournament,
    participantCount: results.length, // calculé automatiquement, jamais saisi
  };
}

app.post('/api/tournaments', requireAdmin, async (req, res) => {
  const { name, date, seasonId } = req.body || {};
  if (!isNonEmptyString(name, 80) || !isNonEmptyString(date, 20)) {
    return res.status(400).json({ error: 'Nom et date du tournoi requis.' });
  }
  const updated = await db.updateDB((data) => {
    const tournament = {
      id: 'tournament_' + crypto.randomBytes(6).toString('hex'),
      name: name.trim(),
      date,
      seasonId: seasonId || (data.seasons[0] && data.seasons[0].id) || null,
    };
    data.tournaments.push(tournament);
    return data;
  });
  res.status(201).json(updated.tournaments[updated.tournaments.length - 1]);
});

app.put('/api/tournaments/:id', requireAdmin, async (req, res) => {
  const { name, date, seasonId } = req.body || {};
  let notFound = false;
  const updated = await db.updateDB((data) => {
    const t = data.tournaments.find((x) => x.id === req.params.id);
    if (!t) {
      notFound = true;
      return data;
    }
    if (name !== undefined) t.name = String(name).trim();
    if (date !== undefined) t.date = date;
    if (seasonId !== undefined) t.seasonId = seasonId;
    return data;
  });
  if (notFound) return res.status(404).json({ error: 'Tournoi introuvable.' });
  const t = updated.tournaments.find((x) => x.id === req.params.id);
  res.json(t);
});

app.delete('/api/tournaments/:id', requireAdmin, async (req, res) => {
  let notFound = false;
  await db.updateDB((data) => {
    const idx = data.tournaments.findIndex((x) => x.id === req.params.id);
    if (idx === -1) {
      notFound = true;
      return data;
    }
    data.tournaments.splice(idx, 1);
    data.results = data.results.filter((r) => r.tournamentId !== req.params.id);
    return data;
  });
  if (notFound) return res.status(404).json({ error: 'Tournoi introuvable.' });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// RÉSULTATS (classement d'un tournoi)
// ---------------------------------------------------------------------------
// Body attendu : { rankings: [{ playerId, position }, ...] }
// Un joueur = une seule position, positions cohérentes (1..N sans trou ni doublon).
app.put('/api/tournaments/:id/results', requireAdmin, async (req, res) => {
  const { rankings } = req.body || {};
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return res.status(400).json({ error: 'Classement invalide.' });
  }

  // Validation de cohérence des positions
  const positions = rankings.map((r) => r.position);
  const uniquePositions = new Set(positions);
  const expected = rankings.length;
  const positionsValid =
    uniquePositions.size === expected &&
    positions.every((p) => Number.isInteger(p) && p >= 1 && p <= expected);
  if (!positionsValid) {
    return res.status(400).json({
      error: `Les positions doivent être uniques et former une suite de 1 à ${expected}.`,
    });
  }
  const playerIds = rankings.map((r) => r.playerId);
  if (new Set(playerIds).size !== playerIds.length) {
    return res.status(400).json({ error: "Un joueur ne peut apparaître qu'une seule fois." });
  }

  let notFoundTournament = false;
  let invalidPlayer = false;

  const updated = await db.updateDB((data) => {
    const tournament = data.tournaments.find((t) => t.id === req.params.id);
    if (!tournament) {
      notFoundTournament = true;
      return data;
    }
    const validPlayerIds = new Set(data.players.map((p) => p.id));
    if (!playerIds.every((id) => validPlayerIds.has(id))) {
      invalidPlayer = true;
      return data;
    }

    const totalPlayers = rankings.length; // calculé automatiquement (nb participants)
    const itmCount = points.calculateITM(totalPlayers);

    // On retire les anciens résultats de ce tournoi puis on réinsère
    data.results = data.results.filter((r) => r.tournamentId !== tournament.id);

    for (const r of rankings) {
      const isITM = points.isPositionITM(r.position, totalPlayers);
      const calc = points.calculateTournamentPoints(r.position, totalPlayers, isITM);
      data.results.push({
        id: 'result_' + crypto.randomBytes(6).toString('hex'),
        tournamentId: tournament.id,
        playerId: r.playerId,
        position: r.position,
        isITM,
        basePoints: calc.basePoints,
        itmBonus: calc.itmBonus,
        totalPoints: calc.total,
      });
    }
    return data;
  });

  if (notFoundTournament) return res.status(404).json({ error: 'Tournoi introuvable.' });
  if (invalidPlayer) return res.status(400).json({ error: 'Joueur inconnu dans le classement.' });

  const results = updated.results.filter((r) => r.tournamentId === req.params.id);
  res.json(results);
});

// ---------------------------------------------------------------------------
// CLASSEMENT GÉNÉRAL — toujours recalculé, jamais stocké tel quel
// ---------------------------------------------------------------------------
app.get('/api/standings', async (req, res) => {
  const seasonId = req.query.season;
  const data = await db.readDB();

  const relevantResults = (data.results || []).filter((r) => {
    if (!seasonId) return true;
    const t = data.tournaments.find((t) => t.id === r.tournamentId);
    return t && t.seasonId === seasonId;
  });

  const byPlayer = new Map();
  for (const r of relevantResults) {
    const entry = byPlayer.get(r.playerId) || { tournaments: 0, points: 0 };
    entry.tournaments += 1;
    entry.points += r.totalPoints;
    byPlayer.set(r.playerId, entry);
  }

  const standings = (data.players || [])
    .filter((p) => byPlayer.has(p.id))
    .map((p) => ({
      playerId: p.id,
      nickname: p.nickname,
      tournaments: byPlayer.get(p.id).tournaments,
      points: Math.round(byPlayer.get(p.id).points * 100) / 100,
    }))
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ rank: i + 1, ...row }));

  res.json(standings);
});

// Détail d'un joueur : tournoi par tournoi
app.get('/api/players/:id/detail', async (req, res) => {
  const data = await db.readDB();
  const player = data.players.find((p) => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: 'Joueur introuvable.' });

  const results = (data.results || [])
    .filter((r) => r.playerId === player.id)
    .map((r) => {
      const t = data.tournaments.find((t) => t.id === r.tournamentId);
      return {
        tournamentId: r.tournamentId,
        tournamentName: t ? t.name : '(supprimé)',
        date: t ? t.date : null,
        position: r.position,
        basePoints: r.basePoints,
        itmBonus: r.itmBonus,
        totalPoints: r.totalPoints,
      };
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const total = results.reduce((sum, r) => sum + r.totalPoints, 0);
  res.json({ player, results, total: Math.round(total * 100) / 100 });
});

// ---------------------------------------------------------------------------
// SAUVEGARDE (admin uniquement)
// ---------------------------------------------------------------------------
app.get('/api/backup', requireAdmin, async (req, res) => {
  const data = await db.readDB();
  // On retire les hash de mots de passe même pour l'admin : la sauvegarde
  // sert aux données de l'association, pas aux secrets d'authentification.
  const safeCopy = {
    ...data,
    users: (data.users || []).map((u) => ({ id: u.id, email: u.email, role: u.role })),
  };
  const filename = `poker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(safeCopy, null, 2));
});

// ---------------------------------------------------------------------------
// Fallback SPA + gestion des erreurs
// ---------------------------------------------------------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur inattendue.' });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

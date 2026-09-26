/**
 * app.js — Logique frontend. Aucune écriture directe de données :
 * tout passe par des appels fetch() vers l'API du serveur.
 */

let currentUser = null;
let playersCache = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch (_) { /* réponse vide (ex: fichier) */ }
  if (!res.ok) {
    throw new Error((body && body.error) || `Erreur ${res.status}`);
  }
  return body;
}

function show(el) { el.hidden = false; }
function hide(el) { el.hidden = true; }
function $(sel) { return document.querySelector(sel); }
function $all(sel) { return Array.from(document.querySelectorAll(sel)); }

// ---------------------------------------------------------------------------
// Connexion / déconnexion
// ---------------------------------------------------------------------------
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#login-email').value.trim();
  const password = $('#login-password').value;
  const errorEl = $('#login-error');
  hide(errorEl);
  try {
    const user = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    currentUser = user;
    enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
    show(errorEl);
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  currentUser = null;
  hide($('#view-app'));
  show($('#view-login'));
});

async function checkSession() {
  try {
    currentUser = await api('/api/me');
    enterApp();
  } catch (_) {
    show($('#view-login'));
  }
}

function enterApp() {
  hide($('#view-login'));
  show($('#view-app'));
  $('#user-label').textContent = `${currentUser.nickname} (${currentUser.role === 'admin' ? 'admin' : 'membre'})`;

  const isAdmin = currentUser.role === 'admin';
  $all('.admin-only').forEach((el) => (el.hidden = !isAdmin));

  loadTab('dashboard');
  refreshPlayers();
}

// ---------------------------------------------------------------------------
// Navigation par onglets
// ---------------------------------------------------------------------------
$all('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => loadTab(btn.dataset.tab));
});

function loadTab(tab) {
  $all('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $all('.tab-panel').forEach((p) => (p.hidden = p.id !== `tab-${tab}`));

  if (tab === 'players') refreshPlayers();
  if (tab === 'tournaments') refreshTournaments();
  if (tab === 'standings') refreshStandings();
}

// ---------------------------------------------------------------------------
// Joueurs
// ---------------------------------------------------------------------------
async function refreshPlayers() {
  playersCache = await api('/api/players');
  const tbody = $('#players-tbody');
  tbody.innerHTML = '';
  for (const p of playersCache) {
    const tr = document.createElement('tr');
    tr.className = 'clickable';
    tr.innerHTML = `
      <td>${escapeHtml(p.nickname)}</td>
      <td><span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Actif' : 'Inactif'}</span></td>
      <td class="admin-only" ${currentUser.role === 'admin' ? '' : 'hidden'}>
        <button class="small-btn" data-toggle="${p.id}">${p.active ? 'Désactiver' : 'Réactiver'}</button>
      </td>
    `;
    tr.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-toggle]')) return;
      showPlayerDetail(p.id);
    });
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const p = playersCache.find((x) => x.id === btn.dataset.toggle);
      await api(`/api/players/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !p.active }),
      });
      refreshPlayers();
    });
  });
}

$('#add-player-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $('#new-player-nickname');
  try {
    await api('/api/players', { method: 'POST', body: JSON.stringify({ nickname: input.value }) });
    input.value = '';
    refreshPlayers();
  } catch (err) {
    alert(err.message);
  }
});

async function showPlayerDetail(playerId) {
  const detail = await api(`/api/players/${playerId}/detail`);
  const body = $('#player-detail-body');
  const rows = detail.results
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.tournamentName)}</td>
        <td>${r.date || ''}</td>
        <td>${r.position}${ordinalSuffix(r.position)}</td>
        <td>${r.basePoints}</td>
        <td>${formatPoints(r.itmBonus)}</td>
        <td><strong>${formatPoints(r.totalPoints)}</strong></td>
      </tr>`
    )
    .join('');
  body.innerHTML = `
    <h3>${escapeHtml(detail.player.nickname)}</h3>
    <table class="data-table">
      <thead><tr><th>Tournoi</th><th>Date</th><th>Place</th><th>Base</th><th>Bonus ITM</th><th>Total</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">Aucun tournoi joué.</td></tr>'}</tbody>
    </table>
    <p class="player-detail-total">TOTAL : ${formatPoints(detail.total)} points</p>
  `;
  show($('#modal-player-detail'));
}

// ---------------------------------------------------------------------------
// Tournois
// ---------------------------------------------------------------------------
async function refreshTournaments() {
  const tournaments = await api('/api/tournaments');
  const tbody = $('#tournaments-tbody');
  tbody.innerHTML = '';
  for (const t of tournaments.sort((a, b) => (b.date || '').localeCompare(a.date || ''))) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(t.name)}</td>
      <td>${t.date}</td>
      <td>${t.participantCount}</td>
      <td>
        <button class="small-btn" data-results="${t.id}">📋 Classement</button>
        ${currentUser.role === 'admin' ? `<button class="small-btn" data-delete="${t.id}">🗑️</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll('[data-results]').forEach((btn) => {
    btn.addEventListener('click', () => openResultsModal(btn.dataset.results));
  });
  tbody.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce tournoi et ses résultats ?')) return;
      await api(`/api/tournaments/${btn.dataset.delete}`, { method: 'DELETE' });
      refreshTournaments();
    });
  });
}

$('#new-tournament-btn').addEventListener('click', () => {
  $('#t-name').value = '';
  $('#t-date').value = '';
  show($('#modal-tournament'));
});

$('#tournament-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name: $('#t-name').value, date: $('#t-date').value }),
    });
    hide($('#modal-tournament'));
    refreshTournaments();
  } catch (err) {
    alert(err.message);
  }
});

// ---------------------------------------------------------------------------
// Saisie du classement d'un tournoi
// ---------------------------------------------------------------------------
let currentResultsTournamentId = null;

async function openResultsModal(tournamentId) {
  currentResultsTournamentId = tournamentId;
  const tournament = await api(`/api/tournaments/${tournamentId}`);
  $('#results-modal-title').textContent = `Classement — ${tournament.name}`;

  await refreshPlayers();
  const builder = $('#results-builder');
  builder.innerHTML = '';
  for (const p of playersCache.filter((p) => p.active)) {
    const row = document.createElement('div');
    row.className = 'results-row';
    row.innerHTML = `
      <input type="checkbox" data-player="${p.id}" />
      <span class="rname">${escapeHtml(p.nickname)}</span>
      <input type="number" min="1" placeholder="Place" data-position="${p.id}" disabled />
    `;
    const checkbox = row.querySelector('input[type=checkbox]');
    const posInput = row.querySelector('input[type=number]');
    checkbox.addEventListener('change', () => {
      posInput.disabled = !checkbox.checked;
      if (!checkbox.checked) posInput.value = '';
    });
    builder.appendChild(row);
  }
  show($('#modal-results'));
}

$('#save-results-btn').addEventListener('click', async () => {
  const rows = $all('#results-builder .results-row');
  const rankings = [];
  for (const row of rows) {
    const checkbox = row.querySelector('input[type=checkbox]');
    const posInput = row.querySelector('input[type=number]');
    if (checkbox.checked) {
      const position = parseInt(posInput.value, 10);
      if (!position) {
        alert('Merci de renseigner une place pour chaque joueur présent.');
        return;
      }
      rankings.push({ playerId: checkbox.dataset.player, position });
    }
  }
  if (rankings.length === 0) {
    alert('Sélectionne au moins un joueur présent.');
    return;
  }
  try {
    await api(`/api/tournaments/${currentResultsTournamentId}/results`, {
      method: 'PUT',
      body: JSON.stringify({ rankings }),
    });
    hide($('#modal-results'));
    refreshTournaments();
  } catch (err) {
    alert(err.message);
  }
});

// ---------------------------------------------------------------------------
// Classement général
// ---------------------------------------------------------------------------
async function refreshStandings() {
  const standings = await api('/api/standings');
  const tbody = $('#standings-tbody');
  tbody.innerHTML = standings
    .map(
      (row) => `<tr class="clickable" data-player="${row.playerId}">
        <td>${row.rank}</td>
        <td>${escapeHtml(row.nickname)}</td>
        <td>${row.tournaments}</td>
        <td>${formatPoints(row.points)}</td>
      </tr>`
    )
    .join('');
  tbody.querySelectorAll('[data-player]').forEach((tr) => {
    tr.addEventListener('click', () => showPlayerDetail(tr.dataset.player));
  });
}

// ---------------------------------------------------------------------------
// Sauvegarde
// ---------------------------------------------------------------------------
$('#download-backup-btn').addEventListener('click', () => {
  window.location.href = '/api/backup';
});

// ---------------------------------------------------------------------------
// Modales génériques
// ---------------------------------------------------------------------------
$all('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').hidden = true;
  });
});
$all('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.hidden = true;
  });
});

// ---------------------------------------------------------------------------
// Utilitaires d'affichage
// ---------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatPoints(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function ordinalSuffix(n) {
  return n === 1 ? 'er' : 'e';
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
checkSession();

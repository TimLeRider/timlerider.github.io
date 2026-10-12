import {
  GITHUB_USER, HIDDEN_REPOS, DIFF, TIMELINE, EDUCATION, SKILLS, PROJECTS, ICONS, REPO_DESCRIPTIONS,
} from "./data.js";
import { initTheme, initCursor } from "./fx.js";

const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
}

/* ---------- Diff animé du hero ---------- */
const SIGN = { hunk: "", del: "-", add: "+", ctx: " " };
let playId = 0;

async function playDiff() {
  const box = $("#diff");
  const id = ++playId;
  box.textContent = "";
  let prevDel = [];
  for (const line of DIFF) {
    if (id !== playId) return;
    const sign = el("span", { class: "sign" }, SIGN[line.t]);
    const txt = el("span", { class: "txt" });
    const row = el("div", { class: `ln ${line.t}` }, sign, txt);
    box.append(row);
    if (line.t === "add") prevDel.forEach((r) => r.classList.add("struck"));
    if (line.t === "del") prevDel.push(row); else if (line.t !== "hunk") prevDel = [];
    if (reduced) { txt.textContent = line.text; continue; }
    for (const ch of line.text) {
      if (id !== playId) return;
      txt.textContent += ch;
      await sleep(line.t === "del" ? 10 : 22);
    }
    await sleep(line.t === "hunk" ? 120 : 260);
  }
  if (reduced) box.querySelectorAll(".del").forEach((r) => r.classList.add("struck"));
}

/* ---------- Parcours : le rail se remplit au scroll ---------- */
function renderTimeline() {
  const list = $("#timeline");
  TIMELINE.forEach((it) => {
    list.append(el("li", { class: "step" },
      el("div", { class: "when" }, it.when),
      el("div", { class: "rail" }, el("span", { class: "dot" })),
      el("div", { class: "body" },
        el("h3", {}, it.role),
        el("p", { class: "org" }, it.org),
        el("p", {}, it.text))));
  });
  $("#education").append(...EDUCATION.map((e) => el("li", {}, e)));

  const steps = [...list.children];
  let queued = false;
  const update = () => {
    queued = false;
    const mark = innerHeight * 0.6;
    steps.forEach((s) => {
      const r = s.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (mark - r.top) / r.height));
      s.style.setProperty("--f", f);
      s.classList.toggle("on", r.top < mark);
    });
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
}

/* ---------- Compétences ↔ Projets ---------- */
let active = null;

function iconFor(name) {
  const tile = el("span", { class: "ico", "aria-hidden": "true" });
  const letter = () => { tile.textContent = name[0]; tile.classList.add("letter"); };
  if (!ICONS[name]) { letter(); return tile; }
  if (ICONS[name].endsWith("-plain.svg")) tile.classList.add("mono");
  const img = el("img", { src: ICONS[name], alt: "", width: "20", height: "20", loading: "lazy" });
  img.addEventListener("error", () => { img.remove(); letter(); });
  tile.append(img);
  return tile;
}

function renderSkills() {
  const box = $("#skills");
  for (const [group, items] of Object.entries(SKILLS)) {
    const row = el("div", { class: "group" }, el("h3", {}, group));
    const wrap = el("div", { class: "chips" });
    items.forEach((name) => {
      const b = el("button", { class: "chip", type: "button", "aria-pressed": "false" }, iconFor(name), name);
      b.addEventListener("click", () => {
        active = active === name ? null : name;
        applyFilter();
      });
      wrap.append(b);
    });
    row.append(wrap);
    box.append(row);
  }
}

function renderProjects() {
  const box = $("#projects");
  PROJECTS.forEach((p) => {
    const card = el("article", { class: "card" },
      el("h3", {}, p.name),
      el("p", { class: "org" }, p.meta),
      el("p", {}, p.text),
      el("ul", { class: "tags" }, ...p.tech.map((t) => el("li", { "data-t": t }, t))));
    card._tech = p.tech;
    box.append(card);
  });
}

function applyFilter() {
  document.querySelectorAll(".chip").forEach((c) =>
    c.setAttribute("aria-pressed", String(c.textContent === active)));
  let n = 0;
  document.querySelectorAll(".card").forEach((c) => {
    const hit = !active || c._tech.includes(active);
    c.classList.toggle("dim", !hit);
    c.querySelectorAll(".tags li").forEach((t) => t.classList.toggle("hit", !!active && t.dataset.t === active));
    if (hit) n++;
  });
  $("#filter-status").textContent = active
    ? `${n} projet${n > 1 ? "s" : ""} avec ${active}. Clique à nouveau pour tout afficher.`
    : "";
}

/* ---------- Dépôts GitHub (API publique) ---------- */
function repoText(r) {
  if (REPO_DESCRIPTIONS[r.name]) return REPO_DESCRIPTIONS[r.name];
  if (r.description && r.description.trim().length >= 30) return r.description.trim();
  const lang = r.language ? ` en ${r.language}` : "";
  return `Projet personnel${lang} publié sur GitHub. Le code source et l’historique des modifications sont consultables dans le dépôt.`;
}

async function loadRepos() {
  const box = $("#repos");
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=pushed`,
      { signal: ctrl.signal, headers: { Accept: "application/vnd.github+json" } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(res.status);
    const repos = (await res.json())
      .filter((r) => !r.fork && !HIDDEN_REPOS.includes(r.name))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 6);
    box.textContent = "";
    if (!repos.length) {
      box.append(el("p", {}, "Aucun dépôt public à afficher pour le moment."));
      return;
    }
    repos.forEach((r) => box.append(
      el("a", { class: "repo", href: r.html_url, rel: "noopener" },
        el("strong", {}, r.name),
        el("span", {}, repoText(r)),
        el("small", {}, [r.language, r.stargazers_count ? `${r.stargazers_count} étoile(s)` : ""]
          .filter(Boolean).join(", ")))));
  } catch (e) {
    box.textContent = "";
    box.append(el("p", {}, "Impossible de charger les dépôts. "),
      el("a", { href: `https://github.com/${GITHUB_USER}`, rel: "noopener" }, "Voir mon profil GitHub"));
  }
}

/* ---------- Écran de chargement ---------- */
function runLoader() {
  const loader = $("#loader");
  let seen = false;
  try { seen = sessionStorage.getItem("seen") === "1"; } catch (e) {}
  if (reduced || seen) { loader.remove(); return Promise.resolve(); }
  document.documentElement.classList.add("loading");
  const cmd = "git clone timlerider.github.io";
  return new Promise(async (done) => {
    const fill = $("#loader-fill"), pct = $("#loader-pct"), txt = $("#loader-text");
    for (const ch of cmd) { txt.textContent += ch; await sleep(28); }
    for (let i = 0; i <= 100; i += 4) {
      fill.style.width = i + "%";
      pct.textContent = i;
      await sleep(14 + (i > 80 ? 22 : 0));
    }
    await sleep(180);
    loader.classList.add("out");
    document.documentElement.classList.remove("loading");
    try { sessionStorage.setItem("seen", "1"); } catch (e) {}
    setTimeout(() => { loader.remove(); done(); }, 650);
  });
}

/* ---------- Démarrage ---------- */
initTheme();
initCursor();
renderTimeline();
renderSkills();
renderProjects();
$("#year").textContent = new Date().getFullYear();
$("#replay").addEventListener("click", playDiff);
loadRepos();
runLoader().then(playDiff);

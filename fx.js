// Effets partagés par toutes les pages : thème et curseur animé.
const fine = matchMedia("(pointer: fine)").matches;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initTheme() {
  const btn = document.getElementById("theme");
  if (!btn) return;
  const paint = () => {
    btn.textContent = document.documentElement.dataset.theme === "dark" ? "Thème clair" : "Thème sombre";
  };
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    paint();
  });
  paint();
}

export function initCursor() {
  if (!fine || reduced) return;
  const ring = document.createElement("div");
  ring.className = "cursor";
  ring.setAttribute("aria-hidden", "true");
  ring.textContent = "</>";
  document.body.append(ring);
  document.documentElement.classList.add("has-cursor");

  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    ring.classList.add("show");
    ring.classList.toggle("hot", !!e.target.closest("a, button, .chip, .repo"));
  });
  document.addEventListener("pointerleave", () => ring.classList.remove("show"));
  (function loop() {
    cx += (x - cx) * 0.18;
    cy += (y - cy) * 0.18;
    ring.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
}

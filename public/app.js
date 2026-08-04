const stuffJsonEl = document.getElementById("stuff-json");
const monsterLinkEl = document.getElementById("monster-link");
const apOverrideEl = document.getElementById("ap-override");
const pmOverrideEl = document.getElementById("pm-override");
const pvOverrideEl = document.getElementById("pv-override");
const submitBtn = document.getElementById("submit-btn");
const exampleBtn = document.getElementById("example-btn");
const errorEl = document.getElementById("error");
const resultsPanel = document.getElementById("results-panel");
const resultsEl = document.getElementById("results");
const loadingPanel = document.getElementById("loading-panel");

const EXAMPLE_MONSTER_LINK =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

// Mémorise les derniers inputs pour éviter de tout recoller à chaque test
// (ex: ajuster un override PA/PM après un premier calcul). Rien de sensible :
// juste ce qu'on a déjà collé dans le formulaire, stocké localement.
const STORAGE_KEY = "battlesim-last-inputs";

function saveInputsToStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        stuffJson: stuffJsonEl.value,
        monsterLink: monsterLinkEl.value,
        apOverride: apOverrideEl.value,
        pmOverride: pmOverrideEl.value,
        pvOverride: pvOverrideEl.value,
      }),
    );
  } catch {
    // stockage indisponible (mode privé, quota...) : tant pis, pas bloquant
  }
}

function restoreInputsFromStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved) return;
    stuffJsonEl.value = saved.stuffJson ?? "";
    monsterLinkEl.value = saved.monsterLink ?? "";
    apOverrideEl.value = saved.apOverride ?? "";
    pmOverrideEl.value = saved.pmOverride ?? "";
    pvOverrideEl.value = saved.pvOverride ?? "";
  } catch {
    // JSON corrompu ou stockage indisponible : on repart d'un formulaire vide
  }
}

restoreInputsFromStorage();

exampleBtn.addEventListener("click", async () => {
  const res = await fetch("/fixtures/sample-stuff.json");
  stuffJsonEl.value = await res.text();
  monsterLinkEl.value = EXAMPLE_MONSTER_LINK;
});

// Bookmarklet : à exécuter depuis la page du stuff sur dofusbook.net (même
// origine, donc pas bloqué par Cloudflare/CORS contrairement à un appel
// depuis notre propre site). Récupère l'id du stuff dans l'URL, fetch le
// JSON, le copie dans le presse-papier.
const BOOKMARKLET_SOURCE = `(function(){
  var m = location.href.match(/(\\d{5,})/);
  if (!m) { alert("Va d'abord sur la page de ton stuff sur dofusbook.net"); return; }
  fetch('/api/stuffs/dofus/public/' + m[1], { headers: { Accept: 'application/json' } })
    .then(function(r){ return r.text(); })
    .then(function(t){
      return navigator.clipboard.writeText(t).then(function(){
        alert('Stuff copié ! Reviens sur BattleSim et clique sur "Coller depuis le presse-papier".');
      });
    })
    .catch(function(e){ alert('Erreur : ' + e); });
})();`;

document.getElementById("bookmarklet-link").href = "javascript:" + encodeURIComponent(BOOKMARKLET_SOURCE);

document.getElementById("paste-btn").addEventListener("click", async () => {
  try {
    stuffJsonEl.value = await navigator.clipboard.readText();
  } catch (err) {
    errorEl.textContent =
      "Impossible de lire le presse-papier (" + err.message + "). Colle manuellement avec Ctrl+V dans le champ.";
    errorEl.hidden = false;
  }
});

submitBtn.addEventListener("click", async () => {
  errorEl.hidden = true;
  resultsPanel.hidden = true;
  loadingPanel.hidden = false;
  submitBtn.disabled = true;
  saveInputsToStorage();

  try {
    const apOverride = apOverrideEl.value ? Number(apOverrideEl.value) : undefined;
    const pmOverride = pmOverrideEl.value ? Number(pmOverrideEl.value) : undefined;
    const playerLifePointsOverride = pvOverrideEl.value ? Number(pvOverrideEl.value) : undefined;
    let res;
    try {
      res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stuffJson: stuffJsonEl.value,
          monsterLink: monsterLinkEl.value,
          apOverride,
          pmOverride,
          playerLifePointsOverride,
        }),
      });
    } catch {
      throw new Error("Impossible de contacter le serveur BattleSim — vérifie qu'il tourne bien (`npm run start`).");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur inconnue.");
    render(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    loadingPanel.hidden = true;
    submitBtn.disabled = false;
  }
});

function turnPlanHtml(turn) {
  if (turn.entries.length === 0) {
    return `<div class="turn-plan">Aucun sort jouable.</div>`;
  }
  const items = turn.entries
    .map((e) => `<li>${e.casts}× ${e.name} (${e.apCostEach} PA chacun) — <strong>${e.damage}</strong> dégâts</li>`)
    .join("");
  return `<div class="turn-plan">
    <ul>${items}</ul>
    <div>PA utilisés : ${turn.totalApUsed}</div>
    <div class="total">Total : ${turn.totalDamage} dégâts</div>
  </div>`;
}

function raceHtml(race) {
  const won = race.outcome === "player_wins";
  const badge = won
    ? `<span class="badge good">Tu gagnes</span> en ${race.turnsToKillMonster} tours`
    : `<span class="badge warn">Tu perds</span> — le monstre te tue au tour ${race.turnsToKillPlayer} (avant que tu ne le tues)`;
  const pvNote = race.playerLifePointsIsApprox
    ? `PV du joueur : <strong>${race.playerLifePoints} (estimation : 50 + 5×niveau + Vitalité)</strong> —
       peut manquer d'éventuels bonus de PV non modélisés. Renseigne tes vrais PV
       (visibles sur ta fiche personnage en jeu) dans le champ "PV réels du joueur" pour un résultat fiable.`
    : `PV du joueur : <strong>${race.playerLifePoints}</strong> (valeur réelle que tu as renseignée).`;
  return `<p>${badge}</p>
    <p class="coverage-note">${pvNote}</p>
    <p class="coverage-note">Hypothèse : le joueur agit en premier à chaque tour (pas de vraie gestion d'initiative).</p>`;
}

function kiteHtml(kite) {
  if (!kite.possible) {
    return `<p><span class="badge warn">Kite non viable</span> — ${kite.reason}</p>`;
  }
  const won = kite.outcome === "player_wins";
  const badge = won
    ? `<span class="badge good">Tu gagnes en kitant</span> en ${kite.turnsToKillMonster} tours`
    : `<span class="badge warn">Tu perds quand même</span> — tué au tour ${kite.turnsToKillPlayer} même en kitant`;
  return `<p>${badge}</p>
    <p class="coverage-note">${kite.reason} On suppose que tu restes hors de portée des sorts de mêlée du monstre pendant tout le combat —
    estimation optimiste : la vraie chance d'y arriver dépend du Tacle du monstre contre ta Fuite, pas modélisé ici.</p>`;
}

function titleHintHtml(c) {
  const hint = c.titleHint;
  if (hint.pa === null && hint.pm === null) return "";
  const parts = [];
  if (hint.pa !== null) parts.push(`${hint.pa} PA`);
  if (hint.pm !== null) parts.push(`${hint.pm} PM`);
  const mismatch =
    (hint.pa !== null && hint.pa !== c.apPerTurn) || (hint.pm !== null && hint.pm !== c.pmPerTurn);
  const note = mismatch
    ? `<span class="badge warn">Ne correspond pas au calcul</span> — vérifie tes PA/PM ou renseigne-les manuellement ci-dessus.`
    : `Cohérent avec le calcul.`;
  return `<p class="coverage-note">Titre du stuff : "${parts.join(" / ")}" (texte libre, non vérifié) — ${note}</p>`;
}

function unmodeledEffectsHtml(c) {
  const codes = Object.keys(c.unmodeledEffects);
  if (codes.length === 0) return "";
  const list = codes.map((code) => `${code} (${Math.round(c.unmodeledEffects[code])})`).join(", ");
  return `<p class="coverage-note">${codes.length} effet(s) d'objet non pris en compte dans le calcul : ${list}. Ça peut expliquer un écart avec tes vraies stats en jeu.</p>`;
}

function render(data) {
  const c = data.character;
  const m = data.monster;
  const pa = data.playerAttack;
  const ma = data.monsterAttack;

  const strategyRows = pa.strategies
    .map((s) => {
      const isBest = s.turnsNeeded === pa.bestTurnsNeeded && s.buffName === pa.bestBuffName;
      const label = s.buffName ?? "Sans buff";
      return `<tr class="${isBest ? "best" : ""}">
        <td>${label}</td>
        <td>${s.turnsNeeded} tours</td>
        <td>${s.firstTurn.totalDamage} (tour 1)</td>
        <td>${s.boostedTurn ? s.boostedTurn.totalDamage + " (boosté)" : "—"}</td>
      </tr>`;
    })
    .join("");

  // Un buff n'est "rentable" que s'il réduit vraiment le nombre de tours.
  // À nombre de tours égal, le tie-break interne peut préférer un buff pour
  // ses dégâts cumulés légèrement supérieurs (overkill sur le dernier coup),
  // mais ça ne change rien pour l'objectif "tuer le plus vite possible".
  const buffHelps = pa.bestBuffName && pa.bestTurnsNeeded < pa.baselineTurnsNeeded;
  const verdict = buffHelps
    ? `<span class="badge good">Rentable de se booster</span> avec <strong>${pa.bestBuffName}</strong> avant d'attaquer (${pa.bestTurnsNeeded} tours au lieu de ${pa.baselineTurnsNeeded})`
    : `<span class="badge warn">Pas rentable de se booster</span> — attaquer directement est optimal (${pa.baselineTurnsNeeded} tours)`;

  resultsEl.innerHTML = `
    <div class="section-title">Personnage</div>
    <div class="stat-grid">
      <div><span>Nom</span>${c.name}</div>
      <div><span>Niveau</span>${c.level}</div>
      <div><span>PA/tour</span>${c.apPerTurn}</div>
      <div><span>PM/tour</span>${c.pmPerTurn}</div>
      <div><span>Intelligence</span>${c.intelligence}</div>
      <div><span>Force</span>${c.strength}</div>
      <div><span>Chance</span>${c.chance}</div>
      <div><span>Agilité</span>${c.agility}</div>
      <div><span>Vitalité</span>${c.vitality}</div>
    </div>
    ${titleHintHtml(c)}
    <p class="coverage-note">${data.spellCoverage.damageResolved}/${data.spellCoverage.damageTotal} sorts de dégâts reconnus, ${data.spellCoverage.buffResolved} sort(s) de buff.${
      data.spellCoverage.unresolvedDamageSpellNames.length > 0
        ? ` Non pris en compte : ${data.spellCoverage.unresolvedDamageSpellNames.join(", ")}.`
        : ""
    }</p>
    ${unmodeledEffectsHtml(c)}

    <div class="section-title">Cible : ${m.name} (grade ${m.grade}, niv. ${m.level})</div>
    <p>${m.lifePoints} PV, ${m.actionPoints} PA</p>

    <div class="section-title">Meilleur tour d'attaque</div>
    ${turnPlanHtml(pa.baselineTurn)}

    <div class="section-title">Faut-il se booster avant d'attaquer ?</div>
    <p>${verdict}</p>
    <table class="strategy-table">
      <thead><tr><th>Stratégie</th><th>Tours pour tuer</th><th>Dégâts tour 1</th><th>Dégâts/tour boosté</th></tr></thead>
      <tbody>${strategyRows}</tbody>
    </table>

    <div class="section-title">Ce que le monstre inflige au joueur (1er tour)</div>
    <p class="coverage-note">${ma.spellCoverage.resolved}/${ma.spellCoverage.total} sorts du monstre reconnus, ${ma.apBudget} PA.</p>
    ${turnPlanHtml(ma.turn)}

    <div class="section-title">Qui gagne ?</div>
    ${raceHtml(data.race)}

    <div class="section-title">Et en kitant ?</div>
    ${kiteHtml(data.kite)}
  `;

  resultsPanel.hidden = false;
}

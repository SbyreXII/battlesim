const stuffJsonEl = document.getElementById("stuff-json");
const monsterLinkEl = document.getElementById("monster-link");
const apOverrideEl = document.getElementById("ap-override");
const submitBtn = document.getElementById("submit-btn");
const exampleBtn = document.getElementById("example-btn");
const errorEl = document.getElementById("error");
const resultsPanel = document.getElementById("results-panel");
const resultsEl = document.getElementById("results");
const loadingPanel = document.getElementById("loading-panel");

const EXAMPLE_MONSTER_LINK =
  "https://dofensive.com/fr/monster/2819?q=N4IgygpgNhDGAuEAmBZA9gOwM6IE4gC4AmADgEYBOAGhHWzy0NFMqZAHFcBDJCQsmmAAO0KIwIBtALoBfOUA";

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

  try {
    const apOverride = apOverrideEl.value ? Number(apOverrideEl.value) : undefined;
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stuffJson: stuffJsonEl.value,
        monsterLink: monsterLinkEl.value,
        apOverride,
      }),
    });
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
  return `<p>${badge}</p>
    <p class="coverage-note">
      Hypothèses : le joueur agit en premier à chaque tour (pas de vraie gestion d'initiative),
      et les PV du joueur (${race.playerLifePointsApprox}) ne comptent que la Vitalité des objets —
      les PV de base liés à la classe/niveau ne sont pas encore inclus, donc ce chiffre est probablement
      sous-estimé (tu as sans doute plus de PV en vrai, donc plus de marge que ce qui est affiché).
    </p>`;
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
      <div><span>Intelligence</span>${c.intelligence}</div>
      <div><span>Force</span>${c.strength}</div>
      <div><span>Chance</span>${c.chance}</div>
      <div><span>Agilité</span>${c.agility}</div>
      <div><span>Vitalité</span>${c.vitality}</div>
    </div>
    <p class="coverage-note">${data.spellCoverage.damageResolved}/${data.spellCoverage.damageTotal} sorts de dégâts reconnus, ${data.spellCoverage.buffResolved} sort(s) de buff.</p>

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
  `;

  resultsPanel.hidden = false;
}

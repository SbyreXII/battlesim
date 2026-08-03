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

    <div class="section-title">Ce que le monstre inflige au joueur</div>
    <p class="coverage-note">${ma.spellCoverage.resolved}/${ma.spellCoverage.total} sorts du monstre reconnus, ${ma.apBudget} PA.</p>
    ${turnPlanHtml(ma.turn)}
  `;

  resultsPanel.hidden = false;
}

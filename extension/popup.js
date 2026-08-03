const API_BASE = "http://localhost:3000";

const stuffStatusEl = document.getElementById("stuff-status");
const manualStuffBox = document.getElementById("manual-stuff-box");
const stuffJsonEl = document.getElementById("stuff-json");
const pasteBtn = document.getElementById("paste-btn");
const monsterLinkEl = document.getElementById("monster-link");
const monsterStatusEl = document.getElementById("monster-status");
const apOverrideEl = document.getElementById("ap-override");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("error");
const resultsEl = document.getElementById("results");

let detectedStuffJson = null;

// Exécutée DANS l'onglet dofusbook.net (même origine : pas de blocage
// Cloudflare/CORS, contrairement à un appel depuis le popup de l'extension).
async function extractStuffFromPage() {
  const match = location.href.match(/(\d{5,})/);
  if (!match) return { error: "Aucun id de stuff dans cette URL." };
  try {
    const res = await fetch("/api/stuffs/dofus/public/" + match[1], {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { error: "dofusbook.net a répondu " + res.status };
    return { json: await res.text() };
  } catch (err) {
    return { error: String(err) };
  }
}

function setStuffStatus(text, cls) {
  stuffStatusEl.textContent = text;
  stuffStatusEl.className = "status" + (cls ? " " + cls : "");
}

async function detectStuff() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\/(www\.)?dofusbook\.net\//.test(tab.url)) {
    setStuffStatus("Pas sur dofusbook.net — colle le JSON manuellement ci-dessous.", "warn");
    manualStuffBox.hidden = false;
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractStuffFromPage,
    });
    if (result?.error) {
      setStuffStatus("Impossible de lire le stuff sur cet onglet (" + result.error + ").", "warn");
      manualStuffBox.hidden = false;
      return;
    }
    detectedStuffJson = result.json;
    const parsed = JSON.parse(result.json);
    const stuff = parsed.stuff ?? parsed;
    setStuffStatus("✓ Stuff détecté : " + stuff.name, "ok");
  } catch (err) {
    setStuffStatus("Erreur de détection (" + err.message + "). Colle le JSON manuellement.", "warn");
    manualStuffBox.hidden = false;
  }
}

async function detectMonsterTab() {
  const tabs = await chrome.tabs.query({ url: ["*://dofensive.com/*", "*://*.dofensive.com/*"] });
  if (tabs.length > 0 && tabs[0].url) {
    monsterLinkEl.value = tabs[0].url;
    monsterStatusEl.textContent = "✓ Repris depuis un onglet dofensive.com ouvert.";
    monsterStatusEl.hidden = false;
    monsterStatusEl.className = "status ok";
  }
}

pasteBtn.addEventListener("click", async () => {
  try {
    stuffJsonEl.value = await navigator.clipboard.readText();
  } catch (err) {
    errorEl.textContent = "Presse-papier inaccessible : " + err.message;
    errorEl.hidden = false;
  }
});

submitBtn.addEventListener("click", async () => {
  errorEl.hidden = true;
  resultsEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Calcul…";

  try {
    const stuffJson = detectedStuffJson ?? stuffJsonEl.value;
    if (!stuffJson || !stuffJson.trim()) {
      throw new Error("Aucun stuff : va sur ta page dofusbook.net ou colle le JSON.");
    }
    if (!monsterLinkEl.value.trim()) {
      throw new Error("Lien monstre dofensive.com manquant.");
    }

    const apOverride = apOverrideEl.value ? Number(apOverrideEl.value) : undefined;

    let res;
    try {
      res = await fetch(API_BASE + "/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stuffJson, monsterLink: monsterLinkEl.value, apOverride }),
      });
    } catch {
      throw new Error(
        "Impossible de contacter le serveur BattleSim sur " + API_BASE + " — lance `npm run start` dans le projet.",
      );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur inconnue.");
    render(data);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Calculer";
  }
});

function turnPlanHtml(turn) {
  if (turn.entries.length === 0) return `<div class="turn-plan">Aucun sort jouable.</div>`;
  const items = turn.entries
    .map((e) => `<li>${e.casts}× ${e.name} — <strong>${e.damage}</strong></li>`)
    .join("");
  return `<div class="turn-plan"><ul>${items}</ul><div class="total">Total : ${turn.totalDamage} dégâts (${turn.totalApUsed} PA)</div></div>`;
}

function raceHtml(race) {
  const won = race.outcome === "player_wins";
  const badge = won
    ? `<span class="badge good">Tu gagnes</span> en ${race.turnsToKillMonster} tours`
    : `<span class="badge warn">Tu perds</span> — tué au tour ${race.turnsToKillPlayer}`;
  return `<p>${badge}</p><p class="coverage-note">PV joueur ≈ ${race.playerLifePointsApprox} (Vitalité seule, sous-estimé — les PV de base classe/niveau manquent encore).</p>`;
}

function render(data) {
  const c = data.character;
  const m = data.monster;
  const pa = data.playerAttack;
  const ma = data.monsterAttack;

  const buffHelps = pa.bestBuffName && pa.bestTurnsNeeded < pa.baselineTurnsNeeded;
  const verdict = buffHelps
    ? `<span class="badge good">Booste-toi</span> avec <strong>${pa.bestBuffName}</strong> (${pa.bestTurnsNeeded} tours au lieu de ${pa.baselineTurnsNeeded})`
    : `<span class="badge warn">Attaque direct</span> — pas rentable de se booster (${pa.baselineTurnsNeeded} tours)`;

  const strategyRows = pa.strategies
    .map((s) => `<tr><td>${s.buffName ?? "Sans buff"}</td><td>${s.turnsNeeded} tours</td></tr>`)
    .join("");

  resultsEl.innerHTML = `
    <div class="section-title">${c.name} (niv. ${c.level}, ${c.apPerTurn} PA)</div>
    <p class="coverage-note">Int ${c.intelligence} · For ${c.strength} · Cha ${c.chance} · Agi ${c.agility} · Vit ${c.vitality}</p>
    <p class="coverage-note">${data.spellCoverage.damageResolved}/${data.spellCoverage.damageTotal} sorts reconnus</p>

    <div class="section-title">${m.name} (grade ${m.grade}, ${m.lifePoints} PV)</div>
    ${turnPlanHtml(pa.baselineTurn)}

    <div class="section-title">Se booster avant d'attaquer ?</div>
    <p>${verdict}</p>
    <table><thead><tr><th>Stratégie</th><th>Tours</th></tr></thead><tbody>${strategyRows}</tbody></table>

    <div class="section-title">Le monstre riposte</div>
    ${turnPlanHtml(ma.turn)}

    <div class="section-title">Qui gagne ?</div>
    ${raceHtml(data.race)}
  `;
  resultsEl.hidden = false;
}

detectStuff();
detectMonsterTab();

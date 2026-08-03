import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runSimulation } from "../lib/simulate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(PUBLIC_DIR));
// Sert le stuff d'exemple utilisé par le bouton "Charger un exemple" du formulaire.
app.use("/fixtures", express.static(path.join(__dirname, "..", "..", "fixtures")));

app.post("/api/simulate", async (req, res) => {
  const { stuffJson, monsterLink, apOverride } = req.body ?? {};
  if (typeof stuffJson !== "string" || !stuffJson.trim()) {
    res.status(400).json({ error: "Le JSON du stuff est manquant." });
    return;
  }
  if (typeof monsterLink !== "string" || !monsterLink.trim()) {
    res.status(400).json({ error: "Le lien dofensive.com est manquant." });
    return;
  }

  try {
    const result = await runSimulation({
      stuffJson,
      monsterLink,
      apOverride: typeof apOverride === "number" && apOverride > 0 ? apOverride : undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message ?? "Erreur inconnue." });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`BattleSim en écoute sur http://localhost:${PORT}`);
});

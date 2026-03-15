// ============================================================
//  game.js  —  Core game state & logic
//  auth.js calls: getSaveData(), applySaveData(), initNewGame()
// ============================================================

// ── Game State ───────────────────────────────────────────────
let state = {
  generation: 1,
  population: [],
};

// ── Called by auth.js on first login ────────────────────────
window.initNewGame = () => {
  state = {
    generation: 1,
    population: [
      makeCreature(), makeCreature(), makeCreature(),
      makeCreature(), makeCreature(),
    ],
  };
  renderStats();
};

// ── Called by auth.js after loading save ────────────────────
window.applySaveData = (data) => {
  state.generation = data.generation ?? 1;
  state.population = data.population ?? [];
  renderStats();
};

// ── Called by auth.js when saving ────────────────────────────
window.getSaveData = () => ({
  generation: state.generation,
  population: state.population,
});

// ── Creature factory ─────────────────────────────────────────
function makeCreature(parentA = null, parentB = null) {
  if (!parentA) {
    // Random starter creature
    return {
      id:      crypto.randomUUID(),
      fitness: Math.floor(Math.random() * 20) + 1,
      traits:  {
        speed:    rand(1, 10),
        strength: rand(1, 10),
        stamina:  rand(1, 10),
      }
    };
  }
  // Inherit traits with small mutation
  return {
    id:      crypto.randomUUID(),
    fitness: 0,  // recalculated below
    traits: {
      speed:    inherit(parentA.traits.speed,    parentB.traits.speed),
      strength: inherit(parentA.traits.strength, parentB.traits.strength),
      stamina:  inherit(parentA.traits.stamina,  parentB.traits.stamina),
    }
  };
}

function calcFitness(c) {
  return Math.round((c.traits.speed + c.traits.strength + c.traits.stamina) / 3);
}

function inherit(a, b) {
  const base = Math.random() < 0.5 ? a : b;
  const mutation = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0;
  return Math.max(1, Math.min(20, base + mutation));
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Actions ──────────────────────────────────────────────────
window.breedCycle = () => {
  if (state.population.length < 2) {
    addLog("Not enough creatures to breed.", "warn");
    return;
  }

  // Pick two random parents
  const shuffled = [...state.population].sort(() => Math.random() - 0.5);
  const [pA, pB] = shuffled;
  const child    = makeCreature(pA, pB);
  child.fitness  = calcFitness(child);

  state.population.push(child);
  state.generation++;

  addLog(
    `Gen ${state.generation}: offspring born — ` +
    `SPD ${child.traits.speed} | STR ${child.traits.strength} | STA ${child.traits.stamina} → fitness ${child.fitness}`,
    "highlight"
  );

  renderStats();
};

window.cullWeakest = () => {
  if (state.population.length <= 2) {
    addLog("Population too small to cull.", "warn");
    return;
  }

  // Recalc fitness for all
  state.population.forEach(c => { c.fitness = calcFitness(c); });
  state.population.sort((a, b) => b.fitness - a.fitness);

  const culled = state.population.pop();
  addLog(`Culled weakest creature — fitness was ${culled.fitness}.`, "warn");
  renderStats();
};

// ── Render ───────────────────────────────────────────────────
function renderStats() {
  document.getElementById("stat-gen").textContent = state.generation;
  document.getElementById("stat-pop").textContent = state.population.length;

  const best = state.population.reduce((max, c) => {
    c.fitness = calcFitness(c);
    return c.fitness > max ? c.fitness : max;
  }, 0);

  document.getElementById("stat-fitness").textContent = best || "—";
}

// ── Log helper (also used by auth.js) ────────────────────────
window.addLog = (text, type = "") => {
  const el  = document.getElementById("log-output");
  const div = document.createElement("div");
  div.className = "log-entry" + (type ? ` ${type}` : "");
  div.textContent = `[${timestamp()}] ${text}`;
  el.prepend(div);
};

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

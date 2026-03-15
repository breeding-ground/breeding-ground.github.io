'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const MAX_POP    = 20;
const TRAIT_KEYS = ['speed', 'strength', 'stamina', 'intelligence', 'resilience'];
const TRAIT_ABR  = ['SPD', 'STR', 'STA', 'INT', 'RES'];

// ── Upgrades ────────────────────────────────────────────────
const UPGRADES_DEF = [
  {
    id: 'mutation',
    name: 'Mutation Boost',
    desc: 'Higher mutation rate — more chances for traits to improve.',
    levels: [
      { cost: 25,  label: 'Lv 1 — mutation chance 15% → 25%' },
      { cost: 75,  label: 'Lv 2 — mutation chance 25% → 40%' },
      { cost: 200, label: 'Lv 3 — mutations always beneficial' },
    ],
  },
  {
    id: 'cullValue',
    name: "Butcher's Eye",
    desc: 'Earn more gold from culling weak specimens.',
    levels: [
      { cost: 20,  label: 'Lv 1 — +3 gold per cull' },
      { cost: 55,  label: 'Lv 2 — +7 gold per cull (total)' },
      { cost: 150, label: 'Lv 3 — +15 gold per cull (total)' },
    ],
  },
  {
    id: 'selective',
    name: 'Selective Breeding',
    desc: 'Unlock targeted breeding — hand-pick your own breeding pairs.',
    levels: [
      { cost: 40, label: 'One-time — unlocks BREED SELECTED in Population tab' },
    ],
  },
];

// ── Quests ──────────────────────────────────────────────────
const QUESTS_DEF = [
  { id: 'q_first_breed',  tier: 1, name: 'First Steps',        desc: 'Breed your first offspring.',
    check: s => s.totalBred >= 1,       progress: s => `${Math.min(s.totalBred,1)} / 1 bred`,          reward: { gold: 10 },  rewardText: '+10 gold' },
  { id: 'q_first_cull',   tier: 1, name: 'Culling Season',     desc: 'Cull your first creature.',
    check: s => s.totalCulled >= 1,     progress: s => `${Math.min(s.totalCulled,1)} / 1 culled`,      reward: { gold: 15 },  rewardText: '+15 gold' },
  { id: 'q_earn_25',      tier: 1, name: 'Pocket Change',      desc: 'Accumulate 25 total gold earned.',
    check: s => s.totalGoldEarned >= 25, progress: s => `${Math.min(s.totalGoldEarned,25)} / 25 gold`, reward: { gold: 10 },  rewardText: '+10 gold' },
  { id: 'q_trait_8',      tier: 1, name: 'Curious Specimen',   desc: 'Breed a creature with any single trait ≥ 8.',
    check: s => s.population.some(c => Math.max(...TRAIT_KEYS.map(t => safeNum(c.traits[t]))) >= 8),
    progress: s => { const b = Math.max(0,...s.population.map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits[t]))))); return `Best trait: ${b} / 8`; },
    reward: { gold: 15 }, rewardText: '+15 gold' },
  { id: 'q_pop_8',        tier: 2, name: 'Growing Population', desc: 'Have 8 creatures alive simultaneously.',
    check: s => s.population.length >= 8, progress: s => `${s.population.length} / 8 creatures`,      reward: { gold: 25 },  rewardText: '+25 gold' },
  { id: 'q_fitness_8',    tier: 2, name: 'Fitness Fanatic',    desc: 'Breed a creature with fitness ≥ 8.',
    check: s => s.highestFitness >= 8,  progress: s => `Best fitness: ${s.highestFitness} / 8`,        reward: { gold: 20 },  rewardText: '+20 gold' },
  { id: 'q_cull_5',       tier: 2, name: 'Cull the Herd',      desc: 'Cull 5 creatures total.',
    check: s => s.totalCulled >= 5,     progress: s => `${Math.min(s.totalCulled,5)} / 5 culled`,      reward: { gold: 30 },  rewardText: '+30 gold' },
  { id: 'q_first_upgrade',tier: 2, name: 'First Investment',   desc: 'Purchase any upgrade.',
    check: s => Object.values(s.upgrades).some(v => v > 0), progress: () => 'Buy any upgrade',         reward: { gold: 25 },  rewardText: '+25 gold' },
  { id: 'q_fitness_12',   tier: 3, name: 'Strong Bloodline',   desc: 'Breed a creature with fitness ≥ 12.',
    check: s => s.highestFitness >= 12, progress: s => `Best fitness: ${s.highestFitness} / 12`,       reward: { gold: 50 },  rewardText: '+50 gold' },
  { id: 'q_gen_100',      tier: 3, name: 'Century Mark',       desc: 'Reach generation 100.',
    check: s => s.generation >= 100,    progress: s => `Gen ${s.generation} / 100`,                    reward: { gold: 75 },  rewardText: '+75 gold' },
  { id: 'q_cull_20',      tier: 3, name: 'Population Control', desc: 'Cull 20 creatures total.',
    check: s => s.totalCulled >= 20,    progress: s => `${Math.min(s.totalCulled,20)} / 20 culled`,    reward: { gold: 60 },  rewardText: '+60 gold' },
  { id: 'q_gold_500',     tier: 3, name: 'Golden Age',         desc: 'Hold 500 gold at once.',
    check: s => s.gold >= 500,          progress: s => `${s.gold} / 500 gold`,                         reward: { gold: 100 }, rewardText: '+100 gold' },
  { id: 'q_fitness_16',   tier: 4, name: 'Elite Lineage',      desc: 'Breed a creature with fitness ≥ 16.',
    check: s => s.highestFitness >= 16, progress: s => `Best fitness: ${s.highestFitness} / 16`,       reward: { gold: 100 }, rewardText: '+100 gold' },
  { id: 'q_gen_500',      tier: 4, name: 'Grand Experiment',   desc: 'Reach generation 500.',
    check: s => s.generation >= 500,    progress: s => `Gen ${s.generation} / 500`,                    reward: { gold: 150 }, rewardText: '+150 gold' },
  { id: 'q_cull_50',      tier: 4, name: 'Ruthless',           desc: 'Cull 50 creatures total.',
    check: s => s.totalCulled >= 50,    progress: s => `${Math.min(s.totalCulled,50)} / 50 culled`,    reward: { gold: 80 },  rewardText: '+80 gold' },
  { id: 'q_fitness_20',   tier: 5, name: 'Perfection',         desc: 'Achieve maximum fitness (20) in any creature.',
    check: s => s.highestFitness >= 20, progress: s => `Best fitness: ${s.highestFitness} / 20`,       reward: { gold: 500 }, rewardText: '+500 gold' },
];

// ── Achievement map ──────────────────────────────────────────
const ACH_MAP = [
  { label: 'BREEDING', nodes: [
    { id: 'a_genesis',  name: 'Genesis',          desc: 'Start a new lineage',      check: () => true },
    { id: 'a_bred_1',   name: 'Life Finds a Way', desc: 'Breed for the first time', check: s => s.totalBred >= 1 },
    { id: 'a_bred_10',  name: 'Veteran',          desc: 'Breed 10 times',           check: s => s.totalBred >= 10 },
    { id: 'a_bred_50',  name: 'Master Breeder',   desc: 'Breed 50 times',           check: s => s.totalBred >= 50 },
    { id: 'a_bred_200', name: 'Prolific',          desc: 'Breed 200 times',          check: s => s.totalBred >= 200 },
  ]},
  { label: 'CULLING', nodes: [
    { id: 'a_cull_1',   name: 'Red in Tooth',     desc: 'Cull your first creature', check: s => s.totalCulled >= 1 },
    { id: 'a_cull_10',  name: 'Selective',         desc: 'Cull 10 creatures',        check: s => s.totalCulled >= 10 },
    { id: 'a_cull_50',  name: 'Ruthless',          desc: 'Cull 50 creatures',        check: s => s.totalCulled >= 50 },
  ]},
  { label: 'WEALTH', nodes: [
    { id: 'a_gold_50',   name: 'Prospector', desc: 'Earn 50 total gold',   check: s => s.totalGoldEarned >= 50 },
    { id: 'a_gold_250',  name: 'Goldsmith',  desc: 'Earn 250 total gold',  check: s => s.totalGoldEarned >= 250 },
    { id: 'a_gold_1000', name: 'Magnate',    desc: 'Earn 1000 total gold', check: s => s.totalGoldEarned >= 1000 },
  ]},
  { label: 'FITNESS', nodes: [
    { id: 'a_fit_8',  name: 'Promising Line', desc: 'Reach fitness 8',          check: s => s.highestFitness >= 8 },
    { id: 'a_fit_12', name: 'Strong Line',    desc: 'Reach fitness 12',         check: s => s.highestFitness >= 12 },
    { id: 'a_fit_16', name: 'Champion Line',  desc: 'Reach fitness 16',         check: s => s.highestFitness >= 16 },
    { id: 'a_fit_20', name: 'Perfect',        desc: 'Reach max fitness (20)',   check: s => s.highestFitness >= 20 },
  ]},
  { label: 'GENERATIONS', nodes: [
    { id: 'a_gen_50',   name: 'Half Century', desc: 'Reach generation 50',   check: s => s.generation >= 50 },
    { id: 'a_gen_100',  name: 'Century',      desc: 'Reach generation 100',  check: s => s.generation >= 100 },
    { id: 'a_gen_500',  name: 'Epoch',        desc: 'Reach generation 500',  check: s => s.generation >= 500 },
    { id: 'a_gen_1000', name: 'Millennium',   desc: 'Reach generation 1000', check: s => s.generation >= 1000 },
  ]},
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];

function defaultState() {
  return {
    generation:           1,
    population:           [],
    gold:                 0,
    totalBred:            0,
    totalCulled:          0,
    totalGoldEarned:      0,
    highestFitness:       0,
    completedQuests:      [],
    unlockedAchievements: ['a_genesis'],
    upgrades:             { mutation: 0, cullValue: 0, selective: 0 },
  };
}

// ── Safe number helper — converts NaN/undefined/null → 0 ────
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

// ── Migrate a creature loaded from an old save ───────────────
function migrateCrature(c) {
  if (!c || typeof c !== 'object') return null;
  const traits = c.traits || {};
  return {
    id:         c.id || Math.random().toString(36).slice(2,8).toUpperCase(),
    generation: safeNum(c.generation, 1),
    traits: {
      speed:        safeNum(traits.speed,        rand(1,8)),
      strength:     safeNum(traits.strength,     rand(1,8)),
      stamina:      safeNum(traits.stamina,       rand(1,8)),
      intelligence: safeNum(traits.intelligence,  rand(1,8)),  // ← fills in missing trait
      resilience:   safeNum(traits.resilience,    rand(1,8)),  // ← fills in missing trait
    },
  };
}

// ── Sanitise entire state — remove NaN before saving ─────────
function sanitiseState(s) {
  return {
    ...s,
    generation:           safeNum(s.generation, 1),
    gold:                 safeNum(s.gold),
    totalBred:            safeNum(s.totalBred),
    totalCulled:          safeNum(s.totalCulled),
    totalGoldEarned:      safeNum(s.totalGoldEarned),
    highestFitness:       safeNum(s.highestFitness),
    completedQuests:      Array.isArray(s.completedQuests)      ? s.completedQuests      : [],
    unlockedAchievements: Array.isArray(s.unlockedAchievements) ? s.unlockedAchievements : ['a_genesis'],
    upgrades: {
      mutation:   safeNum(s.upgrades?.mutation),
      cullValue:  safeNum(s.upgrades?.cullValue),
      selective:  safeNum(s.upgrades?.selective),
    },
    population: (s.population || []).map(migrateCrature).filter(Boolean),
  };
}

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD  (called by auth.js)
// ═══════════════════════════════════════════════════════════

window.getSaveData = () => sanitiseState(state);

window.applySaveData = (data) => {
  state = sanitiseState({ ...defaultState(), ...data });
  if (!state.unlockedAchievements.includes('a_genesis')) {
    state.unlockedAchievements.push('a_genesis');
  }
  selectedForBreeding = [];
  renderAll();
};

window.initNewGame = () => {
  state = defaultState();
  state.population = Array.from({ length: 5 }, () => makeCreature());
  renderAll();
};

// ═══════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════

window.calcScore = () => {
  return Math.floor(
    safeNum(state.highestFitness)  * 200 +
    safeNum(state.generation)      *  10 +
    safeNum(state.totalBred)       *   3 +
    safeNum(state.totalCulled)     *   5 +
    safeNum(state.totalGoldEarned) *   1
  );
};

// ═══════════════════════════════════════════════════════════
//  CREATURE HELPERS
// ═══════════════════════════════════════════════════════════

function calcFitness(c) {
  const sum = TRAIT_KEYS.reduce((s, t) => s + safeNum(c.traits[t]), 0);
  return Math.round(sum / TRAIT_KEYS.length);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function inherit(a, b) {
  const base = Math.random() < 0.5 ? safeNum(a, 4) : safeNum(b, 4);
  const mutRates = [0.15, 0.25, 0.40, 0.60];
  const mutRate  = mutRates[safeNum(state.upgrades?.mutation)] ?? 0.15;
  if (Math.random() < mutRate) {
    const alwaysPositive = safeNum(state.upgrades?.mutation) >= 3;
    const dir = alwaysPositive ? 1 : (Math.random() < 0.5 ? 1 : -1);
    return Math.max(1, Math.min(20, base + dir));
  }
  return base;
}

function makeCreature(parentA = null, parentB = null) {
  const traits = {};
  TRAIT_KEYS.forEach(t => {
    traits[t] = parentA ? inherit(parentA.traits[t], parentB.traits[t]) : rand(1, 8);
  });
  return {
    id:         Math.random().toString(36).slice(2, 8).toUpperCase(),
    generation: state.generation,
    traits,
  };
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════

window.breedCycle = () => {
  if (state.population.length < 2)    return addLog('Not enough creatures to breed.', 'warn');
  if (state.population.length >= MAX_POP) return addLog(`Population cap (${MAX_POP}) reached — cull before breeding.`, 'warn');
  const [pA, pB] = [...state.population].sort(() => Math.random() - 0.5);
  _doBreed(pA, pB);
};

window.breedSelected = () => {
  if (!safeNum(state.upgrades?.selective)) return addLog('Selective Breeding upgrade required.', 'warn');
  if (selectedForBreeding.length !== 2)    return addLog('Select exactly 2 creatures to breed.', 'warn');
  if (state.population.length >= MAX_POP)  return addLog(`Population cap (${MAX_POP}) reached.`, 'warn');
  const pA = state.population.find(c => c.id === selectedForBreeding[0]);
  const pB = state.population.find(c => c.id === selectedForBreeding[1]);
  if (!pA || !pB) return addLog('Selected creatures not found.', 'warn');
  selectedForBreeding = [];
  _doBreed(pA, pB, true);
};

function _doBreed(pA, pB, targeted = false) {
  const child   = makeCreature(pA, pB);
  const fitness = calcFitness(child);
  state.population.push(child);
  state.generation++;
  state.totalBred++;
  state.gold++;
  state.totalGoldEarned++;

  if (fitness > safeNum(state.highestFitness)) {
    state.highestFitness = fitness;
    addLog(
      `${targeted ? 'TARGETED ' : ''}Gen ${state.generation}: ${child.id} — NEW RECORD fitness ${fitness}! ` +
      `[${TRAIT_ABR.map((a,i) => `${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ')}]`,
      'highlight'
    );
  } else {
    addLog(
      `${targeted ? 'Targeted — ' : ''}Gen ${state.generation}: ${child.id} born ` +
      `[${TRAIT_ABR.map((a,i) => `${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ')}] → fitness ${fitness}`
    );
  }

  checkQuests();
  checkAchievements();
  renderAll();
}

window.cullWeakest = () => {
  if (state.population.length <= 2) return addLog('Population too small to cull (min 2).', 'warn');

  state.population.forEach(c => { c._f = calcFitness(c); });
  state.population.sort((a, b) => a._f - b._f);
  const culled = state.population.shift();

  const bonusMap = [0, 3, 7, 15];
  const earned   = Math.max(1, 2 + Math.floor(safeNum(culled._f) / 2) + (bonusMap[safeNum(state.upgrades?.cullValue)] || 0));
  state.gold            += earned;
  state.totalGoldEarned += earned;
  state.totalCulled++;

  addLog(`Culled ${culled.id} (fitness ${culled._f}) — earned ${earned} gold.`, 'warn');

  checkQuests();
  checkAchievements();
  renderAll();
};

window.buyUpgrade = (id) => {
  const def = UPGRADES_DEF.find(u => u.id === id);
  if (!def) return;
  const lvl  = safeNum(state.upgrades?.[id]);
  if (lvl >= def.levels.length) return addLog(`${def.name} is already maxed.`, 'warn');
  const cost = def.levels[lvl].cost;
  if (state.gold < cost)        return addLog(`Need ${cost} gold — you have ${state.gold}.`, 'warn');
  state.gold         -= cost;
  state.upgrades[id]  = lvl + 1;
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`, 'highlight');
  checkQuests();
  renderAll();
};

window.toggleSelect = (id) => {
  const idx = selectedForBreeding.indexOf(id);
  if (idx >= 0) selectedForBreeding.splice(idx, 1);
  else { if (selectedForBreeding.length >= 2) selectedForBreeding.shift(); selectedForBreeding.push(id); }
  renderPopulation();
};

// ═══════════════════════════════════════════════════════════
//  QUESTS & ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════

function checkQuests() {
  getActiveQuests().forEach(q => {
    if (!state.completedQuests.includes(q.id) && q.check(state)) {
      state.completedQuests.push(q.id);
      if (q.reward?.gold) {
        state.gold            += q.reward.gold;
        state.totalGoldEarned += q.reward.gold;
      }
      addLog(`✓ Quest complete: "${q.name}" — ${q.rewardText}`, 'highlight');
    }
  });
}

function getActiveQuests() {
  return QUESTS_DEF.filter(q => !state.completedQuests.includes(q.id)).slice(0, 4);
}

function checkAchievements() {
  ACH_MAP.forEach(row => row.nodes.forEach(node => {
    if (!state.unlockedAchievements.includes(node.id) && node.check(state)) {
      state.unlockedAchievements.push(node.id);
      addLog(`🏆 Achievement: "${node.name}"`, 'highlight');
    }
  }));
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════

function renderAll() {
  renderStats();
  renderUpgrades();
  if (currentTab === 'population')   renderPopulation();
  if (currentTab === 'quests')       renderQuests();
  if (currentTab === 'achievements') renderAchievements();
  // leaderboard only refreshed on tab open or manual refresh
}

function renderStats() {
  const bestFitness = state.population.reduce((m, c) => {
    const f = calcFitness(c);
    return f > m ? f : m;
  }, 0);
  document.getElementById('stat-gen').textContent     = safeNum(state.generation, 1);
  document.getElementById('stat-pop').textContent     = `${state.population.length} / ${MAX_POP}`;
  document.getElementById('stat-gold').textContent    = safeNum(state.gold);
  document.getElementById('stat-fitness').textContent = bestFitness || '—';
  document.getElementById('stat-score').textContent   = calcScore().toLocaleString();
  document.getElementById('stat-bred').textContent    = safeNum(state.totalBred);
  document.getElementById('stat-culled').textContent  = safeNum(state.totalCulled);
}

function renderUpgrades() {
  const container = document.getElementById('upgrades-list');
  if (!container) return;
  container.innerHTML = '';
  UPGRADES_DEF.forEach(def => {
    const lvl   = safeNum(state.upgrades?.[def.id]);
    const maxed = lvl >= def.levels.length;
    const div   = document.createElement('div');
    div.className = 'upgrade-item';
    if (maxed) {
      div.innerHTML = `<div class="upgrade-name">${def.name} <span class="maxed">[MAX]</span></div><div class="upgrade-desc">${def.desc}</div>`;
    } else {
      const next = def.levels[lvl];
      div.innerHTML = `
        <div class="upgrade-name">${def.name}${lvl > 0 ? ` <span class="level-badge">[Lv${lvl}]</span>` : ''}</div>
        <div class="upgrade-desc">${next.label}</div>
        <button onclick="buyUpgrade('${def.id}')" ${state.gold >= next.cost ? '' : 'style="opacity:0.4;cursor:not-allowed"'}>
          [ BUY — ${next.cost}g ]
        </button>`;
    }
    container.appendChild(div);
  });
}

function renderPopulation() {
  const container  = document.getElementById('population-table');
  if (!container) return;
  const hasSelective = safeNum(state.upgrades?.selective) > 0;
  const sorted = [...state.population].map(c => ({ ...c, _f: calcFitness(c) })).sort((a,b) => b._f - a._f);

  if (sorted.length === 0) { container.innerHTML = '<p class="empty-state">No creatures yet.</p>'; return; }

  let html = '';
  if (hasSelective) {
    html += `<div class="pop-header">
      <span class="pop-hint">Click [ SEL ] to pick a breeding pair.</span>
      <button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button>
    </div>`;
  }

  html += `<table><thead><tr>
    ${hasSelective ? '<th></th>' : ''}
    <th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}
  </tr></thead><tbody>`;

  sorted.forEach((c, i) => {
    const isTop  = i === 0;
    const isBot  = i === sorted.length - 1 && sorted.length > 2;
    const isSel  = selectedForBreeding.includes(c.id);
    const rowCls = isTop ? 'row-top' : isBot ? 'row-bottom' : isSel ? 'row-selected' : '';
    html += `<tr class="${rowCls}">`;
    if (hasSelective) {
      html += `<td><button class="sel-btn ${isSel ? 'sel-active' : ''}" onclick="toggleSelect('${c.id}')">${isSel ? '★ SEL' : '☆ SEL'}</button></td>`;
    }
    html += `<td class="bright">${c.id}</td><td>${safeNum(c.generation,'?')}</td><td class="fit-val">${c._f}</td>`;
    TRAIT_KEYS.forEach(t => {
      const v = safeNum(c.traits[t]);
      html += `<td class="${v >= 16 ? 'trait-hi' : v <= 3 ? 'trait-lo' : ''}">${v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (!hasSelective) html += `<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> to hand-pick pairs.</p>`;
  container.innerHTML = html;
}

function renderQuests() {
  const container = document.getElementById('quests-container');
  if (!container) return;
  const active    = getActiveQuests();
  const completed = QUESTS_DEF.filter(q => state.completedQuests.includes(q.id));
  let html = `<p class="section-label">// ACTIVE QUESTS (${completed.length}/${QUESTS_DEF.length} complete)</p>`;
  if (active.length === 0) {
    html += `<p class="quests-complete">All quests complete. You are a god of selection.</p>`;
  } else {
    active.forEach(q => {
      const prog = q.progress ? q.progress(state) : '';
      html += `<div class="quest-card">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        ${prog ? `<div class="quest-progress">▸ ${prog}</div>` : ''}
        <div class="quest-reward">Reward: ${q.rewardText}</div>
      </div>`;
    });
  }
  if (completed.length > 0) {
    html += `<p class="section-label" style="margin-top:28px">// COMPLETED (${completed.length})</p>`;
    [...completed].reverse().forEach(q => {
      html += `<div class="quest-card completed"><span class="check">✓</span> ${q.name}</div>`;
    });
  }
  container.innerHTML = html;
}

function renderAchievements() {
  const container = document.getElementById('achievements-container');
  if (!container) return;
  const total    = ACH_MAP.reduce((n, r) => n + r.nodes.length, 0);
  const unlocked = state.unlockedAchievements.length;
  let html = `<p class="section-label">// ACHIEVEMENT MAP — ${unlocked} / ${total} unlocked</p>`;
  ACH_MAP.forEach(row => {
    html += `<div class="ach-row"><div class="ach-row-label">${row.label}</div><div class="ach-nodes">`;
    row.nodes.forEach((node, i) => {
      const isUnlocked = state.unlockedAchievements.includes(node.id);
      html += `<div class="ach-node ${isUnlocked ? 'unlocked' : 'locked'}" title="${node.desc}">
        <div class="ach-icon">${isUnlocked ? '◆' : '◇'}</div>
        <div class="ach-name">${node.name}</div>
        <div class="ach-desc">${node.desc}</div>
      </div>`;
      if (i < row.nodes.length - 1) {
        html += `<div class="ach-connector ${isUnlocked ? 'conn-lit' : ''}">──→</div>`;
      }
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

// ── Leaderboard (data fetched by auth.js) ────────────────────
window.renderLeaderboard = (entries, currentUid) => {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;

  let html = `
    <div class="lb-header">
      <span class="lb-title">// LEADERBOARD</span>
      <button class="lb-refresh" onclick="window.refreshLeaderboard && window.refreshLeaderboard()">[ REFRESH ]</button>
    </div>
    <p class="lb-formula">
      Score = <span>fitness × 200</span> + <span>generation × 10</span> + <span>bred × 3</span> + <span>culled × 5</span> + <span>gold earned × 1</span>
    </p>`;

  if (!entries || entries.length === 0) {
    html += `<p class="lb-empty">No entries yet — save your game to appear here.</p>`;
    container.innerHTML = html;
    return;
  }

  html += `<table class="lb-table"><thead><tr>
    <th>#</th><th>PLAYER</th><th>SCORE</th><th>FITNESS</th><th>GEN</th>
  </tr></thead><tbody>`;

  entries.forEach((e, i) => {
    const rank   = i + 1;
    const isYou  = e.uid === currentUid;
    const rkCls  = rank <= 3 ? `lb-rank-${rank}` : '';
    const youCls = isYou ? 'lb-you' : '';
    html += `<tr class="${rkCls} ${youCls}">
      <td>${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</td>
      <td class="lb-name">${esc(e.username || 'Anonymous')}${isYou ? ' ◄ you' : ''}</td>
      <td class="lb-score">${safeNum(e.score).toLocaleString()}</td>
      <td>${safeNum(e.highestFitness)}</td>
      <td>${safeNum(e.generation)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
};

window.renderLeaderboardLoading = () => {
  const c = document.getElementById('leaderboard-container');
  if (c) c.innerHTML = '<p class="lb-loading">Loading leaderboard…</p>';
};

// ── Username modal (opened from header or auth.js) ───────────
window.openUsernameModal = () => {
  document.getElementById('username-modal').classList.remove('hidden');
  const input = document.getElementById('username-input');
  if (window._currentUsername) input.value = window._currentUsername;
  document.getElementById('username-message').textContent = '';
};

window.skipUsername = () => {
  document.getElementById('username-modal').classList.add('hidden');
};

// saveUsername / the actual save is called from auth.js via window.saveUsername
// (auth.js overwrites this with a version that also persists to Firestore)

// ─── Tab switching ────────────────────────────────────────────
window.switchTab = (tab) => {
  currentTab = tab;
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('#tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (tab === 'population')   renderPopulation();
  if (tab === 'quests')       renderQuests();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'leaderboard')  window.refreshLeaderboard && window.refreshLeaderboard();
};

// ── Log ───────────────────────────────────────────────────────
window.addLog = (text, type = '') => {
  const el = document.getElementById('log-output');
  if (!el) return;
  const div = document.createElement('div');
  div.className   = 'log-entry' + (type ? ` ${type}` : '');
  div.textContent = `[${ts()}] ${text}`;
  el.prepend(div);
  while (el.children.length > 200) el.removeChild(el.lastChild);
};

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

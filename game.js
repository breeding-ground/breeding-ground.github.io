'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const TRAIT_KEYS = ['speed', 'strength', 'stamina', 'intelligence', 'resilience'];
const TRAIT_ABR  = ['SPD', 'STR', 'STA', 'INT', 'RES'];

// Population cap per upgrade level (index = upgrade level)
const POP_CAP_TABLE = [20, 25, 30, 40, 60, 100];

// ── Upgrades definition ──────────────────────────────────────
// Each entry: { id, name, desc, levels: [{cost, label}] }
const UPGRADES_DEF = [
  // ── POPULATION ────────────────────────────────────────────
  {
    id: 'popCap',
    name: 'Expanded Habitat',
    desc: 'Raise the population cap, allowing more creatures to exist simultaneously.',
    levels: [
      { cost: 60,   label: 'Lv 1 — cap 20 → 25' },
      { cost: 200,  label: 'Lv 2 — cap 25 → 30' },
      { cost: 600,  label: 'Lv 3 — cap 30 → 40' },
      { cost: 2000, label: 'Lv 4 — cap 40 → 60' },
      { cost: 7000, label: 'Lv 5 — cap 60 → 100' },
    ],
  },

  // ── MUTATION ───────────────────────────────────────────────
  {
    id: 'mutation',
    name: 'Mutation Boost',
    desc: 'Higher mutation rate — more chances for traits to improve each generation.',
    levels: [
      { cost: 25,   label: 'Lv 1 — mutation chance 15% → 25%' },
      { cost: 75,   label: 'Lv 2 — mutation chance 25% → 40%' },
      { cost: 200,  label: 'Lv 3 — mutation chance 40% → 60%' },
      { cost: 600,  label: 'Lv 4 — mutations always beneficial' },
      { cost: 2000, label: 'Lv 5 — two traits mutate per offspring' },
    ],
  },

  // ── TRAIT AMPLIFIER ────────────────────────────────────────
  {
    id: 'traitAmp',
    name: 'Trait Amplifier',
    desc: 'Offspring have a chance to inherit the stronger of each parent\'s traits.',
    levels: [
      { cost: 50,   label: 'Lv 1 — 15% chance to take max of parent pair' },
      { cost: 160,  label: 'Lv 2 — 30% chance to take max' },
      { cost: 450,  label: 'Lv 3 — 55% chance to take max' },
      { cost: 1400, label: 'Lv 4 — always inherit the stronger trait' },
    ],
  },

  // ── BREEDING YIELD ─────────────────────────────────────────
  {
    id: 'breedYield',
    name: 'Breeding Yield',
    desc: 'Earn more gold each time you breed a new offspring.',
    levels: [
      { cost: 30,   label: 'Lv 1 — +2 gold per breed (total: 3g)' },
      { cost: 90,   label: 'Lv 2 — +3 gold per breed (total: 6g)' },
      { cost: 280,  label: 'Lv 3 — +6 gold per breed (total: 12g)' },
      { cost: 800,  label: 'Lv 4 — +13 gold per breed (total: 25g)' },
      { cost: 2500, label: 'Lv 5 — +25 gold per breed (total: 50g)' },
    ],
  },

  // ── CULL VALUE ─────────────────────────────────────────────
  {
    id: 'cullValue',
    name: "Butcher's Eye",
    desc: 'Extract more gold when culling weak specimens.',
    levels: [
      { cost: 20,   label: 'Lv 1 — +3 gold per cull' },
      { cost: 55,   label: 'Lv 2 — +7 gold per cull (total)' },
      { cost: 150,  label: 'Lv 3 — +15 gold per cull (total)' },
      { cost: 450,  label: 'Lv 4 — +30 gold per cull (total)' },
      { cost: 1500, label: 'Lv 5 — +60 gold per cull (total)' },
    ],
  },

  // ── GENE POOL ──────────────────────────────────────────────
  {
    id: 'genePool',
    name: 'Prime Stock',
    desc: 'Your starting creatures are born with stronger base traits.',
    levels: [
      { cost: 40,  label: 'Lv 1 — starters roll up to 10 (was 8)' },
      { cost: 120, label: 'Lv 2 — starters roll 3–12' },
      { cost: 350, label: 'Lv 3 — starters roll 5–14' },
    ],
  },

  // ── SELECTIVE BREEDING ─────────────────────────────────────
  {
    id: 'selective',
    name: 'Selective Breeding',
    desc: 'Unlock targeted breeding — hand-pick your own pairs in the Population tab.',
    levels: [
      { cost: 40, label: 'One-time — unlocks BREED SELECTED' },
    ],
  },

  // ── CULLING INSIGHT ────────────────────────────────────────
  {
    id: 'cullInsight',
    name: 'Culling Insight',
    desc: 'See trait breakdown before culling. Cull removes the 2 weakest at once.',
    levels: [
      { cost: 100,  label: 'Lv 1 — cull removes bottom 2 simultaneously' },
      { cost: 350,  label: 'Lv 2 — cull removes bottom 3 simultaneously' },
      { cost: 1200, label: 'Lv 3 — cull removes bottom 5 simultaneously' },
    ],
  },

  // ── LINEAGE MEMORY ─────────────────────────────────────────
  {
    id: 'lineageMem',
    name: 'Lineage Memory',
    desc: 'Breed bonus: offspring have a chance to "remember" the best historical trait value.',
    levels: [
      { cost: 150,  label: 'Lv 1 — 5% chance per trait to inherit all-time best' },
      { cost: 500,  label: 'Lv 2 — 12% chance per trait' },
      { cost: 1800, label: 'Lv 3 — 25% chance per trait' },
    ],
  },
];

// ── Quests ──────────────────────────────────────────────────
const QUESTS_DEF = [
  // Tier 1
  { id: 'q_first_breed',   tier:1, name:'First Steps',        desc:'Breed your first offspring.',
    check:s=>s.totalBred>=1,         progress:s=>`${Math.min(s.totalBred,1)} / 1 bred`,              reward:{gold:10},  rewardText:'+10 gold' },
  { id: 'q_first_cull',    tier:1, name:'Culling Season',     desc:'Cull your first creature.',
    check:s=>s.totalCulled>=1,       progress:s=>`${Math.min(s.totalCulled,1)} / 1 culled`,          reward:{gold:15},  rewardText:'+15 gold' },
  { id: 'q_earn_25',       tier:1, name:'Pocket Change',      desc:'Accumulate 25 total gold earned.',
    check:s=>s.totalGoldEarned>=25,  progress:s=>`${Math.min(s.totalGoldEarned,25)} / 25 gold`,      reward:{gold:10},  rewardText:'+10 gold' },
  { id: 'q_trait_8',       tier:1, name:'Curious Specimen',   desc:'Breed a creature with any single trait ≥ 8.',
    check:s=>s.population.some(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits[t])))>=8),
    progress:s=>{const b=Math.max(0,...s.population.map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits[t])))));return`Best trait: ${b} / 8`;},
    reward:{gold:15}, rewardText:'+15 gold' },
  // Tier 2
  { id: 'q_pop_8',         tier:2, name:'Growing Population', desc:'Have 8 creatures alive simultaneously.',
    check:s=>s.population.length>=8, progress:s=>`${s.population.length} / 8 creatures`,            reward:{gold:25},  rewardText:'+25 gold' },
  { id: 'q_fitness_8',     tier:2, name:'Fitness Fanatic',    desc:'Breed a creature with fitness ≥ 8.',
    check:s=>s.highestFitness>=8,    progress:s=>`Best fitness: ${s.highestFitness} / 8`,            reward:{gold:20},  rewardText:'+20 gold' },
  { id: 'q_cull_5',        tier:2, name:'Cull the Herd',      desc:'Cull 5 creatures total.',
    check:s=>s.totalCulled>=5,       progress:s=>`${Math.min(s.totalCulled,5)} / 5 culled`,          reward:{gold:30},  rewardText:'+30 gold' },
  { id: 'q_first_upgrade', tier:2, name:'First Investment',   desc:'Purchase any upgrade.',
    check:s=>Object.values(s.upgrades).some(v=>v>0), progress:()=>'Buy any upgrade',                 reward:{gold:25},  rewardText:'+25 gold' },
  // Tier 3
  { id: 'q_fitness_12',    tier:3, name:'Strong Bloodline',   desc:'Breed a creature with fitness ≥ 12.',
    check:s=>s.highestFitness>=12,   progress:s=>`Best fitness: ${s.highestFitness} / 12`,           reward:{gold:50},  rewardText:'+50 gold' },
  { id: 'q_gen_100',       tier:3, name:'Century Mark',       desc:'Reach generation 100.',
    check:s=>s.generation>=100,      progress:s=>`Gen ${s.generation} / 100`,                        reward:{gold:75},  rewardText:'+75 gold' },
  { id: 'q_cull_20',       tier:3, name:'Population Control', desc:'Cull 20 creatures total.',
    check:s=>s.totalCulled>=20,      progress:s=>`${Math.min(s.totalCulled,20)} / 20 culled`,        reward:{gold:60},  rewardText:'+60 gold' },
  { id: 'q_gold_500',      tier:3, name:'Golden Age',         desc:'Hold 500 gold at once.',
    check:s=>s.gold>=500,            progress:s=>`${s.gold} / 500 gold`,                             reward:{gold:100}, rewardText:'+100 gold' },
  { id: 'q_pop_cap_1',     tier:3, name:'Room to Grow',       desc:'Unlock the first Expanded Habitat upgrade.',
    check:s=>safeNum(s.upgrades?.popCap)>=1, progress:s=>`Pop cap upgrades: ${safeNum(s.upgrades?.popCap)} / 1`,
    reward:{gold:50}, rewardText:'+50 gold' },
  // Tier 4
  { id: 'q_fitness_16',    tier:4, name:'Elite Lineage',      desc:'Breed a creature with fitness ≥ 16.',
    check:s=>s.highestFitness>=16,   progress:s=>`Best fitness: ${s.highestFitness} / 16`,           reward:{gold:100}, rewardText:'+100 gold' },
  { id: 'q_gen_500',       tier:4, name:'Grand Experiment',   desc:'Reach generation 500.',
    check:s=>s.generation>=500,      progress:s=>`Gen ${s.generation} / 500`,                        reward:{gold:150}, rewardText:'+150 gold' },
  { id: 'q_cull_50',       tier:4, name:'Ruthless',           desc:'Cull 50 creatures total.',
    check:s=>s.totalCulled>=50,      progress:s=>`${Math.min(s.totalCulled,50)} / 50 culled`,        reward:{gold:80},  rewardText:'+80 gold' },
  { id: 'q_gold_2000',     tier:4, name:'War Chest',          desc:'Hold 2000 gold at once.',
    check:s=>s.gold>=2000,           progress:s=>`${s.gold} / 2000 gold`,                            reward:{gold:200}, rewardText:'+200 gold' },
  // Tier 5
  { id: 'q_fitness_20',    tier:5, name:'Perfection',         desc:'Achieve maximum fitness (20) in any creature.',
    check:s=>s.highestFitness>=20,   progress:s=>`Best fitness: ${s.highestFitness} / 20`,           reward:{gold:500}, rewardText:'+500 gold' },
  { id: 'q_gen_1000',      tier:5, name:'Millennium',         desc:'Reach generation 1000.',
    check:s=>s.generation>=1000,     progress:s=>`Gen ${s.generation} / 1000`,                       reward:{gold:300}, rewardText:'+300 gold' },
  { id: 'q_pop_cap_max',   tier:5, name:'Teeming with Life',  desc:'Max out the Expanded Habitat upgrade.',
    check:s=>safeNum(s.upgrades?.popCap)>=5, progress:s=>`Pop cap level: ${safeNum(s.upgrades?.popCap)} / 5`,
    reward:{gold:500}, rewardText:'+500 gold' },
];

// ── Achievement map ──────────────────────────────────────────
const ACH_MAP = [
  { label: 'BREEDING', nodes: [
    { id:'a_genesis',  name:'Genesis',          desc:'Start a new lineage',       check:()=>true },
    { id:'a_bred_1',   name:'Life Finds a Way', desc:'Breed for the first time',  check:s=>s.totalBred>=1 },
    { id:'a_bred_10',  name:'Veteran',          desc:'Breed 10 times',            check:s=>s.totalBred>=10 },
    { id:'a_bred_50',  name:'Master Breeder',   desc:'Breed 50 times',            check:s=>s.totalBred>=50 },
    { id:'a_bred_200', name:'Prolific',          desc:'Breed 200 times',           check:s=>s.totalBred>=200 },
    { id:'a_bred_500', name:'Tireless',          desc:'Breed 500 times',           check:s=>s.totalBred>=500 },
  ]},
  { label: 'CULLING', nodes: [
    { id:'a_cull_1',   name:'Red in Tooth',     desc:'Cull your first creature',  check:s=>s.totalCulled>=1 },
    { id:'a_cull_10',  name:'Selective',         desc:'Cull 10 creatures',         check:s=>s.totalCulled>=10 },
    { id:'a_cull_50',  name:'Ruthless',          desc:'Cull 50 creatures',         check:s=>s.totalCulled>=50 },
    { id:'a_cull_150', name:'Purifier',          desc:'Cull 150 creatures',        check:s=>s.totalCulled>=150 },
  ]},
  { label: 'WEALTH', nodes: [
    { id:'a_gold_50',   name:'Prospector',  desc:'Earn 50 total gold',    check:s=>s.totalGoldEarned>=50 },
    { id:'a_gold_250',  name:'Goldsmith',   desc:'Earn 250 total gold',   check:s=>s.totalGoldEarned>=250 },
    { id:'a_gold_1000', name:'Magnate',     desc:'Earn 1000 total gold',  check:s=>s.totalGoldEarned>=1000 },
    { id:'a_gold_5000', name:'Industrialist',desc:'Earn 5000 total gold', check:s=>s.totalGoldEarned>=5000 },
  ]},
  { label: 'FITNESS', nodes: [
    { id:'a_fit_8',  name:'Promising Line', desc:'Reach fitness 8',          check:s=>s.highestFitness>=8 },
    { id:'a_fit_12', name:'Strong Line',    desc:'Reach fitness 12',         check:s=>s.highestFitness>=12 },
    { id:'a_fit_16', name:'Champion Line',  desc:'Reach fitness 16',         check:s=>s.highestFitness>=16 },
    { id:'a_fit_20', name:'Perfect',        desc:'Reach max fitness (20)',   check:s=>s.highestFitness>=20 },
  ]},
  { label: 'POPULATION', nodes: [
    { id:'a_pop_10',  name:'Colony',       desc:'Have 10 creatures alive',  check:s=>s.population.length>=10 },
    { id:'a_pop_30',  name:'Sprawl',       desc:'Have 30 creatures alive',  check:s=>s.population.length>=30 },
    { id:'a_pop_60',  name:'Dominion',     desc:'Have 60 creatures alive',  check:s=>s.population.length>=60 },
    { id:'a_pop_100', name:'Overwhelming', desc:'Have 100 creatures alive', check:s=>s.population.length>=100 },
  ]},
  { label: 'GENERATIONS', nodes: [
    { id:'a_gen_50',   name:'Half Century', desc:'Reach generation 50',    check:s=>s.generation>=50 },
    { id:'a_gen_100',  name:'Century',      desc:'Reach generation 100',   check:s=>s.generation>=100 },
    { id:'a_gen_500',  name:'Epoch',        desc:'Reach generation 500',   check:s=>s.generation>=500 },
    { id:'a_gen_1000', name:'Millennium',   desc:'Reach generation 1000',  check:s=>s.generation>=1000 },
  ]},
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
// All-time best trait values — used by Lineage Memory upgrade
let bestEverTraits      = {};

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
    upgrades: {
      popCap: 0, mutation: 0, traitAmp: 0, breedYield: 0,
      cullValue: 0, genePool: 0, selective: 0,
      cullInsight: 0, lineageMem: 0,
    },
  };
}

// ── Derived values from upgrades ────────────────────────────
function getMaxPop()    { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)] ?? 20; }
function getBreedGold() {
  const table = [1, 3, 6, 12, 25, 50];
  return table[safeNum(state.upgrades?.breedYield)] ?? 1;
}
function getCullBonus() {
  const table = [0, 3, 7, 15, 30, 60];
  return table[safeNum(state.upgrades?.cullValue)] ?? 0;
}
function getMutationRate() {
  const table = [0.15, 0.25, 0.40, 0.60, 1.0];
  return table[safeNum(state.upgrades?.mutation)] ?? 0.15;
}
function getCullCount() {
  const table = [1, 2, 3, 5];
  return table[safeNum(state.upgrades?.cullInsight)] ?? 1;
}

// ═══════════════════════════════════════════════════════════
//  SAFE HELPERS
// ═══════════════════════════════════════════════════════════

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
      intelligence: safeNum(traits.intelligence,  rand(1,8)),
      resilience:   safeNum(traits.resilience,    rand(1,8)),
    },
  };
}

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
      popCap:      safeNum(s.upgrades?.popCap),
      mutation:    safeNum(s.upgrades?.mutation),
      traitAmp:    safeNum(s.upgrades?.traitAmp),
      breedYield:  safeNum(s.upgrades?.breedYield),
      cullValue:   safeNum(s.upgrades?.cullValue),
      genePool:    safeNum(s.upgrades?.genePool),
      selective:   safeNum(s.upgrades?.selective),
      cullInsight: safeNum(s.upgrades?.cullInsight),
      lineageMem:  safeNum(s.upgrades?.lineageMem),
    },
    population: (s.population || []).map(migrateCrature).filter(Boolean),
  };
}

function rebuildBestEverTraits() {
  bestEverTraits = {};
  TRAIT_KEYS.forEach(t => { bestEverTraits[t] = 1; });
  state.population.forEach(c => {
    TRAIT_KEYS.forEach(t => {
      const v = safeNum(c.traits[t]);
      if (v > (bestEverTraits[t] || 0)) bestEverTraits[t] = v;
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════════════════════

window.getSaveData = () => sanitiseState(state);

window.applySaveData = (data) => {
  state = sanitiseState({ ...defaultState(), ...data });
  if (!state.unlockedAchievements.includes('a_genesis')) {
    state.unlockedAchievements.push('a_genesis');
  }
  selectedForBreeding = [];
  rebuildBestEverTraits();
  renderAll();
};

window.initNewGame = () => {
  state = defaultState();
  state.population = Array.from({ length: 5 }, () => makeCreature());
  rebuildBestEverTraits();
  renderAll();
};

// ═══════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════

window.calcScore = () => Math.floor(
  safeNum(state.highestFitness)  * 200 +
  safeNum(state.generation)      *  10 +
  safeNum(state.totalBred)       *   3 +
  safeNum(state.totalCulled)     *   5 +
  safeNum(state.totalGoldEarned) *   1
);

// ═══════════════════════════════════════════════════════════
//  CREATURE HELPERS
// ═══════════════════════════════════════════════════════════

function calcFitness(c) {
  const sum = TRAIT_KEYS.reduce((s, t) => s + safeNum(c.traits[t]), 0);
  return Math.round(sum / TRAIT_KEYS.length);
}

function starterRange() {
  const lvl = safeNum(state.upgrades?.genePool);
  const ranges = [[1,8],[1,10],[3,12],[5,14]];
  return ranges[lvl] || [1,8];
}

function inherit(a, b, traitKey) {
  const va = safeNum(a, 4);
  const vb = safeNum(b, 4);

  // Lineage Memory: chance to recall best-ever value for this trait
  const memLvl   = safeNum(state.upgrades?.lineageMem);
  const memRates = [0, 0.05, 0.12, 0.25];
  const memRate  = memRates[memLvl] || 0;
  if (memRate > 0 && Math.random() < memRate) {
    const best = safeNum(bestEverTraits[traitKey], Math.max(va, vb));
    return Math.max(1, Math.min(20, best));
  }

  // Trait Amplifier: chance to take max of parents
  const ampLvl   = safeNum(state.upgrades?.traitAmp);
  const ampRates = [0, 0.15, 0.30, 0.55, 1.0];
  const ampRate  = ampRates[ampLvl] || 0;
  const base     = (ampRate > 0 && Math.random() < ampRate)
    ? Math.max(va, vb)
    : (Math.random() < 0.5 ? va : vb);

  // Mutation
  const mutRate        = getMutationRate();
  const alwaysPositive = safeNum(state.upgrades?.mutation) >= 4;
  const doubleMut      = safeNum(state.upgrades?.mutation) >= 5;

  let val = base;
  const applyMut = () => {
    if (Math.random() < mutRate) {
      const dir = alwaysPositive ? 1 : (Math.random() < 0.5 ? 1 : -1);
      val = Math.max(1, Math.min(20, val + dir));
    }
  };
  applyMut();
  if (doubleMut) applyMut();
  return val;
}

function makeCreature(parentA = null, parentB = null) {
  const traits = {};
  if (parentA) {
    TRAIT_KEYS.forEach(t => { traits[t] = inherit(parentA.traits[t], parentB.traits[t], t); });
  } else {
    const [min, max] = starterRange();
    TRAIT_KEYS.forEach(t => { traits[t] = rand(min, max); });
  }
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
  if (state.population.length < 2)       return addLog('Not enough creatures to breed.', 'warn');
  if (state.population.length >= getMaxPop()) return addLog(`Population cap (${getMaxPop()}) reached — cull or upgrade Expanded Habitat.`, 'warn');
  const [pA, pB] = [...state.population].sort(() => Math.random() - 0.5);
  _doBreed(pA, pB);
};

window.breedSelected = () => {
  if (!safeNum(state.upgrades?.selective))  return addLog('Selective Breeding upgrade required.', 'warn');
  if (selectedForBreeding.length !== 2)     return addLog('Select exactly 2 creatures to breed.', 'warn');
  if (state.population.length >= getMaxPop()) return addLog(`Population cap (${getMaxPop()}) reached.`, 'warn');
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
  const earned = getBreedGold();
  state.gold            += earned;
  state.totalGoldEarned += earned;

  // Update best-ever trait values
  TRAIT_KEYS.forEach(t => {
    const v = safeNum(child.traits[t]);
    if (v > (bestEverTraits[t] || 0)) bestEverTraits[t] = v;
  });

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
  const cullCount = getCullCount();
  const minPop    = 2;
  if (state.population.length <= minPop) return addLog(`Population too small to cull (min ${minPop}).`, 'warn');

  state.population.forEach(c => { c._f = calcFitness(c); });
  state.population.sort((a, b) => a._f - b._f);

  const actualCull = Math.min(cullCount, state.population.length - minPop);
  let totalEarned = 0;
  const culledNames = [];

  for (let i = 0; i < actualCull; i++) {
    const culled  = state.population.shift();
    const earned  = Math.max(1, 2 + Math.floor(safeNum(culled._f) / 2) + getCullBonus());
    state.gold            += earned;
    state.totalGoldEarned += earned;
    totalEarned += earned;
    state.totalCulled++;
    culledNames.push(`${culled.id}(${culled._f})`);
  }

  if (actualCull === 1) {
    addLog(`Culled ${culledNames[0]} — earned ${totalEarned} gold.`, 'warn');
  } else {
    addLog(`Culled ${actualCull} creatures [${culledNames.join(', ')}] — earned ${totalEarned} gold.`, 'warn');
  }

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
  if (state.gold < cost) return addLog(`Need ${cost} gold — you have ${state.gold}.`, 'warn');
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
      if (q.reward?.gold) { state.gold += q.reward.gold; state.totalGoldEarned += q.reward.gold; }
      addLog(`✓ Quest complete: "${q.name}" — ${q.rewardText}`, 'highlight');
    }
  });
  // Also sweep all quests (in case a non-active one was just met)
  QUESTS_DEF.forEach(q => {
    if (!state.completedQuests.includes(q.id) && q.check(state)) {
      state.completedQuests.push(q.id);
      if (q.reward?.gold) { state.gold += q.reward.gold; state.totalGoldEarned += q.reward.gold; }
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
}

function renderStats() {
  const best = state.population.reduce((m, c) => { const f = calcFitness(c); return f > m ? f : m; }, 0);
  document.getElementById('stat-gen').textContent     = safeNum(state.generation, 1);
  document.getElementById('stat-pop').textContent     = `${state.population.length} / ${getMaxPop()}`;
  document.getElementById('stat-gold').textContent    = safeNum(state.gold);
  document.getElementById('stat-fitness').textContent = best || '—';
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
      div.innerHTML = `
        <div class="upgrade-name">${def.name} <span class="maxed">[MAX]</span></div>
        <div class="upgrade-desc">${def.desc}</div>`;
    } else {
      const next = def.levels[lvl];
      const affordable = state.gold >= next.cost;
      div.innerHTML = `
        <div class="upgrade-name">${def.name}${lvl > 0 ? ` <span class="level-badge">[Lv${lvl}]</span>` : ''}</div>
        <div class="upgrade-desc">${next.label}</div>
        <button onclick="buyUpgrade('${def.id}')" ${affordable ? '' : 'style="opacity:0.4;cursor:not-allowed"'}>
          [ BUY — ${next.cost}g ]
        </button>`;
    }
    container.appendChild(div);
  });
}

function renderPopulation() {
  const container   = document.getElementById('population-table');
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

// ── Leaderboard (called by auth.js) ─────────────────────────
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

// ── Username modal ────────────────────────────────────────────
window.openUsernameModal = () => {
  document.getElementById('username-modal').classList.remove('hidden');
  const input = document.getElementById('username-input');
  if (window._currentUsername) input.value = window._currentUsername;
  document.getElementById('username-message').textContent = '';
};

window.skipUsername = () => {
  document.getElementById('username-modal').classList.add('hidden');
};

// ── Tab switching ─────────────────────────────────────────────
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
  return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

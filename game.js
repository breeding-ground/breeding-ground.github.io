'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const TRAIT_KEYS  = ['speed', 'strength', 'stamina', 'intelligence', 'resilience'];
const TRAIT_ABR   = ['SPD',   'STR',      'STA',     'INT',          'RES'];
const TRAIT_MAX   = 50;
const POP_CAP_TABLE = [20, 25, 30, 40, 60, 100];

// ── Gold upgrades ────────────────────────────────────────────
const GOLD_UPGRADES = [
  {
    id: 'popCap', name: 'Expanded Habitat',
    desc: 'Raise the population cap — more creatures, more possibilities.',
    levels: [
      { cost: 60,   label: 'Lv 1 — cap 20 → 25' },
      { cost: 200,  label: 'Lv 2 — cap 25 → 30' },
      { cost: 600,  label: 'Lv 3 — cap 30 → 40' },
      { cost: 2000, label: 'Lv 4 — cap 40 → 60' },
      { cost: 7000, label: 'Lv 5 — cap 60 → 100' },
    ],
  },
  {
    id: 'mutation', name: 'Mutation Boost',
    desc: 'Higher mutation rate and stronger positive mutations.',
    levels: [
      { cost: 25,   label: 'Lv 1 — mutation chance 15% → 25%' },
      { cost: 75,   label: 'Lv 2 — 25% → 40%' },
      { cost: 200,  label: 'Lv 3 — 40% → 60%' },
      { cost: 600,  label: 'Lv 4 — always beneficial' },
      { cost: 2000, label: 'Lv 5 — two traits mutate per offspring' },
    ],
  },
  {
    id: 'traitAmp', name: 'Trait Amplifier',
    desc: "Offspring inherit the stronger parent's trait more often.",
    levels: [
      { cost: 50,   label: 'Lv 1 — 15% chance to take max of pair' },
      { cost: 160,  label: 'Lv 2 — 30% chance' },
      { cost: 450,  label: 'Lv 3 — 55% chance' },
      { cost: 1400, label: 'Lv 4 — always inherit stronger' },
    ],
  },
  {
    id: 'breedYield', name: 'Breeding Yield',
    desc: 'Earn more gold per offspring born.',
    levels: [
      { cost: 30,   label: 'Lv 1 — 3 gold per breed' },
      { cost: 90,   label: 'Lv 2 — 6 gold per breed' },
      { cost: 280,  label: 'Lv 3 — 12 gold per breed' },
      { cost: 800,  label: 'Lv 4 — 25 gold per breed' },
      { cost: 2500, label: 'Lv 5 — 50 gold per breed' },
    ],
  },
  {
    id: 'cullValue', name: "Butcher's Eye",
    desc: 'Extract more gold when culling specimens.',
    levels: [
      { cost: 20,   label: 'Lv 1 — +3 gold per cull' },
      { cost: 55,   label: 'Lv 2 — +7 gold per cull' },
      { cost: 150,  label: 'Lv 3 — +15 gold per cull' },
      { cost: 450,  label: 'Lv 4 — +30 gold per cull' },
      { cost: 1500, label: 'Lv 5 — +60 gold per cull' },
    ],
  },
  {
    id: 'genePool', name: 'Prime Stock',
    desc: 'Starter creatures spawn with higher base traits.',
    levels: [
      { cost: 40,  label: 'Lv 1 — starters roll up to 12' },
      { cost: 120, label: 'Lv 2 — starters roll 4–16' },
      { cost: 350, label: 'Lv 3 — starters roll 8–20' },
    ],
  },
  {
    id: 'selective', name: 'Selective Breeding',
    desc: 'Hand-pick your own breeding pairs in the Population tab.',
    levels: [
      { cost: 40, label: 'One-time — unlocks BREED SELECTED' },
    ],
  },
  {
    id: 'cullInsight', name: 'Culling Insight',
    desc: 'Cull multiple weak creatures in a single action.',
    levels: [
      { cost: 100,  label: 'Lv 1 — cull bottom 2 at once' },
      { cost: 350,  label: 'Lv 2 — cull bottom 3 at once' },
      { cost: 1200, label: 'Lv 3 — cull bottom 5 at once' },
    ],
  },
  {
    id: 'lineageMem', name: 'Lineage Memory',
    desc: 'Offspring can recall the best trait value ever seen in your lineage.',
    levels: [
      { cost: 150,  label: 'Lv 1 — 5% per trait' },
      { cost: 500,  label: 'Lv 2 — 12% per trait' },
      { cost: 1800, label: 'Lv 3 — 25% per trait' },
    ],
  },
];

// ── Diamond upgrades (permanent) ────────────────────────────
const DIAMOND_UPGRADES = [
  {
    id: 'traitCapBoost', name: 'Apex Refinement',
    desc: `Permanently raises the trait ceiling beyond ${TRAIT_MAX}, letting existing traits exceed the base cap.`,
    levels: [
      { cost: 10, label: `Lv 1 — trait cap ${TRAIT_MAX} → ${TRAIT_MAX + 5}` },
      { cost: 20, label: `Lv 2 — trait cap ${TRAIT_MAX + 5} → ${TRAIT_MAX + 10}` },
      { cost: 35, label: `Lv 3 — trait cap ${TRAIT_MAX + 10} → ${TRAIT_MAX + 20}` },
    ],
  },
  {
    id: 'eliteMutation', name: 'Elite Mutation',
    desc: 'Mutations of already-high traits become stronger, pushing past natural resistance.',
    levels: [
      { cost: 8,  label: 'Lv 1 — halves resistance penalty on traits ≥ 30' },
      { cost: 18, label: 'Lv 2 — removes resistance penalty entirely' },
    ],
  },
  {
    id: 'dynastyBlood', name: 'Dynasty Blood',
    desc: 'All new starter creatures inherit a fraction of your all-time best trait values.',
    levels: [
      { cost: 12, label: 'Lv 1 — starters get 25% of best-ever trait values' },
      { cost: 25, label: 'Lv 2 — starters get 50% of best-ever trait values' },
      { cost: 40, label: 'Lv 3 — starters get 75% of best-ever trait values' },
    ],
  },
];

// ── Diamond consumables (one-time use, no level) ─────────────
const DIAMOND_CONSUMABLES = [
  {
    id: 'geneBoost',
    name: 'Gene Boost',
    cost: 2,
    desc: "Injects +5 into your top creature's single weakest trait. Instant.",
    effect: 'Boost weakest trait of best creature by +5',
  },
  {
    id: 'perfectClone',
    name: 'Perfect Clone',
    cost: 5,
    desc: 'Creates an exact copy of your highest-fitness creature. Requires pop below cap.',
    effect: 'Duplicate your top creature',
  },
  {
    id: 'evolutionSurge',
    name: 'Evolution Surge',
    cost: 8,
    desc: 'Doubles the effective mutation rate for the next 25 breeds.',
    effect: '+25 surge breeds',
  },
  {
    id: 'legendaryStock',
    name: 'Legendary Stock',
    cost: 30,
    desc: "Culls your entire population and replaces it with 5 new starters that each inherit 90% of your lineage's best-ever trait values. Use carefully.",
    effect: 'Full population reset with legacy traits',
  },
];

// ── Quests ──────────────────────────────────────────────────
// reward: { gold, diamonds }  — diamonds only on T3+
const QUESTS_DEF = [
  // ── T1 ──────────────────────────────────────────────────────
  { id:'q_first_breed',   tier:1, name:'First Steps',
    desc:'Breed your first offspring.',
    check:s=>s.totalBred>=1,
    progress:s=>`${Math.min(s.totalBred,1)} / 1 bred`,
    reward:{gold:10}, rewardText:'+10 gold' },

  { id:'q_first_cull',    tier:1, name:'Culling Season',
    desc:'Cull your first creature.',
    check:s=>s.totalCulled>=1,
    progress:s=>`${Math.min(s.totalCulled,1)} / 1 culled`,
    reward:{gold:15}, rewardText:'+15 gold' },

  { id:'q_earn_25',       tier:1, name:'Pocket Change',
    desc:'Accumulate 25 total gold earned.',
    check:s=>s.totalGoldEarned>=25,
    progress:s=>`${Math.min(s.totalGoldEarned,25)} / 25 gold`,
    reward:{gold:10}, rewardText:'+10 gold' },

  { id:'q_trait_10',      tier:1, name:'Promising Stock',
    desc:'Breed a creature with any single trait ≥ 10.',
    check:s=>s.population.some(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits[t])))>=10),
    progress:s=>{const b=bestSingleTrait(s);return`Best trait: ${b} / 10`;},
    reward:{gold:15}, rewardText:'+15 gold' },

  // ── T2 ──────────────────────────────────────────────────────
  { id:'q_pop_8',         tier:2, name:'Growing Population',
    desc:'Have 8 creatures alive simultaneously.',
    check:s=>s.population.length>=8,
    progress:s=>`${s.population.length} / 8`,
    reward:{gold:25}, rewardText:'+25 gold' },

  { id:'q_fitness_10',    tier:2, name:'Fitness Fanatic',
    desc:'Breed a creature with fitness ≥ 10.',
    check:s=>s.highestFitness>=10,
    progress:s=>`Best fitness: ${s.highestFitness} / 10`,
    reward:{gold:20}, rewardText:'+20 gold' },

  { id:'q_cull_5',        tier:2, name:'Cull the Herd',
    desc:'Cull 5 creatures total.',
    check:s=>s.totalCulled>=5,
    progress:s=>`${Math.min(s.totalCulled,5)} / 5`,
    reward:{gold:30}, rewardText:'+30 gold' },

  { id:'q_first_upgrade', tier:2, name:'First Investment',
    desc:'Purchase any upgrade.',
    check:s=>Object.values(s.upgrades).some(v=>v>0),
    progress:()=>'Buy any upgrade',
    reward:{gold:25}, rewardText:'+25 gold' },

  // ── T3 ── first diamonds ──────────────────────────────────
  { id:'q_fitness_15',    tier:3, name:'Strong Bloodline',
    desc:'Breed a creature with fitness ≥ 15.',
    check:s=>s.highestFitness>=15,
    progress:s=>`Best fitness: ${s.highestFitness} / 15`,
    reward:{gold:50, diamonds:1}, rewardText:'+50 gold, 1 💎' },

  { id:'q_trait_20',      tier:3, name:'Perfect Gene',
    desc:'Get any single trait to 20.',
    check:s=>bestSingleTrait(s)>=20,
    progress:s=>`Best trait: ${bestSingleTrait(s)} / 20`,
    reward:{gold:60, diamonds:1}, rewardText:'+60 gold, 1 💎' },

  { id:'q_gen_100',       tier:3, name:'Century Mark',
    desc:'Reach generation 100.',
    check:s=>s.generation>=100,
    progress:s=>`Gen ${s.generation} / 100`,
    reward:{gold:75, diamonds:1}, rewardText:'+75 gold, 1 💎' },

  { id:'q_cull_20',       tier:3, name:'Population Control',
    desc:'Cull 20 creatures total.',
    check:s=>s.totalCulled>=20,
    progress:s=>`${Math.min(s.totalCulled,20)} / 20`,
    reward:{gold:60, diamonds:1}, rewardText:'+60 gold, 1 💎' },

  { id:'q_gold_500',      tier:3, name:'Golden Age',
    desc:'Hold 500 gold at once.',
    check:s=>s.gold>=500,
    progress:s=>`${s.gold} / 500`,
    reward:{gold:100, diamonds:1}, rewardText:'+100 gold, 1 💎' },

  // ── T4 ──────────────────────────────────────────────────────
  { id:'q_fitness_20',    tier:4, name:'Elite Lineage',
    desc:'Breed a creature with fitness ≥ 20.',
    check:s=>s.highestFitness>=20,
    progress:s=>`Best fitness: ${s.highestFitness} / 20`,
    reward:{gold:100, diamonds:2}, rewardText:'+100 gold, 2 💎' },

  { id:'q_gen_500',       tier:4, name:'Grand Experiment',
    desc:'Reach generation 500.',
    check:s=>s.generation>=500,
    progress:s=>`Gen ${s.generation} / 500`,
    reward:{gold:150, diamonds:2}, rewardText:'+150 gold, 2 💎' },

  { id:'q_cull_50',       tier:4, name:'Ruthless',
    desc:'Cull 50 creatures total.',
    check:s=>s.totalCulled>=50,
    progress:s=>`${Math.min(s.totalCulled,50)} / 50`,
    reward:{gold:80, diamonds:2}, rewardText:'+80 gold, 2 💎' },

  { id:'q_gold_2000',     tier:4, name:'War Chest',
    desc:'Hold 2000 gold at once.',
    check:s=>s.gold>=2000,
    progress:s=>`${s.gold} / 2000`,
    reward:{gold:200, diamonds:2}, rewardText:'+200 gold, 2 💎' },

  { id:'q_bred_200',      tier:4, name:'Tireless',
    desc:'Breed 200 times total.',
    check:s=>s.totalBred>=200,
    progress:s=>`${Math.min(s.totalBred,200)} / 200`,
    reward:{gold:120, diamonds:2}, rewardText:'+120 gold, 2 💎' },

  // ── T5 ──────────────────────────────────────────────────────
  { id:'q_fitness_30',    tier:5, name:'Apex Lineage',
    desc:'Breed a creature with fitness ≥ 30.',
    check:s=>s.highestFitness>=30,
    progress:s=>`Best fitness: ${s.highestFitness} / 30`,
    reward:{gold:300, diamonds:3}, rewardText:'+300 gold, 3 💎' },

  { id:'q_trait_35',      tier:5, name:'Beyond Normal',
    desc:'Get any single trait to 35.',
    check:s=>bestSingleTrait(s)>=35,
    progress:s=>`Best trait: ${bestSingleTrait(s)} / 35`,
    reward:{gold:250, diamonds:3}, rewardText:'+250 gold, 3 💎' },

  { id:'q_gen_1000',      tier:5, name:'Millennium',
    desc:'Reach generation 1000.',
    check:s=>s.generation>=1000,
    progress:s=>`Gen ${s.generation} / 1000`,
    reward:{gold:300, diamonds:3}, rewardText:'+300 gold, 3 💎' },

  { id:'q_cull_150',      tier:5, name:'Purifier',
    desc:'Cull 150 creatures total.',
    check:s=>s.totalCulled>=150,
    progress:s=>`${Math.min(s.totalCulled,150)} / 150`,
    reward:{gold:200, diamonds:3}, rewardText:'+200 gold, 3 💎' },

  { id:'q_pop_cap_max',   tier:5, name:'Teeming with Life',
    desc:'Max out the Expanded Habitat upgrade.',
    check:s=>safeNum(s.upgrades?.popCap)>=5,
    progress:s=>`Pop cap level: ${safeNum(s.upgrades?.popCap)} / 5`,
    reward:{gold:400, diamonds:3}, rewardText:'+400 gold, 3 💎' },

  // ── T6 ──────────────────────────────────────────────────────
  { id:'q_fitness_40',    tier:6, name:'Transcendent',
    desc:'Breed a creature with fitness ≥ 40.',
    check:s=>s.highestFitness>=40,
    progress:s=>`Best fitness: ${s.highestFitness} / 40`,
    reward:{gold:500, diamonds:5}, rewardText:'+500 gold, 5 💎' },

  { id:'q_trait_50',      tier:6, name:'Theoretical Limit',
    desc:'Push any trait to the base maximum (50).',
    check:s=>bestSingleTrait(s)>=50,
    progress:s=>`Best trait: ${bestSingleTrait(s)} / 50`,
    reward:{gold:500, diamonds:5}, rewardText:'+500 gold, 5 💎' },

  { id:'q_gen_5000',      tier:6, name:'The Long Game',
    desc:'Reach generation 5000.',
    check:s=>s.generation>=5000,
    progress:s=>`Gen ${s.generation} / 5000`,
    reward:{gold:600, diamonds:5}, rewardText:'+600 gold, 5 💎' },

  { id:'q_cull_500',      tier:6, name:'Extinction Event',
    desc:'Cull 500 creatures total.',
    check:s=>s.totalCulled>=500,
    progress:s=>`${Math.min(s.totalCulled,500)} / 500`,
    reward:{gold:400, diamonds:5}, rewardText:'+400 gold, 5 💎' },

  { id:'q_bred_1000',     tier:6, name:'The Factory',
    desc:'Breed 1000 times total.',
    check:s=>s.totalBred>=1000,
    progress:s=>`${Math.min(s.totalBred,1000)} / 1000`,
    reward:{gold:400, diamonds:5}, rewardText:'+400 gold, 5 💎' },

  // ── T7 — endgame ─────────────────────────────────────────────
  { id:'q_fitness_50',    tier:7, name:'God Complex',
    desc:'Breed a creature with fitness ≥ 50.',
    check:s=>s.highestFitness>=50,
    progress:s=>`Best fitness: ${s.highestFitness} / 50`,
    reward:{gold:1000, diamonds:10}, rewardText:'+1000 gold, 10 💎' },

  { id:'q_gen_10000',     tier:7, name:'Eternal Lineage',
    desc:'Reach generation 10,000.',
    check:s=>s.generation>=10000,
    progress:s=>`Gen ${s.generation} / 10,000`,
    reward:{gold:1000, diamonds:10}, rewardText:'+1000 gold, 10 💎' },

  { id:'q_gold_10000',    tier:7, name:'Infinite Wealth',
    desc:'Hold 10,000 gold at once.',
    check:s=>s.gold>=10000,
    progress:s=>`${s.gold} / 10,000`,
    reward:{gold:500, diamonds:8}, rewardText:'+500 gold, 8 💎' },
];

// ── Achievement map ──────────────────────────────────────────
const ACH_MAP = [
  { label:'BREEDING', nodes:[
    { id:'a_genesis',   name:'Genesis',          desc:'Start a new lineage',       check:()=>true },
    { id:'a_bred_1',    name:'Life Finds a Way',  desc:'Breed for the first time',  check:s=>s.totalBred>=1 },
    { id:'a_bred_10',   name:'Veteran',           desc:'Breed 10 times',            check:s=>s.totalBred>=10 },
    { id:'a_bred_50',   name:'Master Breeder',    desc:'Breed 50 times',            check:s=>s.totalBred>=50 },
    { id:'a_bred_200',  name:'Prolific',           desc:'Breed 200 times',           check:s=>s.totalBred>=200 },
    { id:'a_bred_1000', name:'Tireless',           desc:'Breed 1000 times',          check:s=>s.totalBred>=1000 },
  ]},
  { label:'CULLING', nodes:[
    { id:'a_cull_1',   name:'Red in Tooth',  desc:'Cull your first creature',  check:s=>s.totalCulled>=1 },
    { id:'a_cull_10',  name:'Selective',      desc:'Cull 10 creatures',         check:s=>s.totalCulled>=10 },
    { id:'a_cull_50',  name:'Ruthless',       desc:'Cull 50 creatures',         check:s=>s.totalCulled>=50 },
    { id:'a_cull_150', name:'Purifier',       desc:'Cull 150 creatures',        check:s=>s.totalCulled>=150 },
    { id:'a_cull_500', name:'Extinction',     desc:'Cull 500 creatures',        check:s=>s.totalCulled>=500 },
  ]},
  { label:'WEALTH', nodes:[
    { id:'a_gold_50',    name:'Prospector',     desc:'Earn 50 gold total',     check:s=>s.totalGoldEarned>=50 },
    { id:'a_gold_250',   name:'Goldsmith',      desc:'Earn 250 gold total',    check:s=>s.totalGoldEarned>=250 },
    { id:'a_gold_1000',  name:'Magnate',        desc:'Earn 1000 gold total',   check:s=>s.totalGoldEarned>=1000 },
    { id:'a_gold_5000',  name:'Industrialist',  desc:'Earn 5000 gold total',   check:s=>s.totalGoldEarned>=5000 },
    { id:'a_gold_20000', name:'Tycoon',         desc:'Earn 20000 gold total',  check:s=>s.totalGoldEarned>=20000 },
  ]},
  { label:'FITNESS', nodes:[
    { id:'a_fit_10', name:'Promising',   desc:'Reach fitness 10',  check:s=>s.highestFitness>=10 },
    { id:'a_fit_20', name:'Strong',      desc:'Reach fitness 20',  check:s=>s.highestFitness>=20 },
    { id:'a_fit_30', name:'Champion',    desc:'Reach fitness 30',  check:s=>s.highestFitness>=30 },
    { id:'a_fit_40', name:'Apex',        desc:'Reach fitness 40',  check:s=>s.highestFitness>=40 },
    { id:'a_fit_50', name:'Transcendent',desc:'Reach fitness 50',  check:s=>s.highestFitness>=50 },
  ]},
  { label:'DIAMONDS', nodes:[
    { id:'a_dia_1',  name:'First Jewel',   desc:'Earn your first diamond',       check:s=>s.totalDiamondsEarned>=1 },
    { id:'a_dia_10', name:'Gem Collector', desc:'Earn 10 diamonds total',        check:s=>s.totalDiamondsEarned>=10 },
    { id:'a_dia_30', name:'Jeweller',      desc:'Earn 30 diamonds total',        check:s=>s.totalDiamondsEarned>=30 },
    { id:'a_dia_75', name:'Hoarder',       desc:'Earn 75 diamonds total',        check:s=>s.totalDiamondsEarned>=75 },
  ]},
  { label:'GENERATIONS', nodes:[
    { id:'a_gen_50',    name:'Half Century', desc:'Gen 50',     check:s=>s.generation>=50 },
    { id:'a_gen_100',   name:'Century',      desc:'Gen 100',    check:s=>s.generation>=100 },
    { id:'a_gen_500',   name:'Epoch',        desc:'Gen 500',    check:s=>s.generation>=500 },
    { id:'a_gen_1000',  name:'Millennium',   desc:'Gen 1000',   check:s=>s.generation>=1000 },
    { id:'a_gen_5000',  name:'The Long Game',desc:'Gen 5000',   check:s=>s.generation>=5000 },
    { id:'a_gen_10000', name:'Eternal',      desc:'Gen 10,000', check:s=>s.generation>=10000 },
  ]},
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
let bestEverTraits      = {};

function defaultState() {
  return {
    generation:            1,
    population:            [],
    gold:                  0,
    diamonds:              0,
    totalBred:             0,
    totalCulled:           0,
    totalGoldEarned:       0,
    totalDiamondsEarned:   0,
    highestFitness:        0,
    completedQuests:       [],
    diamondQuestsRewarded: [],  // tracks which quests already gave diamonds (retroactive safety)
    unlockedAchievements:  ['a_genesis'],
    surgeBreedsRemaining:  0,   // Evolution Surge consumable
    upgrades: {
      popCap:0, mutation:0, traitAmp:0, breedYield:0,
      cullValue:0, genePool:0, selective:0, cullInsight:0, lineageMem:0,
      // diamond upgrades
      traitCapBoost:0, eliteMutation:0, dynastyBlood:0,
    },
  };
}

// ── Derived helpers ──────────────────────────────────────────
function getMaxPop()    { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)] ?? 20; }
function getBreedGold() { return [1,3,6,12,25,50][safeNum(state.upgrades?.breedYield)] ?? 1; }
function getCullBonus() { return [0,3,7,15,30,60][safeNum(state.upgrades?.cullValue)] ?? 0; }
function getCullCount() { return [1,2,3,5][safeNum(state.upgrades?.cullInsight)] ?? 1; }
function getMutRate()   { return [0.15,0.25,0.40,0.60,1.0][safeNum(state.upgrades?.mutation)] ?? 0.15; }
function getAmpRate()   { return [0,0.15,0.30,0.55,1.0][safeNum(state.upgrades?.traitAmp)] ?? 0; }
function getMemRate()   { return [0,0.05,0.12,0.25][safeNum(state.upgrades?.lineageMem)] ?? 0; }
function getTraitCap()  { return TRAIT_MAX + [0,5,10,20][safeNum(state.upgrades?.traitCapBoost)] ?? 0; }

// ── Safe helpers ─────────────────────────────────────────────
function safeNum(v, fallback = 0) { const n = Number(v); return isFinite(n) ? n : fallback; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function bestSingleTrait(s) {
  return Math.max(0, ...s.population.map(c => Math.max(...TRAIT_KEYS.map(t => safeNum(c.traits[t])))));
}

function migrateCrature(c) {
  if (!c || typeof c !== 'object') return null;
  const t = c.traits || {};
  return {
    id:         c.id || Math.random().toString(36).slice(2,8).toUpperCase(),
    generation: safeNum(c.generation, 1),
    traits: {
      speed:        safeNum(t.speed,        rand(1,8)),
      strength:     safeNum(t.strength,     rand(1,8)),
      stamina:      safeNum(t.stamina,       rand(1,8)),
      intelligence: safeNum(t.intelligence,  rand(1,8)),
      resilience:   safeNum(t.resilience,    rand(1,8)),
    },
  };
}

function sanitiseState(s) {
  return {
    ...s,
    generation:            safeNum(s.generation, 1),
    gold:                  safeNum(s.gold),
    diamonds:              safeNum(s.diamonds),
    totalBred:             safeNum(s.totalBred),
    totalCulled:           safeNum(s.totalCulled),
    totalGoldEarned:       safeNum(s.totalGoldEarned),
    totalDiamondsEarned:   safeNum(s.totalDiamondsEarned),
    highestFitness:        safeNum(s.highestFitness),
    surgeBreedsRemaining:  safeNum(s.surgeBreedsRemaining),
    completedQuests:       Array.isArray(s.completedQuests)       ? s.completedQuests       : [],
    diamondQuestsRewarded: Array.isArray(s.diamondQuestsRewarded) ? s.diamondQuestsRewarded : [],
    unlockedAchievements:  Array.isArray(s.unlockedAchievements)  ? s.unlockedAchievements  : ['a_genesis'],
    upgrades: {
      popCap:        safeNum(s.upgrades?.popCap),
      mutation:      safeNum(s.upgrades?.mutation),
      traitAmp:      safeNum(s.upgrades?.traitAmp),
      breedYield:    safeNum(s.upgrades?.breedYield),
      cullValue:     safeNum(s.upgrades?.cullValue),
      genePool:      safeNum(s.upgrades?.genePool),
      selective:     safeNum(s.upgrades?.selective),
      cullInsight:   safeNum(s.upgrades?.cullInsight),
      lineageMem:    safeNum(s.upgrades?.lineageMem),
      traitCapBoost: safeNum(s.upgrades?.traitCapBoost),
      eliteMutation: safeNum(s.upgrades?.eliteMutation),
      dynastyBlood:  safeNum(s.upgrades?.dynastyBlood),
    },
    population: (s.population || []).map(migrateCrature).filter(Boolean),
  };
}

function rebuildBestEverTraits() {
  TRAIT_KEYS.forEach(t => { bestEverTraits[t] = 1; });
  state.population.forEach(c =>
    TRAIT_KEYS.forEach(t => {
      const v = safeNum(c.traits[t]);
      if (v > bestEverTraits[t]) bestEverTraits[t] = v;
    })
  );
}

// ── Retroactive diamond grants ───────────────────────────────
// For players who completed quests before diamonds existed,
// grant owed diamonds on load (only once per quest).
function grantRetroactiveDiamonds() {
  let earned = 0;
  state.completedQuests.forEach(qid => {
    if (state.diamondQuestsRewarded.includes(qid)) return;
    const q = QUESTS_DEF.find(x => x.id === qid);
    if (q?.reward?.diamonds) {
      state.diamonds              += q.reward.diamonds;
      state.totalDiamondsEarned   += q.reward.diamonds;
      state.diamondQuestsRewarded.push(qid);
      earned += q.reward.diamonds;
    }
  });
  if (earned > 0) {
    addLog(`💎 Retroactive diamond grant: +${earned} 💎 for previously completed quests.`, 'diamond');
  }
}

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════════════════════

window.getSaveData = () => sanitiseState(state);

window.applySaveData = (data) => {
  state = sanitiseState({ ...defaultState(), ...data });
  if (!state.unlockedAchievements.includes('a_genesis')) state.unlockedAchievements.push('a_genesis');
  selectedForBreeding = [];
  rebuildBestEverTraits();
  grantRetroactiveDiamonds();
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
  safeNum(state.highestFitness)      * 200 +
  safeNum(state.generation)          *  10 +
  safeNum(state.totalBred)           *   3 +
  safeNum(state.totalCulled)         *   5 +
  safeNum(state.totalGoldEarned)     *   1 +
  safeNum(state.totalDiamondsEarned) * 100
);

// ═══════════════════════════════════════════════════════════
//  FITNESS & CREATURE HELPERS
// ═══════════════════════════════════════════════════════════

function calcFitness(c) {
  return Math.round(TRAIT_KEYS.reduce((s,t) => s + safeNum(c.traits[t]), 0) / TRAIT_KEYS.length);
}

function starterRange() {
  const dynMin = () => {
    const lvl = safeNum(state.upgrades?.dynastyBlood);
    if (lvl === 0) return null;
    const pcts = [0, 0.25, 0.50, 0.75];
    return TRAIT_KEYS.reduce((obj, t) => {
      obj[t] = Math.round(safeNum(bestEverTraits[t], 1) * pcts[lvl]);
      return obj;
    }, {});
  };
  const legacy = dynMin();
  return [[1,8],[1,12],[4,16],[8,20]][safeNum(state.upgrades?.genePool)] || [1,8];
  // legacy is handled per-trait in makeCreature when parentA is null
}

function inheritVal(va, vb, traitKey) {
  va = safeNum(va, 4);
  vb = safeNum(vb, 4);
  const cap = getTraitCap();

  // Lineage Memory
  if (getMemRate() > 0 && Math.random() < getMemRate()) {
    return Math.max(1, Math.min(cap, safeNum(bestEverTraits[traitKey], Math.max(va, vb))));
  }

  // Trait Amplifier
  const base = (getAmpRate() > 0 && Math.random() < getAmpRate())
    ? Math.max(va, vb)
    : (Math.random() < 0.5 ? va : vb);

  // Mutation with resistance
  const mutRate        = getMutRate();
  const alwaysPositive = safeNum(state.upgrades?.mutation) >= 4;
  const doubleMut      = safeNum(state.upgrades?.mutation) >= 5;
  const eliteLvl       = safeNum(state.upgrades?.eliteMutation);

  let val = base;
  const applyMut = () => {
    let resistance = base / cap;
    if (eliteLvl === 1 && base >= 30) resistance *= 0.5;
    if (eliteLvl >= 2)                resistance = 0;

    // Also surge bonus
    const effective = mutRate * (1 - resistance * 0.7);
    if (Math.random() < effective || safeNum(state.surgeBreedsRemaining) > 0 && Math.random() < Math.min(1, effective * 2)) {
      const dir = alwaysPositive ? 1 : (Math.random() < 0.5 ? 1 : -1);
      val = Math.max(1, Math.min(cap, val + dir));
    }
  };
  applyMut();
  if (doubleMut) applyMut();
  return val;
}

function makeCreature(parentA = null, parentB = null) {
  const traits = {};
  const cap    = getTraitCap();

  if (parentA) {
    TRAIT_KEYS.forEach(t => { traits[t] = inheritVal(parentA.traits[t], parentB.traits[t], t); });
  } else {
    const [min, max] = [[1,8],[1,12],[4,16],[8,20]][safeNum(state.upgrades?.genePool)] || [1,8];
    const legacyLvl  = safeNum(state.upgrades?.dynastyBlood);
    const legacyPct  = [0, 0.25, 0.50, 0.75][legacyLvl] || 0;
    TRAIT_KEYS.forEach(t => {
      const rolled  = rand(min, max);
      const legacy  = legacyPct > 0 ? Math.round(safeNum(bestEverTraits[t], 1) * legacyPct) : 0;
      traits[t] = Math.max(rolled, legacy);
    });
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
  if (state.population.length < 2)            return addLog('Not enough creatures to breed.', 'warn');
  if (state.population.length >= getMaxPop()) return addLog(`Population cap (${getMaxPop()}) reached — cull or upgrade Expanded Habitat.`, 'warn');
  const [pA, pB] = [...state.population].sort(() => Math.random() - 0.5);
  _doBreed(pA, pB);
};

window.breedSelected = () => {
  if (!safeNum(state.upgrades?.selective))     return addLog('Selective Breeding upgrade required.', 'warn');
  if (selectedForBreeding.length !== 2)        return addLog('Select exactly 2 creatures to breed.', 'warn');
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
  if (safeNum(state.surgeBreedsRemaining) > 0) state.surgeBreedsRemaining--;

  TRAIT_KEYS.forEach(t => {
    const v = safeNum(child.traits[t]);
    if (v > (bestEverTraits[t] || 0)) bestEverTraits[t] = v;
  });

  const traitStr = TRAIT_ABR.map((a,i) => `${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
  if (fitness > safeNum(state.highestFitness)) {
    state.highestFitness = fitness;
    addLog(`${targeted?'TARGETED ':''}Gen ${state.generation}: ${child.id} — NEW RECORD fitness ${fitness}! [${traitStr}]`, 'highlight');
  } else {
    addLog(`${targeted?'Targeted — ':''}Gen ${state.generation}: ${child.id} born [${traitStr}] → fitness ${fitness}`);
  }
  checkQuests();
  checkAchievements();
  renderAll();
}

window.cullWeakest = () => {
  const minPop = 2;
  if (state.population.length <= minPop) return addLog(`Population too small (min ${minPop}).`, 'warn');
  state.population.forEach(c => { c._f = calcFitness(c); });
  state.population.sort((a,b) => a._f - b._f);
  const actualCull = Math.min(getCullCount(), state.population.length - minPop);
  let totalEarned = 0;
  const names = [];
  for (let i = 0; i < actualCull; i++) {
    const c      = state.population.shift();
    const earned = Math.max(1, 2 + Math.floor(safeNum(c._f) / 2) + getCullBonus());
    state.gold            += earned;
    state.totalGoldEarned += earned;
    totalEarned += earned;
    state.totalCulled++;
    names.push(`${c.id}(${c._f})`);
  }
  addLog(actualCull === 1
    ? `Culled ${names[0]} — earned ${totalEarned} gold.`
    : `Culled ${actualCull}: [${names.join(', ')}] — earned ${totalEarned} gold.`, 'warn');
  checkQuests();
  checkAchievements();
  renderAll();
};

// ── Gold upgrades ────────────────────────────────────────────
window.buyUpgrade = (id) => {
  const def = GOLD_UPGRADES.find(u => u.id === id);
  if (!def) return;
  const lvl  = safeNum(state.upgrades?.[id]);
  if (lvl >= def.levels.length) return addLog(`${def.name} is already maxed.`, 'warn');
  const cost = def.levels[lvl].cost;
  if (state.gold < cost) return addLog(`Need ${cost} gold — you have ${state.gold}.`, 'warn');
  state.gold        -= cost;
  state.upgrades[id] = lvl + 1;
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`, 'highlight');
  checkQuests();
  renderAll();
};

// ── Diamond permanent upgrades ───────────────────────────────
window.buyDiamondUpgrade = (id) => {
  const def = DIAMOND_UPGRADES.find(u => u.id === id);
  if (!def) return;
  const lvl  = safeNum(state.upgrades?.[id]);
  if (lvl >= def.levels.length) return addLog(`${def.name} is already maxed.`, 'warn');
  const cost = def.levels[lvl].cost;
  if (state.diamonds < cost) return addLog(`Need ${cost} 💎 — you have ${state.diamonds}.`, 'warn');
  state.diamonds        -= cost;
  state.upgrades[id]     = lvl + 1;
  addLog(`💎 Purchased ${def.name} Lv ${state.upgrades[id]}.`, 'diamond');
  renderAll();
};

// ── Diamond consumables ──────────────────────────────────────
window.buyConsumable = (id) => {
  const def = DIAMOND_CONSUMABLES.find(c => c.id === id);
  if (!def) return;
  if (state.diamonds < def.cost) return addLog(`Need ${def.cost} 💎 — you have ${state.diamonds}.`, 'warn');

  if (id === 'geneBoost') {
    if (state.population.length === 0) return addLog('No creatures to boost.', 'warn');
    state.population.forEach(c => { c._f = calcFitness(c); });
    const top    = [...state.population].sort((a,b) => b._f - a._f)[0];
    const minVal = Math.min(...TRAIT_KEYS.map(t => safeNum(top.traits[t])));
    const minT   = TRAIT_KEYS.find(t => safeNum(top.traits[t]) === minVal);
    top.traits[minT] = Math.min(getTraitCap(), safeNum(top.traits[minT]) + 5);
    state.diamonds -= def.cost;
    addLog(`💎 Gene Boost: ${top.id}'s ${minT} raised by +5 (now ${top.traits[minT]}).`, 'diamond');

  } else if (id === 'perfectClone') {
    if (state.population.length === 0) return addLog('No creatures to clone.', 'warn');
    if (state.population.length >= getMaxPop()) return addLog(`Population cap (${getMaxPop()}) reached.`, 'warn');
    state.population.forEach(c => { c._f = calcFitness(c); });
    const top   = [...state.population].sort((a,b) => b._f - a._f)[0];
    const clone = { ...top, id: Math.random().toString(36).slice(2,8).toUpperCase(), traits: {...top.traits}, generation: state.generation };
    state.population.push(clone);
    state.diamonds -= def.cost;
    addLog(`💎 Perfect Clone: ${clone.id} is an exact copy of ${top.id} (fitness ${top._f}).`, 'diamond');

  } else if (id === 'evolutionSurge') {
    state.surgeBreedsRemaining = safeNum(state.surgeBreedsRemaining) + 25;
    state.diamonds -= def.cost;
    addLog(`💎 Evolution Surge active — ${state.surgeBreedsRemaining} supercharged breeds remaining.`, 'diamond');

  } else if (id === 'legendaryStock') {
    const pct = 0.9;
    state.population = Array.from({ length: 5 }, () => makeCreatureFromLegacy(pct));
    state.diamonds -= def.cost;
    addLog(`💎 Legendary Stock: population reset with 90% legacy trait values. A new era begins.`, 'diamond');
  }

  checkAchievements();
  renderAll();
};

function makeCreatureFromLegacy(pct) {
  const traits = {};
  TRAIT_KEYS.forEach(t => {
    traits[t] = Math.max(1, Math.min(getTraitCap(), Math.round(safeNum(bestEverTraits[t], 1) * pct)));
  });
  return { id: Math.random().toString(36).slice(2,8).toUpperCase(), generation: state.generation, traits };
}

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
  QUESTS_DEF.forEach(q => {
    if (!state.completedQuests.includes(q.id) && q.check(state)) {
      state.completedQuests.push(q.id);
      let msg = q.rewardText;
      if (q.reward?.gold) { state.gold += q.reward.gold; state.totalGoldEarned += q.reward.gold; }
      if (q.reward?.diamonds) {
        state.diamonds            += q.reward.diamonds;
        state.totalDiamondsEarned += q.reward.diamonds;
        state.diamondQuestsRewarded.push(q.id);
        addLog(`✓ Quest: "${q.name}" — ${msg}`, 'diamond');
      } else {
        addLog(`✓ Quest: "${q.name}" — ${msg}`, 'highlight');
      }
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
  if (currentTab === 'population')   renderPopulation();
  if (currentTab === 'upgrades')     renderUpgrades();
  if (currentTab === 'quests')       renderQuests();
  if (currentTab === 'achievements') renderAchievements();
}

function renderStats() {
  const best = state.population.reduce((m,c) => { const f = calcFitness(c); return f > m ? f : m; }, 0);
  document.getElementById('stat-gen').textContent      = safeNum(state.generation, 1);
  document.getElementById('stat-pop').textContent      = `${state.population.length} / ${getMaxPop()}`;
  document.getElementById('stat-gold').textContent     = safeNum(state.gold);
  document.getElementById('stat-diamonds').textContent = `${safeNum(state.diamonds)} 💎`;
  document.getElementById('stat-fitness').textContent  = best || '—';
  document.getElementById('stat-score').textContent    = calcScore().toLocaleString();
  document.getElementById('stat-bred').textContent     = safeNum(state.totalBred);
  document.getElementById('stat-culled').textContent   = safeNum(state.totalCulled);
}

function renderUpgrades() {
  const container = document.getElementById('upgrades-container');
  if (!container) return;

  // ── Gold upgrade cards ───────────────────────────────────
  let html = `<p class="upgrades-section-title gold-title">// GOLD UPGRADES</p><div class="upgrade-grid">`;
  GOLD_UPGRADES.forEach(def => {
    const lvl   = safeNum(state.upgrades?.[def.id]);
    const maxed = lvl >= def.levels.length;
    const pips  = def.levels.map((_,i) => `<div class="upgrade-pip ${i < lvl ? 'filled' : i === lvl ? 'current' : ''}"></div>`).join('');
    if (maxed) {
      html += `<div class="upgrade-card maxed-card">
        <div class="upgrade-card-name">${def.name} <span class="maxed">[MAX]</span></div>
        <div class="upgrade-card-desc">${def.desc}</div>
        <div class="upgrade-progress">${pips}</div>
      </div>`;
    } else {
      const next = def.levels[lvl];
      const can  = state.gold >= next.cost;
      html += `<div class="upgrade-card">
        <div class="upgrade-card-name">${def.name}${lvl > 0 ? ` <span class="level-badge">[Lv${lvl}]</span>` : ''}</div>
        <div class="upgrade-card-desc">${def.desc}</div>
        <div class="upgrade-progress">${pips}</div>
        <div class="upgrade-card-next">▸ ${next.label}</div>
        <button onclick="buyUpgrade('${def.id}')" ${can?'':'style="opacity:0.4;cursor:not-allowed"'}>[ BUY — ${next.cost}g ]</button>
      </div>`;
    }
  });
  html += `</div>`;

  // ── Diamond permanent upgrades ───────────────────────────
  html += `<p class="upgrades-section-title diamond-title">// DIAMOND UPGRADES</p><div class="upgrade-grid">`;
  DIAMOND_UPGRADES.forEach(def => {
    const lvl   = safeNum(state.upgrades?.[def.id]);
    const maxed = lvl >= def.levels.length;
    const pips  = def.levels.map((_,i) => `<div class="upgrade-pip ${i < lvl ? 'filled d' : i === lvl ? 'current' : ''}"></div>`).join('');
    if (maxed) {
      html += `<div class="upgrade-card diamond-card maxed-card">
        <div class="upgrade-card-name">${def.name} <span class="maxed d">💎 MAX</span></div>
        <div class="upgrade-card-desc">${def.desc}</div>
        <div class="upgrade-progress">${pips}</div>
      </div>`;
    } else {
      const next = def.levels[lvl];
      const can  = state.diamonds >= next.cost;
      html += `<div class="upgrade-card diamond-card">
        <div class="upgrade-card-name">${def.name}${lvl > 0 ? ` <span class="level-badge">[Lv${lvl}]</span>` : ''}</div>
        <div class="upgrade-card-desc">${def.desc}</div>
        <div class="upgrade-progress">${pips}</div>
        <div class="upgrade-card-next diamond-next">▸ ${next.label}</div>
        <button class="btn-diamond ${can?'':'cant-afford'}" onclick="buyDiamondUpgrade('${def.id}')">[ BUY — ${next.cost} 💎 ]</button>
      </div>`;
    }
  });
  html += `</div>`;

  // ── Diamond consumables shop ─────────────────────────────
  html += `<p class="upgrades-section-title diamond-title">// DIAMOND SHOP — consumables</p><div class="upgrade-grid">`;
  DIAMOND_CONSUMABLES.forEach(item => {
    const can = state.diamonds >= item.cost;
    html += `<div class="shop-card">
      <div class="shop-card-name">💎 ${item.name}</div>
      <div class="shop-card-desc">${item.desc}</div>
      <div class="shop-card-effect">⟶ ${item.effect}</div>
      <button class="btn-diamond ${can?'':'cant-afford'}" onclick="buyConsumable('${item.id}')">[ USE — ${item.cost} 💎 ]</button>
    </div>`;
  });
  html += `</div>`;

  container.innerHTML = html;
}

function renderPopulation() {
  const container   = document.getElementById('population-table');
  if (!container) return;
  const hasSel = safeNum(state.upgrades?.selective) > 0;
  const sorted = [...state.population].map(c => ({ ...c, _f: calcFitness(c) })).sort((a,b) => b._f - a._f);

  if (sorted.length === 0) { container.innerHTML = '<p class="empty-state">No creatures yet.</p>'; return; }

  let html = '';
  if (hasSel) {
    html += `<div class="pop-header">
      <span class="pop-hint">Click [ ☆ ] to select a breeding pair.</span>
      <button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button>
    </div>`;
  }

  const surge = safeNum(state.surgeBreedsRemaining);
  if (surge > 0) html += `<p class="pop-hint" style="margin-bottom:10px;color:var(--diamond)">💎 Evolution Surge active — ${surge} supercharged breeds remaining.</p>`;

  html += `<table><thead><tr>
    ${hasSel ? '<th></th>' : ''}
    <th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}
  </tr></thead><tbody>`;

  sorted.forEach((c, i) => {
    const isTop  = i === 0;
    const isBot  = i === sorted.length - 1 && sorted.length > 2;
    const isSel  = selectedForBreeding.includes(c.id);
    const rowCls = isTop ? 'row-top' : isBot ? 'row-bottom' : isSel ? 'row-selected' : '';
    html += `<tr class="${rowCls}">`;
    if (hasSel) html += `<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
    html += `<td class="bright">${c.id}</td><td>${safeNum(c.generation,'?')}</td><td class="fit-val">${c._f}</td>`;
    TRAIT_KEYS.forEach(t => {
      const v = safeNum(c.traits[t]);
      const cls = v >= 40 ? 'trait-hi' : v >= 20 ? 'trait-mid' : v <= 3 ? 'trait-lo' : '';
      html += `<td class="${cls}">${v}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (!hasSel) html += `<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> (Upgrades tab) to hand-pick pairs.</p>`;
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
      const hasD = q.reward?.diamonds;
      html += `<div class="quest-card">
        <div class="quest-name">${q.name}${hasD ? ' 💎' : ''}</div>
        <div class="quest-desc">${q.desc}</div>
        ${prog ? `<div class="quest-progress">▸ ${prog}</div>` : ''}
        <div class="quest-reward">${q.rewardText.replace('💎','<span class="dr">💎</span>')}</div>
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
  const total    = ACH_MAP.reduce((n,r) => n + r.nodes.length, 0);
  const unlocked = state.unlockedAchievements.length;
  let html = `<p class="section-label">// ACHIEVEMENT MAP — ${unlocked} / ${total} unlocked</p>`;
  ACH_MAP.forEach(row => {
    html += `<div class="ach-row"><div class="ach-row-label">${row.label}</div><div class="ach-nodes">`;
    row.nodes.forEach((node, i) => {
      const isU = state.unlockedAchievements.includes(node.id);
      html += `<div class="ach-node ${isU?'unlocked':'locked'}" title="${node.desc}">
        <div class="ach-icon">${isU?'◆':'◇'}</div>
        <div class="ach-name">${node.name}</div>
        <div class="ach-desc">${node.desc}</div>
      </div>`;
      if (i < row.nodes.length - 1) html += `<div class="ach-connector ${isU?'conn-lit':''}">──→</div>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

window.renderLeaderboard = (entries, currentUid) => {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  let html = `
    <div class="lb-header">
      <span class="lb-title">// LEADERBOARD</span>
      <button class="lb-refresh" onclick="window.refreshLeaderboard && window.refreshLeaderboard()">[ REFRESH ]</button>
    </div>
    <p class="lb-formula">
      Score = <span>fitness × 200</span> + <span>generation × 10</span> + <span>bred × 3</span> + <span>culled × 5</span> + <span>gold × 1</span> + <span>💎 × 100</span>
    </p>`;
  if (!entries?.length) { html += `<p class="lb-empty">No entries yet — save your game to appear here.</p>`; container.innerHTML = html; return; }
  html += `<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>FITNESS</th><th>GEN</th></tr></thead><tbody>`;
  entries.forEach((e, i) => {
    const rank  = i + 1;
    const isYou = e.uid === currentUid;
    html += `<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}">
      <td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td>
      <td class="lb-name">${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}</td>
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

window.openUsernameModal = () => {
  document.getElementById('username-modal').classList.remove('hidden');
  const input = document.getElementById('username-input');
  if (window._currentUsername) input.value = window._currentUsername;
  document.getElementById('username-message').textContent = '';
};
window.skipUsername = () => document.getElementById('username-modal').classList.add('hidden');

window.switchTab = (tab) => {
  currentTab = tab;
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('#tab-bar .tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (tab === 'population')   renderPopulation();
  if (tab === 'upgrades')     renderUpgrades();
  if (tab === 'quests')       renderQuests();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'leaderboard')  window.refreshLeaderboard && window.refreshLeaderboard();
};

window.addLog = (text, type = '') => {
  const el = document.getElementById('log-output');
  if (!el) return;
  const div = document.createElement('div');
  div.className   = 'log-entry' + (type ? ` ${type}` : '');
  div.textContent = `[${ts()}] ${text}`;
  el.prepend(div);
  while (el.children.length > 200) el.removeChild(el.lastChild);
};

function ts()  { return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

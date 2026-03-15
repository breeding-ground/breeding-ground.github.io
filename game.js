'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════

const TRAIT_KEYS    = ['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR     = ['SPD','STR','STA','INT','RES'];
const TRAIT_MAX     = 50;
const POP_CAP_TABLE = [20,25,30,40,60,100];

function fmt(n)  { return safeNum(n).toLocaleString(); }          // 1,234,567
function fmt1(n) { return safeNum(n).toFixed(1); }                // 3.0
function fmtR(n) { return n===0 ? '—' : safeNum(n).toFixed(2); } // research rates

// ── Gold upgrades ────────────────────────────────────────────
const GOLD_UPGRADES = [
  { id:'popCap', name:'Expanded Habitat',
    desc:'Raise the population cap.',
    levels:[
      {cost:60,    label:'Lv 1 — cap 20 → 25'},
      {cost:200,   label:'Lv 2 — cap 25 → 30'},
      {cost:600,   label:'Lv 3 — cap 30 → 40'},
      {cost:2000,  label:'Lv 4 — cap 40 → 60'},
      {cost:7000,  label:'Lv 5 — cap 60 → 100'},
    ]},

  { id:'mutation', name:'Mutation Boost',
    desc:'Higher mutation rate and stronger positive mutations.',
    levels:[
      {cost:25,    label:'Lv 1 — chance 15% → 25%'},
      {cost:75,    label:'Lv 2 — 25% → 40%'},
      {cost:200,   label:'Lv 3 — 40% → 60%'},
      {cost:600,   label:'Lv 4 — always beneficial'},
      {cost:2000,  label:'Lv 5 — two traits mutate per offspring'},
      {cost:8000,  label:'Lv 6 — two beneficial mutations, each +1 to +2'},
    ]},

  { id:'traitAmp', name:'Trait Amplifier',
    desc:"Offspring inherit the stronger parent's trait more often.",
    levels:[
      {cost:50,    label:'Lv 1 — 15% chance to take max of pair'},
      {cost:160,   label:'Lv 2 — 30% chance'},
      {cost:450,   label:'Lv 3 — 55% chance'},
      {cost:1400,  label:'Lv 4 — always inherit stronger'},
      {cost:4500,  label:'Lv 5 — always inherit stronger + 10% chance of extra +1'},
    ]},

  { id:'breedYield', name:'Breeding Yield',
    desc:'Earn more gold per offspring born.',
    levels:[
      {cost:30,    label:'Lv 1 — 3g per breed'},
      {cost:90,    label:'Lv 2 — 6g'},
      {cost:280,   label:'Lv 3 — 12g'},
      {cost:800,   label:'Lv 4 — 25g'},
      {cost:2500,  label:'Lv 5 — 50g'},
      {cost:8000,  label:'Lv 6 — 100g'},
    ]},

  { id:'cullValue', name:"Butcher's Eye",
    desc:'Extract more gold when culling specimens.',
    levels:[
      {cost:20,    label:'Lv 1 — +3g per cull'},
      {cost:55,    label:'Lv 2 — +7g total'},
      {cost:150,   label:'Lv 3 — +15g total'},
      {cost:450,   label:'Lv 4 — +30g total'},
      {cost:1500,  label:'Lv 5 — +60g total'},
      {cost:5000,  label:'Lv 6 — +120g total'},
    ]},

  { id:'genePool', name:'Prime Stock',
    desc:'Starter creatures spawn with higher base trait values.',
    levels:[
      {cost:40,    label:'Lv 1 — starters roll up to 12'},
      {cost:120,   label:'Lv 2 — roll 4–16'},
      {cost:350,   label:'Lv 3 — roll 8–20'},
      {cost:1200,  label:'Lv 4 — roll 10–25'},
      {cost:4000,  label:'Lv 5 — roll 15–30'},
    ]},

  { id:'selective', name:'Selective Breeding',
    desc:'Hand-pick your own breeding pairs in the Population tab.',
    levels:[
      {cost:40, label:'One-time — unlocks BREED SELECTED'},
    ]},

  { id:'cullInsight', name:'Culling Insight',
    desc:'Cull multiple weak creatures in a single action.',
    levels:[
      {cost:100,   label:'Lv 1 — cull bottom 2 at once'},
      {cost:350,   label:'Lv 2 — cull bottom 3'},
      {cost:1200,  label:'Lv 3 — cull bottom 5'},
      {cost:4000,  label:'Lv 4 — cull bottom 8'},
      {cost:14000, label:'Lv 5 — cull bottom 12'},
    ]},

  { id:'lineageMem', name:'Lineage Memory',
    desc:'Offspring can recall the best trait value ever seen in your lineage.',
    levels:[
      {cost:150,   label:'Lv 1 — 5% per trait'},
      {cost:500,   label:'Lv 2 — 12%'},
      {cost:1800,  label:'Lv 3 — 25%'},
      {cost:6000,  label:'Lv 4 — 40%'},
      {cost:20000, label:'Lv 5 — 60%'},
    ]},

  { id:'hybridVigor', name:'Hybrid Vigor',
    desc:"After standard inheritance, offspring have a chance to gain an additional bonus to their best inherited trait.",
    levels:[
      {cost:80,    label:'Lv 1 — 10% chance of +1 to best trait'},
      {cost:300,   label:'Lv 2 — 22% chance of +2 to top 2 traits'},
      {cost:1000,  label:'Lv 3 — 35% chance of +3 to top 2 traits'},
      {cost:3500,  label:'Lv 4 — 50% chance, affects all traits above average'},
    ]},

  { id:'adaptiveGenetics', name:'Adaptive Genetics',
    desc:'Unlucky inherited traits are nudged up toward the parent average, reducing bad-luck outcomes.',
    levels:[
      {cost:100,   label:'Lv 1 — 20% chance to correct below-average traits'},
      {cost:400,   label:'Lv 2 — 45% chance'},
      {cost:1500,  label:'Lv 3 — 70% chance'},
      {cost:5000,  label:'Lv 4 — always corrects — inherited traits never below parent floor'},
    ]},
];

// ── Diamond permanent upgrades ───────────────────────────────
const DIAMOND_UPGRADES = [
  { id:'traitCapBoost', name:'Apex Refinement',
    desc:`Raises the trait ceiling beyond the base limit of ${TRAIT_MAX}.`,
    levels:[
      {cost:10, label:`Lv 1 — cap ${TRAIT_MAX} → ${TRAIT_MAX+5}`},
      {cost:20, label:`Lv 2 — cap → ${TRAIT_MAX+10}`},
      {cost:35, label:`Lv 3 — cap → ${TRAIT_MAX+20}`},
      {cost:60, label:`Lv 4 — cap → ${TRAIT_MAX+35}`},
    ]},

  { id:'eliteMutation', name:'Elite Mutation',
    desc:'Reduces or removes mutation resistance on high-value traits.',
    levels:[
      {cost:8,  label:'Lv 1 — halves resistance on traits ≥ 30'},
      {cost:18, label:'Lv 2 — removes resistance entirely'},
      {cost:40, label:'Lv 3 — high traits also get +1 guaranteed bonus per mutation'},
    ]},

  { id:'dynastyBlood', name:'Dynasty Blood',
    desc:'New starter creatures inherit a fraction of your all-time best trait values.',
    levels:[
      {cost:12, label:'Lv 1 — starters get 25% of best-ever'},
      {cost:25, label:'Lv 2 — 50%'},
      {cost:40, label:'Lv 3 — 75%'},
      {cost:70, label:'Lv 4 — 90%'},
    ]},

  { id:'deepArchive', name:'Deep Archive',
    desc:'Lineage Memory triggers more powerfully, using the historical best +1 instead of exact value.',
    levels:[
      {cost:15, label:'Lv 1 — memory recalls best + 1'},
      {cost:35, label:'Lv 2 — memory recalls best + 2'},
    ]},
];

// ── Diamond consumables ──────────────────────────────────────
const DIAMOND_CONSUMABLES = [
  {id:'geneBoost',     name:'Gene Boost',      cost:2,  desc:"Injects +5 into your top creature's single weakest trait.",        effect:'+5 to weakest trait of best creature'},
  {id:'perfectClone',  name:'Perfect Clone',   cost:5,  desc:'Creates an exact copy of your highest-fitness creature.',          effect:'Duplicate your top creature'},
  {id:'evolutionSurge',name:'Evolution Surge', cost:8,  desc:'Doubles effective mutation rate for the next 25 breeds.',          effect:'+25 surge breeds'},
  {id:'legendaryStock',name:'Legendary Stock', cost:30, desc:'Resets population with 5 starters inheriting 90% of best-ever traits. Use carefully.', effect:'Full reset with legacy traits'},
];

// ── Research division ────────────────────────────────────────
const RESEARCH_DEF = [
  { id:'labInterns',        type:'stack', name:'Lab Intern',          plural:'Lab Interns',
    desc:'Observe breeding events and document genetic outcomes.',
    yieldLine:'Each earns 0.15 💎 per breed',
    costEach:2, max:20, perBreed:0.15 },
  { id:'geneAnalysts',      type:'stack', name:'Gene Analyst',        plural:'Gene Analysts',
    desc:'Extract and catalogue genetic sequences from culled specimens.',
    yieldLine:'Each earns 0.4 💎 per cull',
    costEach:5, max:10, perCull:0.4 },
  { id:'lineageArchivists', type:'stack', name:'Lineage Archivist',   plural:'Lineage Archivists',
    desc:'Mine your generational records for deep patterns, yielding data every 25 generations.',
    yieldLine:'Each earns 1 💎 per 25 generations',
    costEach:15, max:5, perArchTick:1.0 },
  { id:'headOfResearch',    type:'unique', name:'Head of Research',
    desc:'A seasoned director who multiplies all research output by 1.5×.',
    yieldLine:'Multiplies all research yield ×1.5',
    cost:35 },
  { id:'automatedSequencer',type:'unique', name:'Automated Sequencer',
    desc:'State-of-the-art sequencing hardware. All research output doubled.',
    yieldLine:'Multiplies all research yield ×2',
    cost:75 },
];

// ═══════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════

const MILESTONES = [
  // BREEDING
  {id:'q_first_breed', cat:'BREEDING', name:'First Steps',        desc:'Breed your first offspring.',           check:s=>s.totalBred>=1,           reward:{diamonds:1},  rt:'1 💎'},
  {id:'m_bred_10',     cat:'BREEDING', name:'Veteran',            desc:'Breed 10 times.',                       check:s=>s.totalBred>=10,          pct:s=>s.totalBred/10,   reward:{diamonds:1},  rt:'1 💎'},
  {id:'m_bred_50',     cat:'BREEDING', name:'Master Breeder',     desc:'Breed 50 times.',                       check:s=>s.totalBred>=50,          pct:s=>s.totalBred/50,   reward:{diamonds:1},  rt:'1 💎'},
  {id:'q_bred_200',    cat:'BREEDING', name:'Tireless',           desc:'Breed 200 times.',                      check:s=>s.totalBred>=200,         pct:s=>s.totalBred/200,  reward:{diamonds:2},  rt:'2 💎'},
  {id:'m_bred_500',    cat:'BREEDING', name:'Prolific',           desc:'Breed 500 times.',                      check:s=>s.totalBred>=500,         pct:s=>s.totalBred/500,  reward:{diamonds:3},  rt:'3 💎'},
  {id:'q_bred_1000',   cat:'BREEDING', name:'The Factory',        desc:'Breed 1,000 times.',                    check:s=>s.totalBred>=1000,        pct:s=>s.totalBred/1000, reward:{diamonds:5},  rt:'5 💎'},
  {id:'m_bred_5000',   cat:'BREEDING', name:'Relentless',         desc:'Breed 5,000 times.',                    check:s=>s.totalBred>=5000,        pct:s=>s.totalBred/5000, reward:{diamonds:8},  rt:'8 💎'},
  {id:'q_pop_8',       cat:'BREEDING', name:'Growing Population', desc:'Have 8 creatures alive simultaneously.',check:s=>s.population.length>=8,   pct:s=>s.population.length/8, reward:{diamonds:1}, rt:'1 💎'},

  // CULLING
  {id:'q_first_cull',  cat:'CULLING',  name:'Culling Season',     desc:'Cull your first creature.',             check:s=>s.totalCulled>=1,         reward:{diamonds:1},  rt:'1 💎'},
  {id:'m_cull_10',     cat:'CULLING',  name:'Selective',          desc:'Cull 10 creatures.',                    check:s=>s.totalCulled>=10,        pct:s=>s.totalCulled/10,   reward:{diamonds:1},  rt:'1 💎'},
  {id:'q_cull_20',     cat:'CULLING',  name:'Population Control', desc:'Cull 20 creatures total.',              check:s=>s.totalCulled>=20,        pct:s=>s.totalCulled/20,   reward:{diamonds:1},  rt:'1 💎'},
  {id:'q_cull_50',     cat:'CULLING',  name:'Ruthless',           desc:'Cull 50 creatures total.',              check:s=>s.totalCulled>=50,        pct:s=>s.totalCulled/50,   reward:{diamonds:2},  rt:'2 💎'},
  {id:'q_cull_150',    cat:'CULLING',  name:'Purifier',           desc:'Cull 150 creatures total.',             check:s=>s.totalCulled>=150,       pct:s=>s.totalCulled/150,  reward:{diamonds:3},  rt:'3 💎'},
  {id:'q_cull_500',    cat:'CULLING',  name:'Extinction Event',   desc:'Cull 500 creatures total.',             check:s=>s.totalCulled>=500,       pct:s=>s.totalCulled/500,  reward:{diamonds:5},  rt:'5 💎'},
  {id:'m_cull_2000',   cat:'CULLING',  name:'Endless Harvest',    desc:'Cull 2,000 creatures total.',           check:s=>s.totalCulled>=2000,      pct:s=>s.totalCulled/2000, reward:{diamonds:8},  rt:'8 💎'},

  // GENERATIONS
  {id:'m_gen_50',      cat:'GENERATIONS', name:'Half Century',    desc:'Reach generation 50.',   check:s=>s.generation>=50,    pct:s=>s.generation/50,    reward:{diamonds:1},  rt:'1 💎'},
  {id:'q_gen_100',     cat:'GENERATIONS', name:'Century Mark',    desc:'Reach generation 100.',  check:s=>s.generation>=100,   pct:s=>s.generation/100,   reward:{diamonds:1},  rt:'1 💎'},
  {id:'q_gen_500',     cat:'GENERATIONS', name:'Grand Experiment',desc:'Reach generation 500.',  check:s=>s.generation>=500,   pct:s=>s.generation/500,   reward:{diamonds:2},  rt:'2 💎'},
  {id:'q_gen_1000',    cat:'GENERATIONS', name:'Millennium',      desc:'Reach generation 1,000.',check:s=>s.generation>=1000,  pct:s=>s.generation/1000,  reward:{diamonds:3},  rt:'3 💎'},
  {id:'q_gen_5000',    cat:'GENERATIONS', name:'The Long Game',   desc:'Reach generation 5,000.',check:s=>s.generation>=5000,  pct:s=>s.generation/5000,  reward:{diamonds:5},  rt:'5 💎'},
  {id:'q_gen_10000',   cat:'GENERATIONS', name:'Eternal Lineage', desc:'Reach generation 10,000.',check:s=>s.generation>=10000,pct:s=>s.generation/10000, reward:{diamonds:8},  rt:'8 💎'},

  // FITNESS
  {id:'q_fitness_10',  cat:'FITNESS', name:'Fitness Fanatic',  desc:'Breed a creature with fitness ≥ 10.', check:s=>s.highestFitness>=10,  pct:s=>s.highestFitness/10,  reward:{diamonds:1}, rt:'1 💎'},
  {id:'q_fitness_15',  cat:'FITNESS', name:'Strong Bloodline', desc:'Fitness ≥ 15.',                       check:s=>s.highestFitness>=15,  pct:s=>s.highestFitness/15,  reward:{diamonds:1}, rt:'1 💎'},
  {id:'q_fitness_20',  cat:'FITNESS', name:'Elite Lineage',    desc:'Fitness ≥ 20.',                       check:s=>s.highestFitness>=20,  pct:s=>s.highestFitness/20,  reward:{diamonds:2}, rt:'2 💎'},
  {id:'q_fitness_30',  cat:'FITNESS', name:'Apex Lineage',     desc:'Fitness ≥ 30.',                       check:s=>s.highestFitness>=30,  pct:s=>s.highestFitness/30,  reward:{diamonds:3}, rt:'3 💎'},
  {id:'q_fitness_40',  cat:'FITNESS', name:'Transcendent',     desc:'Fitness ≥ 40.',                       check:s=>s.highestFitness>=40,  pct:s=>s.highestFitness/40,  reward:{diamonds:5}, rt:'5 💎'},
  {id:'q_fitness_50',  cat:'FITNESS', name:'God Complex',      desc:'Fitness ≥ 50.',                       check:s=>s.highestFitness>=50,  pct:s=>s.highestFitness/50,  reward:{diamonds:8}, rt:'8 💎'},

  // TRAITS
  {id:'q_trait_10',    cat:'TRAITS', name:'Promising Stock',    desc:'Any single trait ≥ 10.',  check:s=>bestSingleTrait(s)>=10,  pct:s=>bestSingleTrait(s)/10,  reward:{diamonds:1}, rt:'1 💎'},
  {id:'q_trait_20',    cat:'TRAITS', name:'Perfect Gene',       desc:'Any trait to 20.',        check:s=>bestSingleTrait(s)>=20,  pct:s=>bestSingleTrait(s)/20,  reward:{diamonds:2}, rt:'2 💎'},
  {id:'q_trait_35',    cat:'TRAITS', name:'Beyond Normal',      desc:'Any trait to 35.',        check:s=>bestSingleTrait(s)>=35,  pct:s=>bestSingleTrait(s)/35,  reward:{diamonds:3}, rt:'3 💎'},
  {id:'q_trait_50',    cat:'TRAITS', name:'Theoretical Limit',  desc:'Any trait to 50.',        check:s=>bestSingleTrait(s)>=50,  pct:s=>bestSingleTrait(s)/50,  reward:{diamonds:5}, rt:'5 💎'},

  // GOLD
  {id:'m_gold_50',     cat:'GOLD', name:'Prospector',    desc:'Earn 50 total gold.',      check:s=>s.totalGoldEarned>=50,    pct:s=>s.totalGoldEarned/50,    reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_gold_250',    cat:'GOLD', name:'Goldsmith',     desc:'Earn 250 total gold.',     check:s=>s.totalGoldEarned>=250,   pct:s=>s.totalGoldEarned/250,   reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_gold_1000',   cat:'GOLD', name:'Magnate',       desc:'Earn 1,000 total gold.',   check:s=>s.totalGoldEarned>=1000,  pct:s=>s.totalGoldEarned/1000,  reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_gold_5000',   cat:'GOLD', name:'Industrialist', desc:'Earn 5,000 total gold.',   check:s=>s.totalGoldEarned>=5000,  pct:s=>s.totalGoldEarned/5000,  reward:{diamonds:3}, rt:'3 💎'},
  {id:'m_gold_20000',  cat:'GOLD', name:'Tycoon',        desc:'Earn 20,000 total gold.',  check:s=>s.totalGoldEarned>=20000, pct:s=>s.totalGoldEarned/20000, reward:{diamonds:5}, rt:'5 💎'},
  {id:'q_gold_500',    cat:'GOLD', name:'Golden Age',    desc:'Hold 500 gold at once.',   check:s=>s.gold>=500,              pct:s=>s.gold/500,              reward:{diamonds:1}, rt:'1 💎'},
  {id:'q_gold_2000',   cat:'GOLD', name:'War Chest',     desc:'Hold 2,000 gold at once.', check:s=>s.gold>=2000,             pct:s=>s.gold/2000,             reward:{diamonds:2}, rt:'2 💎'},
  {id:'q_gold_10000',  cat:'GOLD', name:'Infinite Wealth',desc:'Hold 10,000 gold.',       check:s=>s.gold>=10000,            pct:s=>s.gold/10000,            reward:{diamonds:5}, rt:'5 💎'},

  // UPGRADES
  {id:'q_first_upgrade',cat:'UPGRADES',name:'First Investment',   desc:'Purchase any upgrade.',             check:s=>Object.values(s.upgrades||{}).some(v=>v>0), reward:{diamonds:1}, rt:'1 💎'},
  {id:'q_pop_cap_max',  cat:'UPGRADES',name:'Teeming with Life',  desc:'Max out the Expanded Habitat.',     check:s=>safeNum(s.upgrades?.popCap)>=5,   pct:s=>safeNum(s.upgrades?.popCap)/5, reward:{diamonds:3}, rt:'3 💎'},

  // DIAMONDS
  {id:'m_dia_1',        cat:'DIAMONDS',name:'First Jewel',    desc:'Earn your first diamond.',       check:s=>s.totalDiamondsEarned>=1,   reward:{diamonds:0}, rt:''},
  {id:'m_dia_10',       cat:'DIAMONDS',name:'Gem Collector',  desc:'Earn 10 diamonds total.',        check:s=>s.totalDiamondsEarned>=10,  pct:s=>s.totalDiamondsEarned/10,  reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_dia_30',       cat:'DIAMONDS',name:'Jeweller',       desc:'Earn 30 diamonds total.',        check:s=>s.totalDiamondsEarned>=30,  pct:s=>s.totalDiamondsEarned/30,  reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_dia_75',       cat:'DIAMONDS',name:'Hoarder',        desc:'Earn 75 diamonds total.',        check:s=>s.totalDiamondsEarned>=75,  pct:s=>s.totalDiamondsEarned/75,  reward:{diamonds:3}, rt:'3 💎'},
  {id:'m_dia_200',      cat:'DIAMONDS',name:'Diamond Baron',  desc:'Earn 200 diamonds total.',       check:s=>s.totalDiamondsEarned>=200, pct:s=>s.totalDiamondsEarned/200, reward:{diamonds:5}, rt:'5 💎'},

  // RESEARCH
  {id:'m_first_researcher', cat:'RESEARCH', name:'Research Initiative', desc:'Hire your first researcher.',
    check:s=>Object.values(s.research||{}).some(v=>v>0), reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_research_5',   cat:'RESEARCH',name:'Growing Team',    desc:'Have at least 5 researchers hired (combined).',
    check:s=>researchTotalHired(s)>=5,  pct:s=>researchTotalHired(s)/5,   reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_research_20',  cat:'RESEARCH',name:'Full Division',   desc:'Have at least 20 researchers hired (combined).',
    check:s=>researchTotalHired(s)>=20, pct:s=>researchTotalHired(s)/20,  reward:{diamonds:3}, rt:'3 💎'},

  // SECRETS
  {id:'m_secret_gen69',      cat:'SECRETS', secret:true, name:'Nice.',
    desc:'Reach generation 69.', check:s=>s.generation>=69, reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_secret_broke',      cat:'SECRETS', secret:true, name:'Broke',
    desc:'Have 0 gold after earning at least 100.', check:s=>s.everBroke===true, reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_secret_balanced',   cat:'SECRETS', secret:true, name:'Perfectly Balanced',
    desc:'Have a living creature where all 5 traits are within 2 of each other.',
    check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));return Math.max(...v)-Math.min(...v)<=2;}),
    reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_bottleneck', cat:'SECRETS', secret:true, name:'Bottleneck',
    desc:'Have only 2 creatures alive after generation 50.',
    check:s=>s.population.length===2&&s.generation>50, reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_betrayal',   cat:'SECRETS', secret:true, name:'The Betrayal',
    desc:'Cull a creature that held your all-time fitness record.',
    check:s=>s.culledOwnRecord===true, reward:{diamonds:3}, rt:'3 💎'},
  {id:'m_secret_surge3',     cat:'SECRETS', secret:true, name:'Surge Addict',
    desc:'Use the Evolution Surge consumable 3 times.',
    check:s=>safeNum(s.surgeUseCount)>=3, pct:s=>safeNum(s.surgeUseCount)/3, reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_legendary',  cat:'SECRETS', secret:true, name:'New Era',
    desc:'Use the Legendary Stock consumable.',
    check:s=>s.usedLegendaryStock===true, reward:{diamonds:3}, rt:'3 💎'},
  {id:'m_secret_jekyll',     cat:'SECRETS', secret:true, name:'Jekyll & Hyde',
    desc:'Have a creature where its highest trait is at least 3× its lowest.',
    check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));const mn=Math.min(...v);return mn>0&&Math.max(...v)>=mn*3;}),
    reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_fullhouse',  cat:'SECRETS', secret:true, name:'Standing Room Only',
    desc:'Fill your population to the current cap.',
    check:s=>s.population.length>=(POP_CAP_TABLE[safeNum(s.upgrades?.popCap)]??20),
    reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_username',   cat:'SECRETS', secret:true, name:'Somebody',
    desc:'Give yourself a name.', check:s=>s.hasSetUsername===true, reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_secret_hoard',      cat:'SECRETS', secret:true, name:"Dragon's Hoard",
    desc:'Hold 25 diamonds at once.',
    check:s=>s.diamonds>=25, pct:s=>s.diamonds/25, reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_enlightened',cat:'SECRETS', secret:true, name:'Enlightened',
    desc:'Purchase any diamond upgrade.',
    check:s=>['traitCapBoost','eliteMutation','dynastyBlood','deepArchive'].some(u=>safeNum(s.upgrades?.[u])>0),
    reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_blink',      cat:'SECRETS', secret:true, name:'Blink and You Miss It',
    desc:'Breed 5 times before culling anything.',
    check:s=>s.bredBeforeFirstCull>=5, reward:{diamonds:1}, rt:'1 💎'},
  {id:'m_secret_palindrome', cat:'SECRETS', secret:true, name:'Palindrome',
    desc:'Have a creature where Speed equals Resilience and Strength equals Intelligence.',
    check:s=>s.population.some(c=>safeNum(c.traits.speed)===safeNum(c.traits.resilience)&&safeNum(c.traits.strength)===safeNum(c.traits.intelligence)),
    reward:{diamonds:2}, rt:'2 💎'},
  {id:'m_secret_employer',   cat:'SECRETS', secret:true, name:'Employer of the Year',
    desc:'Hire at least one of each researcher type.',
    check:s=>safeNum(s.research?.labInterns)>0&&safeNum(s.research?.geneAnalysts)>0&&safeNum(s.research?.lineageArchivists)>0,
    reward:{diamonds:3}, rt:'3 💎'},
  {id:'m_secret_fulllab',    cat:'SECRETS', secret:true, name:'Full Lab',
    desc:'Max out Lab Interns, Gene Analysts, and Lineage Archivists.',
    check:s=>safeNum(s.research?.labInterns)>=20&&safeNum(s.research?.geneAnalysts)>=10&&safeNum(s.research?.lineageArchivists)>=5,
    reward:{diamonds:5}, rt:'5 💎'},
];

const LEGACY_ID_MAP = {
  'a_genesis':null,'a_bred_1':'q_first_breed','a_bred_10':'m_bred_10','a_bred_50':'m_bred_50',
  'a_bred_200':'q_bred_200','a_bred_1000':'q_bred_1000','a_cull_1':'q_first_cull',
  'a_cull_10':'m_cull_10','a_cull_50':'q_cull_50','a_cull_150':'q_cull_150','a_cull_500':'q_cull_500',
  'a_gold_50':'m_gold_50','a_gold_250':'m_gold_250','a_gold_1000':'m_gold_1000',
  'a_gold_5000':'m_gold_5000','a_gold_20000':'m_gold_20000',
  'a_fit_10':'q_fitness_10','a_fit_20':'q_fitness_20','a_fit_30':'q_fitness_30',
  'a_fit_40':'q_fitness_40','a_fit_50':'q_fitness_50',
  'a_dia_1':'m_dia_1','a_dia_10':'m_dia_10','a_dia_30':'m_dia_30','a_dia_75':'m_dia_75',
  'a_gen_50':'m_gen_50','a_gen_100':'q_gen_100','a_gen_500':'q_gen_500',
  'a_gen_1000':'q_gen_1000','a_gen_5000':'q_gen_5000','a_gen_10000':'q_gen_10000',
  'a_pop_10':null,'a_pop_30':null,'a_pop_60':null,'a_pop_100':null,
};

const MS_CATS = ['BREEDING','CULLING','GENERATIONS','FITNESS','TRAITS','GOLD','UPGRADES','DIAMONDS','RESEARCH','SECRETS'];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════

let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
let bestEverTraits      = {};

function defaultState() {
  return {
    generation:1, population:[], gold:0, diamonds:0,
    totalBred:0, totalCulled:0, totalGoldEarned:0,
    totalDiamondsEarned:0, highestFitness:0,
    completedMilestones:[], milestoneDiamondsAwarded:[],
    surgeBreedsRemaining:0,
    everBroke:false, culledOwnRecord:false, surgeUseCount:0,
    usedLegendaryStock:false, hasSetUsername:false,
    bredBeforeFirstCull:0, firstCullDone:false,
    research:{ labInterns:0, geneAnalysts:0, lineageArchivists:0, headOfResearch:false, automatedSequencer:false },
    diamondBuffer:0, lastArchivistGen:1, totalResearchDiamondsEarned:0,
    upgrades:{
      popCap:0, mutation:0, traitAmp:0, breedYield:0, cullValue:0,
      genePool:0, selective:0, cullInsight:0, lineageMem:0,
      hybridVigor:0, adaptiveGenetics:0,
      traitCapBoost:0, eliteMutation:0, dynastyBlood:0, deepArchive:0,
    },
  };
}

function getMaxPop()    { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20; }
function getBreedGold() { return [1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1; }
function getCullBonus() { return [0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0; }
function getCullCount() { return [1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1; }
function getMutRate()   { return [0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15; }
function getMutBonus()  { return safeNum(state.upgrades?.mutation)>=6?2:1; }    // Lv6: +2 per mutation
function getAmpRate()   { return [0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0; }
function getAmpBonus()  { return safeNum(state.upgrades?.traitAmp)>=5; }        // Lv5: extra +1
function getMemRate()   { return [0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0; }
function getMemBonus()  { return [0,1,2][safeNum(state.upgrades?.deepArchive)]??0; }
function getTraitCap()  { return TRAIT_MAX+([0,5,10,20,35][safeNum(state.upgrades?.traitCapBoost)]??0); }
function researchMult() { return (state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1); }
function researchBreedYield(){ return safeNum(state.research?.labInterns)*0.15*researchMult(); }
function researchCullYield() { return safeNum(state.research?.geneAnalysts)*0.4*researchMult(); }
function researchArchYield() { return safeNum(state.research?.lineageArchivists)*1.0*researchMult(); }
function researchTotalHired(s){
  return safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+
         safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0);
}

function safeNum(v,fallback=0){ const n=Number(v); return isFinite(n)?n:fallback; }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function bestSingleTrait(s){ return Math.max(0,...s.population.map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits[t]))))); }

function migrateCrature(c){
  if(!c||typeof c!=='object') return null;
  const t=c.traits||{};
  return { id:c.id||Math.random().toString(36).slice(2,8).toUpperCase(), generation:safeNum(c.generation,1),
    traits:{ speed:safeNum(t.speed,rand(1,8)), strength:safeNum(t.strength,rand(1,8)),
      stamina:safeNum(t.stamina,rand(1,8)), intelligence:safeNum(t.intelligence,rand(1,8)), resilience:safeNum(t.resilience,rand(1,8)) }};
}

function sanitiseState(s){
  return {
    ...s,
    generation:safeNum(s.generation,1), gold:safeNum(s.gold), diamonds:safeNum(s.diamonds),
    totalBred:safeNum(s.totalBred), totalCulled:safeNum(s.totalCulled),
    totalGoldEarned:safeNum(s.totalGoldEarned), totalDiamondsEarned:safeNum(s.totalDiamondsEarned),
    highestFitness:safeNum(s.highestFitness), surgeBreedsRemaining:safeNum(s.surgeBreedsRemaining),
    diamondBuffer:safeNum(s.diamondBuffer), lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned),
    everBroke:!!s.everBroke, culledOwnRecord:!!s.culledOwnRecord,
    surgeUseCount:safeNum(s.surgeUseCount), usedLegendaryStock:!!s.usedLegendaryStock,
    hasSetUsername:!!s.hasSetUsername, bredBeforeFirstCull:safeNum(s.bredBeforeFirstCull), firstCullDone:!!s.firstCullDone,
    completedMilestones:Array.isArray(s.completedMilestones)?s.completedMilestones:[],
    milestoneDiamondsAwarded:Array.isArray(s.milestoneDiamondsAwarded)?s.milestoneDiamondsAwarded:[],
    research:{
      labInterns:safeNum(s.research?.labInterns), geneAnalysts:safeNum(s.research?.geneAnalysts),
      lineageArchivists:safeNum(s.research?.lineageArchivists),
      headOfResearch:!!s.research?.headOfResearch, automatedSequencer:!!s.research?.automatedSequencer,
    },
    upgrades:{
      popCap:safeNum(s.upgrades?.popCap), mutation:safeNum(s.upgrades?.mutation),
      traitAmp:safeNum(s.upgrades?.traitAmp), breedYield:safeNum(s.upgrades?.breedYield),
      cullValue:safeNum(s.upgrades?.cullValue), genePool:safeNum(s.upgrades?.genePool),
      selective:safeNum(s.upgrades?.selective), cullInsight:safeNum(s.upgrades?.cullInsight),
      lineageMem:safeNum(s.upgrades?.lineageMem), hybridVigor:safeNum(s.upgrades?.hybridVigor),
      adaptiveGenetics:safeNum(s.upgrades?.adaptiveGenetics),
      traitCapBoost:safeNum(s.upgrades?.traitCapBoost), eliteMutation:safeNum(s.upgrades?.eliteMutation),
      dynastyBlood:safeNum(s.upgrades?.dynastyBlood), deepArchive:safeNum(s.upgrades?.deepArchive),
    },
    population:(s.population||[]).map(migrateCrature).filter(Boolean),
  };
}

function rebuildBestEverTraits(){
  TRAIT_KEYS.forEach(t=>{bestEverTraits[t]=1;});
  state.population.forEach(c=>TRAIT_KEYS.forEach(t=>{ const v=safeNum(c.traits[t]); if(v>bestEverTraits[t]) bestEverTraits[t]=v; }));
}

function migrateLegacyProgress(){
  const legacyIds=[...(state.completedQuests||[]),...(state.unlockedAchievements||[]),...(state.diamondQuestsRewarded||[])];
  legacyIds.forEach(oldId=>{
    if (MILESTONES.some(m=>m.id===oldId)){
      if(!state.completedMilestones.includes(oldId)) state.completedMilestones.push(oldId);
      return;
    }
    const newId=LEGACY_ID_MAP[oldId];
    if(newId&&!state.completedMilestones.includes(newId)) state.completedMilestones.push(newId);
  });
  let owed=0;
  state.completedMilestones.forEach(id=>{
    if(state.milestoneDiamondsAwarded.includes(id)) return;
    const m=MILESTONES.find(x=>x.id===id);
    if(m?.reward?.diamonds&&m.reward.diamonds>0){
      state.diamonds+=m.reward.diamonds; state.totalDiamondsEarned+=m.reward.diamonds;
      state.milestoneDiamondsAwarded.push(id); owed+=m.reward.diamonds;
    } else if(m){ state.milestoneDiamondsAwarded.push(id); }
  });
  if(owed>0) addLog(`💎 Retroactive grant: +${fmt(owed)} 💎 for previously completed milestones.`,'diamond');
}

function flushDiamondBuffer(){
  while(state.diamondBuffer>=1){
    state.diamondBuffer-=1; state.diamonds+=1;
    state.totalDiamondsEarned+=1; state.totalResearchDiamondsEarned+=1;
  }
}

function tickArchivists(){
  if(!safeNum(state.research?.lineageArchivists)) return;
  const lastGen=safeNum(state.lastArchivistGen,1);
  const ticks=Math.floor((safeNum(state.generation)-lastGen)/25);
  if(ticks<=0) return;
  state.diamondBuffer+=ticks*researchArchYield();
  state.lastArchivistGen=lastGen+ticks*25;
  flushDiamondBuffer();
}

// ── SAVE / LOAD ──────────────────────────────────────────────
window.getSaveData = ()=>sanitiseState(state);

window.applySaveData = (data)=>{
  state=sanitiseState({...defaultState(),...data});
  selectedForBreeding=[];
  rebuildBestEverTraits();
  migrateLegacyProgress();
  renderAll();
};

window.initNewGame = ()=>{
  state=defaultState();
  state.population=Array.from({length:5},()=>makeCreature());
  rebuildBestEverTraits();
  renderAll();
};

window.notifyUsernameSet = ()=>{
  if(!state.hasSetUsername){ state.hasSetUsername=true; checkMilestones(); renderAll(); }
};

// ── SCORE ────────────────────────────────────────────────────
window.calcScore = ()=>Math.floor(
  safeNum(state.highestFitness)*200 + safeNum(state.generation)*10 +
  safeNum(state.totalBred)*3 + safeNum(state.totalCulled)*5 +
  safeNum(state.totalGoldEarned)*1 + safeNum(state.totalDiamondsEarned)*100
);

// ── CREATURE HELPERS ─────────────────────────────────────────
function calcFitness(c){ return Math.round(TRAIT_KEYS.reduce((s,t)=>s+safeNum(c.traits[t]),0)/TRAIT_KEYS.length); }

function inheritVal(va,vb,traitKey){
  va=safeNum(va,4); vb=safeNum(vb,4);
  const cap=getTraitCap();

  // Lineage Memory
  if(getMemRate()>0&&Math.random()<getMemRate()){
    const bonus=getMemBonus();
    return Math.max(1,Math.min(cap,safeNum(bestEverTraits[traitKey],Math.max(va,vb))+bonus));
  }

  // Trait Amplifier
  const ampBase=(getAmpRate()>0&&Math.random()<getAmpRate())?Math.max(va,vb):(Math.random()<0.5?va:vb);
  const ampBonus=(getAmpBonus()&&Math.random()<0.1)?1:0;

  // Adaptive Genetics: nudge below-average traits up
  const parentAvg=(va+vb)/2;
  const agLvl=safeNum(state.upgrades?.adaptiveGenetics);
  const agRates=[0,0.2,0.45,0.70,1.0];
  let base=ampBase+ampBonus;
  if(agLvl>0&&base<parentAvg){
    if(agLvl>=4||(Math.random()<(agRates[agLvl]||0))) base=Math.max(base,Math.floor(parentAvg));
  }

  // Mutation
  const alwaysPos=safeNum(state.upgrades?.mutation)>=4;
  const doubleMut=safeNum(state.upgrades?.mutation)>=5;
  const mutBonus =getMutBonus();
  const eliteLvl =safeNum(state.upgrades?.eliteMutation);
  let val=base;
  const applyMut=()=>{
    let res=base/cap;
    if(eliteLvl===1&&base>=30) res*=0.5;
    if(eliteLvl>=2) res=0;
    const eff=getMutRate()*(1-res*0.7);
    const boosted=safeNum(state.surgeBreedsRemaining)>0?Math.min(1,eff*2):eff;
    if(Math.random()<boosted){
      const dir=alwaysPos?1:(Math.random()<0.5?1:-1);
      const bonus=eliteLvl>=3&&base>=30?mutBonus:1;
      val=Math.max(1,Math.min(cap,val+dir*bonus));
    }
  };
  applyMut(); if(doubleMut) applyMut();

  // Hybrid Vigor: post-mutation bonus to best traits
  const hvLvl=safeNum(state.upgrades?.hybridVigor);
  if(hvLvl>0){
    const hvChance=[0,0.10,0.22,0.35,0.50][hvLvl]||0;
    const hvBonus=[0,1,2,3,3][hvLvl]||0;
    if(Math.random()<hvChance) val=Math.min(cap,val+hvBonus);
  }

  return val;
}

function makeCreature(parentA=null,parentB=null){
  const traits={},cap=getTraitCap();
  if(parentA){
    TRAIT_KEYS.forEach(t=>{traits[t]=inheritVal(parentA.traits[t],parentB.traits[t],t);});
  } else {
    const geneRanges=[[1,8],[1,12],[4,16],[8,20],[10,25],[15,30]];
    const [min,max]=geneRanges[safeNum(state.upgrades?.genePool)]||[1,8];
    const legPct=[0,0.25,0.50,0.75,0.90][safeNum(state.upgrades?.dynastyBlood)]||0;
    TRAIT_KEYS.forEach(t=>{
      const rolled=rand(min,max);
      const legacy=legPct>0?Math.round(safeNum(bestEverTraits[t],1)*legPct):0;
      traits[t]=Math.min(cap,Math.max(rolled,legacy));
    });
  }
  return { id:Math.random().toString(36).slice(2,8).toUpperCase(), generation:state.generation, traits };
}

function makeCreatureFromLegacy(pct){
  const cap=getTraitCap(), traits={};
  TRAIT_KEYS.forEach(t=>{traits[t]=Math.max(1,Math.min(cap,Math.round(safeNum(bestEverTraits[t],1)*pct)));});
  return { id:Math.random().toString(36).slice(2,8).toUpperCase(), generation:state.generation, traits };
}

// ── ACTIONS ──────────────────────────────────────────────────
window.breedCycle=()=>{
  if(state.population.length<2) return addLog('Not enough creatures to breed.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const [pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
  _doBreed(pA,pB);
};

window.breedSelected=()=>{
  if(!safeNum(state.upgrades?.selective)) return addLog('Selective Breeding upgrade required.','warn');
  if(selectedForBreeding.length!==2) return addLog('Select exactly 2 creatures to breed.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const pA=state.population.find(c=>c.id===selectedForBreeding[0]);
  const pB=state.population.find(c=>c.id===selectedForBreeding[1]);
  if(!pA||!pB) return addLog('Selected creatures not found.','warn');
  selectedForBreeding=[];
  _doBreed(pA,pB,true);
};

function _doBreed(pA,pB,targeted=false){
  const child=makeCreature(pA,pB), fitness=calcFitness(child);
  state.population.push(child); state.generation++; state.totalBred++;
  const goldEarned=getBreedGold();
  state.gold+=goldEarned; state.totalGoldEarned+=goldEarned;
  if(safeNum(state.surgeBreedsRemaining)>0) state.surgeBreedsRemaining--;
  if(!state.firstCullDone) state.bredBeforeFirstCull=safeNum(state.bredBeforeFirstCull)+1;
  TRAIT_KEYS.forEach(t=>{ const v=safeNum(child.traits[t]); if(v>(bestEverTraits[t]||0)) bestEverTraits[t]=v; });

  // Research income
  const ry=researchBreedYield();
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  tickArchivists();
  checkEverBroke();

  const traitStr=TRAIT_ABR.map((a,i)=>`${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
  if(fitness>safeNum(state.highestFitness)){
    state.highestFitness=fitness;
    addLog(`${targeted?'TARGETED ':''}Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}! [${traitStr}]`,'highlight');
  } else {
    addLog(`${targeted?'Targeted — ':''}Gen ${fmt(state.generation)}: ${child.id} born [${traitStr}] → fitness ${fmt(fitness)}`);
  }
  checkMilestones(); renderAll();
}

window.cullWeakest=()=>{
  const minPop=2;
  if(state.population.length<=minPop) return addLog(`Population too small (min ${minPop}).`,'warn');
  state.population.forEach(c=>{c._f=calcFitness(c);});
  state.population.sort((a,b)=>a._f-b._f);
  const aboutToCull=state.population.slice(0,Math.min(getCullCount(),state.population.length-minPop));
  if(!state.culledOwnRecord&&state.highestFitness>0&&aboutToCull.some(c=>c._f>=state.highestFitness)) state.culledOwnRecord=true;
  const actualCull=Math.min(getCullCount(),state.population.length-minPop);
  let totalEarned=0; const names=[];
  for(let i=0;i<actualCull;i++){
    const c=state.population.shift();
    const earned=Math.max(1,2+Math.floor(safeNum(c._f)/2)+getCullBonus());
    state.gold+=earned; state.totalGoldEarned+=earned; totalEarned+=earned;
    state.totalCulled++; names.push(`${c.id}(${c._f})`);
  }
  state.firstCullDone=true;

  // Research income from culling
  const ry=researchCullYield()*actualCull;
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  checkEverBroke();

  addLog(actualCull===1?`Culled ${names[0]} — earned ${fmt(totalEarned)} gold.`:`Culled ${actualCull}: [${names.join(', ')}] — earned ${fmt(totalEarned)} gold.`,'warn');
  checkMilestones(); renderAll();
};

window.buyUpgrade=(id)=>{
  const def=GOLD_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} is already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.gold<cost) return addLog(`Need ${fmt(cost)} gold — you have ${fmt(state.gold)}.`,'warn');
  state.gold-=cost; state.upgrades[id]=lvl+1;
  checkEverBroke();
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`,'highlight');
  checkMilestones(); renderAll();
};

window.buyDiamondUpgrade=(id)=>{
  const def=DIAMOND_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} is already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.diamonds<cost) return addLog(`Need ${cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  state.diamonds-=cost; state.upgrades[id]=lvl+1;
  addLog(`💎 Purchased ${def.name} Lv ${state.upgrades[id]}.`,'diamond');
  checkMilestones(); renderAll();
};

window.buyConsumable=(id)=>{
  const def=DIAMOND_CONSUMABLES.find(c=>c.id===id); if(!def) return;
  if(state.diamonds<def.cost) return addLog(`Need ${def.cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  if(id==='geneBoost'){
    if(!state.population.length) return addLog('No creatures to boost.','warn');
    state.population.forEach(c=>{c._f=calcFitness(c);});
    const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
    const minVal=Math.min(...TRAIT_KEYS.map(t=>safeNum(top.traits[t])));
    const minT=TRAIT_KEYS.find(t=>safeNum(top.traits[t])===minVal);
    top.traits[minT]=Math.min(getTraitCap(),safeNum(top.traits[minT])+5);
    state.diamonds-=def.cost;
    addLog(`💎 Gene Boost: ${top.id}'s ${minT} +5 (now ${top.traits[minT]}).`,'diamond');
  } else if(id==='perfectClone'){
    if(!state.population.length) return addLog('No creatures to clone.','warn');
    if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
    state.population.forEach(c=>{c._f=calcFitness(c);});
    const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
    state.population.push({...top,id:Math.random().toString(36).slice(2,8).toUpperCase(),traits:{...top.traits},generation:state.generation});
    state.diamonds-=def.cost;
    addLog(`💎 Perfect Clone: copy of ${top.id} (fitness ${top._f}).`,'diamond');
  } else if(id==='evolutionSurge'){
    state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+25;
    state.surgeUseCount=safeNum(state.surgeUseCount)+1;
    state.diamonds-=def.cost;
    addLog(`💎 Evolution Surge: ${fmt(state.surgeBreedsRemaining)} supercharged breeds remaining.`,'diamond');
  } else if(id==='legendaryStock'){
    state.population=Array.from({length:5},()=>makeCreatureFromLegacy(0.9));
    state.usedLegendaryStock=true; state.diamonds-=def.cost;
    addLog(`💎 Legendary Stock: population reset with 90% legacy traits.`,'diamond');
  }
  checkMilestones(); renderAll();
};

window.hireResearcher=(id)=>{
  const def=RESEARCH_DEF.find(r=>r.id===id); if(!def) return;
  if(def.type==='unique'){
    if(state.research[id]) return addLog(`${def.name} already active.`,'warn');
    if(state.diamonds<def.cost) return addLog(`Need ${def.cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.cost; state.research[id]=true;
    addLog(`💎 ${def.name} now active — all research yield multiplied.`,'diamond');
  } else {
    const current=safeNum(state.research[id]);
    if(current>=def.max) return addLog(`${def.plural||def.name} are fully staffed (${def.max} max).`,'warn');
    if(state.diamonds<def.costEach) return addLog(`Need ${def.costEach} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.costEach; state.research[id]=current+1;
    addLog(`💎 Hired ${def.plural||def.name} ${current+1}/${def.max}.`,'diamond');
  }
  checkMilestones(); renderAll();
};

window.toggleSelect=(id)=>{
  const idx=selectedForBreeding.indexOf(id);
  if(idx>=0) selectedForBreeding.splice(idx,1);
  else { if(selectedForBreeding.length>=2) selectedForBreeding.shift(); selectedForBreeding.push(id); }
  renderPopulation();
};

function checkEverBroke(){
  if(!state.everBroke&&state.gold===0&&state.totalGoldEarned>=100) state.everBroke=true;
}

// ── MILESTONES ────────────────────────────────────────────────
function checkMilestones(){
  MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)) return;
    if(!m.check(state)) return;
    state.completedMilestones.push(m.id);
    const d=m.reward?.diamonds||0;
    if(d>0){ state.diamonds+=d; state.totalDiamondsEarned+=d; state.milestoneDiamondsAwarded.push(m.id); addLog(`💎 Milestone: "${m.name}" — ${m.rt}`,'diamond'); }
    else    { state.milestoneDiamondsAwarded.push(m.id); addLog(`✓ Milestone: "${m.name}"`,'highlight'); }
  });
}

function getNextMilestones(){
  return MILESTONES.filter(m=>!m.secret&&!state.completedMilestones.includes(m.id)&&m.pct)
    .map(m=>({...m,_pct:Math.min(1,m.pct(state))})).sort((a,b)=>b._pct-a._pct).slice(0,4);
}

// ── RENDER ────────────────────────────────────────────────────
function renderAll(){
  renderStats();
  if(currentTab==='population') renderPopulation();
  if(currentTab==='upgrades')   renderUpgrades();
  if(currentTab==='research')   renderResearch();
  if(currentTab==='milestones') renderMilestones();
}

function renderStats(){
  const best=state.population.reduce((m,c)=>{const f=calcFitness(c);return f>m?f:m;},0);
  document.getElementById('stat-gen').textContent      = fmt(safeNum(state.generation,1));
  document.getElementById('stat-pop').textContent      = `${fmt(state.population.length)} / ${fmt(getMaxPop())}`;
  document.getElementById('stat-gold').textContent     = fmt(state.gold);
  document.getElementById('stat-diamonds').textContent = `${fmt(state.diamonds)} 💎`;
  document.getElementById('stat-fitness').textContent  = best ? fmt(best) : '—';
  document.getElementById('stat-score').textContent    = calcScore().toLocaleString();
  document.getElementById('stat-bred').textContent     = fmt(state.totalBred);
  document.getElementById('stat-culled').textContent   = fmt(state.totalCulled);
}

function renderUpgrades(){
  const c=document.getElementById('upgrades-container'); if(!c) return;
  let html=`<p class="upgrades-section-title gold-title">// GOLD UPGRADES</p><div class="upgrade-grid">`;
  GOLD_UPGRADES.forEach(def=>{
    const lvl=safeNum(state.upgrades?.[def.id]),maxed=lvl>=def.levels.length;
    const pips=def.levels.map((_,i)=>`<div class="upgrade-pip ${i<lvl?'filled':i===lvl?'current':''}"></div>`).join('');
    if(maxed) html+=`<div class="upgrade-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed">[MAX]</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div></div>`;
    else {
      const next=def.levels[lvl],can=state.gold>=next.cost;
      html+=`<div class="upgrade-card"><div class="upgrade-card-name">${def.name}${lvl>0?` <span class="level-badge">[Lv${lvl}]</span>`:''}</div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div><div class="upgrade-card-next">▸ ${next.label}</div><button onclick="buyUpgrade('${def.id}')" ${can?'':'style="opacity:0.4;cursor:not-allowed"'}>[ BUY — ${fmt(next.cost)}g ]</button></div>`;
    }
  });
  html+=`</div><p class="upgrades-section-title diamond-title">// DIAMOND UPGRADES</p><div class="upgrade-grid">`;
  DIAMOND_UPGRADES.forEach(def=>{
    const lvl=safeNum(state.upgrades?.[def.id]),maxed=lvl>=def.levels.length;
    const pips=def.levels.map((_,i)=>`<div class="upgrade-pip ${i<lvl?'filled d':i===lvl?'current':''}"></div>`).join('');
    if(maxed) html+=`<div class="upgrade-card diamond-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed d">💎 MAX</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div></div>`;
    else {
      const next=def.levels[lvl],can=state.diamonds>=next.cost;
      html+=`<div class="upgrade-card diamond-card"><div class="upgrade-card-name">${def.name}${lvl>0?` <span class="level-badge">[Lv${lvl}]</span>`:''}</div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div><div class="upgrade-card-next diamond-next">▸ ${next.label}</div><button class="btn-diamond ${can?'':'cant-afford'}" onclick="buyDiamondUpgrade('${def.id}')">[ BUY — ${next.cost} 💎 ]</button></div>`;
    }
  });
  html+=`</div><p class="upgrades-section-title diamond-title">// DIAMOND SHOP</p><div class="upgrade-grid">`;
  DIAMOND_CONSUMABLES.forEach(item=>{
    const can=state.diamonds>=item.cost;
    html+=`<div class="shop-card"><div class="shop-card-name">💎 ${item.name}</div><div class="shop-card-desc">${item.desc}</div><div class="shop-card-effect">⟶ ${item.effect}</div><button class="btn-diamond ${can?'':'cant-afford'}" onclick="buyConsumable('${item.id}')">[ USE — ${item.cost} 💎 ]</button></div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderResearch(){
  const c=document.getElementById('research-container'); if(!c) return;
  const bRate=researchBreedYield(), cRate=researchCullYield(), aRate=researchArchYield(), mult=researchMult();
  const buf=safeNum(state.diamondBuffer);

  let html=`<p class="research-intro">Your research division studies your breeding programme, extracting genetic insights that crystallise into diamonds. Hire more staff to increase your passive income.</p>`;
  html+=`<div class="research-rates"><p class="research-rates-title">// CURRENT RATES</p>`;
  html+=`<div class="rate-row"><span>💎 per breed</span><span class="${bRate>0?'rate-val':'rate-zero'}">${fmtR(bRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per cull</span><span class="${cRate>0?'rate-val':'rate-zero'}">${fmtR(cRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per 25 gen</span><span class="${aRate>0?'rate-val':'rate-zero'}">${fmtR(aRate)}</span></div>`;
  if(mult>1) html+=`<div class="rate-row"><span>Multiplier</span><span class="rate-val">×${fmt1(mult)}</span></div>`;
  html+=`<div class="rate-row"><span>Total from research</span><span class="rate-val">${fmt(state.totalResearchDiamondsEarned)} 💎</span></div>`;
  if(buf>0) html+=`<p class="rate-buffer">Buffer: ${buf.toFixed(3)} 💎 accumulating…</p>`;
  html+=`</div>`;

  html+=`<p class="research-section-title">// RESEARCHERS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='stack').forEach(def=>{
    const current=safeNum(state.research?.[def.id]), maxed=current>=def.max;
    const can=!maxed&&state.diamonds>=def.costEach;
    const totalYield=current*(def.perBreed||def.perCull||def.perArchTick||0)*mult;
    html+=`<div class="research-card ${maxed?'research-maxed':''}">
      <div class="research-card-name">${def.plural||def.name}</div>
      <div class="research-card-count">${fmt(current)} / ${fmt(def.max)} hired${current>0?` — earning ${fmtR(totalYield)} 💎 total`:''}  </div>
      <div class="research-card-desc">${def.desc}</div>
      <div class="research-card-yield">⟶ ${def.yieldLine}</div>
      ${maxed?`<div class="research-maxed-label">FULLY STAFFED</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${def.costEach} 💎 each ]</button>`}
    </div>`;
  });
  html+=`</div><p class="research-section-title director-title">// RESEARCH DIRECTORS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='unique').forEach(def=>{
    const hired=!!state.research?.[def.id], can=!hired&&state.diamonds>=def.cost;
    html+=`<div class="research-card ${hired?'research-active':''}">
      <div class="research-card-name">${def.name}</div>
      <div class="research-card-desc">${def.desc}</div>
      <div class="research-card-yield">⟶ ${def.yieldLine}</div>
      ${hired?`<div class="research-active-label">✓ ACTIVE</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${def.cost} 💎 ]</button>`}
    </div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderPopulation(){
  const container=document.getElementById('population-table'); if(!container) return;
  const hasSel=safeNum(state.upgrades?.selective)>0;
  const sorted=[...state.population].map(c=>({...c,_f:calcFitness(c)})).sort((a,b)=>b._f-a._f);
  if(!sorted.length){container.innerHTML='<p class="empty-state">No creatures yet.</p>';return;}
  let html='';
  if(hasSel) html+=`<div class="pop-header"><span class="pop-hint">Click [ ☆ ] to select a breeding pair.</span><button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button></div>`;
  const surge=safeNum(state.surgeBreedsRemaining);
  if(surge>0) html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--diamond)">💎 Evolution Surge: ${fmt(surge)} breeds remaining.</p>`;
  html+=`<table><thead><tr>${hasSel?'<th></th>':''}<th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}</tr></thead><tbody>`;
  sorted.forEach((c,i)=>{
    const isTop=i===0,isBot=i===sorted.length-1&&sorted.length>2,isSel=selectedForBreeding.includes(c.id);
    const rowCls=isTop?'row-top':isBot?'row-bottom':isSel?'row-selected':'';
    html+=`<tr class="${rowCls}">`;
    if(hasSel) html+=`<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
    html+=`<td class="bright">${c.id}</td><td>${fmt(safeNum(c.generation,'?'))}</td><td class="fit-val">${fmt(c._f)}</td>`;
    TRAIT_KEYS.forEach(t=>{ const v=safeNum(c.traits[t]); html+=`<td class="${v>=40?'trait-hi':v>=20?'trait-mid':v<=3?'trait-lo':''}">${fmt(v)}</td>`; });
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  if(!hasSel) html+=`<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> (Upgrades tab) to hand-pick pairs.</p>`;
  container.innerHTML=html;
}

function renderMilestones(){
  const c=document.getElementById('milestones-container'); if(!c) return;
  const done=state.completedMilestones.length,total=MILESTONES.length;
  let html=`<p class="ms-total">Completed: <span>${fmt(done)} / ${fmt(total)}</span></p>`;
  const nextUp=getNextMilestones();
  if(nextUp.length){
    html+=`<p class="ms-section-title">// NEXT UP</p><div class="ms-nextup-grid">`;
    nextUp.forEach(m=>{
      const pv=Math.round(m._pct*100);
      html+=`<div class="ms-nextup-card"><div class="ms-nextup-name">${m.name}</div><div class="ms-nextup-desc">${m.desc}</div><div class="ms-nextup-bar"><div class="ms-nextup-fill" style="width:${pv}%"></div></div><div class="ms-nextup-foot"><span>${pv}%</span><span class="reward">${m.rt}</span></div></div>`;
    });
    html+=`</div>`;
  }
  MS_CATS.forEach(cat=>{
    const members=MILESTONES.filter(m=>m.cat===cat); if(!members.length) return;
    const isSecret=cat==='SECRETS';
    html+=`<p class="ms-section-title ${isSecret?'secret-title':''}">${isSecret?'// ??? SECRETS':`// ${cat}`}</p><div class="ms-grid">`;
    members.forEach(m=>{
      const isDone=state.completedMilestones.includes(m.id);
      if(m.secret&&!isDone){ html+=`<div class="ms-card ms-secret"><div class="ms-name">???</div><div class="ms-desc">Complete a secret condition to reveal.</div><div class="ms-reward">${m.rt}</div></div>`; return; }
      const cardCls=isDone?(m.secret?'ms-done-secret':'ms-done'):'';
      const checkCls=isDone?(m.secret?'secret-check':''):'';
      const pv=(!isDone&&m.pct)?Math.min(1,m.pct(state)):0;
      const pctBar=(!isDone&&m.pct)?`<div class="ms-progress-wrap"><div class="ms-progress-bar"><div class="ms-progress-fill" style="width:${Math.round(pv*100)}%"></div></div><div class="ms-progress-text">${Math.round(pv*100)}%</div></div>`:'';
      html+=`<div class="ms-card ${cardCls}">${isDone?`<div class="ms-check ${checkCls}">✓</div>`:''}<div class="ms-name">${m.name}</div><div class="ms-desc">${m.desc}</div>${pctBar}<div class="ms-reward ${!m.rt?'no-reward':''}">${m.rt}</div></div>`;
    });
    html+=`</div>`;
  });
  c.innerHTML=html;
}

window.renderLeaderboard=(entries,currentUid)=>{
  const c=document.getElementById('leaderboard-container'); if(!c) return;
  let html=`<div class="lb-header"><span class="lb-title">// LEADERBOARD</span><button class="lb-refresh" onclick="window.refreshLeaderboard&&window.refreshLeaderboard()">[ REFRESH ]</button></div><p class="lb-formula">Score = <span>fitness×200</span> + <span>gen×10</span> + <span>bred×3</span> + <span>culled×5</span> + <span>gold×1</span> + <span>💎×100</span></p>`;
  if(!entries?.length){html+=`<p class="lb-empty">No entries yet — save to appear here.</p>`;c.innerHTML=html;return;}
  html+=`<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>FITNESS</th><th>GEN</th></tr></thead><tbody>`;
  entries.forEach((e,i)=>{
    const rank=i+1,isYou=e.uid===currentUid;
    html+=`<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}"><td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td><td class="lb-name">${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}</td><td class="lb-score">${fmt(safeNum(e.score))}</td><td>${fmt(safeNum(e.highestFitness))}</td><td>${fmt(safeNum(e.generation))}</td></tr>`;
  });
  html+=`</tbody></table>`;c.innerHTML=html;
};
window.renderLeaderboardLoading=()=>{ const c=document.getElementById('leaderboard-container'); if(c) c.innerHTML='<p class="lb-loading">Loading leaderboard…</p>'; };

window.openUsernameModal=()=>{
  document.getElementById('username-modal').classList.remove('hidden');
  const inp=document.getElementById('username-input');
  if(window._currentUsername) inp.value=window._currentUsername;
  document.getElementById('username-message').textContent='';
};
window.skipUsername=()=>document.getElementById('username-modal').classList.add('hidden');

window.switchTab=(tab)=>{
  currentTab=tab;
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('#tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if(tab==='population') renderPopulation();
  if(tab==='upgrades')   renderUpgrades();
  if(tab==='research')   renderResearch();
  if(tab==='milestones') renderMilestones();
  if(tab==='leaderboard') window.refreshLeaderboard&&window.refreshLeaderboard();
};

window.addLog=(text,type='')=>{
  const el=document.getElementById('log-output'); if(!el) return;
  const div=document.createElement('div');
  div.className='log-entry'+(type?` ${type}`:''); div.textContent=`[${ts()}] ${text}`;
  el.prepend(div);
  while(el.children.length>200) el.removeChild(el.lastChild);
};

function ts(){ return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

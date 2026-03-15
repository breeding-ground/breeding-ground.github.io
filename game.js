'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════
const TRAIT_KEYS    = ['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR     = ['SPD','STR','STA','INT','RES'];
const TRAIT_MAX     = 50;
const POP_CAP_TABLE = [20,25,30,40,60,100];

const fmt  = n => safeNum(n).toLocaleString();
const fmt1 = n => safeNum(n).toFixed(1);
const fmtR = n => n===0?'—':safeNum(n).toFixed(2);

function safeNum(v,fallback=0){ const n=Number(v); return isFinite(n)?n:fallback; }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function bestSingleTrait(s){ return Math.max(0,...(s.population||[]).map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits?.[t]))))); }

// ═══════════════════════════════════════════════════════════
//  GOLD UPGRADES
// ═══════════════════════════════════════════════════════════
const GOLD_UPGRADES = [
  { id:'popCap',          name:'Expanded Habitat',    desc:'Raise the population cap.',
    levels:[{cost:60,label:'Lv1 — 20→25'},{cost:200,label:'Lv2 — 25→30'},{cost:600,label:'Lv3 — 30→40'},{cost:2000,label:'Lv4 — 40→60'},{cost:7000,label:'Lv5 — 60→100'}]},
  { id:'mutation',        name:'Mutation Boost',       desc:'Higher mutation rate and stronger positive mutations.',
    levels:[{cost:25,label:'Lv1 — 15%→25%'},{cost:75,label:'Lv2 — 25%→40%'},{cost:200,label:'Lv3 — 40%→60%'},{cost:600,label:'Lv4 — always beneficial'},{cost:2000,label:'Lv5 — two traits mutate'},{cost:8000,label:'Lv6 — double mutation bonus'}]},
  { id:'traitAmp',        name:'Trait Amplifier',      desc:"Offspring more likely to inherit the stronger parent's trait.",
    levels:[{cost:50,label:'Lv1 — 15% chance'},{cost:160,label:'Lv2 — 30%'},{cost:450,label:'Lv3 — 55%'},{cost:1400,label:'Lv4 — always stronger'},{cost:4500,label:'Lv5 — always stronger + 10% +1 bonus'}]},
  { id:'breedYield',      name:'Breeding Yield',       desc:'Earn more gold per offspring born.',
    levels:[{cost:30,label:'Lv1 — 3g/breed'},{cost:90,label:'Lv2 — 6g'},{cost:280,label:'Lv3 — 12g'},{cost:800,label:'Lv4 — 25g'},{cost:2500,label:'Lv5 — 50g'},{cost:8000,label:'Lv6 — 100g'}]},
  { id:'cullValue',       name:"Butcher's Eye",         desc:'Extract more gold when culling.',
    levels:[{cost:20,label:'Lv1 — +3g/cull'},{cost:55,label:'Lv2 — +7g'},{cost:150,label:'Lv3 — +15g'},{cost:450,label:'Lv4 — +30g'},{cost:1500,label:'Lv5 — +60g'},{cost:5000,label:'Lv6 — +120g'}]},
  { id:'genePool',        name:'Prime Stock',           desc:'Starter creatures spawn with higher base traits.',
    levels:[{cost:40,label:'Lv1 — up to 12'},{cost:120,label:'Lv2 — 4–16'},{cost:350,label:'Lv3 — 8–20'},{cost:1200,label:'Lv4 — 10–25'},{cost:4000,label:'Lv5 — 15–30'}]},
  { id:'selective',       name:'Selective Breeding',    desc:'Hand-pick your own breeding pairs.',
    levels:[{cost:40,label:'One-time — unlocks BREED SELECTED'}]},
  { id:'cullInsight',     name:'Culling Insight',       desc:'Cull multiple weak creatures in one action.',
    levels:[{cost:100,label:'Lv1 — cull 2'},{cost:350,label:'Lv2 — cull 3'},{cost:1200,label:'Lv3 — cull 5'},{cost:4000,label:'Lv4 — cull 8'},{cost:14000,label:'Lv5 — cull 12'}]},
  { id:'lineageMem',      name:'Lineage Memory',        desc:'Offspring can recall best-ever trait values.',
    levels:[{cost:150,label:'Lv1 — 5% per trait'},{cost:500,label:'Lv2 — 12%'},{cost:1800,label:'Lv3 — 25%'},{cost:6000,label:'Lv4 — 40%'},{cost:20000,label:'Lv5 — 60%'}]},
  { id:'hybridVigor',     name:'Hybrid Vigor',          desc:'Post-inheritance bonus to top traits.',
    levels:[{cost:80,label:'Lv1 — 10% +1'},{cost:300,label:'Lv2 — 22% +2 top 2'},{cost:1000,label:'Lv3 — 35% +3 top 2'},{cost:3500,label:'Lv4 — 50% all above avg'}]},
  { id:'adaptiveGenetics',name:'Adaptive Genetics',     desc:'Unlucky inherited traits nudged up toward parent average.',
    levels:[{cost:100,label:'Lv1 — 20% correct below avg'},{cost:400,label:'Lv2 — 45%'},{cost:1500,label:'Lv3 — 70%'},{cost:5000,label:'Lv4 — always corrects'}]},
];

// ═══════════════════════════════════════════════════════════
//  DIAMOND UPGRADES & CONSUMABLES
// ═══════════════════════════════════════════════════════════
const DIAMOND_UPGRADES = [
  { id:'traitCapBoost', name:'Apex Refinement',  desc:`Raises trait ceiling beyond ${TRAIT_MAX}.`,
    levels:[{cost:10,label:`Lv1 — cap →${TRAIT_MAX+5}`},{cost:20,label:`Lv2 — cap →${TRAIT_MAX+10}`},{cost:35,label:`Lv3 — cap →${TRAIT_MAX+20}`},{cost:60,label:`Lv4 — cap →${TRAIT_MAX+35}`}]},
  { id:'eliteMutation', name:'Elite Mutation',   desc:'Reduces mutation resistance on high traits.',
    levels:[{cost:8,label:'Lv1 — halves resistance ≥30'},{cost:18,label:'Lv2 — removes resistance'},{cost:40,label:'Lv3 — high traits also get guaranteed +1 bonus'}]},
  { id:'dynastyBlood',  name:'Dynasty Blood',    desc:'Starters inherit a fraction of best-ever trait values.',
    levels:[{cost:12,label:'Lv1 — 25% of best-ever'},{cost:25,label:'Lv2 — 50%'},{cost:40,label:'Lv3 — 75%'},{cost:70,label:'Lv4 — 90%'}]},
  { id:'deepArchive',   name:'Deep Archive',     desc:'Lineage Memory recalls best value + a bonus.',
    levels:[{cost:15,label:'Lv1 — recall best+1'},{cost:35,label:'Lv2 — recall best+2'}]},
];

const DIAMOND_CONSUMABLES = [
  {id:'geneBoost',     name:'Gene Boost',      cost:2,  desc:"+5 to top creature's weakest trait.",       effect:'+5 to weakest trait of best creature'},
  {id:'perfectClone',  name:'Perfect Clone',   cost:5,  desc:'Duplicate your highest-fitness creature.',  effect:'Clone your top creature'},
  {id:'evolutionSurge',name:'Evolution Surge', cost:8,  desc:'Doubles mutation rate for 25 breeds.',      effect:'+25 surge breeds'},
  {id:'legendaryStock',name:'Legendary Stock', cost:30, desc:'Reset population with 90% legacy traits.',  effect:'Full reset with legacy DNA'},
];

// ═══════════════════════════════════════════════════════════
//  RESEARCH DIVISION
// ═══════════════════════════════════════════════════════════
const RESEARCH_DEF = [
  {id:'labInterns',        type:'stack', name:'Lab Intern',       plural:'Lab Interns',         desc:'Document genetic outcomes from each breeding event.',      yieldLine:'Each earns 0.15 💎 per breed',      costEach:2,  max:20, perBreed:0.15},
  {id:'geneAnalysts',      type:'stack', name:'Gene Analyst',     plural:'Gene Analysts',       desc:'Extract sequences from culled specimens.',                 yieldLine:'Each earns 0.4 💎 per cull',        costEach:5,  max:10, perCull:0.4},
  {id:'lineageArchivists', type:'stack', name:'Lineage Archivist',plural:'Lineage Archivists',  desc:'Mine generational records every 25 generations.',          yieldLine:'Each earns 1 💎 per 25 generations',costEach:15, max:5,  perArchTick:1.0},
  {id:'headOfResearch',    type:'unique',name:'Head of Research', desc:'Seasoned director — multiplies all research output ×1.5.', yieldLine:'Multiplies all research yield ×1.5', cost:35},
  {id:'automatedSequencer',type:'unique',name:'Automated Sequencer',desc:'State-of-the-art hardware — all research output doubled.',  yieldLine:'Multiplies all research yield ×2',   cost:75},
];

// ═══════════════════════════════════════════════════════════
//  MILESTONE TRACKS
//  Each track shows as ONE card that updates tier by tier.
// ═══════════════════════════════════════════════════════════
const MILESTONE_TRACKS = [
  { id:'breeding', name:'BREEDING',
    val:s=>s.totalBred, unit:'bred',
    tiers:[
      {id:'q_first_breed', name:'First Steps',      target:1,       diamonds:1},
      {id:'m_bred_10',     name:'Beginner',          target:10,      diamonds:1},
      {id:'mt_bred_25',    name:'Apprentice',        target:25,      diamonds:1},
      {id:'m_bred_50',     name:'Journeyman',        target:50,      diamonds:2},
      {id:'mt_bred_100',   name:'Veteran',           target:100,     diamonds:2},
      {id:'mt_bred_250',   name:'Expert',            target:250,     diamonds:3},
      {id:'m_bred_500',    name:'Master Breeder',    target:500,     diamonds:3},
      {id:'q_bred_1000',   name:'Grandmaster',       target:1000,    diamonds:4},
      {id:'mt_bred_2500',  name:'Prolific',          target:2500,    diamonds:5},
      {id:'m_bred_5000',   name:'The Factory',       target:5000,    diamonds:6},
      {id:'mt_bred_10000', name:'Industrial Scale',  target:10000,   diamonds:8},
      {id:'mt_bred_25000', name:'Unstoppable',       target:25000,   diamonds:10},
      {id:'mt_bred_50000', name:'Eternal Forge',     target:50000,   diamonds:15},
    ]},
  { id:'culling', name:'CULLING',
    val:s=>s.totalCulled, unit:'culled',
    tiers:[
      {id:'q_first_cull',  name:'Culling Season',   target:1,       diamonds:1},
      {id:'mt_cull_5',     name:'Getting Started',  target:5,       diamonds:1},
      {id:'m_cull_10',     name:'Selective',        target:10,      diamonds:1},
      {id:'mt_cull_25',    name:'Efficient',        target:25,      diamonds:2},
      {id:'q_cull_50',     name:'Ruthless',         target:50,      diamonds:2},
      {id:'mt_cull_100',   name:'Merciless',        target:100,     diamonds:3},
      {id:'mt_cull_250',   name:'Purifier',         target:250,     diamonds:3},
      {id:'q_cull_500',    name:'Extinction Event', target:500,     diamonds:4},
      {id:'mt_cull_1000',  name:'The Cleansing',    target:1000,    diamonds:5},
      {id:'mt_cull_2500',  name:'Mass Culling',     target:2500,    diamonds:6},
      {id:'mt_cull_5000',  name:'The Great Purge',  target:5000,    diamonds:8},
      {id:'mt_cull_10000', name:'World Ender',      target:10000,   diamonds:10},
      {id:'mt_cull_25000', name:'Inevitable',       target:25000,   diamonds:15},
    ]},
  { id:'generations', name:'GENERATIONS',
    val:s=>s.generation, unit:'generations',
    tiers:[
      {id:'mt_gen_10',      name:'First Wave',       target:10,      diamonds:1},
      {id:'mt_gen_25',      name:'Getting Going',    target:25,      diamonds:1},
      {id:'m_gen_50',       name:'Half Century',     target:50,      diamonds:1},
      {id:'q_gen_100',      name:'Century',          target:100,     diamonds:2},
      {id:'mt_gen_200',     name:'Bicentennial',     target:200,     diamonds:2},
      {id:'q_gen_500',      name:'Five Hundred',     target:500,     diamonds:3},
      {id:'q_gen_1000',     name:'Millennium',       target:1000,    diamonds:4},
      {id:'mt_gen_2000',    name:'Two Thousand',     target:2000,    diamonds:4},
      {id:'q_gen_5000',     name:'The Long Game',    target:5000,    diamonds:5},
      {id:'q_gen_10000',    name:'Eternal Lineage',  target:10000,   diamonds:6},
      {id:'mt_gen_25000',   name:'Ancient Dynasty',  target:25000,   diamonds:8},
      {id:'mt_gen_50000',   name:'Timeless',         target:50000,   diamonds:12},
    ]},
  { id:'fitness', name:'FITNESS',
    val:s=>s.highestFitness, unit:'max fitness',
    tiers:[
      {id:'mt_fit_5',       name:'First Spark',      target:5,       diamonds:1},
      {id:'q_fitness_10',   name:'Fitness Fanatic',  target:10,      diamonds:1},
      {id:'q_fitness_15',   name:'Strong Bloodline', target:15,      diamonds:1},
      {id:'q_fitness_20',   name:'Elite Lineage',    target:20,      diamonds:2},
      {id:'mt_fit_25',      name:'Champion',         target:25,      diamonds:3},
      {id:'q_fitness_30',   name:'Apex Lineage',     target:30,      diamonds:3},
      {id:'mt_fit_35',      name:'Legendary',        target:35,      diamonds:4},
      {id:'q_fitness_40',   name:'Transcendent',     target:40,      diamonds:5},
      {id:'mt_fit_45',      name:'Ascended',         target:45,      diamonds:6},
      {id:'q_fitness_50',   name:'God Complex',      target:50,      diamonds:8},
      {id:'mt_fit_60',      name:'Beyond Mortal',    target:60,      diamonds:12},
      {id:'mt_fit_75',      name:'Absolute',         target:75,      diamonds:18},
    ]},
  { id:'traits', name:'TRAITS',
    val:s=>bestSingleTrait(s), unit:'best trait',
    tiers:[
      {id:'mt_tr_5',        name:'Hint of Potential',target:5,       diamonds:1},
      {id:'q_trait_10',     name:'Promising Stock',  target:10,      diamonds:1},
      {id:'mt_tr_15',       name:'Notable',          target:15,      diamonds:1},
      {id:'q_trait_20',     name:'Perfect Gene',     target:20,      diamonds:2},
      {id:'mt_tr_25',       name:'Exceptional',      target:25,      diamonds:3},
      {id:'mt_tr_30',       name:'Superior',         target:30,      diamonds:3},
      {id:'q_trait_35',     name:'Beyond Normal',    target:35,      diamonds:4},
      {id:'mt_tr_40',       name:'Extraordinary',    target:40,      diamonds:5},
      {id:'q_trait_50',     name:'Theoretical Limit',target:50,      diamonds:6},
      {id:'mt_tr_60',       name:'Past the Cap',     target:60,      diamonds:10},
      {id:'mt_tr_70',       name:'Impossible',       target:70,      diamonds:15},
      {id:'mt_tr_85',       name:'Transcendent Gene',target:85,      diamonds:20},
    ]},
  { id:'gold', name:'GOLD EARNED',
    val:s=>s.totalGoldEarned, unit:'total gold',
    tiers:[
      {id:'m_gold_50',      name:'Prospector',       target:50,      diamonds:1},
      {id:'m_gold_250',     name:'Goldsmith',        target:250,     diamonds:1},
      {id:'m_gold_1000',    name:'Comfortable',      target:1000,    diamonds:1},
      {id:'m_gold_5000',    name:'Well Off',         target:5000,    diamonds:2},
      {id:'m_gold_20000',   name:'Wealthy',          target:20000,   diamonds:2},
      {id:'mt_gold_75000',  name:'Rich',             target:75000,   diamonds:3},
      {id:'mt_gold_250000', name:'Magnate',          target:250000,  diamonds:4},
      {id:'mt_gold_1m',     name:'Tycoon',           target:1000000, diamonds:5},
      {id:'mt_gold_5m',     name:'Industrialist',    target:5000000, diamonds:8},
      {id:'mt_gold_20m',    name:'Mogul',            target:20000000,diamonds:12},
    ]},
  { id:'diamonds', name:'DIAMONDS EARNED',
    val:s=>s.totalDiamondsEarned, unit:'total diamonds',
    tiers:[
      {id:'m_dia_1',        name:'First Jewel',      target:1,       diamonds:0},
      {id:'m_dia_5',        name:'Sparkle',          target:5,       diamonds:1},
      {id:'m_dia_10',       name:'Gem Collector',    target:10,      diamonds:1},
      {id:'m_dia_25',       name:'Jeweller',         target:25,      diamonds:1},
      {id:'m_dia_50',       name:'Hoarder',          target:50,      diamonds:2},
      {id:'m_dia_100',      name:'Diamond Mine',     target:100,     diamonds:2},
      {id:'m_dia_250',      name:'Baron',            target:250,     diamonds:3},
      {id:'m_dia_500',      name:'Mogul',            target:500,     diamonds:4},
      {id:'m_dia_1000',     name:'Diamond Empire',   target:1000,    diamonds:5},
      {id:'m_dia_2500',     name:'Diamond Dynasty',  target:2500,    diamonds:8},
      {id:'m_dia_10000',    name:'Diamond God',      target:10000,   diamonds:15},
    ]},
  { id:'population', name:'POPULATION',
    val:s=>safeNum(s.maxPopEver,s.population.length), unit:'max alive at once',
    tiers:[
      {id:'mt_pop_5',       name:'Small Group',      target:5,       diamonds:1},
      {id:'q_pop_8',        name:'Growing',          target:8,       diamonds:1},
      {id:'mt_pop_12',      name:'Cluster',          target:12,      diamonds:1},
      {id:'mt_pop_20',      name:'Colony',           target:20,      diamonds:2},
      {id:'mt_pop_30',      name:'Settlement',       target:30,      diamonds:2},
      {id:'mt_pop_40',      name:'Commune',          target:40,      diamonds:3},
      {id:'mt_pop_60',      name:'Township',         target:60,      diamonds:4},
      {id:'mt_pop_100',     name:'City',             target:100,     diamonds:6},
    ]},
  { id:'upgrades', name:'UPGRADES',
    val:s=>GOLD_UPGRADES.reduce((sum,def)=>sum+safeNum(s.upgrades?.[def.id]),0), unit:'total gold upgrade levels',
    tiers:[
      {id:'q_first_upgrade',name:'First Investment', target:1,       diamonds:1},
      {id:'mt_upg_5',       name:'Invested',         target:5,       diamonds:1},
      {id:'mt_upg_15',      name:'Committed',        target:15,      diamonds:2},
      {id:'mt_upg_25',      name:'Dedicated',        target:25,      diamonds:3},
      {id:'mt_upg_35',      name:'Obsessed',         target:35,      diamonds:4},
      {id:'mt_upg_45',      name:'Expert',           target:45,      diamonds:5},
      {id:'mt_upg_52',      name:'Gold Maxed',       target:52,      diamonds:8},
    ]},
  { id:'research', name:'RESEARCH',
    val:s=>safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0),
    unit:'total researchers',
    tiers:[
      {id:'m_first_researcher',name:'Research Initiative',target:1,  diamonds:1},
      {id:'mt_res_3',          name:'Growing Team',        target:3,  diamonds:1},
      {id:'mt_res_8',          name:'Division',            target:8,  diamonds:2},
      {id:'mt_res_15',         name:'Department',          target:15, diamonds:3},
      {id:'mt_res_25',         name:'Full Lab',            target:25, diamonds:4},
      {id:'mt_res_37',         name:'Complete Division',   target:37, diamonds:6},
    ]},
];

// ── SECRET milestones (stay as individual cards) ─────────────
const SECRET_MILESTONES = [
  {id:'m_secret_gen69',      name:'Nice.',                  check:s=>s.generation>=69,                  diamonds:1},
  {id:'m_secret_broke',      name:'Broke',                  check:s=>s.everBroke===true,                diamonds:1},
  {id:'m_secret_balanced',   name:'Perfectly Balanced',     check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));return Math.max(...v)-Math.min(...v)<=2;}), diamonds:2},
  {id:'m_secret_bottleneck', name:'Bottleneck',             check:s=>s.population.length===2&&s.generation>50, diamonds:2},
  {id:'m_secret_betrayal',   name:'The Betrayal',           check:s=>s.culledOwnRecord===true,          diamonds:3},
  {id:'m_secret_surge3',     name:'Surge Addict',           check:s=>safeNum(s.surgeUseCount)>=3,       diamonds:2},
  {id:'m_secret_legendary',  name:'New Era',                check:s=>s.usedLegendaryStock===true,       diamonds:3},
  {id:'m_secret_jekyll',     name:'Jekyll & Hyde',          check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));const mn=Math.min(...v);return mn>0&&Math.max(...v)>=mn*3;}), diamonds:2},
  {id:'m_secret_fullhouse',  name:'Standing Room Only',     check:s=>s.population.length>=(POP_CAP_TABLE[safeNum(s.upgrades?.popCap)]??20), diamonds:2},
  {id:'m_secret_username',   name:'Somebody',               check:s=>s.hasSetUsername===true,           diamonds:1},
  {id:'m_secret_hoard',      name:"Dragon's Hoard",         check:s=>s.diamonds>=25,                    diamonds:2},
  {id:'m_secret_enlightened',name:'Enlightened',            check:s=>['traitCapBoost','eliteMutation','dynastyBlood','deepArchive'].some(u=>safeNum(s.upgrades?.[u])>0), diamonds:2},
  {id:'m_secret_blink',      name:'Blink and You Miss It',  check:s=>s.bredBeforeFirstCull>=5,          diamonds:1},
  {id:'m_secret_palindrome', name:'Palindrome',             check:s=>s.population.some(c=>safeNum(c.traits.speed)===safeNum(c.traits.resilience)&&safeNum(c.traits.strength)===safeNum(c.traits.intelligence)), diamonds:2},
  {id:'m_secret_employer',   name:'Employer of the Year',   check:s=>safeNum(s.research?.labInterns)>0&&safeNum(s.research?.geneAnalysts)>0&&safeNum(s.research?.lineageArchivists)>0, diamonds:3},
  {id:'m_secret_fulllab',    name:'Full Lab',               check:s=>safeNum(s.research?.labInterns)>=20&&safeNum(s.research?.geneAnalysts)>=10&&safeNum(s.research?.lineageArchivists)>=5, diamonds:5},
];

// ═══════════════════════════════════════════════════════════
//  GENE VAULT
// ═══════════════════════════════════════════════════════════
function addDia(n){ state.diamonds+=n; state.totalDiamondsEarned+=n; }
function addGold(n){ state.gold+=n; state.totalGoldEarned+=n; }

const GENE_VAULT_BOXES = [
  {
    id:'field', name:'Starter Culture', cssClass:'vc-field',
    cost:1000, opened:'boxOpened_field',
    desc:'Basic genetic samples from field collection. Modest yields, reliable contents.',
    preview:['💎 Diamonds','💰 Gold reserves','⚡ Surge charges','🧬 Trait injection'],
    rewards:[
      {weight:40, name:'Diamond Dust',      apply:()=>{ const d=rand(100,600);   addDia(d);  return `+${fmt(d)} 💎`; }},
      {weight:30, name:'Gold Sample',       apply:()=>{ const g=rand(2000,15000);addGold(g); return `+${fmt(g)} gold`; }},
      {weight:18, name:'Surge Vial',        apply:()=>{ state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+15; return '+15 surge charges'; }},
      {weight:10, name:'Trait Serum',       apply:()=>{
        if(!state.population.length) return 'No creatures to boost (trait serum wasted)';
        state.population.forEach(c=>{c._f=calcFitness(c);});
        const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
        const minV=Math.min(...TRAIT_KEYS.map(t=>safeNum(top.traits[t])));
        const minT=TRAIT_KEYS.find(t=>safeNum(top.traits[t])===minV);
        top.traits[minT]=Math.min(getTraitCap(),safeNum(top.traits[minT])+4);
        return `+4 ${minT} on ${top.id}`; }},
      {weight:2,  name:'Dense Vein',        apply:()=>{ const d=rand(500,1500);  addDia(d);  return `+${fmt(d)} 💎 ✦ rare!`; }},
    ]
  },
  {
    id:'research', name:'Research Extract', cssClass:'vc-research',
    cost:5000, opened:'boxOpened_research',
    desc:'Refined extracts from the laboratory. Higher concentrations, greater potential.',
    preview:['💎 Diamond cache','💰 Gold vault','⚡ Surge battery','🧬 Dual serum','🐾 Clone fragment'],
    rewards:[
      {weight:35, name:'Diamond Cache',     apply:()=>{ const d=rand(800,4000);    addDia(d);  return `+${fmt(d)} 💎`; }},
      {weight:28, name:'Gold Reserve',      apply:()=>{ const g=rand(20000,100000);addGold(g); return `+${fmt(g)} gold`; }},
      {weight:18, name:'Surge Battery',     apply:()=>{ state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+35; return '+35 surge charges'; }},
      {weight:12, name:'Dual Serum',        apply:()=>{
        if(!state.population.length) return 'No creatures found';
        state.population.forEach(c=>{c._f=calcFitness(c);});
        const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
        const sorted=[...TRAIT_KEYS].sort((a,b)=>safeNum(top.traits[a])-safeNum(top.traits[b]));
        const boosted=[sorted[0],sorted[1]].map(t=>{ top.traits[t]=Math.min(getTraitCap(),safeNum(top.traits[t])+5); return t; });
        return `+5 to ${boosted.join(' & ')} on ${top.id}`; }},
      {weight:5,  name:'Clone Fragment',    apply:()=>{
        if(!state.population.length||state.population.length>=getMaxPop()) return 'Clone failed — population issue';
        state.population.forEach(c=>{c._f=calcFitness(c);});
        const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
        state.population.push({...top,id:Math.random().toString(36).slice(2,8).toUpperCase(),traits:{...top.traits},generation:state.generation});
        return `Cloned ${top.id} (fitness ${top._f})`; }},
      {weight:2,  name:'Rich Seam',         apply:()=>{ const d=rand(3000,10000); addDia(d);  return `+${fmt(d)} 💎 ✦ rare!`; }},
    ]
  },
  {
    id:'prime', name:'Prime Sequence', cssClass:'vc-prime',
    cost:10000, opened:'boxOpened_prime',
    desc:'Elite genetic sequences from apex specimens. Rare and powerful effects.',
    preview:['💎 Major cache','💰 Treasury','⚡ Overcharge','🌿 Colony boost','🧬 Legacy pair'],
    rewards:[
      {weight:30, name:'Major Cache',       apply:()=>{ const d=rand(3000,15000);    addDia(d);  return `+${fmt(d)} 💎`; }},
      {weight:25, name:'Treasury',          apply:()=>{ const g=rand(100000,500000); addGold(g); return `+${fmt(g)} gold`; }},
      {weight:18, name:'Surge Overcharge',  apply:()=>{ state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+75; return '+75 surge charges'; }},
      {weight:15, name:'Colony Boost',      apply:()=>{
        state.population.forEach(c=>{
          TRAIT_KEYS.forEach(t=>{
            const minV=Math.min(...TRAIT_KEYS.map(k=>safeNum(c.traits[k])));
            const minT=TRAIT_KEYS.find(k=>safeNum(c.traits[k])===minV);
            c.traits[minT]=Math.min(getTraitCap(),safeNum(c.traits[minT])+3);
          });
        });
        return `+3 to lowest trait of all ${state.population.length} creatures`; }},
      {weight:9,  name:'Legacy Pair',       apply:()=>{
        const added=[];
        for(let i=0;i<2;i++){
          if(state.population.length<getMaxPop()){
            state.population.push(makeCreatureFromLegacy(0.85));
            added.push(state.population[state.population.length-1].id);
          }
        }
        return added.length?`Added legacy creatures: ${added.join(', ')}`:'Population full — legacy pair wasted'; }},
      {weight:3,  name:'Grand Vein',        apply:()=>{ const d=rand(10000,30000); addDia(d); return `+${fmt(d)} 💎 ✦✦ very rare!`; }},
    ]
  },
  {
    id:'legendary', name:'Apex Genome', cssClass:'vc-legendary',
    cost:20000, opened:'boxOpened_legendary',
    desc:'The pinnacle of genetic achievement. Contains the most powerful known effects.',
    preview:['💎 Legendary cache','💰 Grand treasury','⚡ Infinite surge','🌟 Perfect evolution','🐾 Mass cloning'],
    rewards:[
      {weight:25, name:'Legendary Cache',    apply:()=>{ const d=rand(12000,50000);      addDia(d);  return `+${fmt(d)} 💎`; }},
      {weight:22, name:'Grand Treasury',     apply:()=>{ const g=rand(500000,2500000);   addGold(g); return `+${fmt(g)} gold`; }},
      {weight:16, name:'Infinite Surge',     apply:()=>{ state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+150; return '+150 surge charges'; }},
      {weight:14, name:'Perfect Evolution',  apply:()=>{
        state.population.forEach(c=>{
          TRAIT_KEYS.forEach(t=>{ c.traits[t]=Math.min(getTraitCap(),safeNum(c.traits[t])+5); });
        });
        return `+5 to ALL traits of all ${state.population.length} creatures`; }},
      {weight:13, name:'Mass Cloning',       apply:()=>{
        state.population.forEach(c=>{c._f=calcFitness(c);});
        const top=[...state.population].sort((a,b)=>b._f-a._f).slice(0,3);
        const added=[];
        top.forEach(t=>{
          if(state.population.length<getMaxPop()){
            state.population.push({...t,id:Math.random().toString(36).slice(2,8).toUpperCase(),traits:{...t.traits},generation:state.generation});
            added.push(t.id);
          }
        });
        return added.length?`Cloned: ${added.join(', ')}`:'Population full'; }},
      {weight:8,  name:'Diamond Motherlode', apply:()=>{ const d=rand(40000,120000);     addDia(d);  return `+${fmt(d)} 💎 ✦✦✦ MOTHERLODE!`; }},
      {weight:2,  name:'THE JACKPOT',        apply:()=>{ const d=rand(200000,500000);    addDia(d);  return `+${fmt(d)} 💎 🎰 JACKPOT!!!`; }},
    ]
  },
];

function weightedRandom(rewards){
  const total=rewards.reduce((s,r)=>s+r.weight,0);
  let roll=Math.random()*total;
  for(const r of rewards){ roll-=r.weight; if(roll<=0) return r; }
  return rewards[rewards.length-1];
}

// ═══════════════════════════════════════════════════════════
//  LEGACY ID MAP (old saves → new tier IDs)
// ═══════════════════════════════════════════════════════════
const LEGACY_ID_MAP = {
  'a_genesis':null, 'a_bred_1':'q_first_breed', 'a_bred_10':'m_bred_10', 'a_bred_50':'m_bred_50',
  'a_bred_200':'mt_bred_250', 'a_bred_1000':'q_bred_1000', 'a_cull_1':'q_first_cull',
  'a_cull_10':'m_cull_10', 'a_cull_50':'q_cull_50', 'a_cull_150':'mt_cull_250', 'a_cull_500':'q_cull_500',
  'a_gold_50':'m_gold_50', 'a_gold_250':'m_gold_250', 'a_gold_1000':'m_gold_1000', 'a_gold_5000':'m_gold_5000',
  'a_gold_20000':'m_gold_20000', 'a_fit_10':'q_fitness_10', 'a_fit_20':'q_fitness_20',
  'a_fit_30':'q_fitness_30', 'a_fit_40':'q_fitness_40', 'a_fit_50':'q_fitness_50',
  'a_dia_1':'m_dia_1', 'a_dia_10':'m_dia_10', 'a_dia_30':'m_dia_25', 'a_dia_75':'m_dia_50',
  'a_gen_50':'m_gen_50', 'a_gen_100':'q_gen_100', 'a_gen_500':'q_gen_500',
  'a_gen_1000':'q_gen_1000', 'a_gen_5000':'q_gen_5000', 'a_gen_10000':'q_gen_10000',
  'a_pop_10':'mt_pop_12', 'a_pop_30':'mt_pop_30', 'a_pop_60':'mt_pop_60', 'a_pop_100':'mt_pop_100',
  // old flat milestones from previous version that had different IDs
  'q_cull_20':'mt_cull_25', 'q_cull_150':'mt_cull_250', 'q_pop_cap_max':'mt_upg_52',
  'q_gold_500':null, 'q_gold_2000':null, 'q_gold_10000':null, // removed (gold-held tiers)
  'm_research_5':'mt_res_8', 'm_research_20':'mt_res_25',
  'm_bred_5000':'m_bred_5000', 'q_bred_200':'mt_bred_250',
};

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
let bestEverTraits      = {};

function defaultState(){
  return {
    generation:1, population:[], gold:0, diamonds:0,
    totalBred:0, totalCulled:0, totalGoldEarned:0,
    totalDiamondsEarned:0, highestFitness:0, maxPopEver:0,
    completedMilestones:[], milestoneDiamondsAwarded:[],
    surgeBreedsRemaining:0,
    everBroke:false, culledOwnRecord:false, surgeUseCount:0,
    usedLegendaryStock:false, hasSetUsername:false,
    bredBeforeFirstCull:0, firstCullDone:false,
    diamondBuffer:0, lastArchivistGen:1, totalResearchDiamondsEarned:0,
    boxOpened_field:0, boxOpened_research:0, boxOpened_prime:0, boxOpened_legendary:0,
    vaultLastResult:null,
    research:{ labInterns:0, geneAnalysts:0, lineageArchivists:0, headOfResearch:false, automatedSequencer:false },
    upgrades:{
      popCap:0,mutation:0,traitAmp:0,breedYield:0,cullValue:0,genePool:0,
      selective:0,cullInsight:0,lineageMem:0,hybridVigor:0,adaptiveGenetics:0,
      traitCapBoost:0,eliteMutation:0,dynastyBlood:0,deepArchive:0,
    },
  };
}

// ── Derived helpers ──────────────────────────────────────────
function getMaxPop()    { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20; }
function getBreedGold() { return [1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1; }
function getCullBonus() { return [0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0; }
function getCullCount() { return [1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1; }
function getMutRate()   { return [0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15; }
function getMutBonus()  { return safeNum(state.upgrades?.mutation)>=6?2:1; }
function getAmpRate()   { return [0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0; }
function getAmpBonus()  { return safeNum(state.upgrades?.traitAmp)>=5; }
function getMemRate()   { return [0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0; }
function getMemBonus()  { return [0,1,2][safeNum(state.upgrades?.deepArchive)]??0; }
function getTraitCap()  { return TRAIT_MAX+([0,5,10,20,35][safeNum(state.upgrades?.traitCapBoost)]??0); }
function researchMult() { return (state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1); }
function researchBreedYield(){ return safeNum(state.research?.labInterns)*0.15*researchMult(); }
function researchCullYield() { return safeNum(state.research?.geneAnalysts)*0.4*researchMult(); }
function researchArchYield() { return safeNum(state.research?.lineageArchivists)*1.0*researchMult(); }

function migrateCrature(c){
  if(!c||typeof c!=='object') return null;
  const t=c.traits||{};
  return {
    id:c.id||Math.random().toString(36).slice(2,8).toUpperCase(), generation:safeNum(c.generation,1),
    traits:{
      speed:safeNum(t.speed,rand(1,8)), strength:safeNum(t.strength,rand(1,8)),
      stamina:safeNum(t.stamina,rand(1,8)), intelligence:safeNum(t.intelligence,rand(1,8)), resilience:safeNum(t.resilience,rand(1,8)),
    },
  };
}

function sanitiseState(s){
  return {
    ...s,
    generation:safeNum(s.generation,1), gold:safeNum(s.gold), diamonds:safeNum(s.diamonds),
    totalBred:safeNum(s.totalBred), totalCulled:safeNum(s.totalCulled),
    totalGoldEarned:safeNum(s.totalGoldEarned), totalDiamondsEarned:safeNum(s.totalDiamondsEarned),
    highestFitness:safeNum(s.highestFitness), maxPopEver:safeNum(s.maxPopEver),
    surgeBreedsRemaining:safeNum(s.surgeBreedsRemaining),
    diamondBuffer:safeNum(s.diamondBuffer), lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned),
    everBroke:!!s.everBroke, culledOwnRecord:!!s.culledOwnRecord,
    surgeUseCount:safeNum(s.surgeUseCount), usedLegendaryStock:!!s.usedLegendaryStock,
    hasSetUsername:!!s.hasSetUsername, bredBeforeFirstCull:safeNum(s.bredBeforeFirstCull), firstCullDone:!!s.firstCullDone,
    boxOpened_field:safeNum(s.boxOpened_field), boxOpened_research:safeNum(s.boxOpened_research),
    boxOpened_prime:safeNum(s.boxOpened_prime), boxOpened_legendary:safeNum(s.boxOpened_legendary),
    vaultLastResult:s.vaultLastResult||null,
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
  // Map old IDs to new IDs in completedMilestones
  const legacyIds=[...(state.completedQuests||[]),...(state.unlockedAchievements||[]),...(state.diamondQuestsRewarded||[])];
  legacyIds.forEach(oldId=>{
    if(state.completedMilestones.includes(oldId)) return; // already tracked
    const allIds=MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)).concat(SECRET_MILESTONES.map(m=>m.id));
    if(allIds.includes(oldId)){ state.completedMilestones.push(oldId); return; }
    const newId=LEGACY_ID_MAP[oldId];
    if(newId&&!state.completedMilestones.includes(newId)) state.completedMilestones.push(newId);
  });
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

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════════════════════
window.getSaveData = ()=>sanitiseState(state);

window.applySaveData = (data)=>{
  state=sanitiseState({...defaultState(),...data});
  selectedForBreeding=[];
  rebuildBestEverTraits();
  migrateLegacyProgress();
  checkMilestones(); // retroactive grants for new tiers
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

// ═══════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════
window.calcScore = ()=>Math.floor(
  safeNum(state.highestFitness)*200+safeNum(state.generation)*10+
  safeNum(state.totalBred)*3+safeNum(state.totalCulled)*5+
  safeNum(state.totalGoldEarned)*1+safeNum(state.totalDiamondsEarned)*100
);

// ═══════════════════════════════════════════════════════════
//  CREATURE HELPERS
// ═══════════════════════════════════════════════════════════
function calcFitness(c){ return Math.round(TRAIT_KEYS.reduce((s,t)=>s+safeNum(c.traits[t]),0)/TRAIT_KEYS.length); }

function inheritVal(va,vb,traitKey){
  va=safeNum(va,4); vb=safeNum(vb,4);
  const cap=getTraitCap();
  if(getMemRate()>0&&Math.random()<getMemRate()){
    return Math.max(1,Math.min(cap,safeNum(bestEverTraits[traitKey],Math.max(va,vb))+getMemBonus()));
  }
  const ampBase=(getAmpRate()>0&&Math.random()<getAmpRate())?Math.max(va,vb):(Math.random()<0.5?va:vb);
  const ampBonus=(getAmpBonus()&&Math.random()<0.1)?1:0;
  const parentAvg=(va+vb)/2;
  const agLvl=safeNum(state.upgrades?.adaptiveGenetics);
  const agRates=[0,0.2,0.45,0.70,1.0];
  let base=ampBase+ampBonus;
  if(agLvl>0&&base<parentAvg){ if(agLvl>=4||(Math.random()<(agRates[agLvl]||0))) base=Math.max(base,Math.floor(parentAvg)); }
  const alwaysPos=safeNum(state.upgrades?.mutation)>=4;
  const doubleMut=safeNum(state.upgrades?.mutation)>=5;
  const eliteLvl=safeNum(state.upgrades?.eliteMutation);
  let val=base;
  const applyMut=()=>{
    let res=base/cap;
    if(eliteLvl===1&&base>=30) res*=0.5;
    if(eliteLvl>=2) res=0;
    const eff=getMutRate()*(1-res*0.7);
    const boosted=safeNum(state.surgeBreedsRemaining)>0?Math.min(1,eff*2):eff;
    if(Math.random()<boosted){
      const dir=alwaysPos?1:(Math.random()<0.5?1:-1);
      const bonus=eliteLvl>=3&&base>=30?getMutBonus():1;
      val=Math.max(1,Math.min(cap,val+dir*bonus));
    }
  };
  applyMut(); if(doubleMut) applyMut();
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

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════
window.breedCycle=()=>{
  if(state.population.length<2) return addLog('Not enough creatures to breed.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const [pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
  _doBreed(pA,pB);
};

window.breedSelected=()=>{
  if(!safeNum(state.upgrades?.selective)) return addLog('Selective Breeding upgrade required.','warn');
  if(selectedForBreeding.length!==2) return addLog('Select exactly 2 creatures.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const pA=state.population.find(c=>c.id===selectedForBreeding[0]);
  const pB=state.population.find(c=>c.id===selectedForBreeding[1]);
  if(!pA||!pB) return addLog('Selected creatures not found.','warn');
  selectedForBreeding=[];
  _doBreed(pA,pB,true);
};

function _doBreed(pA,pB,targeted=false){
  const child=makeCreature(pA,pB),fitness=calcFitness(child);
  state.population.push(child); state.generation++; state.totalBred++;
  const ge=getBreedGold(); state.gold+=ge; state.totalGoldEarned+=ge;
  if(safeNum(state.surgeBreedsRemaining)>0) state.surgeBreedsRemaining--;
  if(!state.firstCullDone) state.bredBeforeFirstCull=safeNum(state.bredBeforeFirstCull)+1;
  TRAIT_KEYS.forEach(t=>{const v=safeNum(child.traits[t]);if(v>(bestEverTraits[t]||0)) bestEverTraits[t]=v;});
  if(state.population.length>safeNum(state.maxPopEver)) state.maxPopEver=state.population.length;
  const ry=researchBreedYield();
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  tickArchivists(); checkEverBroke();
  const ts2=TRAIT_ABR.map((a,i)=>`${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
  if(fitness>safeNum(state.highestFitness)){
    state.highestFitness=fitness;
    addLog(`${targeted?'TARGETED ':''}Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}! [${ts2}]`,'highlight');
  } else {
    addLog(`${targeted?'Targeted — ':''}Gen ${fmt(state.generation)}: ${child.id} born [${ts2}] → fitness ${fmt(fitness)}`);
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
    state.gold+=earned; state.totalGoldEarned+=earned; totalEarned+=earned; state.totalCulled++; names.push(`${c.id}(${c._f})`);
  }
  state.firstCullDone=true;
  const ry=researchCullYield()*actualCull;
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  checkEverBroke();
  addLog(actualCull===1?`Culled ${names[0]} — earned ${fmt(totalEarned)} gold.`:`Culled ${actualCull}: [${names.join(', ')}] — earned ${fmt(totalEarned)} gold.`,'warn');
  checkMilestones(); renderAll();
};

window.buyUpgrade=(id)=>{
  const def=GOLD_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.gold<cost) return addLog(`Need ${fmt(cost)} gold — you have ${fmt(state.gold)}.`,'warn');
  state.gold-=cost; state.upgrades[id]=lvl+1; checkEverBroke();
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`,'highlight');
  checkMilestones(); renderAll();
};

window.buyDiamondUpgrade=(id)=>{
  const def=DIAMOND_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} already maxed.`,'warn');
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
    if(!state.population.length) return addLog('No creatures.','warn');
    state.population.forEach(c=>{c._f=calcFitness(c);});
    const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
    const minV=Math.min(...TRAIT_KEYS.map(t=>safeNum(top.traits[t])));
    const minT=TRAIT_KEYS.find(t=>safeNum(top.traits[t])===minV);
    top.traits[minT]=Math.min(getTraitCap(),safeNum(top.traits[minT])+5);
    state.diamonds-=def.cost; addLog(`💎 Gene Boost: ${top.id}'s ${minT} +5 (now ${top.traits[minT]}).`,'diamond');
  } else if(id==='perfectClone'){
    if(!state.population.length||state.population.length>=getMaxPop()) return addLog('Cannot clone.','warn');
    state.population.forEach(c=>{c._f=calcFitness(c);});
    const top=[...state.population].sort((a,b)=>b._f-a._f)[0];
    state.population.push({...top,id:Math.random().toString(36).slice(2,8).toUpperCase(),traits:{...top.traits},generation:state.generation});
    state.diamonds-=def.cost; addLog(`💎 Cloned ${top.id} (fitness ${top._f}).`,'diamond');
  } else if(id==='evolutionSurge'){
    state.surgeBreedsRemaining=safeNum(state.surgeBreedsRemaining)+25;
    state.surgeUseCount=safeNum(state.surgeUseCount)+1;
    state.diamonds-=def.cost; addLog(`💎 Evolution Surge: ${fmt(state.surgeBreedsRemaining)} breeds remaining.`,'diamond');
  } else if(id==='legendaryStock'){
    state.population=Array.from({length:5},()=>makeCreatureFromLegacy(0.9));
    state.usedLegendaryStock=true; state.diamonds-=def.cost;
    addLog(`💎 Legendary Stock: reset with 90% legacy traits.`,'diamond');
  }
  checkMilestones(); renderAll();
};

window.hireResearcher=(id)=>{
  const def=RESEARCH_DEF.find(r=>r.id===id); if(!def) return;
  if(def.type==='unique'){
    if(state.research[id]) return addLog(`${def.name} already active.`,'warn');
    if(state.diamonds<def.cost) return addLog(`Need ${def.cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.cost; state.research[id]=true;
    addLog(`💎 ${def.name} now active.`,'diamond');
  } else {
    const cur=safeNum(state.research[id]);
    if(cur>=def.max) return addLog(`${def.plural||def.name} fully staffed (${def.max} max).`,'warn');
    if(state.diamonds<def.costEach) return addLog(`Need ${def.costEach} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.costEach; state.research[id]=cur+1;
    addLog(`💎 Hired ${def.plural||def.name} ${cur+1}/${def.max}.`,'diamond');
  }
  checkMilestones(); renderAll();
};

window.openBox=(id)=>{
  const box=GENE_VAULT_BOXES.find(b=>b.id===id); if(!box) return;
  if(state.diamonds<box.cost) return addLog(`Need ${fmt(box.cost)} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  state.diamonds-=box.cost;
  const reward=weightedRandom(box.rewards);
  const result=reward.apply();
  state[box.opened]=safeNum(state[box.opened])+1;
  state.vaultLastResult={ boxName:box.name, rewardName:reward.name, desc:result, time:ts() };
  checkEverBroke();
  addLog(`💎 Gene Vault [${box.name}]: ${reward.name} — ${result}`,'diamond');
  checkMilestones(); renderAll();
  if(currentTab==='vault') renderGeneVault();
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

// ═══════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════
function checkMilestones(){
  // Track-based
  MILESTONE_TRACKS.forEach(track=>{
    const val=track.val(state);
    track.tiers.forEach(tier=>{
      if(state.completedMilestones.includes(tier.id)) return;
      if(val<tier.target) return;
      state.completedMilestones.push(tier.id);
      const d=tier.diamonds||0;
      if(d>0){
        state.diamonds+=d; state.totalDiamondsEarned+=d;
        state.milestoneDiamondsAwarded.push(tier.id);
        addLog(`💎 Milestone [${track.name}]: "${tier.name}" — +${d} 💎`,'diamond');
      } else {
        state.milestoneDiamondsAwarded.push(tier.id);
        addLog(`✓ Milestone [${track.name}]: "${tier.name}"`,'highlight');
      }
    });
  });
  // Secrets
  SECRET_MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)) return;
    if(!m.check(state)) return;
    state.completedMilestones.push(m.id);
    const d=m.diamonds||0;
    if(d>0){
      state.diamonds+=d; state.totalDiamondsEarned+=d;
      state.milestoneDiamondsAwarded.push(m.id);
      addLog(`💎 Secret: "${m.name}" — +${d} 💎`,'diamond');
    } else {
      state.milestoneDiamondsAwarded.push(m.id);
      addLog(`✓ Secret: "${m.name}"`,'highlight');
    }
  });
}

function getTrackProgress(track){
  const val=track.val(state);
  const completedIdx=track.tiers.reduce((hi,tier,i)=>state.completedMilestones.includes(tier.id)?i:hi,-1);
  const nextIdx=completedIdx+1<track.tiers.length?completedIdx+1:null;
  const currentTier=completedIdx>=0?track.tiers[completedIdx]:null;
  const nextTier=nextIdx!==null?track.tiers[nextIdx]:null;
  const pct=nextTier?Math.min(1,val/nextTier.target):(completedIdx>=0?1:0);
  return { val, completedIdx, totalTiers:track.tiers.length, currentTier, nextTier, pct };
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderAll(){
  renderStats();
  if(currentTab==='population') renderPopulation();
  if(currentTab==='upgrades')   renderUpgrades();
  if(currentTab==='research')   renderResearch();
  if(currentTab==='milestones') renderMilestones();
  if(currentTab==='vault')      renderGeneVault();
}

function renderStats(){
  const best=state.population.reduce((m,c)=>{const f=calcFitness(c);return f>m?f:m;},0);
  document.getElementById('stat-gen').textContent      = fmt(safeNum(state.generation,1));
  document.getElementById('stat-pop').textContent      = `${fmt(state.population.length)} / ${fmt(getMaxPop())}`;
  document.getElementById('stat-gold').textContent     = fmt(state.gold);
  document.getElementById('stat-diamonds').textContent = `${fmt(state.diamonds)} 💎`;
  document.getElementById('stat-fitness').textContent  = best?fmt(best):'—';
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
    if(maxed){ html+=`<div class="upgrade-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed">[MAX]</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div></div>`; }
    else {
      const next=def.levels[lvl],can=state.gold>=next.cost;
      html+=`<div class="upgrade-card"><div class="upgrade-card-name">${def.name}${lvl>0?` <span class="level-badge">[Lv${lvl}]</span>`:''}</div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div><div class="upgrade-card-next">▸ ${next.label}</div><button onclick="buyUpgrade('${def.id}')" ${can?'':'style="opacity:0.4;cursor:not-allowed"'}>[ BUY — ${fmt(next.cost)}g ]</button></div>`;
    }
  });
  html+=`</div><p class="upgrades-section-title diamond-title">// DIAMOND UPGRADES</p><div class="upgrade-grid">`;
  DIAMOND_UPGRADES.forEach(def=>{
    const lvl=safeNum(state.upgrades?.[def.id]),maxed=lvl>=def.levels.length;
    const pips=def.levels.map((_,i)=>`<div class="upgrade-pip ${i<lvl?'filled d':i===lvl?'current':''}"></div>`).join('');
    if(maxed){ html+=`<div class="upgrade-card diamond-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed d">💎 MAX</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div></div>`; }
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
  const bRate=researchBreedYield(),cRate=researchCullYield(),aRate=researchArchYield(),mult=researchMult();
  const buf=safeNum(state.diamondBuffer);
  let html=`<p class="research-intro">Your research division studies your breeding programme, extracting genetic insights that crystallise into diamonds.</p>`;
  html+=`<div class="research-rates"><p class="research-rates-title">// CURRENT RATES</p>`;
  html+=`<div class="rate-row"><span>💎 per breed</span><span class="${bRate>0?'rate-val':'rate-zero'}">${fmtR(bRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per cull</span><span class="${cRate>0?'rate-val':'rate-zero'}">${fmtR(cRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per 25 gen</span><span class="${aRate>0?'rate-val':'rate-zero'}">${fmtR(aRate)}</span></div>`;
  if(mult>1) html+=`<div class="rate-row"><span>Multiplier</span><span class="rate-val">×${fmt1(mult)}</span></div>`;
  html+=`<div class="rate-row"><span>Total earned from research</span><span class="rate-val">${fmt(state.totalResearchDiamondsEarned)} 💎</span></div>`;
  if(buf>0) html+=`<p class="rate-buffer">Buffer: ${buf.toFixed(3)} 💎 accumulating…</p>`;
  html+=`</div>`;
  html+=`<p class="research-section-title">// RESEARCHERS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='stack').forEach(def=>{
    const cur=safeNum(state.research?.[def.id]),maxed=cur>=def.max;
    const can=!maxed&&state.diamonds>=def.costEach;
    const totalY=cur*(def.perBreed||def.perCull||def.perArchTick||0)*mult;
    html+=`<div class="research-card ${maxed?'research-maxed':''}">
      <div class="research-card-name">${def.plural||def.name}</div>
      <div class="research-card-count">${fmt(cur)} / ${fmt(def.max)} hired${cur>0?` — ${fmtR(totalY)} 💎 total/event`:''}</div>
      <div class="research-card-desc">${def.desc}</div>
      <div class="research-card-yield">⟶ ${def.yieldLine}</div>
      ${maxed?`<div class="research-maxed-label">FULLY STAFFED</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${def.costEach} 💎 each ]</button>`}
    </div>`;
  });
  html+=`</div><p class="research-section-title director-title">// RESEARCH DIRECTORS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='unique').forEach(def=>{
    const hired=!!state.research?.[def.id],can=!hired&&state.diamonds>=def.cost;
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

function renderMilestones(){
  const c=document.getElementById('milestones-container'); if(!c) return;
  const allIds=[...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)];
  const done=allIds.filter(id=>state.completedMilestones.includes(id)).length;
  const total=allIds.length;
  let html=`<p class="ms-total">Completed: <span>${fmt(done)} / ${fmt(total)}</span></p>`;

  // Track cards
  MILESTONE_TRACKS.forEach(track=>{
    const prog=getTrackProgress(track);
    const completedN=prog.completedIdx+1;
    const allDone=completedN===prog.totalTiers;
    html+=`<p class="ms-cat-title">// ${track.name}</p><div class="track-grid">`;
    const cardCls=allDone?'tc-complete':completedN>0?'tc-active':'';
    const tierText=`${completedN} / ${prog.totalTiers}`;
    const currentName=prog.currentTier?prog.currentTier.name:'Not started';
    html+=`<div class="track-card ${cardCls}">`;
    html+=`<div class="track-header"><span class="track-name">${track.name}</span><span class="track-tier ${allDone?'all-done':''}">TIER ${tierText}</span></div>`;
    html+=`<div class="track-current-name">${currentName}</div>`;
    if(!allDone&&prog.nextTier){
      const pv=Math.round(prog.pct*100);
      const prevTarget=prog.currentTier?prog.currentTier.target:0;
      const rangeMin=prevTarget,rangeMax=prog.nextTier.target;
      html+=`<div class="track-next-name">→ ${prog.nextTier.name} at ${fmt(rangeMax)} ${track.unit}</div>`;
      html+=`<div class="track-prog-wrap">`;
      html+=`<div class="track-prog-bar"><div class="track-prog-fill" style="width:${pv}%"></div></div>`;
      html+=`<div class="track-prog-text"><span>${fmt(prog.val)} / ${fmt(rangeMax)}</span><span class="reward">${prog.nextTier.diamonds>0?prog.nextTier.diamonds+' 💎':''}</span></div>`;
      html+=`</div>`;
    } else if(allDone){
      html+=`<div class="track-complete-badge">✦ ALL TIERS COMPLETE</div>`;
    }
    // Dot row
    html+=`<div class="track-dots">`;
    track.tiers.forEach((_,i)=>{
      const filled=i<=prog.completedIdx;
      const current=i===prog.completedIdx+1;
      html+=`<div class="track-dot ${filled?'filled':current?'current':''}"></div>`;
    });
    html+=`</div></div></div>`;  // close card + grid
  });

  // Secrets
  html+=`<p class="ms-cat-title secret-title">// ??? SECRETS</p><div class="secret-grid">`;
  SECRET_MILESTONES.forEach(m=>{
    const isDone=state.completedMilestones.includes(m.id);
    if(!isDone){
      html+=`<div class="ms-card ms-secret"><div class="ms-name">???</div><div class="ms-desc">Complete a secret condition to reveal.</div><div class="ms-reward hidden-reward">${m.diamonds>0?m.diamonds+' 💎':''}</div></div>`;
    } else {
      html+=`<div class="ms-card ms-done-secret"><div class="ms-check secret-check">✓</div><div class="ms-name">${m.name}</div><div class="ms-reward">${m.diamonds>0?m.diamonds+' 💎':''}</div></div>`;
    }
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderGeneVault(){
  const c=document.getElementById('vault-container'); if(!c) return;
  let html=`<p class="vault-intro">The Gene Vault contains sealed genetic specimens of unknown origin. Each sample, when opened, releases its contents — for better or worse. No refunds. No guarantees.</p>`;
  const lr=state.vaultLastResult;
  if(lr){
    html+=`<div class="vault-result visible">
      <div class="vault-result-box">${lr.boxName} — ${lr.time}</div>
      <div class="vault-result-name">${lr.rewardName}</div>
      <div class="vault-result-desc">${lr.desc}</div>
    </div>`;
  }
  html+=`<div class="vault-grid">`;
  GENE_VAULT_BOXES.forEach(box=>{
    const can=state.diamonds>=box.cost;
    const opened=safeNum(state[box.opened]);
    html+=`<div class="vault-card ${box.cssClass}">
      <div class="vault-card-name">${box.name}</div>
      <div class="vault-card-cost">${fmt(box.cost)} 💎 to open</div>
      <div class="vault-card-desc">${box.desc}</div>
      <div class="vault-card-items">${box.preview.map(p=>`<div class="vault-card-item">• ${p}</div>`).join('')}</div>
      <div class="vault-card-opened">Opened: ${fmt(opened)} time${opened===1?'':'s'}</div>
      <button class="btn-diamond ${can?'':'cant-afford'}" onclick="openBox('${box.id}')">[ OPEN — ${fmt(box.cost)} 💎 ]</button>
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
    html+=`<tr class="${isTop?'row-top':isBot?'row-bottom':isSel?'row-selected':''}">`;
    if(hasSel) html+=`<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
    html+=`<td class="bright">${c.id}</td><td>${fmt(safeNum(c.generation,'?'))}</td><td class="fit-val">${fmt(c._f)}</td>`;
    TRAIT_KEYS.forEach(t=>{const v=safeNum(c.traits[t]);html+=`<td class="${v>=40?'trait-hi':v>=20?'trait-mid':v<=3?'trait-lo':''}">${fmt(v)}</td>`;});
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  if(!hasSel) html+=`<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> (Upgrades tab) to hand-pick pairs.</p>`;
  container.innerHTML=html;
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
window.renderLeaderboardLoading=()=>{const c=document.getElementById('leaderboard-container');if(c)c.innerHTML='<p class="lb-loading">Loading leaderboard…</p>';};

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
  if(tab==='vault')      renderGeneVault();
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

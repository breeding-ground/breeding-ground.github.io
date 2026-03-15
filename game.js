'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const TRAIT_KEYS    = ['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR     = ['SPD','STR','STA','INT','RES'];
const TRAIT_MAX     = 50;    // base cap; Apex Refinement raises this up to +75 = 125 max
const POP_CAP_TABLE = [20,25,30,40,60,100];
const PRIMES        = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47]);

const fmt  = n => safeNum(n).toLocaleString();
const fmt1 = n => safeNum(n).toFixed(1);
const fmtR = n => n===0?'—':safeNum(n).toFixed(2);
function safeNum(v,f=0){ const n=Number(v); return isFinite(n)?n:f; }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function bestSingleTrait(s){ return Math.max(0,...(s.population||[]).map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits?.[t]))))); }

// ═══════════════════════════════════════════════════════════
//  GOLD UPGRADES
// ═══════════════════════════════════════════════════════════
const GOLD_UPGRADES = [
  { id:'popCap',          name:'Expanded Habitat',    desc:'Raise the population cap.',
    levels:[{cost:60,label:'Lv1—20→25'},{cost:200,label:'Lv2—25→30'},{cost:600,label:'Lv3—30→40'},{cost:2000,label:'Lv4—40→60'},{cost:7000,label:'Lv5—60→100'}]},
  { id:'mutation',        name:'Mutation Boost',       desc:'Higher mutation rate and stronger positive mutations.',
    levels:[{cost:25,label:'Lv1—15%→25%'},{cost:75,label:'Lv2—25%→40%'},{cost:200,label:'Lv3—40%→60%'},{cost:600,label:'Lv4—always beneficial'},{cost:2000,label:'Lv5—two traits mutate'},{cost:8000,label:'Lv6—double mutation bonus'}]},
  { id:'traitAmp',        name:'Trait Amplifier',      desc:"Offspring more likely to inherit the stronger parent's trait.",
    levels:[{cost:50,label:'Lv1—15% chance'},{cost:160,label:'Lv2—30%'},{cost:450,label:'Lv3—55%'},{cost:1400,label:'Lv4—always stronger'},{cost:4500,label:'Lv5—always stronger +10% extra+1'}]},
  { id:'breedYield',      name:'Breeding Yield',       desc:'Earn more gold per offspring born.',
    levels:[{cost:30,label:'Lv1—3g/breed'},{cost:90,label:'Lv2—6g'},{cost:280,label:'Lv3—12g'},{cost:800,label:'Lv4—25g'},{cost:2500,label:'Lv5—50g'},{cost:8000,label:'Lv6—100g'}]},
  { id:'cullValue',       name:"Butcher's Eye",         desc:'Extract more gold when culling.',
    levels:[{cost:20,label:'Lv1—+3g/cull'},{cost:55,label:'Lv2—+7g'},{cost:150,label:'Lv3—+15g'},{cost:450,label:'Lv4—+30g'},{cost:1500,label:'Lv5—+60g'},{cost:5000,label:'Lv6—+120g'}]},
  { id:'genePool',        name:'Prime Stock',           desc:'Starter creatures spawn with higher base traits.',
    levels:[{cost:40,label:'Lv1—up to 12'},{cost:120,label:'Lv2—4–16'},{cost:350,label:'Lv3—8–20'},{cost:1200,label:'Lv4—10–25'},{cost:4000,label:'Lv5—15–30'}]},
  { id:'selective',       name:'Selective Breeding',    desc:'Hand-pick your own breeding pairs.',
    levels:[{cost:40,label:'One-time — unlocks BREED SELECTED'}]},
  { id:'cullInsight',     name:'Culling Insight',       desc:'Cull multiple weak creatures in one action.',
    levels:[{cost:100,label:'Lv1—cull 2'},{cost:350,label:'Lv2—cull 3'},{cost:1200,label:'Lv3—cull 5'},{cost:4000,label:'Lv4—cull 8'},{cost:14000,label:'Lv5—cull 12'}]},
  { id:'lineageMem',      name:'Lineage Memory',        desc:'Offspring can recall best-ever trait values.',
    levels:[{cost:150,label:'Lv1—5% per trait'},{cost:500,label:'Lv2—12%'},{cost:1800,label:'Lv3—25%'},{cost:6000,label:'Lv4—40%'},{cost:20000,label:'Lv5—60%'}]},
  { id:'hybridVigor',     name:'Hybrid Vigor',          desc:'Post-inheritance bonus chance to top traits.',
    levels:[{cost:80,label:'Lv1—10% +1'},{cost:300,label:'Lv2—22% +2 top 2'},{cost:1000,label:'Lv3—35% +3 top 2'},{cost:3500,label:'Lv4—50% all above avg'}]},
  { id:'adaptiveGenetics',name:'Adaptive Genetics',     desc:'Unlucky traits nudged toward parent average.',
    levels:[{cost:100,label:'Lv1—20%'},{cost:400,label:'Lv2—45%'},{cost:1500,label:'Lv3—70%'},{cost:5000,label:'Lv4—always corrects'}]},
];

// ═══════════════════════════════════════════════════════════
//  DIAMOND UPGRADES  (Apex Refinement now has 6 tiers → max trait 125)
// ═══════════════════════════════════════════════════════════
const DIAMOND_UPGRADES = [
  { id:'traitCapBoost', name:'Apex Refinement',
    desc:`Raises the trait ceiling toward 125. Base cap is ${TRAIT_MAX}.`,
    levels:[
      {cost:10,  label:`Lv1 — cap ${TRAIT_MAX} → ${TRAIT_MAX+5}`},
      {cost:20,  label:`Lv2 — cap → ${TRAIT_MAX+10}`},
      {cost:35,  label:`Lv3 — cap → ${TRAIT_MAX+20}`},
      {cost:60,  label:`Lv4 — cap → ${TRAIT_MAX+35}`},
      {cost:100, label:`Lv5 — cap → ${TRAIT_MAX+55}`},
      {cost:160, label:`Lv6 — cap → ${TRAIT_MAX+75} (MAX = 125)`},
    ]},
  { id:'eliteMutation', name:'Elite Mutation',
    desc:'Reduces mutation resistance on high traits.',
    levels:[{cost:8,label:'Lv1—halves resistance ≥30'},{cost:18,label:'Lv2—removes resistance'},{cost:40,label:'Lv3—guaranteed +1 on high traits'}]},
  { id:'dynastyBlood',  name:'Dynasty Blood',
    desc:'Starters inherit a fraction of your best-ever traits.',
    levels:[{cost:12,label:'Lv1—25% of best-ever'},{cost:25,label:'Lv2—50%'},{cost:40,label:'Lv3—75%'},{cost:70,label:'Lv4—90%'}]},
  { id:'deepArchive',   name:'Deep Archive',
    desc:'Lineage Memory recalls best value + a bonus.',
    levels:[{cost:15,label:'Lv1—recall best+1'},{cost:35,label:'Lv2—recall best+2'}]},
];

// ═══════════════════════════════════════════════════════════
//  RESEARCH
// ═══════════════════════════════════════════════════════════
const RESEARCH_DEF = [
  {id:'labInterns',        type:'stack', name:'Lab Intern',       plural:'Lab Interns',        desc:'Document genetic outcomes from each breeding event.',      yieldLine:'Each earns 0.15 💎 per breed',       costEach:2,  max:20, perBreed:0.15},
  {id:'geneAnalysts',      type:'stack', name:'Gene Analyst',     plural:'Gene Analysts',      desc:'Extract sequences from culled specimens.',                 yieldLine:'Each earns 0.4 💎 per cull',         costEach:5,  max:10, perCull:0.4},
  {id:'lineageArchivists', type:'stack', name:'Lineage Archivist',plural:'Lineage Archivists', desc:'Mine generational records every 25 generations.',          yieldLine:'Each earns 1 💎 per 25 generations', costEach:15, max:5,  perArchTick:1.0},
  {id:'headOfResearch',    type:'unique',name:'Head of Research',    desc:'Multiplies all research output ×1.5.',  yieldLine:'×1.5 all research yield', cost:35},
  {id:'automatedSequencer',type:'unique',name:'Automated Sequencer', desc:'All research output doubled.',          yieldLine:'×2 all research yield',   cost:75},
];

// ═══════════════════════════════════════════════════════════
//  SKILL TREE  (5 branches × 5 tiers, costs 1/3/8/25/75 GP)
//  Each skill's requires: previous tier in same branch
// ═══════════════════════════════════════════════════════════
const SKILL_BRANCHES = [
  {
    id:'cull', name:'CULLING', color:'#ef4444',
    skills:[
      {id:'sk_c1', tier:1, name:'Sharp Eye',           cost:1,  effect:'Cull gold ×1.3',            desc:'Better yield from each culled specimen.'},
      {id:'sk_c2', tier:2, name:'Methodical Cull',     cost:3,  effect:'Cull gold ×1.7 (total)',     desc:'Developed technique extracts more value.'},
      {id:'sk_c3', tier:3, name:'Mass Purge Protocol', cost:8,  effect:'+1 to cull count',           desc:'Process more specimens per action.'},
      {id:'sk_c4', tier:4, name:'The Reaper',          cost:25, effect:'Cull gold ×2.5 (total)',     desc:'Peak efficiency — nothing wasted.'},
      {id:'sk_c5', tier:5, name:'Extinction Engine',   cost:75, effect:'+2 cull count (total +3)',   desc:'Industrial-scale culling apparatus.'},
    ]
  },
  {
    id:'breed', name:'BREEDING', color:'#22d3ee',
    skills:[
      {id:'sk_b1', tier:1, name:'Golden Offspring',  cost:1,  effect:'Breed gold ×1.5',            desc:'Each birth is more financially productive.'},
      {id:'sk_b2', tier:2, name:'Prolific Lines',    cost:3,  effect:'Breed gold ×2.0 (total)',    desc:'High-output genetic pipelines.'},
      {id:'sk_b3', tier:3, name:'Industrial Breed',  cost:8,  effect:'Breed gold ×3.0 (total)',    desc:'Scale, scale, scale.'},
      {id:'sk_b4', tier:4, name:'Infinite Yield',    cost:25, effect:'Breed gold ×5.0 (total)',    desc:'Every generation produces maximum value.'},
      {id:'sk_b5', tier:5, name:'Eternal Cycle',     cost:75, effect:'2% chance to breed twins',   desc:'Occasionally produces two offspring per action.'},
    ]
  },
  {
    id:'gene', name:'GENETICS', color:'#a78bfa',
    skills:[
      {id:'sk_g1', tier:1, name:'Guided Mutation',      cost:1,  effect:'+8% effective mutation rate', desc:'Steer randomness toward improvement.'},
      {id:'sk_g2', tier:2, name:'Directed Evolution',   cost:3,  effect:'15% chance: top trait gets +2 after inherit', desc:'Occasionally amplifies the best gene.'},
      {id:'sk_g3', tier:3, name:'Perfect Inheritance',  cost:8,  effect:'Lowest inherited trait nudged +1 always', desc:'Floor your worst outcomes.'},
      {id:'sk_g4', tier:4, name:'Supreme Bloodline',    cost:25, effect:'All inherited traits ≥ lower parent value', desc:'Nothing below the minimum parent.'},
      {id:'sk_g5', tier:5, name:'Transcendent Sequence',cost:75, effect:'8% per trait: recall all-time best at birth', desc:'Ancient memory woven into every birth.'},
    ]
  },
  {
    id:'res', name:'RESEARCH', color:'#67e8f9',
    skills:[
      {id:'sk_r1', tier:1, name:'Lab Efficiency',   cost:1,  effect:'Research yield ×1.25',       desc:'Better protocols, more output per event.'},
      {id:'sk_r2', tier:2, name:'Deep Research',    cost:3,  effect:'Research yield ×1.6 (total)',desc:'Deeper analysis extracts more data.'},
      {id:'sk_r3', tier:3, name:'Diamond Protocol', cost:8,  effect:'Research yield ×2.0 (total)',desc:'Optimised extraction pipeline.'},
      {id:'sk_r4', tier:4, name:'Grand Synthesis',  cost:25, effect:'Research yield ×3.0 (total)',desc:'Maximum throughput achieved.'},
      {id:'sk_r5', tier:5, name:'Infinite Knowledge',cost:75, effect:'+1 💎 per 25 breeds (flat)', desc:'Continuous diamond synthesis from breeding data.'},
    ]
  },
  {
    id:'lin', name:'LINEAGE', color:'#86efac',
    skills:[
      {id:'sk_l1', tier:1, name:'Ancestral Echo',       cost:1,  effect:'Starters 10% stronger baseline', desc:'Heritage bleeds into new stock.'},
      {id:'sk_l2', tier:2, name:'Deep Bloodline',       cost:3,  effect:'Starters 25% stronger baseline', desc:'Deep roots produce strong shoots.'},
      {id:'sk_l3', tier:3, name:'Legacy Awakened',      cost:8,  effect:'+10% lineage memory base rate',  desc:'The past speaks louder.'},
      {id:'sk_l4', tier:4, name:'Ancient Dynasty',      cost:25, effect:'+5 effective trait cap for inheritance', desc:'Genes can temporarily exceed the hard cap.'},
      {id:'sk_l5', tier:5, name:'Primordial Ascension', cost:75, effect:'New starters always at 50% of all-time best', desc:'Legacy is now the floor, not the ceiling.'},
    ]
  },
];

// flat lookup
const SKILL_BY_ID = {};
SKILL_BRANCHES.forEach(b => b.skills.forEach(s => { SKILL_BY_ID[s.id] = {...s, branch:b.id}; }));
function skillOn(id) { return (state.skillsUnlocked||[]).includes(id); }

// ═══════════════════════════════════════════════════════════
//  GENE VAULTS
// ═══════════════════════════════════════════════════════════
const GENE_VAULTS = [
  { id:'aquatic',  name:'Aquatic Genome',    theme:'DEEP SEA',    cssClass:'vb-aquatic',  cost:1000,
    desc:'Specimens recovered from deep ocean thermal vents.',
    icons:['🐋','🐬','🦈','🐙','🦑','🐡','🐠','🦞','🦀','🐚','🌊','🐸','🦭','🐳','🦐','🐟','🐊','🫧','🪸','🦕','🌀','💧','🐉','🦎','🔵'] },
  { id:'flora',    name:'Flora Strain',      theme:'OVERGROWTH',  cssClass:'vb-flora',    cost:1000,
    desc:'Cultivated from ancient seed vaults and jungle biomass.',
    icons:['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🍁','🌾','🌲','🌳','🌴','🌵','🎋','🍄','🌱','🌼','💐','🍃','🎄','🪴','🌏','🪨','🍂','🌍'] },
  { id:'cosmos',   name:'Cosmos Sequence',   theme:'DEEP SPACE',  cssClass:'vb-cosmos',   cost:1000,
    desc:'Extraterrestrial genetic material recovered from meteorite fragments.',
    icons:['🌟','⭐','💫','✨','🌙','🌠','🚀','🛸','🪐','☄️','🌌','🔭','🛰️','🌍','🌕','🌑','🪨','🌒','🌓','🌔','🌛','🌜','🌝','🌞','🔆'] },
  { id:'predator', name:'Apex Predator',     theme:'HUNT',        cssClass:'vb-predator', cost:1000,
    desc:'Extracted from the most dangerous specimens ever catalogued.',
    icons:['🦁','🐯','🐆','🐻','🦊','🦝','🐺','🦅','🦉','🐍','🦂','🕷️','🦇','🦃','🦚','🦜','🦋','🪲','🐝','🦏','🐘','🦬','🐃','🦌','🔥'] },
  { id:'ancient',  name:'Ancient Legacy',    theme:'PRIMORDIAL',  cssClass:'vb-ancient',  cost:1000,
    desc:'Relics from civilisations that understood genetics long before we did.',
    icons:['⚔️','🛡️','👑','🏺','🗿','🪬','🧿','🔱','⚜️','🪄','🗡️','🏛️','⚖️','📜','🔮','💎','🧬','🌀','🔯','⚗️','🏆','🎭','🎪','🎯','🎲'] },
];

// Total unique icons = 5 × 25 = 125
const ALL_ICONS = GENE_VAULTS.flatMap(v => v.icons);
const TOTAL_ICONS = ALL_ICONS.length; // 125

let vaultPreviewId = null;

// ═══════════════════════════════════════════════════════════
//  MILESTONE TRACKS
// ═══════════════════════════════════════════════════════════
const MILESTONE_TRACKS = [
  { id:'breeding',    name:'BREEDING',         val:s=>s.totalBred,           unit:'bred',
    tiers:[{id:'q_first_breed',name:'First Steps',target:1,diamonds:1},{id:'m_bred_10',name:'Beginner',target:10,diamonds:1},{id:'mt_bred_25',name:'Apprentice',target:25,diamonds:1},{id:'m_bred_50',name:'Journeyman',target:50,diamonds:2},{id:'mt_bred_100',name:'Veteran',target:100,diamonds:2},{id:'mt_bred_250',name:'Expert',target:250,diamonds:3},{id:'m_bred_500',name:'Master Breeder',target:500,diamonds:3},{id:'q_bred_1000',name:'Grandmaster',target:1000,diamonds:4},{id:'mt_bred_2500',name:'Prolific',target:2500,diamonds:5},{id:'m_bred_5000',name:'The Factory',target:5000,diamonds:6},{id:'mt_bred_10000',name:'Industrial Scale',target:10000,diamonds:8},{id:'mt_bred_25000',name:'Unstoppable',target:25000,diamonds:10},{id:'mt_bred_50000',name:'Eternal Forge',target:50000,diamonds:15}]},
  { id:'culling',     name:'CULLING',           val:s=>s.totalCulled,         unit:'culled',
    tiers:[{id:'q_first_cull',name:'Culling Season',target:1,diamonds:1},{id:'mt_cull_5',name:'Getting Started',target:5,diamonds:1},{id:'m_cull_10',name:'Selective',target:10,diamonds:1},{id:'mt_cull_25',name:'Efficient',target:25,diamonds:2},{id:'q_cull_50',name:'Ruthless',target:50,diamonds:2},{id:'mt_cull_100',name:'Merciless',target:100,diamonds:3},{id:'mt_cull_250',name:'Purifier',target:250,diamonds:3},{id:'q_cull_500',name:'Extinction Event',target:500,diamonds:4},{id:'mt_cull_1000',name:'The Cleansing',target:1000,diamonds:5},{id:'mt_cull_2500',name:'Mass Culling',target:2500,diamonds:6},{id:'mt_cull_5000',name:'The Great Purge',target:5000,diamonds:8},{id:'mt_cull_10000',name:'World Ender',target:10000,diamonds:10},{id:'mt_cull_25000',name:'Inevitable',target:25000,diamonds:15}]},
  { id:'generations', name:'GENERATIONS',       val:s=>s.generation,          unit:'generations',
    tiers:[{id:'mt_gen_10',name:'First Wave',target:10,diamonds:1},{id:'mt_gen_25',name:'Getting Going',target:25,diamonds:1},{id:'m_gen_50',name:'Half Century',target:50,diamonds:1},{id:'q_gen_100',name:'Century',target:100,diamonds:2},{id:'mt_gen_200',name:'Bicentennial',target:200,diamonds:2},{id:'q_gen_500',name:'Five Hundred',target:500,diamonds:3},{id:'q_gen_1000',name:'Millennium',target:1000,diamonds:4},{id:'mt_gen_2000',name:'Two Thousand',target:2000,diamonds:4},{id:'q_gen_5000',name:'The Long Game',target:5000,diamonds:5},{id:'q_gen_10000',name:'Eternal Lineage',target:10000,diamonds:6},{id:'mt_gen_25000',name:'Ancient Dynasty',target:25000,diamonds:8},{id:'mt_gen_50000',name:'Timeless',target:50000,diamonds:12}]},
  { id:'fitness',     name:'FITNESS',           val:s=>s.highestFitness,      unit:'max fitness',
    tiers:[{id:'mt_fit_5',name:'First Spark',target:5,diamonds:1},{id:'q_fitness_10',name:'Fitness Fanatic',target:10,diamonds:1},{id:'q_fitness_15',name:'Strong Bloodline',target:15,diamonds:1},{id:'q_fitness_20',name:'Elite Lineage',target:20,diamonds:2},{id:'mt_fit_25',name:'Champion',target:25,diamonds:3},{id:'q_fitness_30',name:'Apex Lineage',target:30,diamonds:3},{id:'mt_fit_35',name:'Legendary',target:35,diamonds:4},{id:'q_fitness_40',name:'Transcendent',target:40,diamonds:5},{id:'mt_fit_45',name:'Ascended',target:45,diamonds:6},{id:'q_fitness_50',name:'God Complex',target:50,diamonds:8},{id:'mt_fit_60',name:'Beyond Mortal',target:60,diamonds:12},{id:'mt_fit_75',name:'Absolute',target:75,diamonds:18},{id:'mt_fit_100',name:'Centenary Peak',target:100,diamonds:25},{id:'mt_fit_125',name:'Theoretical Max',target:125,diamonds:35}]},
  { id:'traits',      name:'TRAITS',            val:s=>bestSingleTrait(s),    unit:'best single trait',
    tiers:[{id:'mt_tr_5',name:'Hint of Potential',target:5,diamonds:1},{id:'q_trait_10',name:'Promising Stock',target:10,diamonds:1},{id:'mt_tr_15',name:'Notable',target:15,diamonds:1},{id:'q_trait_20',name:'Perfect Gene',target:20,diamonds:2},{id:'mt_tr_25',name:'Exceptional',target:25,diamonds:3},{id:'mt_tr_30',name:'Superior',target:30,diamonds:3},{id:'q_trait_35',name:'Beyond Normal',target:35,diamonds:4},{id:'mt_tr_40',name:'Extraordinary',target:40,diamonds:5},{id:'q_trait_50',name:'Theoretical Limit',target:50,diamonds:6},{id:'mt_tr_75',name:'Past the Cap',target:75,diamonds:10},{id:'mt_tr_100',name:'Impossible',target:100,diamonds:15},{id:'mt_tr_125',name:'Absolute Max',target:125,diamonds:25}]},
  { id:'gold',        name:'GOLD EARNED',       val:s=>s.totalGoldEarned,     unit:'total gold',
    tiers:[{id:'m_gold_50',name:'Prospector',target:50,diamonds:1},{id:'m_gold_250',name:'Goldsmith',target:250,diamonds:1},{id:'m_gold_1000',name:'Comfortable',target:1000,diamonds:1},{id:'m_gold_5000',name:'Well Off',target:5000,diamonds:2},{id:'m_gold_20000',name:'Wealthy',target:20000,diamonds:2},{id:'mt_gold_75000',name:'Rich',target:75000,diamonds:3},{id:'mt_gold_250000',name:'Magnate',target:250000,diamonds:4},{id:'mt_gold_1m',name:'Tycoon',target:1000000,diamonds:5},{id:'mt_gold_5m',name:'Industrialist',target:5000000,diamonds:8},{id:'mt_gold_20m',name:'Mogul',target:20000000,diamonds:12}]},
  { id:'diamonds',    name:'DIAMONDS EARNED',   val:s=>s.totalDiamondsEarned, unit:'total diamonds',
    tiers:[{id:'m_dia_1',name:'First Jewel',target:1,diamonds:0},{id:'m_dia_5',name:'Sparkle',target:5,diamonds:1},{id:'m_dia_10',name:'Gem Collector',target:10,diamonds:1},{id:'m_dia_25',name:'Jeweller',target:25,diamonds:1},{id:'m_dia_50',name:'Hoarder',target:50,diamonds:2},{id:'m_dia_100',name:'Diamond Mine',target:100,diamonds:2},{id:'m_dia_250',name:'Baron',target:250,diamonds:3},{id:'m_dia_500',name:'Mogul',target:500,diamonds:4},{id:'m_dia_1000',name:'Diamond Empire',target:1000,diamonds:5},{id:'m_dia_2500',name:'Diamond Dynasty',target:2500,diamonds:8},{id:'m_dia_10000',name:'Diamond God',target:10000,diamonds:15}]},
  { id:'population',  name:'POPULATION',        val:s=>safeNum(s.maxPopEver,s.population.length), unit:'max alive at once',
    tiers:[{id:'mt_pop_5',name:'Small Group',target:5,diamonds:1},{id:'q_pop_8',name:'Growing',target:8,diamonds:1},{id:'mt_pop_12',name:'Cluster',target:12,diamonds:1},{id:'mt_pop_20',name:'Colony',target:20,diamonds:2},{id:'mt_pop_30',name:'Settlement',target:30,diamonds:2},{id:'mt_pop_40',name:'Commune',target:40,diamonds:3},{id:'mt_pop_60',name:'Township',target:60,diamonds:4},{id:'mt_pop_100',name:'City',target:100,diamonds:6}]},
  { id:'upgrades',    name:'UPGRADES',          val:s=>GOLD_UPGRADES.reduce((n,d)=>n+safeNum(s.upgrades?.[d.id]),0), unit:'gold upgrade levels',
    tiers:[{id:'q_first_upgrade',name:'First Investment',target:1,diamonds:1},{id:'mt_upg_5',name:'Invested',target:5,diamonds:1},{id:'mt_upg_15',name:'Committed',target:15,diamonds:2},{id:'mt_upg_25',name:'Dedicated',target:25,diamonds:3},{id:'mt_upg_35',name:'Obsessed',target:35,diamonds:4},{id:'mt_upg_45',name:'Expert',target:45,diamonds:5},{id:'mt_upg_52',name:'Gold Maxed',target:52,diamonds:8}]},
  { id:'research',    name:'RESEARCH',          val:s=>safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0), unit:'total researchers',
    tiers:[{id:'m_first_researcher',name:'Research Initiative',target:1,diamonds:1},{id:'mt_res_3',name:'Growing Team',target:3,diamonds:1},{id:'mt_res_8',name:'Division',target:8,diamonds:2},{id:'mt_res_15',name:'Department',target:15,diamonds:3},{id:'mt_res_25',name:'Full Lab',target:25,diamonds:4},{id:'mt_res_37',name:'Complete Division',target:37,diamonds:6}]},
  { id:'icons',       name:'ICON COLLECTION',   val:s=>(s.ownedIcons||[]).length, unit:'icons collected',
    tiers:[{id:'mt_icon_1',name:'First Find',target:1,diamonds:0},{id:'mt_icon_5',name:'Growing Set',target:5,diamonds:1},{id:'mt_icon_15',name:'Collector',target:15,diamonds:2},{id:'mt_icon_30',name:'Curator',target:30,diamonds:3},{id:'mt_icon_50',name:'Archivist',target:50,diamonds:5},{id:'mt_icon_80',name:'Master Collector',target:80,diamonds:8},{id:'mt_icon_125',name:'Complete Set',target:125,diamonds:20}]},
  { id:'genepoints',  name:'GENE POINTS',       val:s=>safeNum(s.totalGpEarned), unit:'gene points earned',
    tiers:[{id:'mt_gp_1',name:'First Sample',target:1,diamonds:1},{id:'mt_gp_5',name:'Regular Earner',target:5,diamonds:1},{id:'mt_gp_12',name:'Dedicated',target:12,diamonds:2},{id:'mt_gp_25',name:'Deep Study',target:25,diamonds:3},{id:'mt_gp_50',name:'Research Veteran',target:50,diamonds:5},{id:'mt_gp_100',name:'Lifelong Scholar',target:100,diamonds:8}]},
  { id:'skills',      name:'SKILL TREE',        val:s=>(s.skillsUnlocked||[]).length, unit:'skills unlocked',
    tiers:[{id:'mt_sk_1',name:'First Skill',target:1,diamonds:1},{id:'mt_sk_5',name:'Branching Out',target:5,diamonds:2},{id:'mt_sk_10',name:'Half Tree',target:10,diamonds:3},{id:'mt_sk_20',name:'Full Tree',target:20,diamonds:5},{id:'mt_sk_25',name:'Mastered',target:25,diamonds:10}]},
];

// ═══════════════════════════════════════════════════════════
//  SECRET MILESTONES  (desc shown when unlocked)
// ═══════════════════════════════════════════════════════════
const SECRET_MILESTONES = [
  {id:'m_secret_gen69',      name:'Nice.',                  desc:'Reach generation 69.',                                         check:s=>s.generation>=69,              diamonds:1},
  {id:'m_secret_broke',      name:'Broke',                  desc:'Reach 0 gold after earning at least 100 total.',               check:s=>s.everBroke===true,            diamonds:1},
  {id:'m_secret_balanced',   name:'Perfectly Balanced',     desc:'Have a creature where all 5 traits are within 2 of each other.',check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));return Math.max(...v)-Math.min(...v)<=2;}), diamonds:2},
  {id:'m_secret_bottleneck', name:'Bottleneck',             desc:'Have only 2 creatures alive after generation 50.',             check:s=>s.population.length===2&&s.generation>50, diamonds:2},
  {id:'m_secret_betrayal',   name:'The Betrayal',           desc:'Cull a creature that held your all-time fitness record.',       check:s=>s.culledOwnRecord===true,      diamonds:3},
  {id:'m_secret_surge3',     name:'Surge Addict',           desc:'Use the Evolution Surge consumable 3 times.',                  check:s=>safeNum(s.surgeUseCount)>=3,   diamonds:2},
  {id:'m_secret_legendary',  name:'New Era',                desc:'Use the Legendary Stock consumable.',                          check:s=>s.usedLegendaryStock===true,   diamonds:3},
  {id:'m_secret_jekyll',     name:'Jekyll & Hyde',          desc:'Have a creature where its highest trait is ≥3× its lowest.',   check:s=>s.population.some(c=>{const v=TRAIT_KEYS.map(t=>safeNum(c.traits[t]));const mn=Math.min(...v);return mn>0&&Math.max(...v)>=mn*3;}), diamonds:2},
  {id:'m_secret_fullhouse',  name:'Standing Room Only',     desc:'Fill population to the current cap.',                          check:s=>s.population.length>=(POP_CAP_TABLE[safeNum(s.upgrades?.popCap)]??20), diamonds:2},
  {id:'m_secret_username',   name:'Somebody',               desc:'Give yourself a username.',                                    check:s=>s.hasSetUsername===true,       diamonds:1},
  {id:'m_secret_hoard',      name:"Dragon's Hoard",         desc:'Hold 25 diamonds at once.',                                    check:s=>s.diamonds>=25,                diamonds:2},
  {id:'m_secret_enlightened',name:'Enlightened',            desc:'Purchase any diamond upgrade.',                                check:s=>['traitCapBoost','eliteMutation','dynastyBlood','deepArchive'].some(u=>safeNum(s.upgrades?.[u])>0), diamonds:2},
  {id:'m_secret_blink',      name:'Blink and You Miss It',  desc:'Breed 5 times before ever culling anything.',                  check:s=>s.bredBeforeFirstCull>=5,      diamonds:1},
  {id:'m_secret_palindrome', name:'Palindrome',             desc:'Have a creature where Speed=Resilience and Strength=Intelligence.', check:s=>s.population.some(c=>safeNum(c.traits.speed)===safeNum(c.traits.resilience)&&safeNum(c.traits.strength)===safeNum(c.traits.intelligence)), diamonds:2},
  {id:'m_secret_employer',   name:'Employer of the Year',   desc:'Hire at least one of each researcher type.',                  check:s=>safeNum(s.research?.labInterns)>0&&safeNum(s.research?.geneAnalysts)>0&&safeNum(s.research?.lineageArchivists)>0, diamonds:3},
  {id:'m_secret_fulllab',    name:'Full Lab',               desc:'Max out Lab Interns (20), Gene Analysts (10), and Archivists (5).', check:s=>safeNum(s.research?.labInterns)>=20&&safeNum(s.research?.geneAnalysts)>=10&&safeNum(s.research?.lineageArchivists)>=5, diamonds:5},
  {id:'m_secret_420',        name:'420',                    desc:'Reach generation 420.',                                        check:s=>s.generation>=420,             diamonds:2},
  {id:'m_secret_lucky7',     name:'Lucky Sevens',           desc:'Have a creature where all 5 traits are exactly 7.',           check:s=>s.population.some(c=>TRAIT_KEYS.every(t=>safeNum(c.traits[t])===7)), diamonds:3},
  {id:'m_secret_1337',       name:'1337',                   desc:'Reach generation 1,337.',                                     check:s=>s.generation>=1337,            diamonds:2},
  {id:'m_secret_vault_open', name:'Curious Mind',           desc:'Open your first Gene Vault sample.',                          check:s=>safeNum(s.totalVaultOpens)>=1, diamonds:1},
  {id:'m_secret_prime',      name:'Prime Specimen',         desc:'Have a creature where all 5 traits are prime numbers.',       check:s=>s.population.some(c=>TRAIT_KEYS.every(t=>PRIMES.has(safeNum(c.traits[t])))), diamonds:3},
  {id:'m_secret_dead_even',  name:'Dead Even',              desc:'Total bred and total culled within 1 of each other, both ≥100.', check:s=>Math.abs(safeNum(s.totalBred)-safeNum(s.totalCulled))<=1&&safeNum(s.totalBred)>=100, diamonds:2},
  {id:'m_secret_spender',    name:'Big Spender',            desc:'Spend 200+ diamonds on upgrades and research combined.',      check:s=>safeNum(s.totalDiamondsSpent)>=200, diamonds:2},
  {id:'m_secret_13',         name:'Thirteen',               desc:'Have exactly 13 creatures alive at once.',                    check:s=>s.population.length===13,      diamonds:2},
  {id:'m_secret_last_resort',name:'Last Resort',            desc:'Cull when only 3 creatures remain.',                         check:s=>s.culledFromThree===true,      diamonds:2},
  {id:'m_secret_4_vaults',   name:'Vault Crawler',          desc:'Open at least one sample from every Gene Vault.',            check:s=>GENE_VAULTS.every(v=>safeNum(s[`vault_${v.id}_opens`])>=1), diamonds:3},
  {id:'m_secret_all_icons',  name:'Completionist',          desc:`Own all ${TOTAL_ICONS} icons across every Gene Vault.`,      check:s=>(s.ownedIcons||[]).length>=TOTAL_ICONS, diamonds:15},
  {id:'m_secret_skill1',     name:'First Lesson',           desc:'Unlock your first skill tree node.',                         check:s=>(s.skillsUnlocked||[]).length>=1, diamonds:1},
  {id:'m_secret_fulltree',   name:'The Full Tree',          desc:'Unlock every skill tree node.',                              check:s=>(s.skillsUnlocked||[]).length>=25, diamonds:10},
  {id:'m_secret_125',        name:'The Absolute',           desc:'Achieve the maximum possible fitness of 125.',               check:s=>s.highestFitness>=125,         diamonds:20},
  {id:'m_secret_30min',      name:'Patient Researcher',     desc:'Earn 6+ Gene Points (30 minutes of active play).',          check:s=>safeNum(s.totalGpEarned)>=6,   diamonds:2},
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
let bestEverTraits      = {};
let gpIntervalHandle    = null;

function defaultState(){
  return {
    generation:1, population:[], gold:0, diamonds:0,
    totalBred:0, totalCulled:0, totalGoldEarned:0,
    totalDiamondsEarned:0, totalDiamondsSpent:0, highestFitness:0, maxPopEver:0,
    genePoints:0, totalGpEarned:0, skillsUnlocked:[],
    completedMilestones:[], milestoneDiamondsAwarded:[],
    surgeBreedsRemaining:0, surgeUseCount:0,
    everBroke:false, culledOwnRecord:false,
    usedLegendaryStock:false, hasSetUsername:false,
    bredBeforeFirstCull:0, firstCullDone:false, culledFromThree:false,
    diamondBuffer:0, lastArchivistGen:1, totalResearchDiamondsEarned:0,
    totalVaultOpens:0, ownedIcons:[], selectedIcon:null,
    vault_aquatic_opens:0, vault_flora_opens:0, vault_cosmos_opens:0,
    vault_predator_opens:0, vault_ancient_opens:0,
    research:{ labInterns:0, geneAnalysts:0, lineageArchivists:0, headOfResearch:false, automatedSequencer:false },
    upgrades:{
      popCap:0,mutation:0,traitAmp:0,breedYield:0,cullValue:0,genePool:0,
      selective:0,cullInsight:0,lineageMem:0,hybridVigor:0,adaptiveGenetics:0,
      traitCapBoost:0,eliteMutation:0,dynastyBlood:0,deepArchive:0,
    },
  };
}

// ── derived helpers ──────────────────────────────────────────
function getMaxPop()   { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20; }
function getBreedGold(){
  const base=[1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1;
  const mult=skillOn('sk_b1')?1.5:1 * (skillOn('sk_b2')?2.0:1) * (skillOn('sk_b3')?3.0:1) * (skillOn('sk_b4')?5.0:1);
  // actually tier skills are cumulative within their own branch; use the highest tier active
  const sk=[skillOn('sk_b4')?5.0:skillOn('sk_b3')?3.0:skillOn('sk_b2')?2.0:skillOn('sk_b1')?1.5:1.0];
  return Math.round(base * sk[0]);
}
function getCullBonus(){
  const base=[0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0;
  return base; // additional multiplier applied in cullWeakest
}
function getCullMult(){
  return skillOn('sk_c4')?2.5:skillOn('sk_c3')?1.7:skillOn('sk_c2')?1.7:skillOn('sk_c1')?1.3:1.0;
}
function getCullCount(){
  const base=[1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1;
  const bonus=(skillOn('sk_c5')?2:0)+(skillOn('sk_c3')?1:0);
  return base+bonus;
}
function getMutRate(){
  const base=[0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15;
  return skillOn('sk_g1')?Math.min(1.0,base+0.08):base;
}
function getAmpRate()  { return [0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0; }
function getAmpBonus() { return safeNum(state.upgrades?.traitAmp)>=5; }
function getMemRate()  {
  const base=[0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0;
  return skillOn('sk_l3')?Math.min(0.95,base+0.10):base;
}
function getMemBonus() { return [0,1,2][safeNum(state.upgrades?.deepArchive)]??0; }
function getTraitCap() {
  const apex=[0,5,10,20,35,55,75][safeNum(state.upgrades?.traitCapBoost)]??0;
  const skillBonus=(skillOn('sk_l4')?5:0)+(skillOn('sk_l5')?0:0); // l4 adds 5 to inheritance cap
  return TRAIT_MAX+apex+skillBonus;
}
function researchMult(){
  const base=(state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1);
  const sk=skillOn('sk_r4')?3.0:skillOn('sk_r3')?2.0:skillOn('sk_r2')?1.6:skillOn('sk_r1')?1.25:1.0;
  return base*sk;
}
function researchBreedYield(){ return safeNum(state.research?.labInterns)*0.15*researchMult(); }
function researchCullYield() { return safeNum(state.research?.geneAnalysts)*0.4*researchMult(); }
function researchArchYield() { return safeNum(state.research?.lineageArchivists)*1.0*researchMult(); }
// sk_r5: flat +1 💎 per 25 breeds
function skillR5BreedBonus()  { return skillOn('sk_r5'); }

function migrateCrature(c){
  if(!c||typeof c!=='object') return null;
  const t=c.traits||{};
  return { id:c.id||Math.random().toString(36).slice(2,8).toUpperCase(), generation:safeNum(c.generation,1),
    traits:{ speed:safeNum(t.speed,rand(1,8)), strength:safeNum(t.strength,rand(1,8)), stamina:safeNum(t.stamina,rand(1,8)), intelligence:safeNum(t.intelligence,rand(1,8)), resilience:safeNum(t.resilience,rand(1,8)) }};
}

function sanitiseState(s){
  return {
    ...s,
    generation:safeNum(s.generation,1), gold:safeNum(s.gold), diamonds:safeNum(s.diamonds),
    totalBred:safeNum(s.totalBred), totalCulled:safeNum(s.totalCulled),
    totalGoldEarned:safeNum(s.totalGoldEarned), totalDiamondsEarned:safeNum(s.totalDiamondsEarned),
    totalDiamondsSpent:safeNum(s.totalDiamondsSpent), highestFitness:safeNum(s.highestFitness), maxPopEver:safeNum(s.maxPopEver),
    genePoints:safeNum(s.genePoints), totalGpEarned:safeNum(s.totalGpEarned),
    skillsUnlocked:Array.isArray(s.skillsUnlocked)?s.skillsUnlocked:[],
    surgeBreedsRemaining:safeNum(s.surgeBreedsRemaining), surgeUseCount:safeNum(s.surgeUseCount),
    everBroke:!!s.everBroke, culledOwnRecord:!!s.culledOwnRecord,
    usedLegendaryStock:!!s.usedLegendaryStock, hasSetUsername:!!s.hasSetUsername,
    bredBeforeFirstCull:safeNum(s.bredBeforeFirstCull), firstCullDone:!!s.firstCullDone, culledFromThree:!!s.culledFromThree,
    diamondBuffer:safeNum(s.diamondBuffer), lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned), totalVaultOpens:safeNum(s.totalVaultOpens),
    ownedIcons:Array.isArray(s.ownedIcons)?s.ownedIcons:[],
    selectedIcon:s.selectedIcon||null,
    vault_aquatic_opens:safeNum(s.vault_aquatic_opens), vault_flora_opens:safeNum(s.vault_flora_opens),
    vault_cosmos_opens:safeNum(s.vault_cosmos_opens), vault_predator_opens:safeNum(s.vault_predator_opens),
    vault_ancient_opens:safeNum(s.vault_ancient_opens),
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
  const allIds=new Set([...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)]);
  const legacyIds=[...(state.completedQuests||[]),...(state.unlockedAchievements||[]),...(state.diamondQuestsRewarded||[])];
  legacyIds.forEach(id=>{ if(allIds.has(id)&&!state.completedMilestones.includes(id)) state.completedMilestones.push(id); });
}

function flushDiamondBuffer(){
  while(state.diamondBuffer>=1){
    state.diamondBuffer-=1; state.diamonds+=1; state.totalDiamondsEarned+=1; state.totalResearchDiamondsEarned+=1;
  }
}
function tickArchivists(){
  if(!safeNum(state.research?.lineageArchivists)) return;
  const last=safeNum(state.lastArchivistGen,1);
  const ticks=Math.floor((safeNum(state.generation)-last)/25);
  if(ticks<=0) return;
  state.diamondBuffer+=ticks*researchArchYield();
  state.lastArchivistGen=last+ticks*25;
  flushDiamondBuffer();
}

// ── GP timer ─────────────────────────────────────────────────
function startGpTimer(){
  if(gpIntervalHandle) clearInterval(gpIntervalHandle);
  gpIntervalHandle=setInterval(()=>{
    state.genePoints++; state.totalGpEarned++;
    addLog('🧪 Gene Point awarded — 5 minutes of active research.','gp');
    checkMilestones(); renderAll();
    const el=document.getElementById('gp-flash');
    if(el){ el.textContent='+1 🧪'; el.classList.add('visible'); setTimeout(()=>el.classList.remove('visible'),3000); }
  }, 5*60*1000);
}
function stopGpTimer(){
  if(gpIntervalHandle){ clearInterval(gpIntervalHandle); gpIntervalHandle=null; }
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
  checkMilestones();
  startGpTimer();
  renderAll();
};

window.initNewGame = ()=>{
  state=defaultState();
  state.population=Array.from({length:5},()=>makeCreature());
  rebuildBestEverTraits();
  startGpTimer();
  renderAll();
};

window.notifyUsernameSet = ()=>{
  if(!state.hasSetUsername){ state.hasSetUsername=true; checkMilestones(); renderAll(); }
};

window.stopGpTimer = stopGpTimer;

// ═══════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════
window.calcScore = ()=>Math.floor(
  safeNum(state.highestFitness)*200+safeNum(state.generation)*10+
  safeNum(state.totalBred)*3+safeNum(state.totalCulled)*5+
  safeNum(state.totalGoldEarned)+safeNum(state.totalDiamondsEarned)*100
);

// ═══════════════════════════════════════════════════════════
//  CREATURE HELPERS
// ═══════════════════════════════════════════════════════════
function calcFitness(c){ return Math.round(TRAIT_KEYS.reduce((s,t)=>s+safeNum(c.traits[t]),0)/TRAIT_KEYS.length); }

function inheritVal(va,vb,traitKey){
  va=safeNum(va,4); vb=safeNum(vb,4);
  const cap=getTraitCap();

  if(getMemRate()>0&&Math.random()<getMemRate())
    return Math.max(1,Math.min(cap,safeNum(bestEverTraits[traitKey],Math.max(va,vb))+getMemBonus()));

  const ampBase=(getAmpRate()>0&&Math.random()<getAmpRate())?Math.max(va,vb):(Math.random()<0.5?va:vb);
  const ampBonus=(getAmpBonus()&&Math.random()<0.1)?1:0;

  const parentAvg=(va+vb)/2, parentFloor=Math.min(va,vb);
  const agLvl=safeNum(state.upgrades?.adaptiveGenetics);
  const agRates=[0,0.2,0.45,0.70,1.0];
  let base=ampBase+ampBonus;
  if(agLvl>0&&base<parentAvg){ if(agLvl>=4||(Math.random()<(agRates[agLvl]||0))) base=Math.max(base,Math.floor(parentAvg)); }
  // sk_g4: traits never below parent floor
  if(skillOn('sk_g4')) base=Math.max(base,parentFloor);

  const alwaysPos=safeNum(state.upgrades?.mutation)>=4;
  const doubleMut=safeNum(state.upgrades?.mutation)>=5;
  const mutBonus =safeNum(state.upgrades?.mutation)>=6?2:1;
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

  // sk_g2: 15% chance the top inherited trait gets +2
  if(skillOn('sk_g2')&&Math.random()<0.15) val=Math.min(cap,val+2);
  // sk_g3: lowest inherited trait always +1
  if(skillOn('sk_g3')) val=Math.min(cap,val+1); // applied per-trait but only on lowest — check outside

  const hvLvl=safeNum(state.upgrades?.hybridVigor);
  if(hvLvl>0){
    const hvC=[0,0.10,0.22,0.35,0.50][hvLvl]||0;
    const hvB=[0,1,2,3,3][hvLvl]||0;
    if(Math.random()<hvC) val=Math.min(cap,val+hvB);
  }
  return val;
}

function makeCreature(parentA=null,parentB=null){
  const traits={},cap=getTraitCap();
  if(parentA){
    TRAIT_KEYS.forEach(t=>{traits[t]=inheritVal(parentA.traits[t],parentB.traits[t],t);});
    // sk_g3: ensure lowest trait gets +1
    if(skillOn('sk_g3')){
      const minT=TRAIT_KEYS.reduce((a,t)=>safeNum(traits[t])<safeNum(traits[a])?t:a,TRAIT_KEYS[0]);
      traits[minT]=Math.min(cap,safeNum(traits[minT])+1);
    }
    // sk_g5: 8% per trait to recall all-time best
    if(skillOn('sk_g5')){
      TRAIT_KEYS.forEach(t=>{ if(Math.random()<0.08) traits[t]=Math.min(cap,safeNum(bestEverTraits[t],traits[t])); });
    }
  } else {
    const geneRanges=[[1,8],[1,12],[4,16],[8,20],[10,25],[15,30]];
    const [gmin,gmax]=geneRanges[safeNum(state.upgrades?.genePool)]||[1,8];
    let lp=[0,0.25,0.50,0.75,0.90][safeNum(state.upgrades?.dynastyBlood)]||0;
    // skill bonuses to starters
    const linBonus=skillOn('sk_l2')?0.25:skillOn('sk_l1')?0.10:0;
    const linFloor=skillOn('sk_l5')?0.50:0;
    TRAIT_KEYS.forEach(t=>{
      const rolled=rand(gmin,gmax);
      const legacyBase=safeNum(bestEverTraits[t],1);
      const legacy=lp>0?Math.round(legacyBase*(lp+linBonus)):0;
      const skillFloor=linFloor>0?Math.round(legacyBase*linFloor):0;
      traits[t]=Math.min(cap,Math.max(rolled,legacy,skillFloor));
    });
  }
  return { id:Math.random().toString(36).slice(2,8).toUpperCase(), generation:state.generation, traits };
}

function makeCreatureFromLegacy(pct){
  const cap=getTraitCap(),traits={};
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
  const child=makeCreature(pA,pB), fitness=calcFitness(child);
  state.population.push(child); state.generation++; state.totalBred++;
  const ge=getBreedGold(); state.gold+=ge; state.totalGoldEarned+=ge;
  if(safeNum(state.surgeBreedsRemaining)>0) state.surgeBreedsRemaining--;
  if(!state.firstCullDone) state.bredBeforeFirstCull=safeNum(state.bredBeforeFirstCull)+1;
  TRAIT_KEYS.forEach(t=>{const v=safeNum(child.traits[t]);if(v>(bestEverTraits[t]||0)) bestEverTraits[t]=v;});
  if(state.population.length>safeNum(state.maxPopEver)) state.maxPopEver=state.population.length;

  // research yield
  const ry=researchBreedYield();
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  // sk_r5 flat breed bonus
  if(skillR5BreedBonus()&&safeNum(state.totalBred)%25===0){ state.diamonds++; state.totalDiamondsEarned++; }

  tickArchivists(); checkEverBroke();

  // sk_b5: 2% chance to produce twins
  if(skillOn('sk_b5')&&Math.random()<0.02&&state.population.length<getMaxPop()){
    const twin=makeCreature(pA,pB);
    state.population.push(twin);
    addLog(`🧬 Twin! ${twin.id} born alongside ${child.id}.`,'highlight');
  }

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
  if(state.population.length===3) state.culledFromThree=true;
  const aboutToCull=state.population.slice(0,Math.min(getCullCount(),state.population.length-minPop));
  if(!state.culledOwnRecord&&state.highestFitness>0&&aboutToCull.some(c=>c._f>=state.highestFitness)) state.culledOwnRecord=true;
  const actualCull=Math.min(getCullCount(),state.population.length-minPop);
  let totalEarned=0; const names=[];
  for(let i=0;i<actualCull;i++){
    const c=state.population.shift();
    const base=Math.max(1,2+Math.floor(safeNum(c._f)/2)+getCullBonus());
    const earned=Math.round(base*getCullMult());
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
  state.diamonds-=cost; state.upgrades[id]=lvl+1; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+cost;
  addLog(`💎 Purchased ${def.name} Lv ${state.upgrades[id]}.`,'diamond');
  checkMilestones(); renderAll();
};

window.hireResearcher=(id)=>{
  const def=RESEARCH_DEF.find(r=>r.id===id); if(!def) return;
  if(def.type==='unique'){
    if(state.research[id]) return addLog(`${def.name} already active.`,'warn');
    if(state.diamonds<def.cost) return addLog(`Need ${def.cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.cost; state.research[id]=true; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+def.cost;
    addLog(`💎 ${def.name} now active.`,'diamond');
  } else {
    const cur=safeNum(state.research[id]);
    if(cur>=def.max) return addLog(`${def.plural||def.name} fully staffed.`,'warn');
    if(state.diamonds<def.costEach) return addLog(`Need ${def.costEach} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.costEach; state.research[id]=cur+1; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+def.costEach;
    addLog(`💎 Hired ${def.plural||def.name} ${cur+1}/${def.max}.`,'diamond');
  }
  checkMilestones(); renderAll();
};

window.buySkill=(id)=>{
  const skill=SKILL_BY_ID[id]; if(!skill) return;
  if(skillOn(id)) return addLog(`${skill.name} is already unlocked.`,'warn');
  const branch=SKILL_BRANCHES.find(b=>b.id===skill.branch);
  const tierIdx=branch.skills.findIndex(s=>s.id===id);
  // requires previous tier in same branch
  if(tierIdx>0&&!skillOn(branch.skills[tierIdx-1].id)) return addLog(`Requires previous tier in ${branch.name} branch first.`,'warn');
  if(state.genePoints<skill.cost) return addLog(`Need ${skill.cost} 🧪 — you have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=skill.cost;
  state.skillsUnlocked=[...state.skillsUnlocked, id];
  addLog(`🧪 Skill unlocked: ${skill.name}.`,'gp');
  checkMilestones(); renderAll();
};

window.toggleVaultPreview=(id)=>{ vaultPreviewId=vaultPreviewId===id?null:id; renderGeneVault(); };

window.openVault=(id)=>{
  const vault=GENE_VAULTS.find(v=>v.id===id); if(!vault) return;
  if(state.diamonds<vault.cost) return addLog(`Need ${fmt(vault.cost)} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  const icon=vault.icons[Math.floor(Math.random()*vault.icons.length)];
  const owned=state.ownedIcons||[];
  const isDupe=owned.includes(icon);
  state.diamonds-=vault.cost; state.totalVaultOpens=safeNum(state.totalVaultOpens)+1;
  state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+vault.cost;
  state[`vault_${vault.id}_opens`]=safeNum(state[`vault_${vault.id}_opens`])+1;
  if(!isDupe){
    state.ownedIcons=[...owned,icon];
    addLog(`💎 Gene Vault [${vault.name}]: discovered ${icon} — added to collection!`,'diamond');
  } else {
    const refund=Math.floor(vault.cost*0.1);
    state.diamonds+=refund; state.totalDiamondsEarned+=refund;
    addLog(`💎 Gene Vault [${vault.name}]: duplicate ${icon} — refunded ${fmt(refund)} 💎`,'diamond');
  }
  checkMilestones(); renderAll();
  if(currentTab==='vault') renderGeneVault();
};

window.selectIcon=(icon)=>{
  state.selectedIcon=state.selectedIcon===icon?null:icon;
  renderGeneVault(); renderStats();
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
  MILESTONE_TRACKS.forEach(track=>{
    const val=track.val(state);
    track.tiers.forEach(tier=>{
      if(state.completedMilestones.includes(tier.id)||val<tier.target) return;
      state.completedMilestones.push(tier.id);
      const d=tier.diamonds||0;
      if(d>0){ state.diamonds+=d; state.totalDiamondsEarned+=d; state.milestoneDiamondsAwarded.push(tier.id); addLog(`💎 Milestone [${track.name}]: "${tier.name}" — +${d} 💎`,'diamond'); }
      else    { state.milestoneDiamondsAwarded.push(tier.id); addLog(`✓ Milestone [${track.name}]: "${tier.name}"`,'highlight'); }
    });
  });
  SECRET_MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)||!m.check(state)) return;
    state.completedMilestones.push(m.id);
    const d=m.diamonds||0;
    if(d>0){ state.diamonds+=d; state.totalDiamondsEarned+=d; state.milestoneDiamondsAwarded.push(m.id); addLog(`💎 Secret unlocked: "${m.name}" — +${d} 💎`,'diamond'); }
    else    { state.milestoneDiamondsAwarded.push(m.id); addLog(`✓ Secret unlocked: "${m.name}"`,'highlight'); }
  });
}

function getTrackProgress(track){
  const val=track.val(state);
  const ci=track.tiers.reduce((hi,tier,i)=>state.completedMilestones.includes(tier.id)?i:hi,-1);
  const ni=ci+1<track.tiers.length?ci+1:null;
  return { val, completedIdx:ci, totalTiers:track.tiers.length, currentTier:ci>=0?track.tiers[ci]:null,
    nextTier:ni!==null?track.tiers[ni]:null, pct:ni!==null?Math.min(1,val/track.tiers[ni].target):(ci>=0?1:0) };
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderAll(){
  renderStats();
  if(currentTab==='population') renderPopulation();
  if(currentTab==='upgrades')   renderUpgrades();
  if(currentTab==='research')   renderResearch();
  if(currentTab==='skilltree')  renderSkillTree();
  if(currentTab==='milestones') renderMilestones();
  if(currentTab==='vault')      renderGeneVault();
}

function renderStats(){
  const best=state.population.reduce((m,c)=>{const f=calcFitness(c);return f>m?f:m;},0);
  document.getElementById('stat-gen').textContent      = fmt(safeNum(state.generation,1));
  document.getElementById('stat-pop').textContent      = `${fmt(state.population.length)} / ${fmt(getMaxPop())}`;
  document.getElementById('stat-gold').textContent     = fmt(state.gold);
  document.getElementById('stat-diamonds').textContent = `${fmt(state.diamonds)} 💎`;
  document.getElementById('stat-gp').textContent       = `${fmt(state.genePoints)} 🧪`;
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
  html+=`<div class="rate-row"><span>Total from research</span><span class="rate-val">${fmt(state.totalResearchDiamondsEarned)} 💎</span></div>`;
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

function renderSkillTree(){
  const c=document.getElementById('skilltree-container'); if(!c) return;
  const unlocked=(state.skillsUnlocked||[]).length;
  const total=SKILL_BRANCHES.reduce((n,b)=>n+b.skills.length,0);
  let html=`<p class="st-intro">Gene Points are awarded every 5 minutes of active play. Spend them here to permanently enhance your breeding programme across five disciplines. Each branch must be unlocked tier by tier.</p>`;
  html+=`<div class="st-header">
    <span class="st-gp-display">🧪 ${fmt(state.genePoints)} Gene Points available</span>
    <span class="st-total">${unlocked} / ${total} skills unlocked</span>
  </div>`;
  html+=`<div class="st-branches">`;
  SKILL_BRANCHES.forEach(branch=>{
    html+=`<div class="st-branch"><div class="st-branch-title" style="color:${branch.color}">${branch.name}</div>`;
    branch.skills.forEach((skill,idx)=>{
      const isUnlocked=skillOn(skill.id);
      const prevUnlocked=idx===0||skillOn(branch.skills[idx-1].id);
      const isAvailable=!isUnlocked&&prevUnlocked;
      const nodeCls=isUnlocked?'sn-unlocked':isAvailable?'sn-available':'sn-locked';
      const can=isAvailable&&state.genePoints>=skill.cost;
      html+=`<div class="st-node ${nodeCls}">
        <div class="st-tier-badge">${isUnlocked?'✓':''} T${skill.tier}</div>
        <div class="st-node-name">${skill.name}</div>
        <div class="st-node-desc">${skill.desc}</div>
        <div class="st-node-effect">${skill.effect}</div>`;
      if(isUnlocked){
        html+=`<div class="st-unlocked-badge">ACTIVE</div>`;
      } else if(isAvailable){
        html+=`<button class="btn-gp ${can?'':'cant-afford'}" onclick="buySkill('${skill.id}')">[ UNLOCK — ${skill.cost} 🧪 ]</button>`;
      } else {
        html+=`<div style="color:var(--muted);font-size:10px">Requires previous tier</div>`;
      }
      html+=`</div>`;
      if(idx<branch.skills.length-1){
        html+=`<div class="st-connector ${isUnlocked?'conn-lit':''}">↓</div>`;
      }
    });
    html+=`</div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderMilestones(){
  const c=document.getElementById('milestones-container'); if(!c) return;
  const allIds=[...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)];
  const done=allIds.filter(id=>state.completedMilestones.includes(id)).length;
  let html=`<p class="ms-total">Completed: <span>${fmt(done)} / ${fmt(allIds.length)}</span></p>`;
  MILESTONE_TRACKS.forEach(track=>{
    const prog=getTrackProgress(track);
    const completedN=prog.completedIdx+1, allDone=completedN===prog.totalTiers;
    html+=`<p class="ms-cat-title">// ${track.name}</p><div class="track-grid"><div class="track-card ${allDone?'tc-complete':completedN>0?'tc-active':''}">`;
    html+=`<div class="track-header"><span class="track-name">${track.name}</span><span class="track-tier ${allDone?'all-done':''}">TIER ${completedN} / ${prog.totalTiers}</span></div>`;
    html+=`<div class="track-current-name">${prog.currentTier?prog.currentTier.name:'Not started'}</div>`;
    if(!allDone&&prog.nextTier){
      const pv=Math.round(prog.pct*100);
      html+=`<div class="track-next-name">→ ${prog.nextTier.name} at ${fmt(prog.nextTier.target)} ${track.unit}</div>`;
      html+=`<div class="track-prog-wrap"><div class="track-prog-bar"><div class="track-prog-fill" style="width:${pv}%"></div></div><div class="track-prog-text"><span>${fmt(prog.val)} / ${fmt(prog.nextTier.target)}</span><span class="reward">${prog.nextTier.diamonds>0?prog.nextTier.diamonds+' 💎':''}</span></div></div>`;
    } else if(allDone){ html+=`<div class="track-complete-badge">✦ ALL TIERS COMPLETE</div>`; }
    html+=`<div class="track-dots">`;
    track.tiers.forEach((_,i)=>{ html+=`<div class="track-dot ${i<=prog.completedIdx?'filled':i===prog.completedIdx+1?'current':''}"></div>`; });
    html+=`</div></div></div>`;
  });
  html+=`<p class="ms-cat-title secret-title">// ??? SECRETS</p><div class="secret-grid">`;
  SECRET_MILESTONES.forEach(m=>{
    const isDone=state.completedMilestones.includes(m.id);
    if(!isDone){
      html+=`<div class="ms-card ms-secret"><div class="ms-name">???</div><div class="ms-reward">${m.diamonds>0?m.diamonds+' 💎':''}</div></div>`;
    } else {
      html+=`<div class="ms-card ms-done-secret"><div class="ms-check secret-check">✓</div><div class="ms-name">${m.name}</div><div class="ms-desc">${m.desc}</div><div class="ms-reward">${m.diamonds>0?m.diamonds+' 💎':''}</div></div>`;
    }
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderGeneVault(){
  const c=document.getElementById('vault-container'); if(!c) return;
  const owned=state.ownedIcons||[], sel=state.selectedIcon;
  let html=`<p class="vault-intro">The Gene Vault houses specimens from across the known world. Each sample contains a unique genetic icon. Collect them all and choose one to represent your lineage on the leaderboard. Duplicates refund 10%.</p>`;
  html+=`<div class="vault-collection-section">`;
  html+=`<p class="vault-collection-title">// YOUR COLLECTION — ${fmt(owned.length)} / ${TOTAL_ICONS} icons</p>`;
  if(sel) html+=`<p class="vault-active-label">Active icon: <span>${sel}</span></p>`;
  else    html+=`<p class="vault-active-label">No icon selected — click any to equip it on the leaderboard.</p>`;
  if(owned.length===0) html+=`<p class="vault-collection-empty">Nothing collected yet.</p>`;
  else {
    html+=`<div class="vault-icon-grid">`;
    [...new Set(owned)].forEach(icon=>{ html+=`<div class="vault-icon-cell ${sel===icon?'selected':''}" onclick="selectIcon('${icon}')">${icon}</div>`; });
    html+=`</div>`;
  }
  html+=`</div>`;
  html+=`<p class="vault-boxes-title">// GENE VAULTS</p><div class="vault-boxes-grid">`;
  GENE_VAULTS.forEach(vault=>{
    const opens=safeNum(state[`vault_${vault.id}_opens`]);
    const ownedN=vault.icons.filter(ic=>owned.includes(ic)).length;
    const isPrev=vaultPreviewId===vault.id, can=state.diamonds>=vault.cost;
    html+=`<div class="vault-box-card ${vault.cssClass}">
      <div class="vb-header"><span class="vb-name">${vault.name}</span><span class="vb-theme">${vault.theme}</span></div>
      <div class="vb-cost">${fmt(vault.cost)} 💎 per open</div>
      <div class="vb-desc">${vault.desc}</div>
      <div class="vb-stats">Collected: <span>${ownedN} / ${vault.icons.length}</span> &nbsp;|&nbsp; Opened: <span>${fmt(opens)}×</span></div>
      <button class="vb-preview-toggle" onclick="toggleVaultPreview('${vault.id}')">${isPrev?'[ HIDE ICONS ]':'[ SEE ICONS ]'}</button>`;
    if(isPrev){
      html+=`<div class="vb-icons-preview">`;
      vault.icons.forEach(ic=>{ html+=`<div class="vb-icon-preview ${owned.includes(ic)?'owned':''}">${ic}</div>`; });
      html+=`</div>`;
    }
    html+=`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="openVault('${vault.id}')">[ OPEN — ${fmt(vault.cost)} 💎 ]</button></div>`;
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
  if(hasSel) html+=`<div class="pop-header"><span class="pop-hint">Click [ ☆ ] to select a pair.</span><button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button></div>`;
  const surge=safeNum(state.surgeBreedsRemaining);
  if(surge>0) html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--diamond)">💎 Evolution Surge: ${fmt(surge)} breeds remaining.</p>`;
  html+=`<table><thead><tr>${hasSel?'<th></th>':''}<th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}</tr></thead><tbody>`;
  sorted.forEach((c,i)=>{
    const isTop=i===0,isBot=i===sorted.length-1&&sorted.length>2,isSel=selectedForBreeding.includes(c.id);
    html+=`<tr class="${isTop?'row-top':isBot?'row-bottom':isSel?'row-selected':''}">`;
    if(hasSel) html+=`<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
    html+=`<td class="bright">${c.id}</td><td>${fmt(safeNum(c.generation,'?'))}</td><td class="fit-val">${fmt(c._f)}</td>`;
    TRAIT_KEYS.forEach(t=>{const v=safeNum(c.traits[t]);html+=`<td class="${v>=80?'trait-hi':v>=40?'trait-mid':v<=5?'trait-lo':''}">${fmt(v)}</td>`;});
    html+=`</tr>`;
  });
  html+=`</tbody></table>`;
  if(!hasSel) html+=`<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> to hand-pick pairs.</p>`;
  container.innerHTML=html;
}

window.renderLeaderboard=(entries,currentUid)=>{
  const c=document.getElementById('leaderboard-container'); if(!c) return;
  let html=`<div class="lb-header"><span class="lb-title">// LEADERBOARD</span><button class="lb-refresh" onclick="window.refreshLeaderboard&&window.refreshLeaderboard()">[ REFRESH ]</button></div><p class="lb-formula">Score = <span>fitness×200</span> + <span>gen×10</span> + <span>bred×3</span> + <span>culled×5</span> + <span>gold×1</span> + <span>💎×100</span></p>`;
  if(!entries?.length){html+=`<p class="lb-empty">No entries yet — save to appear here.</p>`;c.innerHTML=html;return;}
  html+=`<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>FITNESS</th><th>GEN</th></tr></thead><tbody>`;
  entries.forEach((e,i)=>{
    const rank=i+1,isYou=e.uid===currentUid;
    const nameDisplay=`${e.selectedIcon?e.selectedIcon+' ':''}${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}`;
    html+=`<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}"><td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td><td class="lb-name">${nameDisplay}</td><td class="lb-score">${fmt(safeNum(e.score))}</td><td>${fmt(safeNum(e.highestFitness))}</td><td>${fmt(safeNum(e.generation))}</td></tr>`;
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
  if(tab==='skilltree')  renderSkillTree();
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

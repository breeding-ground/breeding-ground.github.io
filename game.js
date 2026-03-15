'use strict';

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const TRAIT_KEYS    = ['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR     = ['SPD','STR','STA','INT','RES'];
const TRAIT_MAX     = 50;
const POP_CAP_TABLE = [20,25,30,40,60,100];
const PRIMES        = new Set([2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113]);
const IMMORTAL_FITNESS_THRESHOLD = 40;

const fmt  = n => safeNum(n).toLocaleString();
const fmt1 = n => safeNum(n).toFixed(1);
const fmtR = n => n===0?'—':safeNum(n).toFixed(2);
function safeNum(v,f=0){ const n=Number(v); return isFinite(n)?n:f; }
function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function bestSingleTrait(s){ return Math.max(0,...(s.population||[]).map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits?.[t]))))); }

// ═══════════════════════════════════════════════════════════
//  GOLD UPGRADES  (no genePool, no dynastyBlood)
// ═══════════════════════════════════════════════════════════
const GOLD_UPGRADES = [
  { id:'popCap',          name:'Expanded Habitat',    desc:'Raise the population cap.',
    levels:[{cost:60,label:'Lv1—20→25'},{cost:200,label:'Lv2—25→30'},{cost:600,label:'Lv3—30→40'},{cost:2000,label:'Lv4—40→60'},{cost:7000,label:'Lv5—60→100'}]},
  { id:'mutation',        name:'Mutation Boost',       desc:'Higher mutation rate and stronger positive mutations.',
    levels:[{cost:25,label:'Lv1—15%→25%'},{cost:75,label:'Lv2—25%→40%'},{cost:200,label:'Lv3—40%→60%'},{cost:600,label:'Lv4—always beneficial'},{cost:2000,label:'Lv5—two traits mutate'},{cost:8000,label:'Lv6—double mutation bonus'}]},
  { id:'traitAmp',        name:'Trait Amplifier',      desc:"Offspring inherit the stronger parent's trait more often.",
    levels:[{cost:50,label:'Lv1—15% chance'},{cost:160,label:'Lv2—30%'},{cost:450,label:'Lv3—55%'},{cost:1400,label:'Lv4—always stronger'},{cost:4500,label:'Lv5—always stronger +bonus'}]},
  { id:'breedYield',      name:'Breeding Yield',       desc:'Earn more gold per offspring born.',
    levels:[{cost:30,label:'Lv1—3g'},{cost:90,label:'Lv2—6g'},{cost:280,label:'Lv3—12g'},{cost:800,label:'Lv4—25g'},{cost:2500,label:'Lv5—50g'},{cost:8000,label:'Lv6—100g'}]},
  { id:'cullValue',       name:"Butcher's Eye",         desc:'Extract more gold when culling.',
    levels:[{cost:20,label:'Lv1—+3g'},{cost:55,label:'Lv2—+7g'},{cost:150,label:'Lv3—+15g'},{cost:450,label:'Lv4—+30g'},{cost:1500,label:'Lv5—+60g'},{cost:5000,label:'Lv6—+120g'}]},
  { id:'selective',       name:'Selective Breeding',    desc:'Hand-pick your own breeding pairs.',
    levels:[{cost:40,label:'One-time — unlocks BREED SELECTED'}]},
  { id:'cullInsight',     name:'Culling Insight',       desc:'Cull multiple weak creatures in one action.',
    levels:[{cost:100,label:'Lv1—cull 2'},{cost:350,label:'Lv2—cull 3'},{cost:1200,label:'Lv3—cull 5'},{cost:4000,label:'Lv4—cull 8'},{cost:14000,label:'Lv5—cull 12'}]},
  { id:'lineageMem',      name:'Lineage Memory',        desc:'Offspring can recall best-ever trait values.',
    levels:[{cost:150,label:'Lv1—5%'},{cost:500,label:'Lv2—12%'},{cost:1800,label:'Lv3—25%'},{cost:6000,label:'Lv4—40%'},{cost:20000,label:'Lv5—60%'}]},
  { id:'hybridVigor',     name:'Hybrid Vigor',          desc:'Post-inheritance bonus to top traits.',
    levels:[{cost:80,label:'Lv1—10% +1'},{cost:300,label:'Lv2—22% +2 top 2'},{cost:1000,label:'Lv3—35% +3 top 2'},{cost:3500,label:'Lv4—50% all above avg'}]},
  { id:'adaptiveGenetics',name:'Adaptive Genetics',     desc:'Unlucky traits nudged toward parent average.',
    levels:[{cost:100,label:'Lv1—20%'},{cost:400,label:'Lv2—45%'},{cost:1500,label:'Lv3—70%'},{cost:5000,label:'Lv4—always corrects'}]},
  { id:'autoBreeder',     name:'Auto-Breeder',           desc:'Automatically breeds at set speed. Batches log output.',
    levels:[
      {cost:500,   label:'Lv1—0.2 breeds/sec'},
      {cost:2000,  label:'Lv2—0.5 breeds/sec'},
      {cost:8000,  label:'Lv3—1 breed/sec'},
      {cost:30000, label:'Lv4—2 breeds/sec'},
      {cost:100000,label:'Lv5—5 breeds/sec'},
    ]},
];

const AUTO_BREED_RATES = [0, 0.2, 0.5, 1, 2, 5]; // per second at each level

// ═══════════════════════════════════════════════════════════
//  DIAMOND UPGRADES
// ═══════════════════════════════════════════════════════════
const DIAMOND_UPGRADES = [
  { id:'traitCapBoost', name:'Apex Refinement',
    desc:`Raises the trait ceiling toward 125.`,
    levels:[
      {cost:10,  label:`Lv1—cap ${TRAIT_MAX}→${TRAIT_MAX+5}`},
      {cost:20,  label:`Lv2—cap→${TRAIT_MAX+10}`},
      {cost:35,  label:`Lv3—cap→${TRAIT_MAX+20}`},
      {cost:60,  label:`Lv4—cap→${TRAIT_MAX+35}`},
      {cost:100, label:`Lv5—cap→${TRAIT_MAX+55}`},
      {cost:160, label:`Lv6—cap→${TRAIT_MAX+75} (MAX 125)`},
    ]},
  { id:'eliteMutation', name:'Elite Mutation',
    desc:'Reduces mutation resistance on high traits.',
    levels:[{cost:8,label:'Lv1—halves resistance ≥30'},{cost:18,label:'Lv2—removes resistance'},{cost:40,label:'Lv3—+1 guaranteed on high traits'}]},
  { id:'deepArchive',   name:'Deep Archive',
    desc:'Lineage Memory recalls best value + a bonus.',
    levels:[{cost:15,label:'Lv1—recall best+1'},{cost:35,label:'Lv2—recall best+2'}]},
];

// ═══════════════════════════════════════════════════════════
//  RESEARCH — scaling costs
// ═══════════════════════════════════════════════════════════
// Cost for nth hire (1-indexed): uses sequence 2,3,5,10,20,35,60,100,175,300,500,...capped at 500
function researchHireCost(currentCount) {
  const seq = [2,3,5,10,20,35,60,100,175,300,500];
  if (currentCount < seq.length) return seq[currentCount];
  return 500;
}

const RESEARCH_DEF = [
  {id:'labInterns',        type:'stack', name:'Lab Intern',       plural:'Lab Interns',
   desc:'Document genetic outcomes from each breeding event.',
   yieldLine:'Each earns 0.15 💎 per breed', max:20, perBreed:0.15},
  {id:'geneAnalysts',      type:'stack', name:'Gene Analyst',     plural:'Gene Analysts',
   desc:'Extract sequences from culled specimens.',
   yieldLine:'Each earns 0.4 💎 per cull',   max:10, perCull:0.4},
  {id:'lineageArchivists', type:'stack', name:'Lineage Archivist',plural:'Lineage Archivists',
   desc:'Mine generational records every 25 generations.',
   yieldLine:'Each earns 1 💎 per 25 gens',  max:5,  perArchTick:1.0},
  {id:'headOfResearch',    type:'unique', name:'Head of Research',
   desc:'Multiplies all research output ×1.5.',  yieldLine:'×1.5 all research yield', cost:1000},
  {id:'automatedSequencer',type:'unique', name:'Automated Sequencer',
   desc:'All research output doubled.',           yieldLine:'×2 all research yield',   cost:3000},
];

// ═══════════════════════════════════════════════════════════
//  GENE VAULTS
// ═══════════════════════════════════════════════════════════
const GENE_VAULTS = [
  { id:'aquatic',  name:'Aquatic Genome',    theme:'DEEP SEA',   cssClass:'vb-aquatic',  cost:1000,
    desc:'Specimens from deep ocean thermal vents.',
    icons:['🐋','🐬','🦈','🐙','🦑','🐡','🐠','🦞','🦀','🐚','🌊','🐸','🦭','🐳','🦐','🐟','🐊','🫧','🪸','🦕','🌀','💧','🐉','🦎','🔵'] },
  { id:'flora',    name:'Flora Strain',      theme:'OVERGROWTH', cssClass:'vb-flora',    cost:1000,
    desc:'Cultivated from ancient seed vaults and jungle biomass.',
    icons:['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🍁','🌾','🌲','🌳','🌴','🌵','🎋','🍄','🌱','🌼','💐','🍃','🎄','🪴','🌏','🪨','🍂','🌍'] },
  { id:'cosmos',   name:'Cosmos Sequence',   theme:'DEEP SPACE', cssClass:'vb-cosmos',   cost:1000,
    desc:'Extraterrestrial material from meteorite fragments.',
    icons:['🌟','⭐','💫','✨','🌙','🌠','🚀','🛸','🪐','☄️','🌌','🔭','🛰️','🌍','🌕','🌑','🪨','🌒','🌓','🌔','🌛','🌜','🌝','🌞','🔆'] },
  { id:'predator', name:'Apex Predator',     theme:'HUNT',       cssClass:'vb-predator', cost:1000,
    desc:'From the most dangerous specimens ever catalogued.',
    icons:['🦁','🐯','🐆','🐻','🦊','🦝','🐺','🦅','🦉','🐍','🦂','🕷️','🦇','🦃','🦚','🦜','🦋','🪲','🐝','🦏','🐘','🦬','🐃','🦌','🔥'] },
  { id:'ancient',  name:'Ancient Legacy',    theme:'PRIMORDIAL', cssClass:'vb-ancient',  cost:1000,
    desc:'Relics from civilisations that understood genetics before us.',
    icons:['⚔️','🛡️','👑','🏺','🗿','🪬','🧿','🔱','⚜️','🪄','🗡️','🏛️','⚖️','📜','🔮','💎','🧬','🌀','🔯','⚗️','🏆','🎭','🎪','🎯','🎲'] },
];

// PvE special icon rewards (not in normal vaults)
const PVE_ICONS = ['🏅','🥇','⚡','🌈','🎖️','🔴','🟣','🟤','⬛','🔲'];

const ALL_ICONS = GENE_VAULTS.flatMap(v=>v.icons);
const TOTAL_ICONS = ALL_ICONS.length; // 125

let vaultPreviewId = null;

// ═══════════════════════════════════════════════════════════
//  IMMORTAL SKILL TREE  (per-creature, 3 branches × 5 tiers)
//  Costs: 1,3,8,20,50 GP
// ═══════════════════════════════════════════════════════════
const IMMORTAL_SKILL_BRANCHES = [
  { id:'atk', name:'ATTACK', color:'var(--red)',
    skills:[
      {id:'atk1',tier:1,cost:1, name:'Battle Hardened',  effect:'ATK +15',     desc:'Trained for combat.'},
      {id:'atk2',tier:2,cost:3, name:'Vicious Strike',   effect:'ATK +25',     desc:'Devastating blow.'},
      {id:'atk3',tier:3,cost:8, name:'Berserker',        effect:'ATK +40',     desc:'Unleashes fury.'},
      {id:'atk4',tier:4,cost:20,name:'Warlord',          effect:'ATK +60',     desc:'Commands destruction.'},
      {id:'atk5',tier:5,cost:50,name:'Death Incarnate',  effect:'ATK +80',     desc:'Unstoppable force.'},
    ]},
  { id:'spd', name:'SPEED',  color:'var(--blue)',
    skills:[
      {id:'spd1',tier:1,cost:1, name:'Swift',            effect:'SPD +15',     desc:'Light on their feet.'},
      {id:'spd2',tier:2,cost:3, name:'Blur',             effect:'SPD +25',     desc:'Hard to track.'},
      {id:'spd3',tier:3,cost:8, name:'Phase Dash',       effect:'SPD +40',     desc:'Faster than thought.'},
      {id:'spd4',tier:4,cost:20,name:'Lightning',        effect:'SPD +60',     desc:'Pure kinetic energy.'},
      {id:'spd5',tier:5,cost:50,name:'Untouchable',      effect:'SPD +80',     desc:'Cannot be hit.'},
    ]},
  { id:'def', name:'DEFENCE', color:'var(--gp)',
    skills:[
      {id:'def1',tier:1,cost:1, name:'Iron Skin',        effect:'DEF +15',     desc:'Toughened hide.'},
      {id:'def2',tier:2,cost:3, name:'Fortress',         effect:'DEF +25',     desc:'Built like a wall.'},
      {id:'def3',tier:3,cost:8, name:'Juggernaut',       effect:'DEF +40',     desc:'Cannot be stopped.'},
      {id:'def4',tier:4,cost:20,name:'Impenetrable',     effect:'DEF +60',     desc:'Nigh invulnerable.'},
      {id:'def5',tier:5,cost:50,name:'Immortal Guard',   effect:'DEF +80 HP +50',desc:'The ultimate shield.'},
    ]},
];

// ═══════════════════════════════════════════════════════════
//  PvE STAGES
// ═══════════════════════════════════════════════════════════
const PVE_STAGES = [
  {id:'pve1', name:'The Proving Ground',    enemies:1, enemyLevel:1,  gpReward:2,  iconReward:'🏅', desc:'Face your first opponent. A weak specimen bred for testing.'},
  {id:'pve2', name:'Twin Threat',           enemies:2, enemyLevel:1,  gpReward:3,  iconReward:'⚡', desc:'Two opponents at once. Manage your attacks carefully.'},
  {id:'pve3', name:'The Gauntlet',          enemies:3, enemyLevel:2,  gpReward:4,  iconReward:'🔴', desc:'Three foes of growing strength. Your first real test.'},
  {id:'pve4', name:'Champion\'s Trial',     enemies:1, enemyLevel:3,  gpReward:5,  iconReward:'🎖️', desc:'A single elite champion stands in your way.'},
  {id:'pve5', name:'Pack Hunt',             enemies:3, enemyLevel:3,  gpReward:6,  iconReward:'🟣', desc:'A coordinated pack. Strength alone will not suffice.'},
  {id:'pve6', name:'The Colosseum',         enemies:2, enemyLevel:4,  gpReward:8,  iconReward:'🌈', desc:'Two apex predators bred for the arena.'},
  {id:'pve7', name:'Ancient Bloodline',     enemies:1, enemyLevel:5,  gpReward:10, iconReward:'🟤', desc:'A creature with ancient genetic heritage. Respect it.'},
  {id:'pve8', name:'The Horde',             enemies:4, enemyLevel:4,  gpReward:12, iconReward:'⬛', desc:'Four opponents simultaneously. Chaos and carnage.'},
  {id:'pve9', name:'Omega Trial',           enemies:3, enemyLevel:6,  gpReward:15, iconReward:'🔲', desc:'Three Omega-class specimens. The hardest test yet.'},
  {id:'pve10',name:'The Final Reckoning',   enemies:1, enemyLevel:8,  gpReward:25, iconReward:'🥇', desc:'One perfect creature. The ultimate champion. Can you beat it?'},
];

// Combat stat constants
const BASE_ATK = 125, BASE_SPD = 125, BASE_DEF = 125, BASE_HP = 200;

function getImmortalCombatStats(im) {
  const skills = im.skills || [];
  let atk=BASE_ATK, spd=BASE_SPD, def=BASE_DEF, hp=BASE_HP;
  if(skills.includes('atk1')) atk+=15; if(skills.includes('atk2')) atk+=25;
  if(skills.includes('atk3')) atk+=40; if(skills.includes('atk4')) atk+=60; if(skills.includes('atk5')) atk+=80;
  if(skills.includes('spd1')) spd+=15; if(skills.includes('spd2')) spd+=25;
  if(skills.includes('spd3')) spd+=40; if(skills.includes('spd4')) spd+=60; if(skills.includes('spd5')) spd+=80;
  if(skills.includes('def1')) def+=15; if(skills.includes('def2')) def+=25;
  if(skills.includes('def3')) def+=40; if(skills.includes('def4')) def+=60; if(skills.includes('def5')) { def+=80; hp+=50; }
  return { atk, spd, def, hp };
}

function makePveEnemy(level) {
  const base = 80 + level * 30;
  return { atk: base, spd: base - 10, def: base - 20, hp: BASE_HP + level * 40 };
}

// Simple combat simulation — returns {won, log}
function simulateFight(attacker, defenders) {
  const log = [];
  let atkHp = attacker.hp;
  for (let ei = 0; ei < defenders.length; ei++) {
    const def = { ...defenders[ei] };
    let defHp = def.hp;
    log.push(`⚔ Round ${ei+1}: ${attacker.spd >= def.spd ? 'You attack first' : 'Enemy attacks first'}`);
    let turn = attacker.spd >= def.spd ? 'atk' : 'def';
    let rounds = 0;
    while (atkHp > 0 && defHp > 0 && rounds < 50) {
      rounds++;
      if (turn === 'atk') {
        const dmg = Math.max(1, attacker.atk - Math.floor(def.def * 0.4));
        defHp -= dmg;
        log.push(`  → You deal ${fmt(dmg)} damage (enemy ${fmt(Math.max(0,defHp))} HP left)`);
        turn = 'def';
      } else {
        const dmg = Math.max(1, def.atk - Math.floor(attacker.def * 0.4));
        atkHp -= dmg;
        log.push(`  ← Enemy deals ${fmt(dmg)} damage (you ${fmt(Math.max(0,atkHp))} HP left)`);
        turn = 'atk';
      }
    }
    if (atkHp <= 0) { log.push(`✗ Defeated by enemy ${ei+1}`); return { won: false, log, atkHpLeft: 0 }; }
    log.push(`✓ Enemy ${ei+1} defeated`);
    atkHp = Math.min(attacker.hp, atkHp + Math.floor(attacker.hp * 0.15)); // 15% hp restored between fights
  }
  log.push(`🏆 Victory! All ${defenders.length} opponent${defenders.length>1?'s':''} defeated.`);
  return { won: true, log, atkHpLeft: atkHp };
}

// ═══════════════════════════════════════════════════════════
//  MILESTONE TRACKS
// ═══════════════════════════════════════════════════════════
const MILESTONE_TRACKS = [
  { id:'breeding',    name:'BREEDING',       val:s=>s.totalBred,         unit:'bred',        gpPer:1,
    tiers:[{id:'q_first_breed',name:'First Steps',target:1,diamonds:1},{id:'m_bred_10',name:'Beginner',target:10,diamonds:1},{id:'mt_bred_25',name:'Apprentice',target:25,diamonds:1},{id:'m_bred_50',name:'Journeyman',target:50,diamonds:2},{id:'mt_bred_100',name:'Veteran',target:100,diamonds:2},{id:'mt_bred_250',name:'Expert',target:250,diamonds:3},{id:'m_bred_500',name:'Master Breeder',target:500,diamonds:3},{id:'q_bred_1000',name:'Grandmaster',target:1000,diamonds:4},{id:'mt_bred_2500',name:'Prolific',target:2500,diamonds:5},{id:'m_bred_5000',name:'The Factory',target:5000,diamonds:6},{id:'mt_bred_10000',name:'Industrial Scale',target:10000,diamonds:8},{id:'mt_bred_25000',name:'Unstoppable',target:25000,diamonds:10},{id:'mt_bred_50000',name:'Eternal Forge',target:50000,diamonds:15}]},
  { id:'culling',     name:'CULLING',        val:s=>s.totalCulled,       unit:'culled',      gpPer:1,
    tiers:[{id:'q_first_cull',name:'Culling Season',target:1,diamonds:1},{id:'mt_cull_5',name:'Getting Started',target:5,diamonds:1},{id:'m_cull_10',name:'Selective',target:10,diamonds:1},{id:'mt_cull_25',name:'Efficient',target:25,diamonds:2},{id:'q_cull_50',name:'Ruthless',target:50,diamonds:2},{id:'mt_cull_100',name:'Merciless',target:100,diamonds:3},{id:'mt_cull_250',name:'Purifier',target:250,diamonds:3},{id:'q_cull_500',name:'Extinction Event',target:500,diamonds:4},{id:'mt_cull_1000',name:'The Cleansing',target:1000,diamonds:5},{id:'mt_cull_2500',name:'Mass Culling',target:2500,diamonds:6},{id:'mt_cull_5000',name:'The Great Purge',target:5000,diamonds:8},{id:'mt_cull_10000',name:'World Ender',target:10000,diamonds:10},{id:'mt_cull_25000',name:'Inevitable',target:25000,diamonds:15}]},
  { id:'generations', name:'GENERATIONS',    val:s=>s.generation,        unit:'generations', gpPer:1,
    tiers:[{id:'mt_gen_10',name:'First Wave',target:10,diamonds:1},{id:'mt_gen_25',name:'Getting Going',target:25,diamonds:1},{id:'m_gen_50',name:'Half Century',target:50,diamonds:1},{id:'q_gen_100',name:'Century',target:100,diamonds:2},{id:'mt_gen_200',name:'Bicentennial',target:200,diamonds:2},{id:'q_gen_500',name:'Five Hundred',target:500,diamonds:3},{id:'q_gen_1000',name:'Millennium',target:1000,diamonds:4},{id:'mt_gen_2000',name:'Two Thousand',target:2000,diamonds:4},{id:'q_gen_5000',name:'The Long Game',target:5000,diamonds:5},{id:'q_gen_10000',name:'Eternal Lineage',target:10000,diamonds:6},{id:'mt_gen_25000',name:'Ancient Dynasty',target:25000,diamonds:8},{id:'mt_gen_50000',name:'Timeless',target:50000,diamonds:12}]},
  { id:'fitness',     name:'FITNESS',        val:s=>s.highestFitness,    unit:'max fitness', gpPer:1,
    tiers:[{id:'mt_fit_5',name:'First Spark',target:5,diamonds:1},{id:'q_fitness_10',name:'Fitness Fanatic',target:10,diamonds:1},{id:'q_fitness_15',name:'Strong Bloodline',target:15,diamonds:1},{id:'q_fitness_20',name:'Elite Lineage',target:20,diamonds:2},{id:'mt_fit_25',name:'Champion',target:25,diamonds:3},{id:'q_fitness_30',name:'Apex Lineage',target:30,diamonds:3},{id:'mt_fit_35',name:'Legendary',target:35,diamonds:4},{id:'q_fitness_40',name:'Transcendent',target:40,diamonds:5},{id:'mt_fit_45',name:'Ascended',target:45,diamonds:6},{id:'q_fitness_50',name:'God Complex',target:50,diamonds:8},{id:'mt_fit_60',name:'Beyond Mortal',target:60,diamonds:12},{id:'mt_fit_75',name:'Absolute',target:75,diamonds:18},{id:'mt_fit_100',name:'Centenary Peak',target:100,diamonds:25},{id:'mt_fit_125',name:'Theoretical Max',target:125,diamonds:35}]},
  { id:'traits',      name:'TRAITS',         val:s=>bestSingleTrait(s),  unit:'best trait',  gpPer:1,
    tiers:[{id:'mt_tr_5',name:'Hint of Potential',target:5,diamonds:1},{id:'q_trait_10',name:'Promising Stock',target:10,diamonds:1},{id:'mt_tr_15',name:'Notable',target:15,diamonds:1},{id:'q_trait_20',name:'Perfect Gene',target:20,diamonds:2},{id:'mt_tr_25',name:'Exceptional',target:25,diamonds:3},{id:'mt_tr_30',name:'Superior',target:30,diamonds:3},{id:'q_trait_35',name:'Beyond Normal',target:35,diamonds:4},{id:'mt_tr_40',name:'Extraordinary',target:40,diamonds:5},{id:'q_trait_50',name:'Theoretical Limit',target:50,diamonds:6},{id:'mt_tr_75',name:'Past the Cap',target:75,diamonds:10},{id:'mt_tr_100',name:'Impossible',target:100,diamonds:15},{id:'mt_tr_125',name:'Absolute Max',target:125,diamonds:25}]},
  { id:'gold',        name:'GOLD EARNED',    val:s=>s.totalGoldEarned,   unit:'total gold',  gpPer:1,
    tiers:[{id:'m_gold_50',name:'Prospector',target:50,diamonds:1},{id:'m_gold_250',name:'Goldsmith',target:250,diamonds:1},{id:'m_gold_1000',name:'Comfortable',target:1000,diamonds:1},{id:'m_gold_5000',name:'Well Off',target:5000,diamonds:2},{id:'m_gold_20000',name:'Wealthy',target:20000,diamonds:2},{id:'mt_gold_75k',name:'Rich',target:75000,diamonds:3},{id:'mt_gold_250k',name:'Magnate',target:250000,diamonds:4},{id:'mt_gold_1m',name:'Tycoon',target:1000000,diamonds:5},{id:'mt_gold_5m',name:'Industrialist',target:5000000,diamonds:8},{id:'mt_gold_20m',name:'Mogul',target:20000000,diamonds:12}]},
  { id:'diamonds',    name:'DIAMONDS EARNED',val:s=>s.totalDiamondsEarned,unit:'total diamonds',gpPer:1,
    tiers:[{id:'m_dia_1',name:'First Jewel',target:1,diamonds:0},{id:'m_dia_5',name:'Sparkle',target:5,diamonds:1},{id:'m_dia_10',name:'Gem Collector',target:10,diamonds:1},{id:'m_dia_25',name:'Jeweller',target:25,diamonds:1},{id:'m_dia_50',name:'Hoarder',target:50,diamonds:2},{id:'m_dia_100',name:'Diamond Mine',target:100,diamonds:2},{id:'m_dia_250',name:'Baron',target:250,diamonds:3},{id:'m_dia_500',name:'Mogul',target:500,diamonds:4},{id:'m_dia_1000',name:'Diamond Empire',target:1000,diamonds:5},{id:'m_dia_2500',name:'Dynasty',target:2500,diamonds:8},{id:'m_dia_10000',name:'Diamond God',target:10000,diamonds:15}]},
  { id:'population',  name:'POPULATION',     val:s=>safeNum(s.maxPopEver,s.population.length),unit:'max alive',gpPer:1,
    tiers:[{id:'mt_pop_5',name:'Small Group',target:5,diamonds:1},{id:'q_pop_8',name:'Growing',target:8,diamonds:1},{id:'mt_pop_12',name:'Cluster',target:12,diamonds:1},{id:'mt_pop_20',name:'Colony',target:20,diamonds:2},{id:'mt_pop_30',name:'Settlement',target:30,diamonds:2},{id:'mt_pop_40',name:'Commune',target:40,diamonds:3},{id:'mt_pop_60',name:'Township',target:60,diamonds:4},{id:'mt_pop_100',name:'City',target:100,diamonds:6}]},
  { id:'upgrades',    name:'UPGRADES',       val:s=>GOLD_UPGRADES.reduce((n,d)=>n+safeNum(s.upgrades?.[d.id]),0),unit:'gold upgrade levels',gpPer:1,
    tiers:[{id:'q_first_upgrade',name:'First Investment',target:1,diamonds:1},{id:'mt_upg_5',name:'Invested',target:5,diamonds:1},{id:'mt_upg_15',name:'Committed',target:15,diamonds:2},{id:'mt_upg_25',name:'Dedicated',target:25,diamonds:3},{id:'mt_upg_35',name:'Obsessed',target:35,diamonds:4},{id:'mt_upg_45',name:'Expert',target:45,diamonds:5},{id:'mt_upg_55',name:'Gold Maxed',target:55,diamonds:8}]},
  { id:'research',    name:'RESEARCH',       val:s=>safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0),unit:'researchers',gpPer:1,
    tiers:[{id:'m_first_researcher',name:'Research Initiative',target:1,diamonds:1},{id:'mt_res_3',name:'Growing Team',target:3,diamonds:1},{id:'mt_res_8',name:'Division',target:8,diamonds:2},{id:'mt_res_15',name:'Department',target:15,diamonds:3},{id:'mt_res_25',name:'Full Lab',target:25,diamonds:4},{id:'mt_res_37',name:'Complete Division',target:37,diamonds:6}]},
  { id:'icons',       name:'ICON COLLECTION',val:s=>(s.ownedIcons||[]).length,unit:'icons',gpPer:1,
    tiers:[{id:'mt_icon_1',name:'First Find',target:1,diamonds:0},{id:'mt_icon_5',name:'Growing Set',target:5,diamonds:1},{id:'mt_icon_15',name:'Collector',target:15,diamonds:2},{id:'mt_icon_30',name:'Curator',target:30,diamonds:3},{id:'mt_icon_50',name:'Archivist',target:50,diamonds:5},{id:'mt_icon_80',name:'Master Collector',target:80,diamonds:8},{id:'mt_icon_125',name:'Complete Set',target:125,diamonds:20}]},
  { id:'immortals',   name:'IMMORTALS',      val:s=>(s.immortals||[]).length,unit:'immortals',gpPer:1,
    tiers:[{id:'mt_imm_1',name:'First Champion',target:1,diamonds:2},{id:'mt_imm_3',name:'Elite Guard',target:3,diamonds:4},{id:'mt_imm_5',name:'Immortal Legion',target:5,diamonds:8}]},
  { id:'pve',         name:'PVE CAMPAIGN',   val:s=>(s.pveCompleted||[]).length,unit:'stages cleared',gpPer:1,
    tiers:[{id:'mt_pve_1',name:'First Blood',target:1,diamonds:2},{id:'mt_pve_3',name:'Veteran Fighter',target:3,diamonds:3},{id:'mt_pve_5',name:'Arena Champion',target:5,diamonds:5},{id:'mt_pve_8',name:'War Hero',target:8,diamonds:8},{id:'mt_pve_10',name:'Undefeated',target:10,diamonds:15}]},
];

// ═══════════════════════════════════════════════════════════
//  SECRET MILESTONES — hard/unusual, not from normal play
// ═══════════════════════════════════════════════════════════
const SECRET_MILESTONES = [
  { id:'ms_secret_username_bg',  name:'You Wish',
    desc:'Try to set your username to "breeding-ground".',
    check:s=>s.triedUsernameBreedingGround===true, diamonds:3, gp:5 },
  { id:'ms_secret_purge_all',    name:'Scorched Earth',
    desc:'Cull every creature except the last two, 5 separate times.',
    check:s=>safeNum(s.purgeAllCount)>=5, diamonds:4, gp:5 },
  { id:'ms_secret_no_upgrade',   name:'Purist',
    desc:'Reach generation 200 without purchasing any upgrades.',
    check:s=>s.generation>=200&&GOLD_UPGRADES.every(u=>safeNum(s.upgrades?.[u.id])===0), diamonds:5, gp:5 },
  { id:'ms_secret_palindrome_gen', name:'Palindrome Generation',
    desc:'Reach a generation number that reads the same forwards and backwards (e.g. 121, 1221).',
    check:s=>{ const g=String(safeNum(s.generation)); return g.length>1&&g===g.split('').reverse().join(''); }, diamonds:3, gp:5 },
  { id:'ms_secret_same_parents',  name:'Incestuous',
    desc:'Breed the same pair of creatures 10 times in a row using Selective Breeding.',
    check:s=>safeNum(s.sameParentBreedCount)>=10, diamonds:3, gp:5 },
  { id:'ms_secret_all_max_traits','name':'Quintuple Threat',
    desc:'Have 5 creatures alive simultaneously each with a different trait above 50.',
    check:s=>{
      if(s.population.length<5) return false;
      return TRAIT_KEYS.every(t=>s.population.some(c=>safeNum(c.traits?.[t])>50));
    }, diamonds:5, gp:5 },
  { id:'ms_secret_midnight',     name:'Night Owl',
    desc:'Save the game between 2am and 4am local time.',
    check:s=>s.savedAtMidnight===true, diamonds:2, gp:5 },
  { id:'ms_secret_idle_gen',     name:'Hands Off',
    desc:'Let the auto-breeder reach generation 500 without manually breeding.',
    check:s=>s.autoBreederOnlyGen500===true, diamonds:4, gp:5 },
  { id:'ms_secret_broke_diamond',name:'Diamond Broke',
    desc:'Spend all your diamonds down to exactly 0.',
    check:s=>s.brokeOnDiamonds===true, diamonds:3, gp:5 },
  { id:'ms_secret_instant_cull', name:'No Mercy',
    desc:'Cull a creature on the very first generation (generation 2).',
    check:s=>s.culledOnGen2===true, diamonds:2, gp:5 },
  { id:'ms_secret_full_vault',   name:'Completionist',
    desc:`Own all ${TOTAL_ICONS} icons across every Gene Vault.`,
    check:s=>(s.ownedIcons||[]).length>=TOTAL_ICONS, diamonds:15, gp:5 },
  { id:'ms_secret_pvp_win',      name:'The Challenger',
    desc:'Win your first PvP fight.',
    check:s=>safeNum(s.pvpWins)>=1, diamonds:3, gp:5 },
  { id:'ms_secret_all_pve',      name:'Conqueror',
    desc:'Complete the entire PvE campaign.',
    check:s=>(s.pveCompleted||[]).length>=PVE_STAGES.length, diamonds:10, gp:5 },
  { id:'ms_secret_max_fitness',  name:'The Absolute',
    desc:'Achieve the maximum possible fitness of 125.',
    check:s=>s.highestFitness>=125, diamonds:20, gp:5 },
  { id:'ms_secret_five_immortals','name':'Legion',
    desc:'Immortalise 5 different creatures.',
    check:s=>(s.immortals||[]).length>=5, diamonds:8, gp:5 },
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let state = {};
let currentTab          = 'log';
let selectedForBreeding = [];
let bestEverTraits      = {};
let autoBredCount       = 0;
let autoBreedInterval   = null;
let pendingImmortalId   = null;
let pvpChallengeTarget  = null;
let pvpChallengeImmortal= null;
let combatSubTab        = 'pve';

function defaultState() {
  return {
    generation:1, population:[], gold:0, diamonds:0, genePoints:0,
    totalBred:0, totalCulled:0, totalGoldEarned:0,
    totalDiamondsEarned:0, totalDiamondsSpent:0, highestFitness:0, maxPopEver:0,
    completedMilestones:[], milestoneDiamondsAwarded:[],
    surgeBreedsRemaining:0, surgeUseCount:0,
    everBroke:false, culledOwnRecord:false,
    usedLegendaryStock:false, hasSetUsername:false,
    bredBeforeFirstCull:0, firstCullDone:false, culledFromThree:false,
    // secret tracking
    triedUsernameBreedingGround:false,
    purgeAllCount:0, sameParentBreedCount:0, lastBreedParents:null,
    savedAtMidnight:false, autoBreederOnlyGen500:false,
    brokeOnDiamonds:false, culledOnGen2:false,
    manualBreedsSinceAutoOn:0,
    // research
    diamondBuffer:0, lastArchivistGen:1, totalResearchDiamondsEarned:0,
    // vault
    totalVaultOpens:0, ownedIcons:[], selectedIcon:null,
    vault_aquatic_opens:0, vault_flora_opens:0, vault_cosmos_opens:0,
    vault_predator_opens:0, vault_ancient_opens:0,
    // immortals & combat
    immortals:[], pveCompleted:[], pvpWins:0, pvpLosses:0,
    combatLog:[],
    research:{
      labInterns:0, geneAnalysts:0, lineageArchivists:0,
      headOfResearch:false, automatedSequencer:false,
    },
    upgrades:{
      popCap:0,mutation:0,traitAmp:0,breedYield:0,cullValue:0,
      selective:0,cullInsight:0,lineageMem:0,hybridVigor:0,adaptiveGenetics:0,
      autoBreeder:0, traitCapBoost:0,eliteMutation:0,deepArchive:0,
    },
  };
}

// ── derived helpers ──────────────────────────────────────────
function getMaxPop()   { return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20; }
function getBreedGold(){ return [1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1; }
function getCullBonus(){ return [0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0; }
function getCullCount(){ return [1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1; }
function getMutRate()  { return [0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15; }
function getMutBonus() { return safeNum(state.upgrades?.mutation)>=6?2:1; }
function getAmpRate()  { return [0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0; }
function getAmpBonus() { return safeNum(state.upgrades?.traitAmp)>=5; }
function getMemRate()  { return [0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0; }
function getMemBonus() { return [0,1,2][safeNum(state.upgrades?.deepArchive)]??0; }
function getTraitCap() { return TRAIT_MAX+([0,5,10,20,35,55,75][safeNum(state.upgrades?.traitCapBoost)]??0); }
function researchMult(){ return (state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1); }
function researchBreedYield(){ return safeNum(state.research?.labInterns)*0.15*researchMult(); }
function researchCullYield() { return safeNum(state.research?.geneAnalysts)*0.4*researchMult(); }
function researchArchYield() { return safeNum(state.research?.lineageArchivists)*1.0*researchMult(); }
function getAutoBreedRate()  { return AUTO_BREED_RATES[safeNum(state.upgrades?.autoBreeder)]??0; }

function getMilestoneCounts() {
  const allIds=[...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)];
  const done=allIds.filter(id=>(state.completedMilestones||[]).includes(id)).length;
  return { done, total:allIds.length };
}
window.getMilestoneCounts = getMilestoneCounts;

function migrateCrature(c) {
  if(!c||typeof c!=='object') return null;
  const t=c.traits||{};
  return { id:c.id||Math.random().toString(36).slice(2,8).toUpperCase(), generation:safeNum(c.generation,1),
    traits:{ speed:safeNum(t.speed,rand(1,8)), strength:safeNum(t.strength,rand(1,8)), stamina:safeNum(t.stamina,rand(1,8)), intelligence:safeNum(t.intelligence,rand(1,8)), resilience:safeNum(t.resilience,rand(1,8)) }};
}

function sanitiseState(s) {
  return {
    ...s,
    generation:safeNum(s.generation,1), gold:safeNum(s.gold), diamonds:safeNum(s.diamonds),
    genePoints:safeNum(s.genePoints),
    totalBred:safeNum(s.totalBred), totalCulled:safeNum(s.totalCulled),
    totalGoldEarned:safeNum(s.totalGoldEarned), totalDiamondsEarned:safeNum(s.totalDiamondsEarned),
    totalDiamondsSpent:safeNum(s.totalDiamondsSpent), highestFitness:safeNum(s.highestFitness),
    maxPopEver:safeNum(s.maxPopEver), surgeBreedsRemaining:safeNum(s.surgeBreedsRemaining),
    surgeUseCount:safeNum(s.surgeUseCount),
    everBroke:!!s.everBroke, culledOwnRecord:!!s.culledOwnRecord,
    usedLegendaryStock:!!s.usedLegendaryStock, hasSetUsername:!!s.hasSetUsername,
    bredBeforeFirstCull:safeNum(s.bredBeforeFirstCull), firstCullDone:!!s.firstCullDone, culledFromThree:!!s.culledFromThree,
    triedUsernameBreedingGround:!!s.triedUsernameBreedingGround,
    purgeAllCount:safeNum(s.purgeAllCount), sameParentBreedCount:safeNum(s.sameParentBreedCount),
    savedAtMidnight:!!s.savedAtMidnight, autoBreederOnlyGen500:!!s.autoBreederOnlyGen500,
    brokeOnDiamonds:!!s.brokeOnDiamonds, culledOnGen2:!!s.culledOnGen2,
    manualBreedsSinceAutoOn:safeNum(s.manualBreedsSinceAutoOn),
    lastBreedParents:s.lastBreedParents||null,
    diamondBuffer:safeNum(s.diamondBuffer), lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned),
    totalVaultOpens:safeNum(s.totalVaultOpens),
    ownedIcons:Array.isArray(s.ownedIcons)?s.ownedIcons:[],
    selectedIcon:s.selectedIcon||null,
    vault_aquatic_opens:safeNum(s.vault_aquatic_opens), vault_flora_opens:safeNum(s.vault_flora_opens),
    vault_cosmos_opens:safeNum(s.vault_cosmos_opens), vault_predator_opens:safeNum(s.vault_predator_opens),
    vault_ancient_opens:safeNum(s.vault_ancient_opens),
    completedMilestones:Array.isArray(s.completedMilestones)?s.completedMilestones:[],
    milestoneDiamondsAwarded:Array.isArray(s.milestoneDiamondsAwarded)?s.milestoneDiamondsAwarded:[],
    immortals:Array.isArray(s.immortals)?s.immortals:[],
    pveCompleted:Array.isArray(s.pveCompleted)?s.pveCompleted:[],
    pvpWins:safeNum(s.pvpWins), pvpLosses:safeNum(s.pvpLosses),
    combatLog:Array.isArray(s.combatLog)?s.combatLog:[],
    research:{
      labInterns:safeNum(s.research?.labInterns), geneAnalysts:safeNum(s.research?.geneAnalysts),
      lineageArchivists:safeNum(s.research?.lineageArchivists),
      headOfResearch:!!s.research?.headOfResearch, automatedSequencer:!!s.research?.automatedSequencer,
    },
    upgrades:{
      popCap:safeNum(s.upgrades?.popCap), mutation:safeNum(s.upgrades?.mutation),
      traitAmp:safeNum(s.upgrades?.traitAmp), breedYield:safeNum(s.upgrades?.breedYield),
      cullValue:safeNum(s.upgrades?.cullValue),
      selective:safeNum(s.upgrades?.selective), cullInsight:safeNum(s.upgrades?.cullInsight),
      lineageMem:safeNum(s.upgrades?.lineageMem), hybridVigor:safeNum(s.upgrades?.hybridVigor),
      adaptiveGenetics:safeNum(s.upgrades?.adaptiveGenetics),
      autoBreeder:safeNum(s.upgrades?.autoBreeder),
      traitCapBoost:safeNum(s.upgrades?.traitCapBoost), eliteMutation:safeNum(s.upgrades?.eliteMutation),
      deepArchive:safeNum(s.upgrades?.deepArchive),
    },
    population:(s.population||[]).map(migrateCrature).filter(Boolean),
  };
}

function rebuildBestEverTraits() {
  TRAIT_KEYS.forEach(t=>{bestEverTraits[t]=1;});
  state.population.forEach(c=>TRAIT_KEYS.forEach(t=>{ const v=safeNum(c.traits[t]); if(v>bestEverTraits[t]) bestEverTraits[t]=v; }));
  (state.immortals||[]).forEach(im=>{ if(im.creature) TRAIT_KEYS.forEach(t=>{ const v=safeNum(im.creature.traits?.[t]); if(v>bestEverTraits[t]) bestEverTraits[t]=v; }); });
}

function migrateLegacyProgress() {
  const allIds=new Set([...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)]);
  const legacyIds=[...(state.completedQuests||[]),...(state.unlockedAchievements||[]),...(state.diamondQuestsRewarded||[])];
  legacyIds.forEach(id=>{ if(allIds.has(id)&&!state.completedMilestones.includes(id)) state.completedMilestones.push(id); });
}

function flushDiamondBuffer() {
  while(state.diamondBuffer>=1){
    state.diamondBuffer-=1; state.diamonds+=1; state.totalDiamondsEarned+=1; state.totalResearchDiamondsEarned+=1;
  }
}
function tickArchivists() {
  if(!safeNum(state.research?.lineageArchivists)) return;
  const last=safeNum(state.lastArchivistGen,1);
  const ticks=Math.floor((safeNum(state.generation)-last)/25);
  if(ticks<=0) return;
  state.diamondBuffer+=ticks*researchArchYield();
  state.lastArchivistGen=last+ticks*25;
  flushDiamondBuffer();
}

// ── Auto-breeder ─────────────────────────────────────────────
function startAutoBreeder() {
  stopAutoBreeder();
  const rate = getAutoBreedRate();
  if (rate <= 0) return;
  const intervalMs = Math.round(1000 / rate);
  autoBreedInterval = setInterval(() => {
    if (state.population.length < 2 || state.population.length >= getMaxPop()) return;
    const [pA, pB] = [...state.population].sort(() => Math.random() - 0.5);
    _doBreed(pA, pB, false, true); // silent=true batches log
  }, intervalMs);
}
function stopAutoBreeder() {
  if (autoBreedInterval) { clearInterval(autoBreedInterval); autoBreedInterval = null; }
}
window.stopAutoBreeder = stopAutoBreeder;

// ═══════════════════════════════════════════════════════════
//  SAVE / LOAD
// ═══════════════════════════════════════════════════════════
window.getSaveData = () => sanitiseState(state);

window.applySaveData = (data) => {
  state = sanitiseState({...defaultState(),...data});
  selectedForBreeding = [];
  rebuildBestEverTraits();
  migrateLegacyProgress();
  checkMilestones();
  startAutoBreeder();
  renderAll();
};

window.initNewGame = () => {
  state = defaultState();
  state.population = Array.from({length:5}, ()=>makeCreature());
  rebuildBestEverTraits();
  startAutoBreeder();
  renderAll();
};

window.notifyUsernameSet = () => {
  if (!state.hasSetUsername) { state.hasSetUsername=true; checkMilestones(); renderAll(); }
};

window.notifyTriedBreedingGround = () => {
  if (!state.triedUsernameBreedingGround) {
    state.triedUsernameBreedingGround=true; checkMilestones(); renderAll();
  }
};

window.notifySavedAtMidnight = () => {
  if (!state.savedAtMidnight) { state.savedAtMidnight=true; checkMilestones(); }
};

// ═══════════════════════════════════════════════════════════
//  SCORE
// ═══════════════════════════════════════════════════════════
window.calcScore = () => Math.floor(
  (safeNum(state.highestFitness)*200 + safeNum(state.generation)*10 +
   safeNum(state.totalBred)*3 + safeNum(state.totalCulled)*5 +
   safeNum(state.totalGoldEarned) + safeNum(state.totalDiamondsEarned)*100) / 10
);

// ═══════════════════════════════════════════════════════════
//  CREATURE HELPERS
// ═══════════════════════════════════════════════════════════
function calcFitness(c) { return Math.round(TRAIT_KEYS.reduce((s,t)=>s+safeNum(c.traits[t]),0)/TRAIT_KEYS.length); }
function isMaxFitness(c) { return calcFitness(c) >= IMMORTAL_FITNESS_THRESHOLD; }

function inheritVal(va, vb, traitKey) {
  va=safeNum(va,4); vb=safeNum(vb,4);
  const cap=getTraitCap();
  if(getMemRate()>0 && Math.random()<getMemRate())
    return Math.max(1, Math.min(cap, safeNum(bestEverTraits[traitKey], Math.max(va,vb))+getMemBonus()));
  const ampBase=(getAmpRate()>0&&Math.random()<getAmpRate()) ? Math.max(va,vb) : (Math.random()<0.5?va:vb);
  const ampBonus=(getAmpBonus()&&Math.random()<0.1)?1:0;
  const parentAvg=(va+vb)/2;
  const agLvl=safeNum(state.upgrades?.adaptiveGenetics);
  const agRates=[0,0.2,0.45,0.70,1.0];
  let base=ampBase+ampBonus;
  if(agLvl>0&&base<parentAvg){ if(agLvl>=4||(Math.random()<(agRates[agLvl]||0))) base=Math.max(base,Math.floor(parentAvg)); }
  const alwaysPos=safeNum(state.upgrades?.mutation)>=4;
  const doubleMut=safeNum(state.upgrades?.mutation)>=5;
  const mutBonus=getMutBonus();
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
      const bonus=eliteLvl>=3&&base>=30?mutBonus:1;
      val=Math.max(1,Math.min(cap,val+dir*bonus));
    }
  };
  applyMut(); if(doubleMut) applyMut();
  const hvLvl=safeNum(state.upgrades?.hybridVigor);
  if(hvLvl>0){
    const hvC=[0,0.10,0.22,0.35,0.50][hvLvl]||0;
    const hvB=[0,1,2,3,3][hvLvl]||0;
    if(Math.random()<hvC) val=Math.min(cap,val+hvB);
  }
  return val;
}

function makeCreature(parentA=null, parentB=null) {
  const traits={}, cap=getTraitCap();
  if (parentA) {
    TRAIT_KEYS.forEach(t=>{ traits[t]=inheritVal(parentA.traits[t], parentB.traits[t], t); });
  } else {
    const [gmin,gmax]=[1,8];
    TRAIT_KEYS.forEach(t=>{ traits[t]=Math.min(cap, rand(gmin,gmax)); });
  }
  return { id:Math.random().toString(36).slice(2,8).toUpperCase(), generation:state.generation, traits };
}

// ═══════════════════════════════════════════════════════════
//  ACTIONS
// ═══════════════════════════════════════════════════════════
window.breedCycle = () => {
  if(state.population.length<2) return addLog('Not enough creatures to breed.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const [pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
  if(safeNum(state.upgrades?.autoBreeder)>0) state.manualBreedsSinceAutoOn=safeNum(state.manualBreedsSinceAutoOn)+1;
  _doBreed(pA,pB);
};

window.breedSelected = () => {
  if(!safeNum(state.upgrades?.selective)) return addLog('Selective Breeding upgrade required.','warn');
  if(selectedForBreeding.length!==2) return addLog('Select exactly 2 creatures.','warn');
  if(state.population.length>=getMaxPop()) return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');
  const pA=state.population.find(c=>c.id===selectedForBreeding[0]);
  const pB=state.population.find(c=>c.id===selectedForBreeding[1]);
  if(!pA||!pB) return addLog('Selected creatures not found.','warn');
  // same-parent tracking
  const pairKey=[pA.id,pB.id].sort().join('|');
  if(state.lastBreedParents===pairKey) {
    state.sameParentBreedCount=safeNum(state.sameParentBreedCount)+1;
  } else {
    state.sameParentBreedCount=1; state.lastBreedParents=pairKey;
  }
  if(safeNum(state.upgrades?.autoBreeder)>0) state.manualBreedsSinceAutoOn=safeNum(state.manualBreedsSinceAutoOn)+1;
  selectedForBreeding=[];
  _doBreed(pA,pB,true);
};

function _doBreed(pA, pB, targeted=false, silent=false) {
  const child=makeCreature(pA,pB), fitness=calcFitness(child);
  state.population.push(child); state.generation++; state.totalBred++;
  const ge=getBreedGold(); state.gold+=ge; state.totalGoldEarned+=ge;
  if(safeNum(state.surgeBreedsRemaining)>0) state.surgeBreedsRemaining--;
  if(!state.firstCullDone) state.bredBeforeFirstCull=safeNum(state.bredBeforeFirstCull)+1;
  TRAIT_KEYS.forEach(t=>{ const v=safeNum(child.traits[t]); if(v>(bestEverTraits[t]||0)) bestEverTraits[t]=v; });
  if(state.population.length>safeNum(state.maxPopEver)) state.maxPopEver=state.population.length;
  const ry=researchBreedYield();
  if(ry>0){ state.diamondBuffer=safeNum(state.diamondBuffer)+ry; flushDiamondBuffer(); }
  tickArchivists();
  checkEverBroke();
  if(!silent) {
    const ts2=TRAIT_ABR.map((a,i)=>`${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
    if(fitness>safeNum(state.highestFitness)){
      state.highestFitness=fitness;
      addLog(`${targeted?'TARGETED ':''}Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}! [${ts2}]`,'highlight');
    } else {
      addLog(`${targeted?'Targeted — ':''}Gen ${fmt(state.generation)}: ${child.id} born [${ts2}] → fitness ${fmt(fitness)}`);
    }
  } else {
    autoBredCount++;
    if(fitness>safeNum(state.highestFitness)){
      state.highestFitness=fitness;
      addLog(`Auto-Breeder: Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}!`,'highlight');
    } else if(autoBredCount % 10 === 0) {
      addLog(`Auto-Breeder: ${fmt(autoBredCount)} breeds this session, gen ${fmt(state.generation)}`);
    }
  }
  checkMilestones(); renderAll();
}

window.cullWeakest = () => {
  const minPop=2;
  if(state.population.length<=minPop) return addLog(`Population too small (min ${minPop}).`,'warn');
  state.population.forEach(c=>{ c._f=calcFitness(c); });
  state.population.sort((a,b)=>a._f-b._f);
  if(state.population.length===3) state.culledFromThree=true;
  if(state.generation===2&&!state.firstCullDone) state.culledOnGen2=true;
  const aboutToCull=state.population.slice(0,Math.min(getCullCount(),state.population.length-minPop));
  if(!state.culledOwnRecord&&state.highestFitness>0&&aboutToCull.some(c=>c._f>=state.highestFitness)) state.culledOwnRecord=true;
  const actualCull=Math.min(getCullCount(),state.population.length-minPop);
  // check if purging to near-empty
  if(actualCull>=state.population.length-3) state.purgeAllCount=safeNum(state.purgeAllCount)+1;
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

window.buyUpgrade = (id) => {
  const def=GOLD_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.gold<cost) return addLog(`Need ${fmt(cost)} gold — you have ${fmt(state.gold)}.`,'warn');
  state.gold-=cost; state.upgrades[id]=lvl+1; checkEverBroke();
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`,'highlight');
  if(id==='autoBreeder') { startAutoBreeder(); state.manualBreedsSinceAutoOn=0; }
  checkMilestones(); renderAll();
};

window.buyDiamondUpgrade = (id) => {
  const def=DIAMOND_UPGRADES.find(u=>u.id===id); if(!def) return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length) return addLog(`${def.name} already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.diamonds<cost) return addLog(`Need ${cost} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  state.diamonds-=cost; state.upgrades[id]=lvl+1; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+cost;
  checkBrokeDiamond();
  addLog(`💎 Purchased ${def.name} Lv ${state.upgrades[id]}.`,'diamond');
  checkMilestones(); renderAll();
};

window.hireResearcher = (id) => {
  const def=RESEARCH_DEF.find(r=>r.id===id); if(!def) return;
  if(def.type==='unique'){
    if(state.research[id]) return addLog(`${def.name} already active.`,'warn');
    if(state.diamonds<def.cost) return addLog(`Need ${fmt(def.cost)} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=def.cost; state.research[id]=true; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+def.cost;
    checkBrokeDiamond();
    addLog(`💎 ${def.name} now active.`,'diamond');
  } else {
    const cur=safeNum(state.research[id]);
    if(cur>=def.max) return addLog(`${def.plural||def.name} fully staffed.`,'warn');
    const cost=researchHireCost(cur);
    if(state.diamonds<cost) return addLog(`Need ${fmt(cost)} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
    state.diamonds-=cost; state.research[id]=cur+1; state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+cost;
    checkBrokeDiamond();
    const nextCost=researchHireCost(cur+1);
    addLog(`💎 Hired ${def.plural||def.name} ${cur+1}/${def.max}. Next: ${nextCost<=500?fmt(nextCost):'500 (max)'} 💎`,'diamond');
  }
  checkMilestones(); renderAll();
};

// ── IMMORTALISE ───────────────────────────────────────────────
window.openImmortaliseModal = (id) => {
  const c=state.population.find(x=>x.id===id); if(!c) return;
  if(!isMaxFitness(c)) return addLog(`${c.id} does not meet the fitness threshold (${IMMORTAL_FITNESS_THRESHOLD}).`,'warn');
  pendingImmortalId=id;
  document.getElementById('immortal-name-input').value='';
  document.getElementById('immortal-name-message').textContent='';
  document.getElementById('name-immortal-modal').classList.remove('hidden');
};

window.cancelImmortalName = () => {
  pendingImmortalId=null;
  document.getElementById('name-immortal-modal').classList.add('hidden');
};

window.confirmImmortalName = () => {
  const name=(document.getElementById('immortal-name-input').value||'').trim();
  const msgEl=document.getElementById('immortal-name-message');
  if(!name||name.length<1) { msgEl.textContent='Enter a name.'; return; }
  if(name.length>24) { msgEl.textContent='Max 24 characters.'; return; }
  const c=state.population.find(x=>x.id===pendingImmortalId); if(!c) return;
  // Remove from population
  state.population=state.population.filter(x=>x.id!==pendingImmortalId);
  // Add to immortals
  state.immortals=state.immortals||[];
  state.immortals.push({ id:pendingImmortalId, name, creature:c, skills:[], fitness:calcFitness(c) });
  pendingImmortalId=null;
  document.getElementById('name-immortal-modal').classList.add('hidden');
  addLog(`🔱 ${name} has been immortalised! They cannot be culled and are ready for combat.`,'highlight');
  checkMilestones();
  // Notify tab badge
  document.getElementById('tab-combat').classList.add('has-badge');
  renderAll();
};

window.buyImmortalSkill = (immortalId, skillId) => {
  const im=state.immortals?.find(x=>x.id===immortalId); if(!im) return;
  const branch=IMMORTAL_SKILL_BRANCHES.find(b=>b.skills.some(s=>s.id===skillId));
  const skill=branch?.skills.find(s=>s.id===skillId); if(!skill) return;
  if((im.skills||[]).includes(skillId)) return addLog(`${skill.name} already unlocked.`,'warn');
  const tierIdx=branch.skills.findIndex(s=>s.id===skillId);
  if(tierIdx>0&&!(im.skills||[]).includes(branch.skills[tierIdx-1].id))
    return addLog(`Requires previous tier in ${branch.name} first.`,'warn');
  if(state.genePoints<skill.cost) return addLog(`Need ${skill.cost} 🧪 — you have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=skill.cost;
  im.skills=[...(im.skills||[]), skillId];
  addLog(`🧪 ${im.name}: ${skill.name} unlocked (${skill.effect})`, 'gp');
  checkMilestones(); renderAll();
};

// ── PvE COMBAT ────────────────────────────────────────────────
window.runPveStage = (stageId, immortalId) => {
  const stage=PVE_STAGES.find(s=>s.id===stageId); if(!stage) return;
  const im=state.immortals?.find(x=>x.id===immortalId); if(!im) return;
  if((state.pveCompleted||[]).includes(stageId)) return addLog('Stage already completed.','warn');
  // Check previous stage completed
  const stageIdx=PVE_STAGES.findIndex(s=>s.id===stageId);
  if(stageIdx>0&&!(state.pveCompleted||[]).includes(PVE_STAGES[stageIdx-1].id))
    return addLog('Complete previous stage first.','warn');
  const attacker=getImmortalCombatStats(im);
  const defenders=Array.from({length:stage.enemies},()=>makePveEnemy(stage.enemyLevel));
  const result=simulateFight(attacker,defenders);
  // Store in combat log
  state.combatLog=[{type:'pve',stageName:stage.name,won:result.won,immortalName:im.name,log:result.log,time:ts()},...(state.combatLog||[]).slice(0,19)];
  if(result.won){
    state.pveCompleted=[...(state.pveCompleted||[]),stageId];
    state.genePoints+=stage.gpReward;
    // Award icon
    const icon=stage.iconReward;
    if(!(state.ownedIcons||[]).includes(icon)){
      state.ownedIcons=[...(state.ownedIcons||[]),icon];
      addLog(`🏆 Stage "${stage.name}" complete! +${stage.gpReward} 🧪 + icon ${icon}`,'gp');
    } else {
      addLog(`🏆 Stage "${stage.name}" complete! +${stage.gpReward} 🧪 (icon duplicate)`,'gp');
    }
  } else {
    addLog(`💀 Stage "${stage.name}" failed. Train harder.`,'warn');
  }
  checkMilestones(); renderAll();
};

// ── PvP ───────────────────────────────────────────────────────
window.openPvpChallengeModal = (targetUid, targetUsername) => {
  if(!(state.immortals||[]).length) return addLog('You need at least one immortal to challenge.','warn');
  pvpChallengeTarget={uid:targetUid, username:targetUsername};
  document.getElementById('pvp-challenge-target').textContent=`Challenge ${targetUsername} to a fight?`;
  document.getElementById('pvp-challenge-message').textContent='';
  const sel=document.getElementById('pvp-immortal-selector');
  sel.innerHTML='';
  (state.immortals||[]).forEach(im=>{
    const stats=getImmortalCombatStats(im);
    const div=document.createElement('div');
    div.className='immortal-option'; div.dataset.id=im.id;
    div.innerHTML=`<span class="immortal-option-name">${im.name}</span><span class="immortal-option-stats">ATK ${stats.atk} SPD ${stats.spd} DEF ${stats.def} HP ${stats.hp}</span>`;
    div.onclick=()=>{ document.querySelectorAll('.immortal-option').forEach(x=>x.classList.remove('selected')); div.classList.add('selected'); pvpChallengeImmortal=im.id; };
    sel.appendChild(div);
  });
  if(state.immortals.length===1){ pvpChallengeImmortal=state.immortals[0].id; sel.firstChild?.classList.add('selected'); }
  document.getElementById('pvp-challenge-modal').classList.remove('hidden');
};

window.cancelPvpChallenge = () => { pvpChallengeTarget=null; pvpChallengeImmortal=null; document.getElementById('pvp-challenge-modal').classList.add('hidden'); };

window.confirmPvpChallenge = async () => {
  if(!pvpChallengeTarget||!pvpChallengeImmortal) { document.getElementById('pvp-challenge-message').textContent='Select an immortal first.'; return; }
  const im=state.immortals?.find(x=>x.id===pvpChallengeImmortal); if(!im) return;
  document.getElementById('pvp-challenge-message').textContent='Sending challenge…';
  try {
    await window.sendPvpChallenge(pvpChallengeTarget, im);
    document.getElementById('pvp-challenge-modal').classList.add('hidden');
    addLog(`⚔ Challenge sent to ${pvpChallengeTarget.username}!`,'combat');
    pvpChallengeTarget=null; pvpChallengeImmortal=null;
  } catch(e) {
    document.getElementById('pvp-challenge-message').textContent=`Error: ${e.message||'try again'}`;
  }
};

// Accept incoming PvP challenge
window.openPvpAcceptModal = (challengeId, challengerName, challengerImmortalName) => {
  if(!(state.immortals||[]).length){ addLog('You need an immortal to accept.','warn'); return; }
  document.getElementById('pvp-accept-target').textContent=`${challengerName} challenged you with ${challengerImmortalName}. Choose your fighter:`;
  document.getElementById('pvp-accept-message').textContent='';
  const sel=document.getElementById('pvp-accept-selector');
  sel.innerHTML='';
  (state.immortals||[]).forEach(im=>{
    const stats=getImmortalCombatStats(im);
    const div=document.createElement('div'); div.className='immortal-option'; div.dataset.id=im.id;
    div.innerHTML=`<span class="immortal-option-name">${im.name}</span><span class="immortal-option-stats">ATK ${stats.atk} SPD ${stats.spd} DEF ${stats.def} HP ${stats.hp}</span>`;
    div.onclick=()=>{ document.querySelectorAll('#pvp-accept-selector .immortal-option').forEach(x=>x.classList.remove('selected')); div.classList.add('selected'); div.dataset.selected='1'; };
    sel.appendChild(div);
  });
  document.getElementById('pvp-accept-modal').dataset.challengeId=challengeId;
  document.getElementById('pvp-accept-modal').classList.remove('hidden');
};

window.declinePvpChallenge = () => {
  const cid=document.getElementById('pvp-accept-modal').dataset.challengeId;
  window.resolvePvpChallenge?.(cid,'declined',null,null);
  document.getElementById('pvp-accept-modal').classList.add('hidden');
};

window.confirmPvpAccept = () => {
  const cid=document.getElementById('pvp-accept-modal').dataset.challengeId;
  const sel=document.querySelector('#pvp-accept-selector .immortal-option[data-selected="1"]');
  if(!sel){ document.getElementById('pvp-accept-message').textContent='Select an immortal first.'; return; }
  const im=state.immortals?.find(x=>x.id===sel.dataset.id); if(!im) return;
  document.getElementById('pvp-accept-modal').classList.add('hidden');
  window.resolvePvpChallenge?.(cid,'accepted',im.id,getImmortalCombatStats(im));
};

// Called from auth.js after PvP result arrives
window.handlePvpResult = (won, opponentName, myImmortalName) => {
  if(won){ state.pvpWins=safeNum(state.pvpWins)+1; addLog(`⚔ PvP: ${myImmortalName} defeated ${opponentName}'s champion!`,'combat'); }
  else    { state.pvpLosses=safeNum(state.pvpLosses)+1; addLog(`⚔ PvP: ${myImmortalName} was defeated by ${opponentName}.`,'combat'); }
  checkMilestones(); renderAll();
};

// ── Vault ─────────────────────────────────────────────────────
window.toggleVaultPreview = (id) => { vaultPreviewId=vaultPreviewId===id?null:id; renderGeneVault(); };

window.openVault = (id) => {
  const vault=GENE_VAULTS.find(v=>v.id===id); if(!vault) return;
  if(state.diamonds<vault.cost) return addLog(`Need ${fmt(vault.cost)} 💎 — you have ${fmt(state.diamonds)}.`,'warn');
  const icon=vault.icons[Math.floor(Math.random()*vault.icons.length)];
  const owned=state.ownedIcons||[];
  const isDupe=owned.includes(icon);
  state.diamonds-=vault.cost; state.totalVaultOpens=safeNum(state.totalVaultOpens)+1;
  state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+vault.cost;
  state[`vault_${vault.id}_opens`]=safeNum(state[`vault_${vault.id}_opens`])+1;
  checkBrokeDiamond();
  if(!isDupe){ state.ownedIcons=[...owned,icon]; addLog(`💎 Gene Vault [${vault.name}]: discovered ${icon} — added to collection!`,'diamond'); }
  else { const refund=Math.floor(vault.cost*0.1); state.diamonds+=refund; state.totalDiamondsEarned+=refund; addLog(`💎 Gene Vault [${vault.name}]: duplicate ${icon} — refunded ${fmt(refund)} 💎`,'diamond'); }
  checkMilestones(); renderAll();
  if(currentTab==='vault') renderGeneVault();
};

window.selectIcon = (icon) => {
  state.selectedIcon=state.selectedIcon===icon?null:icon;
  renderGeneVault(); renderStats();
};

window.toggleSelect = (id) => {
  const idx=selectedForBreeding.indexOf(id);
  if(idx>=0) selectedForBreeding.splice(idx,1);
  else { if(selectedForBreeding.length>=2) selectedForBreeding.shift(); selectedForBreeding.push(id); }
  renderPopulation();
};

function checkEverBroke() { if(!state.everBroke&&state.gold===0&&state.totalGoldEarned>=100) state.everBroke=true; }
function checkBrokeDiamond() { if(state.diamonds===0&&safeNum(state.totalDiamondsEarned)>0) state.brokeOnDiamonds=true; }

// ═══════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════
function checkMilestones() {
  MILESTONE_TRACKS.forEach(track=>{
    const val=track.val(state);
    track.tiers.forEach(tier=>{
      if(state.completedMilestones.includes(tier.id)||val<tier.target) return;
      state.completedMilestones.push(tier.id);
      const gp=track.gpPer||1;
      state.genePoints+=gp;
      const d=tier.diamonds||0;
      if(d>0){ state.diamonds+=d; state.totalDiamondsEarned+=d; state.milestoneDiamondsAwarded.push(tier.id); addLog(`💎 Milestone [${track.name}]: "${tier.name}" +${d}💎 +${gp}🧪`,'diamond'); }
      else    { state.milestoneDiamondsAwarded.push(tier.id); addLog(`✓ Milestone [${track.name}]: "${tier.name}" +${gp}🧪`,'highlight'); }
    });
  });
  SECRET_MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)||!m.check(state)) return;
    state.completedMilestones.push(m.id);
    const gp=m.gp||5;
    state.genePoints+=gp;
    const d=m.diamonds||0;
    if(d>0){ state.diamonds+=d; state.totalDiamondsEarned+=d; state.milestoneDiamondsAwarded.push(m.id); addLog(`💎 Secret: "${m.name}" +${d}💎 +${gp}🧪`,'diamond'); }
    else    { state.milestoneDiamondsAwarded.push(m.id); addLog(`✓ Secret: "${m.name}" +${gp}🧪`,'highlight'); }
  });
}

function getTrackProgress(track) {
  const val=track.val(state);
  const ci=track.tiers.reduce((hi,tier,i)=>state.completedMilestones.includes(tier.id)?i:hi,-1);
  const ni=ci+1<track.tiers.length?ci+1:null;
  return { val, completedIdx:ci, totalTiers:track.tiers.length, currentTier:ci>=0?track.tiers[ci]:null,
    nextTier:ni!==null?track.tiers[ni]:null, pct:ni!==null?Math.min(1,val/track.tiers[ni].target):(ci>=0?1:0) };
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderAll() {
  renderStats();
  if(currentTab==='population') renderPopulation();
  if(currentTab==='upgrades')   renderUpgrades();
  if(currentTab==='research')   renderResearch();
  if(currentTab==='milestones') renderMilestones();
  if(currentTab==='vault')      renderGeneVault();
  if(currentTab==='combat')     renderCombat();
}

function renderStats() {
  const ms=getMilestoneCounts();
  document.getElementById('stat-gen').textContent        = fmt(safeNum(state.generation,1));
  document.getElementById('stat-pop').textContent        = `${fmt(state.population.length)} / ${fmt(getMaxPop())}`;
  document.getElementById('stat-gold').textContent       = fmt(state.gold);
  document.getElementById('stat-diamonds').textContent   = `${fmt(state.diamonds)} 💎`;
  document.getElementById('stat-gp').textContent         = `${fmt(state.genePoints)} 🧪`;
  document.getElementById('stat-milestones').textContent = `${fmt(ms.done)} / ${fmt(ms.total)}`;
  document.getElementById('stat-score').textContent      = calcScore().toLocaleString();
  document.getElementById('stat-bred').textContent       = fmt(state.totalBred);
  document.getElementById('stat-culled').textContent     = fmt(state.totalCulled);
}

function renderUpgrades() {
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

function renderResearch() {
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
    const nextCost=researchHireCost(cur);
    const can=!maxed&&state.diamonds>=nextCost;
    const totalY=cur*(def.perBreed||def.perCull||def.perArchTick||0)*mult;
    html+=`<div class="research-card ${maxed?'research-maxed':''}">
      <div class="research-card-name">${def.plural||def.name}</div>
      <div class="research-card-count">${fmt(cur)} / ${fmt(def.max)} hired${cur>0?` — ${fmtR(totalY)} 💎 total/event`:''}</div>
      <div class="research-card-desc">${def.desc}</div>
      <div class="research-card-yield">⟶ ${def.yieldLine}</div>
      ${maxed?`<div class="research-maxed-label">FULLY STAFFED</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${fmt(nextCost)} 💎 ]</button>`}
    </div>`;
  });
  html+=`</div><p class="research-section-title director-title">// RESEARCH DIRECTORS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='unique').forEach(def=>{
    const hired=!!state.research?.[def.id],can=!hired&&state.diamonds>=def.cost;
    html+=`<div class="research-card ${hired?'research-active':''}">
      <div class="research-card-name">${def.name}</div>
      <div class="research-card-desc">${def.desc}</div>
      <div class="research-card-yield">⟶ ${def.yieldLine}</div>
      ${hired?`<div class="research-active-label">✓ ACTIVE</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${fmt(def.cost)} 💎 ]</button>`}
    </div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderPopulation() {
  const container=document.getElementById('population-table'); if(!container) return;
  const hasSel=safeNum(state.upgrades?.selective)>0;
  const sorted=[...state.population].map(c=>({...c,_f:calcFitness(c)})).sort((a,b)=>b._f-a._f);
  let html='';
  if(sorted.length){
    if(hasSel) html+=`<div class="pop-header"><span class="pop-hint">Click [ ☆ ] to select a pair.</span><button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button></div>`;
    const surge=safeNum(state.surgeBreedsRemaining);
    if(surge>0) html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--diamond)">💎 Evolution Surge: ${fmt(surge)} breeds remaining.</p>`;
    const autoRate=getAutoBreedRate();
    if(autoRate>0) html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--gold)">⚙ Auto-Breeder active: ${autoRate}/sec</p>`;
    html+=`<table><thead><tr>${hasSel?'<th></th>':''}<th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}<th></th></tr></thead><tbody>`;
    sorted.forEach((c,i)=>{
      const isTop=i===0,isBot=i===sorted.length-1&&sorted.length>2,isSel=selectedForBreeding.includes(c.id);
      const canImm=isMaxFitness(c)&&!(state.immortals||[]).some(im=>im.id===c.id);
      html+=`<tr class="${isTop?'row-top':isBot?'row-bottom':isSel?'row-selected':''}">`;
      if(hasSel) html+=`<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
      html+=`<td class="bright">${c.id}</td><td>${fmt(safeNum(c.generation,'?'))}</td><td class="fit-val">${fmt(c._f)}</td>`;
      TRAIT_KEYS.forEach(t=>{ const v=safeNum(c.traits[t]); html+=`<td class="${v>=80?'trait-hi':v>=40?'trait-mid':v<=5?'trait-lo':''}">${fmt(v)}</td>`; });
      html+=`<td>${canImm?`<button class="immortalise-btn" onclick="openImmortaliseModal('${c.id}')">⚜ IMMORTALISE</button>`:''}</td>`;
      html+=`</tr>`;
    });
    html+=`</tbody></table>`;
    if(!hasSel) html+=`<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> to hand-pick pairs.</p>`;
    if(!sorted.some(c=>isMaxFitness(c))) html+=`<p class="immortalise-hint">Reach fitness ≥ ${IMMORTAL_FITNESS_THRESHOLD} to unlock immortalisation.</p>`;
  } else {
    html='<p class="empty-state">No creatures yet.</p>';
  }
  container.innerHTML=html;

  // Immortals section
  const imSec=document.getElementById('immortals-section'); if(!imSec) return;
  const immortals=state.immortals||[];
  if(!immortals.length){ imSec.innerHTML=''; return; }
  let imHtml=`<p class="immortals-title">🔱 IMMORTALS (${immortals.length})</p><div class="immortal-cards">`;
  immortals.forEach(im=>{
    const stats=getImmortalCombatStats(im);
    imHtml+=`<div class="immortal-card">
      <div class="im-header"><span class="im-name">🔱 ${im.name}</span><span class="im-record">Fitness ${im.fitness||'?'}</span></div>
      <div class="im-stats">
        <span class="im-stat">ATK <span>${stats.atk}</span></span>
        <span class="im-stat">SPD <span>${stats.spd}</span></span>
        <span class="im-stat">DEF <span>${stats.def}</span></span>
        <span class="im-stat">HP <span>${stats.hp}</span></span>
      </div>
      <p class="im-skills-title">// SKILL TREE — ${fmt(state.genePoints)} 🧪 available</p>
      <div class="im-skill-branches">`;
    IMMORTAL_SKILL_BRANCHES.forEach(branch=>{
      imHtml+=`<div><div class="im-branch-title" style="color:${branch.color}">${branch.name}</div>`;
      branch.skills.forEach((skill,idx)=>{
        const unlocked=(im.skills||[]).includes(skill.id);
        const prevUnlocked=idx===0||(im.skills||[]).includes(branch.skills[idx-1].id);
        const isLocked=!unlocked&&!prevUnlocked;
        const canAfford=!unlocked&&prevUnlocked&&state.genePoints>=skill.cost;
        const cls=unlocked?'unlocked':isLocked?'locked':'';
        imHtml+=`<div class="im-skill-node ${cls}" ${(!unlocked&&prevUnlocked)?`onclick="buyImmortalSkill('${im.id}','${skill.id}')"`:''}>
          <div class="im-skill-name">${skill.name}</div>
          <div class="im-skill-effect">${skill.effect}</div>
          ${!unlocked?`<div class="im-skill-cost">${isLocked?'🔒 locked':(canAfford?`${skill.cost} 🧪`:`${skill.cost} 🧪 (need more)`)}</div>`:'<div class="im-skill-cost" style="color:var(--gp)">✓ ACTIVE</div>'}
        </div>`;
      });
      imHtml+=`</div>`;
    });
    imHtml+=`</div></div></div>`;
  });
  imHtml+=`</div>`;
  imSec.innerHTML=imHtml;
}

function renderCombat() {
  const c=document.getElementById('combat-container'); if(!c) return;
  const immortals=state.immortals||[];
  if(!immortals.length){
    c.innerHTML=`<div class="combat-locked">🔱 The Combat tab unlocks once you immortalise your first creature.<br><br>Breed a creature to fitness ≥ ${IMMORTAL_FITNESS_THRESHOLD} and click ⚜ IMMORTALISE in the Population tab.</div>`;
    return;
  }
  // Sub-tabs
  let html=`<div class="combat-subtabs">
    <button class="combat-stab ${combatSubTab==='pve'?'active':''}" onclick="setCombatTab('pve')">PVE CAMPAIGN</button>
    <button class="combat-stab ${combatSubTab==='pvp'?'active':''}" onclick="setCombatTab('pvp')">PVP</button>
  </div>`;

  if(combatSubTab==='pve'){
    html+=`<p class="pve-intro">Fight through 10 stages of escalating difficulty. Completing stages rewards Gene Points and exclusive icons. Stages must be cleared in order.</p>`;
    html+=`<div class="pve-stages-grid">`;
    PVE_STAGES.forEach((stage,idx)=>{
      const done=(state.pveCompleted||[]).includes(stage.id);
      const prevDone=idx===0||(state.pveCompleted||[]).includes(PVE_STAGES[idx-1].id);
      const locked=!prevDone&&!done;
      html+=`<div class="pve-stage-card ${done?'stage-complete':locked?'stage-locked':''}">
        <div class="pve-stage-name">${idx+1}. ${stage.name}</div>
        <div class="pve-stage-desc">${stage.desc}</div>
        <div class="pve-stage-enemies">Opponents: ${stage.enemies} (level ${stage.enemyLevel})</div>
        <div class="pve-stage-reward">Reward: +${stage.gpReward} 🧪 + icon ${stage.iconReward}</div>`;
      if(done){
        html+=`<div class="pve-complete-badge">✓ CLEARED</div>`;
      } else if(!locked){
        html+=`<div class="pve-immortal-select"><select id="pve-sel-${stage.id}">${immortals.map(im=>`<option value="${im.id}">${im.name} (ATK ${getImmortalCombatStats(im).atk})</option>`).join('')}</select></div>`;
        html+=`<button class="pve-fight-btn" onclick="runPveStage('${stage.id}',document.getElementById('pve-sel-${stage.id}').value)">[ FIGHT ]</button>`;
      } else {
        html+=`<div style="color:var(--muted);font-size:10px">Complete previous stage first</div>`;
      }
      html+=`</div>`;
    });
    html+=`</div>`;

    // Recent combat log
    if((state.combatLog||[]).length){
      const last=state.combatLog[0];
      html+=`<div class="combat-log-section"><p class="combat-log-title">// LAST FIGHT: ${last.stageName||''}</p>`;
      last.log.forEach(line=>{ html+=`<div class="combat-log-line ${line.startsWith('🏆')||line.startsWith('✓')?'result-win':line.startsWith('✗')?'result-loss':''}">${line}</div>`; });
      html+=`</div>`;
    }

  } else {
    // PvP tab
    html+=`<p class="pvp-intro">Challenge other players to immortal combat. Click the ⚔ button next to any player on the Leaderboard to send a challenge.</p>`;
    html+=`<p class="pvp-section-title">// YOUR RECORD</p>`;
    html+=`<p style="font-size:12px;color:var(--muted);margin-bottom:20px">Wins: <span style="color:var(--green)">${fmt(state.pvpWins)}</span> &nbsp; Losses: <span style="color:var(--red)">${fmt(state.pvpLosses)}</span></p>`;
    html+=`<p class="pvp-section-title">// INCOMING CHALLENGES</p>`;
    html+=`<div id="pvp-challenges-list"><p class="pvp-empty">Loading challenges…</p></div>`;
    html+=`<p class="pvp-section-title" style="margin-top:24px">// RECENT RESULTS</p>`;
    const pvpResults=(state.combatLog||[]).filter(x=>x.type==='pvp');
    if(pvpResults.length){
      pvpResults.slice(0,5).forEach(r=>{
        html+=`<div class="pvp-challenge-card ${r.won?'pvp-won':'pvp-lost'}">
          <div class="pvp-ch-header"><span class="pvp-ch-name">vs ${r.opponent||'Unknown'}</span><span class="pvp-ch-status ${r.won?'s-won':'s-lost'}">${r.won?'WON':'LOST'}</span></div>
          <div class="pvp-ch-desc">${r.myImmortal||'?'} vs ${r.opponent||'?'} — ${r.time||''}</div>
        </div>`;
      });
    } else {
      html+=`<p class="pvp-empty">No recent results.</p>`;
    }
  }
  c.innerHTML=html;
  // Ask auth.js to populate incoming challenges
  window.loadPvpChallenges?.();
}

window.setCombatTab = (tab) => { combatSubTab=tab; renderCombat(); };

window.renderPvpChallenges = (challenges) => {
  const el=document.getElementById('pvp-challenges-list'); if(!el) return;
  if(!challenges||!challenges.length){ el.innerHTML='<p class="pvp-empty">No incoming challenges.</p>'; return; }
  let html='';
  challenges.forEach(ch=>{
    html+=`<div class="pvp-challenge-card pvp-pending">
      <div class="pvp-ch-header"><span class="pvp-ch-name">From: ${esc(ch.challengerUsername||'Unknown')}</span><span class="pvp-ch-status s-pending">PENDING</span></div>
      <div class="pvp-ch-desc">Their champion: ${esc(ch.challengerImmortalName||'?')}</div>
      <div class="pvp-ch-buttons">
        <button style="border-color:var(--green);color:var(--green)" onclick="openPvpAcceptModal('${ch.id}','${esc(ch.challengerUsername)}','${esc(ch.challengerImmortalName)}')">[ ACCEPT ]</button>
        <button class="btn-secondary" onclick="declinePvpChallenge(); window.rejectPvpChallenge?.('${ch.id}')">[ DECLINE ]</button>
      </div>
    </div>`;
  });
  el.innerHTML=html;
};

function renderMilestones() {
  const c=document.getElementById('milestones-container'); if(!c) return;
  const ms=getMilestoneCounts();
  let html=`<p class="ms-total">Completed: <span>${fmt(ms.done)} / ${fmt(ms.total)}</span> &nbsp;|&nbsp; 🧪 Gene Points: <span style="color:var(--gp)">${fmt(state.genePoints)}</span></p>`;
  MILESTONE_TRACKS.forEach(track=>{
    const prog=getTrackProgress(track);
    const completedN=prog.completedIdx+1, allDone=completedN===prog.totalTiers;
    html+=`<p class="ms-cat-title">// ${track.name}</p><div class="track-grid"><div class="track-card ${allDone?'tc-complete':completedN>0?'tc-active':''}">`;
    html+=`<div class="track-header"><span class="track-name">${track.name}</span><span class="track-tier ${allDone?'all-done':''}">TIER ${completedN} / ${prog.totalTiers}</span></div>`;
    html+=`<div class="track-current-name">${prog.currentTier?prog.currentTier.name:'Not started'}</div>`;
    if(!allDone&&prog.nextTier){
      const pv=Math.round(prog.pct*100);
      html+=`<div class="track-next-name">→ ${prog.nextTier.name} at ${fmt(prog.nextTier.target)} ${track.unit}</div>`;
      html+=`<div class="track-prog-wrap"><div class="track-prog-bar"><div class="track-prog-fill" style="width:${pv}%"></div></div><div class="track-prog-text"><span>${fmt(prog.val)} / ${fmt(prog.nextTier.target)}</span><span class="reward">${prog.nextTier.diamonds>0?prog.nextTier.diamonds+'💎 +':''}${track.gpPer||1}🧪</span></div></div>`;
    } else if(allDone) { html+=`<div class="track-complete-badge">✦ ALL TIERS COMPLETE</div>`; }
    html+=`<div class="track-dots">`;
    track.tiers.forEach((_,i)=>{ html+=`<div class="track-dot ${i<=prog.completedIdx?'filled':i===prog.completedIdx+1?'current':''}"></div>`; });
    html+=`</div></div></div>`;
  });
  html+=`<p class="ms-cat-title secret-title">// ??? SECRETS — 5 🧪 each on unlock</p><div class="secret-grid">`;
  SECRET_MILESTONES.forEach(m=>{
    const isDone=state.completedMilestones.includes(m.id);
    if(!isDone){ html+=`<div class="ms-card ms-secret"><div class="ms-name">???</div><div class="ms-reward">${m.diamonds>0?m.diamonds+'💎 + ':''} 5🧪</div></div>`; }
    else        { html+=`<div class="ms-card ms-done-secret"><div class="ms-check secret-check">✓</div><div class="ms-name">${m.name}</div><div class="ms-desc">${m.desc}</div><div class="ms-reward">${m.diamonds>0?m.diamonds+'💎 +':''} 5🧪</div></div>`; }
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderGeneVault() {
  const c=document.getElementById('vault-container'); if(!c) return;
  const owned=state.ownedIcons||[], sel=state.selectedIcon;
  let html=`<p class="vault-intro">The Gene Vault houses specimens from across the known world. Collect icons to display on the leaderboard. Duplicates refund 10%.</p>`;
  html+=`<div class="vault-collection-section">`;
  html+=`<p class="vault-collection-title">// YOUR COLLECTION — ${fmt(owned.length)} / ${TOTAL_ICONS} icons</p>`;
  if(sel) html+=`<p class="vault-active-label">Active: <span>${sel}</span></p>`;
  else    html+=`<p class="vault-active-label">Click any icon to equip it on the leaderboard.</p>`;
  if(!owned.length) html+=`<p class="vault-collection-empty">Nothing yet.</p>`;
  else {
    html+=`<div class="vault-icon-grid">`;
    [...new Set(owned)].forEach(icon=>{ html+=`<div class="vault-icon-cell ${sel===icon?'selected':''}" onclick="selectIcon('${icon}')">${icon}</div>`; });
    html+=`</div>`;
  }
  html+=`</div><p class="vault-boxes-title">// GENE VAULTS</p><div class="vault-boxes-grid">`;
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

window.renderLeaderboard = (entries, currentUid) => {
  const c=document.getElementById('leaderboard-container'); if(!c) return;
  const currentTotal=getMilestoneCounts().total;
  let html=`<div class="lb-header"><span class="lb-title">// LEADERBOARD</span><button class="lb-refresh" onclick="window.refreshLeaderboard&&window.refreshLeaderboard()">[ REFRESH ]</button></div>
  <p class="lb-formula">Score = (<span>fitness×200</span> + <span>gen×10</span> + <span>bred×3</span> + <span>culled×5</span> + <span>gold</span> + <span>💎×100</span>) ÷ 10</p>`;
  if(!entries?.length){ html+=`<p class="lb-empty">No entries yet.</p>`; c.innerHTML=html; return; }
  const hasImmortals=(state.immortals||[]).length>0;
  html+=`<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>MILESTONES</th><th>GEN</th>${hasImmortals?'<th></th>':''}</tr></thead><tbody>`;
  entries.forEach((e,i)=>{
    const rank=i+1, isYou=e.uid===currentUid;
    const nameDisplay=`${e.selectedIcon?e.selectedIcon+' ':''}${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}`;
    const msDone=safeNum(e.milestoneDone||e.completedMilestones);
    const msDisplay=currentTotal?`${fmt(msDone)}/${fmt(currentTotal)}`:`${fmt(msDone)}`;
    const fightBtn=(!isYou&&hasImmortals)?`<button class="lb-fight-btn" onclick="openPvpChallengeModal('${e.uid}','${esc(e.username||'Anonymous')}')">⚔</button>`:'';
    html+=`<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}">
      <td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td>
      <td class="lb-name">${nameDisplay}</td>
      <td class="lb-score">${fmt(safeNum(e.score))}</td>
      <td>${msDisplay}</td>
      <td>${fmt(safeNum(e.generation))}</td>
      ${hasImmortals?`<td>${fightBtn}</td>`:''}
    </tr>`;
  });
  html+=`</tbody></table>`;
  c.innerHTML=html;
};
window.renderLeaderboardLoading = () => { const c=document.getElementById('leaderboard-container'); if(c) c.innerHTML='<p class="lb-loading">Loading leaderboard…</p>'; };

window.openUsernameModal = () => {
  document.getElementById('username-modal').classList.remove('hidden');
  const inp=document.getElementById('username-input');
  if(window._currentUsername) inp.value=window._currentUsername;
  document.getElementById('username-message').textContent='';
};
window.skipUsername = () => document.getElementById('username-modal').classList.add('hidden');

window.switchTab = (tab) => {
  currentTab=tab;
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('#tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if(tab==='combat') document.getElementById('tab-combat').classList.remove('has-badge');
  if(tab==='population')  renderPopulation();
  if(tab==='upgrades')    renderUpgrades();
  if(tab==='research')    renderResearch();
  if(tab==='milestones')  renderMilestones();
  if(tab==='vault')       renderGeneVault();
  if(tab==='combat')      renderCombat();
  if(tab==='leaderboard') window.refreshLeaderboard?.();
};

window.addLog = (text, type='') => {
  const el=document.getElementById('log-output'); if(!el) return;
  const div=document.createElement('div');
  div.className='log-entry'+(type?` ${type}`:''); div.textContent=`[${ts()}] ${text}`;
  el.prepend(div);
  while(el.children.length>200) el.removeChild(el.lastChild);
};

function ts() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

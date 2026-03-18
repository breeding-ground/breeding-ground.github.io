'use strict';
// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const TRAIT_KEYS=['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR=['SPD','STR','STA','INT','RES'];
const TRAIT_MAX=50;
const POP_CAP_TABLE=[20,25,30,40,60,100,300,500];
const IMMORTAL_THRESHOLD=125;
const BASE_ATK=125,BASE_SPD=125,BASE_DEF=125,BASE_HP=200;

const fmt=n=>safeNum(n).toLocaleString();
const fmt1=n=>safeNum(n).toFixed(1);
const fmtR=n=>n===0?'—':safeNum(n).toFixed(2);
function safeNum(v,f=0){const n=Number(v);return isFinite(n)?n:f;}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function bestSingleTrait(s){return Math.max(0,...(s.population||[]).map(c=>Math.max(...TRAIT_KEYS.map(t=>safeNum(c.traits?.[t])))));}

// ═══════════════════════════════════════════════════════════
//  GOLD UPGRADES
// ═══════════════════════════════════════════════════════════
const GOLD_UPGRADES=[
  {id:'popCap',name:'Expanded Habitat',desc:'Raise the population cap.',levels:[{cost:60,label:'Lv1—20→25'},{cost:200,label:'Lv2—25→30'},{cost:600,label:'Lv3—30→40'},{cost:2000,label:'Lv4—40→60'},{cost:7000,label:'Lv5—60→100'},{cost:1000000,label:'Lv6—100→300'},{cost:5000000,label:'Lv7—300→500'}]},
  {id:'mutation',name:'Mutation Boost',desc:'Higher mutation rate and stronger positive mutations.',levels:[{cost:25,label:'Lv1—15%→25%'},{cost:75,label:'Lv2—25%→40%'},{cost:200,label:'Lv3—40%→60%'},{cost:600,label:'Lv4—always beneficial'},{cost:2000,label:'Lv5—two traits mutate'},{cost:8000,label:'Lv6—double bonus'}]},
  {id:'traitAmp',name:'Trait Amplifier',desc:"Offspring more likely to inherit the stronger parent's trait.",levels:[{cost:50,label:'Lv1—15%'},{cost:160,label:'Lv2—30%'},{cost:450,label:'Lv3—55%'},{cost:1400,label:'Lv4—always stronger'},{cost:4500,label:'Lv5—always stronger +bonus'}]},
  {id:'breedYield',name:'Breeding Yield',desc:'Earn more gold per offspring.',levels:[{cost:30,label:'Lv1—3g'},{cost:90,label:'Lv2—6g'},{cost:280,label:'Lv3—12g'},{cost:800,label:'Lv4—25g'},{cost:2500,label:'Lv5—50g'},{cost:8000,label:'Lv6—100g'}]},
  {id:'cullValue',name:"Butcher's Eye",desc:'More gold when culling.',levels:[{cost:20,label:'Lv1—+3g'},{cost:55,label:'Lv2—+7g'},{cost:150,label:'Lv3—+15g'},{cost:450,label:'Lv4—+30g'},{cost:1500,label:'Lv5—+60g'},{cost:5000,label:'Lv6—+120g'}]},
  {id:'selective',name:'Selective Breeding',desc:'Hand-pick your own breeding pairs.',levels:[{cost:40,label:'One-time — unlocks BREED SELECTED'}]},
  {id:'cullInsight',name:'Culling Insight',desc:'Cull multiple weak creatures at once.',levels:[{cost:100,label:'Lv1—cull 2'},{cost:350,label:'Lv2—cull 3'},{cost:1200,label:'Lv3—cull 5'},{cost:4000,label:'Lv4—cull 8'},{cost:14000,label:'Lv5—cull 12'}]},
  {id:'lineageMem',name:'Lineage Memory',desc:'Offspring can recall best-ever trait values.',levels:[{cost:150,label:'Lv1—5%'},{cost:500,label:'Lv2—12%'},{cost:1800,label:'Lv3—25%'},{cost:6000,label:'Lv4—40%'},{cost:20000,label:'Lv5—60%'}]},
  {id:'hybridVigor',name:'Hybrid Vigor',desc:'Post-inheritance bonus to top traits.',levels:[{cost:80,label:'Lv1—10% +1'},{cost:300,label:'Lv2—22% +2'},{cost:1000,label:'Lv3—35% +3'},{cost:3500,label:'Lv4—50% all above avg'}]},
  {id:'adaptiveGenetics',name:'Adaptive Genetics',desc:'Unlucky traits nudged toward parent average.',levels:[{cost:100,label:'Lv1—20%'},{cost:400,label:'Lv2—45%'},{cost:1500,label:'Lv3—70%'},{cost:5000,label:'Lv4—always corrects'}]},
  {id:'autoBreeder',name:'Auto-Breeder',desc:'Automatically breeds at set speed.',levels:[{cost:500,label:'Lv1—0.2/sec'},{cost:2000,label:'Lv2—0.5/sec'},{cost:8000,label:'Lv3—1/sec'},{cost:30000,label:'Lv4—2/sec'},{cost:100000,label:'Lv5—5/sec'},{cost:1000000,label:'Lv6—20/sec'}]},
];
const AUTO_RATES=[0,0.2,0.5,1,2,5,20];

// ═══════════════════════════════════════════════════════════
//  DIAMOND UPGRADES
// ═══════════════════════════════════════════════════════════
const DIAMOND_UPGRADES=[
  {id:'traitCapBoost',name:'Apex Refinement',desc:`Raises trait ceiling toward 125.`,
   levels:[{cost:10,label:`→${TRAIT_MAX+5}`},{cost:20,label:`→${TRAIT_MAX+10}`},{cost:35,label:`→${TRAIT_MAX+20}`},{cost:60,label:`→${TRAIT_MAX+35}`},{cost:100,label:`→${TRAIT_MAX+55}`},{cost:160,label:`→${TRAIT_MAX+75} MAX`}]},
  {id:'eliteMutation',name:'Elite Mutation',desc:'Reduces mutation resistance on high traits.',
   levels:[{cost:8,label:'Lv1—halves ≥30'},{cost:18,label:'Lv2—removes'},{cost:40,label:'Lv3—+1 guaranteed'}]},
  {id:'deepArchive',name:'Deep Archive',desc:'Lineage Memory recalls best+bonus.',
   levels:[{cost:15,label:'Lv1—best+1'},{cost:35,label:'Lv2—best+2'}]},
  {id:'secretDecoder',name:'Secret Decoder',desc:'Reveals the hint for every secret milestone — names stay hidden until earned.',
   levels:[{cost:1000000,label:'One-time — reveals all secret hints'}]},
];

// ═══════════════════════════════════════════════════════════
//  RESEARCH
// ═══════════════════════════════════════════════════════════
function researchHireCost(cur){const s=[2,3,5,10,20,35,60,100,175,300,500];return s[cur]??500;}
const RESEARCH_DEF=[
  {id:'labInterns',type:'stack',name:'Lab Intern',plural:'Lab Interns',desc:'Document genetic outcomes from each breed.',yieldLine:'0.15 💎 per breed',max:20,perBreed:0.15},
  {id:'geneAnalysts',type:'stack',name:'Gene Analyst',plural:'Gene Analysts',desc:'Extract sequences from culled specimens.',yieldLine:'0.4 💎 per cull',max:10,perCull:0.4},
  {id:'lineageArchivists',type:'stack',name:'Lineage Archivist',plural:'Lineage Archivists',desc:'Mine generational records every 25 gens.',yieldLine:'1 💎 per 25 gens',max:5,perArchTick:1.0},
  {id:'headOfResearch',type:'unique',name:'Head of Research',desc:'×1.5 all research output.',yieldLine:'×1.5 multiplier',cost:1000},
  {id:'automatedSequencer',type:'unique',name:'Automated Sequencer',desc:'×2 all research output.',yieldLine:'×2 multiplier',cost:3000},
];

// ═══════════════════════════════════════════════════════════
//  IMMORTAL SKILL TREE
//  blocks: skills that get permanently blocked when this is purchased
//  blocked_by: skills that, if purchased, block this
// ═══════════════════════════════════════════════════════════
const IM_SKILLS=[
  {id:'atk1',branch:'atk',name:'Battle Hardened',effect:'ATK +15',desc:'Trained for combat.',cost:1,requires:null,blocks:[],blocked_by:[]},
  {id:'atk2',branch:'atk',name:'Vicious Strike',effect:'ATK +25',desc:'Devastating blows.',cost:3,requires:'atk1',blocks:[],blocked_by:[]},
  {id:'atk3',branch:'atk',name:'Berserker',effect:'ATK +40',desc:'Raw fury. Precludes peak DEF.',cost:8,requires:'atk2',blocks:['def4','def5'],blocked_by:[]},
  {id:'atk4',branch:'atk',name:'Warlord',effect:'ATK +60',desc:'Commands destruction.',cost:20,requires:'atk3',blocks:[],blocked_by:['spd5']},
  {id:'atk5',branch:'atk',name:'Death Incarnate',effect:'ATK +80, 25% crit',desc:'Unstoppable killing machine.',cost:50,requires:'atk4',blocks:[],blocked_by:['spd5']},
  {id:'spd1',branch:'spd',name:'Swift',effect:'SPD +15',desc:'Light on their feet.',cost:1,requires:null,blocks:[],blocked_by:[]},
  {id:'spd2',branch:'spd',name:'Blur',effect:'SPD +25',desc:'Hard to track.',cost:3,requires:'spd1',blocks:[],blocked_by:[]},
  {id:'spd3',branch:'spd',name:'Phase Dash',effect:'SPD +40',desc:'Faster than thought. Precludes Immortal Guard.',cost:8,requires:'spd2',blocks:['def5'],blocked_by:[]},
  {id:'spd4',branch:'spd',name:'Lightning',effect:'SPD +60',desc:'Pure kinetic energy.',cost:20,requires:'spd3',blocks:[],blocked_by:[]},
  {id:'spd5',branch:'spd',name:'Untouchable',effect:'SPD +80, 20% dodge',desc:'Precludes peak ATK.',cost:50,requires:'spd4',blocks:['atk4','atk5'],blocked_by:[]},
  {id:'def1',branch:'def',name:'Iron Skin',effect:'DEF +15',desc:'Toughened hide.',cost:1,requires:null,blocks:[],blocked_by:[]},
  {id:'def2',branch:'def',name:'Fortress',effect:'DEF +25, HP +20',desc:'Built like a wall.',cost:3,requires:'def1',blocks:[],blocked_by:[]},
  {id:'def3',branch:'def',name:'Juggernaut',effect:'DEF +40, HP +30',desc:'Cannot be stopped.',cost:8,requires:'def2',blocks:[],blocked_by:[]},
  {id:'def4',branch:'def',name:'Impenetrable',effect:'DEF +60, HP +40',desc:'Nigh invulnerable.',cost:20,requires:'def3',blocks:[],blocked_by:['atk3']},
  {id:'def5',branch:'def',name:'Immortal Guard',effect:'DEF +80, HP +100, +15 regen/rnd',desc:'The ultimate shield.',cost:50,requires:'def4',blocks:[],blocked_by:['atk3','spd3']},
];
const IM_SKILL_MAP={};IM_SKILLS.forEach(s=>{IM_SKILL_MAP[s.id]=s;});
const IM_BRANCHES=[
  {id:'atk',name:'ATTACK',color:'var(--red)',skills:IM_SKILLS.filter(s=>s.branch==='atk')},
  {id:'spd',name:'SPEED',color:'var(--blue)',skills:IM_SKILLS.filter(s=>s.branch==='spd')},
  {id:'def',name:'DEFENCE',color:'var(--gp)',skills:IM_SKILLS.filter(s=>s.branch==='def')},
];

// GP cost to get back when disposing an immortal
function disposalGpRefund(im){
  return Math.floor((im.skills||[]).reduce((s,id)=>s+(IM_SKILL_MAP[id]?.cost||0),0)*0.5);
}

function getImmortalStats(im){
  const s=im.skills||[];
  let atk=BASE_ATK,spd=BASE_SPD,def=BASE_DEF,hp=BASE_HP,crit=0,dodge=0,regen=0;
  if(s.includes('atk1'))atk+=15;if(s.includes('atk2'))atk+=25;if(s.includes('atk3'))atk+=40;
  if(s.includes('atk4'))atk+=60;if(s.includes('atk5')){atk+=80;crit=0.25;}
  if(s.includes('spd1'))spd+=15;if(s.includes('spd2'))spd+=25;if(s.includes('spd3'))spd+=40;
  if(s.includes('spd4'))spd+=60;if(s.includes('spd5')){spd+=80;dodge=0.20;}
  if(s.includes('def1'))def+=15;
  if(s.includes('def2')){def+=25;hp+=20;}
  if(s.includes('def3')){def+=40;hp+=30;}
  if(s.includes('def4')){def+=60;hp+=40;}
  if(s.includes('def5')){def+=80;hp+=100;regen=15;}
  // Prestige skills stack on top
  const ps=getPrestigeStats(im);
  atk+=ps.atk; spd+=ps.spd; def+=ps.def; hp+=ps.hp;
  crit=Math.max(crit,ps.crit);
  dodge=Math.max(dodge,ps.dodge);
  regen+=ps.regen;
  // City Research Institute bonuses
  const cb=getCityBonuses();
  atk=Math.floor((atk+cb.immortalAtkBonus)*cb.immortalStatMult);
  spd=Math.floor(spd*cb.immortalStatMult);
  def=Math.floor((def+cb.immortalDefBonus)*cb.immortalStatMult);
  hp=Math.floor((hp+cb.immortalHpBonus)*cb.immortalStatMult);
  return{atk,spd,def,hp,crit,dodge,regen};
}

// ═══════════════════════════════════════════════════════════
//  GENE VAULTS
// ═══════════════════════════════════════════════════════════
const GENE_VAULTS=[
  {id:'aquatic',name:'Aquatic Genome',theme:'DEEP SEA',cssClass:'vb-aquatic',cost:1000,desc:'Specimens from deep ocean thermal vents.',
   icons:['🐋','🐬','🦈','🐙','🦑','🐡','🐠','🦞','🦀','🐚','🌊','🐸','🦭','🐳','🦐','🐟','🐊','🫧','🪸','🦕','🫀','💧','🐉','🦎','🔵']},
  {id:'flora',name:'Flora Strain',theme:'OVERGROWTH',cssClass:'vb-flora',cost:1000,desc:'From ancient seed vaults and jungle biomass.',
   icons:['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🍁','🌾','🌲','🌳','🌴','🌵','🎋','🍄','🌱','🌼','💐','🍃','🎄','🪴','🪵','🪨','🍂','🌍']},
  {id:'cosmos',name:'Cosmos Sequence',theme:'DEEP SPACE',cssClass:'vb-cosmos',cost:1000,desc:'Extraterrestrial material from meteorite fragments.',
   icons:['🌟','⭐','💫','✨','🌙','🌠','🚀','🛸','🪐','☄️','🌌','🔭','🛰️','🌏','🌕','🌐','🌃','🌒','🌓','🌔','🌛','🌜','🌝','🌞','🔆']},
  {id:'predator',name:'Apex Predator',theme:'HUNT',cssClass:'vb-predator',cost:1000,desc:'From the most dangerous specimens ever catalogued.',
   icons:['🦁','🐯','🐆','🐻','🦊','🦝','🐺','🦅','🦉','🐍','🦂','🕷️','🦇','🦃','🦚','🦜','🦋','🪲','🐝','🦏','🐘','🦬','🐃','🦌','🔥']},
  {id:'ancient',name:'Ancient Legacy',theme:'PRIMORDIAL',cssClass:'vb-ancient',cost:1000,desc:'Relics from civilisations that understood genetics before us.',
   icons:['⚔️','🛡️','👑','🏺','🗿','🪬','🧿','🔱','⚜️','🪄','🗡️','🏛️','⚖️','📜','🔮','💎','🧬','🌀','🔯','⚗️','🏆','🎭','🎪','🎯','🎲']},
  {id:'machine', name:'Synthetic Genome',  theme:'MACHINE',    cssClass:'vb-machine',  cost:1000,
   desc:'Specimens engineered in classified laboratories. Part creature, part machine.',
   icons:['🤖','⚙️','🔧','🔩','🛠️','💻','🖥️','🔌','💡','🔋','⚡','🧲','🪛','🔑','🗝️','📡','🔬','🧪','🧫','🏗️','🚂','🧠','💉','🩺','🤯']},
];
// Boss icons (PvE exclusive — 4 total)
const PVE_BOSS_ICONS=['🩸','👁️','💀','🌑'];
const PVE_ACT2_BOSS_ICONS=['🌋','🏔️','👾','🎆'];
const PVE_ACT3_BOSS_ICONS=['🔴','⬛','🔱','♾️'];
const TOTAL_VAULT_ICONS=150;
const TOTAL_ICONS=TOTAL_VAULT_ICONS+PVE_BOSS_ICONS.length+PVE_ACT2_BOSS_ICONS.length+PVE_ACT3_BOSS_ICONS.length; // 162

let vaultPreviewId=null;

// ═══════════════════════════════════════════════════════════
//  COMBAT SLOT UPGRADES (GP)
// ═══════════════════════════════════════════════════════════
const COMBAT_SLOT_UPGRADES=[
  {slots:2,cost:10,name:'Second Fighter',desc:'Deploy 2 immortals simultaneously in PvE.'},
  {slots:3,cost:100,name:'Third Fighter',desc:'Deploy 3 immortals simultaneously in PvE.'},
];

// ═══════════════════════════════════════════════════════════
//  PvE STAGES — 37 total
//  Acts designed around skill investment:
//  Act 1 (lv1-6): solo, 0-3 GP. Act 2 (lv6-10): tier1-2 skills or 2 fighters.
//  Act 3 (lv9-15): tier2-3 + 2 fighters. Act 4 (lv14-20): near-maxed + 2-3 fighters.
//  Boss icons ONLY at stages 10, 20, 30, 37.
// ═══════════════════════════════════════════════════════════
const PVE_STAGES=[
  // ACT 1 — The Awakening (fresh immortal, minimal skills)
  {id:'pve1', act:1,name:'The Proving Ground',     desc:'Your first opponent. A weak specimen bred for testing.',               enemies:1,eLevel:1, gpR:2,  iconR:null, boss:false},
  {id:'pve2', act:1,name:'Twin Threat',             desc:'Two opponents at once. Learn to manage your attacks.',                 enemies:2,eLevel:1, gpR:2,  iconR:null, boss:false},
  {id:'pve3', act:1,name:'The Gauntlet',            desc:'Three foes of growing strength.',                                     enemies:3,eLevel:2, gpR:3,  iconR:null, boss:false},
  {id:'pve4', act:1,name:'Elite Specimen',          desc:'A single stronger opponent. A step up from what you know.',           enemies:1,eLevel:2, gpR:3,  iconR:null, boss:false},
  {id:'pve5', act:1,name:'Pack Hunt',               desc:'Three opponents — speed and aggression.',                             enemies:3,eLevel:3, gpR:3,  iconR:null, boss:false},
  {id:'pve6', act:1,name:'The Colosseum',           desc:'Two tougher predators bred for the arena.',                           enemies:2,eLevel:3, gpR:4,  iconR:null, boss:false},
  {id:'pve7', act:1,name:'Ancient Bloodline',       desc:'A single specimen of ancient heritage. More powerful than it looks.', enemies:1,eLevel:4, gpR:4,  iconR:null, boss:false},
  {id:'pve8', act:1,name:'The Horde',               desc:'Four opponents at once. Your first taste of chaos.',                  enemies:4,eLevel:3, gpR:5,  iconR:null, boss:false},
  {id:'pve9', act:1,name:'Omega Trial',             desc:'Three level-5 opponents. The hardest Act 1 test before the boss.',    enemies:3,eLevel:5, gpR:6,  iconR:null, boss:false},
  {id:'pve10',act:1,name:'⚔ BOSS: First Reckoning', desc:'End of Act 1. One elite champion. A fresh immortal can win — just.',enemies:1,eLevel:6, gpR:10, iconR:'🩸', boss:true},
  // ACT 2 — The Arena (needs tier 1-2 skills, or 2 fighters)
  {id:'pve11',act:2,name:"Veteran's Arena",         desc:'Two seasoned warriors. Stronger than anything in Act 1.',             enemies:2,eLevel:6, gpR:6,  iconR:null, boss:false},
  {id:'pve12',act:2,name:'Blood Sport',             desc:'Three gladiators bred purely for killing.',                           enemies:3,eLevel:6, gpR:7,  iconR:null, boss:false},
  {id:'pve13',act:2,name:'Elite Squad',             desc:'Four units. You will need skills now.',                               enemies:4,eLevel:7, gpR:8,  iconR:null, boss:false},
  {id:'pve14',act:2,name:'The Apex',                desc:'One supremely optimised specimen. A wall of raw power.',              enemies:1,eLevel:8, gpR:8,  iconR:null, boss:false},
  {id:'pve15',act:2,name:'Coordinated Strike',      desc:'Three enemies attacking with devastating coordination.',              enemies:3,eLevel:7, gpR:9,  iconR:null, boss:false},
  {id:'pve16',act:2,name:'Grand Tournament',        desc:'Five opponents. Endurance is everything.',                            enemies:5,eLevel:7, gpR:10, iconR:null, boss:false},
  {id:'pve17',act:2,name:'Twin Champions',          desc:'Two individually powerful champions. Neither will go down easy.',     enemies:2,eLevel:9, gpR:10, iconR:null, boss:false},
  {id:'pve18',act:2,name:'The Infinite Horde',      desc:'Six opponents — numbers designed to overwhelm.',                     enemies:6,eLevel:7, gpR:11, iconR:null, boss:false},
  {id:'pve19',act:2,name:'Legacy of Blood',         desc:'Three specimens from legendary lineages. Faster and harder.',         enemies:3,eLevel:9, gpR:12, iconR:null, boss:false},
  {id:'pve20',act:2,name:'👁 BOSS: The Reaper',     desc:'End of Act 2. Blazing speed. A second fighter is strongly advised.', enemies:1,eLevel:10,gpR:15, iconR:'👁️', boss:true},
  // ACT 3 — The Pantheon (needs tier 2-3 skills + 2 fighters)
  {id:'pve21',act:3,name:'Platinum Arena',          desc:'Two powerful specimens. Act 3 begins in earnest.',                   enemies:2,eLevel:10,gpR:10, iconR:null, boss:false},
  {id:'pve22',act:3,name:'Ancient Legion',          desc:'Four warriors from an ancient martial bloodline.',                    enemies:4,eLevel:10,gpR:11, iconR:null, boss:false},
  {id:'pve23',act:3,name:'Perfect Specimens',       desc:'Three creatures approaching genetic perfection.',                     enemies:3,eLevel:11,gpR:12, iconR:null, boss:false},
  {id:'pve24',act:3,name:'The Pantheon',            desc:'Five champions. Never defeated before today.',                       enemies:5,eLevel:11,gpR:13, iconR:null, boss:false},
  {id:'pve25',act:3,name:'Legendary Pack',          desc:'Four apex predators moving as a coordinated unit.',                  enemies:4,eLevel:12,gpR:14, iconR:null, boss:false},
  {id:'pve26',act:3,name:'Twin Titans',             desc:'Two colossal specimens of extraordinary individual power.',           enemies:2,eLevel:13,gpR:15, iconR:null, boss:false},
  {id:'pve27',act:3,name:'The Last Army',           desc:'Six enemies — remnants of a legendary warband.',                     enemies:6,eLevel:11,gpR:15, iconR:null, boss:false},
  {id:'pve28',act:3,name:'Omega Division',          desc:'Three Omega-class elites. The cracks in reality begin here.',        enemies:3,eLevel:13,gpR:16, iconR:null, boss:false},
  {id:'pve29',act:3,name:'The Gauntlet Returns',    desc:'Five strong opponents. No breath between them.',                     enemies:5,eLevel:12,gpR:18, iconR:null, boss:false},
  {id:'pve30',act:3,name:'💀 BOSS: The Ancient One', desc:'End of Act 3. Evolved beyond limits. Bring 2 fighters or suffer.', enemies:1,eLevel:15,gpR:20, iconR:'💀', boss:true},
  // ACT 4 — The Final War (near-maxed skills + 2-3 fighters required)
  {id:'pve31',act:4,name:'War Room',                desc:'Three elite tacticians. Act 4 is a different league entirely.',      enemies:3,eLevel:14,gpR:15, iconR:null, boss:false},
  {id:'pve32',act:4,name:'The Immortal Threat',     desc:'Four creatures that refuse to yield. Attrition warfare.',            enemies:4,eLevel:15,gpR:16, iconR:null, boss:false},
  {id:'pve33',act:4,name:'Final Legion',            desc:'Five legendary soldiers at their absolute peak.',                    enemies:5,eLevel:15,gpR:18, iconR:null, boss:false},
  {id:'pve34',act:4,name:'The Convergence',         desc:'Two perfect specimens — the pinnacle of two separate lineages.',     enemies:2,eLevel:17,gpR:20, iconR:null, boss:false},
  {id:'pve35',act:4,name:'Omega Prime',             desc:'Three Omega Prime specimens. The highest tier known.',               enemies:3,eLevel:17,gpR:22, iconR:null, boss:false},
  {id:'pve36',act:4,name:'The Last Trial',          desc:'Four enemies at maximum power. One final preparation.',              enemies:4,eLevel:18,gpR:25, iconR:null, boss:false},
  {id:'pve37',act:4,name:'🌑 BOSS: Eternal Champion',desc:'Never defeated. Never tired. Bring 3 fighters and your best skills.',enemies:1,eLevel:20,gpR:50, iconR:'🌑', boss:true},
];

// ── Combat helpers ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
//  PRESTIGE SKILL TREE — unlocked per immortal after prestiging
//  3 branches × 5 tiers. Costs: 10/25/60/150/300 GP
//  These stack ON TOP of the base skill tree.
// ═══════════════════════════════════════════════════════════
const PRESTIGE_BRANCHES=[
  { id:'p_wrath', name:'WRATH', color:'#ff6b6b',
    skills:[
      {id:'pw1',cost:10,  name:'Awakening',       effect:'ATK +100',                 desc:'The seal is broken.'},
      {id:'pw2',cost:25,  name:'Blood Fury',       effect:'ATK +180, crit 35%',       desc:'Rage beyond reason.'},
      {id:'pw3',cost:60,  name:'Slaughter',        effect:'ATK +280',                 desc:'Nothing survives.'},
      {id:'pw4',cost:150, name:'Annihilator',      effect:'ATK +400, crit 50%',       desc:'Absolute destruction.'},
      {id:'pw5',cost:300, name:'Omega Rage',        effect:'ATK +600',                 desc:'The end made flesh.'},
    ]},
  { id:'p_phantom', name:'PHANTOM', color:'#818cf8',
    skills:[
      {id:'pp1',cost:10,  name:'Blur Form',        effect:'SPD +100, dodge 30%',      desc:'Barely visible.'},
      {id:'pp2',cost:25,  name:'Phase State',      effect:'SPD +200',                 desc:'Exists between moments.'},
      {id:'pp3',cost:60,  name:'Ethereal',         effect:'SPD +300, dodge 45%',      desc:'Untouchable.'},
      {id:'pp4',cost:150, name:'Spectral',         effect:'SPD +450',                 desc:'A blur of intent.'},
      {id:'pp5',cost:300, name:'Transcendent',     effect:'SPD +600, dodge 60%',      desc:'Beyond physical law.'},
    ]},
  { id:'p_titan', name:'TITAN', color:'#34d399',
    skills:[
      {id:'pt1',cost:10,  name:'Adamantine',       effect:'DEF +100, HP +200',        desc:'The flesh turns to iron.'},
      {id:'pt2',cost:25,  name:'Unbreakable',      effect:'DEF +200, regen +50',      desc:'Cannot be worn down.'},
      {id:'pt3',cost:60,  name:'Colossus',         effect:'DEF +300, HP +500',        desc:'A fortress incarnate.'},
      {id:'pt4',cost:150, name:'Invincible',       effect:'DEF +450, regen +100',     desc:'Damage is irrelevant.'},
      {id:'pt5',cost:300, name:'Eternal',          effect:'DEF +600, HP +1000, regen +150', desc:'Cannot die.'},
    ]},
];
const PRESTIGE_SKILL_MAP={};
PRESTIGE_BRANCHES.forEach(b=>b.skills.forEach(s=>{PRESTIGE_SKILL_MAP[s.id]={...s,branch:b.id};}));

function getPrestigeStats(im){
  const ps=im.prestigeSkills||[];
  let atk=0,spd=0,def=0,hp=0,crit=0,dodge=0,regen=0;
  if(ps.includes('pw1'))atk+=100; if(ps.includes('pw2')){atk+=180;crit=Math.max(crit,0.35);} if(ps.includes('pw3'))atk+=280;
  if(ps.includes('pw4')){atk+=400;crit=Math.max(crit,0.50);} if(ps.includes('pw5'))atk+=600;
  if(ps.includes('pp1')){spd+=100;dodge=Math.max(dodge,0.30);} if(ps.includes('pp2'))spd+=200;
  if(ps.includes('pp3')){spd+=300;dodge=Math.max(dodge,0.45);} if(ps.includes('pp4'))spd+=450;
  if(ps.includes('pp5')){spd+=600;dodge=Math.max(dodge,0.60);}
  if(ps.includes('pt1')){def+=100;hp+=200;} if(ps.includes('pt2')){def+=200;regen+=50;}
  if(ps.includes('pt3')){def+=300;hp+=500;} if(ps.includes('pt4')){def+=450;regen+=100;}
  if(ps.includes('pt5')){def+=600;hp+=1000;regen+=150;}
  return{atk,spd,def,hp,crit,dodge,regen};
}

// ═══════════════════════════════════════════════════════════
//  PvE ACT 2 — 33 stages
//  Requires all 37 Act 1 stages cleared.
//  Balanced: stage 33 boss needs 3 fully maxed + prestiged immortals.
//  Enemy formula: ATK=150+level*28, DEF=100+level*22, HP=400+level*90
//  Crits at level 5+, dodge at 10+, regen at 15+
// ═══════════════════════════════════════════════════════════
function makePveAct2Enemy(level,idx=0){
  const names=['Warlord','Titan','Sovereign','Ascendant','Eternal','Void','Ancient Prime','Omega','Apex Prime','Colossus Prime'];
  const jitter=rand(-8,8);
  return{
    atk: Math.max(50, 150+level*28+jitter),
    spd: Math.max(30, 120+level*22+Math.floor(jitter/2)-idx*5),
    def: Math.max(30, 100+level*22+jitter),
    hp:  400+level*90,
    crit:  level>=5  ? 0.20 : 0,
    dodge: level>=10 ? 0.15 : 0,
    regen: level>=15 ? level*3 : 0,
    name:`${names[idx%names.length]} ${String.fromCharCode(65+idx)}`,
  };
}

// ═══════════════════════════════════════════════════════════
//  RESEARCH INSTITUTE SKILL TREE
//  5 branches × 8 tiers = 40 skills
//  riLevel 1 = all icons unlocked (RI built)
//  riLevel 2 = sacrifice maxed immortal
//  riLevel 3 = all milestones complete
// ═══════════════════════════════════════════════════════════
const RI_BRANCHES=[
  {id:'genetics',name:'GENETICS',color:'#39ff14',skills:[
    {id:'ri_g1',cost:50, riLevel:1,name:'Selective Pressure',  effect:'+5% trait amplifier',         desc:'Better chance of inheriting stronger parent traits.'},
    {id:'ri_g2',cost:75, riLevel:1,name:'Mutation Catalyst',   effect:'+0.05 mutation rate',          desc:'Slightly higher baseline mutation frequency.'},
    {id:'ri_g3',cost:100,riLevel:1,name:'Genetic Memory',      effect:'+10% lineage recall',          desc:'Offspring better remember ancestral peak traits.'},
    {id:'ri_g4',cost:150,riLevel:1,name:'Adaptive Evolution',  effect:'Trait cap +3',                 desc:'Push past the natural genetic ceiling.'},
    {id:'ri_g5',cost:200,riLevel:2,name:'Forced Mutation',     effect:'Beneficial mutations +1 level sooner',desc:'Dark arts applied to genetic timing.'},
    {id:'ri_g6',cost:300,riLevel:2,name:'Genetic Supremacy',   effect:'+1 to all positive mutations', desc:'Every beneficial mutation is amplified.'},
    {id:'ri_g7',cost:400,riLevel:3,name:'Perfect Sequence',    effect:'Trait cap +10',                desc:'The theoretical maximum is rewritten.'},
    {id:'ri_g8',cost:500,riLevel:3,name:'Genesis Code',        effect:'All trait gains ×1.25',        desc:'The fundamental code of life, optimised.'},
  ]},
  {id:'economy',name:'ECONOMY',color:'#f0c040',skills:[
    {id:'ri_e1',cost:50, riLevel:1,name:'Market Basics',       effect:'Cull gold +10%',               desc:'Extract more value from culled specimens.'},
    {id:'ri_e2',cost:75, riLevel:1,name:'Trade Networks',      effect:'Breed gold +10%',              desc:'Each birth valued higher by the market.'},
    {id:'ri_e3',cost:100,riLevel:1,name:'Diamond Rush',        effect:'Research diamonds +15%',       desc:'Your team extracts more from every sample.'},
    {id:'ri_e4',cost:150,riLevel:1,name:'Vault Discount',      effect:'Gene Vault cost -10%',         desc:'Bulk purchasing agreements secured.'},
    {id:'ri_e5',cost:200,riLevel:2,name:'Economic Engine',     effect:'Breeding Hall gold +25%',      desc:'Passive production infrastructure enhanced.'},
    {id:'ri_e6',cost:300,riLevel:2,name:'Financial Mastery',   effect:'All gold income +20%',         desc:'Every gold source optimised.'},
    {id:'ri_e7',cost:400,riLevel:3,name:'Diamond Empire',      effect:'All diamond income +30%',      desc:'Diamond supply chains fully controlled.'},
    {id:'ri_e8',cost:500,riLevel:3,name:'Infinite Coffers',    effect:'Breed gold ×2',                desc:'Breeding is now an industrial operation.'},
  ]},
  {id:'warfare',name:'WARFARE',color:'#fb923c',skills:[
    {id:'ri_w1',cost:50, riLevel:1,name:'Combat Basics',       effect:'PvE GP +1 per stage',          desc:'Victories yield more tactical experience.'},
    {id:'ri_w2',cost:75, riLevel:1,name:'Conditioning',        effect:'All immortal HP +100',         desc:'Tougher training regimes.'},
    {id:'ri_w3',cost:100,riLevel:1,name:'Battle Hardening',    effect:'All immortal ATK +20',         desc:'Combat-tested improvements.'},
    {id:'ri_w4',cost:150,riLevel:1,name:'Iron Discipline',     effect:'All immortal DEF +20',         desc:'Defensive training perfected.'},
    {id:'ri_w5',cost:200,riLevel:2,name:'Elite Training',      effect:'All immortal stats +15%',      desc:'Elite units pushing beyond limits.'},
    {id:'ri_w6',cost:300,riLevel:2,name:'War Doctrine',        effect:'PvP win: +5 bonus GP',         desc:'Victory in the arena yields knowledge.'},
    {id:'ri_w7',cost:400,riLevel:3,name:'Legendary Forces',    effect:'All immortal stats +25%',      desc:'Legendary status reached.'},
    {id:'ri_w8',cost:500,riLevel:3,name:'Eternal Warriors',    effect:'Prestige costs -25%',          desc:'The path to prestige is cleared.'},
  ]},
  {id:'arcana',name:'ARCANA',color:'#a78bfa',skills:[
    {id:'ri_a1',cost:50, riLevel:1,name:'Arcane Research',     effect:'Milestone GP +1 each',         desc:'Hidden knowledge yields extra rewards.'},
    {id:'ri_a2',cost:75, riLevel:1,name:'Secret Lore',         effect:'Secret milestone GP +2',       desc:'The hidden paths better rewarded.'},
    {id:'ri_a3',cost:100,riLevel:1,name:'Temporal Flux',       effect:'+1 GP per 100 gen',            desc:'Time itself yields more reward.'},
    {id:'ri_a4',cost:150,riLevel:1,name:'Mystic Economy',      effect:'Vault dupe refund +10%',       desc:'Even duplicates have hidden value.'},
    {id:'ri_a5',cost:200,riLevel:2,name:'City Banner',         effect:'Unlocks banner colour',        desc:'Your city\'s colours may now be chosen.',cosmetic:'banner'},
    {id:'ri_a6',cost:300,riLevel:2,name:'Dark Acceleration',   effect:'Auto-breeder +25% speed',      desc:'Dark arts applied to automation.'},
    {id:'ri_a7',cost:400,riLevel:3,name:'Transcendent Path',   effect:'Prestige skill costs -20%',    desc:'The prestige tree is better understood.'},
    {id:'ri_a8',cost:500,riLevel:3,name:'Omniscient',          effect:'All GP gains +30%',            desc:'You see all paths.'},
  ]},
  {id:'legacy',name:'LEGACY',color:'#c084fc',skills:[
    {id:'ri_l1',cost:50, riLevel:1,name:'City Motto',          effect:'Unlocks city motto',           desc:'Give your city a motto.',cosmetic:'motto'},
    {id:'ri_l2',cost:75, riLevel:1,name:'Heritage',            effect:'Score: gen×5 bonus',           desc:'Your generation count is worth more.'},
    {id:'ri_l3',cost:100,riLevel:1,name:'Monument Expansion',  effect:'Monument: +2 icon slots',      desc:'More icons displayed on your monument.'},
    {id:'ri_l4',cost:150,riLevel:1,name:'Dynasty Archives',    effect:'All milestone GP +1',          desc:'Your milestones yield greater rewards.'},
    {id:'ri_l5',cost:200,riLevel:2,name:'Dynasty Seal',        effect:'Leaderboard: city level badge',desc:'Your city\'s power visible to all.'},
    {id:'ri_l6',cost:300,riLevel:2,name:'Grand Library',       effect:'Research rates ×1.25',         desc:'Knowledge accelerates your diamonds.'},
    {id:'ri_l7',cost:400,riLevel:3,name:'Imperial Legacy',     effect:'All milestone GP ×1.5',        desc:'Your legacy grows ever stronger.'},
    {id:'ri_l8',cost:500,riLevel:3,name:'Absolute Dominion',   effect:'All city bonuses ×1.1',        desc:'Total mastery over your domain.',cosmetic:'dominion'},
  ]},
];
const RI_SKILL_MAP={};
RI_BRANCHES.forEach(b=>b.skills.forEach(s=>{RI_SKILL_MAP[s.id]={...s,branch:b.id};}));

// Building types available for city slots (slot 0 = research always)
const CITY_BUILDINGS={
  breeding:{id:'breeding',name:'Breeding Hall',icon:'🏗️',
    shortDesc:'Generates gold passively. Rate scales with total breeds. Works offline (capped at 24h).',
    desc:'Produces gold passively based on total breeds.',
    levels:[
      {target:10000, gpH:10000,  label:'10k breeds',  desc:'Produces 10,000 gold/hour'},
      {target:20000, gpH:20000,  label:'20k breeds',  desc:'Produces 20,000 gold/hour'},
      {target:30000, gpH:30000,  label:'30k breeds',  desc:'Produces 30,000 gold/hour'},
      {target:50000, gpH:50000,  label:'50k breeds',  desc:'Produces 50,000 gold/hour'},
    ]},
  culling:{id:'culling',name:'Culling Hall',icon:'⚗️',
    shortDesc:'Generates diamonds passively. Rate scales with total culls. Works offline (capped at 24h).',
    desc:'Produces diamonds passively based on total creatures culled.',
    levels:[
      {target:1000,  diaH:1000,  label:'1k culled',   desc:'Produces 1,000 💎/hour'},
      {target:2500,  diaH:2500,  label:'2.5k culled',  desc:'Produces 2,500 💎/hour'},
      {target:5000,  diaH:5000,  label:'5k culled',   desc:'Produces 5,000 💎/hour'},
      {target:10000, diaH:10000, label:'10k culled',  desc:'Produces 10,000 💎/hour'},
    ]},
  monument:{id:'monument',name:'Monument',icon:'🗿',
    shortDesc:'Display your collected icons. Other players see these when they visit your city.',
    desc:'Display your icon collection for visiting players.',},
  genespire:{id:'genespire',name:'Gene Spire',icon:'🧬',
    shortDesc:'Produces Gene Points passively every hour. Upgrade each spire for higher output.',
    desc:'Produces Gene Points (🧪) passively each hour. Each spire can be upgraded.',
    tiers:[
      {tier:1,gpH:1,  costGold:0,      costDia:0,      label:'Tier 1',desc:'1 🧪/hr — free to place'},
      {tier:2,gpH:2,  costGold:500000, costDia:0,      label:'Tier 2',desc:'2 🧪/hr — 500,000 gold'},
      {tier:3,gpH:3,  costGold:1000000,costDia:0,      label:'Tier 3',desc:'3 🧪/hr — 1,000,000 gold'},
      {tier:4,gpH:5,  costGold:2000000,costDia:0,      label:'Tier 4',desc:'5 🧪/hr — 2,000,000 gold'},
      {tier:5,gpH:10, costGold:0,      costDia:100000, label:'Tier 5',desc:'10 🧪/hr — 100,000 💎'},
    ]},
};
// Grid helpers — city uses {"x,y": buildingId} map
function cityGrid(){return state.city?.grid||{};}
function cityGridValues(){return Object.values(cityGrid());}
function cityGridEntries(){return Object.entries(cityGrid());}
function getSpireTier(key){return safeNum((state.city.spireTiers||{})[key],1);}
function getTotalSpireGpH(){
  let total=0;
  const tiers=CITY_BUILDINGS.genespire.tiers;
  cityGridEntries().forEach(([key,b])=>{
    if(b==='genespire'){const t=getSpireTier(key);total+=(tiers.find(x=>x.tier===t)||tiers[0]).gpH;}
  });
  return total;
}
function getBreedingHallLevel(){
  const bred=safeNum(state.totalBred),lvls=CITY_BUILDINGS.breeding.levels;
  let level=0;for(let i=0;i<lvls.length;i++){if(bred>=lvls[i].target)level=i+1;}return level;
}
function getBreedingHallRate(){
  const lvl=getBreedingHallLevel();if(!lvl)return 0;
  const b=getCityBonuses();return CITY_BUILDINGS.breeding.levels[lvl-1].gpH*b.breedingHallMult*b.allGoldMult;
}
function getCullingHallLevel(){
  const culled=safeNum(state.totalCulled),lvls=CITY_BUILDINGS.culling.levels;
  let level=0;for(let i=0;i<lvls.length;i++){if(culled>=lvls[i].target)level=i+1;}return level;
}
function getCullingHallRate(){
  const lvl=getCullingHallLevel();if(!lvl)return 0;
  const b=getCityBonuses();return CITY_BUILDINGS.culling.levels[lvl-1].diaH*b.allDiaMult;
}
const PVE_ACT2_STAGES=[
  // Act 2 — The Ascendancy (stages 1-9, needs 1-2 fully skilled immortals or 1 prestiged)
  {id:'a2_1', act:2,name:'The Veil Breaks',       desc:'Something ancient stirs. Your first Act 2 opponent is leagues beyond Act 1.',enemies:1,eLevel:2, gpR:5,  iconR:null,       boss:false},
  {id:'a2_2', act:2,name:'Twin Sovereigns',        desc:'Two creatures of extraordinary power. Coordination is essential.',           enemies:2,eLevel:2, gpR:6,  iconR:null,       boss:false},
  {id:'a2_3', act:2,name:'The Ascendants',         desc:'Three ascended specimens. Your immortals must be fully skilled.',            enemies:3,eLevel:3, gpR:7,  iconR:null,       boss:false},
  {id:'a2_4', act:2,name:'Prime Champion',         desc:'A single Prime-class champion. Near-perfect genetics.',                     enemies:1,eLevel:4, gpR:7,  iconR:null,       boss:false},
  {id:'a2_5', act:2,name:'The Siege',              desc:'Four enemies assaulting in waves. Endurance is critical.',                  enemies:4,eLevel:3, gpR:8,  iconR:null,       boss:false},
  {id:'a2_6', act:2,name:'Void Hunters',           desc:'Two Void-class hunters with devastating speed.',                            enemies:2,eLevel:5, gpR:8,  iconR:null,       boss:false},
  {id:'a2_7', act:2,name:'Ancient Tribunal',       desc:'Three ancient judges. Crits and dodges appear here.',                      enemies:3,eLevel:5, gpR:9,  iconR:null,       boss:false},
  {id:'a2_8', act:2,name:'Eternal Guard',          desc:'Five hardened sentinels. Your first true act 2 multi-wave.',               enemies:5,eLevel:4, gpR:10, iconR:null,       boss:false},
  {id:'a2_9', act:2,name:'Apex Convergence',       desc:'Three Apex Primes at full power. The hardest stage before the first boss.', enemies:3,eLevel:7, gpR:12, iconR:null,       boss:false},
  {id:'a2_10',act:2,name:'🌋 BOSS: The Volcano',   desc:'An immortal forged in catastrophe. A fully skilled immortal may survive.', enemies:1,eLevel:8, gpR:20, iconR:'🌋',        boss:true},
  // Act 2 — The Reckoning (stages 11-19, needs 2 fighters, 1 prestiged minimum)
  {id:'a2_11',act:2,name:'Reckoning Vanguard',     desc:'Two Reckoning-class vanguards. Prestige is no longer optional.',           enemies:2,eLevel:9, gpR:12, iconR:null,       boss:false},
  {id:'a2_12',act:2,name:'Triad of Doom',          desc:'Three void-class opponents with full crit and dodge.',                     enemies:3,eLevel:9, gpR:13, iconR:null,       boss:false},
  {id:'a2_13',act:2,name:'The Overwhelming',       desc:'Six enemies at once. Sheer numbers designed to overwhelm.',               enemies:6,eLevel:8, gpR:14, iconR:null,       boss:false},
  {id:'a2_14',act:2,name:'Prime Duel',             desc:'Two Prime-class immortals locked in eternal combat. Join it.',             enemies:2,eLevel:11,gpR:14, iconR:null,       boss:false},
  {id:'a2_15',act:2,name:'The Purge',              desc:'Five ascendants executing a purge. Regen begins to matter here.',         enemies:5,eLevel:10,gpR:15, iconR:null,       boss:false},
  {id:'a2_16',act:2,name:'Eternal Legion',         desc:'Four eternal-class soldiers. Near max regen per round.',                  enemies:4,eLevel:12,gpR:16, iconR:null,       boss:false},
  {id:'a2_17',act:2,name:'The Impossible Apex',   desc:'One supremely optimised apex predator. A wall of pure power.',            enemies:1,eLevel:14,gpR:16, iconR:null,       boss:false},
  {id:'a2_18',act:2,name:'Void Annihilators',      desc:'Three annihilators bred for mass destruction.',                           enemies:3,eLevel:13,gpR:18, iconR:null,       boss:false},
  {id:'a2_19',act:2,name:'The Final Tribunal',     desc:'Five ancient judges at maximum power. The hardest stage before boss 2.', enemies:5,eLevel:13,gpR:20, iconR:null,       boss:false},
  {id:'a2_20',act:2,name:'🏔️ BOSS: The Summit',   desc:'A creature that has never lost. Two fighters strongly advised.',          enemies:1,eLevel:16,gpR:25, iconR:'🏔️',        boss:true},
  // Act 2 — The Transcendence (stages 21-29, needs 2-3 fighters, 2 prestiged)
  {id:'a2_21',act:2,name:'Transcendent Vanguard',  desc:'Two transcendent-class specimens. Everything is maximised.',              enemies:2,eLevel:17,gpR:18, iconR:null,       boss:false},
  {id:'a2_22',act:2,name:'The Omega Triad',        desc:'Three Omega-class fighters. Regen will frustrate unbuffed immortals.',   enemies:3,eLevel:18,gpR:20, iconR:null,       boss:false},
  {id:'a2_23',act:2,name:'Apex Armada',            desc:'Four apex-class creatures moving as a single weapon.',                   enemies:4,eLevel:18,gpR:22, iconR:null,       boss:false},
  {id:'a2_24',act:2,name:'The Convergence',        desc:'Two perfect specimens — opposite ends of the genetic spectrum.',         enemies:2,eLevel:22,gpR:22, iconR:null,       boss:false},
  {id:'a2_25',act:2,name:'Eternal Siege',          desc:'Five eternal-class soldiers with full regen. Attrition warfare.',        enemies:5,eLevel:19,gpR:24, iconR:null,       boss:false},
  {id:'a2_26',act:2,name:'The Void Army',          desc:'Six void hunters. Overwhelming speed combined with numbers.',            enemies:6,eLevel:18,gpR:25, iconR:null,       boss:false},
  {id:'a2_27',act:2,name:'Prime Tribunal',         desc:'Three Prime-class ancient judges at absolute peak power.',              enemies:3,eLevel:22,gpR:26, iconR:null,       boss:false},
  {id:'a2_28',act:2,name:'Transcendent Duel',      desc:'Two transcendent champions. The hardest two-enemy fight yet.',          enemies:2,eLevel:25,gpR:28, iconR:null,       boss:false},
  {id:'a2_29',act:2,name:'The Final Legion',       desc:'Five fully transcendent soldiers. The penultimate test before boss 3.', enemies:5,eLevel:22,gpR:30, iconR:null,       boss:false},
  {id:'a2_30',act:2,name:'👾 BOSS: The Void God',  desc:'A being of pure void energy. Three fighters needed to survive.',        enemies:1,eLevel:27,gpR:35, iconR:'👾',        boss:true},
  // Act 2 — The Finale (stages 31-33, needs 3 fully maxed prestiged)
  {id:'a2_31',act:2,name:'Omega Armada',           desc:'Four Omega Prime creatures. All stats maximised. Regen 90+.',           enemies:4,eLevel:28,gpR:30, iconR:null,       boss:false},
  {id:'a2_32',act:2,name:'The Transcendent Six',   desc:'Six fully transcendent soldiers. The last challenge before the end.',   enemies:6,eLevel:26,gpR:35, iconR:null,       boss:false},
  {id:'a2_33',act:2,name:'🎆 BOSS: The Absolute',  desc:'The final reckoning. Never defeated. Three fully prestiged immortals required.', enemies:2,eLevel:33,gpR:100,iconR:'🎆',boss:true},
];

// ═══════════════════════════════════════════════════════════
//  PvE ACT 3 — 27 stages
//  Requires all 33 Act 2 stages cleared.
//  Balanced: requires 3 fully maxed + fully prestiged immortals.
//  Enemies scale far beyond prestige stats alone — city RI warfare bonuses become essential.
//  Enemy formula: ATK=800+level*60, DEF=600+level*50, HP=3000+level*300
//  All enemies: crit 35%, dodge 25%, regen 80+level*8/rnd
// ═══════════════════════════════════════════════════════════
function makePveAct3Enemy(level,idx=0){
  const names=['Void God','Eternal Prime','Omega Absolute','Transcendent','The Undying','Apex Eternal','Sovereign Prime','Infinite','The Final','The Absolute'];
  const jitter=rand(-15,15);
  return{
    atk:  Math.max(200, 800+level*60+jitter),
    spd:  Math.max(100, 600+level*45+Math.floor(jitter/2)-idx*8),
    def:  Math.max(200, 600+level*50+jitter),
    hp:   3000+level*300,
    crit:  0.35,
    dodge: 0.25,
    regen: 80+level*8,
    name:`${names[(idx+level)%names.length]} ${String.fromCharCode(65+idx)}`,
  };
}

const PVE_ACT3_STAGES=[
  // Chapter 1 — The Infinite War (1-8, needs 3 fully maxed+prestiged, city RI warfare helps)
  {id:'a3_1', act:3,name:'Beyond The Veil',          desc:'The first enemy of Act 3 has stats beyond what you thought possible.',    enemies:1,eLevel:2, gpR:10, iconR:null,      boss:false},
  {id:'a3_2', act:3,name:'The Dual Nightmare',        desc:'Two enemies, each more powerful than The Absolute. Coordinate precisely.',enemies:2,eLevel:2, gpR:12, iconR:null,      boss:false},
  {id:'a3_3', act:3,name:'Triad of Infinity',         desc:'Three absolute-tier opponents. Every stat matters here.',                  enemies:3,eLevel:3, gpR:14, iconR:null,      boss:false},
  {id:'a3_4', act:3,name:'The Immovable',             desc:'One supremely armoured opponent. Burst damage or nothing.',               enemies:1,eLevel:5, gpR:14, iconR:null,      boss:false},
  {id:'a3_5', act:3,name:'Infinite Legion',           desc:'Six enemies simultaneously. The regen alone may outlast you.',           enemies:6,eLevel:3, gpR:15, iconR:null,      boss:false},
  {id:'a3_6', act:3,name:'The Speed Gods',            desc:'Two enemies of incomprehensible speed. They attack first, always.',       enemies:2,eLevel:5, gpR:16, iconR:null,      boss:false},
  {id:'a3_7', act:3,name:'Omega Tribunal',            desc:'Three ancient judges empowered beyond their Act 2 forms.',               enemies:3,eLevel:5, gpR:18, iconR:null,      boss:false},
  {id:'a3_8', act:3,name:'🔴 BOSS: The Crimson God',  desc:'A god of war. Three fully maxed prestiged fighters required.',           enemies:1,eLevel:8, gpR:30, iconR:'🔴',      boss:true},
  // Chapter 2 — The Dark Convergence (9-16, city RI warfare bonuses required)
  {id:'a3_9', act:3,name:'Dark Vanguard',             desc:'Two Dark Convergence soldiers. Your RI warfare tree must be invested.',   enemies:2,eLevel:8, gpR:18, iconR:null,      boss:false},
  {id:'a3_10',act:3,name:'The Unholy Trinity',        desc:'Three enemies with perfect tactical synergy. No weak links.',            enemies:3,eLevel:9, gpR:20, iconR:null,      boss:false},
  {id:'a3_11',act:3,name:'Crushing Tide',             desc:'Five enemies in a relentless assault. Regen will be your downfall.',     enemies:5,eLevel:8, gpR:20, iconR:null,      boss:false},
  {id:'a3_12',act:3,name:'The Apex Duel',             desc:'Two apex-eternal specimens. The hardest two-enemy fight in the game.',   enemies:2,eLevel:11,gpR:22, iconR:null,      boss:false},
  {id:'a3_13',act:3,name:'Void Armada',               desc:'Four void-class enemies with maximum regen. Attrition warfare.',        enemies:4,eLevel:10,gpR:22, iconR:null,      boss:false},
  {id:'a3_14',act:3,name:'The Seven',                 desc:'Seven enemies. An overwhelming wall of regenerating power.',            enemies:7,eLevel:8, gpR:24, iconR:null,      boss:false},
  {id:'a3_15',act:3,name:'Immortal Champions',        desc:'Two immortal-class champions who share their HP pools tactically.',      enemies:2,eLevel:13,gpR:25, iconR:null,      boss:false},
  {id:'a3_16',act:3,name:'⬛ BOSS: The Void Empress', desc:'She has never lost. Darkness incarnate. Your RI bonuses determine survival.', enemies:1,eLevel:15,gpR:40, iconR:'⬛', boss:true},
  // Chapter 3 — The Final Ascent (17-23, maximum challenge)
  {id:'a3_17',act:3,name:'Ascent Begins',             desc:'Three enemies at levels that should not exist.',                         enemies:3,eLevel:15,gpR:25, iconR:null,      boss:false},
  {id:'a3_18',act:3,name:'Eternal Vanguard',          desc:'Two eternal-class vanguards at absolute maximum stats.',                 enemies:2,eLevel:18,gpR:28, iconR:null,      boss:false},
  {id:'a3_19',act:3,name:'The Impossible Six',        desc:'Six enemies at the highest regular difficulty.',                        enemies:6,eLevel:15,gpR:28, iconR:null,      boss:false},
  {id:'a3_20',act:3,name:'Omega Singularity',         desc:'One opponent whose stats defy conventional categorisation.',            enemies:1,eLevel:22,gpR:30, iconR:null,      boss:false},
  {id:'a3_21',act:3,name:'The Four Horsemen',         desc:'Four supreme champions. Each one could solo Act 2.',                    enemies:4,eLevel:19,gpR:32, iconR:null,      boss:false},
  {id:'a3_22',act:3,name:'Dark Convergence Final',    desc:'Five enemies representing the pinnacle of dark genetic engineering.',   enemies:5,eLevel:18,gpR:35, iconR:null,      boss:false},
  {id:'a3_23',act:3,name:'🔱 BOSS: The Trinity',      desc:'Three absolute beings fighting as one. Your strongest fight yet.',      enemies:3,eLevel:20,gpR:50, iconR:'🔱',      boss:true},
  // Chapter 4 — The End (24-27)
  {id:'a3_24',act:3,name:'The Penultimate',           desc:'Four enemies. Every single RI skill matters now.',                      enemies:4,eLevel:22,gpR:40, iconR:null,      boss:false},
  {id:'a3_25',act:3,name:'Final Gauntlet',            desc:'Seven enemies at maximum power. Survive to claim your place.',         enemies:7,eLevel:20,gpR:45, iconR:null,      boss:false},
  {id:'a3_26',act:3,name:'The Last Trial',            desc:'Two beings of infinite power. The final preparation.',                 enemies:2,eLevel:28,gpR:50, iconR:null,      boss:false},
  {id:'a3_27',act:3,name:'♾️ BOSS: The Infinite',    desc:'Beyond all limits. Beyond all understanding. Three fully invested RI warfare immortals required.', enemies:1,eLevel:35,gpR:200, iconR:'♾️', boss:true},
];

// Enemy formula for Act 1 (unchanged)
// Enemy formula — designed so a fresh immortal (ATK/SPD/DEF 125, HP 200) can beat level 1-5,
// and maxed immortals with 3 fighters are needed for level 20 (final boss).
// ATK = 30+level*9, SPD = 25+level*8, DEF = 20+level*9, HP = 120+level*38
// Crits appear at level 13+, dodge at 16+, regen at 19+
function makePveEnemy(level,idx=0){
  const names=['Predator','Apex','Champion','Titan','Omega','Reaper','Ancient','Berserker','Phantom','Colossus'];
  const jitter=rand(-5,5);
  return{
    atk: Math.max(10, 30+level*9+jitter),
    spd: Math.max(10, 25+level*8+Math.floor(jitter/2)-idx*3),
    def: Math.max(5,  20+level*9+jitter),
    hp:  120+level*38,
    crit:  level>=13 ? 0.15 : 0,
    dodge: level>=16 ? 0.10 : 0,
    regen: level>=19 ? level : 0,
    name:`${names[idx%names.length]} ${String.fromCharCode(65+idx)}`,
  };
}

function simulateFight(atkTeam,defTeam){
  const log=[];
  const a=atkTeam.map((x,i)=>({...x,hp:x.hp,maxHp:x.hp,id:'a'+i,team:'atk'}));
  const d=defTeam.map((x,i)=>({...x,hp:x.hp,maxHp:x.hp,id:'d'+i,team:'def'}));
  const alive=arr=>arr.filter(x=>x.hp>0);
  let round=0;
  while(round<300&&alive(a).length&&alive(d).length){
    round++;
    const all=[...alive(a),...alive(d)].sort((x,y)=>y.spd-x.spd);
    const logRound=round<=4||(round%5===0&&round<=30)||round%20===0;
    if(logRound) log.push(`── Round ${round} [${alive(a).length}v${alive(d).length}] ──`);
    for(const fighter of all){
      if(fighter.hp<=0)continue;
      const enemies=fighter.team==='atk'?alive(d):alive(a);
      if(!enemies.length)break;
      const target=enemies[Math.floor(Math.random()*enemies.length)];
      if(target.dodge&&Math.random()<target.dodge){
        if(round<=6) log.push(`  💨 ${target.name} dodged ${fighter.name}'s attack`);
        continue;
      }
      let dmg=Math.max(1,fighter.atk-Math.floor(target.def*0.38));
      const isCrit=fighter.crit&&Math.random()<fighter.crit;
      if(isCrit)dmg=Math.floor(dmg*1.8);
      target.hp=Math.max(0,target.hp-dmg);
      if(round<=8||isCrit||target.hp===0)
        log.push(`  ${fighter.team==='atk'?'⚔':'🩸'} ${fighter.name}→${target.name}: ${isCrit?'💥CRIT ':''}${fmt(dmg)} dmg (${fmt(target.hp)} hp left)`);
      if(target.hp===0) log.push(`  ${fighter.team==='atk'?'✓':'💀'} ${target.name} defeated!`);
    }
    // Regen
    [...alive(a),...alive(d)].forEach(x=>{
      if(x.regen&&x.hp<x.maxHp){const r=Math.min(x.regen,x.maxHp-x.hp);x.hp+=r;if(round<=8)log.push(`  💚 ${x.name} regens ${r}hp`);}
    });
  }
  const won=alive(a).length>0&&alive(d).length===0;
  log.push(won?`🏆 VICTORY! All opponents defeated.`:`💀 DEFEAT. Your champions have fallen.`);
  return{won,log};
}

// ═══════════════════════════════════════════════════════════
//  MILESTONE TRACKS — GP rewards only, no diamonds
// ═══════════════════════════════════════════════════════════
const MILESTONE_TRACKS=[
  {id:'breeding',name:'BREEDING',val:s=>s.totalBred,unit:'bred',
   tiers:[{id:'q_first_breed',name:'First Steps',target:1,gp:1},{id:'m_bred_10',name:'Beginner',target:10,gp:1},{id:'mt_bred_25',name:'Apprentice',target:25,gp:1},{id:'m_bred_50',name:'Journeyman',target:50,gp:1},{id:'mt_bred_100',name:'Veteran',target:100,gp:1},{id:'mt_bred_250',name:'Expert',target:250,gp:1},{id:'m_bred_500',name:'Master Breeder',target:500,gp:2},{id:'q_bred_1000',name:'Grandmaster',target:1000,gp:2},{id:'mt_bred_2500',name:'Prolific',target:2500,gp:2},{id:'m_bred_5000',name:'The Factory',target:5000,gp:3},{id:'mt_bred_10000',name:'Industrial Scale',target:10000,gp:3},{id:'mt_bred_25000',name:'Unstoppable',target:25000,gp:4},{id:'mt_bred_50000',name:'Eternal Forge',target:50000,gp:5}]},
  {id:'culling',name:'CULLING',val:s=>s.totalCulled,unit:'culled',
   tiers:[{id:'q_first_cull',name:'Culling Season',target:1,gp:1},{id:'mt_cull_5',name:'Getting Started',target:5,gp:1},{id:'m_cull_10',name:'Selective',target:10,gp:1},{id:'mt_cull_25',name:'Efficient',target:25,gp:1},{id:'q_cull_50',name:'Ruthless',target:50,gp:1},{id:'mt_cull_100',name:'Merciless',target:100,gp:1},{id:'mt_cull_250',name:'Purifier',target:250,gp:2},{id:'q_cull_500',name:'Extinction Event',target:500,gp:2},{id:'mt_cull_1000',name:'The Cleansing',target:1000,gp:2},{id:'mt_cull_2500',name:'Mass Culling',target:2500,gp:3},{id:'mt_cull_5000',name:'The Great Purge',target:5000,gp:3},{id:'mt_cull_10000',name:'World Ender',target:10000,gp:4},{id:'mt_cull_25000',name:'Inevitable',target:25000,gp:5}]},
  {id:'generations',name:'GENERATIONS',val:s=>s.generation,unit:'generations',
   tiers:[{id:'mt_gen_10',name:'First Wave',target:10,gp:1},{id:'mt_gen_25',name:'Getting Going',target:25,gp:1},{id:'m_gen_50',name:'Half Century',target:50,gp:1},{id:'q_gen_100',name:'Century',target:100,gp:1},{id:'mt_gen_200',name:'Bicentennial',target:200,gp:1},{id:'q_gen_500',name:'Five Hundred',target:500,gp:2},{id:'q_gen_1000',name:'Millennium',target:1000,gp:2},{id:'mt_gen_2000',name:'Two Thousand',target:2000,gp:2},{id:'q_gen_5000',name:'The Long Game',target:5000,gp:3},{id:'q_gen_10000',name:'Eternal Lineage',target:10000,gp:3},{id:'mt_gen_25000',name:'Ancient Dynasty',target:25000,gp:4},{id:'mt_gen_50000',name:'Timeless',target:50000,gp:5}]},
  {id:'fitness',name:'FITNESS',val:s=>s.highestFitness,unit:'max fitness',
   tiers:[{id:'mt_fit_5',name:'First Spark',target:5,gp:1},{id:'q_fitness_10',name:'Fitness Fanatic',target:10,gp:1},{id:'q_fitness_15',name:'Strong Bloodline',target:15,gp:1},{id:'q_fitness_20',name:'Elite Lineage',target:20,gp:1},{id:'mt_fit_25',name:'Champion',target:25,gp:2},{id:'q_fitness_30',name:'Apex Lineage',target:30,gp:2},{id:'mt_fit_35',name:'Legendary',target:35,gp:2},{id:'q_fitness_40',name:'Transcendent',target:40,gp:3},{id:'mt_fit_45',name:'Ascended',target:45,gp:3},{id:'q_fitness_50',name:'God Complex',target:50,gp:3},{id:'mt_fit_60',name:'Beyond Mortal',target:60,gp:4},{id:'mt_fit_75',name:'Absolute',target:75,gp:4},{id:'mt_fit_100',name:'Centenary Peak',target:100,gp:5},{id:'mt_fit_125',name:'Theoretical Max',target:125,gp:6}]},
  {id:'traits',name:'TRAITS',val:s=>bestSingleTrait(s),unit:'best trait',
   tiers:[{id:'mt_tr_5',name:'Hint of Potential',target:5,gp:1},{id:'q_trait_10',name:'Promising Stock',target:10,gp:1},{id:'mt_tr_15',name:'Notable',target:15,gp:1},{id:'q_trait_20',name:'Perfect Gene',target:20,gp:1},{id:'mt_tr_25',name:'Exceptional',target:25,gp:2},{id:'mt_tr_30',name:'Superior',target:30,gp:2},{id:'q_trait_35',name:'Beyond Normal',target:35,gp:2},{id:'mt_tr_40',name:'Extraordinary',target:40,gp:3},{id:'q_trait_50',name:'Theoretical Limit',target:50,gp:3},{id:'mt_tr_75',name:'Past the Cap',target:75,gp:4},{id:'mt_tr_100',name:'Impossible',target:100,gp:4},{id:'mt_tr_125',name:'Absolute Max',target:125,gp:5}]},
  {id:'gold',name:'GOLD EARNED',val:s=>s.totalGoldEarned,unit:'total gold',
   tiers:[{id:'m_gold_50',name:'Prospector',target:50,gp:1},{id:'m_gold_250',name:'Goldsmith',target:250,gp:1},{id:'m_gold_1000',name:'Comfortable',target:1000,gp:1},{id:'m_gold_5000',name:'Well Off',target:5000,gp:1},{id:'m_gold_20000',name:'Wealthy',target:20000,gp:2},{id:'mt_gold_75k',name:'Rich',target:75000,gp:2},{id:'mt_gold_250k',name:'Magnate',target:250000,gp:3},{id:'mt_gold_1m',name:'Tycoon',target:1000000,gp:3},{id:'mt_gold_5m',name:'Industrialist',target:5000000,gp:4},{id:'mt_gold_20m',name:'Mogul',target:20000000,gp:5}]},
  {id:'diamonds',name:'DIAMONDS EARNED',val:s=>s.totalDiamondsEarned,unit:'total 💎',
   tiers:[{id:'m_dia_1',name:'First Jewel',target:1,gp:0},{id:'m_dia_5',name:'Sparkle',target:5,gp:1},{id:'m_dia_10',name:'Gem Collector',target:10,gp:1},{id:'m_dia_25',name:'Jeweller',target:25,gp:1},{id:'m_dia_50',name:'Hoarder',target:50,gp:1},{id:'m_dia_100',name:'Diamond Mine',target:100,gp:2},{id:'m_dia_250',name:'Baron',target:250,gp:2},{id:'m_dia_500',name:'Mogul',target:500,gp:2},{id:'m_dia_1000',name:'Empire',target:1000,gp:3},{id:'m_dia_2500',name:'Dynasty',target:2500,gp:3},{id:'m_dia_10000',name:'Diamond God',target:10000,gp:4}]},
  {id:'population',name:'POPULATION',val:s=>safeNum(s.maxPopEver,s.population.length),unit:'max alive',
   tiers:[{id:'mt_pop_5',name:'Small Group',target:5,gp:1},{id:'q_pop_8',name:'Growing',target:8,gp:1},{id:'mt_pop_12',name:'Cluster',target:12,gp:1},{id:'mt_pop_20',name:'Colony',target:20,gp:1},{id:'mt_pop_30',name:'Settlement',target:30,gp:2},{id:'mt_pop_40',name:'Commune',target:40,gp:2},{id:'mt_pop_60',name:'Township',target:60,gp:3},{id:'mt_pop_100',name:'City',target:100,gp:3},{id:'mt_pop_300',name:'Metropolis',target:300,gp:5},{id:'mt_pop_500',name:'Megacity',target:500,gp:8}]},
  {id:'upgrades',name:'UPGRADES',val:s=>GOLD_UPGRADES.reduce((n,d)=>n+safeNum(s.upgrades?.[d.id]),0),unit:'gold upgrade levels',
   tiers:[{id:'q_first_upgrade',name:'First Investment',target:1,gp:1},{id:'mt_upg_5',name:'Invested',target:5,gp:1},{id:'mt_upg_15',name:'Committed',target:15,gp:1},{id:'mt_upg_25',name:'Dedicated',target:25,gp:2},{id:'mt_upg_35',name:'Obsessed',target:35,gp:2},{id:'mt_upg_45',name:'Expert',target:45,gp:3},{id:'mt_upg_55',name:'Gold Maxed',target:55,gp:4}]},
  {id:'research',name:'RESEARCH',val:s=>safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0),unit:'researchers',
   tiers:[{id:'m_first_researcher',name:'Research Initiative',target:1,gp:1},{id:'mt_res_3',name:'Growing Team',target:3,gp:1},{id:'mt_res_8',name:'Division',target:8,gp:2},{id:'mt_res_15',name:'Department',target:15,gp:2},{id:'mt_res_25',name:'Full Lab',target:25,gp:3},{id:'mt_res_37',name:'Complete Division',target:37,gp:4}]},
  {id:'icons',name:'ICON COLLECTION',val:s=>(s.ownedIcons||[]).length,unit:'icons',
   tiers:[{id:'mt_icon_1',name:'First Find',target:1,gp:0},{id:'mt_icon_5',name:'Growing Set',target:5,gp:1},{id:'mt_icon_15',name:'Collector',target:15,gp:1},{id:'mt_icon_30',name:'Curator',target:30,gp:2},{id:'mt_icon_50',name:'Archivist',target:50,gp:2},{id:'mt_icon_80',name:'Master Collector',target:80,gp:3},{id:'mt_icon_162',name:'Complete Set',target:162,gp:5}]},
  {id:'immortals',name:'IMMORTALS',val:s=>(s.immortals||[]).length,unit:'immortals',
   tiers:[{id:'mt_imm_1',name:'First Champion',target:1,gp:2},{id:'mt_imm_3',name:'Elite Guard',target:3,gp:3},{id:'mt_imm_5',name:'Immortal Legion',target:5,gp:4}]},
  {id:'pve',name:'PVE ACT 1',val:s=>(s.pveCompleted||[]).length,unit:'stages cleared',
   tiers:[{id:'mt_pve_1',name:'First Blood',target:1,gp:2},{id:'mt_pve_5',name:'Veteran Fighter',target:5,gp:3},{id:'mt_pve_10',name:'Act 1 Complete',target:10,gp:4},{id:'mt_pve_20',name:'Act 2 Complete',target:20,gp:5},{id:'mt_pve_30',name:'Act 3 Complete',target:30,gp:6},{id:'mt_pve_37',name:'Conqueror',target:37,gp:10}]},
  {id:'pve2',name:'PVE ACT 2',val:s=>(s.pveAct2Completed||[]).length,unit:'act 2 stages',
   tiers:[{id:'mt_pve2_1',name:'Ascendant',target:1,gp:3},{id:'mt_pve2_10',name:'First Reckoning',target:10,gp:5},{id:'mt_pve2_20',name:'Transcendent',target:20,gp:8},{id:'mt_pve2_33',name:'The Absolute',target:33,gp:15}]},
  {id:'pve3',name:'PVE ACT 3',val:s=>(s.pveAct3Completed||[]).length,unit:'act 3 stages',
   tiers:[{id:'mt_pve3_1',name:'Beyond The Veil',target:1,gp:5},{id:'mt_pve3_8',name:'Crimson God Slain',target:8,gp:8},{id:'mt_pve3_16',name:'Void Empress Fallen',target:16,gp:12},{id:'mt_pve3_23',name:'Trinity Defeated',target:23,gp:20},{id:'mt_pve3_27',name:'The Infinite',target:27,gp:50}]},
  {id:'city_ri',name:'RESEARCH INSTITUTE',val:s=>safeNum(s.city?.riLevel),unit:'RI level',
   tiers:[{id:'mt_ri_1',name:'The Institute Opens',target:1,gp:5},{id:'mt_ri_2',name:'Sacrifice Made',target:2,gp:15},{id:'mt_ri_3',name:'Absolute Dominion',target:3,gp:50}]},
  {id:'city_skills',name:'RI SKILLS',val:s=>(s.city?.riSkills||[]).length,unit:'skills unlocked',
   tiers:[{id:'mt_ris_1',name:'First Research',target:1,gp:2},{id:'mt_ris_5',name:'Developing',target:5,gp:3},{id:'mt_ris_10',name:'Invested',target:10,gp:5},{id:'mt_ris_20',name:'Scholar',target:20,gp:8},{id:'mt_ris_30',name:'Master Researcher',target:30,gp:12},{id:'mt_ris_40',name:'Omniscient',target:40,gp:20}]},
  {id:'city_bh',name:'BREEDING HALL',val:s=>safeNum(s.totalBred)>=50000?4:safeNum(s.totalBred)>=30000?3:safeNum(s.totalBred)>=20000?2:safeNum(s.totalBred)>=10000?1:0,unit:'BH level',
   tiers:[{id:'mt_bh_1',name:'Hall of Breeding',target:1,gp:5},{id:'mt_bh_2',name:'Industrial',target:2,gp:8},{id:'mt_bh_3',name:'Mass Production',target:3,gp:12},{id:'mt_bh_4',name:'The Eternal Engine',target:4,gp:20}]},
];

// ═══════════════════════════════════════════════════════════
//  SECRET MILESTONES — unusual deliberate actions only
// ═══════════════════════════════════════════════════════════
const SECRET_MILESTONES=[
  {id:'ms_s_bg',        name:'You Wish',          desc:'Try to set your username to "breeding-ground".',                     check:s=>!!s.triedUsernameBG,            gp:5},
  {id:'ms_s_night',     name:'Night Owl',          desc:'Save the game between 2am and 4am local time.',                     check:s=>!!s.savedAtMidnight,            gp:5},
  {id:'ms_s_incest',    name:'Incestuous',         desc:'Use Selective Breeding on the same pair 10 times in a row.',        check:s=>safeNum(s.sameParentCount)>=10, gp:5},
  {id:'ms_s_obsessed',  name:'Obsessed',           desc:'Open the same Gene Vault 50+ times.',                               check:s=>GENE_VAULTS.some(v=>safeNum(s[`vault_${v.id}_opens`])>=50), gp:5},
  {id:'ms_s_thirsty',   name:'Thirsty',            desc:'Attempt to breed when population is at the cap, 10 times.',         check:s=>safeNum(s.breedCapHits)>=10,    gp:5},
  {id:'ms_s_refresh',   name:'Refresh Addict',     desc:'Refresh the leaderboard 20 times.',                                 check:s=>safeNum(s.lbRefreshCount)>=20,  gp:5},
  {id:'ms_s_auto',      name:'Auto Addict',        desc:'Let the auto-breeder run 500 breeds without a single manual breed.',check:s=>safeNum(s.autoOnlyBreeds)>=500, gp:5},
  {id:'ms_s_complete',  name:'Completionist',      desc:`Own all ${TOTAL_ICONS} icons.`,                                     check:s=>(s.ownedIcons||[]).length>=TOTAL_ICONS, gp:5},
  {id:'ms_s_pvpwin',    name:'The Challenger',     desc:'Win your first PvP fight.',                                         check:s=>safeNum(s.pvpWins)>=1,          gp:5},
  {id:'ms_s_dispose',   name:'Necessary Evil',     desc:'Dispose of an immortal.',                                           check:s=>!!s.hasDisposedImmortal,        gp:5},
  {id:'ms_s_vault_max', name:'Hoarder Supreme',    desc:'Fully collect all 25 icons from any single Gene Vault.',            check:s=>GENE_VAULTS.some(v=>v.icons.every(ic=>(s.ownedIcons||[]).includes(ic))), gp:5},
  {id:'ms_s_broke_dia', name:'Diamond Broke',      desc:'Spend every last diamond — reach exactly 0 💎.',                   check:s=>s.diamonds===0&&safeNum(s.totalDiamondsEarned)>=50, gp:5},
  {id:'ms_s_prestige',  name:'Reborn',             desc:'Prestige your first immortal.',                                      check:s=>(s.immortals||[]).some(im=>im.prestiged), gp:5},
  {id:'ms_s_darwin',    name:'In His Name',        desc:'Name an immortal "Darwin".',                                         check:s=>!!s.namedImmortalDarwin, gp:5},
];

// ═══════════════════════════════════════════════════════════
// Assign diamond rewards to each tier: scales 1→5 across each track, secrets get 3
MILESTONE_TRACKS.forEach(track=>{
  const n=track.tiers.length;
  track.tiers.forEach((tier,i)=>{
    if(tier.dia===undefined) tier.dia=Math.max(1,Math.round(1+(4*(i/(Math.max(n-1,1))))));
  });
});
SECRET_MILESTONES.forEach(m=>{ if(m.dia===undefined) m.dia=3; });

//  STATE
// ═══════════════════════════════════════════════════════════
let state={population:[],upgrades:{},research:{},completedMilestones:[],immortals:[],pveCompleted:[],ownedIcons:[],combatLog:[]};
let _gameReady=false;
function guardReady(){if(!_gameReady){addLog('Game still loading — please wait.','warn');return false;}return true;}

let currentTab='log',selectedForBreeding=[],bestEverTraits={};
let autoBreedInterval=null,autoBreederPaused=false,autoBredTotal=0;
let pendingImmortalId=null,combatSubTab='pve',pveAct=1;
let pvpTarget=null,pvpMyImmortal=null;
window.isGuest=false;

function defaultState(){
  return{
    generation:1,population:[],gold:0,diamonds:0,genePoints:0,
    totalBred:0,totalCulled:0,totalGoldEarned:0,totalDiamondsEarned:0,
    totalDiamondsSpent:0,highestFitness:0,maxPopEver:0,
    completedMilestones:[],milestoneDiamondsAwarded:[],
    surgeBreedsRemaining:0,surgeUseCount:0,
    everBroke:false,culledOwnRecord:false,usedLegendaryStock:false,hasSetUsername:false,
    bredBeforeFirstCull:0,firstCullDone:false,culledFromThree:false,
    triedUsernameBG:false,savedAtMidnight:false,sameParentCount:0,lastParentPair:null,
    breedCapHits:0,lbRefreshCount:0,autoOnlyBreeds:0,hasDisposedImmortal:false,namedImmortalDarwin:false,
    diamondBuffer:0,lastArchivistGen:1,totalResearchDiamondsEarned:0,
    totalVaultOpens:0,ownedIcons:[],selectedIcon:null,
    vault_aquatic_opens:0,vault_flora_opens:0,vault_cosmos_opens:0,
    vault_predator_opens:0,vault_ancient_opens:0,vault_machine_opens:0,
    immortals:[],combatSlots:1,pveCompleted:[],pveAct2Completed:[],pveAct3Completed:[],pvpWins:0,pvpLosses:0,combatLog:[],
    city:{name:'',bannerColor:'',motto:'',riLevel:0,riSkills:[],sacrificedImmortalId:null,grid:{},monumentIcons:[],lastGoldTick:null,goldBuffer:0,spireTiers:{}},
    loginStreak:0,lastLoginDate:null,totalLoginDays:0,loginRewardsClaimed:[],
    research:{labInterns:0,geneAnalysts:0,lineageArchivists:0,headOfResearch:false,automatedSequencer:false},
    upgrades:{popCap:0,mutation:0,traitAmp:0,breedYield:0,cullValue:0,selective:0,cullInsight:0,lineageMem:0,hybridVigor:0,adaptiveGenetics:0,autoBreeder:0,traitCapBoost:0,eliteMutation:0,deepArchive:0,secretDecoder:0},
  };
}

function getMaxPop(){return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20;}

function getCityBonuses(){
  if(!state||!state.city)return{cullGoldMult:1,breedGoldMult:1,researchDiaMult:1,vaultCostMult:1,breedingHallMult:1,allGoldMult:1,allDiaMult:1,traitCapBonus:0,immortalHpBonus:0,immortalAtkBonus:0,immortalDefBonus:0,immortalStatMult:1,pvpGpBonus:0,milestoneGpBonus:0,secretMsGpBonus:0,perHundredGpBonus:0,vaultDupRefundBonus:0,autoBreederSpeedMult:1,prestigeSkillCostMult:1,prestigeCostMult:1,allGpMult:1,scoreGenBonus:0,monumentIconBonus:0,allMsGpMult:1,researchRateMult:1,bannerUnlocked:false,mottoUnlocked:false};
  const sk=state.city?.riSkills||[];
  const b={
    cullGoldMult:1,breedGoldMult:1,researchDiaMult:1,vaultCostMult:1,
    breedingHallMult:1,allGoldMult:1,allDiaMult:1,
    traitCapBonus:0,immortalHpBonus:0,immortalAtkBonus:0,immortalDefBonus:0,
    immortalStatMult:1,pvpGpBonus:0,
    milestoneGpBonus:0,secretMsGpBonus:0,perHundredGpBonus:0,
    vaultDupRefundBonus:0,autoBreederSpeedMult:1,
    prestigeSkillCostMult:1,prestigeCostMult:1,allGpMult:1,
    scoreGenBonus:0,monumentIconBonus:0,allMsGpMult:1,researchRateMult:1,
    bannerUnlocked:false,mottoUnlocked:false,
  };
  if(!sk.length)return b;
  // ECONOMY
  if(sk.includes('ri_e1'))b.cullGoldMult*=1.1;
  if(sk.includes('ri_e2'))b.breedGoldMult*=1.1;
  if(sk.includes('ri_e3'))b.researchDiaMult*=1.15;
  if(sk.includes('ri_e4'))b.vaultCostMult*=0.9;
  if(sk.includes('ri_e5'))b.breedingHallMult*=1.25;
  if(sk.includes('ri_e6'))b.allGoldMult*=1.2;
  if(sk.includes('ri_e7'))b.allDiaMult*=1.3;
  if(sk.includes('ri_e8'))b.breedGoldMult*=2;
  // GENETICS
  if(sk.includes('ri_g4'))b.traitCapBonus+=3;
  if(sk.includes('ri_g7'))b.traitCapBonus+=10;
  // WARFARE
  if(sk.includes('ri_w2'))b.immortalHpBonus+=100;
  if(sk.includes('ri_w3'))b.immortalAtkBonus+=20;
  if(sk.includes('ri_w4'))b.immortalDefBonus+=20;
  if(sk.includes('ri_w5'))b.immortalStatMult*=1.15;
  if(sk.includes('ri_w6'))b.pvpGpBonus+=5;
  if(sk.includes('ri_w7'))b.immortalStatMult*=1.25;
  if(sk.includes('ri_w8'))b.prestigeCostMult*=0.75;
  // ARCANA
  if(sk.includes('ri_a1'))b.milestoneGpBonus+=1;
  if(sk.includes('ri_a2'))b.secretMsGpBonus+=2;
  if(sk.includes('ri_a3'))b.perHundredGpBonus+=1;
  if(sk.includes('ri_a4'))b.vaultDupRefundBonus+=0.1;
  if(sk.includes('ri_a5'))b.bannerUnlocked=true;
  if(sk.includes('ri_a6'))b.autoBreederSpeedMult*=1.25;
  if(sk.includes('ri_a7'))b.prestigeSkillCostMult*=0.8;
  if(sk.includes('ri_a8'))b.allGpMult*=1.3;
  // LEGACY
  if(sk.includes('ri_l1'))b.mottoUnlocked=true;
  if(sk.includes('ri_l2'))b.scoreGenBonus=5;
  if(sk.includes('ri_l3'))b.monumentIconBonus+=2;
  if(sk.includes('ri_l4'))b.milestoneGpBonus+=1;
  if(sk.includes('ri_l6'))b.researchRateMult*=1.25;
  if(sk.includes('ri_l7'))b.allMsGpMult*=1.5;
  // Absolute dominion: ×1.1 to everything
  if(sk.includes('ri_l8')){
    b.breedGoldMult*=1.1;b.cullGoldMult*=1.1;b.breedingHallMult*=1.1;
    b.allGoldMult*=1.1;b.allGpMult*=1.1;b.allMsGpMult*=1.1;
  }
  return b;
}

function getCitySlots(){
  if((state.pveAct2Completed||[]).length<PVE_ACT2_STAGES.length)return 0;
  return Math.max(1, Math.floor(safeNum(state.generation)/10000));
}
function isCityUnlocked(){return getCitySlots()>0;}

function getBreedGold(){
  const base=[1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1;
  const b=getCityBonuses();
  return Math.floor(base*b.breedGoldMult*b.allGoldMult);
}
function getCullBonus(){
  const base=[0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0;
  const b=getCityBonuses();
  return Math.floor(base*b.cullGoldMult*b.allGoldMult);
}
function getCullCount(){return[1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1;}
function getMutRate(){return[0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15;}
function getMutBonus(){return safeNum(state.upgrades?.mutation)>=6?2:1;}
function getAmpRate(){return[0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0;}
function getAmpBonus(){return safeNum(state.upgrades?.traitAmp)>=5;}
function getMemRate(){return[0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0;}
function getMemBonus(){return[0,1,2][safeNum(state.upgrades?.deepArchive)]??0;}
function getTraitCap(){return TRAIT_MAX+([0,5,10,20,35,55,75][safeNum(state.upgrades?.traitCapBoost)]??0)+getCityBonuses().traitCapBonus;}
function researchMult(){return(state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1)*getCityBonuses().researchRateMult;}
function researchBreedYield(){return safeNum(state.research?.labInterns)*0.15*researchMult();}
function researchCullYield(){return safeNum(state.research?.geneAnalysts)*0.4*researchMult();}
function researchArchYield(){return safeNum(state.research?.lineageArchivists)*1.0*researchMult();}
function getAutoRate(){return AUTO_RATES[safeNum(state.upgrades?.autoBreeder)]??0;}

function getMilestoneCounts(){
  const all=[...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)];
  return{done:all.filter(id=>(state.completedMilestones||[]).includes(id)).length,total:all.length};
}
window.getMilestoneCounts=getMilestoneCounts;

window.calcScore=()=>{
  const cb=getCityBonuses();
  const genMult=10+cb.scoreGenBonus;
  return Math.floor(
    (safeNum(state.highestFitness)*200+safeNum(state.generation)*genMult+
     safeNum(state.totalBred)*3+safeNum(state.totalCulled)*5+
     safeNum(state.totalGoldEarned)+safeNum(state.totalDiamondsEarned)*100)/100
  );
};

function migrateCrature(c){
  if(!c||typeof c!=='object')return null;
  const t=c.traits||{};
  return{id:c.id||Math.random().toString(36).slice(2,8).toUpperCase(),generation:safeNum(c.generation,1),
    traits:{speed:safeNum(t.speed,rand(1,8)),strength:safeNum(t.strength,rand(1,8)),stamina:safeNum(t.stamina,rand(1,8)),intelligence:safeNum(t.intelligence,rand(1,8)),resilience:safeNum(t.resilience,rand(1,8))}};
}

function sanitiseState(s){
  return{...s,
    generation:safeNum(s.generation,1),gold:safeNum(s.gold),diamonds:safeNum(s.diamonds),genePoints:safeNum(s.genePoints),
    totalBred:safeNum(s.totalBred),totalCulled:safeNum(s.totalCulled),
    totalGoldEarned:safeNum(s.totalGoldEarned),totalDiamondsEarned:safeNum(s.totalDiamondsEarned),
    totalDiamondsSpent:safeNum(s.totalDiamondsSpent),highestFitness:safeNum(s.highestFitness),maxPopEver:safeNum(s.maxPopEver),
    surgeBreedsRemaining:safeNum(s.surgeBreedsRemaining),surgeUseCount:safeNum(s.surgeUseCount),
    everBroke:!!s.everBroke,culledOwnRecord:!!s.culledOwnRecord,usedLegendaryStock:!!s.usedLegendaryStock,hasSetUsername:!!s.hasSetUsername,
    bredBeforeFirstCull:safeNum(s.bredBeforeFirstCull),firstCullDone:!!s.firstCullDone,culledFromThree:!!s.culledFromThree,
    triedUsernameBG:!!s.triedUsernameBG,savedAtMidnight:!!s.savedAtMidnight,
    sameParentCount:safeNum(s.sameParentCount),lastParentPair:s.lastParentPair||null,
    breedCapHits:safeNum(s.breedCapHits),lbRefreshCount:safeNum(s.lbRefreshCount),autoOnlyBreeds:safeNum(s.autoOnlyBreeds),
    hasDisposedImmortal:!!s.hasDisposedImmortal,namedImmortalDarwin:!!s.namedImmortalDarwin,
    diamondBuffer:safeNum(s.diamondBuffer),lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned),totalVaultOpens:safeNum(s.totalVaultOpens),
    ownedIcons:[...new Set(Array.isArray(s.ownedIcons)?s.ownedIcons:[])],selectedIcon:s.selectedIcon||null,
    vault_aquatic_opens:safeNum(s.vault_aquatic_opens),vault_flora_opens:safeNum(s.vault_flora_opens),
    vault_cosmos_opens:safeNum(s.vault_cosmos_opens),vault_predator_opens:safeNum(s.vault_predator_opens),
    vault_ancient_opens:safeNum(s.vault_ancient_opens),vault_machine_opens:safeNum(s.vault_machine_opens),
    completedMilestones:Array.isArray(s.completedMilestones)?s.completedMilestones:[],
    milestoneDiamondsAwarded:Array.isArray(s.milestoneDiamondsAwarded)?s.milestoneDiamondsAwarded:[],
    immortals:Array.isArray(s.immortals)?s.immortals.map(im=>({...im,prestigeSkills:Array.isArray(im.prestigeSkills)?im.prestigeSkills:[],prestiged:!!im.prestiged})):[],
    combatSlots:Math.max(1,safeNum(s.combatSlots,1)),
    pveCompleted:Array.isArray(s.pveCompleted)?s.pveCompleted:[],
    pveAct2Completed:Array.isArray(s.pveAct2Completed)?s.pveAct2Completed:[],
    pveAct3Completed:Array.isArray(s.pveAct3Completed)?s.pveAct3Completed:[],
    pvpWins:safeNum(s.pvpWins),pvpLosses:safeNum(s.pvpLosses),
    loginStreak:safeNum(s.loginStreak),lastLoginDate:s.lastLoginDate||null,
    totalLoginDays:safeNum(s.totalLoginDays),loginRewardsClaimed:Array.isArray(s.loginRewardsClaimed)?s.loginRewardsClaimed:[],
    combatLog:Array.isArray(s.combatLog)?s.combatLog:[],
    city:(()=>{
      const c=s.city||{};
      // Migrate old slots array → grid map if needed
      let grid=c.grid&&typeof c.grid==='object'&&!Array.isArray(c.grid)?{...c.grid}:{};
      const oldSlots=Array.isArray(c.slots)?c.slots:null;
      if(oldSlots&&Object.keys(grid).length===0){
        oldSlots.forEach((b,i)=>{if(b){grid[`${i},0`]=b;}});
      }
      // Ensure RI is at 0,0 if built
      if(!grid['0,0']&&c.riLevel>0)grid['0,0']='research';
      return{
        name:c.name||'',bannerColor:c.bannerColor||'',motto:c.motto||'',
        riLevel:safeNum(c.riLevel),riSkills:Array.isArray(c.riSkills)?c.riSkills:[],
        sacrificedImmortalId:c.sacrificedImmortalId||null,
        grid,monumentIcons:Array.isArray(c.monumentIcons)?c.monumentIcons:[],
        lastGoldTick:c.lastGoldTick||null,goldBuffer:safeNum(c.goldBuffer),
        spireTiers:c.spireTiers&&typeof c.spireTiers==='object'&&!Array.isArray(c.spireTiers)?c.spireTiers:{},
      };
    })(),
    research:{labInterns:safeNum(s.research?.labInterns),geneAnalysts:safeNum(s.research?.geneAnalysts),lineageArchivists:safeNum(s.research?.lineageArchivists),headOfResearch:!!s.research?.headOfResearch,automatedSequencer:!!s.research?.automatedSequencer},
    upgrades:{popCap:safeNum(s.upgrades?.popCap),mutation:safeNum(s.upgrades?.mutation),traitAmp:safeNum(s.upgrades?.traitAmp),breedYield:safeNum(s.upgrades?.breedYield),cullValue:safeNum(s.upgrades?.cullValue),selective:safeNum(s.upgrades?.selective),cullInsight:safeNum(s.upgrades?.cullInsight),lineageMem:safeNum(s.upgrades?.lineageMem),hybridVigor:safeNum(s.upgrades?.hybridVigor),adaptiveGenetics:safeNum(s.upgrades?.adaptiveGenetics),autoBreeder:safeNum(s.upgrades?.autoBreeder),traitCapBoost:safeNum(s.upgrades?.traitCapBoost),eliteMutation:safeNum(s.upgrades?.eliteMutation),deepArchive:safeNum(s.upgrades?.deepArchive),secretDecoder:safeNum(s.upgrades?.secretDecoder)},
    population:(s.population||[]).map(migrateCrature).filter(Boolean),
  };
}

function rebuildBestEverTraits(){
  TRAIT_KEYS.forEach(t=>{bestEverTraits[t]=1;});
  state.population.forEach(c=>TRAIT_KEYS.forEach(t=>{const v=safeNum(c.traits[t]);if(v>bestEverTraits[t])bestEverTraits[t]=v;}));
  (state.immortals||[]).forEach(im=>{if(im.creature)TRAIT_KEYS.forEach(t=>{const v=safeNum(im.creature.traits?.[t]);if(v>bestEverTraits[t])bestEverTraits[t]=v;});});
}

function migrateLegacyProgress(){
  const allIds=new Set([...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)]);
  const legacyIds=[...(state.completedQuests||[]),...(state.unlockedAchievements||[])];
  legacyIds.forEach(id=>{if(allIds.has(id)&&!state.completedMilestones.includes(id))state.completedMilestones.push(id);});
  // Retroactive Darwin check
  if(!state.namedImmortalDarwin&&(state.immortals||[]).some(im=>im.name?.toLowerCase()==='darwin'))
    state.namedImmortalDarwin=true;
}

function flushDiamondBuffer(){
  while(state.diamondBuffer>=1){state.diamondBuffer-=1;state.diamonds+=1;state.totalDiamondsEarned+=1;state.totalResearchDiamondsEarned+=1;}
}
function tickArchivists(){
  if(!safeNum(state.research?.lineageArchivists))return;
  const last=safeNum(state.lastArchivistGen,1);
  const ticks=Math.floor((safeNum(state.generation)-last)/25);
  if(ticks<=0)return;
  state.diamondBuffer+=ticks*researchArchYield();
  state.lastArchivistGen=last+ticks*25;
  flushDiamondBuffer();
}

// Auto-breeder
function startAutoBreeder(){
  stopAutoBreeder();
  const rate=getAutoRate();if(rate<=0)return;
  autoBreedInterval=setInterval(()=>{
    if(autoBreederPaused)return;
    if(state.population.length<2||state.population.length>=getMaxPop())return;
    const [pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
    _doBreed(pA,pB,false,true);
  },Math.round(1000/rate));
  updateAutoBtn();
}
function stopAutoBreeder(){if(autoBreedInterval){clearInterval(autoBreedInterval);autoBreedInterval=null;}updateAutoBtn();}
window.stopAutoBreeder=stopAutoBreeder;
function updateAutoBtn(){
  const btn=document.getElementById('auto-toggle-btn');if(!btn)return;
  const rate=getAutoRate();
  if(rate>0){btn.classList.remove('hidden');btn.textContent=autoBreederPaused?'[ RESUME AUTO ]':'[ PAUSE AUTO ]';}
  else btn.classList.add('hidden');
}
window.toggleAutoBreeder=()=>{autoBreederPaused=!autoBreederPaused;updateAutoBtn();addLog(autoBreederPaused?'Auto-Breeder paused.':'Auto-Breeder resumed.');};

// SAVE / LOAD
window.getSaveData=()=>sanitiseState(state);
window.applySaveData=(data)=>{
  state=sanitiseState({...defaultState(),...data});
  _gameReady=true;
  selectedForBreeding=[];rebuildBestEverTraits();migrateLegacyProgress();checkMilestones();
  tickCityGold();
  checkLoginReward();
  startAutoBreeder();renderAll();
};
window.initNewGame=()=>{
  state=defaultState();state.population=Array.from({length:5},()=>makeCreature());
  _gameReady=true;
  rebuildBestEverTraits();startAutoBreeder();renderAll();
};
window.notifyUsernameSet=()=>{if(!state.hasSetUsername){state.hasSetUsername=true;checkMilestones();renderAll();}};
window.notifyTriedBreedingGround=()=>{if(!state.triedUsernameBG){state.triedUsernameBG=true;checkMilestones();renderAll();}};
window.notifySavedMidnight=()=>{if(!state.savedAtMidnight){state.savedAtMidnight=true;checkMilestones();}};
window.notifyLbRefresh=()=>{state.lbRefreshCount=safeNum(state.lbRefreshCount)+1;checkMilestones();};

// CREATURES
function calcFitness(c){return Math.round(TRAIT_KEYS.reduce((s,t)=>s+safeNum(c.traits[t]),0)/TRAIT_KEYS.length);}
function canImmortalise(c){return calcFitness(c)>=IMMORTAL_THRESHOLD&&!(state.immortals||[]).some(im=>im.id===c.id);}

function inheritVal(va,vb,traitKey){
  va=safeNum(va,4);vb=safeNum(vb,4);
  const cap=getTraitCap();
  if(getMemRate()>0&&Math.random()<getMemRate())
    return Math.max(1,Math.min(cap,safeNum(bestEverTraits[traitKey],Math.max(va,vb))+getMemBonus()));
  const ampBase=(getAmpRate()>0&&Math.random()<getAmpRate())?Math.max(va,vb):(Math.random()<0.5?va:vb);
  const ampBonus=(getAmpBonus()&&Math.random()<0.1)?1:0;
  const parentAvg=(va+vb)/2;
  const agLvl=safeNum(state.upgrades?.adaptiveGenetics);
  let base=ampBase+ampBonus;
  if(agLvl>0&&base<parentAvg){const r=[0,0.2,0.45,0.70,1.0];if(agLvl>=4||(Math.random()<(r[agLvl]||0)))base=Math.max(base,Math.floor(parentAvg));}
  const alwaysPos=safeNum(state.upgrades?.mutation)>=4;
  const doubleMut=safeNum(state.upgrades?.mutation)>=5;
  const eliteLvl=safeNum(state.upgrades?.eliteMutation);
  let val=base;
  const applyMut=()=>{
    let res=base/cap;
    if(eliteLvl===1&&base>=30)res*=0.5;
    if(eliteLvl>=2)res=0;
    const eff=getMutRate()*(1-res*0.7);
    const boosted=safeNum(state.surgeBreedsRemaining)>0?Math.min(1,eff*2):eff;
    if(Math.random()<boosted){const dir=alwaysPos?1:(Math.random()<0.5?1:-1);const bonus=eliteLvl>=3&&base>=30?getMutBonus():1;val=Math.max(1,Math.min(cap,val+dir*bonus));}
  };
  applyMut();if(doubleMut)applyMut();
  const hvLvl=safeNum(state.upgrades?.hybridVigor);
  if(hvLvl>0){const hvC=[0,0.10,0.22,0.35,0.50][hvLvl]||0;const hvB=[0,1,2,3,3][hvLvl]||0;if(Math.random()<hvC)val=Math.min(cap,val+hvB);}
  return val;
}

function makeCreature(pA=null,pB=null){
  const traits={},cap=getTraitCap();
  if(pA){TRAIT_KEYS.forEach(t=>{traits[t]=inheritVal(pA.traits[t],pB.traits[t],t);});}
  else{TRAIT_KEYS.forEach(t=>{traits[t]=Math.min(cap,rand(1,8));});}
  return{id:Math.random().toString(36).slice(2,8).toUpperCase(),generation:state.generation,traits};
}

// ACTIONS
window.breedCycle=()=>{
  if(!guardReady())return;
  if(state.population.length<2)return addLog('Not enough creatures.','warn');
  if(state.population.length>=getMaxPop()){state.breedCapHits=safeNum(state.breedCapHits)+1;checkMilestones();return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');}
  const[pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
  state.autoOnlyBreeds=0;_doBreed(pA,pB);
};

window.breedSelected=()=>{
  if(!guardReady())return;
  if(!safeNum(state.upgrades?.selective))return addLog('Selective Breeding upgrade required.','warn');
  if(selectedForBreeding.length!==2)return addLog('Select exactly 2 creatures.','warn');
  if(state.population.length>=getMaxPop()){state.breedCapHits=safeNum(state.breedCapHits)+1;checkMilestones();return addLog('Pop cap reached.','warn');}
  const pA=state.population.find(c=>c.id===selectedForBreeding[0]);
  const pB=state.population.find(c=>c.id===selectedForBreeding[1]);
  if(!pA||!pB)return addLog('Creatures not found.','warn');
  const pairKey=[pA.id,pB.id].sort().join('|');
  if(state.lastParentPair===pairKey)state.sameParentCount=safeNum(state.sameParentCount)+1;
  else{state.sameParentCount=1;state.lastParentPair=pairKey;}
  state.autoOnlyBreeds=0;selectedForBreeding=[];_doBreed(pA,pB,true);
};

function _doBreed(pA,pB,targeted=false,silent=false){
  const child=makeCreature(pA,pB),fitness=calcFitness(child);
  state.population.push(child);state.generation++;state.totalBred++;
  const ge=getBreedGold();state.gold+=ge;state.totalGoldEarned+=ge;
  if(safeNum(state.surgeBreedsRemaining)>0)state.surgeBreedsRemaining--;
  if(!state.firstCullDone)state.bredBeforeFirstCull=safeNum(state.bredBeforeFirstCull)+1;
  TRAIT_KEYS.forEach(t=>{const v=safeNum(child.traits[t]);if(v>(bestEverTraits[t]||0))bestEverTraits[t]=v;});
  if(state.population.length>safeNum(state.maxPopEver))state.maxPopEver=state.population.length;
  const ry=researchBreedYield();if(ry>0){state.diamondBuffer=safeNum(state.diamondBuffer)+ry;flushDiamondBuffer();}
  tickArchivists();checkEverBroke();
  // 1-2 GP (+city bonus) every 100 generations
  if(state.generation%100===0){
    const cb=getCityBonuses();
    const base=rand(1,2);
    const gp=Math.floor((base+cb.perHundredGpBonus)*cb.allGpMult);
    state.genePoints+=gp;
    addLog(`🧪 Generation ${fmt(state.generation)} — +${gp} Gene Point${gp!==1?'s':''}`,'gp');
  }
  if(silent){
    autoBredTotal++;state.autoOnlyBreeds=safeNum(state.autoOnlyBreeds)+1;
    if(fitness>safeNum(state.highestFitness)){state.highestFitness=fitness;addLog(`Auto: Gen ${fmt(state.generation)} NEW RECORD fitness ${fmt(fitness)}!`,'highlight');}
    else if(autoBredTotal%25===0)addLog(`Auto-Breeder: ${fmt(autoBredTotal)} breeds, gen ${fmt(state.generation)}`);
  } else {
    const ts2=TRAIT_ABR.map((a,i)=>`${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
    if(fitness>safeNum(state.highestFitness)){state.highestFitness=fitness;addLog(`${targeted?'TARGETED ':''}Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}! [${ts2}]`,'highlight');}
    else addLog(`${targeted?'Targeted — ':''}Gen ${fmt(state.generation)}: ${child.id} born [${ts2}] → fitness ${fmt(fitness)}`);
  }
  checkMilestones();
  if(silent){
    // During auto-breed: only update stats + active tab if it's not upgrades/research
    // This prevents the DOM being torn down while the player is hovering over buttons
    renderStats();
    if(currentTab==='population')renderPopulation();
    if(currentTab==='milestones')renderMilestones();
    if(currentTab==='vault')renderGeneVault();
    if(currentTab==='combat')renderCombat();
    if(currentTab==='city')renderCity();
  } else {
    renderAll();
  }
}

window.cullWeakest=()=>{
  if(!guardReady())return;
  const minPop=2;
  if(state.population.length<=minPop)return addLog(`Pop too small (min ${minPop}).`,'warn');
  state.population.forEach(c=>{c._f=calcFitness(c);});
  state.population.sort((a,b)=>a._f-b._f);
  if(state.population.length===3)state.culledFromThree=true;
  const aboutToCull=state.population.slice(0,Math.min(getCullCount(),state.population.length-minPop));
  if(!state.culledOwnRecord&&state.highestFitness>0&&aboutToCull.some(c=>c._f>=state.highestFitness))state.culledOwnRecord=true;
  const actualCull=Math.min(getCullCount(),state.population.length-minPop);
  let totalEarned=0;const names=[];
  for(let i=0;i<actualCull;i++){
    const c=state.population.shift();
    const earned=Math.max(1,2+Math.floor(safeNum(c._f)/2)+getCullBonus());
    state.gold+=earned;state.totalGoldEarned+=earned;totalEarned+=earned;state.totalCulled++;names.push(`${c.id}(${c._f})`);
  }
  state.firstCullDone=true;
  const ry=researchCullYield()*actualCull;if(ry>0){state.diamondBuffer=safeNum(state.diamondBuffer)+ry;flushDiamondBuffer();}
  checkEverBroke();
  addLog(actualCull===1?`Culled ${names[0]} — earned ${fmt(totalEarned)} gold.`:`Culled ${actualCull}: [${names.join(', ')}] — earned ${fmt(totalEarned)} gold.`,'warn');
  checkMilestones();renderAll();
};

window.buyUpgrade=(id)=>{
  const def=GOLD_UPGRADES.find(u=>u.id===id);if(!def)return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length)return addLog(`${def.name} already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.gold<cost)return addLog(`Need ${fmt(cost)} gold — you have ${fmt(state.gold)}.`,'warn');
  state.gold-=cost;state.upgrades[id]=lvl+1;checkEverBroke();
  addLog(`Purchased ${def.name} Lv ${state.upgrades[id]}.`,'highlight');
  if(id==='autoBreeder')startAutoBreeder();
  checkMilestones();renderAll();
};

window.buyDiamondUpgrade=(id)=>{
  const def=DIAMOND_UPGRADES.find(u=>u.id===id);if(!def)return;
  const lvl=safeNum(state.upgrades?.[id]);
  if(lvl>=def.levels.length)return addLog(`${def.name} already maxed.`,'warn');
  const cost=def.levels[lvl].cost;
  if(state.diamonds<cost)return addLog(`Need ${cost} 💎.`,'warn');
  state.diamonds-=cost;state.upgrades[id]=lvl+1;state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+cost;
  addLog(`💎 Purchased ${def.name} Lv ${state.upgrades[id]}.`,'diamond');
  checkMilestones();renderAll();
};

window.hireResearcher=(id)=>{
  const def=RESEARCH_DEF.find(r=>r.id===id);if(!def)return;
  if(def.type==='unique'){
    if(state.research[id])return addLog('Already active.','warn');
    if(state.diamonds<def.cost)return addLog(`Need ${fmt(def.cost)} 💎.`,'warn');
    state.diamonds-=def.cost;state.research[id]=true;state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+def.cost;
    addLog(`💎 ${def.name} active.`,'diamond');
  } else {
    const cur=safeNum(state.research[id]);
    if(cur>=def.max)return addLog('Fully staffed.','warn');
    const cost=researchHireCost(cur);
    if(state.diamonds<cost)return addLog(`Need ${fmt(cost)} 💎.`,'warn');
    state.diamonds-=cost;state.research[id]=cur+1;state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+cost;
    addLog(`💎 Hired ${def.plural||def.name} ${cur+1}/${def.max}. Next: ${fmt(researchHireCost(cur+1))} 💎`,'diamond');
  }
  checkMilestones();renderAll();
};

window.buyCombatSlot=(slots)=>{
  const upg=COMBAT_SLOT_UPGRADES.find(x=>x.slots===slots);if(!upg)return;
  if(state.combatSlots>=slots)return addLog(`Already have ${slots} slots.`,'warn');
  if(state.genePoints<upg.cost)return addLog(`Need ${upg.cost} 🧪 — have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=upg.cost;state.combatSlots=slots;
  addLog(`🧪 ${upg.name} unlocked — ${slots} fighters in PvE!`,'gp');
  checkMilestones();renderAll();
};

// IMMORTALISE
window.openImmortalModal=(id)=>{
  const c=state.population.find(x=>x.id===id);if(!c)return;
  if(!canImmortalise(c))return addLog(`${c.id} needs fitness ${IMMORTAL_THRESHOLD} to immortalise (has ${calcFitness(c)}).`,'warn');
  if(state.population.length<=3)return addLog(`You need at least 4 creatures alive to immortalise one — otherwise you'd be left with only ${state.population.length-1}. Keep breeding first.`,'warn');
  pendingImmortalId=id;
  document.getElementById('immortal-name-input').value='';
  document.getElementById('immortal-name-message').textContent='';
  document.getElementById('name-immortal-modal').classList.remove('hidden');
};
window.cancelImmortalName=()=>{pendingImmortalId=null;document.getElementById('name-immortal-modal').classList.add('hidden');};
window.confirmImmortalName=()=>{
  const name=(document.getElementById('immortal-name-input').value||'').trim();
  const msgEl=document.getElementById('immortal-name-message');
  if(!name){msgEl.textContent='Enter a name.';return;}
  if(name.length>24){msgEl.textContent='Max 24 characters.';return;}
  const c=state.population.find(x=>x.id===pendingImmortalId);if(!c)return;
  state.population=state.population.filter(x=>x.id!==pendingImmortalId);
  state.immortals=[...(state.immortals||[]),{id:pendingImmortalId,name,creature:c,skills:[],fitness:calcFitness(c)}];
  // Secret: named an immortal "Darwin"
  if(name.toLowerCase()==='darwin') state.namedImmortalDarwin=true;
  pendingImmortalId=null;
  document.getElementById('name-immortal-modal').classList.add('hidden');
  document.getElementById('tab-combat')?.classList.add('has-badge');
  addLog(`🔱 ${name} immortalised! (Fitness ${calcFitness(c)}) Ready for combat.`,'highlight');
  checkMilestones();renderAll();
};

window.disposeImmortal=(id)=>{
  const im=(state.immortals||[]).find(x=>x.id===id);if(!im)return;
  const refund=disposalGpRefund(im);
  if(!confirm(`Dispose of ${im.name}? You will receive ${refund} 🧪 back (50% of skill costs). This cannot be undone.`))return;
  state.immortals=state.immortals.filter(x=>x.id!==id);
  state.genePoints+=refund;
  state.hasDisposedImmortal=true;
  addLog(`${im.name} disposed. Recovered ${refund} 🧪.`,'gp');
  checkMilestones();renderAll();
};

window.buyImmortalSkill=(immortalId,skillId)=>{
  const im=(state.immortals||[]).find(x=>x.id===immortalId);if(!im)return;
  const skill=IM_SKILL_MAP[skillId];if(!skill)return;
  if((im.skills||[]).includes(skillId))return addLog('Already unlocked.','warn');
  if(skill.blocked_by.some(bid=>(im.skills||[]).includes(bid)))return addLog('This skill is blocked by another you already have.','warn');
  if(skill.requires&&!(im.skills||[]).includes(skill.requires))return addLog('Requires previous tier first.','warn');
  if(state.genePoints<skill.cost)return addLog(`Need ${skill.cost} 🧪 — have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=skill.cost;
  im.skills=[...(im.skills||[]),skillId];
  addLog(`🧪 ${im.name}: ${skill.name} (${skill.effect})`,'gp');
  checkMilestones();renderAll();
};

// PvE
const PRESTIGE_GP_COST=200;
const PRESTIGE_DIAMOND_COST=200000;

window.prestigeImmortal=(immortalId)=>{
  const im=(state.immortals||[]).find(x=>x.id===immortalId);if(!im)return;
  if(im.prestiged)return addLog(`${im.name} is already prestiged.`,'warn');
  const act1Done=(state.pveCompleted||[]).length>=PVE_STAGES.length;
  if(!act1Done)return addLog('Complete the entire Act 1 campaign first.','warn');
  if(state.genePoints<PRESTIGE_GP_COST)return addLog(`Need ${PRESTIGE_GP_COST} 🧪 to prestige — you have ${fmt(state.genePoints)}.`,'warn');
  if(state.diamonds<PRESTIGE_DIAMOND_COST)return addLog(`Need ${fmt(PRESTIGE_DIAMOND_COST)} 💎 to prestige — you have ${fmt(state.diamonds)}.`,'warn');
  if(!confirm(`Prestige ${im.name}? This costs ${PRESTIGE_GP_COST} 🧪 and ${fmt(PRESTIGE_DIAMOND_COST)} 💎 and unlocks their Prestige Skill Tree.`))return;
  state.genePoints-=PRESTIGE_GP_COST;
  state.diamonds-=PRESTIGE_DIAMOND_COST;
  state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+PRESTIGE_DIAMOND_COST;
  im.prestiged=true;
  im.prestigeSkills=[];
  addLog(`🌟 ${im.name} has been PRESTIGED! Prestige Skill Tree unlocked.`,'highlight');
  checkMilestones();renderAll();
};

window.buyPrestigeSkill=(immortalId,skillId)=>{
  const im=(state.immortals||[]).find(x=>x.id===immortalId);if(!im||!im.prestiged)return;
  const skill=PRESTIGE_SKILL_MAP[skillId];if(!skill)return;
  if((im.prestigeSkills||[]).includes(skillId))return addLog('Already unlocked.','warn');
  const branch=PRESTIGE_BRANCHES.find(b=>b.id===skill.branch);
  const tierIdx=branch.skills.findIndex(s=>s.id===skillId);
  if(tierIdx>0&&!(im.prestigeSkills||[]).includes(branch.skills[tierIdx-1].id))
    return addLog('Requires previous prestige tier first.','warn');
  if(state.genePoints<skill.cost)return addLog(`Need ${skill.cost} 🧪 — have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=skill.cost;
  im.prestigeSkills=[...(im.prestigeSkills||[]),skillId];
  addLog(`🌟 ${im.name}: ${skill.name} (${skill.effect})`,'gp');
  checkMilestones();renderAll();
};
window.runPveStage=(stageId,immortalIds)=>{
  const stage=PVE_STAGES.find(s=>s.id===stageId);if(!stage)return;
  if((state.pveCompleted||[]).includes(stageId))return addLog('Already cleared.','warn');
  const idx=PVE_STAGES.findIndex(s=>s.id===stageId);
  if(idx>0&&!(state.pveCompleted||[]).includes(PVE_STAGES[idx-1].id))return addLog('Complete previous stage first.','warn');
  const ids=Array.isArray(immortalIds)?immortalIds:[immortalIds];
  const seen=new Set(); const uniqueIds=[];
  for(const id of ids){ if(id&&!seen.has(id)){seen.add(id);uniqueIds.push(id);} }
  if(ids.filter(Boolean).length!==uniqueIds.length)return addLog('You cannot use the same immortal in multiple slots.','warn');
  const ims=uniqueIds.filter(Boolean).map(id=>(state.immortals||[]).find(x=>x.id===id)).filter(Boolean);
  if(!ims.length)return addLog('No valid immortals selected.','warn');
  const atkDefs=ims.map(im=>({...getImmortalStats(im),name:im.name}));
  const defDefs=Array.from({length:stage.enemies},(_,i)=>makePveEnemy(stage.eLevel,i));
  const result=simulateFight(atkDefs,defDefs);
  state.combatLog=[{type:'pve',stageName:stage.name,won:result.won,log:result.log,time:ts()},...(state.combatLog||[]).slice(0,19)];
  if(result.won){
    state.pveCompleted=[...(state.pveCompleted||[]),stageId];
    state.genePoints+=stage.gpR;
    if(stage.iconR&&!(state.ownedIcons||[]).includes(stage.iconR))
      state.ownedIcons=[...(state.ownedIcons||[]),stage.iconR];
    addLog(`🏆 "${stage.name}" cleared! +${stage.gpR}🧪`+(stage.iconR?` + icon ${stage.iconR}`:''),'gp');
  } else {
    addLog(`💀 "${stage.name}" failed. Train your immortals harder.`,'warn');
  }
  checkMilestones();renderAll();
};

window.runAct2Stage=(stageId,immortalIds)=>{
  const stage=PVE_ACT2_STAGES.find(s=>s.id===stageId);if(!stage)return;
  // Act 2 requires all Act 1 cleared
  if((state.pveCompleted||[]).length<PVE_STAGES.length)return addLog('Complete all of Act 1 first.','warn');
  if((state.pveAct2Completed||[]).includes(stageId))return addLog('Already cleared.','warn');
  const idx=PVE_ACT2_STAGES.findIndex(s=>s.id===stageId);
  if(idx>0&&!(state.pveAct2Completed||[]).includes(PVE_ACT2_STAGES[idx-1].id))return addLog('Complete previous stage first.','warn');
  const ids=Array.isArray(immortalIds)?immortalIds:[immortalIds];
  const seen=new Set(); const uniqueIds=[];
  for(const id of ids){ if(id&&!seen.has(id)){seen.add(id);uniqueIds.push(id);} }
  if(ids.filter(Boolean).length!==uniqueIds.length)return addLog('You cannot use the same immortal in multiple slots.','warn');
  const ims=uniqueIds.filter(Boolean).map(id=>(state.immortals||[]).find(x=>x.id===id)).filter(Boolean);
  if(!ims.length)return addLog('No valid immortals selected.','warn');
  const atkDefs=ims.map(im=>({...getImmortalStats(im),name:im.name}));
  const defDefs=Array.from({length:stage.enemies},(_,i)=>makePveAct2Enemy(stage.eLevel,i));
  const result=simulateFight(atkDefs,defDefs);
  state.combatLog=[{type:'pve2',stageName:stage.name,won:result.won,log:result.log,time:ts()},...(state.combatLog||[]).slice(0,19)];
  if(result.won){
    state.pveAct2Completed=[...(state.pveAct2Completed||[]),stageId];
    state.genePoints+=stage.gpR;
    if(stage.iconR&&!(state.ownedIcons||[]).includes(stage.iconR))
      state.ownedIcons=[...(state.ownedIcons||[]),stage.iconR];
    addLog(`🌟 ACT 2: "${stage.name}" cleared! +${stage.gpR}🧪`+(stage.iconR?` + icon ${stage.iconR}`:''),'gp');
  } else {
    addLog(`💀 ACT 2: "${stage.name}" failed. Prestige your immortals.`,'warn');
  }
  checkMilestones();renderAll();
};

window.runAct3Stage=(stageId,immortalIds)=>{
  const stage=PVE_ACT3_STAGES.find(s=>s.id===stageId);if(!stage)return;
  if((state.pveAct2Completed||[]).length<PVE_ACT2_STAGES.length)return addLog('Complete all of Act 2 first.','warn');
  if((state.pveAct3Completed||[]).includes(stageId))return addLog('Already cleared.','warn');
  const idx=PVE_ACT3_STAGES.findIndex(s=>s.id===stageId);
  if(idx>0&&!(state.pveAct3Completed||[]).includes(PVE_ACT3_STAGES[idx-1].id))return addLog('Complete previous stage first.','warn');
  const ids=Array.isArray(immortalIds)?immortalIds:[immortalIds];
  const seen=new Set();const uniqueIds=[];
  for(const id of ids){if(id&&!seen.has(id)){seen.add(id);uniqueIds.push(id);}}
  if(ids.filter(Boolean).length!==uniqueIds.length)return addLog('You cannot use the same immortal in multiple slots.','warn');
  const ims=uniqueIds.filter(Boolean).map(id=>(state.immortals||[]).find(x=>x.id===id)).filter(Boolean);
  if(!ims.length)return addLog('No valid immortals selected.','warn');
  const atkDefs=ims.map(im=>({...getImmortalStats(im),name:im.name}));
  const defDefs=Array.from({length:stage.enemies},(_,i)=>makePveAct3Enemy(stage.eLevel,i));
  const result=simulateFight(atkDefs,defDefs);
  state.combatLog=[{type:'pve3',stageName:stage.name,won:result.won,log:result.log,time:ts()},...(state.combatLog||[]).slice(0,19)];
  if(result.won){
    state.pveAct3Completed=[...(state.pveAct3Completed||[]),stageId];
    state.genePoints+=stage.gpR;
    if(stage.iconR&&!(state.ownedIcons||[]).includes(stage.iconR))
      state.ownedIcons=[...(state.ownedIcons||[]),stage.iconR];
    addLog(`⚡ ACT 3: "${stage.name}" cleared! +${stage.gpR}🧪`+(stage.iconR?` + icon ${stage.iconR}`:''),'gp');
  } else {
    addLog(`💀 ACT 3: "${stage.name}" failed. Invest in RI Warfare skills and prestige fully.`,'warn');
  }
  checkMilestones();renderAll();
};

// VAULT
window.toggleVaultPreview=(id)=>{vaultPreviewId=vaultPreviewId===id?null:id;renderGeneVault();};
window.openVault=(id)=>{
  const vault=GENE_VAULTS.find(v=>v.id===id);if(!vault)return;
  const owned=state.ownedIcons||[];
  const alreadyOwned=vault.icons.filter(ic=>owned.includes(ic)).length;
  if(alreadyOwned>=vault.icons.length)return addLog(`${vault.name} fully collected — all ${vault.icons.length} icons owned.`,'warn');
  if(state.diamonds<vault.cost)return addLog(`Need ${fmt(vault.cost)} 💎.`,'warn');
  const icon=vault.icons[Math.floor(Math.random()*vault.icons.length)];
  const isDupe=owned.includes(icon);
  state.diamonds-=vault.cost;state.totalVaultOpens=safeNum(state.totalVaultOpens)+1;
  state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+vault.cost;
  state[`vault_${vault.id}_opens`]=safeNum(state[`vault_${vault.id}_opens`])+1;
  if(!isDupe){state.ownedIcons=[...owned,icon];addLog(`💎 [${vault.name}]: discovered ${icon}!`,'diamond');}
  else{const r=Math.floor(vault.cost*0.1);state.diamonds+=r;state.totalDiamondsEarned+=r;addLog(`💎 [${vault.name}]: duplicate ${icon} — refunded ${fmt(r)} 💎`,'diamond');}
  checkMilestones();renderAll();if(currentTab==='vault')renderGeneVault();
};
window.selectIcon=(icon)=>{state.selectedIcon=state.selectedIcon===icon?null:icon;renderGeneVault();renderStats();};
window.toggleSelect=(id)=>{
  const idx=selectedForBreeding.indexOf(id);
  if(idx>=0)selectedForBreeding.splice(idx,1);
  else{if(selectedForBreeding.length>=2)selectedForBreeding.shift();selectedForBreeding.push(id);}
  renderPopulation();
};

// PvP
window._pvpTargets={};
window._pvpFight=(key)=>{
  const t=window._pvpTargets[key];
  if(!t){addLog('Target not found — refresh the leaderboard.','warn');return;}
  window.openPvpModal(t.uid,t.username);
};
// ═══════════════════════════════════════════════════════════
//  CITY ACTIONS
// ═══════════════════════════════════════════════════════════

// Tick gold from Breeding Hall (called on load + on save)
function tickCityGold(){
  if(!isCityUnlocked())return;
  const now=Date.now();
  const last=state.city.lastGoldTick?new Date(state.city.lastGoldTick).getTime():now;
  const hoursElapsed=Math.min((now-last)/3600000, 24);
  if(hoursElapsed<0.01){state.city.lastGoldTick=new Date(now).toISOString();return;}
  // Breeding Hall → gold
  const bhRate=getBreedingHallRate();
  if(bhRate>0){
    const earned=Math.floor(bhRate*hoursElapsed);
    if(earned>0){state.gold+=earned;state.totalGoldEarned+=earned;addLog(`🏗️ Breeding Hall: +${fmt(earned)} gold (${fmt1(hoursElapsed)}h).`,'highlight');}
  }
  // Culling Hall → diamonds
  if(cityGridValues().includes('culling')){
    const chRate=getCullingHallRate();
    if(chRate>0){
      const earned=Math.floor(chRate*hoursElapsed);
      if(earned>0){state.diamonds+=earned;state.totalDiamondsEarned+=earned;addLog(`⚗️ Culling Hall: +${fmt(earned)} 💎 (${fmt1(hoursElapsed)}h).`,'diamond');}
    }
  }
  // Gene Spires → gene points
  if(cityGridValues().includes('genespire')){
    const spireRate=getTotalSpireGpH();
    if(spireRate>0){
      const earned=Math.floor(spireRate*hoursElapsed);
      if(earned>0){state.genePoints+=earned;addLog(`🧬 Gene Spires: +${fmt(earned)} 🧪 (${fmt1(hoursElapsed)}h).`,'gp');}
    }
  }
  state.city.lastGoldTick=new Date(now).toISOString();
}
window.tickCityGold=tickCityGold;

// Remove a building from a slot
window.cityRemoveCell=(key)=>{
  if(key==='0,0')return addLog('The Research Institute cannot be removed.','warn');
  const g=state.city.grid;if(!g[key])return;
  const old=g[key];delete g[key];
  if(old==='genespire'&&state.city.spireTiers)delete state.city.spireTiers[key];
  window._openTileKey=null;
  addLog(`🏙️ Removed ${CITY_BUILDINGS[old]?.name||old}.`,'highlight');
  renderStats();renderCity();
};
window.upgradeGenespireCell=(key)=>{
  if(state.city.grid[key]!=='genespire')return;
  const tiers=CITY_BUILDINGS.genespire.tiers,curTier=getSpireTier(key);
  if(curTier>=tiers.length)return addLog('Gene Spire already at max tier.','warn');
  const next=tiers.find(t=>t.tier===curTier+1);if(!next)return;
  if(next.costGold>0&&state.gold<next.costGold)return addLog(`Need ${fmt(next.costGold)} gold.`,'warn');
  if(next.costDia>0&&state.diamonds<next.costDia)return addLog(`Need ${fmt(next.costDia)} 💎.`,'warn');
  if(next.costGold>0)state.gold-=next.costGold;
  if(next.costDia>0){state.diamonds-=next.costDia;state.totalDiamondsSpent=safeNum(state.totalDiamondsSpent)+next.costDia;}
  if(!state.city.spireTiers)state.city.spireTiers={};
  state.city.spireTiers[key]=curTier+1;
  addLog(`🧬 Spire → Tier ${curTier+1} (${next.gpH} 🧪/hr).`,'gp');
  renderStats();renderCity();
};
window.citySetCell=(key,buildingId)=>{
  if(!isCityUnlocked())return;
  if(!CITY_BUILDINGS[buildingId])return addLog('Unknown building.','warn');
  if(['breeding','culling','genespire'].includes(buildingId)){
    const count=cityGridValues().filter(s=>s===buildingId).length;
    if(count>=10)return addLog(`Maximum 10 ${CITY_BUILDINGS[buildingId].name}s.`,'warn');
  }
  if(!state.city.grid)state.city.grid={};
  state.city.grid[key]=buildingId;
  addLog(`🏙️ ${CITY_BUILDINGS[buildingId].name} placed.`,'highlight');
  renderStats();renderCity();
};
// Research Institute: build (riLevel 0 → 1)
window.cityBuildRI=()=>{
  if(!isCityUnlocked())return;
  if(state.city.riLevel>=1)return addLog('Research Institute already built.','warn');
  state.city.riLevel=1;
  if(!state.city.grid)state.city.grid={};
  state.city.grid['0,0']='research';
  addLog('🏛️ Research Institute built!','highlight');
  checkMilestones();renderCity();
};

// RI Level 2: sacrifice a completely maxed immortal
window.cityUpgradeRI2=(immortalId)=>{
  if(state.city.riLevel>=2)return addLog('Already at Level 2.','warn');
  if(state.city.riLevel<1)return addLog('Build the Research Institute first.','warn');
  const im=(state.immortals||[]).find(x=>x.id===immortalId);
  if(!im)return addLog('Immortal not found.','warn');
  // Check fully maxed: all 5 base tiers per branch + all 5 prestige tiers per branch
  const allBase=IM_SKILLS.map(s=>s.id);
  const allPrestige=PRESTIGE_BRANCHES.flatMap(b=>b.skills.map(s=>s.id));
  const hasAllBase=allBase.every(id=>(im.skills||[]).includes(id)||(IM_SKILL_MAP[id]?.blocked_by||[]).some(bid=>(im.skills||[]).includes(bid)));
  const hasAllPrestige=im.prestiged&&allPrestige.every(id=>(im.prestigeSkills||[]).includes(id));
  // "All tiers of all prestiges" — check all non-blocked base skills + all prestige skills
  const baseOwned=IM_BRANCHES.every(branch=>{
    const max=branch.skills[branch.skills.length-1].id;
    const mid=branch.skills[Math.floor(branch.skills.length/2)-1]?.id;
    return (im.skills||[]).includes(max)||(im.skills||[]).includes(mid);
  });
  if(!im.prestiged)return addLog(`${im.name} must be prestiged first.`,'warn');
  if(!allPrestige.every(id=>(im.prestigeSkills||[]).includes(id)))return addLog(`${im.name} must have ALL prestige skills unlocked.`,'warn');
  if(!confirm(`Sacrifice ${im.name} to upgrade the Research Institute to Level 2? This is permanent.`))return;
  state.city.sacrificedImmortalId=im.id;
  state.immortals=state.immortals.filter(x=>x.id!==immortalId);
  state.city.riLevel=2;
  addLog(`🏛️ ${im.name} sacrificed. Research Institute reached Level 2!`,'highlight');
  checkMilestones();renderCity();
};

// RI Level 3: all milestones complete
window.cityUpgradeRI3=()=>{
  if(state.city.riLevel>=3)return addLog('Already at Level 3.','warn');
  if(state.city.riLevel<2)return addLog('Upgrade to Level 2 first.','warn');
  const ms=getMilestoneCounts();
  if(ms.done<ms.total)return addLog(`Complete all ${ms.total} milestones first (${ms.done}/${ms.total}).`,'warn');
  state.city.riLevel=3;
  addLog('🏛️ All milestones completed. Research Institute reached Level 3 — ABSOLUTE DOMINION!','highlight');
  checkMilestones();renderCity();
};

// Buy RI skill
window.buyRISkill=(skillId)=>{
  if(!isCityUnlocked())return;
  const skill=RI_SKILL_MAP[skillId];if(!skill)return;
  if((state.city.riSkills||[]).includes(skillId))return addLog('Already unlocked.','warn');
  if(skill.riLevel>state.city.riLevel)return addLog(`Requires Research Institute Level ${skill.riLevel}.`,'warn');
  const branch=RI_BRANCHES.find(b=>b.id===skill.branch);
  const tierIdx=branch.skills.findIndex(s=>s.id===skillId);
  if(tierIdx>0&&!(state.city.riSkills||[]).includes(branch.skills[tierIdx-1].id))
    return addLog('Unlock previous tier first.','warn');
  if(state.genePoints<skill.cost)return addLog(`Need ${skill.cost} 🧪 — have ${fmt(state.genePoints)}.`,'warn');
  state.genePoints-=skill.cost;
  state.city.riSkills=[...(state.city.riSkills||[]),skillId];
  addLog(`🏛️ RI: ${skill.name} — ${skill.effect}`,'gp');
  checkMilestones();renderCity();
};

// Set city name
window.saveCityName=()=>{
  const val=(document.getElementById('city-name-input')?.value||'').trim();
  if(!val)return;
  if(val.length>20)return addLog('City name max 20 chars.','warn');
  state.city.name=val;
  addLog(`🏙️ City renamed to "${val}".`,'highlight');
  renderStats();renderCity();
};

// Set city banner colour
window.saveCityBanner=()=>{
  const val=document.getElementById('city-banner-input')?.value||'#39ff14';
  state.city.bannerColor=val;
  addLog('🏙️ Banner colour updated.','highlight');
  renderStats();renderCity();
};

// Set city motto
window.saveCityMotto=()=>{
  const val=(document.getElementById('city-motto-input')?.value||'').trim();
  if(val.length>60)return addLog('Motto max 60 chars.','warn');
  state.city.motto=val;
  addLog('🏙️ Motto updated.','highlight');
  renderStats();renderCity();
};

// Toggle monument icon
window.toggleMonumentIcon=(icon)=>{
  const cb=getCityBonuses();
  const maxSlots=3+cb.monumentIconBonus;
  const cur=state.city.monumentIcons||[];
  if(cur.includes(icon)){state.city.monumentIcons=cur.filter(x=>x!==icon);}
  else if(cur.length<maxSlots){state.city.monumentIcons=[...cur,icon];}
  else return addLog(`Monument has ${maxSlots} slots. Remove one first.`,'warn');
  renderStats();renderCity();
};

window.openPvpModal=(targetUid,targetName)=>{
  try{
  if(!(state.immortals||[]).length)return addLog('Need at least one immortal to challenge.','warn');
  pvpTarget={uid:targetUid,username:targetName};pvpMyImmortal=null;
  document.getElementById('pvp-challenge-target').textContent=`Challenge ${targetName}?`;
  document.getElementById('pvp-challenge-message').textContent='';
  const sel=document.getElementById('pvp-immortal-selector');sel.innerHTML='';
  (state.immortals||[]).forEach(im=>{
    const stats=getImmortalStats(im);
    const div=document.createElement('div');div.className='immortal-option';
    div.innerHTML=`<span class="immortal-option-name">${im.name}</span><span class="immortal-option-stats">ATK${stats.atk} SPD${stats.spd} DEF${stats.def} HP${stats.hp}</span>`;
    div.onclick=()=>{document.querySelectorAll('#pvp-immortal-selector .immortal-option').forEach(x=>x.classList.remove('selected'));div.classList.add('selected');pvpMyImmortal=im.id;};
    sel.appendChild(div);
  });
  if(state.immortals.length===1){pvpMyImmortal=state.immortals[0].id;sel.firstChild?.classList.add('selected');}
  document.getElementById('pvp-wager-type').value='none';
  document.getElementById('pvp-wager-amount').value='';
  document.getElementById('pvp-wager-balance').textContent=`Your gold: ${fmt(state.gold)} | Your 💎: ${fmt(state.diamonds)}`;
  document.getElementById('pvp-challenge-modal').classList.remove('hidden');
  }catch(e){console.error('openPvpModal internal error:',e);addLog('PvP modal error — check console.','warn');}
};
window.cancelPvpChallenge=()=>{pvpTarget=null;pvpMyImmortal=null;document.getElementById('pvp-challenge-modal').classList.add('hidden');};
window.confirmPvpChallenge=async()=>{
  if(!pvpTarget||!pvpMyImmortal){document.getElementById('pvp-challenge-message').textContent='Select a fighter first.';return;}
  const im=(state.immortals||[]).find(x=>x.id===pvpMyImmortal);if(!im)return;
  const wType=document.getElementById('pvp-wager-type').value;
  const wAmt=safeNum(document.getElementById('pvp-wager-amount').value);
  if(wType==='gold'&&wAmt>0&&state.gold<wAmt){document.getElementById('pvp-challenge-message').textContent='Insufficient gold for wager.';return;}
  if(wType==='diamonds'&&wAmt>0&&state.diamonds<wAmt){document.getElementById('pvp-challenge-message').textContent='Insufficient diamonds for wager.';return;}
  document.getElementById('pvp-challenge-message').textContent='Sending…';
  try{
    await window.sendPvpChallenge(pvpTarget,im,getImmortalStats(im),wType,wAmt);
    document.getElementById('pvp-challenge-modal').classList.add('hidden');
    addLog(`⚔ Challenge sent to ${pvpTarget.username}!`+(wType!=='none'&&wAmt>0?` Wager: ${fmt(wAmt)} ${wType}.`:''),'combat');
    pvpTarget=null;pvpMyImmortal=null;
  }catch(e){document.getElementById('pvp-challenge-message').textContent=e.message||'Error, try again.';}
};
window.openPvpAcceptModal=(challengeId,challengerName,challengerImmortalName,wagerType,wagerAmount)=>{
  if(!(state.immortals||[]).length){addLog('Need an immortal to fight.','warn');return;}
  if(wagerType==='gold'&&wagerAmount>0&&state.gold<wagerAmount){addLog(`Can't afford wager (${fmt(wagerAmount)} gold).`,'warn');return;}
  if(wagerType==='diamonds'&&wagerAmount>0&&state.diamonds<wagerAmount){addLog(`Can't afford wager (${fmt(wagerAmount)} 💎).`,'warn');return;}
  const wText=wagerType!=='none'&&wagerAmount>0?` Wager: ${fmt(wagerAmount)} ${wagerType}.`:'';
  document.getElementById('pvp-accept-target').textContent=`${challengerName} challenges you with ${challengerImmortalName}.${wText} Choose your fighter:`;
  document.getElementById('pvp-accept-message').textContent='';
  const sel=document.getElementById('pvp-accept-selector');sel.innerHTML='';
  (state.immortals||[]).forEach(im=>{
    const stats=getImmortalStats(im);
    const div=document.createElement('div');div.className='immortal-option';
    div.innerHTML=`<span class="immortal-option-name">${im.name}</span><span class="immortal-option-stats">ATK${stats.atk} SPD${stats.spd} DEF${stats.def} HP${stats.hp}</span>`;
    div.onclick=()=>{document.querySelectorAll('#pvp-accept-selector .immortal-option').forEach(x=>x.classList.remove('selected'));div.classList.add('selected');div.dataset.selected='1';};
    sel.appendChild(div);
  });
  const modal=document.getElementById('pvp-accept-modal');
  modal.dataset.challengeId=challengeId;modal.dataset.wagerType=wagerType||'none';modal.dataset.wagerAmount=wagerAmount||0;
  modal.classList.remove('hidden');
};
window.declinePvpChallenge=()=>{
  const cid=document.getElementById('pvp-accept-modal').dataset.challengeId;
  window.resolvePvpChallenge?.(cid,'declined',null,null,null,null,0);
  document.getElementById('pvp-accept-modal').classList.add('hidden');
};
window.confirmPvpAccept=()=>{
  const modal=document.getElementById('pvp-accept-modal');
  const cid=modal.dataset.challengeId,wagerType=modal.dataset.wagerType,wagerAmount=safeNum(modal.dataset.wagerAmount);
  const sel=document.querySelector('#pvp-accept-selector .immortal-option[data-selected="1"]');
  if(!sel){document.getElementById('pvp-accept-message').textContent='Select a fighter.';return;}
  const im=(state.immortals||[]).find(x=>x.id===sel.dataset.id);if(!im)return;
  modal.classList.add('hidden');
  window.resolvePvpChallenge?.(cid,'accepted',im.id,getImmortalStats(im),im.name,wagerType,wagerAmount);
};
window.handlePvpResult=(won,opponentName,myImmortalName,wagerType,wagerAmount)=>{
  if(won){
    state.pvpWins=safeNum(state.pvpWins)+1;
    if(wagerType==='gold'&&wagerAmount>0){state.gold+=wagerAmount;state.totalGoldEarned+=wagerAmount;}
    else if(wagerType==='diamonds'&&wagerAmount>0){state.diamonds+=wagerAmount;state.totalDiamondsEarned+=wagerAmount;}
    addLog(`⚔ Won PvP vs ${opponentName}!`+(wagerType!=='none'&&wagerAmount>0?` +${fmt(wagerAmount)} ${wagerType}`:''),'combat');
  } else {
    state.pvpLosses=safeNum(state.pvpLosses)+1;
    if(wagerType==='gold'&&wagerAmount>0)state.gold=Math.max(0,state.gold-wagerAmount);
    else if(wagerType==='diamonds'&&wagerAmount>0)state.diamonds=Math.max(0,state.diamonds-wagerAmount);
    addLog(`⚔ Lost PvP vs ${opponentName}.`+(wagerType!=='none'&&wagerAmount>0?` -${fmt(wagerAmount)} ${wagerType}`:''),'combat');
  }
  checkMilestones();renderAll();
};

function checkEverBroke(){if(!state.everBroke&&state.gold===0&&state.totalGoldEarned>=100)state.everBroke=true;}

// ═══════════════════════════════════════════════════════════
//  MILESTONES
// ═══════════════════════════════════════════════════════════
function checkMilestones(){
  const cb=getCityBonuses();
  MILESTONE_TRACKS.forEach(track=>{
    const val=track.val(state);
    track.tiers.forEach(tier=>{
      if(state.completedMilestones.includes(tier.id)||val<tier.target)return;
      state.completedMilestones.push(tier.id);state.milestoneDiamondsAwarded.push(tier.id);
      const gp=Math.floor((tier.gp||1)+cb.milestoneGpBonus)*cb.allGpMult*cb.allMsGpMult;
      const gpFinal=Math.max(0,Math.floor(gp));
      const dia=tier.dia||1;
      if(gpFinal>0)state.genePoints+=gpFinal;
      if(dia>0){state.diamonds+=dia;state.totalDiamondsEarned+=dia;}
      const reward=(dia>0?`+${dia}💎 `:'')+( gpFinal>0?`+${gpFinal}🧪`:'');
      addLog(`💎 [${track.name}]: "${tier.name}" ${reward}`,'diamond');
    });
  });
  SECRET_MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)||!m.check(state))return;
    state.completedMilestones.push(m.id);state.milestoneDiamondsAwarded.push(m.id);
    const gp=Math.floor(((m.gp||5)+cb.secretMsGpBonus)*cb.allGpMult);
    const dia=m.dia||3;
    state.genePoints+=gp;
    if(dia>0){state.diamonds+=dia;state.totalDiamondsEarned+=dia;}
    addLog(`💎 Secret: "${m.name}" +${dia}💎 +${gp}🧪`,'diamond');
  });
}

function getTrackProg(track){
  const val=track.val(state);
  const ci=track.tiers.reduce((hi,t,i)=>state.completedMilestones.includes(t.id)?i:hi,-1);
  const ni=ci+1<track.tiers.length?ci+1:null;
  return{val,ci,tot:track.tiers.length,cur:ci>=0?track.tiers[ci]:null,nxt:ni!==null?track.tiers[ni]:null,pct:ni!==null?Math.min(1,val/track.tiers[ni].target):(ci>=0?1:0)};
}

// ═══════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════
function renderAll(){
  renderStats();
  if(currentTab==='population')renderPopulation();
  if(currentTab==='upgrades')renderUpgrades();
  if(currentTab==='research')renderResearch();
  if(currentTab==='milestones')renderMilestones();
  if(currentTab==='vault')renderGeneVault();
  if(currentTab==='combat')renderCombat();
  if(currentTab==='city')renderCity();
  if(currentTab==='login')renderLogin();
}

function renderStats(){
  const ms=getMilestoneCounts();
  document.getElementById('stat-gen').textContent=fmt(safeNum(state.generation,1));
  document.getElementById('stat-pop').textContent=`${fmt(state.population.length)} / ${fmt(getMaxPop())}`;
  document.getElementById('stat-gold').textContent=fmt(state.gold);
  document.getElementById('stat-diamonds').textContent=`${fmt(state.diamonds)} 💎`;
  document.getElementById('stat-gp').textContent=`${fmt(state.genePoints)} 🧪`;
  document.getElementById('stat-milestones').textContent=`${fmt(ms.done)} / ${fmt(ms.total)}`;
  document.getElementById('stat-score').textContent=calcScore().toLocaleString();
  document.getElementById('stat-bred').textContent=fmt(state.totalBred);
  document.getElementById('stat-culled').textContent=fmt(state.totalCulled);
  updateAutoBtn();
  // Streak widget
  const streak=safeNum(state.loginStreak);
  const sw=document.getElementById('streak-widget');
  const sc=document.getElementById('streak-count');
  if(sw&&sc){
    sw.classList.toggle('hidden', streak===0);
    sc.textContent=streak;
  }
}

function renderUpgrades(){
  const c=document.getElementById('upgrades-container');if(!c)return;
  let html=`<p class="upgrades-section-title gold-title">// GOLD UPGRADES</p><div class="upgrade-grid">`;
  GOLD_UPGRADES.forEach(def=>{
    const lvl=safeNum(state.upgrades?.[def.id]),maxed=lvl>=def.levels.length;
    const pips=def.levels.map((_,i)=>`<div class="upgrade-pip ${i<lvl?'filled':i===lvl?'current':''}"></div>`).join('');
    if(maxed){
      html+=`<div class="upgrade-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed">[MAX]</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div>`;
      if(def.id==='autoBreeder')html+=`<div style="color:var(--gold);font-size:11px;margin-top:4px">⚙ ${getAutoRate()}/sec${autoBreederPaused?' — PAUSED':' — RUNNING'}</div>`;
      html+=`</div>`;
    } else {
      const next=def.levels[lvl],can=state.gold>=next.cost;
      html+=`<div class="upgrade-card"><div class="upgrade-card-name">${def.name}${lvl>0?` <span class="level-badge">[Lv${lvl}]</span>`:''}</div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div><div class="upgrade-card-next">▸ ${next.label}</div><button onclick="buyUpgrade('${def.id}')" ${can?'':'style="opacity:.4;cursor:not-allowed"'}>[ BUY — ${fmt(next.cost)}g ]</button></div>`;
    }
  });
  html+=`</div><p class="upgrades-section-title diamond-title">// DIAMOND UPGRADES</p><div class="upgrade-grid">`;
  DIAMOND_UPGRADES.forEach(def=>{
    const lvl=safeNum(state.upgrades?.[def.id]),maxed=lvl>=def.levels.length;
    const pips=def.levels.map((_,i)=>`<div class="upgrade-pip ${i<lvl?'filled d':i===lvl?'current':''}"></div>`).join('');
    if(maxed)html+=`<div class="upgrade-card diamond-card maxed-card"><div class="upgrade-card-name">${def.name} <span class="maxed d">💎 MAX</span></div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div></div>`;
    else{const next=def.levels[lvl],can=state.diamonds>=next.cost;html+=`<div class="upgrade-card diamond-card"><div class="upgrade-card-name">${def.name}${lvl>0?` <span class="level-badge">[Lv${lvl}]</span>`:''}</div><div class="upgrade-card-desc">${def.desc}</div><div class="upgrade-progress">${pips}</div><div class="upgrade-card-next diamond-next">▸ ${next.label}</div><button class="btn-diamond ${can?'':'cant-afford'}" onclick="buyDiamondUpgrade('${def.id}')">[ BUY — ${next.cost} 💎 ]</button></div>`;}
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderResearch(){
  const c=document.getElementById('research-container');if(!c)return;
  const bRate=researchBreedYield(),cRate=researchCullYield(),aRate=researchArchYield(),mult=researchMult();
  const buf=safeNum(state.diamondBuffer);
  let html=`<p class="research-intro">Your research division extracts genetic insights that crystallise into diamonds.</p>`;
  html+=`<div class="research-rates"><p class="research-rates-title">// CURRENT RATES</p>`;
  html+=`<div class="rate-row"><span>💎 per breed</span><span class="${bRate>0?'rate-val':'rate-zero'}">${fmtR(bRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per cull</span><span class="${cRate>0?'rate-val':'rate-zero'}">${fmtR(cRate)}</span></div>`;
  html+=`<div class="rate-row"><span>💎 per 25 gen</span><span class="${aRate>0?'rate-val':'rate-zero'}">${fmtR(aRate)}</span></div>`;
  if(mult>1)html+=`<div class="rate-row"><span>Multiplier</span><span class="rate-val">×${fmt1(mult)}</span></div>`;
  html+=`<div class="rate-row"><span>Total from research</span><span class="rate-val">${fmt(state.totalResearchDiamondsEarned)} 💎</span></div>`;
  if(buf>0)html+=`<p class="rate-buffer">Buffer: ${buf.toFixed(3)} 💎 accumulating…</p>`;
  html+=`</div><p class="research-section-title">// RESEARCHERS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='stack').forEach(def=>{
    const cur=safeNum(state.research?.[def.id]),maxed=cur>=def.max;
    const nextCost=researchHireCost(cur),can=!maxed&&state.diamonds>=nextCost;
    const totalY=cur*(def.perBreed||def.perCull||def.perArchTick||0)*mult;
    html+=`<div class="research-card ${maxed?'research-maxed':''}"><div class="research-card-name">${def.plural||def.name}</div><div class="research-card-count">${fmt(cur)} / ${fmt(def.max)} hired${cur>0?` — ${fmtR(totalY)} 💎/event`:''}</div><div class="research-card-desc">${def.desc}</div><div class="research-card-yield">⟶ ${def.yieldLine}</div>${maxed?`<div class="research-maxed-label">FULLY STAFFED</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${fmt(nextCost)} 💎 ]</button>`}</div>`;
  });
  html+=`</div><p class="research-section-title director-title">// RESEARCH DIRECTORS</p><div class="research-grid">`;
  RESEARCH_DEF.filter(r=>r.type==='unique').forEach(def=>{
    const hired=!!state.research?.[def.id],can=!hired&&state.diamonds>=def.cost;
    html+=`<div class="research-card ${hired?'research-active':''}"><div class="research-card-name">${def.name}</div><div class="research-card-desc">${def.desc}</div><div class="research-card-yield">⟶ ${def.yieldLine}</div>${hired?`<div class="research-active-label">✓ ACTIVE</div>`:`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="hireResearcher('${def.id}')">[ HIRE — ${fmt(def.cost)} 💎 ]</button>`}</div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderPopulation(){
  const container=document.getElementById('population-table');if(!container)return;

  // ── Immortals first ──────────────────────────────────────
  const imSec=document.getElementById('immortals-section');
  const immortals=state.immortals||[];
  if(imSec){
    if(!immortals.length){imSec.innerHTML='';}
    else{
      // Track which skill page each immortal is showing: 'base' or 'prestige'
      window._imTab=window._imTab||{};
      let imHtml=`<p class="immortals-title" style="margin-bottom:14px">🔱 IMMORTALS — ${fmt(state.genePoints)} 🧪 available</p><div class="immortal-cards">`;
      immortals.forEach(im=>{
        const stats=getImmortalStats(im);
        const refund=disposalGpRefund(im);
        // Default to prestige tab if prestiged and base is fully invested, else base
        if(window._imTab[im.id]===undefined) window._imTab[im.id]=im.prestiged?'prestige':'base';
        const activeTab=window._imTab[im.id];
        imHtml+=`<div class="immortal-card">
          <div class="im-header"><span class="im-name">${im.prestiged?'🌟':'🔱'} ${im.name}</span><span class="im-gp-info">Fitness ${im.fitness||'?'}</span></div>
          <div class="im-base-stats">
            <span class="im-stat">ATK <span>${stats.atk}</span></span>
            <span class="im-stat">SPD <span>${stats.spd}</span></span>
            <span class="im-stat">DEF <span>${stats.def}</span></span>
            <span class="im-stat">HP <span>${stats.hp}</span></span>
            ${stats.crit?`<span class="im-stat">CRIT <span>${Math.round(stats.crit*100)}%</span></span>`:''}
            ${stats.dodge?`<span class="im-stat">DODGE <span>${Math.round(stats.dodge*100)}%</span></span>`:''}
            ${stats.regen?`<span class="im-stat">REGEN <span>${stats.regen}/rnd</span></span>`:''}
          </div>`;

        // Tab bar
        imHtml+=`<div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:10px">
          <button onclick="window._imTab['${im.id}']='base';renderPopulation()" style="width:auto;border:none;border-bottom:2px solid ${activeTab==='base'?'var(--gp)':'transparent'};color:${activeTab==='base'?'var(--gp)':'var(--muted)'};font-size:10px;letter-spacing:1px;padding:6px 12px;margin:0;background:none">BASE SKILLS</button>
          <button onclick="window._imTab['${im.id}']='prestige';renderPopulation()" style="width:auto;border:none;border-bottom:2px solid ${activeTab==='prestige'?'var(--score)':'transparent'};color:${activeTab==='prestige'?'var(--score)':'var(--muted)'};font-size:10px;letter-spacing:1px;padding:6px 12px;margin:0;background:none">${im.prestiged?'PRESTIGE SKILLS':'🔒 PRESTIGE'}</button>
        </div>`;

        if(activeTab==='base'){
          imHtml+=`<div class="im-skill-tree">`;
          IM_BRANCHES.forEach(branch=>{
            imHtml+=`<div class="im-branch"><div class="im-branch-title" style="color:${branch.color}">${branch.name}</div>`;
            branch.skills.forEach((skill,idx)=>{
              const owned=(im.skills||[]).includes(skill.id);
              const blockedByOwned=skill.blocked_by.some(bid=>(im.skills||[]).includes(bid));
              const prevOwned=!skill.requires||(im.skills||[]).includes(skill.requires);
              const isLocked=!owned&&(!prevOwned||blockedByOwned);
              const isBlocked=!owned&&blockedByOwned;
              const canBuy=!owned&&prevOwned&&!blockedByOwned&&state.genePoints>=skill.cost;
              const nodeCls=owned?'sk-owned':isBlocked?'sk-blocked':isLocked?'sk-locked':'sk-available';
              if(idx>0) imHtml+=`<div class="im-connector ${owned?'conn-lit':''}" style="text-align:center;color:${owned?'var(--gp)':'var(--border)'};font-size:9px">↓</div>`;
              imHtml+=`<div class="im-skill-node ${nodeCls}" ${(!owned&&!isLocked&&!isBlocked)?`onclick="buyImmortalSkill('${im.id}','${skill.id}')" title="Click to unlock"`:''}>
                <div class="im-sn-name">${skill.name}</div>
                <div class="im-sn-effect">${skill.effect}</div>`;
              if(owned) imHtml+=`<div class="im-sn-cost owned">✓ ACTIVE</div>`;
              else if(isBlocked) imHtml+=`<div class="im-sn-cost blocked">🚫 BLOCKED</div>`;
              else if(isLocked) imHtml+=`<div class="im-sn-cost locked">🔒 LOCKED</div>`;
              else imHtml+=`<div class="im-sn-cost ${canBuy?'afford':'noafford'}">${skill.cost} 🧪${canBuy?'':' (need more)'}</div>`;
              imHtml+=`</div>`;
            });
            imHtml+=`</div>`;
          });
          imHtml+=`</div>`;
        } else {
          // Prestige tab
          if(!im.prestiged){
            const act1Done=(state.pveCompleted||[]).length>=PVE_STAGES.length;
            const canP=act1Done&&state.genePoints>=PRESTIGE_GP_COST&&state.diamonds>=PRESTIGE_DIAMOND_COST;
            imHtml+=`<div style="color:var(--muted);font-size:11px;line-height:1.7;margin-bottom:12px">
              Prestige unlocks a second, more powerful skill tree.<br>
              <span style="color:${act1Done?'var(--text)':'var(--red)'}">Act 1 complete: ${act1Done?'✓':'✗ (required)'}</span><br>
              <span style="color:var(--gp)">${PRESTIGE_GP_COST} 🧪</span> + <span style="color:var(--diamond)">${fmt(PRESTIGE_DIAMOND_COST)} 💎</span> required
            </div>
            <button onclick="prestigeImmortal('${im.id}')" style="border-color:var(--score);color:var(--score);font-size:11px;padding:6px 14px;width:auto;${canP?'':'opacity:.4;cursor:not-allowed'}">[ PRESTIGE ${im.name} ]</button>`;
          } else {
            imHtml+=`<div class="im-skill-tree">`;
            PRESTIGE_BRANCHES.forEach(branch=>{
              imHtml+=`<div class="im-branch"><div class="im-branch-title" style="color:${branch.color}">${branch.name}</div>`;
              branch.skills.forEach((skill,idx)=>{
                const owned=(im.prestigeSkills||[]).includes(skill.id);
                const prevOwned=idx===0||(im.prestigeSkills||[]).includes(branch.skills[idx-1].id);
                const isLocked=!owned&&!prevOwned;
                const canBuy=!owned&&prevOwned&&state.genePoints>=skill.cost;
                const nodeCls=owned?'sk-owned':isLocked?'sk-locked':'sk-available';
                if(idx>0) imHtml+=`<div class="im-connector ${owned?'conn-lit':''}" style="text-align:center;color:${owned?branch.color:'var(--border)'};font-size:9px">↓</div>`;
                imHtml+=`<div class="im-skill-node ${nodeCls}" style="${owned?`border-color:${branch.color};background:#0a0808`:''}" ${(!owned&&!isLocked)?`onclick="buyPrestigeSkill('${im.id}','${skill.id}')" title="Click to unlock"`:''}>
                  <div class="im-sn-name" style="${owned?`color:${branch.color}`:''}"> ${skill.name}</div>
                  <div class="im-sn-effect">${skill.effect}</div>`;
                if(owned) imHtml+=`<div class="im-sn-cost owned" style="color:${branch.color}">✓ ACTIVE</div>`;
                else if(isLocked) imHtml+=`<div class="im-sn-cost locked">🔒 LOCKED</div>`;
                else imHtml+=`<div class="im-sn-cost ${canBuy?'afford':'noafford'}">${skill.cost} 🧪${canBuy?'':' (need more)'}</div>`;
                imHtml+=`</div>`;
              });
              imHtml+=`</div>`;
            });
            imHtml+=`</div>`;
          }
        }

        imHtml+=`<button onclick="disposeImmortal('${im.id}')" style="margin-top:10px;border-color:var(--red);color:var(--red);font-size:10px;padding:4px 10px;width:auto">[ DISPOSE — recover ${refund}🧪 ]</button>
        </div>`;
      });
      imHtml+=`</div><div style="border-bottom:1px solid var(--border);margin:20px 0"></div>`;
      imSec.innerHTML=imHtml;
    }
  }

  // ── Population table ────────────────────────────────────
  const hasSel=safeNum(state.upgrades?.selective)>0;
  const sorted=[...state.population].map(c=>({...c,_f:calcFitness(c)})).sort((a,b)=>b._f-a._f);
  let html='';
  if(sorted.length){
    if(hasSel)html+=`<div class="pop-header"><span class="pop-hint">Click [ ☆ ] to select a pair.</span><button class="pop-breed-btn" onclick="breedSelected()">[ BREED SELECTED (${selectedForBreeding.length}/2) ]</button></div>`;
    const surge=safeNum(state.surgeBreedsRemaining);
    if(surge>0)html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--diamond)">💎 Evolution Surge: ${fmt(surge)} breeds remaining.</p>`;
    const autoRate=getAutoRate();
    if(autoRate>0)html+=`<p class="pop-hint" style="margin-bottom:10px;color:var(--gold)">⚙ Auto-Breeder: ${autoRate}/sec${autoBreederPaused?' (paused)':''}</p>`;
    html+=`<table><thead><tr>${hasSel?'<th></th>':''}<th>ID</th><th>GEN</th><th>FIT</th>${TRAIT_ABR.map(a=>`<th>${a}</th>`).join('')}<th></th></tr></thead><tbody>`;
    sorted.forEach((c,i)=>{
      const isTop=i===0,isBot=i===sorted.length-1&&sorted.length>2,isSel=selectedForBreeding.includes(c.id);
      const canImm=canImmortalise(c)&&state.population.length>3;
      html+=`<tr class="${isTop?'row-top':isBot?'row-bottom':isSel?'row-selected':''}">`;
      if(hasSel)html+=`<td><button class="sel-btn ${isSel?'sel-active':''}" onclick="toggleSelect('${c.id}')">${isSel?'★':'☆'}</button></td>`;
      html+=`<td class="bright">${c.id}</td><td>${fmt(safeNum(c.generation,'?'))}</td><td class="fit-val">${fmt(c._f)}</td>`;
      TRAIT_KEYS.forEach(t=>{const v=safeNum(c.traits[t]);html+=`<td class="${v>=80?'trait-hi':v>=40?'trait-mid':v<=5?'trait-lo':''}">${fmt(v)}</td>`;});
      html+=`<td>${canImm?`<button class="immortalise-btn" onclick="openImmortalModal('${c.id}')">⚜ IMMORTALISE</button>`:''}</td>`;
      html+=`</tr>`;
    });
    html+=`</tbody></table>`;
    if(!hasSel)html+=`<p class="pop-hint" style="margin-top:12px">Unlock <strong>Selective Breeding</strong> to hand-pick pairs.</p>`;
    if(!sorted.some(c=>calcFitness(c)>=IMMORTAL_THRESHOLD))html+=`<p class="pop-hint" style="margin-top:8px;color:var(--muted)">Reach fitness ${IMMORTAL_THRESHOLD} to unlock immortalisation.</p>`;
  } else {
    html='<p class="empty-state">No creatures yet.</p>';
  }
  container.innerHTML=html;

}

function renderCombat(){
  const c=document.getElementById('combat-container');if(!c)return;
  const immortals=state.immortals||[];
  if(!immortals.length){
    c.innerHTML=`<div class="combat-locked">🔱 The Combat tab unlocks once you immortalise your first creature.<br><br>Breed a creature to fitness ${IMMORTAL_THRESHOLD} and click ⚜ IMMORTALISE in the Population tab.</div>`;
    return;
  }
  let html=`<div class="combat-subtabs">
    <button class="combat-stab ${combatSubTab==='pve'?'active':''}" onclick="setCombatTab('pve')">ACT 1</button>
    <button class="combat-stab ${combatSubTab==='pve2'?'active':''}" onclick="setCombatTab('pve2')">ACT 2</button>
    <button class="combat-stab ${combatSubTab==='pve3'?'active':''}" onclick="setCombatTab('pve3')">ACT 3</button>
    <button class="combat-stab ${combatSubTab==='pvp'?'active':''}" onclick="setCombatTab('pvp')">PVP</button>
  </div>`;

  if(combatSubTab==='pve'){
    html+=`<p class="pve-intro">ACT 1 — 37 stages across 4 chapters. Bosses at stages 10, 20, 30, 37 award exclusive icons. Complete Act 1 to unlock Act 2 and Prestige.</p>`;
    html+=`<div class="slot-upgrades">`;
    COMBAT_SLOT_UPGRADES.forEach(upg=>{
      const owned=state.combatSlots>=upg.slots;
      const can=!owned&&state.genePoints>=upg.cost;
      html+=`<div class="slot-upgrade-card ${owned?'owned':''}">
        <div class="slot-upgrade-name">${upg.name}</div>
        <div class="slot-upgrade-desc">${upg.desc}</div>
        ${owned?`<div style="color:var(--gp);font-size:11px">✓ ACTIVE</div>`:`<button class="btn-gp ${can?'':'cant-afford'}" onclick="buyCombatSlot(${upg.slots})">[ UNLOCK — ${upg.cost} 🧪 ]</button>`}
      </div>`;
    });
    html+=`</div>`;
    const acts=[1,2,3,4];
    const actNames=['ACT 1 — THE AWAKENING','ACT 2 — THE ARENA','ACT 3 — THE PANTHEON','ACT 4 — THE FINAL WAR'];
    acts.forEach((act,ai)=>{
      const stages=PVE_STAGES.filter(s=>s.act===act);
      html+=`<p class="act-title">${actNames[ai]}</p><div class="pve-grid">`;
      stages.forEach((stage)=>{
        const globalIdx=PVE_STAGES.findIndex(s=>s.id===stage.id);
        const done=(state.pveCompleted||[]).includes(stage.id);
        const prevDone=globalIdx===0||(state.pveCompleted||[]).includes(PVE_STAGES[globalIdx-1].id);
        const locked=!prevDone&&!done;
        const iconOwned=stage.iconR&&(state.ownedIcons||[]).includes(stage.iconR);
        html+=`<div class="pve-card ${done?'cleared':locked?'locked':''} ${stage.boss?'boss-card':''}">
          <div class="pve-name">${stage.boss?'':'#'+(globalIdx+1)+' '}${stage.name}</div>
          <div class="pve-desc">${stage.desc}</div>
          <div class="pve-enemies">${stage.enemies} opponent${stage.enemies>1?'s':''} (level ${stage.eLevel})</div>
          <div class="pve-reward">+${stage.gpR} 🧪${stage.iconR?` <span class="icon-reward">${iconOwned?'✓':'+'}${stage.iconR}</span>`:''}</div>`;
        if(done){ html+=`<div class="pve-cleared-badge">✓ CLEARED</div>`; }
        else if(!locked){
          html+=`<div class="pve-selectors">`;
          for(let slot=0;slot<state.combatSlots;slot++){
            html+=`<select id="pve-sel-${stage.id}-${slot}"><option value="">— slot ${slot+1} (optional${slot===0?', required':''}) —</option>${immortals.map(im=>`<option value="${im.id}">${im.name}</option>`).join('')}</select>`;
          }
          html+=`</div>`;
          html+=`<button class="btn-combat" onclick="(()=>{const ids=[];for(let i=0;i<${state.combatSlots};i++){const el=document.getElementById('pve-sel-${stage.id}-'+i);if(el&&el.value)ids.push(el.value);}runPveStage('${stage.id}',ids);})()">[ FIGHT ]</button>`;
        } else { html+=`<div style="color:var(--muted);font-size:10px;margin-top:4px">Complete previous stage first</div>`; }
        html+=`</div>`;
      });
      html+=`</div>`;
    });
    if((state.combatLog||[]).length){
      const last=state.combatLog[0];
      html+=`<div class="combat-log-box"><p class="combat-log-title">// LAST FIGHT: ${last.stageName||''} — ${last.time||''}</p>`;
      last.log.forEach(line=>{
        const cls=line.startsWith('🏆')||line.startsWith('✓')||line.startsWith('🌟')?'win':line.startsWith('💀')||line.startsWith('✗')?'loss':line.startsWith('💥')?'crit':line.startsWith('──')?'section':'';
        html+=`<div class="clog-line ${cls}">${line}</div>`;
      });
      html+=`</div>`;
    }

  } else if(combatSubTab==='pve2'){
    const act1Done=(state.pveCompleted||[]).length>=PVE_STAGES.length;
    const hasPrestiged=immortals.some(im=>im.prestiged);
    if(!act1Done){
      html+=`<div class="combat-locked" style="border-color:var(--score)">
        🌟 ACT 2 — THE ASCENDANCY<br><br>
        Complete all 37 stages of Act 1 to unlock Act 2.<br>
        <span style="color:var(--muted);font-size:11px">Act 1 progress: ${(state.pveCompleted||[]).length} / ${PVE_STAGES.length}</span>
      </div>`;
    } else {
      html+=`<p class="pve-intro" style="border-color:var(--score)">ACT 2 — THE ASCENDANCY. 33 stages of escalating difficulty. Bosses at stages 10, 20, 30, 33 award exclusive icons. Prestige your immortals to have any chance here.</p>`;
      // Prestige section
      html+=`<div style="border:1px solid var(--score);background:#0a080f;padding:14px 16px;margin-bottom:20px">
        <p style="color:var(--score);font-size:10px;letter-spacing:3px;margin-bottom:12px">// PRESTIGE YOUR IMMORTALS</p>
        <p style="color:var(--muted);font-size:11px;margin-bottom:12px">Requires all 37 Act 1 stages cleared + <strong style="color:var(--gp)">${PRESTIGE_GP_COST} 🧪</strong> + <strong style="color:var(--diamond)">${fmt(PRESTIGE_DIAMOND_COST)} 💎</strong> per immortal. Unlocks a powerful second skill tree.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">`;
      immortals.forEach(im=>{
        if(im.prestiged){
          html+=`<div style="border:1px solid var(--score);padding:8px 12px;font-size:11px;color:var(--score)">🌟 ${im.name} — PRESTIGED</div>`;
        } else {
          const canPrestige=state.genePoints>=PRESTIGE_GP_COST&&state.diamonds>=PRESTIGE_DIAMOND_COST;
          html+=`<button class="${canPrestige?'':''}btn-secondary" style="${canPrestige?'border-color:var(--score);color:var(--score);':''}font-size:11px;width:auto;padding:6px 12px" onclick="prestigeImmortal('${im.id}')">[ PRESTIGE ${im.name} ]</button>`;
        }
      });
      html+=`</div></div>`;
      // Act 2 stages
      const a2acts=[{label:'THE ASCENDANCY (1-10)',min:0,max:9},{label:'THE RECKONING (11-20)',min:10,max:19},{label:'THE TRANSCENDENCE (21-30)',min:20,max:29},{label:'THE FINALE (31-33)',min:30,max:32}];
      a2acts.forEach(section=>{
        const stages=PVE_ACT2_STAGES.slice(section.min,section.max+1);
        html+=`<p class="act-title" style="color:var(--score)">${section.label}</p><div class="pve-grid">`;
        stages.forEach(stage=>{
          const globalIdx=PVE_ACT2_STAGES.findIndex(s=>s.id===stage.id);
          const done=(state.pveAct2Completed||[]).includes(stage.id);
          const prevDone=globalIdx===0||(state.pveAct2Completed||[]).includes(PVE_ACT2_STAGES[globalIdx-1].id);
          const locked=!prevDone&&!done;
          const iconOwned=stage.iconR&&(state.ownedIcons||[]).includes(stage.iconR);
          html+=`<div class="pve-card ${done?'cleared':locked?'locked':''} ${stage.boss?'boss-card':''}" style="${stage.boss?'border-color:var(--score)':''}">
            <div class="pve-name" style="${stage.boss?'color:var(--score)':''}">ACT2 #${globalIdx+1} ${stage.name}</div>
            <div class="pve-desc">${stage.desc}</div>
            <div class="pve-enemies">${stage.enemies} opponent${stage.enemies>1?'s':''} (level ${stage.eLevel})</div>
            <div class="pve-reward">+${stage.gpR} 🧪${stage.iconR?` <span class="icon-reward">${iconOwned?'✓':'+'}${stage.iconR}</span>`:''}</div>`;
          if(done){ html+=`<div class="pve-cleared-badge">✓ CLEARED</div>`; }
          else if(!locked){
            html+=`<div class="pve-selectors">`;
            for(let slot=0;slot<state.combatSlots;slot++){
              html+=`<select id="a2-sel-${stage.id}-${slot}"><option value="">— slot ${slot+1} —</option>${immortals.map(im=>`<option value="${im.id}">${im.name}${im.prestiged?' 🌟':''}</option>`).join('')}</select>`;
            }
            html+=`</div>`;
            html+=`<button class="btn-combat" style="border-color:var(--score);color:var(--score)" onclick="(()=>{const ids=[];for(let i=0;i<${state.combatSlots};i++){const el=document.getElementById('a2-sel-${stage.id}-'+i);if(el&&el.value)ids.push(el.value);}runAct2Stage('${stage.id}',ids);})()">[ FIGHT ]</button>`;
          } else { html+=`<div style="color:var(--muted);font-size:10px;margin-top:4px">Complete previous stage first</div>`; }
          html+=`</div>`;
        });
        html+=`</div>`;
      });
      if((state.combatLog||[]).length){
        const last=state.combatLog[0];
        html+=`<div class="combat-log-box" style="margin-top:20px"><p class="combat-log-title">// LAST FIGHT: ${last.stageName||''}</p>`;
        last.log.forEach(line=>{
          const cls=line.startsWith('🏆')||line.startsWith('✓')||line.startsWith('🌟')?'win':line.startsWith('💀')?'loss':line.startsWith('──')?'section':'';
          html+=`<div class="clog-line ${cls}">${line}</div>`;
        });
        html+=`</div>`;
      }
    }

  } else if(combatSubTab==='pve3'){
    const act2Done=(state.pveAct2Completed||[]).length>=PVE_ACT2_STAGES.length;
    if(!act2Done){
      html+=`<div class="combat-locked" style="border-color:#ff4444">
        ⚡ ACT 3 — THE INFINITE WAR<br><br>
        Complete all 33 stages of Act 2 to unlock Act 3.<br>
        <span style="color:var(--muted);font-size:11px">Act 2 progress: ${(state.pveAct2Completed||[]).length} / ${PVE_ACT2_STAGES.length}</span>
      </div>`;
    } else {
      const a3color='#ff4444';
      html+=`<p class="pve-intro" style="border-color:${a3color};color:var(--muted)">ACT 3 — THE INFINITE WAR. 27 stages across 4 chapters. 4 boss icons. Requires 3 fully maxed, fully prestiged immortals with RI Warfare investment. Enemies have 35% crit, 25% dodge, and massive regen.</p>`;
      const a3sections=[
        {label:'CHAPTER 1 — THE INFINITE WAR (1-8)',min:0,max:7},
        {label:'CHAPTER 2 — THE DARK CONVERGENCE (9-16)',min:8,max:15},
        {label:'CHAPTER 3 — THE FINAL ASCENT (17-23)',min:16,max:22},
        {label:'CHAPTER 4 — THE END (24-27)',min:23,max:26},
      ];
      a3sections.forEach(section=>{
        const stages=PVE_ACT3_STAGES.slice(section.min,section.max+1);
        html+=`<p class="act-title" style="color:${a3color}">${section.label}</p><div class="pve-grid">`;
        stages.forEach(stage=>{
          const gIdx=PVE_ACT3_STAGES.findIndex(s=>s.id===stage.id);
          const done=(state.pveAct3Completed||[]).includes(stage.id);
          const prevDone=gIdx===0||(state.pveAct3Completed||[]).includes(PVE_ACT3_STAGES[gIdx-1].id);
          const locked=!prevDone&&!done;
          const iconOwned=stage.iconR&&(state.ownedIcons||[]).includes(stage.iconR);
          html+=`<div class="pve-card ${done?'cleared':locked?'locked':''}" style="${stage.boss?`border-color:${a3color}`:done?'':'border-color:#3a1010'}">
            <div class="pve-name" style="${stage.boss?`color:${a3color}`:''}">ACT3 #${gIdx+1} ${stage.name}</div>
            <div class="pve-desc">${stage.desc}</div>
            <div class="pve-enemies" style="color:#884444">${stage.enemies} opponent${stage.enemies>1?'s':''} (level ${stage.eLevel}) — 35% crit, 25% dodge</div>
            <div class="pve-reward">+${stage.gpR} 🧪${stage.iconR?` <span class="icon-reward">${iconOwned?'✓':'+'}${stage.iconR}</span>`:''}</div>`;
          if(done){html+=`<div class="pve-cleared-badge">✓ CLEARED</div>`;}
          else if(!locked){
            html+=`<div class="pve-selectors">`;
            for(let i=0;i<state.combatSlots;i++){
              html+=`<select id="a3-sel-${stage.id}-${i}"><option value="">— slot ${i+1} —</option>${immortals.map(im=>`<option value="${im.id}">${im.name}${im.prestiged?' 🌟':''}</option>`).join('')}</select>`;
            }
            html+=`</div><button class="btn-combat" style="border-color:${a3color};color:${a3color}" onclick="(()=>{const ids=[];for(let i=0;i<${state.combatSlots};i++){const el=document.getElementById('a3-sel-${stage.id}-'+i);if(el&&el.value)ids.push(el.value);}runAct3Stage('${stage.id}',ids);})()">[ FIGHT ]</button>`;
          } else {html+=`<div style="color:var(--muted);font-size:10px;margin-top:4px">Complete previous stage first</div>`;}
          html+=`</div>`;
        });
        html+=`</div>`;
      });
      if((state.combatLog||[]).length){
        const last=state.combatLog[0];
        html+=`<div class="combat-log-box" style="margin-top:20px"><p class="combat-log-title">// LAST FIGHT: ${last.stageName||''}</p>`;
        last.log.forEach(line=>{
          const cls=line.startsWith('🏆')||line.startsWith('✓')||line.startsWith('⚡')?'win':line.startsWith('💀')?'loss':line.startsWith('──')?'section':'';
          html+=`<div class="clog-line ${cls}">${line}</div>`;
        });
        html+=`</div>`;
      }
    }

  } else {
    html+=`<p class="pvp-intro">Challenge other players from the Leaderboard. Click ⚔ next to any player to send a challenge. You may wager gold or diamonds — both players must be able to afford the wager.</p>`;
    html+=`<p class="pvp-sect">// YOUR RECORD</p>`;
    html+=`<p class="pvp-record">Wins: <span class="w">${fmt(state.pvpWins)}</span> &nbsp; Losses: <span class="l">${fmt(state.pvpLosses)}</span></p>`;
    html+=`<p class="pvp-sect">// INCOMING CHALLENGES</p>`;
    html+=`<div id="pvp-challenges-list"><p class="pvp-empty">Loading…</p></div>`;
    html+=`<p class="pvp-sect" style="margin-top:20px">// RECENT RESULTS</p>`;
    const results=(state.combatLog||[]).filter(x=>x.type==='pvp');
    if(results.length){
      results.slice(0,5).forEach(r=>{
        html+=`<div class="pvp-card ${r.won?'won':'lost'}"><div class="pvp-ch-hdr"><span class="pvp-ch-name">vs ${esc(r.opponent||'?')}</span><span class="pvp-ch-status ${r.won?'won':'lost'}">${r.won?'WON':'LOST'}</span></div><div class="pvp-ch-desc">${r.time||''}</div></div>`;
      });
    } else {
      html+=`<p class="pvp-empty">No recent results.</p>`;
    }
  }
  c.innerHTML=html;
  window.loadPvpChallenges?.();
}
window.setCombatTab=(tab)=>{combatSubTab=tab;renderCombat();};

window.renderPvpChallenges=(challenges)=>{
  const el=document.getElementById('pvp-challenges-list');if(!el)return;
  if(!challenges||!challenges.length){el.innerHTML='<p class="pvp-empty">No incoming challenges.</p>';return;}
  let html='';
  challenges.forEach(ch=>{
    const wText=ch.wagerType&&ch.wagerType!=='none'&&ch.wagerAmount>0?`<div class="pvp-ch-wager">⚖ Wager: ${fmt(ch.wagerAmount)} ${ch.wagerType}</div>`:'';
    html+=`<div class="pvp-card pending">
      <div class="pvp-ch-hdr"><span class="pvp-ch-name">From: ${esc(ch.challengerUsername||'?')}</span><span class="pvp-ch-status pending">PENDING</span></div>
      <div class="pvp-ch-desc">Their champion: ${esc(ch.challengerImmortalName||'?')}</div>
      ${wText}
      <div class="pvp-ch-btns">
        <button class="pvp-accept-btn" style="border-color:var(--green);color:var(--green)"
          data-id="${esc(ch.id)}"
          data-username="${esc(ch.challengerUsername||'?')}"
          data-immortal="${esc(ch.challengerImmortalName||'?')}"
          data-wtype="${esc(ch.wagerType||'none')}"
          data-wamt="${safeNum(ch.wagerAmount)}">[ ACCEPT ]</button>
        <button class="pvp-decline-btn btn-secondary" data-id="${esc(ch.id)}">[ DECLINE ]</button>
      </div>
    </div>`;
  });
  el.innerHTML=html;
  // Attach listeners — avoids apostrophe/special-char breakage in inline onclick
  el.querySelectorAll('.pvp-accept-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      openPvpAcceptModal(btn.dataset.id,btn.dataset.username,btn.dataset.immortal,btn.dataset.wtype,safeNum(btn.dataset.wamt));
    });
  });
  el.querySelectorAll('.pvp-decline-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ window.rejectPvpChallenge?.(btn.dataset.id); });
  });
};

function renderMilestones(){
  const c=document.getElementById('milestones-container');if(!c)return;
  const ms=getMilestoneCounts();
  let html=`<p class="ms-total">Completed: <span>${fmt(ms.done)} / ${fmt(ms.total)}</span> &nbsp;|&nbsp; 🧪 Gene Points: <span style="color:var(--gp)">${fmt(state.genePoints)}</span></p>`;
  MILESTONE_TRACKS.forEach(track=>{
    const prog=getTrackProg(track);
    const completedN=prog.ci+1,allDone=completedN===prog.tot;
    html+=`<p class="ms-cat-title">// ${track.name}</p><div class="track-grid"><div class="track-card ${allDone?'tc-complete':completedN>0?'tc-active':''}">`;
    html+=`<div class="track-header"><span class="track-name">${track.name}</span><span class="track-tier ${allDone?'all-done':''}">TIER ${completedN} / ${prog.tot}</span></div>`;
    html+=`<div class="track-current-name">${prog.cur?prog.cur.name:'Not started'}</div>`;
    if(!allDone&&prog.nxt){
      const pv=Math.round(prog.pct*100);
      html+=`<div class="track-next-name">→ ${prog.nxt.name} at ${fmt(prog.nxt.target)} ${track.unit}</div>`;
      html+=`<div class="track-prog-wrap"><div class="track-prog-bar"><div class="track-prog-fill" style="width:${pv}%"></div></div><div class="track-prog-text"><span>${fmt(prog.val)} / ${fmt(prog.nxt.target)}</span><span class="reward">${prog.nxt.dia>0?'+'+prog.nxt.dia+'💎 ':''}${prog.nxt.gp>0?'+'+prog.nxt.gp+'🧪':''}</span></div></div>`;
    } else if(allDone){html+=`<div class="track-complete-badge">✦ ALL TIERS COMPLETE</div>`;}
    html+=`<div class="track-dots">`;
    prog.tot>0&&[...Array(prog.tot)].forEach((_,i)=>{html+=`<div class="track-dot ${i<=prog.ci?'filled':i===prog.ci+1?'current':''}"></div>`;});
    html+=`</div></div></div>`;
  });
  const hasDecoder=safeNum(state.upgrades?.secretDecoder)>0;
  html+=`<p class="ms-cat-title secret-title">// ??? SECRETS — +💎 +5🧪 each${hasDecoder?' <span style="color:var(--diamond);font-size:9px">[DECODER ACTIVE]</span>':''}</p><div class="secret-grid">`;
  SECRET_MILESTONES.forEach(m=>{
    const isDone=state.completedMilestones.includes(m.id);
    const dia=m.dia||3;
    if(!isDone){
      html+=`<div class="ms-card ms-secret">
        <div class="ms-name">???</div>
        ${hasDecoder?`<div class="ms-desc" style="color:var(--muted);font-size:10px;margin-bottom:4px">${m.desc}</div>`:''}
        <div class="ms-reward">+${dia}💎 +5🧪</div>
      </div>`;
    } else {
      html+=`<div class="ms-card ms-done-secret"><div class="ms-check secret-check">✓</div><div class="ms-name">${m.name}</div><div class="ms-desc">${m.desc}</div><div class="ms-reward">+${dia}💎 +5🧪</div></div>`;
    }
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderGeneVault(){
  const c=document.getElementById('vault-container');if(!c)return;
  const owned=state.ownedIcons||[],sel=state.selectedIcon;
  const pveIconsOwned=PVE_BOSS_ICONS.filter(ic=>owned.includes(ic));
  let html=`<p class="vault-intro">Collect icons to display on the leaderboard. Vault icons: 150. Boss icons from PvE: 4. Total: 154. Duplicates refund 10%.</p>`;
  html+=`<div class="vault-collection-section">`;
  html+=`<p class="vault-collection-title">// YOUR COLLECTION — ${fmt(owned.length)} / ${TOTAL_ICONS} icons</p>`;
  if(sel)html+=`<p class="vault-active-label">Active: <span>${sel}</span></p>`;
  else html+=`<p class="vault-active-label">Click any icon to equip it on the leaderboard.</p>`;
  if(!owned.length)html+=`<p class="vault-collection-empty">Nothing yet.</p>`;
  else{html+=`<div class="vault-icon-grid">`;[...new Set(owned)].forEach(icon=>{html+=`<div class="vault-icon-cell ${sel===icon?'selected':''}" onclick="selectIcon('${icon}')">${icon}</div>`;});html+=`</div>`;}
  if(pveIconsOwned.length){html+=`<p style="font-size:10px;color:var(--combat);margin-top:10px;letter-spacing:2px">// PVE BOSS ICONS OWNED: ${pveIconsOwned.join(' ')}</p>`;}
  html+=`</div><p class="vault-boxes-title">// GENE VAULTS</p><div class="vault-boxes-grid">`;
  GENE_VAULTS.forEach(vault=>{
    const opens=safeNum(state[`vault_${vault.id}_opens`]);
    const ownedN=vault.icons.filter(ic=>owned.includes(ic)).length;
    const isPrev=vaultPreviewId===vault.id;
    html+=`<div class="vault-box-card ${vault.cssClass}">
      <div class="vb-header"><span class="vb-name">${vault.name}</span><span class="vb-theme">${vault.theme}</span></div>
      <div class="vb-cost">${fmt(vault.cost)} 💎 per open</div>
      <div class="vb-desc">${vault.desc}</div>
      <div class="vb-stats">Collected: <span>${ownedN} / ${vault.icons.length}</span> &nbsp;|&nbsp; Opened: <span>${fmt(opens)}×</span></div>
      <button class="vb-preview-toggle" onclick="toggleVaultPreview('${vault.id}')">${isPrev?'[ HIDE ICONS ]':'[ SEE ICONS ]'}</button>`;
    if(isPrev){
      html+=`<div class="vb-icons-preview">`;
      vault.icons.forEach(ic=>{html+=`<div class="vb-icon-preview ${owned.includes(ic)?'owned':''}">${ic}</div>`;});
      html+=`</div>`;
    }
    const vaultFull=ownedN>=vault.icons.length;
    const can=!vaultFull&&state.diamonds>=vault.cost;
    html+=`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="openVault('${vault.id}')">${vaultFull?'[ COMPLETE ✓ ]':`[ OPEN — ${fmt(vault.cost)} 💎 ]`}</button></div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

window._openTileKey=null;
window.openCityTile=(key)=>{
  const editor=document.getElementById('city-tile-editor');
  const content=document.getElementById('city-tile-editor-content');
  if(!editor||!content)return;
  if(window._openTileKey===key&&!editor.classList.contains('hidden')){
    editor.classList.add('hidden');window._openTileKey=null;return;
  }
  window._openTileKey=key;
  editor.classList.remove('hidden');
  const city=state.city;
  const g=city.grid||{};
  const b=g[key]||null;
  const isRI=key==='0,0';
  const bhLevel=getBreedingHallLevel();
  const chLevel=getCullingHallLevel();
  const vals=cityGridValues();
  const bhCount=vals.filter(s=>s==='breeding').length;
  const chCount=vals.filter(s=>s==='culling').length;
  const spCount=vals.filter(s=>s==='genespire').length;
  let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <span style="color:var(--muted);font-size:11px">Tile ${key}</span>
    <button onclick="document.getElementById('city-tile-editor').classList.add('hidden');window._openTileKey=null;" style="width:auto;padding:2px 8px;margin:0;font-size:10px;border-color:var(--muted);color:var(--muted)">[ CLOSE ]</button>
  </div>`;
  if(isRI&&!b){
    h+=`<p style="color:var(--muted);font-size:11px;margin-bottom:8px">🏛️ The Research Institute is the heart of your city.</p>
        <button onclick="cityBuildRI()" style="width:auto;padding:6px 14px;margin:0;border-color:var(--score);color:var(--score)">[ BUILD RESEARCH INSTITUTE ]</button>`;
  } else if(isRI&&b){
    h+=`<p style="color:var(--score);font-size:12px;margin-bottom:4px">🏛️ Research Institute — Level ${city.riLevel} / 3</p>
        <p style="color:var(--muted);font-size:11px">The Institute cannot be removed.</p>`;
  } else if(!b){
    h+=`<p style="color:var(--muted);font-size:11px;margin-bottom:10px">Build something here:</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">`;
    [{id:'breeding',emoji:'🏗️',name:'Breeding Hall',desc:`${fmt(10000)}–${fmt(50000)} gold/hr. Scales with total breeds.`,max:10,cur:bhCount},
     {id:'culling', emoji:'⚗️',name:'Culling Hall', desc:`${fmt(1000)}–${fmt(10000)} 💎/hr. Scales with total culls.`,max:10,cur:chCount},
     {id:'monument',emoji:'🗿',name:'Monument',     desc:'Display your icon collection to visitors.',max:999,cur:0},
     {id:'genespire',emoji:'🧬',name:'Gene Spire',  desc:'1–10 🧪/hr. Upgrade individually.',max:10,cur:spCount},
    ].forEach(o=>{
      const atMax=o.cur>=o.max;
      h+=`<div style="border:1px solid ${atMax?'var(--border)':'var(--border)'};background:var(--surface);padding:10px;opacity:${atMax?.45:1}">
        <div style="font-size:18px;margin-bottom:4px">${o.emoji}</div>
        <div style="color:var(--text);font-size:11px;margin-bottom:4px">${o.name}</div>
        <div style="color:var(--muted);font-size:9px;margin-bottom:6px">${o.desc}</div>
        <div style="color:var(--muted);font-size:9px;margin-bottom:6px">${o.cur}/${o.max}</div>
        ${atMax?`<span style="color:var(--red);font-size:9px">MAX</span>`:`<button onclick="citySetCell('${key}','${o.id}')" style="width:auto;padding:3px 10px;margin:0;font-size:10px">[ BUILD ]</button>`}
      </div>`;
    });
    h+=`</div>`;
  } else {
    const bldg=CITY_BUILDINGS[b];
    const emo={breeding:'🏗️',culling:'⚗️',monument:'🗿',genespire:'🧬'}[b]||'?';
    h+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:22px">${emo}</span>
      <div><div style="color:var(--text);font-size:12px">${bldg?.name||b}</div>
      <div style="color:var(--muted);font-size:10px">${bldg?.desc||''}</div></div>
    </div>`;
    if(b==='breeding')h+=`<p style="color:var(--gold);font-size:11px;margin-bottom:10px">Level ${bhLevel}/4 · ${bhLevel?fmt(getBreedingHallRate())+' gold/hr':'Inactive — need 10k breeds'}</p>`;
    if(b==='culling') h+=`<p style="color:var(--diamond);font-size:11px;margin-bottom:10px">Level ${chLevel}/4 · ${chLevel?fmt(getCullingHallRate())+' 💎/hr':'Inactive — need 1k culls'}</p>`;
    if(b==='monument'){const mi=city.monumentIcons||[];const mm=3+getCityBonuses().monumentIconBonus;h+=`<p style="color:#818cf8;font-size:11px;margin-bottom:10px">${mi.join('')||'—'} (${mi.length}/${mm} icons)</p>`;}
    if(b==='genespire'){
      const curTier=getSpireTier(key);
      const tiers=CITY_BUILDINGS.genespire.tiers;
      const curDef=tiers.find(t=>t.tier===curTier)||tiers[0];
      const nextDef=tiers.find(t=>t.tier===curTier+1);
      h+=`<p style="color:var(--gp);font-size:11px;margin-bottom:6px">Tier ${curTier}/5 · ${curDef.gpH} 🧪/hr</p>`;
      if(nextDef){
        const canUpg=(nextDef.costGold===0&&nextDef.costDia===0)||(nextDef.costGold>0&&state.gold>=nextDef.costGold)||(nextDef.costDia>0&&state.diamonds>=nextDef.costDia);
        h+=`<p style="color:var(--muted);font-size:9px;margin-bottom:8px">→ Tier ${nextDef.tier}: ${nextDef.gpH} 🧪/hr · ${nextDef.costGold>0?fmt(nextDef.costGold)+' gold':nextDef.costDia>0?fmt(nextDef.costDia)+' 💎':'free'}</p>
        <button onclick="upgradeGenespireCell('${key}')" style="width:auto;padding:4px 10px;margin:0 8px 10px 0;font-size:10px;border-color:var(--gp);color:var(--gp);${canUpg?'':'opacity:.4'}">[ UPGRADE → T${nextDef.tier} ]</button>`;
      } else h+=`<p style="color:var(--gp);font-size:11px;margin-bottom:10px">✦ MAX TIER</p>`;
      h+=`<div style="display:flex;gap:3px;margin-bottom:10px">`;
      tiers.forEach(t=>{const done=curTier>=t.tier;h+=`<div style="border:1px solid ${done?'var(--gp)':'var(--border)'};padding:3px 6px;font-size:8px;color:${done?'var(--gp)':'var(--muted)'}">${t.gpH}🧪</div>`;});
      h+=`</div>`;
    }
    h+=`<button onclick="cityRemoveCell('${key}')" style="width:auto;padding:4px 12px;margin-top:4px;font-size:10px;border-color:var(--red);color:var(--red)">[ REMOVE BUILDING ]</button>`;
  }
  content.innerHTML=h;
};

function renderCity(){
  const c=document.getElementById('city-container');if(!c)return;
  if(!state.city||typeof state.city!=='object')state.city={name:'',bannerColor:'',motto:'',riLevel:0,riSkills:[],sacrificedImmortalId:null,grid:{},monumentIcons:[],lastGoldTick:null,goldBuffer:0,spireTiers:{}};
  if(!state.city.grid||typeof state.city.grid!=='object'||Array.isArray(state.city.grid))state.city.grid={};
  if(!state.city.spireTiers)state.city.spireTiers={};
  try{
  const act2Done=(state.pveAct2Completed||[]).length>=PVE_ACT2_STAGES.length;
  if(!act2Done){
    c.innerHTML=`<div class="combat-locked" style="border-color:var(--score)">🏙️ YOUR CITY<br><br>Complete all 33 Act 2 stages to unlock your city.<br><span style="color:var(--muted);font-size:11px">Progress: ${(state.pveAct2Completed||[]).length} / ${PVE_ACT2_STAGES.length}</span></div>`;
    return;
  }
  tickCityGold();
  const slots=getCitySlots();
  const cb=getCityBonuses();
  const city=state.city;
  const g=city.grid||{};
  const bhLevel=getBreedingHallLevel();
  const bhRate=getBreedingHallRate();
  const vals=cityGridValues();
  const bhCount=vals.filter(s=>s==='breeding').length;
  const chCount=vals.filter(s=>s==='culling').length;
  const spCount=vals.filter(s=>s==='genespire').length;
  const totalSpireGpH=getTotalSpireGpH();
  const usedSlots=Object.keys(g).length;
  const banner=city.bannerColor||'var(--score)';

  let html='';
  // Header
  html+=`<div style="border-left:4px solid ${banner};padding-left:16px;margin-bottom:18px">
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
      <span style="color:${banner};font-size:18px;letter-spacing:2px">${city.name||'Unnamed City'}</span>
      <button onclick="(()=>{const d=document.getElementById('city-edit-panel');d.classList.toggle('hidden');})()" style="width:auto;font-size:10px;padding:2px 8px;margin:0;border-color:var(--muted);color:var(--muted)">[ EDIT ]</button>
    </div>
    ${city.motto?`<p style="color:var(--muted);font-size:11px;margin-top:3px;font-style:italic">"${esc(city.motto)}"</p>`:''}
    <p style="color:var(--muted);font-size:10px;margin-top:5px">${usedSlots}/${slots} slots used (${fmt(slots-usedSlots)} free) &nbsp;·&nbsp; 🏗️${bhCount}/10 &nbsp;·&nbsp; ⚗️${chCount}/10 &nbsp;·&nbsp; 🧬${spCount}/10${totalSpireGpH?` (${totalSpireGpH}🧪/hr)`:''}</p>
  </div>`;

  // Edit panel
  html+=`<div id="city-edit-panel" class="hidden" style="border:1px solid var(--border);background:var(--surface);padding:12px;margin-bottom:16px">
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
      <label style="color:var(--muted);font-size:11px;width:60px">Name:</label>
      <input id="city-name-input" value="${esc(city.name)}" placeholder="City name" style="flex:1;min-width:100px" maxlength="20"/>
      <button onclick="saveCityName()" style="width:auto;padding:4px 10px;margin:0;font-size:11px">[ SAVE ]</button>
    </div>
    ${cb.bannerUnlocked?`<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap">
      <label style="color:var(--muted);font-size:11px;width:60px">Banner:</label>
      <input type="color" id="city-banner-input" value="${city.bannerColor||'#39ff14'}" style="height:28px;width:50px;border:1px solid var(--border);background:none;cursor:pointer"/>
      <button onclick="saveCityBanner()" style="width:auto;padding:4px 10px;margin:0;font-size:11px">[ SAVE ]</button>
    </div>`:''}
    ${cb.mottoUnlocked?`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label style="color:var(--muted);font-size:11px;width:60px">Motto:</label>
      <input id="city-motto-input" value="${esc(city.motto)}" placeholder="City motto" style="flex:1;min-width:100px" maxlength="60"/>
      <button onclick="saveCityMotto()" style="width:auto;padding:4px 10px;margin:0;font-size:11px">[ SAVE ]</button>
    </div>`:''}
  </div>`;

  // ── 2D GRID ─────────────────────────────────────────────
  html+=`<p style="color:var(--text);font-size:10px;letter-spacing:3px;margin-bottom:8px">// CITY GRID — click to manage · ➕ to expand</p>`;

  // Compute bounding box of existing cells + adjacent empties
  const keys=Object.keys(g);
  let minX=0,maxX=0,minY=0,maxY=0;
  if(keys.length){
    keys.forEach(k=>{const[x,y]=k.split(',').map(Number);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);});
  }
  // Expand bounds by 1 in each direction to show expansion tiles
  const gMinX=minX-1,gMaxX=maxX+1,gMinY=minY-1,gMaxY=maxY+1;

  const BLDG_D={
    research:{emoji:'🏛️',color:'var(--score)',label:'Institute'},
    breeding:{emoji:'🏗️',color:'var(--gold)',  label:'Breeding'},
    culling: {emoji:'⚗️',color:'var(--diamond)',label:'Culling'},
    monument:{emoji:'🗿',color:'#818cf8',       label:'Monument'},
    genespire:{emoji:'🧬',color:'var(--gp)',    label:'Spire'},
  };

  html+=`<div class="city-emoji-grid" style="display:grid;grid-template-columns:repeat(${gMaxX-gMinX+1},72px);gap:4px;margin-bottom:16px;overflow-x:auto">`;
  for(let y=gMinY;y<=gMaxY;y++){
    for(let x=gMinX;x<=gMaxX;x++){
      const key=`${x},${y}`;
      const b=g[key]||null;
      // Is this adjacent to an existing cell?
      const adj=[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>g[`${x+dx},${y+dy}`]);
      const isOrigin=x===0&&y===0;
      const open=window._openTileKey===key;

      if(b){
        const d=BLDG_D[b]||{emoji:'?',color:'var(--muted)',label:'?'};
        const sub=b==='genespire'?`T${getSpireTier(key)}·${(CITY_BUILDINGS.genespire.tiers.find(t=>t.tier===getSpireTier(key))||CITY_BUILDINGS.genespire.tiers[0]).gpH}🧪/hr`:
                   b==='breeding'?`${bhLevel?fmt(bhRate)+'g/hr':'inactive'}`:
                   b==='culling'?`${getCullingHallLevel()?fmt(getCullingHallRate())+'💎/hr':'inactive'}`:
                   b==='research'?`Lv${city.riLevel}`:'';
        html+=`<div class="city-tile city-tile-built ${open?'city-tile-open':''}" style="border-color:${d.color}" onclick="openCityTile('${key}')">
          <span class="city-tile-emoji">${d.emoji}</span>
          <span class="city-tile-label" style="color:${d.color}">${d.label}</span>
          <span class="city-tile-sub">${sub}</span>
        </div>`;
      } else if(adj||isOrigin){
        // Show as expansion tile only if we have free slots
        const canExpand=usedSlots<slots;
        if(canExpand){
          html+=`<div class="city-tile city-tile-empty" onclick="openCityTile('${key}')" title="Expand here" style="${open?'border-color:var(--green);':''}">
            <span class="city-tile-emoji" style="opacity:.4;font-size:16px">➕</span>
            <span class="city-tile-label" style="color:var(--border);font-size:7px">${x},${y}</span>
          </div>`;
        } else {
          html+=`<div class="city-tile city-tile-empty" style="opacity:.15;cursor:default">
            <span class="city-tile-emoji" style="font-size:12px">🔒</span>
          </div>`;
        }
      } else {
        // Empty non-adjacent — invisible spacer
        html+=`<div class="city-tile" style="border:none;background:transparent;cursor:default"></div>`;
      }
    }
  }
  html+=`</div>`;

  // Inline tile editor
  html+=`<div id="city-tile-editor" class="${window._openTileKey?'':'hidden'}" style="border:1px solid var(--border);background:var(--surface);padding:14px;margin-top:8px;margin-bottom:20px">
    <div id="city-tile-editor-content"></div>
  </div>`;

  // Research Institute panel
  if(g['0,0']==='research'){
    html+=`<div style="margin-top:24px"><p style="color:var(--score);font-size:10px;letter-spacing:3px;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #1a0a2a">// RESEARCH INSTITUTE — LEVEL ${city.riLevel} / 3</p>`;
    if(city.riLevel<2){
      const allPIds=PRESTIGE_BRANCHES.flatMap(b=>b.skills.map(s=>s.id));
      const eligible=(state.immortals||[]).filter(im=>im.prestiged&&allPIds.every(id=>(im.prestigeSkills||[]).includes(id)));
      html+=`<div style="border:1px solid #2a1a3a;background:#0a0508;padding:12px;margin-bottom:16px">
        <p style="color:var(--score);font-size:11px;margin-bottom:6px">Upgrade to Level 2</p>
        <p style="color:var(--muted);font-size:11px;margin-bottom:8px">Sacrifice a fully maxed + fully prestiged immortal (all base + all prestige skills).</p>
        ${eligible.length?eligible.map(im=>`<button onclick="cityUpgradeRI2('${im.id}')" style="width:auto;padding:4px 12px;margin:0 6px 4px 0;font-size:11px;border-color:var(--score);color:var(--score)">[ Sacrifice ${esc(im.name)} ]</button>`).join(''):`<p style="color:var(--red);font-size:11px">No eligible immortals — need fully maxed + fully prestiged.</p>`}
      </div>`;
    } else if(city.riLevel<3){
      const ms=getMilestoneCounts();const canL3=ms.done>=ms.total;
      html+=`<div style="border:1px solid #2a1a3a;background:#0a0508;padding:12px;margin-bottom:16px">
        <p style="color:var(--score);font-size:11px;margin-bottom:6px">Upgrade to Level 3</p>
        <p style="color:var(--muted);font-size:11px;margin-bottom:8px">Complete every milestone: <strong style="color:${canL3?'var(--green)':'var(--red)'}">${ms.done} / ${ms.total}</strong></p>
        <button onclick="cityUpgradeRI3()" style="width:auto;padding:5px 14px;margin:0;font-size:11px;${canL3?'border-color:var(--score);color:var(--score)':'opacity:.4;cursor:not-allowed'}">[ UPGRADE TO LEVEL 3 ]</button>
      </div>`;
    }
    html+=`<p style="color:var(--gp);font-size:10px;letter-spacing:1px;margin-bottom:12px">${fmt(state.genePoints)} 🧪 available</p>`;
    html+=`<div class="im-skill-tree" style="grid-template-columns:repeat(5,1fr)">`;
    RI_BRANCHES.forEach(branch=>{
      html+=`<div class="im-branch"><div class="im-branch-title" style="color:${branch.color}">${branch.name}</div>`;
      branch.skills.forEach((skill,idx)=>{
        const owned=(city.riSkills||[]).includes(skill.id);
        const prevOwned=idx===0||(city.riSkills||[]).includes(branch.skills[idx-1].id);
        const levelLocked=skill.riLevel>city.riLevel;
        const isLocked=!owned&&(!prevOwned||levelLocked);
        const canBuy=!owned&&prevOwned&&!levelLocked&&state.genePoints>=skill.cost;
        const nodeCls=owned?'sk-owned':levelLocked?'sk-blocked':isLocked?'sk-locked':'sk-available';
        if(idx>0)html+=`<div class="im-connector ${owned?'conn-lit':''}" style="color:${owned?branch.color:'var(--border)'};text-align:center;font-size:9px">↓</div>`;
        html+=`<div class="im-skill-node ${nodeCls}" style="${owned?`border-color:${branch.color};background:#0a0505`:''}" ${!owned&&!isLocked?`onclick="buyRISkill('${skill.id}')" title="${skill.effect}"`:''}>
          <div class="im-sn-name" style="${owned?`color:${branch.color}`:''}"> ${skill.name}</div>
          <div class="im-sn-effect">${skill.effect}</div>`;
        if(owned)html+=`<div class="im-sn-cost owned" style="color:${branch.color}">✓</div>`;
        else if(levelLocked)html+=`<div class="im-sn-cost blocked">🔒 RI Lv${skill.riLevel}</div>`;
        else if(isLocked)html+=`<div class="im-sn-cost locked">🔒</div>`;
        else html+=`<div class="im-sn-cost ${canBuy?'afford':'noafford'}">${skill.cost}🧪</div>`;
        html+=`</div>`;
      });
      html+=`</div>`;
    });
    html+=`</div></div>`;
  }

  // Monument icon picker
  if(vals.includes('monument')){
    const maxM=3+cb.monumentIconBonus;
    html+=`<div style="margin-top:20px"><p style="color:#818cf8;font-size:10px;letter-spacing:3px;margin-bottom:8px">// MONUMENT ICONS (${(city.monumentIcons||[]).length}/${maxM})</p>
    <div class="vault-icon-grid">`;
    [...new Set(state.ownedIcons||[])].forEach(icon=>{
      const sel=(city.monumentIcons||[]).includes(icon);
      html+=`<div class="vault-icon-cell ${sel?'selected':''}" onclick="toggleMonumentIcon('${icon}')">${icon}</div>`;
    });
    html+=`</div></div>`;
  }

  // Breeding/Culling hall info
  if(vals.includes('breeding')||vals.includes('culling')){
    html+=`<div style="margin-top:20px;display:flex;gap:20px;flex-wrap:wrap">`;
    if(vals.includes('breeding')){
      html+=`<div style="flex:1;min-width:200px"><p style="color:var(--gold);font-size:10px;letter-spacing:2px;margin-bottom:6px">🏗️ BREEDING HALL</p>`;
      CITY_BUILDINGS.breeding.levels.forEach((lvl,i)=>{const a=bhLevel>i;html+=`<div style="font-size:10px;color:${a?'var(--green)':'var(--muted)'};margin-bottom:3px">${a?'✓':' '} ${lvl.label} — ${lvl.desc}</div>`;});
      if(bhRate)html+=`<p style="color:var(--gold);font-size:11px;margin-top:6px">Current: ${fmt(bhRate)} gold/hr</p>`;
      html+=`</div>`;
    }
    if(vals.includes('culling')){
      const chRate=getCullingHallRate();const chLevel=getCullingHallLevel();
      html+=`<div style="flex:1;min-width:200px"><p style="color:var(--diamond);font-size:10px;letter-spacing:2px;margin-bottom:6px">⚗️ CULLING HALL</p>`;
      CITY_BUILDINGS.culling.levels.forEach((lvl,i)=>{const a=chLevel>i;html+=`<div style="font-size:10px;color:${a?'var(--diamond)':'var(--muted)'};margin-bottom:3px">${a?'✓':' '} ${lvl.label} — ${lvl.desc}</div>`;});
      if(chRate)html+=`<p style="color:var(--diamond);font-size:11px;margin-top:6px">Current: ${fmt(chRate)} 💎/hr</p>`;
      html+=`</div>`;
    }
    html+=`</div>`;
  }

  c.innerHTML=html;
  // Re-open tile editor if one was open
  if(window._openTileKey){
    const ed=c.querySelector('#city-tile-editor');
    if(ed)ed.classList.remove('hidden');
    window.openCityTile(window._openTileKey);
  }
  }catch(err){
    console.error('renderCity:',err);
    c.innerHTML=`<div style="color:var(--red);padding:20px;border-left:2px solid var(--red)">City error: ${err.message}<br><br><button onclick="renderCity()" style="width:auto;padding:4px 12px;margin:0;font-size:11px">[ RETRY ]</button></div>`;
  }
}
window.renderCity=renderCity;


window.renderLeaderboard=(entries,currentUid)=>{
  const c=document.getElementById('leaderboard-container');if(!c)return;
  if(window.isGuest){
    c.innerHTML=`<div style="color:var(--muted);font-size:13px;line-height:1.9;border-left:2px solid var(--border);padding-left:14px">
      <p style="color:var(--text);margin-bottom:8px">// LEADERBOARD</p>
      <p>You are playing as a guest. The leaderboard is only available to registered players.</p>
      <p style="margin-top:12px"><a href="#" onclick="document.getElementById('game-screen').classList.add('hidden');document.getElementById('auth-screen').classList.remove('hidden');return false;" style="color:var(--green)">[ CREATE AN ACCOUNT ]</a> to appear on the leaderboard and access PvP.</p>
    </div>`;
    return;
  }
  const currentTotal=getMilestoneCounts().total;
  let html=`<div class="lb-header"><span class="lb-title">// LEADERBOARD</span><button class="lb-refresh" onclick="window.refreshLeaderboard?.()">[ REFRESH ]</button></div>
  <p class="lb-formula">Score = (<span>fitness×200</span> + <span>gen×10</span> + <span>bred×3</span> + <span>culled×5</span> + <span>gold</span> + <span>💎×100</span>) ÷ 100</p>`;
  if(!entries?.length){html+=`<p class="lb-empty">No entries yet.</p>`;c.innerHTML=html;return;}
  const hasImmortals=!window.isGuest&&(state.immortals||[]).length>0;
  const processed=entries.map(e=>({...e,displayScore:Math.floor((safeNum(e.rawFitness||e.highestFitness)*200+safeNum(e.rawGeneration||e.generation)*10+safeNum(e.rawTotalBred||e.totalBred)*3+safeNum(e.rawTotalCulled||e.totalCulled)*5+safeNum(e.rawTotalGoldEarned||e.totalGoldEarned)+safeNum(e.rawTotalDiamondsEarned||e.totalDiamondsEarned)*100)/100)})).sort((a,b)=>b.displayScore-a.displayScore);
  // Store targets in a global map so onclick never has to embed strings in HTML
  window._pvpTargets={};
  html+=`<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>MILESTONES</th><th>GEN</th><th></th></tr></thead><tbody>`;
  processed.forEach((e,i)=>{
    const rank=i+1,isYou=e.uid===currentUid;
    const nameDisplay=`${e.selectedIcon?e.selectedIcon+' ':''}${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}`;
    const msDone=safeNum(e.milestoneDone||e.completedMilestones);
    const msDisplay=currentTotal?`${fmt(msDone)}/${fmt(currentTotal)}`:`${fmt(msDone)}`;
    let fightBtn='';
    if(!isYou&&hasImmortals){
      const key='t'+i;
      window._pvpTargets[key]={uid:e.uid,username:e.username||'Anonymous'};
      fightBtn=`<button class="lb-fight-btn" onclick="window._pvpFight('${key}')">⚔</button>`;
    }
    const visitBtn=!isYou?`<button class="lb-fight-btn" style="border-color:var(--score);color:var(--score)" onclick="window.visitCity('${e.uid}','${esc(e.username||'Anonymous')}')">🏙️</button>`:'';
    const btns=[fightBtn,visitBtn].filter(Boolean).join(' ');
    html+=`<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}"><td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td><td class="lb-name">${nameDisplay}</td><td class="lb-score">${fmt(e.displayScore)}</td><td>${msDisplay}</td><td>${fmt(safeNum(e.generation))}</td><td>${btns}</td></tr>`;
  });
  html+=`</tbody></table>`;c.innerHTML=html;
};
window.renderLeaderboardLoading=()=>{const c=document.getElementById('leaderboard-container');if(c)c.innerHTML='<p class="lb-loading">Loading leaderboard…</p>';};

window.visitCity=(uid,username)=>{
  // Calls into auth.js which fetches and displays the city
  window._visitCityFromAuth?.(uid,username);
};

window.openUsernameModal=()=>{
  document.getElementById('username-modal').classList.remove('hidden');
  const inp=document.getElementById('username-input');
  if(window._currentUsername)inp.value=window._currentUsername;
  document.getElementById('username-message').textContent='';
};
window.skipUsername=()=>document.getElementById('username-modal').classList.add('hidden');

window.switchTab=(tab)=>{
  currentTab=tab;
  document.querySelectorAll('.panel').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('#tab-bar .tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if(tab==='combat')document.getElementById('tab-combat')?.classList.remove('has-badge');
  if(tab==='population')renderPopulation();
  if(tab==='upgrades')renderUpgrades();
  if(tab==='research')renderResearch();
  if(tab==='milestones')renderMilestones();
  if(tab==='vault')renderGeneVault();
  if(tab==='combat')renderCombat();
  if(tab==='leaderboard')window.refreshLeaderboard?.();
  if(tab==='city'){tickCityGold();renderCity();}
  if(tab==='login')renderLogin();
};

// ═══════════════════════════════════════════════════════════
//  DAILY LOGIN
// ═══════════════════════════════════════════════════════════
const DAILY_LOGIN_REWARDS=[
  {day:1,  gp:30,  dia:0,       label:'Day 1',   desc:'+30 🧪'},
  {day:2,  gp:60,  dia:0,       label:'Day 2',   desc:'+60 🧪'},
  {day:3,  gp:90,  dia:0,       label:'Day 3',   desc:'+90 🧪'},
  {day:4,  gp:120, dia:0,       label:'Day 4',   desc:'+120 🧪'},
  {day:5,  gp:150, dia:0,       label:'Day 5+',  desc:'+150 🧪 (repeating)'},
];
const FORTNIGHT_DIA_REWARD=1000000;
const FORTNIGHT_DAYS=14;

function checkLoginReward(){
  const today=new Date().toDateString();
  if(state.lastLoginDate===today)return; // already claimed today
  const yesterday=new Date(Date.now()-86400000).toDateString();
  const wasYesterday=state.lastLoginDate===yesterday;
  if(!wasYesterday&&state.lastLoginDate)state.loginStreak=0; // streak broken
  state.loginStreak=safeNum(state.loginStreak)+1;
  state.totalLoginDays=safeNum(state.totalLoginDays)+1;
  state.lastLoginDate=today;
  // GP reward
  const dayIdx=Math.min(state.loginStreak,5)-1;
  const reward=DAILY_LOGIN_REWARDS[dayIdx>=0?dayIdx:0];
  const gp=reward.gp;
  state.genePoints+=gp;
  addLog(`📅 Day ${state.loginStreak} login! +${gp} 🧪`,'gp');
  // Fortnight diamond reward
  if(state.totalLoginDays%FORTNIGHT_DAYS===0){
    state.diamonds+=FORTNIGHT_DIA_REWARD;
    state.totalDiamondsEarned+=FORTNIGHT_DIA_REWARD;
    addLog(`💎 Fortnight bonus! +${fmt(FORTNIGHT_DIA_REWARD)} 💎`,'diamond');
  }
  // Don't trigger checkMilestones here to avoid recursive issues on load
}
window.checkLoginReward=checkLoginReward;

function renderLogin(){
  const c=document.getElementById('login-reward-container');if(!c)return;
  const today=new Date().toDateString();
  const claimedToday=state.lastLoginDate===today;
  const streak=safeNum(state.loginStreak);
  const totalDays=safeNum(state.totalLoginDays);
  const nextFortnight=FORTNIGHT_DAYS-(totalDays%FORTNIGHT_DAYS);

  let html=`<div style="margin-bottom:20px">
    <p style="color:var(--text);font-size:14px;letter-spacing:2px;margin-bottom:4px">// DAILY LOGIN REWARDS</p>
    <p style="color:var(--muted);font-size:11px">Log in every day to build your streak. Missing a day resets it.</p>
  </div>`;

  // Streak info
  html+=`<div style="border:1px solid var(--border);background:var(--surface);padding:14px 16px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap">
    <div><div style="color:var(--muted);font-size:10px;letter-spacing:2px">CURRENT STREAK</div><div style="color:var(--gp);font-size:22px;font-weight:bold">${streak}</div></div>
    <div><div style="color:var(--muted);font-size:10px;letter-spacing:2px">TOTAL DAYS</div><div style="color:var(--text);font-size:22px">${totalDays}</div></div>
    <div><div style="color:var(--muted);font-size:10px;letter-spacing:2px">NEXT FORTNIGHT BONUS</div><div style="color:var(--diamond);font-size:16px">${nextFortnight} day${nextFortnight!==1?'s':''}</div></div>
    <div><div style="color:var(--muted);font-size:10px;letter-spacing:2px">TODAY</div><div style="color:${claimedToday?'var(--green)':'var(--gold)'};font-size:14px">${claimedToday?'✓ CLAIMED':'⏳ NOT YET'}</div></div>
  </div>`;

  // Reward cards — show current day and next few
  html+=`<p style="color:var(--gp);font-size:10px;letter-spacing:3px;margin-bottom:12px">// STREAK REWARDS</p>`;
  html+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:24px">`;
  DAILY_LOGIN_REWARDS.forEach((r,i)=>{
    const isActive=streak===r.day||(r.day===5&&streak>=5);
    const isPast=streak>r.day&&!(r.day===5&&streak>=5);
    const isCurrent=isActive&&!claimedToday;
    html+=`<div style="border:1px solid ${isActive?'var(--gp)':isPast?'var(--dimgreen)':'var(--border)'};background:${isActive?'#060e06':isPast?'#030803':'var(--surface)'};padding:12px;text-align:center">
      <div style="color:${isActive?'var(--gp)':isPast?'var(--dimgreen)':'var(--muted)'};font-size:10px;letter-spacing:1px;margin-bottom:6px">${r.label}</div>
      <div style="font-size:20px;margin-bottom:4px">🧪</div>
      <div style="color:${isActive?'var(--gp)':'var(--muted)'};font-size:13px;font-weight:bold">${r.gp} GP</div>
      ${isPast?'<div style="color:var(--dimgreen);font-size:10px;margin-top:4px">✓</div>':''}
      ${isActive&&!claimedToday?'<div style="color:var(--gold);font-size:10px;margin-top:4px">← TODAY</div>':''}
      ${isActive&&claimedToday?'<div style="color:var(--green);font-size:10px;margin-top:4px">✓ CLAIMED</div>':''}
    </div>`;
  });
  html+=`</div>`;

  // Fortnight reward
  html+=`<div style="border:1px solid var(--dimblu);background:#00090f;padding:14px 16px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <p style="color:var(--diamond);font-size:12px;letter-spacing:2px;margin-bottom:4px">FORTNIGHT BONUS</p>
        <p style="color:var(--muted);font-size:11px">Every 14 consecutive logins</p>
      </div>
      <div style="text-align:right">
        <div style="color:var(--diamond);font-size:18px">+1,000,000 💎</div>
        <div style="color:var(--muted);font-size:10px;margin-top:2px">Next in ${nextFortnight} day${nextFortnight!==1?'s':''}</div>
      </div>
    </div>
  </div>`;

  c.innerHTML=html;
}
window.renderLogin=renderLogin;

window.addLog=(text,type='')=>{
  const el=document.getElementById('log-output');if(!el)return;
  const div=document.createElement('div');
  div.className='log-entry'+(type?` ${type}`:'');div.textContent=`[${ts()}] ${text}`;
  el.prepend(div);
  while(el.children.length>200)el.removeChild(el.lastChild);
};

function ts(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

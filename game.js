'use strict';
// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const TRAIT_KEYS=['speed','strength','stamina','intelligence','resilience'];
const TRAIT_ABR=['SPD','STR','STA','INT','RES'];
const TRAIT_MAX=50;
const POP_CAP_TABLE=[20,25,30,40,60,100];
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
  {id:'popCap',name:'Expanded Habitat',desc:'Raise the population cap.',levels:[{cost:60,label:'Lv1—20→25'},{cost:200,label:'Lv2—25→30'},{cost:600,label:'Lv3—30→40'},{cost:2000,label:'Lv4—40→60'},{cost:7000,label:'Lv5—60→100'}]},
  {id:'mutation',name:'Mutation Boost',desc:'Higher mutation rate and stronger positive mutations.',levels:[{cost:25,label:'Lv1—15%→25%'},{cost:75,label:'Lv2—25%→40%'},{cost:200,label:'Lv3—40%→60%'},{cost:600,label:'Lv4—always beneficial'},{cost:2000,label:'Lv5—two traits mutate'},{cost:8000,label:'Lv6—double bonus'}]},
  {id:'traitAmp',name:'Trait Amplifier',desc:"Offspring more likely to inherit the stronger parent's trait.",levels:[{cost:50,label:'Lv1—15%'},{cost:160,label:'Lv2—30%'},{cost:450,label:'Lv3—55%'},{cost:1400,label:'Lv4—always stronger'},{cost:4500,label:'Lv5—always stronger +bonus'}]},
  {id:'breedYield',name:'Breeding Yield',desc:'Earn more gold per offspring.',levels:[{cost:30,label:'Lv1—3g'},{cost:90,label:'Lv2—6g'},{cost:280,label:'Lv3—12g'},{cost:800,label:'Lv4—25g'},{cost:2500,label:'Lv5—50g'},{cost:8000,label:'Lv6—100g'}]},
  {id:'cullValue',name:"Butcher's Eye",desc:'More gold when culling.',levels:[{cost:20,label:'Lv1—+3g'},{cost:55,label:'Lv2—+7g'},{cost:150,label:'Lv3—+15g'},{cost:450,label:'Lv4—+30g'},{cost:1500,label:'Lv5—+60g'},{cost:5000,label:'Lv6—+120g'}]},
  {id:'selective',name:'Selective Breeding',desc:'Hand-pick your own breeding pairs.',levels:[{cost:40,label:'One-time — unlocks BREED SELECTED'}]},
  {id:'cullInsight',name:'Culling Insight',desc:'Cull multiple weak creatures at once.',levels:[{cost:100,label:'Lv1—cull 2'},{cost:350,label:'Lv2—cull 3'},{cost:1200,label:'Lv3—cull 5'},{cost:4000,label:'Lv4—cull 8'},{cost:14000,label:'Lv5—cull 12'}]},
  {id:'lineageMem',name:'Lineage Memory',desc:'Offspring can recall best-ever trait values.',levels:[{cost:150,label:'Lv1—5%'},{cost:500,label:'Lv2—12%'},{cost:1800,label:'Lv3—25%'},{cost:6000,label:'Lv4—40%'},{cost:20000,label:'Lv5—60%'}]},
  {id:'hybridVigor',name:'Hybrid Vigor',desc:'Post-inheritance bonus to top traits.',levels:[{cost:80,label:'Lv1—10% +1'},{cost:300,label:'Lv2—22% +2'},{cost:1000,label:'Lv3—35% +3'},{cost:3500,label:'Lv4—50% all above avg'}]},
  {id:'adaptiveGenetics',name:'Adaptive Genetics',desc:'Unlucky traits nudged toward parent average.',levels:[{cost:100,label:'Lv1—20%'},{cost:400,label:'Lv2—45%'},{cost:1500,label:'Lv3—70%'},{cost:5000,label:'Lv4—always corrects'}]},
  {id:'autoBreeder',name:'Auto-Breeder',desc:'Automatically breeds at set speed.',levels:[{cost:500,label:'Lv1—0.2/sec'},{cost:2000,label:'Lv2—0.5/sec'},{cost:8000,label:'Lv3—1/sec'},{cost:30000,label:'Lv4—2/sec'},{cost:100000,label:'Lv5—5/sec'}]},
];
const AUTO_RATES=[0,0.2,0.5,1,2,5];

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
  return{atk,spd,def,hp,crit,dodge,regen};
}

// ═══════════════════════════════════════════════════════════
//  GENE VAULTS
// ═══════════════════════════════════════════════════════════
const GENE_VAULTS=[
  {id:'aquatic',name:'Aquatic Genome',theme:'DEEP SEA',cssClass:'vb-aquatic',cost:1000,desc:'Specimens from deep ocean thermal vents.',
   icons:['🐋','🐬','🦈','🐙','🦑','🐡','🐠','🦞','🦀','🐚','🌊','🐸','🦭','🐳','🦐','🐟','🐊','🫧','🪸','🦕','🌀','💧','🐉','🦎','🔵']},
  {id:'flora',name:'Flora Strain',theme:'OVERGROWTH',cssClass:'vb-flora',cost:1000,desc:'From ancient seed vaults and jungle biomass.',
   icons:['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🍁','🌾','🌲','🌳','🌴','🌵','🎋','🍄','🌱','🌼','💐','🍃','🎄','🪴','🌏','🪨','🍂','🌍']},
  {id:'cosmos',name:'Cosmos Sequence',theme:'DEEP SPACE',cssClass:'vb-cosmos',cost:1000,desc:'Extraterrestrial material from meteorite fragments.',
   icons:['🌟','⭐','💫','✨','🌙','🌠','🚀','🛸','🪐','☄️','🌌','🔭','🛰️','🌍','🌕','🌑','🪨','🌒','🌓','🌔','🌛','🌜','🌝','🌞','🔆']},
  {id:'predator',name:'Apex Predator',theme:'HUNT',cssClass:'vb-predator',cost:1000,desc:'From the most dangerous specimens ever catalogued.',
   icons:['🦁','🐯','🐆','🐻','🦊','🦝','🐺','🦅','🦉','🐍','🦂','🕷️','🦇','🦃','🦚','🦜','🦋','🪲','🐝','🦏','🐘','🦬','🐃','🦌','🔥']},
  {id:'ancient',name:'Ancient Legacy',theme:'PRIMORDIAL',cssClass:'vb-ancient',cost:1000,desc:'Relics from civilisations that understood genetics before us.',
   icons:['⚔️','🛡️','👑','🏺','🗿','🪬','🧿','🔱','⚜️','🪄','🗡️','🏛️','⚖️','📜','🔮','💎','🧬','🌀','🔯','⚗️','🏆','🎭','🎪','🎯','🎲']},
];
// Boss icons (PvE exclusive — 4 total)
const PVE_BOSS_ICONS=['🩸','👁️','💀','🌑'];
const TOTAL_VAULT_ICONS=125;
const TOTAL_ICONS=TOTAL_VAULT_ICONS+PVE_BOSS_ICONS.length; // 129

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
//  iconR only at bosses: stages 10, 20, 30, 37
// ═══════════════════════════════════════════════════════════
const PVE_STAGES=[
  // ACT 1 — The Awakening
  {id:'pve1', act:1,name:'The Proving Ground',   desc:'Your first opponent. A weak specimen bred for testing.',enemies:1,eLevel:1, gpR:2, iconR:null,boss:false},
  {id:'pve2', act:1,name:'Twin Threat',           desc:'Two opponents at once. Learn to manage your attacks carefully.',enemies:2,eLevel:1, gpR:2, iconR:null,boss:false},
  {id:'pve3', act:1,name:'The Gauntlet',          desc:'Three foes of growing strength. Your first real challenge.',enemies:3,eLevel:2, gpR:3, iconR:null,boss:false},
  {id:'pve4', act:1,name:'Elite Specimen',        desc:'A single elite champion. Do not underestimate them.',enemies:1,eLevel:4, gpR:3, iconR:null,boss:false},
  {id:'pve5', act:1,name:'Pack Hunt',             desc:'A coordinated pack. Speed wins here.',enemies:3,eLevel:3, gpR:4, iconR:null,boss:false},
  {id:'pve6', act:1,name:'The Colosseum',         desc:'Two apex predators bred for the arena.',enemies:2,eLevel:5, gpR:4, iconR:null,boss:false},
  {id:'pve7', act:1,name:'Ancient Bloodline',     desc:'A creature of ancient genetic heritage.',enemies:1,eLevel:7, gpR:5, iconR:null,boss:false},
  {id:'pve8', act:1,name:'The Horde',             desc:'Four opponents simultaneously. Pure chaos.',enemies:4,eLevel:4, gpR:5, iconR:null,boss:false},
  {id:'pve9', act:1,name:'Omega Trial',           desc:'Three Omega-class specimens. The hardest Act 1 test.',enemies:3,eLevel:7, gpR:6, iconR:null,boss:false},
  {id:'pve10',act:1,name:'⚔ BOSS: First Reckoning',desc:'The end of Act 1. One perfect specimen. Defeat it to claim the first boss icon.',enemies:1,eLevel:12,gpR:10,iconR:'🩸',boss:true},
  // ACT 2 — The Arena
  {id:'pve11',act:2,name:"Veteran's Arena",       desc:'Seasoned warriors hardened by combat.',enemies:2,eLevel:9, gpR:6, iconR:null,boss:false},
  {id:'pve12',act:2,name:'Blood Sport',           desc:'Three gladiators bred purely for killing.',enemies:3,eLevel:9, gpR:7, iconR:null,boss:false},
  {id:'pve13',act:2,name:'Elite Squad',           desc:'Four elite units fighting in formation.',enemies:4,eLevel:10,gpR:8, iconR:null,boss:false},
  {id:'pve14',act:2,name:'The Apex',              desc:'One supremely optimised specimen.',enemies:1,eLevel:14,gpR:8, iconR:null,boss:false},
  {id:'pve15',act:2,name:'Coordinated Strike',    desc:'Three enemies that attack in perfect unison.',enemies:3,eLevel:11,gpR:9, iconR:null,boss:false},
  {id:'pve16',act:2,name:'Grand Tournament',      desc:'Five opponents in sequence. Prove your endurance.',enemies:5,eLevel:10,gpR:10,iconR:null,boss:false},
  {id:'pve17',act:2,name:'Twin Champions',        desc:'Two individually powerful champions.',enemies:2,eLevel:14,gpR:10,iconR:null,boss:false},
  {id:'pve18',act:2,name:'The Infinite Horde',    desc:'Six opponents at once. Overwhelming numbers.',enemies:6,eLevel:9, gpR:11,iconR:null,boss:false},
  {id:'pve19',act:2,name:'Legacy of Blood',       desc:'Three specimens descended from legendary lineages.',enemies:3,eLevel:15,gpR:12,iconR:null,boss:false},
  {id:'pve20',act:2,name:'👁 BOSS: The Reaper',   desc:'The end of Act 2. An ancient reaper of unmatched speed. Claim the second boss icon.',enemies:1,eLevel:20,gpR:15,iconR:'👁️',boss:true},
  // ACT 3 — The Pantheon
  {id:'pve21',act:3,name:'Platinum Arena',        desc:'Only the most refined specimens compete here.',enemies:2,eLevel:17,gpR:10,iconR:null,boss:false},
  {id:'pve22',act:3,name:'Ancient Legion',        desc:'Four warriors from an ancient martial bloodline.',enemies:4,eLevel:16,gpR:11,iconR:null,boss:false},
  {id:'pve23',act:3,name:'Perfect Specimens',     desc:'Three creatures representing genetic near-perfection.',enemies:3,eLevel:19,gpR:12,iconR:null,boss:false},
  {id:'pve24',act:3,name:'The Pantheon',          desc:'Five champions who have never been defeated.',enemies:5,eLevel:17,gpR:13,iconR:null,boss:false},
  {id:'pve25',act:3,name:'Legendary Pack',        desc:'Four apex predators moving as a coordinated unit.',enemies:4,eLevel:20,gpR:14,iconR:null,boss:false},
  {id:'pve26',act:3,name:'Twin Titans',           desc:'Two colossal specimens of extraordinary power.',enemies:2,eLevel:25,gpR:15,iconR:null,boss:false},
  {id:'pve27',act:3,name:'The Last Army',         desc:'Six enemies — remnants of a legendary warband.',enemies:6,eLevel:18,gpR:15,iconR:null,boss:false},
  {id:'pve28',act:3,name:'Omega Division',        desc:'Three Omega-class elites. Twice as formidable as before.',enemies:3,eLevel:25,gpR:16,iconR:null,boss:false},
  {id:'pve29',act:3,name:'The Gauntlet Returns',  desc:'Five strong opponents with no respite between.',enemies:5,eLevel:22,gpR:18,iconR:null,boss:false},
  {id:'pve30',act:3,name:'💀 BOSS: The Ancient One',desc:'The end of Act 3. A creature evolved beyond conventional limits.',enemies:1,eLevel:35,gpR:20,iconR:'💀',boss:true},
  // ACT 4 — The Final War
  {id:'pve31',act:4,name:'War Room',              desc:'Three elite tacticians with devastating synergy.',enemies:3,eLevel:30,gpR:15,iconR:null,boss:false},
  {id:'pve32',act:4,name:'The Immortal Threat',   desc:'Four creatures that refuse to stay down.',enemies:4,eLevel:32,gpR:16,iconR:null,boss:false},
  {id:'pve33',act:4,name:'Final Legion',          desc:'Five legendary soldiers in their finest hour.',enemies:5,eLevel:30,gpR:18,iconR:null,boss:false},
  {id:'pve34',act:4,name:'The Convergence',       desc:'Two perfect specimens — the pinnacle of separate lineages.',enemies:2,eLevel:40,gpR:20,iconR:null,boss:false},
  {id:'pve35',act:4,name:'Omega Prime',           desc:'Three Omega Prime specimens. The absolute highest tier.',enemies:3,eLevel:40,gpR:22,iconR:null,boss:false},
  {id:'pve36',act:4,name:'The Last Trial',        desc:'Four enemies at the peak of their power.',enemies:4,eLevel:45,gpR:25,iconR:null,boss:false},
  {id:'pve37',act:4,name:'🌑 BOSS: Eternal Champion',desc:'Never defeated. Never tired. The final boss. Claim the ultimate icon.',enemies:1,eLevel:60,gpR:50,iconR:'🌑',boss:true},
];

// ── Combat helpers ────────────────────────────────────────
function makePveEnemy(level,idx=0){
  const base=80+level*30;
  const names=['Predator','Apex','Champion','Titan','Omega','Reaper','Ancient','Berserker','Phantom','Colossus'];
  const v=base+rand(-8,8);
  return{atk:v,spd:Math.max(30,v-10-idx*4),def:Math.max(20,v-18),hp:BASE_HP+level*45,
         crit:level>=15?0.15:0,dodge:level>=20?0.10:0,regen:level>=25?Math.floor(level*1.5):0,
         name:`${names[idx%names.length]} ${String.fromCharCode(65+idx)}`};
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
   tiers:[{id:'mt_pop_5',name:'Small Group',target:5,gp:1},{id:'q_pop_8',name:'Growing',target:8,gp:1},{id:'mt_pop_12',name:'Cluster',target:12,gp:1},{id:'mt_pop_20',name:'Colony',target:20,gp:1},{id:'mt_pop_30',name:'Settlement',target:30,gp:2},{id:'mt_pop_40',name:'Commune',target:40,gp:2},{id:'mt_pop_60',name:'Township',target:60,gp:3},{id:'mt_pop_100',name:'City',target:100,gp:3}]},
  {id:'upgrades',name:'UPGRADES',val:s=>GOLD_UPGRADES.reduce((n,d)=>n+safeNum(s.upgrades?.[d.id]),0),unit:'gold upgrade levels',
   tiers:[{id:'q_first_upgrade',name:'First Investment',target:1,gp:1},{id:'mt_upg_5',name:'Invested',target:5,gp:1},{id:'mt_upg_15',name:'Committed',target:15,gp:1},{id:'mt_upg_25',name:'Dedicated',target:25,gp:2},{id:'mt_upg_35',name:'Obsessed',target:35,gp:2},{id:'mt_upg_45',name:'Expert',target:45,gp:3},{id:'mt_upg_55',name:'Gold Maxed',target:55,gp:4}]},
  {id:'research',name:'RESEARCH',val:s=>safeNum(s.research?.labInterns)+safeNum(s.research?.geneAnalysts)+safeNum(s.research?.lineageArchivists)+(s.research?.headOfResearch?1:0)+(s.research?.automatedSequencer?1:0),unit:'researchers',
   tiers:[{id:'m_first_researcher',name:'Research Initiative',target:1,gp:1},{id:'mt_res_3',name:'Growing Team',target:3,gp:1},{id:'mt_res_8',name:'Division',target:8,gp:2},{id:'mt_res_15',name:'Department',target:15,gp:2},{id:'mt_res_25',name:'Full Lab',target:25,gp:3},{id:'mt_res_37',name:'Complete Division',target:37,gp:4}]},
  {id:'icons',name:'ICON COLLECTION',val:s=>(s.ownedIcons||[]).length,unit:'icons',
   tiers:[{id:'mt_icon_1',name:'First Find',target:1,gp:0},{id:'mt_icon_5',name:'Growing Set',target:5,gp:1},{id:'mt_icon_15',name:'Collector',target:15,gp:1},{id:'mt_icon_30',name:'Curator',target:30,gp:2},{id:'mt_icon_50',name:'Archivist',target:50,gp:2},{id:'mt_icon_80',name:'Master Collector',target:80,gp:3},{id:'mt_icon_129',name:'Complete Set',target:129,gp:5}]},
  {id:'immortals',name:'IMMORTALS',val:s=>(s.immortals||[]).length,unit:'immortals',
   tiers:[{id:'mt_imm_1',name:'First Champion',target:1,gp:2},{id:'mt_imm_3',name:'Elite Guard',target:3,gp:3},{id:'mt_imm_5',name:'Immortal Legion',target:5,gp:4}]},
  {id:'pve',name:'PVE CAMPAIGN',val:s=>(s.pveCompleted||[]).length,unit:'stages cleared',
   tiers:[{id:'mt_pve_1',name:'First Blood',target:1,gp:2},{id:'mt_pve_5',name:'Veteran Fighter',target:5,gp:3},{id:'mt_pve_10',name:'Act 1 Complete',target:10,gp:4},{id:'mt_pve_20',name:'Act 2 Complete',target:20,gp:5},{id:'mt_pve_30',name:'Act 3 Complete',target:30,gp:6},{id:'mt_pve_37',name:'Conqueror',target:37,gp:10}]},
];

// ═══════════════════════════════════════════════════════════
//  SECRET MILESTONES — unusual deliberate actions only
// ═══════════════════════════════════════════════════════════
const SECRET_MILESTONES=[
  {id:'ms_s_bg',name:'You Wish',desc:'Try to set your username to "breeding-ground".',check:s=>!!s.triedUsernameBG,gp:5},
  {id:'ms_s_night',name:'Night Owl',desc:'Save the game between 2am and 4am local time.',check:s=>!!s.savedAtMidnight,gp:5},
  {id:'ms_s_incest',name:'Incestuous',desc:'Use Selective Breeding on the same pair 10 times in a row.',check:s=>safeNum(s.sameParentCount)>=10,gp:5},
  {id:'ms_s_obsessed',name:'Obsessed',desc:'Open the same Gene Vault 50+ times.',check:s=>GENE_VAULTS.some(v=>safeNum(s[`vault_${v.id}_opens`])>=50),gp:5},
  {id:'ms_s_thirsty',name:'Thirsty',desc:'Attempt to breed when population is at the cap 10 times.',check:s=>safeNum(s.breedCapHits)>=10,gp:5},
  {id:'ms_s_refresh',name:'Refresh Addict',desc:'Refresh the leaderboard 20 times.',check:s=>safeNum(s.lbRefreshCount)>=20,gp:5},
  {id:'ms_s_auto',name:'Auto Addict',desc:'Let the auto-breeder run 500 breeds without a single manual breed.',check:s=>safeNum(s.autoOnlyBreeds)>=500,gp:5},
  {id:'ms_s_iron',name:'Iron Will',desc:'Reach generation 200 without buying any diamond upgrades.',check:s=>s.generation>=200&&safeNum(s.upgrades?.traitCapBoost)===0&&safeNum(s.upgrades?.eliteMutation)===0&&safeNum(s.upgrades?.deepArchive)===0,gp:5},
  {id:'ms_s_completionist',name:'Completionist',desc:`Own all ${TOTAL_ICONS} icons.`,check:s=>(s.ownedIcons||[]).length>=TOTAL_ICONS,gp:5},
  {id:'ms_s_pvpwin',name:'The Challenger',desc:'Win your first PvP fight.',check:s=>safeNum(s.pvpWins)>=1,gp:5},
  {id:'ms_s_dispose',name:'Necessary Evil',desc:'Dispose of an immortal.',check:s=>!!s.hasDisposedImmortal,gp:5},
];

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let state={};
let currentTab='log',selectedForBreeding=[],bestEverTraits={};
let autoBreedInterval=null,autoBreederPaused=false,autoBredTotal=0;
let pendingImmortalId=null,combatSubTab='pve';
let pvpTarget=null,pvpMyImmortal=null;

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
    breedCapHits:0,lbRefreshCount:0,autoOnlyBreeds:0,hasDisposedImmortal:false,
    diamondBuffer:0,lastArchivistGen:1,totalResearchDiamondsEarned:0,
    totalVaultOpens:0,ownedIcons:[],selectedIcon:null,
    vault_aquatic_opens:0,vault_flora_opens:0,vault_cosmos_opens:0,
    vault_predator_opens:0,vault_ancient_opens:0,
    immortals:[],combatSlots:1,pveCompleted:[],pvpWins:0,pvpLosses:0,combatLog:[],
    research:{labInterns:0,geneAnalysts:0,lineageArchivists:0,headOfResearch:false,automatedSequencer:false},
    upgrades:{popCap:0,mutation:0,traitAmp:0,breedYield:0,cullValue:0,selective:0,cullInsight:0,lineageMem:0,hybridVigor:0,adaptiveGenetics:0,autoBreeder:0,traitCapBoost:0,eliteMutation:0,deepArchive:0},
  };
}

function getMaxPop(){return POP_CAP_TABLE[safeNum(state.upgrades?.popCap)]??20;}
function getBreedGold(){return[1,3,6,12,25,50,100][safeNum(state.upgrades?.breedYield)]??1;}
function getCullBonus(){return[0,3,7,15,30,60,120][safeNum(state.upgrades?.cullValue)]??0;}
function getCullCount(){return[1,2,3,5,8,12][safeNum(state.upgrades?.cullInsight)]??1;}
function getMutRate(){return[0.15,0.25,0.40,0.60,1.0,1.0][safeNum(state.upgrades?.mutation)]??0.15;}
function getMutBonus(){return safeNum(state.upgrades?.mutation)>=6?2:1;}
function getAmpRate(){return[0,0.15,0.30,0.55,1.0,1.0][safeNum(state.upgrades?.traitAmp)]??0;}
function getAmpBonus(){return safeNum(state.upgrades?.traitAmp)>=5;}
function getMemRate(){return[0,0.05,0.12,0.25,0.40,0.60][safeNum(state.upgrades?.lineageMem)]??0;}
function getMemBonus(){return[0,1,2][safeNum(state.upgrades?.deepArchive)]??0;}
function getTraitCap(){return TRAIT_MAX+([0,5,10,20,35,55,75][safeNum(state.upgrades?.traitCapBoost)]??0);}
function researchMult(){return(state.research?.headOfResearch?1.5:1)*(state.research?.automatedSequencer?2:1);}
function researchBreedYield(){return safeNum(state.research?.labInterns)*0.15*researchMult();}
function researchCullYield(){return safeNum(state.research?.geneAnalysts)*0.4*researchMult();}
function researchArchYield(){return safeNum(state.research?.lineageArchivists)*1.0*researchMult();}
function getAutoRate(){return AUTO_RATES[safeNum(state.upgrades?.autoBreeder)]??0;}

function getMilestoneCounts(){
  const all=[...MILESTONE_TRACKS.flatMap(t=>t.tiers.map(x=>x.id)),...SECRET_MILESTONES.map(m=>m.id)];
  return{done:all.filter(id=>(state.completedMilestones||[]).includes(id)).length,total:all.length};
}
window.getMilestoneCounts=getMilestoneCounts;

window.calcScore=()=>Math.floor(
  (safeNum(state.highestFitness)*200+safeNum(state.generation)*10+
   safeNum(state.totalBred)*3+safeNum(state.totalCulled)*5+
   safeNum(state.totalGoldEarned)+safeNum(state.totalDiamondsEarned)*100)/10
);

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
    hasDisposedImmortal:!!s.hasDisposedImmortal,
    diamondBuffer:safeNum(s.diamondBuffer),lastArchivistGen:safeNum(s.lastArchivistGen,1),
    totalResearchDiamondsEarned:safeNum(s.totalResearchDiamondsEarned),totalVaultOpens:safeNum(s.totalVaultOpens),
    ownedIcons:Array.isArray(s.ownedIcons)?s.ownedIcons:[],selectedIcon:s.selectedIcon||null,
    vault_aquatic_opens:safeNum(s.vault_aquatic_opens),vault_flora_opens:safeNum(s.vault_flora_opens),
    vault_cosmos_opens:safeNum(s.vault_cosmos_opens),vault_predator_opens:safeNum(s.vault_predator_opens),
    vault_ancient_opens:safeNum(s.vault_ancient_opens),
    completedMilestones:Array.isArray(s.completedMilestones)?s.completedMilestones:[],
    milestoneDiamondsAwarded:Array.isArray(s.milestoneDiamondsAwarded)?s.milestoneDiamondsAwarded:[],
    immortals:Array.isArray(s.immortals)?s.immortals:[],
    combatSlots:Math.max(1,safeNum(s.combatSlots,1)),
    pveCompleted:Array.isArray(s.pveCompleted)?s.pveCompleted:[],
    pvpWins:safeNum(s.pvpWins),pvpLosses:safeNum(s.pvpLosses),
    combatLog:Array.isArray(s.combatLog)?s.combatLog:[],
    research:{labInterns:safeNum(s.research?.labInterns),geneAnalysts:safeNum(s.research?.geneAnalysts),lineageArchivists:safeNum(s.research?.lineageArchivists),headOfResearch:!!s.research?.headOfResearch,automatedSequencer:!!s.research?.automatedSequencer},
    upgrades:{popCap:safeNum(s.upgrades?.popCap),mutation:safeNum(s.upgrades?.mutation),traitAmp:safeNum(s.upgrades?.traitAmp),breedYield:safeNum(s.upgrades?.breedYield),cullValue:safeNum(s.upgrades?.cullValue),selective:safeNum(s.upgrades?.selective),cullInsight:safeNum(s.upgrades?.cullInsight),lineageMem:safeNum(s.upgrades?.lineageMem),hybridVigor:safeNum(s.upgrades?.hybridVigor),adaptiveGenetics:safeNum(s.upgrades?.adaptiveGenetics),autoBreeder:safeNum(s.upgrades?.autoBreeder),traitCapBoost:safeNum(s.upgrades?.traitCapBoost),eliteMutation:safeNum(s.upgrades?.eliteMutation),deepArchive:safeNum(s.upgrades?.deepArchive)},
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
  selectedForBreeding=[];rebuildBestEverTraits();migrateLegacyProgress();checkMilestones();
  startAutoBreeder();renderAll();
};
window.initNewGame=()=>{
  state=defaultState();state.population=Array.from({length:5},()=>makeCreature());
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
  if(state.population.length<2)return addLog('Not enough creatures.','warn');
  if(state.population.length>=getMaxPop()){state.breedCapHits=safeNum(state.breedCapHits)+1;checkMilestones();return addLog(`Population cap (${fmt(getMaxPop())}) reached.`,'warn');}
  const[pA,pB]=[...state.population].sort(()=>Math.random()-0.5);
  state.autoOnlyBreeds=0;_doBreed(pA,pB);
};

window.breedSelected=()=>{
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
  if(silent){
    autoBredTotal++;state.autoOnlyBreeds=safeNum(state.autoOnlyBreeds)+1;
    if(fitness>safeNum(state.highestFitness)){state.highestFitness=fitness;addLog(`Auto: Gen ${fmt(state.generation)} NEW RECORD fitness ${fmt(fitness)}!`,'highlight');}
    else if(autoBredTotal%25===0)addLog(`Auto-Breeder: ${fmt(autoBredTotal)} breeds, gen ${fmt(state.generation)}`);
  } else {
    const ts2=TRAIT_ABR.map((a,i)=>`${a}:${child.traits[TRAIT_KEYS[i]]}`).join(' ');
    if(fitness>safeNum(state.highestFitness)){state.highestFitness=fitness;addLog(`${targeted?'TARGETED ':''}Gen ${fmt(state.generation)}: ${child.id} — NEW RECORD fitness ${fmt(fitness)}! [${ts2}]`,'highlight');}
    else addLog(`${targeted?'Targeted — ':''}Gen ${fmt(state.generation)}: ${child.id} born [${ts2}] → fitness ${fmt(fitness)}`);
  }
  checkMilestones();renderAll();
}

window.cullWeakest=()=>{
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
window.runPveStage=(stageId,immortalIds)=>{
  const stage=PVE_STAGES.find(s=>s.id===stageId);if(!stage)return;
  if((state.pveCompleted||[]).includes(stageId))return addLog('Already cleared.','warn');
  const idx=PVE_STAGES.findIndex(s=>s.id===stageId);
  if(idx>0&&!(state.pveCompleted||[]).includes(PVE_STAGES[idx-1].id))return addLog('Complete previous stage first.','warn');
  const ids=Array.isArray(immortalIds)?immortalIds:[immortalIds];
  const ims=ids.filter(Boolean).map(id=>(state.immortals||[]).find(x=>x.id===id)).filter(Boolean);
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

// VAULT
window.toggleVaultPreview=(id)=>{vaultPreviewId=vaultPreviewId===id?null:id;renderGeneVault();};
window.openVault=(id)=>{
  const vault=GENE_VAULTS.find(v=>v.id===id);if(!vault)return;
  if(state.diamonds<vault.cost)return addLog(`Need ${fmt(vault.cost)} 💎.`,'warn');
  const icon=vault.icons[Math.floor(Math.random()*vault.icons.length)];
  const owned=state.ownedIcons||[];const isDupe=owned.includes(icon);
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
window.openPvpModal=(targetUid,targetName)=>{
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
  MILESTONE_TRACKS.forEach(track=>{
    const val=track.val(state);
    track.tiers.forEach(tier=>{
      if(state.completedMilestones.includes(tier.id)||val<tier.target)return;
      state.completedMilestones.push(tier.id);state.milestoneDiamondsAwarded.push(tier.id);
      const gp=tier.gp||1;if(gp>0)state.genePoints+=gp;
      if(gp>0)addLog(`🧪 [${track.name}]: "${tier.name}" +${gp}🧪`,'gp');
      else addLog(`✓ [${track.name}]: "${tier.name}"`,'highlight');
    });
  });
  SECRET_MILESTONES.forEach(m=>{
    if(state.completedMilestones.includes(m.id)||!m.check(state))return;
    state.completedMilestones.push(m.id);state.milestoneDiamondsAwarded.push(m.id);
    const gp=m.gp||5;state.genePoints+=gp;
    addLog(`🧪 Secret: "${m.name}" +${gp}🧪`,'gp');
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
      const canImm=canImmortalise(c);
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

  // Immortals section
  const imSec=document.getElementById('immortals-section');if(!imSec)return;
  const immortals=state.immortals||[];
  if(!immortals.length){imSec.innerHTML='';return;}
  let imHtml=`<p class="immortals-title">🔱 IMMORTALS — ${fmt(state.genePoints)} 🧪 available</p><div class="immortal-cards">`;
  immortals.forEach(im=>{
    const stats=getImmortalStats(im);
    const refund=disposalGpRefund(im);
    imHtml+=`<div class="immortal-card">
      <div class="im-header"><span class="im-name">🔱 ${im.name}</span><span class="im-gp-info">Fitness ${im.fitness||'?'}</span></div>
      <div class="im-base-stats">
        <span class="im-stat">ATK <span>${stats.atk}</span></span>
        <span class="im-stat">SPD <span>${stats.spd}</span></span>
        <span class="im-stat">DEF <span>${stats.def}</span></span>
        <span class="im-stat">HP <span>${stats.hp}</span></span>
        ${stats.crit?`<span class="im-stat">CRIT <span>${Math.round(stats.crit*100)}%</span></span>`:''}
        ${stats.dodge?`<span class="im-stat">DODGE <span>${Math.round(stats.dodge*100)}%</span></span>`:''}
        ${stats.regen?`<span class="im-stat">REGEN <span>${stats.regen}/rnd</span></span>`:''}
      </div>
      <p class="im-skill-tree-label">// SKILL TREE</p>
      <div class="im-skill-tree">`;
    IM_BRANCHES.forEach(branch=>{
      imHtml+=`<div class="im-branch"><div class="im-branch-title" style="color:${branch.color}">${branch.name}</div>`;
      branch.skills.forEach((skill,idx)=>{
        const owned=(im.skills||[]).includes(skill.id);
        const blockedByOwned=skill.blocked_by.some(bid=>(im.skills||[]).includes(bid));
        const blocksOwned=skill.blocks.some(bid=>(im.skills||[]).includes(bid));
        const prevOwned=!skill.requires||(im.skills||[]).includes(skill.requires);
        const isLocked=!owned&&(!prevOwned||blockedByOwned);
        const isBlocked=!owned&&blockedByOwned;
        const canBuy=!owned&&prevOwned&&!blockedByOwned&&state.genePoints>=skill.cost;
        const nodeCls=owned?'sk-owned':isBlocked?'sk-blocked':isLocked?'sk-locked':'sk-available';
        if(idx>0){
          imHtml+=`<div class="im-connector ${owned?'conn-lit':''}" style="text-align:center;color:${owned?'var(--gp)':'var(--border)'};font-size:9px">↓</div>`;
        }
        imHtml+=`<div class="im-skill-node ${nodeCls}" ${(!owned&&!isLocked&&!isBlocked)?`onclick="buyImmortalSkill('${im.id}','${skill.id}')" title="Click to unlock"`:''}>
          <div class="im-sn-name">${skill.name}</div>
          <div class="im-sn-effect">${skill.effect}</div>`;
        if(owned)imHtml+=`<div class="im-sn-cost owned">✓ ACTIVE</div>`;
        else if(isBlocked)imHtml+=`<div class="im-sn-cost blocked">🚫 BLOCKED</div>`;
        else if(isLocked)imHtml+=`<div class="im-sn-cost locked">🔒 LOCKED</div>`;
        else imHtml+=`<div class="im-sn-cost ${canBuy?'afford':'noafford'}">${skill.cost} 🧪${canBuy?'':' (need more)'}</div>`;
        imHtml+=`</div>`;
      });
      imHtml+=`</div>`;
    });
    imHtml+=`</div>
      <button onclick="disposeImmortal('${im.id}')" style="margin-top:10px;border-color:var(--red);color:var(--red);font-size:10px;padding:4px 10px;width:auto">[ DISPOSE — recover ${refund}🧪 ]</button>
    </div>`;
  });
  imHtml+=`</div>`;
  imSec.innerHTML=imHtml;
}

function renderCombat(){
  const c=document.getElementById('combat-container');if(!c)return;
  const immortals=state.immortals||[];
  if(!immortals.length){
    c.innerHTML=`<div class="combat-locked">🔱 The Combat tab unlocks once you immortalise your first creature.<br><br>Breed a creature to fitness ${IMMORTAL_THRESHOLD} and click ⚜ IMMORTALISE in the Population tab.</div>`;
    return;
  }
  let html=`<div class="combat-subtabs">
    <button class="combat-stab ${combatSubTab==='pve'?'active':''}" onclick="setCombatTab('pve')">PVE CAMPAIGN</button>
    <button class="combat-stab ${combatSubTab==='pvp'?'active':''}" onclick="setCombatTab('pvp')">PVP</button>
  </div>`;

  if(combatSubTab==='pve'){
    html+=`<p class="pve-intro">Fight 37 stages across 4 acts. Bosses (stages 10, 20, 30, 37) award exclusive icons. Deploy multiple fighters with Gene Point upgrades.</p>`;
    // Slot upgrades
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

    // Stages by act
    const acts=[1,2,3,4];
    const actNames=['ACT 1 — THE AWAKENING','ACT 2 — THE ARENA','ACT 3 — THE PANTHEON','ACT 4 — THE FINAL WAR'];
    acts.forEach((act,ai)=>{
      const stages=PVE_STAGES.filter(s=>s.act===act);
      html+=`<p class="act-title">${actNames[ai]}</p><div class="pve-grid">`;
      stages.forEach((stage,si)=>{
        const globalIdx=PVE_STAGES.findIndex(s=>s.id===stage.id);
        const done=(state.pveCompleted||[]).includes(stage.id);
        const prevDone=globalIdx===0||(state.pveCompleted||[]).includes(PVE_STAGES[globalIdx-1].id);
        const locked=!prevDone&&!done;
        const iconOwned=stage.iconR&&(state.ownedIcons||[]).includes(stage.iconR);
        html+=`<div class="pve-card ${done?'cleared':locked?'locked':''} ${stage.boss?'boss-card':''}">
          <div class="pve-name">${stage.boss?'':'#'+( globalIdx+1)+' '}${stage.name}</div>
          <div class="pve-desc">${stage.desc}</div>
          <div class="pve-enemies">${stage.enemies} opponent${stage.enemies>1?'s':''} (level ${stage.eLevel})</div>
          <div class="pve-reward">+${stage.gpR} 🧪${stage.iconR?` <span class="icon-reward">${iconOwned?'✓':'+'}${stage.iconR}</span>`:''}</div>`;
        if(done){
          html+=`<div class="pve-cleared-badge">✓ CLEARED</div>`;
        } else if(!locked){
          html+=`<div class="pve-selectors">`;
          for(let slot=0;slot<state.combatSlots;slot++){
            html+=`<select id="pve-sel-${stage.id}-${slot}"><option value="">— slot ${slot+1} (optional${slot===0?', required':''}) —</option>${immortals.map(im=>`<option value="${im.id}">${im.name}</option>`).join('')}</select>`;
          }
          html+=`</div>`;
          html+=`<button class="btn-combat" onclick="(() => {
            const ids=[];
            for(let i=0;i<${state.combatSlots};i++){
              const el=document.getElementById('pve-sel-${stage.id}-'+i);
              if(el&&el.value)ids.push(el.value);
            }
            runPveStage('${stage.id}',ids);
          })()">[ FIGHT ]</button>`;
        } else {
          html+=`<div style="color:var(--muted);font-size:10px;margin-top:4px">Complete previous stage first</div>`;
        }
        html+=`</div>`;
      });
      html+=`</div>`;
    });

    // Last combat log
    if((state.combatLog||[]).length){
      const last=state.combatLog[0];
      html+=`<div class="combat-log-box"><p class="combat-log-title">// LAST FIGHT: ${last.stageName||''} — ${last.time||''}</p>`;
      last.log.forEach(line=>{
        const cls=line.startsWith('🏆')||line.startsWith('✓')?'win':line.startsWith('💀')||line.startsWith('✗')?'loss':line.startsWith('💥')||line.startsWith('💫')?'crit':line.startsWith('──')?'section':'';
        html+=`<div class="clog-line ${cls}">${line}</div>`;
      });
      html+=`</div>`;
    }

  } else {
    // PvP
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
        <button style="border-color:var(--green);color:var(--green)" onclick="openPvpAcceptModal('${ch.id}','${esc(ch.challengerUsername)}','${esc(ch.challengerImmortalName)}','${ch.wagerType||'none'}',${safeNum(ch.wagerAmount)})">[ ACCEPT ]</button>
        <button class="btn-secondary" onclick="window.rejectPvpChallenge?.('${ch.id}')">[ DECLINE ]</button>
      </div>
    </div>`;
  });
  el.innerHTML=html;
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
      html+=`<div class="track-prog-wrap"><div class="track-prog-bar"><div class="track-prog-fill" style="width:${pv}%"></div></div><div class="track-prog-text"><span>${fmt(prog.val)} / ${fmt(prog.nxt.target)}</span><span class="reward">${prog.nxt.gp>0?'+'+prog.nxt.gp+'🧪':''}</span></div></div>`;
    } else if(allDone){html+=`<div class="track-complete-badge">✦ ALL TIERS COMPLETE</div>`;}
    html+=`<div class="track-dots">`;
    prog.tot>0&&[...Array(prog.tot)].forEach((_,i)=>{html+=`<div class="track-dot ${i<=prog.ci?'filled':i===prog.ci+1?'current':''}"></div>`;});
    html+=`</div></div></div>`;
  });
  html+=`<p class="ms-cat-title secret-title">// ??? SECRETS — +5🧪 each</p><div class="secret-grid">`;
  SECRET_MILESTONES.forEach(m=>{
    const isDone=state.completedMilestones.includes(m.id);
    if(!isDone)html+=`<div class="ms-card ms-secret"><div class="ms-name">???</div><div class="ms-reward">+5🧪</div></div>`;
    else html+=`<div class="ms-card ms-done-secret"><div class="ms-check secret-check">✓</div><div class="ms-name">${m.name}</div><div class="ms-desc">${m.desc}</div><div class="ms-reward">+5🧪</div></div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

function renderGeneVault(){
  const c=document.getElementById('vault-container');if(!c)return;
  const owned=state.ownedIcons||[],sel=state.selectedIcon;
  const pveIconsOwned=PVE_BOSS_ICONS.filter(ic=>owned.includes(ic));
  let html=`<p class="vault-intro">Collect icons to display on the leaderboard. Vault icons: 125. Boss icons from PvE: 4. Total: 129. Duplicates refund 10%.</p>`;
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
    const isPrev=vaultPreviewId===vault.id,can=state.diamonds>=vault.cost;
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
    html+=`<button class="btn-diamond ${can?'':'cant-afford'}" onclick="openVault('${vault.id}')">[ OPEN — ${fmt(vault.cost)} 💎 ]</button></div>`;
  });
  html+=`</div>`;
  c.innerHTML=html;
}

window.renderLeaderboard=(entries,currentUid)=>{
  const c=document.getElementById('leaderboard-container');if(!c)return;
  const currentTotal=getMilestoneCounts().total;
  let html=`<div class="lb-header"><span class="lb-title">// LEADERBOARD</span><button class="lb-refresh" onclick="window.refreshLeaderboard?.()">[ REFRESH ]</button></div>
  <p class="lb-formula">Score = (<span>fitness×200</span> + <span>gen×10</span> + <span>bred×3</span> + <span>culled×5</span> + <span>gold</span> + <span>💎×100</span>) ÷ 10</p>`;
  if(!entries?.length){html+=`<p class="lb-empty">No entries yet.</p>`;c.innerHTML=html;return;}
  const hasImmortals=(state.immortals||[]).length>0;
  // Recalculate scores with current formula
  const processed=entries.map(e=>({...e,displayScore:Math.floor((safeNum(e.rawFitness||e.highestFitness)*200+safeNum(e.rawGeneration||e.generation)*10+safeNum(e.rawTotalBred||e.totalBred)*3+safeNum(e.rawTotalCulled||e.totalCulled)*5+safeNum(e.rawTotalGoldEarned||e.totalGoldEarned)+safeNum(e.rawTotalDiamondsEarned||e.totalDiamondsEarned)*100)/10)})).sort((a,b)=>b.displayScore-a.displayScore);
  html+=`<table class="lb-table"><thead><tr><th>#</th><th>PLAYER</th><th>SCORE</th><th>MILESTONES</th><th>GEN</th>${hasImmortals?'<th></th>':''}</tr></thead><tbody>`;
  processed.forEach((e,i)=>{
    const rank=i+1,isYou=e.uid===currentUid;
    const nameDisplay=`${e.selectedIcon?e.selectedIcon+' ':''}${esc(e.username||'Anonymous')}${isYou?' ◄ you':''}`;
    const msDone=safeNum(e.milestoneDone||e.completedMilestones);
    const msDisplay=currentTotal?`${fmt(msDone)}/${fmt(currentTotal)}`:`${fmt(msDone)}`;
    const fightBtn=(!isYou&&hasImmortals)?`<button class="lb-fight-btn" onclick="openPvpModal('${e.uid}','${esc(e.username||'Anonymous')}')">⚔</button>`:'';
    html+=`<tr class="${rank<=3?`lb-rank-${rank}`:''} ${isYou?'lb-you':''}"><td>${rank<=3?['🥇','🥈','🥉'][rank-1]:rank}</td><td class="lb-name">${nameDisplay}</td><td class="lb-score">${fmt(e.displayScore)}</td><td>${msDisplay}</td><td>${fmt(safeNum(e.generation))}</td>${hasImmortals?`<td>${fightBtn}</td>`:''}</tr>`;
  });
  html+=`</tbody></table>`;c.innerHTML=html;
};
window.renderLeaderboardLoading=()=>{const c=document.getElementById('leaderboard-container');if(c)c.innerHTML='<p class="lb-loading">Loading leaderboard…</p>';};

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
};

window.addLog=(text,type='')=>{
  const el=document.getElementById('log-output');if(!el)return;
  const div=document.createElement('div');
  div.className='log-entry'+(type?` ${type}`:'');div.textContent=`[${ts()}] ${text}`;
  el.prepend(div);
  while(el.children.length>200)el.removeChild(el.lastChild);
};

function ts(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

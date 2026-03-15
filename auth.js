import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc,
  collection, query, orderBy, limit, where, getDocs, addDoc, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC4DLaJ0_uIwm_ibzQ3AdEsN-pVgROk590",
  authDomain:        "breeding-ground-b275c.firebaseapp.com",
  projectId:         "breeding-ground-b275c",
  storageBucket:     "breeding-ground-b275c.firebasestorage.app",
  messagingSenderId: "80892025030",
  appId:             "1:80892025030:web:0f25c0bda0475862cbdfc7",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const GUEST_SAVE_KEY = 'breedingground_guest_save';

let currentUser      = null;
let autosaveInterval = null;
let challengesUnsub  = null;

// ── Profanity filter ──────────────────────────────────────────
const BANNED_WORDS = ['fuck','shit','cunt','nigger','nigga','faggot','fag','retard','bitch','asshole','dick','cock','pussy','whore','slut','twat','bastard','wanker','prick','arse','ass','damn','crap','bollocks','tosser','spastic','spaz','tranny'];
function containsProfanity(str) {
  const l = str.toLowerCase().replace(/[^a-z0-9]/g,'');
  return BANNED_WORDS.some(w => l.includes(w));
}

// ── GUEST MODE ────────────────────────────────────────────────
window.playAsGuest = () => {
  window.isGuest = true;
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  document.getElementById("header-user").textContent = "";
  document.getElementById("header-username").style.display = "none";
  document.getElementById("guest-badge").classList.remove("hidden");
  document.getElementById("logout-btn").textContent = "[ exit guest ]";

  try {
    const raw = localStorage.getItem(GUEST_SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      applySaveData(data);
      addLog("Guest save loaded. Welcome back.", "highlight");
    } else {
      initNewGame();
      addLog("Guest mode started. Progress saves to this browser only.", "highlight");
    }
  } catch(e) {
    console.error("Guest load error:", e);
    initNewGame();
    addLog("Could not load guest save — starting fresh.", "warn");
  }

  if (autosaveInterval) clearInterval(autosaveInterval);
  autosaveInterval = setInterval(() => { saveGame(); flashAutosave(); }, 3 * 60 * 1000);
};

// ── SAVE ──────────────────────────────────────────────────────
window.saveGame = async () => {
  if (window.isGuest) { _saveGuest(); return; }
  if (!currentUser) return;
  await _saveFirebase();
};

function _saveGuest() {
  const statusEl = document.getElementById("save-status");
  try {
    if (statusEl) { statusEl.textContent = "Saving…"; statusEl.className = "message"; }
    localStorage.setItem(GUEST_SAVE_KEY, JSON.stringify(getSaveData()));
    if (statusEl) {
      statusEl.textContent = "Saved ✓"; statusEl.className = "message success";
      setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
    }
  } catch(e) {
    console.error("Guest save error:", e);
    if (statusEl) { statusEl.textContent = "Save failed."; statusEl.className = "message error"; }
  }
}

async function _saveFirebase() {
  const statusEl = document.getElementById("save-status");
  try {
    if (statusEl) { statusEl.textContent = "Saving…"; statusEl.className = "message"; }
    const data = getSaveData(), score = calcScore(), username = window._currentUsername || null;
    const ms   = window.getMilestoneCounts ? window.getMilestoneCounts() : { done:0, total:0 };
    const h = new Date().getHours();
    if (h >= 2 && h < 4) window.notifySavedMidnight?.();
    await Promise.all([
      setDoc(doc(db,"saves",currentUser.uid), { ...data, savedAt: new Date().toISOString() }),
      setDoc(doc(db,"leaderboard",currentUser.uid), {
        uid: currentUser.uid, username, score,
        selectedIcon:   data.selectedIcon  || null,
        milestoneDone:  ms.done,
        milestoneTotal: ms.total,
        rawFitness:             data.highestFitness      || 0,
        rawGeneration:          data.generation          || 1,
        rawTotalBred:           data.totalBred           || 0,
        rawTotalCulled:         data.totalCulled         || 0,
        rawTotalGoldEarned:     data.totalGoldEarned     || 0,
        rawTotalDiamondsEarned: data.totalDiamondsEarned || 0,
        highestFitness:  data.highestFitness  || 0,
        generation:      data.generation      || 1,
        totalBred:       data.totalBred       || 0,
        totalCulled:     data.totalCulled     || 0,
        totalDiamondsEarned: data.totalDiamondsEarned || 0,
        updatedAt: new Date().toISOString(),
      }),
    ]);
    if (statusEl) {
      statusEl.textContent = "Saved ✓"; statusEl.className = "message success";
      setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
    }
  } catch(e) {
    console.error("Save error:", e);
    if (statusEl) { statusEl.textContent = "Save failed."; statusEl.className = "message error"; }
  }
}

// ── AUTH STATE ────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (window.isGuest) return; // Don't interfere with guest session
  if (user) {
    currentUser = user;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("header-user").textContent = user.email;
    document.getElementById("guest-badge").classList.add("hidden");
    await loadGame();
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(async () => { await saveGame(); flashAutosave(); }, 3 * 60 * 1000);
    subscribeToChallenges();
  } else {
    currentUser = null;
    if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
    if (challengesUnsub)  { challengesUnsub(); challengesUnsub = null; }
    if (window.stopAutoBreeder) window.stopAutoBreeder();
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("game-screen").classList.add("hidden");
  }
});

function flashAutosave() {
  const el = document.getElementById("autosave-flash");
  if (!el) return;
  el.textContent = "autosaved ✓"; el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 3000);
}

// ── AUTH UI ───────────────────────────────────────────────────
window.showTab = (tab) => {
  document.getElementById("login-form").classList.toggle("hidden",    tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  document.querySelectorAll(".auth-tab").forEach((b, i) =>
    b.classList.toggle("active", (i===0&&tab==="login")||(i===1&&tab==="register"))
  );
  setAuthMsg("");
};

function setAuthMsg(msg, type="") {
  const el = document.getElementById("auth-message");
  el.textContent = msg; el.className = "message" + (type ? ` ${type}` : "");
}

window.register = async () => {
  const email = document.getElementById("reg-email").value.trim();
  const pw    = document.getElementById("reg-password").value;
  const conf  = document.getElementById("reg-confirm").value;
  if (!email||!pw) return setAuthMsg("Fill in all fields.", "error");
  if (pw !== conf) return setAuthMsg("Passwords don't match.", "error");
  if (pw.length < 6) return setAuthMsg("Password needs at least 6 characters.", "error");
  try { setAuthMsg("Creating account…"); await createUserWithEmailAndPassword(auth, email, pw); }
  catch(e) { setAuthMsg(friendlyErr(e.code), "error"); }
};

window.login = async () => {
  const email = document.getElementById("login-email").value.trim();
  const pw    = document.getElementById("login-password").value;
  if (!email||!pw) return setAuthMsg("Fill in all fields.", "error");
  try { setAuthMsg("Logging in…"); await signInWithEmailAndPassword(auth, email, pw); }
  catch(e) { setAuthMsg(friendlyErr(e.code), "error"); }
};

window.logout = async () => {
  if (window.isGuest) {
    _saveGuest();
    if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
    if (window.stopAutoBreeder) window.stopAutoBreeder();
    window.isGuest = false;
    document.getElementById("guest-badge").classList.add("hidden");
    document.getElementById("header-username").style.display = "";
    document.getElementById("logout-btn").textContent = "[ logout ]";
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
    return;
  }
  await saveGame();
  if (window.stopAutoBreeder) window.stopAutoBreeder();
  if (challengesUnsub) { challengesUnsub(); challengesUnsub = null; }
  await signOut(auth);
};

// ── USERNAME ──────────────────────────────────────────────────
async function loadUsername() {
  if (!currentUser) return null;
  try {
    const s = await getDoc(doc(db,"users",currentUser.uid));
    return s.exists() ? s.data().username || null : null;
  } catch { return null; }
}

function setHeaderUsername(username) {
  window._currentUsername = username || null;
  const el = document.getElementById("header-username");
  if (el) el.textContent = username ? `[ ${username} ]` : `[ set username ]`;
}

window.saveUsername = async () => {
  if (window.isGuest) {
    addLog("Create an account to set a username and appear on the leaderboard.", "warn");
    document.getElementById("username-modal").classList.add("hidden");
    return;
  }
  const input = document.getElementById("username-input");
  const msgEl = document.getElementById("username-message");
  const raw   = (input?.value || "").trim();
  if (!raw)         { msgEl.textContent = "Enter a username.";                  msgEl.className = "message error"; return; }
  if (raw.length<2) { msgEl.textContent = "At least 2 characters.";            msgEl.className = "message error"; return; }
  if (raw.length>20){ msgEl.textContent = "Max 20 characters.";                msgEl.className = "message error"; return; }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(raw)) { msgEl.textContent = "Letters, numbers, spaces, _ and - only."; msgEl.className = "message error"; return; }
  if (raw.toLowerCase().replace(/[^a-z0-9]/g,'').includes('breedingground')) {
    window.notifyTriedBreedingGround?.();
    msgEl.textContent = "Nice try."; msgEl.className = "message error"; return;
  }
  if (containsProfanity(raw)) { msgEl.textContent = "That username isn't allowed."; msgEl.className = "message error"; return; }
  msgEl.textContent = "Checking availability…"; msgEl.className = "message";
  try {
    const q = query(collection(db,"users"), where("username","==",raw), limit(1));
    const snap = await getDocs(q);
    if (snap.docs.some(d => d.id !== currentUser.uid)) {
      msgEl.textContent = "That username is already taken."; msgEl.className = "message error"; return;
    }
  } catch(e) {
    msgEl.textContent = "Could not check availability — try again."; msgEl.className = "message error"; return;
  }
  msgEl.textContent = "Saving…"; msgEl.className = "message";
  try {
    await setDoc(doc(db,"users",currentUser.uid), { username: raw }, { merge: true });
    setHeaderUsername(raw);
    if (window.notifyUsernameSet) window.notifyUsernameSet();
    await saveGame();
    msgEl.textContent = "Saved!"; msgEl.className = "message success";
    setTimeout(() => document.getElementById("username-modal").classList.add("hidden"), 800);
  } catch(e) { console.error(e); msgEl.textContent = "Save failed."; msgEl.className = "message error"; }
};

// ── LOAD ──────────────────────────────────────────────────────
async function loadGame() {
  if (!currentUser) return;
  try {
    const username = await loadUsername(); setHeaderUsername(username);
    if (!username) setTimeout(() => openUsernameModal(), 600);
    const snap = await getDoc(doc(db,"saves",currentUser.uid));
    if (snap.exists()) { applySaveData(snap.data()); addLog("Save loaded. Welcome back.", "highlight"); }
    else               { initNewGame();               addLog("New lineage started. Good luck.", "highlight"); }
  } catch(e) {
    console.error("Load error:", e); initNewGame(); addLog("Could not load save — starting fresh.", "warn");
  }
}

// ── LEADERBOARD ───────────────────────────────────────────────
window.refreshLeaderboard = async () => {
  if (window.isGuest) { renderLeaderboard([], null); return; }
  renderLeaderboardLoading();
  window.notifyLbRefresh?.();
  try {
    await saveGame();
    const q    = query(collection(db,"leaderboard"), orderBy("score","desc"), limit(25));
    const snap = await getDocs(q);
    renderLeaderboard(snap.docs.map(d => ({ uid:d.id, ...d.data() })), currentUser?.uid);
  } catch(e) {
    console.error("Leaderboard error:", e);
    const c = document.getElementById("leaderboard-container");
    if (c) c.innerHTML = '<p class="lb-empty">Could not load leaderboard.</p>';
  }
};

// ── PvP ───────────────────────────────────────────────────────
window.sendPvpChallenge = async (target, myImmortal, myStats, wagerType, wagerAmount) => {
  if (window.isGuest) throw new Error("Guests cannot use PvP. Create an account first.");
  if (!currentUser) throw new Error("Not logged in.");
  await addDoc(collection(db,"challenges"), {
    challengerUid:          currentUser.uid,
    challengerUsername:     window._currentUsername || "Anonymous",
    challengerImmortalId:   myImmortal.id,
    challengerImmortalName: myImmortal.name,
    challengerStats:        myStats,
    targetUid:              target.uid,
    targetUsername:         target.username,
    wagerType:              wagerType || "none",
    wagerAmount:            Number(wagerAmount) || 0,
    status:                 "pending",
    createdAt:              new Date().toISOString(),
  });
};

function subscribeToChallenges() {
  if (!currentUser || window.isGuest) return;
  if (challengesUnsub) challengesUnsub();
  const q = query(collection(db,"challenges"), where("targetUid","==",currentUser.uid), where("status","==","pending"));
  challengesUnsub = onSnapshot(q, (snap) => {
    const challenges = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    if (challenges.length) document.getElementById('tab-combat')?.classList.add('has-badge');
    window.renderPvpChallenges?.(challenges);
  });
}

window.loadPvpChallenges = async () => {
  if (window.isGuest) { window.renderPvpChallenges?.([]); return; }
  if (!currentUser) return;
  try {
    const q    = query(collection(db,"challenges"), where("targetUid","==",currentUser.uid), where("status","==","pending"));
    const snap = await getDocs(q);
    window.renderPvpChallenges?.(snap.docs.map(d => ({ id:d.id, ...d.data() })));
  } catch(e) { console.error("PvP load error:", e); }
};

window.resolvePvpChallenge = async (challengeId, decision, myImmortalId, myStats, myImmortalName, wagerType, wagerAmount) => {
  if (window.isGuest || !currentUser || !challengeId) return;
  try {
    const cSnap = await getDoc(doc(db,"challenges",challengeId));
    if (!cSnap.exists()) return;
    const ch = cSnap.data();
    if (decision === 'declined') {
      await setDoc(doc(db,"challenges",challengeId), { status:'declined' }, { merge:true });
      return;
    }
    const savedSnap = await getDoc(doc(db,"saves",currentUser.uid));
    if (savedSnap.exists()) {
      const saved = savedSnap.data();
      if (ch.wagerType==='gold'     && ch.wagerAmount>0 && (saved.gold||0)     < ch.wagerAmount) return;
      if (ch.wagerType==='diamonds' && ch.wagerAmount>0 && (saved.diamonds||0) < ch.wagerAmount) return;
    }
    const result = simulateCombatQuick(myStats, ch.challengerStats);
    const defWon = result.won;
    await setDoc(doc(db,"challenges",challengeId), {
      status:               'resolved',
      result:               defWon ? 'defender_won' : 'challenger_won',
      defenderUid:          currentUser.uid,
      defenderUsername:     window._currentUsername || "Anonymous",
      defenderImmortalId:   myImmortalId,
      defenderImmortalName: myImmortalName || '?',
      resolvedAt:           new Date().toISOString(),
    }, { merge:true });
    window.handlePvpResult?.(defWon, ch.challengerUsername, myImmortalName||'?', ch.wagerType, ch.wagerAmount);
    await addDoc(collection(db,"pvp_results"), {
      uid:              ch.challengerUid,
      won:              !defWon,
      opponentUsername: window._currentUsername || "Anonymous",
      myImmortalName:   ch.challengerImmortalName || '?',
      wagerType:        ch.wagerType || 'none',
      wagerAmount:      ch.wagerAmount || 0,
      createdAt:        new Date().toISOString(),
    });
  } catch(e) { console.error("PvP resolve error:", e); }
};

window.rejectPvpChallenge = async (challengeId) => {
  if (!challengeId || window.isGuest) return;
  try { await setDoc(doc(db,"challenges",challengeId), { status:'declined' }, { merge:true }); }
  catch(e) { console.error(e); }
};

function simulateCombatQuick(a, d) {
  let aHp=a.hp, dHp=d.hp, turn=a.spd>=d.spd?'a':'d', rounds=0;
  while (aHp>0 && dHp>0 && rounds<200) {
    rounds++;
    if (turn==='a') {
      if (!(d.dodge&&Math.random()<d.dodge)) { let dmg=Math.max(1,a.atk-Math.floor(d.def*0.38)); if(a.crit&&Math.random()<a.crit)dmg=Math.floor(dmg*1.8); dHp-=dmg; }
      if (a.regen&&aHp<a.hp) aHp=Math.min(a.hp,aHp+a.regen);
      turn='d';
    } else {
      if (!(a.dodge&&Math.random()<a.dodge)) { let dmg=Math.max(1,d.atk-Math.floor(a.def*0.38)); if(d.crit&&Math.random()<d.crit)dmg=Math.floor(dmg*1.8); aHp-=dmg; }
      if (d.regen&&dHp<d.hp) dHp=Math.min(d.hp,dHp+d.regen);
      turn='a';
    }
  }
  return { won: aHp>0 };
}

function friendlyErr(code) {
  const map = {
    "auth/email-already-in-use": "That email is already registered.",
    "auth/invalid-email":        "Invalid email address.",
    "auth/weak-password":        "Password is too weak.",
    "auth/user-not-found":       "No account found with that email.",
    "auth/wrong-password":       "Wrong password.",
    "auth/invalid-credential":   "Invalid email or password.",
    "auth/too-many-requests":    "Too many attempts — try again later.",
    "auth/network-request-failed":"Network error. Check your connection.",
  };
  return map[code] || `Error: ${code}`;
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc,
  collection, query, orderBy, limit, getDocs,
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

let currentUser      = null;
let autosaveInterval = null;

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("header-user").textContent = user.email;
    await loadGame();
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(async () => { await saveGame(); flashAutosave(); }, 5 * 60 * 1000);
  } else {
    currentUser = null;
    if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
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

window.showTab = (tab) => {
  document.getElementById("login-form").classList.toggle("hidden",    tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  document.querySelectorAll(".auth-tab").forEach((b,i)=>{
    b.classList.toggle("active",(i===0&&tab==="login")||(i===1&&tab==="register"));
  });
  setAuthMsg("");
};

function setAuthMsg(msg, type="") {
  const el=document.getElementById("auth-message");
  el.textContent=msg; el.className="message"+(type?` ${type}`:"");
}

window.register = async () => {
  const email=document.getElementById("reg-email").value.trim();
  const pw=document.getElementById("reg-password").value;
  const conf=document.getElementById("reg-confirm").value;
  if(!email||!pw)  return setAuthMsg("Fill in all fields.","error");
  if(pw!==conf)    return setAuthMsg("Passwords don't match.","error");
  if(pw.length<6)  return setAuthMsg("Password needs at least 6 characters.","error");
  try { setAuthMsg("Creating account…"); await createUserWithEmailAndPassword(auth,email,pw); }
  catch(e){ setAuthMsg(friendlyErr(e.code),"error"); }
};

window.login = async () => {
  const email=document.getElementById("login-email").value.trim();
  const pw=document.getElementById("login-password").value;
  if(!email||!pw) return setAuthMsg("Fill in all fields.","error");
  try { setAuthMsg("Logging in…"); await signInWithEmailAndPassword(auth,email,pw); }
  catch(e){ setAuthMsg(friendlyErr(e.code),"error"); }
};

window.logout = async () => {
  await saveGame();
  await signOut(auth);
};

async function loadUsername() {
  if(!currentUser) return null;
  try { const s=await getDoc(doc(db,"users",currentUser.uid)); return s.exists()?s.data().username||null:null; }
  catch { return null; }
}

function setHeaderUsername(username) {
  window._currentUsername=username||null;
  const el=document.getElementById("header-username");
  if(el) el.textContent=username?`[ ${username} ]`:`[ set username ]`;
}

window.saveUsername = async () => {
  const input=document.getElementById("username-input");
  const msgEl=document.getElementById("username-message");
  const raw=(input?.value||"").trim();
  if(!raw)          { msgEl.textContent="Enter a username.";             msgEl.className="message error"; return; }
  if(raw.length<2)  { msgEl.textContent="At least 2 characters.";       msgEl.className="message error"; return; }
  if(raw.length>20) { msgEl.textContent="Max 20 characters.";           msgEl.className="message error"; return; }
  if(!/^[a-zA-Z0-9_\- ]+$/.test(raw)){ msgEl.textContent="Letters, numbers, spaces, _ and - only."; msgEl.className="message error"; return; }
  msgEl.textContent="Saving…"; msgEl.className="message";
  try {
    await setDoc(doc(db,"users",currentUser.uid),{username:raw},{merge:true});
    setHeaderUsername(raw);
    if(window.notifyUsernameSet) window.notifyUsernameSet();
    await saveGame();
    msgEl.textContent="Saved!"; msgEl.className="message success";
    setTimeout(()=>document.getElementById("username-modal").classList.add("hidden"),800);
  } catch(e){ console.error(e); msgEl.textContent="Save failed."; msgEl.className="message error"; }
};

window.saveGame = async () => {
  if(!currentUser) return;
  const statusEl=document.getElementById("save-status");
  try {
    if(statusEl){ statusEl.textContent="Saving…"; statusEl.className="message"; }
    const data=getSaveData(), score=calcScore(), username=window._currentUsername||null;
    await Promise.all([
      setDoc(doc(db,"saves",currentUser.uid),{...data,savedAt:new Date().toISOString()}),
      setDoc(doc(db,"leaderboard",currentUser.uid),{
        uid:currentUser.uid, username, score,
        selectedIcon:    data.selectedIcon     || null,
        completedMilestones: (data.completedMilestones||[]).length,
        generation:      data.generation       || 1,
        totalBred:       data.totalBred        || 0,
        totalCulled:     data.totalCulled      || 0,
        totalDiamondsEarned: data.totalDiamondsEarned || 0,
        updatedAt: new Date().toISOString(),
      }),
    ]);
    if(statusEl){ statusEl.textContent="Saved ✓"; statusEl.className="message success"; setTimeout(()=>{if(statusEl)statusEl.textContent="";},3000); }
  } catch(e){ console.error("Save error:",e); if(statusEl){statusEl.textContent="Save failed.";statusEl.className="message error";} }
};

async function loadGame() {
  if(!currentUser) return;
  try {
    const username=await loadUsername(); setHeaderUsername(username);
    if(!username) setTimeout(()=>openUsernameModal(),600);
    const snap=await getDoc(doc(db,"saves",currentUser.uid));
    if(snap.exists()){ applySaveData(snap.data()); addLog("Save loaded. Welcome back.","highlight"); }
    else             { initNewGame();               addLog("New lineage started. Good luck.","highlight"); }
  } catch(e){ console.error("Load error:",e); initNewGame(); addLog("Could not load save — starting fresh.","warn"); }
}

window.refreshLeaderboard = async () => {
  renderLeaderboardLoading();
  try {
    await saveGame();
    const q=query(collection(db,"leaderboard"),orderBy("score","desc"),limit(25));
    const snap=await getDocs(q);
    renderLeaderboard(snap.docs.map(d=>({uid:d.id,...d.data()})),currentUser?.uid);
  } catch(e){
    console.error("Leaderboard error:",e);
    const c=document.getElementById("leaderboard-container");
    if(c) c.innerHTML='<p class="lb-empty">Could not load leaderboard.</p>';
  }
};

function friendlyErr(code){
  const map={
    "auth/email-already-in-use":"That email is already registered.",
    "auth/invalid-email":"Invalid email address.",
    "auth/weak-password":"Password is too weak.",
    "auth/user-not-found":"No account found with that email.",
    "auth/wrong-password":"Wrong password.",
    "auth/invalid-credential":"Invalid email or password.",
    "auth/too-many-requests":"Too many attempts — try again later.",
    "auth/network-request-failed":"Network error. Check your connection.",
  };
  return map[code]||`Error: ${code}`;
}

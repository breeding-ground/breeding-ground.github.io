// ============================================================
//  auth.js  —  Firebase Auth + Firestore + Autosave
//  Replace the firebaseConfig block below with your own config
//  from Firebase console → Project Settings → Your apps
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── 🔧 REPLACE THIS WITH YOUR FIREBASE CONFIG ──────────────
const firebaseConfig = {
  apiKey: "AIzaSyC4DLaJ0_uIwm_ibzQ3AdEsN-pVgROk590",
  authDomain: "breeding-ground-b275c.firebaseapp.com",
  projectId: "breeding-ground-b275c",
  storageBucket: "breeding-ground-b275c.firebasestorage.app",
  messagingSenderId: "80892025030",
  appId: "1:80892025030:web:0f25c0bda0475862cbdfc7"
};
// ────────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser       = null;
let autosaveInterval  = null;

// ── Auth state watcher ───────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("header-user").textContent = user.email;

    await loadGame();

    // Start autosave every 20 minutes
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(async () => {
      await saveGame();
      flashAutosave();
    }, 20 * 60 * 1000);

  } else {
    currentUser = null;
    if (autosaveInterval) { clearInterval(autosaveInterval); autosaveInterval = null; }
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("game-screen").classList.add("hidden");
  }
});

// ── Autosave flash ───────────────────────────────────────────
function flashAutosave() {
  const el = document.getElementById("autosave-flash");
  if (!el) return;
  el.textContent = "autosaved ✓";
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 3000);
}

// ── Auth UI ──────────────────────────────────────────────────
window.showTab = (tab) => {
  document.getElementById("login-form").classList.toggle("hidden",    tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  document.querySelectorAll(".auth-tab").forEach((b, i) => {
    b.classList.toggle("active",
      (i === 0 && tab === "login") || (i === 1 && tab === "register")
    );
  });
  setAuthMsg("");
};

function setAuthMsg(msg, type = "") {
  const el     = document.getElementById("auth-message");
  el.textContent = msg;
  el.className   = "message" + (type ? ` ${type}` : "");
}

// ── Register ─────────────────────────────────────────────────
window.register = async () => {
  const email   = document.getElementById("reg-email").value.trim();
  const pw      = document.getElementById("reg-password").value;
  const confirm = document.getElementById("reg-confirm").value;

  if (!email || !pw)    return setAuthMsg("Fill in all fields.", "error");
  if (pw !== confirm)   return setAuthMsg("Passwords don't match.", "error");
  if (pw.length < 6)    return setAuthMsg("Password needs at least 6 characters.", "error");

  try {
    setAuthMsg("Creating account…");
    await createUserWithEmailAndPassword(auth, email, pw);
  } catch (e) { setAuthMsg(friendlyErr(e.code), "error"); }
};

// ── Login ─────────────────────────────────────────────────────
window.login = async () => {
  const email = document.getElementById("login-email").value.trim();
  const pw    = document.getElementById("login-password").value;

  if (!email || !pw) return setAuthMsg("Fill in all fields.", "error");

  try {
    setAuthMsg("Logging in…");
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) { setAuthMsg(friendlyErr(e.code), "error"); }
};

// ── Logout ───────────────────────────────────────────────────
window.logout = async () => {
  await saveGame();
  await signOut(auth);
};

// ── Save to Firestore ────────────────────────────────────────
window.saveGame = async () => {
  if (!currentUser) return;
  const status = document.getElementById("save-status");
  try {
    if (status) { status.textContent = "Saving…"; status.className = "message"; }
    await setDoc(doc(db, "saves", currentUser.uid), {
      ...getSaveData(),
      savedAt: new Date().toISOString(),
    });
    if (status) {
      status.textContent = "Saved ✓";
      status.className   = "message success";
      setTimeout(() => { if (status) status.textContent = ""; }, 3000);
    }
  } catch (e) {
    console.error("Save error:", e);
    if (status) { status.textContent = "Save failed."; status.className = "message error"; }
  }
};

// ── Load from Firestore ──────────────────────────────────────
async function loadGame() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, "saves", currentUser.uid));
    if (snap.exists()) {
      applySaveData(snap.data());
      addLog("Save loaded. Welcome back.", "highlight");
    } else {
      initNewGame();
      addLog("New lineage started. Good luck.", "highlight");
    }
  } catch (e) {
    console.error("Load error:", e);
    initNewGame();
    addLog("Could not load save — starting fresh.", "warn");
  }
}

// ── Friendly error messages ──────────────────────────────────
function friendlyErr(code) {
  const map = {
    "auth/email-already-in-use":   "That email is already registered.",
    "auth/invalid-email":          "Invalid email address.",
    "auth/weak-password":          "Password is too weak.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Wrong password.",
    "auth/invalid-credential":     "Invalid email or password.",
    "auth/too-many-requests":      "Too many attempts — try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || `Error: ${code}`;
}
  return map[code] || `Error: ${code}`;
}

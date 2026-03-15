// ============================================================
//  auth.js  —  Firebase Auth + Firestore cloud saves
//  Replace the firebaseConfig block below with your own config
//  from the Firebase console (Project Settings → Your apps)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
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

// ── Current user (set when auth state resolves) ─────────────
let currentUser = null;

// ── Watch auth state ────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    document.getElementById("header-user").textContent = user.email;
    await loadGame();
  } else {
    currentUser = null;
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("game-screen").classList.add("hidden");
  }
});

// ── Auth UI helpers ─────────────────────────────────────────
window.showTab = (tab) => {
  document.getElementById("login-form").classList.toggle("hidden",    tab !== "login");
  document.getElementById("register-form").classList.toggle("hidden", tab !== "register");
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    b.classList.toggle("active", (i === 0 && tab === "login") || (i === 1 && tab === "register"));
  });
  setAuthMessage("");
};

function setAuthMessage(msg, type = "") {
  const el = document.getElementById("auth-message");
  el.textContent = msg;
  el.className = "message" + (type ? ` ${type}` : "");
}

// ── Register ────────────────────────────────────────────────
window.register = async () => {
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm  = document.getElementById("reg-confirm").value;

  if (!email || !password) return setAuthMessage("Fill in all fields.", "error");
  if (password !== confirm)  return setAuthMessage("Passwords don't match.", "error");
  if (password.length < 6)   return setAuthMessage("Password must be at least 6 characters.", "error");

  try {
    setAuthMessage("Creating account…");
    await createUserWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the transition
  } catch (e) {
    setAuthMessage(friendlyError(e.code), "error");
  }
};

// ── Login ───────────────────────────────────────────────────
window.login = async () => {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) return setAuthMessage("Fill in all fields.", "error");

  try {
    setAuthMessage("Logging in…");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    setAuthMessage(friendlyError(e.code), "error");
  }
};

// ── Logout ──────────────────────────────────────────────────
window.logout = async () => {
  await saveGame();
  await signOut(auth);
};

// ── Save game to Firestore ───────────────────────────────────
window.saveGame = async () => {
  if (!currentUser) return;
  const status = document.getElementById("save-status");
  try {
    status.textContent = "Saving…";
    status.className   = "message";

    const saveData = getSaveData();   // defined in game.js
    await setDoc(doc(db, "saves", currentUser.uid), {
      ...saveData,
      savedAt: new Date().toISOString()
    });

    status.textContent = "Saved ✓";
    status.className   = "message success";
    setTimeout(() => { status.textContent = ""; }, 3000);
  } catch (e) {
    console.error(e);
    status.textContent = "Save failed.";
    status.className   = "message error";
  }
};

// ── Load game from Firestore ─────────────────────────────────
async function loadGame() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, "saves", currentUser.uid));
    if (snap.exists()) {
      applySaveData(snap.data());   // defined in game.js
      addLog("Save loaded. Welcome back.", "highlight");
    } else {
      initNewGame();                // defined in game.js
      addLog("New lineage started. Good luck.", "highlight");
    }
  } catch (e) {
    console.error(e);
    initNewGame();
    addLog("Could not load save — starting fresh.", "warn");
  }
}

// ── Friendly Firebase error messages ────────────────────────
function friendlyError(code) {
  const map = {
    "auth/email-already-in-use":    "That email is already registered.",
    "auth/invalid-email":           "Invalid email address.",
    "auth/weak-password":           "Password is too weak.",
    "auth/user-not-found":          "No account with that email.",
    "auth/wrong-password":          "Wrong password.",
    "auth/invalid-credential":      "Invalid email or password.",
    "auth/too-many-requests":       "Too many attempts. Try again later.",
    "auth/network-request-failed":  "Network error. Check your connection.",
  };
  return map[code] || `Error: ${code}`;
}

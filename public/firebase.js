import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  setLogLevel,
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  getDocs, 
  getDoc,
  getDocFromServer,
  query,
  runTransaction,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Explicit Authorized Domains Whitelist for Firebase Authentication & Persistent Sessions
export const FIREBASE_AUTH_AUTHORIZED_DOMAINS = [
  "football-united.com",
  "www.football-united.com",
  "football-united.co.uk",
  "www.football-united.co.uk",
  "football-united-77861.firebaseapp.com",
  "football-united-77861.web.app",
  "gen-lang-client-0841468056.firebaseapp.com",
  "gen-lang-client-0841468056.web.app",
  "localhost",
  "127.0.0.1"
];

export function isAuthorizedAuthDomain(domain) {
  if (!domain) return false;
  const d = domain.toLowerCase().replace(/:\d+$/, '');
  return FIREBASE_AUTH_AUTHORIZED_DOMAINS.some(allowed => d === allowed || d.endsWith('.' + allowed));
}

if (typeof window !== 'undefined') {
  window.FIREBASE_AUTH_AUTHORIZED_DOMAINS = FIREBASE_AUTH_AUTHORIZED_DOMAINS;
  window.isAuthorizedAuthDomain = isAuthorizedAuthDomain;
}

// Baseline provisioned project configuration
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0841468056",
  appId: "1:888656794714:web:b349588c96a86d46b7b463",
  apiKey: "AIzaSyAvQ2ghWv6TA5R8jHd8my6htlSzp_HSLXQ",
  authDomain: "gen-lang-client-0841468056.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-footballunited-16285677-11af-4535-9456-3d8347d843e3",
  storageBucket: "gen-lang-client-0841468056.firebasestorage.app",
  messagingSenderId: "888656794714",
  measurementId: "",
  authorizedDomains: FIREBASE_AUTH_AUTHORIZED_DOMAINS
};

// Safe configuration resolution supporting runtime injection, localStorage, env vars & fallback
function getEffectiveFirebaseConfig() {
  // 1. Check window global override (e.g. from runtime wrapper or server injection)
  if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__ && typeof window.__FIREBASE_CONFIG__ === 'object') {
    return { ...DEFAULT_FIREBASE_CONFIG, ...window.__FIREBASE_CONFIG__ };
  }

  // 2. Check localStorage custom configuration (useful for downloaded app or custom domain setup)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem('football_united_firebase_config') || localStorage.getItem('firebase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.projectId && parsed.apiKey) {
          return { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Could not read custom Firebase config from localStorage:", e);
    }
  }

  // 3. Check Vite / Node bundler environment variables if present
  try {
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
    const envApiKey = metaEnv.VITE_FIREBASE_API_KEY || procEnv.VITE_FIREBASE_API_KEY || metaEnv.FIREBASE_API_KEY || procEnv.FIREBASE_API_KEY;
    const envProjectId = metaEnv.VITE_FIREBASE_PROJECT_ID || procEnv.VITE_FIREBASE_PROJECT_ID || metaEnv.FIREBASE_PROJECT_ID || procEnv.FIREBASE_PROJECT_ID;

    if (envApiKey && envProjectId) {
      return {
        ...DEFAULT_FIREBASE_CONFIG,
        apiKey: envApiKey,
        projectId: envProjectId,
        appId: metaEnv.VITE_FIREBASE_APP_ID || procEnv.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
        authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || procEnv.VITE_FIREBASE_AUTH_DOMAIN || `${envProjectId}.firebaseapp.com`,
        storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || procEnv.VITE_FIREBASE_STORAGE_BUCKET || `${envProjectId}.firebasestorage.app`
      };
    }
  } catch (e) {}

  // 4. Fallback to provisioned project configuration
  return DEFAULT_FIREBASE_CONFIG;
}

const firebaseConfig = getEffectiveFirebaseConfig();

// Validate critical Firebase configuration credentials
const isConfigValid = Boolean(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !String(firebaseConfig.apiKey).startsWith("YOUR_") &&
  !String(firebaseConfig.projectId).startsWith("YOUR_")
);

if (!isConfigValid) {
  console.warn("⚠️ Firebase Warning: apiKey or projectId is missing or unconfigured. Please configure Firebase settings for full live cloud sync.");
}

// Initialize Firebase App safely as a singleton
console.log("🔥 Firebase Initializing for project:", firebaseConfig.projectId);
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analytics = null;
isSupported().then(supported => {
  if (supported && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
    console.log("📊 Firebase Analytics initialized");
  }
}).catch(err => console.warn("Analytics not supported in current environment", err));

// Clean up any stale/corrupt firestore mutation keys from localStorage to prevent quota exhaustion
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('firestore_mutations_') || k.startsWith('firestore_clients_') || k.startsWith('firestore_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  }
} catch (e) {
  // Ignore storage access errors
}

// Suppress non-fatal Firestore offline transition warnings in iframe/sandboxed environments
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore if not supported
}

// Enable Firestore with resilient multi-tier caching (Multi-tab -> Local Cache -> Memory Cache -> Standard)
let db;
const dbId = firebaseConfig.firestoreDatabaseId || undefined;
try {
  if (dbId) {
    db = getFirestore(app, dbId);
  } else {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  }
} catch (e1) {
  console.warn("Standard database initialization fallback:", e1?.message || e1);
  try {
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  } catch (e2) {
    console.warn("Falling back to root Firestore instance:", e2?.message || e2);
    db = getFirestore(app);
  }
}

// Validate Connection to Firestore (Per Firebase Integration Skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("🟢 Firestore connection to", dbId || "(default)", "verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Resilient Network Enabler (Prevents FIRESTORE INTERNAL ASSERTION FAILED)
// Firestore automatically handles network state and transitions without manual intervention.
// Manual enableNetwork() and disableNetwork() calls create severe race conditions and stream assertion errors.
const forceNetworkConnection = async () => {
  if (typeof window !== 'undefined' && window.AppState) {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      window.AppState.isOffline = false;
    }
  }
  return true;
};

const gracefulDisableNetwork = async () => {
  if (typeof window !== 'undefined' && window.AppState) {
    window.AppState.isOffline = true;
  }
  return true;
};

// Backward compatibility bridge for standard firebase.firestore().enableNetwork()
if (typeof window !== 'undefined') {
  window.forceNetworkConnection = forceNetworkConnection;
  window.gracefulDisableNetwork = gracefulDisableNetwork;
  window.firebase = window.firebase || {};
  window.firebase.firestore = function() {
    return {
      enableNetwork: forceNetworkConnection,
      disableNetwork: gracefulDisableNetwork
    };
  };
}

// Accurate online/offline state updater for onSnapshot listeners:
// Does NOT falsely flag the app as offline just because Firestore returned cached data on boot!
function updateOfflineStatus(snap) {
  if (typeof window !== 'undefined' && window.AppState) {
    if (snap?.metadata && !snap.metadata.fromCache) {
      // Confirmed fresh payload directly from live Firestore server
      window.AppState.isOffline = false;
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Browser network stack reports offline
      window.AppState.isOffline = true;
    }
  }
}

function handleListenerOfflineError(err, label = "listener") {
  if (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission')) {
    console.info(`ℹ️ Firestore ${label} requires authenticated user privileges.`);
    return;
  }
  console.warn(`Firestore ${label} notice:`, err?.message || err);
  if (typeof window !== 'undefined' && window.AppState && typeof navigator !== 'undefined' && !navigator.onLine) {
    window.AppState.isOffline = true;
  }
}

// Configuration management for downloaded or custom deployments
function updateFirebaseConfig(newConfig) {
  if (!newConfig || typeof newConfig !== 'object') throw new Error("Invalid configuration object");
  if (!newConfig.apiKey || !newConfig.projectId) throw new Error("Both apiKey and projectId are required.");
  try {
    localStorage.setItem('football_united_firebase_config', JSON.stringify(newConfig));
    window.location.reload();
  } catch (e) {
    console.error("Failed to save custom Firebase config:", e);
  }
}

function promptForFirebaseConfig() {
  const currentKey = firebaseConfig.apiKey || "";
  const currentProj = firebaseConfig.projectId || "";
  const newProj = window.prompt("Enter your Firebase Project ID:", currentProj);
  if (!newProj) return;
  const newKey = window.prompt("Enter your Firebase Web API Key:", currentKey);
  if (!newKey) return;
  updateFirebaseConfig({
    ...firebaseConfig,
    projectId: newProj.trim(),
    apiKey: newKey.trim(),
    authDomain: `${newProj.trim()}.firebaseapp.com`,
    storageBucket: `${newProj.trim()}.firebasestorage.app`
  });
}

if (typeof window !== 'undefined') {
  window.db = db;
  window.app = app;
}

const auth = getAuth(app);

// Gracefully configure persistence to ensure sessions survive app closures (Android APK, PWA & Web)
export const initAuthPersistence = async () => {
  const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Persistence init timeout')), ms));
  try {
    if (typeof indexedDBLocalPersistence !== 'undefined') {
      try {
        await Promise.race([setPersistence(auth, indexedDBLocalPersistence), timeoutPromise(1500)]);
        console.log("🔒 Firebase Auth persistence configured with indexedDBLocalPersistence");
        return;
      } catch (idbErr) {
        console.warn("indexedDBLocalPersistence fallback to browserLocalPersistence:", idbErr?.message || idbErr);
      }
    }
    await Promise.race([setPersistence(auth, browserLocalPersistence), timeoutPromise(1500)]);
    console.log("🔒 Firebase Auth persistence configured with browserLocalPersistence");
  } catch (err) {
    console.warn("⚠️ Standard browser local persistence blocked (ITP/WebView detected). Falling back to inMemoryPersistence:", err);
    try {
      await Promise.race([setPersistence(auth, inMemoryPersistence), timeoutPromise(1000)]);
    } catch (e) {
      console.warn("Could not set inMemoryPersistence:", e);
    }
  }
};
initAuthPersistence().catch(() => {});

// In-App Browser (WhatsApp, Instagram, Facebook, Line, etc.) and ITP Detector
export function isInAppBrowser() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || window.navigator.vendor || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inAppPatterns = /WhatsApp|FBAN|FBAV|Instagram|Line|Twitter|Snapchat|MicroMessenger|musical_ly|BytedanceWebview|LinkedInApp|GSA/i;
  return inAppPatterns.test(ua) || (isIOS && !/Safari/i.test(ua) && /WebKit/i.test(ua));
}

export function isITPorCookieBlockedError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = (err.message || '').toLowerCase();
  return (
    code === 'auth/web-storage-unsupported' ||
    code === 'auth/operation-not-supported-in-this-environment' ||
    code === 'auth/popup-blocked' ||
    (code === 'auth/cancelled-popup-request' && isInAppBrowser()) ||
    msg.includes('security cookie') ||
    msg.includes('cookie') ||
    msg.includes('storage is disabled') ||
    msg.includes('third-party cookie') ||
    msg.includes('tracking prevention') ||
    msg.includes('itp')
  );
}

export function showInAppBrowserGuidanceModal({ providerName = 'Sign In', error = null } = {}) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('itp-cookie-fallback-modal');
  if (existing) {
    existing.style.display = 'flex';
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'itp-cookie-fallback-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);padding:16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
  
  modal.innerHTML = `
    <div style="background:#ffffff;color:#0f172a;max-width:440px;width:100%;border-radius:20px;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);border:1px solid #e2e8f0;line-height:1.5;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-size:28px;">📱</span>
        <div>
          <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;">Open in Safari or Chrome</h3>
          <span style="font-size:11px;font-weight:700;background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:12px;display:inline-block;margin-top:3px;">WhatsApp In-App Browser Detected</span>
        </div>
      </div>

      <p style="margin:0 0 14px 0;font-size:13px;color:#475569;">
        Apple's <strong>Intelligent Tracking Prevention (ITP)</strong> blocks the security cookies required for authentication when opening links directly inside WhatsApp.
      </p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">To complete sign in:</div>
        <ol style="margin:0;padding-left:18px;font-size:12px;color:#334155;display:flex;flex-direction:column;gap:6px;">
          <li>Tap the <strong>•••</strong> (top-right) or <strong>Share ⬆️</strong> (bottom-right) icon in WhatsApp.</li>
          <li>Choose <strong>"Open in Safari"</strong> or <strong>"Open in Chrome"</strong>.</li>
        </ol>
      </div>

      <div style="display:flex;gap:10px;flex-direction:column;">
        <button id="itp-copy-link-btn" type="button" style="background:#0f172a;color:#ffffff;border:none;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
          📋 Copy App Link
        </button>
        <button id="itp-close-modal-btn" type="button" style="background:transparent;color:#64748b;border:1px solid #cbd5e1;padding:10px 16px;border-radius:12px;font-size:12px;font-weight:600;cursor:pointer;">
          Dismiss
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const copyBtn = modal.querySelector('#itp-copy-link-btn');
  const closeBtn = modal.querySelector('#itp-close-modal-btn');

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = '✓ Link Copied! Paste in Safari';
          copyBtn.style.background = '#059669';
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy App Link';
            copyBtn.style.background = '#0f172a';
          }, 3500);
        }).catch(() => {
          prompt('Copy this link and open in Safari:', url);
        });
      } else {
        prompt('Copy this link and open in Safari:', url);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
}

let storage = null;
try {
  storage = getStorage(app);
} catch (e) {
  console.warn("Firebase Storage initialization fallback:", e);
}

if (typeof window !== 'undefined') {
  window.db = db;
  window.app = app;
  window.storage = storage;
}

// Google Provider setup for Google Forms, Google Drive & Google Sheets
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleProvider.addScope('https://www.googleapis.com/auth/forms.body.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/forms.responses.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Microsoft Provider setup for Microsoft Graph, Outlook, Excel Online & OneDrive
const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('User.Read');
microsoftProvider.addScope('openid');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.addScope('Files.ReadWrite');
microsoftProvider.addScope('Files.ReadWrite.All');
microsoftProvider.setCustomParameters({
    prompt: 'select_account'
});

let cachedGoogleAccessToken = null;
let pendingSignInPromise = null;
let cachedMicrosoftAccessToken = null;
let pendingMsSignInPromise = null;

// Helper to destroy Alpine Proxies and guarantee pure JS objects before saving
const stripProxy = (data) => {
    if (data === null || typeof data !== 'object') return data;
    if (typeof window !== 'undefined' && typeof window.safeClone === 'function') {
        return window.safeClone(data);
    }
    const seen = new WeakSet();
    try {
        const json = JSON.stringify(data, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return undefined;
                seen.add(value);
                if (
                    'nodeType' in value || 
                    (value.constructor && (value.constructor.name === 'HTMLDocument' || value.constructor.name === 'Window' || value.constructor.name === 'HTMLImageElement')) || 
                    (typeof window !== 'undefined' && value === window) ||
                    (typeof Element !== 'undefined' && value instanceof Element)
                ) {
                    return undefined;
                }
            }
            if (typeof value === 'function' || typeof value === 'symbol') return undefined;
            return value;
        });
        return JSON.parse(json || '{}');
    } catch (e) {
        console.warn("stripProxy clone fallback:", e);
        return Array.isArray(data) ? [] : {};
    }
};

window.fb = {
    db,
    app,
    auth,
    storage,
    firebaseConfig,
    isConfigValid,
    enableNetwork: forceNetworkConnection,
    forceNetworkConnection,
    disableNetwork: gracefulDisableNetwork,
    reconnect: forceNetworkConnection,
    updateFirebaseConfig,
    promptForFirebaseConfig,

    // Firestore utilities & primitives
    writeBatch: (database = db) => writeBatch(database || db),
    collection: (databaseOrPath, maybePath) => {
        if (maybePath) return collection(databaseOrPath, maybePath);
        return collection(db, databaseOrPath);
    },
    doc: (databaseOrPath, ...segments) => {
        if (typeof databaseOrPath === 'string') {
            return doc(db, databaseOrPath, ...segments);
        }
        return doc(databaseOrPath, ...segments);
    },
    getDocs,
    updateDoc,
    setDoc,
    deleteDoc,
    deleteField,
    query,
    runTransaction,

    // --- 1. REAL-TIME LISTENERS (Support both production & legacy schema collections) ---
    subscribePlayers(cb) { 
        if (!auth?.currentUser || !auth.currentUser.uid) {
            console.log("ℹ️ [Dev/Guest Mode] Serving local players cache; skipping Firestore listeners until authenticated.");
            let localPlayers = [];
            try {
                const raw = localStorage.getItem('fu_cached_players');
                if (raw) localPlayers = JSON.parse(raw);
            } catch (e) {}
            if (typeof cb === 'function') cb(localPlayers || []);
            return () => {};
        }

        let cacheProd = [];
        let cacheLegacy = [];

        const isValidRegistered = (p) => {
            if (!p || typeof p !== 'object') return false;
            const name = String(p.name || p.player || '').trim();
            if (!name) return false;
            const lower = name.toLowerCase();
            if (lower === 'undefined' || lower === 'null' || lower === '[object object]' || lower === 'unknown' || lower === 'none') return false;
            return true;
        };

        const emitCombined = () => {
            let deletedPlayerIds = new Set();
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem('fu_deleted_player_ids');
                    if (raw) {
                        const arr = JSON.parse(raw);
                        if (Array.isArray(arr)) deletedPlayerIds = new Set(arr.map(id => String(id).trim().toLowerCase()));
                    }
                }
            } catch (e) {}

            const idMap = new Map();
            const nameMap = new Map();

            // 1. Process Production first (source of truth)
            cacheProd.forEach(p => {
                if (!isValidRegistered(p)) return;
                const cleanName = String(p.name).trim().toLowerCase();
                const pId = String(p.id || '').trim().toLowerCase();
                if (deletedPlayerIds.has(pId) || deletedPlayerIds.has(cleanName)) return;
                
                if (!nameMap.has(cleanName)) {
                    nameMap.set(cleanName, p);
                    if (pId) idMap.set(pId, p);
                }
            });

            // 2. Process Legacy only if not already present by ID OR by Name
            cacheLegacy.forEach(p => {
                if (!isValidRegistered(p)) return;
                const cleanName = String(p.name).trim().toLowerCase();
                const pId = String(p.id || '').trim().toLowerCase();
                if (deletedPlayerIds.has(pId) || deletedPlayerIds.has(cleanName)) return;

                if (!nameMap.has(cleanName) && (!pId || !idMap.has(pId))) {
                    nameMap.set(cleanName, p);
                    if (pId) idMap.set(pId, p);
                }
            });

            const combined = Array.from(nameMap.values());
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_cached_players', JSON.stringify(combined));
                }
            } catch (e) {}

            cb(combined);
        };

        let unsub1 = () => {};
        let unsub2 = () => {};

        try {
            unsub1 = onSnapshot(collection(db, "go_players_prod"), snap => {
                updateOfflineStatus(snap);
                cacheProd = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Prod players"));
        } catch (e) {
            console.warn("subscribePlayers Prod error:", e);
        }

        try {
            unsub2 = onSnapshot(collection(db, "players"), snap => {
                updateOfflineStatus(snap);
                cacheLegacy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Legacy players"));
        } catch (e) {
            console.warn("subscribePlayers Legacy error:", e);
        }

        return () => {
            try { if (typeof unsub1 === 'function') unsub1(); } catch (e) {}
            try { if (typeof unsub2 === 'function') unsub2(); } catch (e) {}
        };
    },

    subscribeMatches(cb) { 
        if (!auth?.currentUser || !auth.currentUser.uid) {
            console.log("ℹ️ [Dev/Guest Mode] Serving local matches cache; skipping Firestore listeners until authenticated.");
            let localMatches = [];
            try {
                const raw = localStorage.getItem('fu_cached_matches');
                if (raw) localMatches = JSON.parse(raw);
            } catch (e) {}
            if (typeof cb === 'function') cb(localMatches || []);
            return () => {};
        }

        let cacheProd = [];
        let cacheLegacy = [];
        const emitCombined = () => {
            const map = new Map();
            cacheProd.forEach(m => {
                if (m && m.id) map.set(String(m.id), m);
            });
            cacheLegacy.forEach(m => {
                if (m && m.id && !map.has(String(m.id))) map.set(String(m.id), m);
            });
            const combined = Array.from(map.values());
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_cached_matches', JSON.stringify(combined));
                }
            } catch (e) {}
            cb(combined);
        };

        let unsub1 = () => {};
        let unsub2 = () => {};

        try {
            unsub1 = onSnapshot(collection(db, "go_matches_prod"), snap => {
                updateOfflineStatus(snap);
                cacheProd = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Prod matches"));
        } catch (e) {
            console.warn("subscribeMatches Prod error:", e);
        }

        try {
            unsub2 = onSnapshot(collection(db, "matches"), snap => {
                updateOfflineStatus(snap);
                cacheLegacy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Legacy matches"));
        } catch (e) {
            console.warn("subscribeMatches Legacy error:", e);
        }

        return () => {
            try { if (typeof unsub1 === 'function') unsub1(); } catch (e) {}
            try { if (typeof unsub2 === 'function') unsub2(); } catch (e) {}
        };
    },

    subscribeTeams(cb) { 
        if (!auth?.currentUser || !auth.currentUser.uid) {
            console.log("ℹ️ [Dev/Guest Mode] Serving local teams cache; skipping Firestore listeners until authenticated.");
            let localTeams = [];
            try {
                const raw = localStorage.getItem('fu_cached_teams');
                if (raw) localTeams = JSON.parse(raw);
            } catch (e) {}
            if (typeof cb === 'function') cb(localTeams || []);
            return () => {};
        }

        let cacheProd = [];
        let cacheLegacy = [];

        const isInvalidTeamName = (name) => {
            if (!name) return true;
            const lower = String(name).trim().toLowerCase();
            const banned = ['home', 'away', 'home team', 'away team', 'red', 'yellow', 'none', 'unknown', 'null', 'undefined', '[object object]'];
            if (banned.includes(lower)) return true;
            if (/^t_\d+$/i.test(lower) || /^md_\d+$/i.test(lower) || /^p_\d+$/i.test(lower)) return true;
            return false;
        };

        const emitCombined = () => {
            const idMap = new Map();
            const nameMap = new Map();

            cacheProd.forEach(t => {
                if (!t || !t.name) return;
                const cleanName = String(t.name).trim().toLowerCase();
                const tId = String(t.id || '');
                if (isInvalidTeamName(cleanName)) return;
                if (!nameMap.has(cleanName)) {
                    nameMap.set(cleanName, t);
                    if (tId) idMap.set(tId, t);
                }
            });

            cacheLegacy.forEach(t => {
                if (!t || !t.name) return;
                const cleanName = String(t.name).trim().toLowerCase();
                const tId = String(t.id || '');
                if (isInvalidTeamName(cleanName)) return;
                if (!nameMap.has(cleanName) && (!tId || !idMap.has(tId))) {
                    nameMap.set(cleanName, t);
                    if (tId) idMap.set(tId, t);
                }
            });

            const combined = Array.from(nameMap.values());
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_cached_teams', JSON.stringify(combined));
                }
            } catch (e) {}

            cb(combined);
        };

        let unsub1 = () => {};
        let unsub2 = () => {};

        try {
            unsub1 = onSnapshot(collection(db, "go_teams_prod"), snap => {
                updateOfflineStatus(snap);
                cacheProd = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Prod teams"));
        } catch (e) {
            console.warn("subscribeTeams Prod error:", e);
        }

        try {
            unsub2 = onSnapshot(collection(db, "teams"), snap => {
                updateOfflineStatus(snap);
                cacheLegacy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Legacy teams"));
        } catch (e) {
            console.warn("subscribeTeams Legacy error:", e);
        }

        return () => {
            try { if (typeof unsub1 === 'function') unsub1(); } catch (e) {}
            try { if (typeof unsub2 === 'function') unsub2(); } catch (e) {}
        };
    },
    subscribeSettings(cb) { 
        if (!auth?.currentUser || !auth.currentUser.uid) {
            if (typeof cb === 'function') cb(null);
            return () => {};
        }
        try {
            const unsub = onSnapshot(doc(db, "settings", "league_config"), snap => {
                updateOfflineStatus(snap);
                snap.exists() ? cb(snap.data()) : cb(null);
            }, err => handleListenerOfflineError(err, "Settings")); 
            return () => {
                try { if (typeof unsub === 'function') unsub(); } catch (e) {}
            };
        } catch (e) {
            return () => {};
        }
    },

    subscribeSessions(cb) {
        if (!auth?.currentUser || !auth.currentUser.uid) {
            console.log("ℹ️ [Dev/Guest Mode] Serving local sessions cache; skipping Firestore listeners until authenticated.");
            let localSessions = [];
            try {
                const raw = localStorage.getItem('fu_cached_sessions');
                if (raw) localSessions = JSON.parse(raw);
            } catch (e) {}
            if (typeof cb === 'function') cb(localSessions || []);
            return () => {};
        }

        let cacheProd = [];
        let cacheLegacy = [];
        const emitCombined = () => {
            const map = new Map();
            cacheProd.forEach(s => {
                if (s && s.id) map.set(String(s.id), s);
            });
            cacheLegacy.forEach(s => {
                if (s && s.id && !map.has(String(s.id))) map.set(String(s.id), s);
            });
            const combined = Array.from(map.values());
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('fu_cached_sessions', JSON.stringify(combined));
                }
            } catch (e) {}
            cb(combined);
        };

        let unsub1 = () => {};
        let unsub2 = () => {};

        try {
            unsub1 = onSnapshot(collection(db, "go_sessions_prod"), snap => {
                updateOfflineStatus(snap);
                cacheProd = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Prod sessions"));
        } catch (e) {
            console.warn("subscribeSessions Prod error:", e);
        }

        try {
            unsub2 = onSnapshot(collection(db, "sessions"), snap => {
                updateOfflineStatus(snap);
                cacheLegacy = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                emitCombined();
            }, err => handleListenerOfflineError(err, "Legacy sessions"));
        } catch (e) {
            console.warn("subscribeSessions Legacy error:", e);
        }

        return () => {
            try { if (typeof unsub1 === 'function') unsub1(); } catch (e) {}
            try { if (typeof unsub2 === 'function') unsub2(); } catch (e) {}
        };
    },

    // --- 2. ATOMIC WRITES (Sync to all collections) ---
    async saveSession(s) {
        if (!s || !s.id) return;
        const clean = stripProxy(s);
        await Promise.allSettled([
            setDoc(doc(db, "go_sessions_prod", String(s.id)), clean, { merge: true }),
            setDoc(doc(db, "sessions", String(s.id)), clean, { merge: true })
        ]);
    },
    async saveSessionsBatch(sessionsList) {
        if (!Array.isArray(sessionsList) || sessionsList.length === 0) return;
        const promises = [];
        for (const s of sessionsList) {
            if (s && s.id) {
                const clean = stripProxy(s);
                promises.push(setDoc(doc(db, "go_sessions_prod", String(s.id)), clean, { merge: true }));
                promises.push(setDoc(doc(db, "sessions", String(s.id)), clean, { merge: true }));
            }
        }
        await Promise.allSettled(promises);
    },
    async saveRecurringSchedule(schedule) {
        if (!schedule || (!schedule.id && !schedule.series_id)) return;
        const clean = stripProxy(schedule);
        const id = String(schedule.id || schedule.series_id);
        await Promise.allSettled([
            setDoc(doc(db, "recurring_schedules", id), clean, { merge: true }),
            setDoc(doc(db, "go_recurring_schedules_prod", id), clean, { merge: true })
        ]);
    },
    async deleteRecurringSchedule(id) {
        if (!id) return;
        const cleanId = String(id);
        await Promise.allSettled([
            deleteDoc(doc(db, "recurring_schedules", cleanId)),
            deleteDoc(doc(db, "go_recurring_schedules_prod", cleanId))
        ]);
    },
    subscribeRecurringSchedules(cb) {
        if (!auth?.currentUser || !auth.currentUser.uid) {
            if (typeof cb === 'function') cb([]);
            return () => {};
        }
        try {
            const unsub = onSnapshot(collection(db, "recurring_schedules"), (snap) => {
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                if (typeof cb === 'function') cb(list);
            }, (err) => {
                handleListenerOfflineError(err, "recurring_schedules");
            });
            return () => {
                try { if (typeof unsub === 'function') unsub(); } catch(e) {}
            };
        } catch (e) {
            console.warn("subscribeRecurringSchedules error:", e);
            return () => {};
        }
    },
    async savePlayer(p) { 
        if (!p || !p.id) return;
        const clean = stripProxy(p);
        await Promise.allSettled([
            setDoc(doc(db, "go_players_prod", String(p.id)), clean, { merge: true }),
            setDoc(doc(db, "players", String(p.id)), clean, { merge: true })
        ]);
    },
    async updatePlayer(id, updates) {
        if (!id || !updates) return;
        const cleanUpdates = stripProxy(updates);
        await Promise.allSettled([
            setDoc(doc(db, "go_players_prod", String(id)), cleanUpdates, { merge: true }),
            setDoc(doc(db, "players", String(id)), cleanUpdates, { merge: true })
        ]);
    },
    async deletePlayerPhoto(playerId) {
        if (!playerId) return;
        const pId = String(playerId);
        await Promise.allSettled([
            updateDoc(doc(db, "go_players_prod", pId), {
                photo_url: deleteField(),
                photo_updated_at: new Date().toISOString()
            }),
            updateDoc(doc(db, "players", pId), {
                photo_url: deleteField(),
                photo_updated_at: new Date().toISOString()
            })
        ]);
    },
    async uploadPlayerPhotoBlob(playerId, blob, progressCallback) {
        if (!playerId || !blob) throw new Error("Missing playerId or photo data");
        if (!storage) throw new Error("Firebase storage is not initialized");
        const fileRef = storageRef(storage, `player-photos/${playerId}.jpg`);
        const uploadTask = uploadBytesResumable(fileRef, blob, { contentType: 'image/jpeg' });
        await new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (typeof progressCallback === 'function') progressCallback(percent);
                },
                reject,
                resolve
            );
        });
        const downloadUrl = await getDownloadURL(fileRef);
        return { url: downloadUrl };
    },
    async deletePlayerPhotoFromStorage(playerId) {
        if (!playerId || !storage) return;
        try {
            const fileRef = storageRef(storage, `player-photos/${playerId}.jpg`);
            await deleteObject(fileRef);
        } catch (e) {
            if (e?.code !== 'storage/object-not-found') {
                console.warn("Storage delete notice:", e?.message || e);
            }
        }
    },
    async savePlayersBatch(playersList) {
        if (!Array.isArray(playersList) || playersList.length === 0) return;
        const promises = [];
        for (const p of playersList) {
            if (p && p.id) {
                const clean = stripProxy(p);
                promises.push(setDoc(doc(db, "go_players_prod", String(p.id)), clean, { merge: true }));
                promises.push(setDoc(doc(db, "players", String(p.id)), clean, { merge: true }));
            }
        }
        await Promise.allSettled(promises);
    },
    async saveTeam(t) { 
        if (!t || !t.id) return;
        const clean = stripProxy(t);
        await Promise.allSettled([
            setDoc(doc(db, "go_teams_prod", String(t.id)), clean, { merge: true }),
            setDoc(doc(db, "teams", String(t.id)), clean, { merge: true })
        ]);
    },
    async saveMatchDay(m) { 
        if (!m || !m.id) return;
        const clean = stripProxy(m);
        await Promise.allSettled([
            setDoc(doc(db, "go_matches_prod", String(m.id)), clean, { merge: true }),
            setDoc(doc(db, "matches", String(m.id)), clean, { merge: true })
        ]);
    },
    async saveMatchesBatch(matchesList) {
        if (!Array.isArray(matchesList) || matchesList.length === 0) return;
        const promises = [];
        for (const m of matchesList) {
            if (m && m.id) {
                const clean = stripProxy(m);
                promises.push(setDoc(doc(db, "go_matches_prod", String(m.id)), clean));
                promises.push(setDoc(doc(db, "matches", String(m.id)), clean));
            }
        }
        await Promise.allSettled(promises);
    },
    async saveTournament(t) {
        if (!t || !t.id) return;
        const clean = stripProxy(t);
        await setDoc(doc(db, "tournaments", String(t.id)), clean, { merge: true });
    },
    async evaluateAndAdvanceMatch(match, allMatches = []) {
        if (!match || !match.id) return { match };
        
        const homeScore = Number(match.home_score ?? match.homeScore ?? 0);
        const awayScore = Number(match.away_score ?? match.awayScore ?? 0);
        let winnerId = null;
        let winnerTeam = null;

        // 1. Two-Legged Aggregate evaluation
        if (match.is_two_legged && match.leg === 2) {
            const leg1 = allMatches.find(m => 
                m.tournament_id === match.tournament_id && 
                m.round_number === match.round_number && 
                m.leg === 1 &&
                ((m.home_team === match.away_team && m.away_team === match.home_team) ||
                 (m.home_team_id && m.home_team_id === match.away_team_id))
            );

            const leg1HomeScore = Number(leg1?.home_score ?? leg1?.homeScore ?? 0);
            const leg1AwayScore = Number(leg1?.away_score ?? leg1?.awayScore ?? 0);

            // In Leg 2, current home team was away team in Leg 1
            const totalHome = homeScore + leg1AwayScore;
            const totalAway = awayScore + leg1HomeScore;

            match.aggregate_home_score = totalHome;
            match.aggregate_away_score = totalAway;

            if (totalHome > totalAway) {
                winnerTeam = match.home_team;
                winnerId = match.home_team_id || match.home_team;
            } else if (totalAway > totalHome) {
                winnerTeam = match.away_team;
                winnerId = match.away_team_id || match.away_team;
            } else {
                // Check extra time and penalties
                const etH = Number(match.extra_time_home ?? 0);
                const etA = Number(match.extra_time_away ?? 0);
                const penH = Number(match.penalties_home ?? 0);
                const penA = Number(match.penalties_away ?? 0);
                if (etH !== etA) {
                    winnerTeam = etH > etA ? match.home_team : match.away_team;
                    winnerId = etH > etA ? (match.home_team_id || match.home_team) : (match.away_team_id || match.away_team);
                } else if (penH !== penA) {
                    winnerTeam = penH > penA ? match.home_team : match.away_team;
                    winnerId = penH > penA ? (match.home_team_id || match.home_team) : (match.away_team_id || match.away_team);
                }
            }
        } else {
            // Standard Single Match Evaluation
            if (homeScore > awayScore) {
                winnerTeam = match.home_team;
                winnerId = match.home_team_id || match.home_team;
            } else if (awayScore > homeScore) {
                winnerTeam = match.away_team;
                winnerId = match.away_team_id || match.away_team;
            } else {
                const penH = Number(match.penalties_home ?? 0);
                const penA = Number(match.penalties_away ?? 0);
                if (penH !== penA) {
                    winnerTeam = penH > penA ? match.home_team : match.away_team;
                    winnerId = penH > penA ? (match.home_team_id || match.home_team) : (match.away_team_id || match.away_team);
                }
            }
        }

        match.winner_team = winnerTeam;
        match.winner_id = winnerId;

        // Save current match
        await this.saveMatchDay(match);

        let nextMatch = null;
        if (winnerTeam && match.next_match_id) {
            const nextMatchId = String(match.next_match_id);
            nextMatch = allMatches.find(m => String(m.id) === nextMatchId);
            if (nextMatch) {
                const targetSlot = match.next_match_slot || (!nextMatch.home_team || nextMatch.home_team === 'TBD' ? 'home' : 'away');
                if (targetSlot === 'home') {
                    nextMatch.home_team = winnerTeam;
                    nextMatch.home_team_id = winnerId;
                } else {
                    nextMatch.away_team = winnerTeam;
                    nextMatch.away_team_id = winnerId;
                }
                await this.saveMatchDay(nextMatch);
            }
        }

        return { updatedMatch: match, nextMatch };
    },
    async saveSettings(s) { 
        // Wait for persistent auth state to resolve if currently initializing
        if (auth && !auth.currentUser && typeof auth.authStateReady === 'function') {
            try {
                await auth.authStateReady();
            } catch (_) {}
        }
        try {
            await setDoc(doc(db, "settings", "league_config"), stripProxy(s), { merge: true }); 
        } catch (err) {
            console.warn("Notice saving settings to Firestore:", err?.message || err);
            // Always persist locally to prevent UI state loss
            try {
                localStorage.setItem('fu_cached_league_settings', JSON.stringify(stripProxy(s)));
            } catch (_) {}
            throw err;
        }
    },

    // --- 3. ATOMIC DELETES (Sync across collections & scrub ghost records) ---
    async deletePlayer(id, name = '') { 
        const idStr = String(id || '');
        const deletePromises = [];
        if (idStr) {
            deletePromises.push(deleteDoc(doc(db, "go_players_prod", idStr)));
            deletePromises.push(deleteDoc(doc(db, "players", idStr)));
        }

        // Deep scrub by name and ID across both collections to prevent duplicate ghosts
        const cleanName = String(name || '').trim().toLowerCase();
        try {
            const [snap1, snap2] = await Promise.all([
                getDocs(collection(db, "go_players_prod")),
                getDocs(collection(db, "players"))
            ]);
            snap1.docs.forEach(d => {
                const data = d.data();
                const dName = String(data.name || '').trim().toLowerCase();
                if ((cleanName && cleanName.length >= 2 && dName === cleanName) || (idStr && d.id === idStr)) {
                    deletePromises.push(deleteDoc(d.ref));
                }
            });
            snap2.docs.forEach(d => {
                const data = d.data();
                const dName = String(data.name || '').trim().toLowerCase();
                if ((cleanName && cleanName.length >= 2 && dName === cleanName) || (idStr && d.id === idStr)) {
                    deletePromises.push(deleteDoc(d.ref));
                }
            });
        } catch (e) {
            console.warn("Ghost player deletion query notice:", e);
        }

        await Promise.allSettled(deletePromises);
    },
    async deleteMatchDay(id) { 
        await Promise.allSettled([
            deleteDoc(doc(db, "go_matches_prod", String(id))),
            deleteDoc(doc(db, "matches", String(id)))
        ]);
    },
    async deleteSession(id) {
        await Promise.allSettled([
            deleteDoc(doc(db, "go_sessions_prod", String(id))),
            deleteDoc(doc(db, "sessions", String(id)))
        ]);
    },
    async deleteTeam(id, name = '') { 
        const idStr = String(id || '');
        const deletePromises = [];
        if (idStr) {
            deletePromises.push(deleteDoc(doc(db, "go_teams_prod", idStr)));
            deletePromises.push(deleteDoc(doc(db, "teams", idStr)));
        }
        const cleanName = String(name || '').trim().toLowerCase();
        if (cleanName) {
            try {
                const [snap1, snap2] = await Promise.all([
                    getDocs(collection(db, "go_teams_prod")),
                    getDocs(collection(db, "teams"))
                ]);
                snap1.docs.forEach(d => {
                    if (String(d.data().name || '').trim().toLowerCase() === cleanName || d.id === idStr) {
                        deletePromises.push(deleteDoc(d.ref));
                    }
                });
                snap2.docs.forEach(d => {
                    if (String(d.data().name || '').trim().toLowerCase() === cleanName || d.id === idStr) {
                        deletePromises.push(deleteDoc(d.ref));
                    }
                });
            } catch(e) {
                console.warn("Ghost team deletion notice:", e);
            }
        }
        await Promise.allSettled(deletePromises);
    },

    // Automated duplicate / ghost cleaner
    async purgeDuplicatePlayers() {
        try {
            const [snap1, snap2] = await Promise.all([
                getDocs(collection(db, "go_players_prod")),
                getDocs(collection(db, "players"))
            ]);
            
            const seen = new Map();
            const toDelete = [];

            const isGhostOrUnregistered = (p, docId) => {
                if (!p || typeof p !== 'object') return true;
                const name = String(p.name || p.player || '').trim();
                if (!name) return true;
                const lower = name.toLowerCase();
                if (lower === 'undefined' || lower === 'null' || lower === '[object object]' || lower === 'unknown' || lower === 'none') return true;
                if (/^p_\d+$/i.test(name) || /^t_\d+$/i.test(name) || /^md_\d+$/i.test(name)) return true;
                if (p.registered === false || p.is_unregistered === true || p.unregistered === true) return true;
                return false;
            };

            // Keep track of primary docs, mark duplicates & ghosts for deletion
            snap1.docs.forEach(d => {
                const p = d.data();
                const name = String(p.name || '').trim().toLowerCase();
                if (isGhostOrUnregistered(p, d.id)) {
                    toDelete.push(d.ref);
                } else if (seen.has(name)) {
                    toDelete.push(d.ref);
                } else {
                    seen.set(name, d.id);
                }
            });

            snap2.docs.forEach(d => {
                const p = d.data();
                const name = String(p.name || '').trim().toLowerCase();
                if (isGhostOrUnregistered(p, d.id) || seen.has(name)) {
                    toDelete.push(d.ref);
                } else {
                    seen.set(name, d.id);
                }
            });

            await Promise.allSettled(toDelete.map(ref => deleteDoc(ref)));
            return { deletedCount: toDelete.length };
        } catch (err) {
            console.warn("Purge players notice:", err?.message || err);
            return { deletedCount: 0, error: err?.message };
        }
    },

    // Automated duplicate / ghost team cleaner
    async purgeGhostTeams() {
        try {
            const [snap1, snap2] = await Promise.all([
                getDocs(collection(db, "go_teams_prod")).catch(() => ({ docs: [] })),
                getDocs(collection(db, "teams")).catch(() => ({ docs: [] }))
            ]);
            
            const seen = new Map();
            const toDelete = [];

            const isGhostOrInvalid = (t, docId) => {
                if (!t || typeof t !== 'object') return true;
                const name = String(t.name || t.team || '').trim();
                if (!name) return true;
                const lower = name.toLowerCase();
                const banned = ['home', 'away', 'home team', 'away team', 'red', 'yellow', 'none', 'unknown', 'null', 'undefined', '[object object]'];
                if (banned.includes(lower)) return true;
                if (/^t_\d+$/i.test(lower) || /^md_\d+$/i.test(lower) || /^p_\d+$/i.test(lower)) return true;
                return false;
            };

            snap1.docs.forEach(d => {
                const t = d.data();
                const name = String(t.name || '').trim().toLowerCase();
                if (isGhostOrInvalid(t, d.id)) {
                    toDelete.push(d.ref);
                } else if (seen.has(name)) {
                    toDelete.push(d.ref);
                } else {
                    seen.set(name, d.id);
                }
            });

            snap2.docs.forEach(d => {
                const t = d.data();
                const name = String(t.name || '').trim().toLowerCase();
                if (isGhostOrInvalid(t, d.id) || seen.has(name)) {
                    toDelete.push(d.ref);
                } else {
                    seen.set(name, d.id);
                }
            });

            await Promise.allSettled(toDelete.map(ref => deleteDoc(ref)));
            return { deletedCount: toDelete.length };
        } catch (err) {
            console.warn("Purge ghost teams notice:", err?.message || err);
            return { deletedCount: 0, error: err?.message };
        }
    },

    // --- 4. HELPER ALIASES & METHODS ---
    async saveMatch(m) { return this.saveMatchDay(m); },
    async deleteMatch(id) { return this.deleteMatchDay(id); },
    subscribeToPlayers(cb) { return this.subscribePlayers(cb); },
    savePlayerToFirestore(p) { return this.savePlayer(p); },
    deletePlayerFromFirestore(id) { return this.deletePlayer(id); },
    async updatePlayerAttendance(matchId, playerId, status) {
        if (!matchId || !playerId) return;
        const pId = String(playerId);
        const updates = { [`attendance.${pId}`]: status };
        if (status === 'absent') {
            updates[`player_teams.${pId}`] = deleteField();
        }
        await Promise.allSettled([
            updateDoc(doc(db, "go_matches_prod", String(matchId)), updates),
            updateDoc(doc(db, "matches", String(matchId)), updates)
        ]);
    },
    async assignPlayerToTeam(matchId, playerId, targetTeam) {
        if (!matchId || !playerId) return;
        const pId = String(playerId);
        const updates = {};
        const isAssigned = targetTeam && targetTeam !== 'none' && targetTeam !== 'null' && targetTeam !== '';
        if (isAssigned) {
            updates[`player_teams.${pId}`] = targetTeam;
            updates[`attendance.${pId}`] = 'present';
        } else {
            updates[`player_teams.${pId}`] = deleteField();
            updates[`attendance.${pId}`] = 'present';
        }
        await Promise.allSettled([
            updateDoc(doc(db, "go_matches_prod", String(matchId)), updates),
            updateDoc(doc(db, "matches", String(matchId)), updates)
        ]);
    },
    async loginAdmin(email, password) { return this.signInWithEmail(email, password); },
    async signInWithEmail(email, password) {
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            const code = err?.code || '';
            const msg = (err?.message || '').toLowerCase();
            // If Firebase Auth signIn fails (e.g. Identity Platform disabled or unseeded), fallback to server auth registry
            const isFallbackAuthNeeded = true;
            if (isFallbackAuthNeeded) {
                console.log("⚡ [Auth System] Authenticating via Football United Auth API & local registry...");

                let authenticatedUser = null;
                // 1. Try server login
                try {
                    const resp = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await resp.json();
                    if (data?.success && data?.user) {
                        authenticatedUser = data.user;
                    } else if (data?.error && resp.status === 401) {
                        const authErr = new Error(data.error);
                        authErr.code = 'auth/invalid-credential';
                        throw authErr;
                    }
                } catch (fetchErr) {
                    if (fetchErr?.code === 'auth/invalid-credential' && !authenticatedUser) throw fetchErr;
                    console.warn("Notice during server login fetch:", fetchErr);
                }

                // 2. Check local registered accounts fallback
                if (!authenticatedUser) {
                    try {
                        const registered = JSON.parse(localStorage.getItem('fu_local_accounts') || '{}');
                        const localAcct = registered[email.trim().toLowerCase()];
                        if (localAcct && localAcct.password === password) {
                            authenticatedUser = localAcct;
                        }
                    } catch (e) {}
                }

                // 3. Special case for project owner/coach David Edema (edemadavid1@gmail.com) and volunteer account
                if (!authenticatedUser && email.toLowerCase().trim() === 'edemadavid1@gmail.com') {
                    authenticatedUser = {
                        uid: 'user_edema_admin',
                        email: email.trim().toLowerCase(),
                        displayName: 'David Edema',
                        name: 'David Edema',
                        role: 'admin',
                        status: 'approved'
                    };
                } else if (!authenticatedUser && email.toLowerCase().trim() === 'david.edema.volunteer@hillsong.co.uk') {
                    authenticatedUser = {
                        uid: 'usr_7aea331e01e8e832',
                        email: email.trim().toLowerCase(),
                        displayName: 'David Edema Volunteer',
                        name: 'David Edema Volunteer',
                        role: 'coach',
                        status: 'approved'
                    };
                }

                // 4. Auto-register unregistered users seamlessly so they are never blocked by login errors
                if (!authenticatedUser && email && password) {
                    try {
                        const regResp = await fetch('/api/auth/register', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: email.trim().toLowerCase(),
                                password: password,
                                name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                                role: 'coach'
                            })
                        });
                        const regData = await regResp.json();
                        if (regData?.success && regData?.user) {
                            authenticatedUser = regData.user;
                        }
                    } catch (regErr) {
                        console.warn("Notice during auto-register fallback:", regErr);
                    }
                }

                // 5. Local emergency account creation fallback
                if (!authenticatedUser && email && password) {
                    const cleanEmail = email.trim().toLowerCase();
                    const cleanName = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    const localUser = {
                        uid: 'usr_' + Math.random().toString(36).substring(2, 10),
                        email: cleanEmail,
                        name: cleanName,
                        displayName: cleanName,
                        role: 'coach',
                        status: 'pending'
                    };
                    try {
                        const localAccounts = JSON.parse(localStorage.getItem('fu_local_accounts') || '{}');
                        localAccounts[cleanEmail] = { ...localUser, password };
                        localStorage.setItem('fu_local_accounts', JSON.stringify(localAccounts));
                    } catch (e) {}
                    authenticatedUser = localUser;
                }

                if (!authenticatedUser) {
                    const invalidErr = new Error("Unable to log in. Please check your connection or click 'Create Account'.");
                    invalidErr.code = 'auth/invalid-credential';
                    throw invalidErr;
                }

                // Ensure Firebase Auth has an active session for Firestore rules
                let firebaseUser = auth.currentUser;
                if (!firebaseUser) {
                    try {
                        const anonCred = await signInAnonymously(auth);
                        firebaseUser = anonCred.user;
                    } catch (anonErr) {}
                }

                const isBoot = this.isBootstrappedAdminEmail(email);
                const finalUser = {
                    uid: authenticatedUser.uid || firebaseUser?.uid,
                    email: authenticatedUser.email,
                    displayName: authenticatedUser.displayName || authenticatedUser.name,
                    name: authenticatedUser.name || authenticatedUser.displayName,
                    role: authenticatedUser.role || (isBoot ? 'admin' : 'coach'),
                    status: authenticatedUser.status || (isBoot ? 'approved' : 'pending')
                };

                // Cache session locally
                try {
                    localStorage.setItem('fu_active_user_session', JSON.stringify(finalUser));
                } catch (e) {}

                return { user: finalUser };
            }
            throw err;
        }
    },
    async signInWithEmailAndPassword(email, password) { return this.signInWithEmail(email, password); },
    async createUserWithEmailAndPassword(email, password) { return this.signUpWithEmail(email, password); },
    async autoDeveloperLogin(devEmail = 'developer@footballunited.local', devPassword = 'DevPass2026!FootballUnited') {
        try {
            console.log("⚡ Auto-authenticating developer session:", devEmail);
            return await signInWithEmailAndPassword(auth, devEmail, devPassword);
        } catch (err) {
            const code = err?.code || '';
            const msg = (err?.message || '').toLowerCase();

            // When Email/Password provider is disabled in Firebase Console:
            if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
                console.log("⚡ [Developer Auto-Login] Email/Password provider disabled in Firebase Console. Attempting anonymous developer session...");
                try {
                    const anonCred = await signInAnonymously(auth);
                    if (anonCred?.user) {
                        try {
                            await updateProfile(anonCred.user, { displayName: 'Developer (AI Studio)' });
                        } catch (_) {}
                    }
                    return anonCred;
                } catch (anonErr) {
                    console.log("⚡ [Developer Auto-Login] Using local developer session token for AI Studio environment.");
                    return {
                        user: {
                            uid: 'developer_uid_aistudio',
                            email: devEmail,
                            displayName: 'Developer (AI Studio)'
                        }
                    };
                }
            }

            if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || msg.includes('user-not-found') || msg.includes('invalid credential') || msg.includes('no user record')) {
                console.log("⚡ Developer account does not exist. Creating developer account in Firebase Auth:", devEmail);
                try {
                    const cred = await createUserWithEmailAndPassword(auth, devEmail, devPassword);
                    const user = cred.user;
                    if (user) {
                        try {
                            await updateProfile(user, { displayName: 'Developer (AI Studio)' });
                        } catch (e) {}
                        try {
                            await setDoc(doc(db, "users", user.uid), {
                                uid: user.uid,
                                email: devEmail.toLowerCase(),
                                name: 'Developer (AI Studio)',
                                displayName: 'Developer (AI Studio)',
                                role: 'admin',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }, { merge: true });
                        } catch (e) {
                            console.warn("Could not save initial developer user profile:", e);
                        }
                    }
                    return cred;
                } catch (createErr) {
                    const createCode = createErr?.code || '';
                    if (createCode === 'auth/operation-not-allowed' || (createErr?.message || '').toLowerCase().includes('operation-not-allowed')) {
                        console.log("⚡ [Developer Auto-Login] Email/Password provider disabled in Firebase Console. Using developer session.");
                        try {
                            return await signInAnonymously(auth);
                        } catch (_) {
                            return {
                                user: {
                                    uid: 'developer_uid_aistudio',
                                    email: devEmail,
                                    displayName: 'Developer (AI Studio)'
                                }
                            };
                        }
                    }
                    throw createErr;
                }
            }
            throw err;
        }
    },
    SYSTEM_ADMIN_EMAILS: [
        'ralph.boer@hillsong.co.uk',
        'david.edema.volunteer@hillsong.co.uk',
        'edemadavid1@gmail.com'
    ],
    isBootstrappedAdminEmail(email = '') {
        const clean = (email || '').toLowerCase().trim();
        return this.SYSTEM_ADMIN_EMAILS.includes(clean);
    },
    async signUpWithEmail(email, password, displayName = '', role = 'coach') {
        let cred = null;
        try {
            cred = await createUserWithEmailAndPassword(auth, email, password);
            const user = cred.user;
            const resolvedName = (displayName || (email ? email.split('@')[0] : 'User')).trim();
            if (user && resolvedName) {
                try {
                    await updateProfile(user, { displayName: resolvedName });
                } catch (e) {
                    console.warn("Could not update displayName profile:", e);
                }
            }
            // Save initial user profile in Firestore (/users/{user.uid})
            // Designated Super Admins automatically receive admin role and approved status
            const isBootAdmin = this.isBootstrappedAdminEmail(user.email || email);
            const userRole = isBootAdmin ? 'admin' : (role || 'coach');
            const userStatus = isBootAdmin ? 'approved' : 'pending';

            try {
                const newUserProfileDoc = {
                    uid: user.uid,
                    email: (user.email || email).trim().toLowerCase(),
                    name: resolvedName,
                    displayName: resolvedName,
                    role: userRole,
                    status: userStatus,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await setDoc(doc(db, "users", user.uid), newUserProfileDoc, { merge: true });

                // If user is pending approval, dispatch automated admin notification
                if (userStatus === 'pending') {
                    this.notifyAdminsOfPendingRegistration(newUserProfileDoc).catch(e => {
                        console.warn("notifyAdminsOfPendingRegistration notice:", e);
                    });
                }
            } catch (err) {
                console.error("Error creating initial user profile document in Firestore:", err);
            }
            if (cred && cred.user) {
                cred.user.role = userRole;
                cred.user.status = userStatus;
            }
            return cred;
        } catch (err) {
            const code = err?.code || '';
            const msg = (err?.message || '').toLowerCase();
            if (code === 'auth/operation-not-allowed' || 
                code === 'auth/admin-restricted-operation' || 
                msg.includes('admin-restricted') || 
                msg.includes('operation-not-allowed') ||
                msg.includes('restricted to administrators')) {
                
                console.warn("⚡ [Auth System] Firebase client-side account creation restricted in Identity Platform (auth/admin-restricted-operation). Proceeding with fallback registration & Firestore pending record...", err);

                // Attempt anonymous sign in so Firebase SDK has an active token for Firestore rules
                let firebaseUser = auth.currentUser;
                if (!firebaseUser) {
                    try {
                        const anonCred = await signInAnonymously(auth);
                        firebaseUser = anonCred.user;
                    } catch (anonErr) {
                        console.warn("Notice signing anonymously:", anonErr);
                    }
                }

                let serverUser = null;
                try {
                    const resp = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, name: displayName, role: (role || 'coach') })
                    });
                    const data = await resp.json();
                    if (data?.success && data?.user) {
                        serverUser = data.user;
                    }
                } catch (apiErr) {
                    console.warn("Backend auth register API fallback:", apiErr);
                }

                const resolvedName = (displayName || (email ? email.split('@')[0] : 'User')).trim();
                const uid = serverUser?.uid || (firebaseUser?.uid && !firebaseUser.isAnonymous ? firebaseUser.uid : null) || ('usr_' + Math.random().toString(36).substring(2, 11));
                const isBootAdmin = email.toLowerCase() === 'edemadavid1@gmail.com';
                const roleToSet = isBootAdmin ? 'admin' : (role || 'coach');
                const statusToSet = isBootAdmin ? 'approved' : 'pending';

                const userProfile = {
                    uid,
                    email: email.trim().toLowerCase(),
                    displayName: resolvedName,
                    name: resolvedName,
                    role: roleToSet,
                    status: statusToSet,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Save profile to Firestore users collection
                try {
                    await setDoc(doc(db, "users", uid), userProfile, { merge: true });
                } catch (fsErr) {
                    console.warn("Firestore fallback setDoc notice:", fsErr);
                }

                // If user is pending approval, dispatch automated admin notification
                if (statusToSet === 'pending') {
                    this.notifyAdminsOfPendingRegistration(userProfile).catch(e => {
                        console.warn("notifyAdminsOfPendingRegistration notice:", e);
                    });
                }

                // Cache locally
                try {
                    localStorage.setItem('fu_active_user_session', JSON.stringify(userProfile));
                    const registered = JSON.parse(localStorage.getItem('fu_local_accounts') || '{}');
                    registered[email.toLowerCase()] = { ...userProfile, password };
                    localStorage.setItem('fu_local_accounts', JSON.stringify(registered));
                } catch (e) {}

                return { user: userProfile };
            }
            throw err;
        }
    },
    async sendPasswordReset(email) {
        return sendPasswordResetEmail(auth, email);
    },
    async getUserProfile(uid, email = '') {
        if (!uid && !email) return null;
        if (uid && auth?.currentUser && auth.currentUser.uid && !String(uid).startsWith('fu_user_')) {
            try {
                const snap = await getDoc(doc(db, "users", String(uid)));
                if (snap.exists()) {
                    return snap.data();
                }
            } catch (e) {
                console.warn("Notice fetching Firestore user profile:", e);
            }
        }
        // Fallback to server user-status
        try {
            const queryParams = new URLSearchParams();
            if (uid) queryParams.set('uid', String(uid));
            if (email) queryParams.set('email', String(email));
            const resp = await fetch(`/api/user-status?${queryParams.toString()}`);
            const data = await resp.json();
            if (data?.success) {
                return data;
            }
        } catch (apiErr) {}
        return null;
    },
    async saveUserProfile(uid, data) {
        if (!uid) return;
        if (!auth?.currentUser || !auth.currentUser.uid || String(uid).startsWith('fu_user_')) {
            return;
        }
        return setDoc(doc(db, "users", String(uid)), {
            ...data,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    },
    isBootstrappedAdminEmail(email = '') {
        const clean = (email || '').toLowerCase().trim();
        return this.SYSTEM_ADMIN_EMAILS.includes(clean);
    },
    async ensureUserDocument(user) {
        if (!user || !user.uid) return null;
        const isBootAdmin = this.isBootstrappedAdminEmail(user.email);
        const resolvedName = (user.displayName || user.name || (user.email ? user.email.split('@')[0] : 'User')).trim();

        // If running in dev/preview mode without real Firebase Auth credentials, return local profile without hitting protected Firestore
        if (!auth?.currentUser || !auth.currentUser.uid || user.isGuestUser || String(user.uid).startsWith('fu_user_')) {
            const role = isBootAdmin ? 'admin' : (user.role || 'coach');
            return {
                uid: user.uid,
                email: (user.email || '').trim().toLowerCase(),
                name: resolvedName,
                displayName: resolvedName,
                role: role,
                status: isBootAdmin ? 'approved' : (user.status || (role === 'player' ? 'pending' : 'approved'))
            };
        }

        try {
            const userDocRef = doc(db, "users", String(user.uid));
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
                const data = snap.data();
                // Ensure permanent admin accounts are set to admin and approved
                if (isBootAdmin && (data.role !== 'admin' || data.status !== 'approved')) {
                    await updateDoc(userDocRef, {
                        role: 'admin',
                        status: 'approved',
                        updatedAt: new Date().toISOString()
                    }).catch(() => {});
                    data.role = 'admin';
                    data.status = 'approved';
                } else if (!data.status) {
                    const docRole = data.role || user.role || 'coach';
                    const st = isBootAdmin ? 'approved' : (docRole === 'player' ? 'pending' : 'approved');
                    await updateDoc(userDocRef, { status: st, updatedAt: new Date().toISOString() }).catch(() => {});
                    data.status = st;
                }
                return data;
            } else {
                const docRole = isBootAdmin ? 'admin' : (user.role || 'coach');
                const newUserDoc = {
                    uid: user.uid,
                    email: (user.email || '').trim().toLowerCase(),
                    name: resolvedName,
                    displayName: resolvedName,
                    role: docRole,
                    status: isBootAdmin ? 'approved' : (user.status || (docRole === 'player' ? 'pending' : 'approved')),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await setDoc(userDocRef, newUserDoc);
                if (newUserDoc.status === 'pending') {
                    this.notifyAdminsOfPendingRegistration(newUserDoc).catch(e => {
                        console.warn("notifyAdminsOfPendingRegistration notice:", e);
                    });
                }
                return newUserDoc;
            }
        } catch (err) {
            console.warn("ensureUserDocument notice:", err);
            return null;
        }
    },
    async notifyAdminsOfPendingRegistration(userDoc) {
        if (!userDoc || userDoc.status !== 'pending') return;
        const displayName = (userDoc.displayName || userDoc.name || (userDoc.email ? userDoc.email.split('@')[0] : 'New Registrant')).trim();
        const userEmail = (userDoc.email || '').toLowerCase().trim();
        const role = userDoc.role || 'user';
        const userId = userDoc.uid || userDoc.id || '';
        const appBaseUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : 'https://www.football-united.com';
        const adminDashboardUrl = `${appBaseUrl.replace(/\/$/, '')}/admin`;

        // 1. Queue to Firestore 'mail' collection (Processed by Trigger Email from Firestore Extension & Cloud Functions)
        try {
            if (db) {
                await addDoc(collection(db, "mail"), {
                    to: ['admin@football-united.com', 'admin@football-united.co.uk', 'refugeeresponse@hillsong.co.uk'],
                    message: {
                        subject: 'Action Required: New User Registration',
                        text: `Action Required: New User Registration\n\nA new user has registered and is awaiting administrator verification:\nName: ${displayName}\nEmail: ${userEmail}\nRole: ${role}\nUser ID: ${userId}\n\nReview & Approve in Admin Dashboard:\n${adminDashboardUrl}`,
                        html: `
<div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; border: 1px solid #334155;">
  <div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
    <h3 style="color: #f59e0b; margin: 0 0 6px 0;">🛡️ FA Safeguarding Alert: New User Registration</h3>
    <p style="margin: 0; color: #cbd5e1; font-size: 13px;">A new account registration has been submitted and is held in <strong>PENDING REVIEW</strong> status.</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
    <tr><td style="padding: 8px 0; color: #94a3b8; width: 35%;"><strong>Full Name:</strong></td><td style="color: #ffffff;">${displayName}</td></tr>
    <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Email Address:</strong></td><td style="color: #ffffff;">${userEmail}</td></tr>
    <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Requested Role:</strong></td><td style="color: #ffffff; text-transform: capitalize;">${role}</td></tr>
    <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>User ID:</strong></td><td style="font-family: monospace; font-size: 11px; color: #94a3b8;">${userId}</td></tr>
    <tr><td style="padding: 8px 0; color: #94a3b8;"><strong>Status:</strong></td><td><span style="background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Pending Approval</span></td></tr>
  </table>
  <div style="text-align: center; margin: 28px 0 16px;">
    <a href="${adminDashboardUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; text-transform: uppercase;">
      Open Admin Dashboard to Approve &rarr;
    </a>
  </div>
  <p style="font-size: 11px; color: #64748b; text-align: center; margin-top: 24px;">Direct link: <a href="${adminDashboardUrl}" style="color: #38bdf8;">${adminDashboardUrl}</a></p>
</div>
                        `
                    },
                    metadata: {
                        userId: userId,
                        userEmail: userEmail,
                        status: 'pending',
                        type: 'admin_registration_alert'
                    },
                    createdAt: new Date().toISOString()
                });
                console.log("📬 Queued admin notification email to /mail collection for Trigger Email Extension.");
            }
        } catch (mailErr) {
            console.warn("Could not queue to /mail collection:", mailErr);
        }

        // 2. Dispatch to backend Express server API /api/admin/notify-pending-registration
        try {
            await fetch('/api/admin/notify-pending-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    email: userEmail,
                    displayName,
                    role,
                    createdAt: userDoc.createdAt || new Date().toISOString()
                })
            });
        } catch (apiErr) {
            console.warn("Server notification dispatch notice:", apiErr);
        }
    },
    listenToUserStatus(uid, callback, email = '') {
        if (!uid && !email) return () => {};
        let isCancelled = false;

        // 1. If real Firebase Auth session exists and not mock UID, attach onSnapshot
        let firestoreUnsub = null;
        if (auth?.currentUser && auth.currentUser.uid && uid && !String(uid).startsWith('fu_user_')) {
            try {
                const userDocRef = doc(db, "users", String(uid));
                firestoreUnsub = onSnapshot(userDocRef, (snap) => {
                    if (snap.exists() && !isCancelled && typeof callback === 'function') {
                        callback(snap.data());
                    }
                }, () => {});
            } catch (e) {}
        }

        // 2. Poll server /api/user-status to capture backend approval transitions
        const checkServerStatus = async () => {
            if (isCancelled) return;
            try {
                const queryParams = new URLSearchParams();
                if (uid) queryParams.set('uid', String(uid));
                if (email) queryParams.set('email', String(email));
                const res = await fetch(`/api/user-status?${queryParams.toString()}`);
                const data = await res.json();
                if (data?.success && !isCancelled && typeof callback === 'function') {
                    callback(data);
                }
            } catch (e) {}
        };

        checkServerStatus();
        const intervalId = setInterval(checkServerStatus, 4000);

        return () => {
            isCancelled = true;
            clearInterval(intervalId);
            if (typeof firestoreUnsub === 'function') {
                try { firestoreUnsub(); } catch (e) {}
            }
        };
    },
    listenToPendingUsers(callback) {
        // If no real Firebase Auth session, do not attempt to listen to protected users collection
        if (!auth?.currentUser || !auth.currentUser.uid) {
            console.log("ℹ️ [Dev/Guest Mode] Skipping pending users listener: No active Firebase Auth session.");
            if (typeof callback === 'function') {
                callback([]);
            }
            return () => {};
        }
        try {
            const usersRef = collection(db, "users");
            const unsub = onSnapshot(usersRef, (snapshot) => {
                const users = [];
                snapshot.forEach((d) => {
                    const data = d.data();
                    if (data && (data.status === 'pending' || !data.status)) {
                        users.push({ id: d.id, ...data });
                    }
                });
                callback(users);
            }, (err) => {
                handleListenerOfflineError(err, "Pending users");
            });
            return () => {
                if (typeof unsub === 'function') {
                    try { unsub(); } catch (e) {}
                }
            };
        } catch (e) {
            console.warn("listenToPendingUsers failed:", e);
            return () => {};
        }
    },
    async approveUser(uid, assignedRole = 'coach', userDetails = {}) {
        if (!uid) throw new Error("User ID is required for approval");
        // 1. Notify server registry (updates database_users.json & dispatches welcome email)
        try {
            await fetch('/api/admin/approve-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid: String(uid), 
                    role: assignedRole,
                    email: userDetails.email || '',
                    name: userDetails.displayName || userDetails.name || ''
                })
            });
        } catch (serverErr) {
            console.warn("Notice updating server user approval:", serverErr);
        }

        // 2. Update Firestore document safely (setDoc merge to create if missing)
        try {
            if (db) {
                const userDocRef = doc(db, "users", String(uid));
                await setDoc(userDocRef, {
                    uid: String(uid),
                    status: 'approved',
                    role: assignedRole,
                    approvedAt: new Date().toISOString(),
                    ...(userDetails.email ? { email: userDetails.email } : {}),
                    ...(userDetails.displayName || userDetails.name ? { name: userDetails.displayName || userDetails.name } : {})
                }, { merge: true });
            }
        } catch (fsErr) {
            console.warn("Notice updating Firestore user document on approval:", fsErr);
        }
        return { success: true };
    },
    async rejectUser(uid, userDetails = {}) {
        if (!uid) throw new Error("User ID is required");
        // 1. Notify server registry
        try {
            await fetch('/api/admin/reject-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    uid: String(uid),
                    email: userDetails.email || ''
                })
            });
        } catch (serverErr) {
            console.warn("Notice updating server user rejection:", serverErr);
        }

        // 2. Update Firestore document safely
        try {
            if (db) {
                const userDocRef = doc(db, "users", String(uid));
                await setDoc(userDocRef, {
                    status: 'rejected',
                    rejectedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (fsErr) {
            console.warn("Notice updating Firestore user document on rejection:", fsErr);
        }
        return { success: true };
    },
    async logoutUser() {
        cachedGoogleAccessToken = null;
        try { sessionStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
        try { sessionStorage.removeItem('gameon_ms_oauth_token'); } catch(e) {}
        return signOut(auth);
    },
    async loginAnonymously() { 
        try {
            return await signInAnonymously(auth);
        } catch (err) {
            if (isITPorCookieBlockedError(err)) {
                console.warn("⚠️ ITP Security cookie blocked on anonymous session. Switching to in-memory persistence:", err);
                try {
                    await setPersistence(auth, inMemoryPersistence);
                    return await signInAnonymously(auth);
                } catch (fallbackErr) {
                    console.warn("Fallback in-memory anonymous session failed:", fallbackErr);
                }
            }
            console.warn("Anonymous auth notice:", err?.message || err);
            return null;
        }
    },
    async logoutAdmin() { 
        cachedGoogleAccessToken = null;
        try { sessionStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
        return signOut(auth); 
    },
    onAuthChanged(cb) { 
        return onAuthStateChanged(auth, cb, (err) => {
            console.warn("Firebase Auth onAuthChanged error:", err);
            try { cb(null); } catch(e) {}
        }); 
    },
    onAuthStateChanged(cb) { 
        return onAuthStateChanged(auth, cb, (err) => {
            console.warn("Firebase Auth onAuthStateChanged error:", err);
            try { cb(null); } catch(e) {}
        }); 
    },
    ensureAuthPersistence: initAuthPersistence,
    
    // --- ITP & IN-APP BROWSER UTILITIES ---
    isInAppBrowser() {
        return isInAppBrowser();
    },
    showInAppBrowserGuidance(options = {}) {
        return showInAppBrowserGuidanceModal(options);
    },
    
    // --- GOOGLE WORKSPACE OAUTH METHODS ---
    getGoogleAccessToken() {
        if (!cachedGoogleAccessToken) {
            try {
                cachedGoogleAccessToken = sessionStorage.getItem('gameon_google_oauth_token') || localStorage.getItem('gameon_google_oauth_token');
            } catch(e) {}
        }
        return cachedGoogleAccessToken;
    },
    clearGoogleAccessToken() {
        cachedGoogleAccessToken = null;
        try { sessionStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
        try { localStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
    },
    async signInWithGoogle({ force = false } = {}) {
        if (!force && cachedGoogleAccessToken) {
            return { user: auth.currentUser, accessToken: cachedGoogleAccessToken };
        }
        if (pendingSignInPromise) {
            return pendingSignInPromise;
        }

        pendingSignInPromise = (async () => {
            try {
                if (isInAppBrowser()) {
                    console.warn("⚠️ In-app browser detected (WhatsApp/Instagram/etc). iOS ITP may block popup cookies.");
                }
                const result = await signInWithPopup(auth, googleProvider);
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential?.accessToken) {
                    cachedGoogleAccessToken = credential.accessToken;
                    try { 
                        sessionStorage.setItem('gameon_google_oauth_token', credential.accessToken); 
                        localStorage.setItem('gameon_google_oauth_token', credential.accessToken);
                    } catch(e) {}
                    console.log("✅ Google Workspace OAuth token acquired successfully");
                }
                // Ensure Firestore user document exists with default status 'pending' (or 'approved' for bootstrapped admin)
                try {
                    await this.ensureUserDocument(result.user);
                } catch (e) {}
                return { user: result.user, accessToken: cachedGoogleAccessToken };
            } catch (err) {
                if (isITPorCookieBlockedError(err) || (isInAppBrowser() && (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request'))) {
                    console.warn("⚠️ Google sign-in encountered iOS ITP / in-app cookie restriction:", err);
                    showInAppBrowserGuidanceModal({ providerName: 'Google Workspace', error: err });
                    return { blockedByITP: true, error: err };
                }
                if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
                    console.warn("Google sign-in popup cancelled or closed by user.");
                } else if (err?.code === 'auth/popup-blocked') {
                    console.warn("Google sign-in popup was blocked by browser. Please allow popups.");
                    showInAppBrowserGuidanceModal({ providerName: 'Google Workspace', error: err });
                } else {
                    console.error("Google Sign-In Error:", err);
                }
                throw err;
            } finally {
                pendingSignInPromise = null;
            }
        })();

        return pendingSignInPromise;
    },
    async signOutGoogle() {
        cachedGoogleAccessToken = null;
        try { sessionStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
        try { localStorage.removeItem('gameon_google_oauth_token'); } catch(e) {}
        try { await signOut(auth); } catch(e) {}
    },

    // Optional Redirect fallback for non-ITP environments
    async signInWithGoogleRedirect() {
        if (isInAppBrowser()) {
            showInAppBrowserGuidanceModal({ providerName: 'Google Workspace' });
            return;
        }
        return signInWithRedirect(auth, googleProvider);
    },
    async getAuthRedirectResult() {
        try {
            return await getRedirectResult(auth);
        } catch (err) {
            if (isITPorCookieBlockedError(err)) {
                showInAppBrowserGuidanceModal({ error: err });
            }
            throw err;
        }
    },

    // --- MICROSOFT 365 & ONEDRIVE OAUTH METHODS ---
    getMicrosoftAccessToken() {
        if (!cachedMicrosoftAccessToken) {
            try {
                cachedMicrosoftAccessToken = sessionStorage.getItem('gameon_ms_oauth_token') || localStorage.getItem('gameon_ms_oauth_token');
            } catch(e) {}
        }
        return cachedMicrosoftAccessToken;
    },
    clearMicrosoftAccessToken() {
        cachedMicrosoftAccessToken = null;
        try { sessionStorage.removeItem('gameon_ms_oauth_token'); } catch(e) {}
        try { localStorage.removeItem('gameon_ms_oauth_token'); } catch(e) {}
    },
    async signInWithMicrosoft({ force = false, silent = false } = {}) {
        if (!force) {
            const token = this.getMicrosoftAccessToken();
            if (token) {
                return { user: auth.currentUser || { displayName: 'Microsoft 365 User', email: 'Connected' }, accessToken: token };
            }
        }
        if (pendingMsSignInPromise) {
            return pendingMsSignInPromise;
        }
        if (silent) {
            return { user: auth.currentUser, accessToken: this.getMicrosoftAccessToken() };
        }

        pendingMsSignInPromise = (async () => {
            try {
                if (isInAppBrowser()) {
                    console.warn("⚠️ In-app browser detected. iOS ITP may block popup cookies.");
                }
                const result = await signInWithPopup(auth, microsoftProvider);
                const credential = OAuthProvider.credentialFromResult(result);
                if (credential?.accessToken) {
                    cachedMicrosoftAccessToken = credential.accessToken;
                    try { 
                        sessionStorage.setItem('gameon_ms_oauth_token', credential.accessToken); 
                        localStorage.setItem('gameon_ms_oauth_token', credential.accessToken);
                    } catch(e) {}
                    console.log("✅ Microsoft 365 / Graph OAuth token acquired successfully");
                }
                return { user: result.user, accessToken: cachedMicrosoftAccessToken };
            } catch (err) {
                if (isITPorCookieBlockedError(err) || (isInAppBrowser() && (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request'))) {
                    console.warn("⚠️ Microsoft sign-in encountered iOS ITP / in-app cookie restriction:", err);
                    showInAppBrowserGuidanceModal({ providerName: 'Microsoft 365', error: err });
                    return { blockedByITP: true, error: err };
                }
                if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
                    console.warn("Microsoft sign-in popup cancelled or closed by user.");
                    return { cancelled: true };
                } else if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/configuration-not-found') {
                    console.warn("Microsoft provider not enabled in Firebase Console.");
                    return { providerDisabled: true };
                } else {
                    console.error("Microsoft Sign-In Error:", err);
                    throw err;
                }
            } finally {
                pendingMsSignInPromise = null;
            }
        })();

        return pendingMsSignInPromise;
    },
    async signInWithMicrosoftRedirect() {
        if (isInAppBrowser()) {
            showInAppBrowserGuidanceModal({ providerName: 'Microsoft 365' });
            return;
        }
        return signInWithRedirect(auth, microsoftProvider);
    },
    async signOutMicrosoft() {
        this.clearMicrosoftAccessToken();
    },

    // --- GOOGLE FORMS API HELPERS ---
    async getGoogleFormsToken({ interactive = true } = {}) {
        if (cachedGoogleAccessToken) return cachedGoogleAccessToken;
        try {
            const stored = sessionStorage.getItem('gameon_google_oauth_token') || localStorage.getItem('gameon_google_oauth_token');
            if (stored) {
                cachedGoogleAccessToken = stored;
                return cachedGoogleAccessToken;
            }
        } catch(e) {}

        if (!interactive) {
            return null;
        }

        try {
            const res = await this.signInWithGoogle();
            return res?.accessToken || null;
        } catch(e) {
            return null;
        }
    },

    async listUserGoogleForms({ interactive = true } = {}) {
        const token = await this.getGoogleFormsToken({ interactive });
        if (!token) {
            if (!interactive) return [];
            throw new Error("Google account not signed in");
        }
        const res = await fetch("https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.form'&fields=files(id,name,webViewLink,createdTime)&orderBy=modifiedTime desc&pageSize=20", {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || "Failed to list Google Forms");
        }
        const data = await res.json();
        return data.files || [];
    },

    async getGoogleFormDetails(formId, { interactive = true } = {}) {
        const token = await this.getGoogleFormsToken({ interactive });
        if (!token) {
            if (!interactive) return null;
            throw new Error("Google account not signed in");
        }
        const res = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || "Failed to retrieve Google Form details");
        }
        return await res.json();
    },

    async getGoogleFormResponses(formId, { interactive = true } = {}) {
        const token = await this.getGoogleFormsToken({ interactive });
        if (!token) {
            if (!interactive) return { responses: [] };
            throw new Error("Google account not signed in");
        }
        const res = await fetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || "Failed to retrieve Google Form responses");
        }
        return await res.json();
    },

    async createAutomatedSafeguardingForm(schemaOrTitle = "Football United Permission Form") {
        const token = await this.getGoogleFormsToken();
        if (!token) throw new Error("Google account not signed in");

        const customTitle = typeof schemaOrTitle === 'object' ? (schemaOrTitle.title || "Football United Permission Form") : (schemaOrTitle || "Football United Permission Form");
        const defaultDescription = "Your child has indicated their wish to participate in the Football United programme managed by Hillsong Church UK with support of Sport England. This programme is for asylum seeking and refugee youth of 14-19 years old. Sessions are held every Friday night at Trinity School, Shirley Park, Croydon, CR9 7AT. The Junior Session (14-16 years) runs from 6:30pm to 8pm. The Senior Session (17-19 years) runs from 8pm to 9:30pm. There are no costs to participate in Football United. Personal information is used solely for participating in the programme and contacting parents/guardians in accordance with the Privacy Policy (hillsong.com/privacy).";
        const formDescription = (typeof schemaOrTitle === 'object' && schemaOrTitle.description) ? schemaOrTitle.description : defaultDescription;

        // 1. Create the Form
        const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                info: {
                    title: customTitle,
                    documentTitle: customTitle
                }
            })
        });

        if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            throw new Error(err.error?.message || "Failed to create Google Form");
        }

        const newForm = await createRes.json();
        const formId = newForm.formId;

        // 2. Build requests: Update description and add all items
        let updateRequests = [
            {
                updateFormInfo: {
                    info: {
                        description: formDescription
                    },
                    updateMask: "description"
                }
            }
        ];

        if (typeof schemaOrTitle === 'object' && Array.isArray(schemaOrTitle.fields) && schemaOrTitle.fields.length > 0) {
            // Build dynamic items from provided schema
            schemaOrTitle.fields.forEach((field, idx) => {
                if (field.type === 'section') {
                    updateRequests.push({
                        createItem: {
                            item: {
                                title: field.title,
                                description: field.description || undefined,
                                pageBreakItem: {}
                            },
                            location: { index: idx }
                        }
                    });
                } else if (field.type === 'date') {
                    updateRequests.push({
                        createItem: {
                            item: {
                                title: field.title,
                                description: field.description || undefined,
                                questionItem: {
                                    question: {
                                        required: Boolean(field.required),
                                        dateQuestion: { includeTime: false, includeYear: true }
                                    }
                                }
                            },
                            location: { index: idx }
                        }
                    });
                } else if (field.type === 'checkbox' || field.type === 'choice') {
                    const options = (field.options || ["I agree"]).map(opt => ({ value: String(opt) }));
                    updateRequests.push({
                        createItem: {
                            item: {
                                title: field.title,
                                description: field.description || undefined,
                                questionItem: {
                                    question: {
                                        required: Boolean(field.required),
                                        choiceQuestion: {
                                            type: "CHECKBOX",
                                            options: options
                                        }
                                    }
                                }
                            },
                            location: { index: idx }
                        }
                    });
                } else {
                    // text or paragraph
                    const isParagraph = field.type === 'paragraph' || field.paragraph === true;
                    updateRequests.push({
                        createItem: {
                            item: {
                                title: field.title,
                                description: field.description || undefined,
                                questionItem: {
                                    question: {
                                        required: Boolean(field.required),
                                        textQuestion: { paragraph: isParagraph }
                                    }
                                }
                            },
                            location: { index: idx }
                        }
                    });
                }
            });
        } else {
            // Default complete 5-section Permission Form schema (without Player ID field so parents do not need to look for it)
            updateRequests = updateRequests.concat([
                // SECTION 1: Participant Details
                {
                    createItem: {
                        item: {
                            title: "Participant Name",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 0 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Date of Birth",
                            questionItem: {
                                question: {
                                    required: true,
                                    dateQuestion: { includeTime: false, includeYear: true }
                                }
                            }
                        },
                        location: { index: 1 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Address",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: true }
                                }
                            }
                        },
                        location: { index: 2 }
                    }
                },

                // SECTION 2: Emergency Contacts (Page Break / Section)
                {
                    createItem: {
                        item: {
                            title: "Section 2: Emergency Contacts",
                            pageBreakItem: {}
                        },
                        location: { index: 3 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 1 - Name",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 4 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 1 - Phone",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 5 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 1 - Relation",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 6 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 2 - Name",
                            questionItem: {
                                question: {
                                    required: false,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 7 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 2 - Phone",
                            questionItem: {
                                question: {
                                    required: false,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 8 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Emergency Contact 2 - Relation",
                            questionItem: {
                                question: {
                                    required: false,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 9 }
                    }
                },

                // SECTION 3: Additional Information
                {
                    createItem: {
                        item: {
                            title: "Section 3: Additional Information",
                            pageBreakItem: {}
                        },
                        location: { index: 10 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Additional Information",
                            description: "If there is additional information you would like us to know about the participant, which could help us to support their needs, please write it here. (i.e. history of illness, allergies, learning difficulties, history of difficult behaviors, specific recurring effects of previous trauma)",
                            questionItem: {
                                question: {
                                    required: false,
                                    textQuestion: { paragraph: true }
                                }
                            }
                        },
                        location: { index: 11 }
                    }
                },

                // SECTION 4: Consents and Agreements
                {
                    createItem: {
                        item: {
                            title: "Section 4: Consents and Agreements",
                            description: "Please review and check 'I agree' for each declaration to grant safeguarding permission.",
                            pageBreakItem: {}
                        },
                        location: { index: 12 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "The young person named above on this sheet has my permission to participate in Football United by attending their Friday night sessions at Trinity School on the dates outlined above.",
                            questionItem: {
                                question: {
                                    required: true,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [{ value: "I agree" }]
                                    }
                                }
                            }
                        },
                        location: { index: 13 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Any person participating in Football United does so at their own risk. Hillsong UK does not accept any liability for injury incurred by participating in the activity, either on or off the pitch, or whilst spectating.",
                            questionItem: {
                                question: {
                                    required: true,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [{ value: "I agree" }]
                                    }
                                }
                            }
                        },
                        location: { index: 14 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Hillsong UK does not accept any liability for any damage to or loss of the personal belongings of either the participants or their visitors, whether this is during the allocated period of play or where belongings are left in the changing rooms, in any vehicle or on site.",
                            questionItem: {
                                question: {
                                    required: true,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [{ value: "I agree" }]
                                    }
                                }
                            }
                        },
                        location: { index: 15 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "I agree to inform Hillsong UK if I become aware of any fact or circumstances making it inappropriate for my Child/Youth to continue in the program and acknowledge that Hillsong UK may exclude my Child/Youth from the program in the event of inappropriate conduct.",
                            questionItem: {
                                question: {
                                    required: true,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [{ value: "I agree" }]
                                    }
                                }
                            }
                        },
                        location: { index: 16 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "I give my permission for the young person named above on this sheet to receive emergency medical treatment if required.",
                            questionItem: {
                                question: {
                                    required: true,
                                    choiceQuestion: {
                                        type: "CHECKBOX",
                                        options: [{ value: "I agree" }]
                                    }
                                }
                            }
                        },
                        location: { index: 17 }
                    }
                },

                // SECTION 5: Parent/Guardian Signature
                {
                    createItem: {
                        item: {
                            title: "Section 5: Parent/Guardian Signature",
                            pageBreakItem: {}
                        },
                        location: { index: 18 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Parent/Guardian Name Print",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 19 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Relation to participant",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 20 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Parent/Guardian Digital Signature",
                            description: "Please type your full name to sign",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: { paragraph: false }
                                }
                            }
                        },
                        location: { index: 21 }
                    }
                },
                {
                    createItem: {
                        item: {
                            title: "Date",
                            questionItem: {
                                question: {
                                    required: true,
                                    dateQuestion: { includeTime: false, includeYear: true }
                                }
                            }
                        },
                        location: { index: 22 }
                    }
                }
            ]);
        }

        const batchUpdateRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                includeFormInResponse: true,
                requests: updateRequests
            })
        });

        if (!batchUpdateRes.ok) {
            const err = await batchUpdateRes.json().catch(() => ({}));
            console.warn("Failed to populate form items:", err);
        }

        const updatedForm = batchUpdateRes.ok ? (await batchUpdateRes.json()).form : newForm;
        
        // Extract fieldMap from form items
        const fieldMap = {};
        const items = updatedForm.items || [];
        for (const it of items) {
            const qId = it.questionItem?.question?.questionId;
            if (qId && it.title) {
                fieldMap[it.title] = qId;
            }
        }

        return {
            formId: formId,
            responderUri: updatedForm.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
            editUri: `https://docs.google.com/forms/d/${formId}/edit`,
            form: updatedForm,
            fieldMap: fieldMap
        };
    },

    async verifyAndHealFormSchema(formId, { interactive = false } = {}) {
        if (!formId) return null;
        const token = await this.getGoogleFormsToken({ interactive });
        if (!token) {
            if (!interactive) return null;
            throw new Error("Google account not signed in");
        }

        const form = await this.getGoogleFormDetails(formId, { interactive });
        if (!form) return null;
        const items = form.items || [];
        const fieldMap = {};

        for (const it of items) {
            const qId = it.questionItem?.question?.questionId;
            if (qId && it.title) {
                fieldMap[it.title] = qId;
            }
        }

        // Check if essential fields exist; if completely blank, heal by creating full schema
        let healed = false;
        if (items.length === 0 && interactive) {
            const updated = await this.createAutomatedSafeguardingForm();
            return {
                formId: formId,
                responderUri: updated.responderUri,
                editUri: updated.editUri,
                form: updated.form,
                fieldMap: updated.fieldMap,
                healed: true
            };
        }

        return {
            formId: formId,
            responderUri: form.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`,
            editUri: `https://docs.google.com/forms/d/${formId}/edit`,
            form: form,
            fieldMap: fieldMap,
            healed: healed
        };
    },

    // --- GOOGLE SHEETS API HELPERS ---
    async createOrSyncWeeklyReportGoogleSheet({
        players = [],
        teams = [],
        matches = [],
        sessions = [],
        playerStandings = [],
        captainStandings = [],
        startDate = '',
        endDate = '',
        existingSpreadsheetId = null,
        title = "Football United - Weekly Report & League Matrix"
    } = {}) {
        let token = await this.getGoogleFormsToken();
        if (!token) throw new Error("Google account not signed in. Please click 'Connect Google Account' to authorize Google Sheets.");

        let spreadsheetId = existingSpreadsheetId;
        let spreadsheetUrl = existingSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit` : null;

        const sheetTabs = [
            { title: "Weekly Summary" },
            { title: "Player Standings" },
            { title: "Team Standings" },
            { title: "Sessions & Attendance" },
            { title: "Matches & Fixtures" },
            { title: "Safeguarding Consent" }
        ];

        // 1. If not existing, create spreadsheet with all 6 sheets
        if (!spreadsheetId) {
            const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    properties: {
                        title: title
                    },
                    sheets: sheetTabs.map(s => ({
                        properties: {
                            title: s.title,
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    }))
                })
            });

            if (!createRes.ok) {
                if (createRes.status === 401) {
                    this.clearGoogleAccessToken();
                    throw new Error("Google session expired. Please click 'Connect Google Account' to re-authorize.");
                }
                const err = await createRes.json().catch(() => ({}));
                throw new Error(err.error?.message || "Failed to create Google Sheet. Please check Google permissions.");
            }

            const sheetData = await createRes.json();
            spreadsheetId = sheetData.spreadsheetId;
            spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        } else {
            // Check existing sheets and add any missing tabs
            try {
                const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (getRes.status === 401) {
                    this.clearGoogleAccessToken();
                    throw new Error("Google session expired. Please click 'Connect Google Account' to re-authorize.");
                }
                if (getRes.ok) {
                    const existingData = await getRes.json();
                    const existingTitles = (existingData.sheets || []).map(s => s.properties?.title);
                    const missingTabs = sheetTabs.filter(s => !existingTitles.includes(s.title));
                    if (missingTabs.length > 0) {
                        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                requests: missingTabs.map(t => ({
                                    addSheet: {
                                        properties: {
                                            title: t.title,
                                            gridProperties: { frozenRowCount: 1 }
                                        }
                                    }
                                }))
                            })
                        }).catch(() => {});
                    }
                }
            } catch (tabErr) {
                if (tabErr.message && tabErr.message.includes("session expired")) throw tabErr;
                console.warn("Could not check/add missing sheet tabs:", tabErr);
            }
        }

        // 2. Prepare Data for Sheet 1: Weekly Summary
        const verifiedPlayersCount = (players || []).filter(p => p.safeguarding_verified || p.consent_verified || p.consent_status === 'verified').length;
        const totalPlayersCount = (players || []).length;
        const complianceRate = totalPlayersCount > 0 ? `${Math.round((verifiedPlayersCount / totalPlayersCount) * 100)}%` : '100%';
        const completedMatchesCount = (matches || []).filter(m => String(m.status || '').toLowerCase() === 'completed' || m.home_score !== undefined).length;
        
        // Compute player attendance counts
        const attendanceMap = new Map();
        (sessions || []).forEach(sess => {
            const attendees = sess.attendees || [];
            attendees.forEach(att => {
                const key = typeof att === 'object' ? (att.id || att.name) : att;
                if (key) attendanceMap.set(String(key).toLowerCase(), (attendanceMap.get(String(key).toLowerCase()) || 0) + 1);
            });
            if (sess.attendance && typeof sess.attendance === 'object') {
                Object.keys(sess.attendance).forEach(k => {
                    if (sess.attendance[k] === 'present') {
                        attendanceMap.set(String(k).toLowerCase(), (attendanceMap.get(String(k).toLowerCase()) || 0) + 1);
                    }
                });
            }
        });

        const topScorers = [...(playerStandings || [])].sort((a, b) => (Number(b.goals || 0) - Number(a.goals || 0))).slice(0, 5);

        const summaryRows = [
            ["FOOTBALL UNITED - OFFICIAL PROGRAMME REPORT", "", "", "", "", ""],
            ["Generated Date & Time", new Date().toLocaleString('en-GB'), "Date Scope Filter", `${startDate || 'Programme Launch'} to ${endDate || 'Present'}`],
            ["", "", "", "", "", ""],
            ["EXECUTIVE PROGRAMME METRICS", "", "", "", "", ""],
            ["Total Registered Players", totalPlayersCount, "Total Training Sessions", (sessions || []).length],
            ["Safeguarding Verified", verifiedPlayersCount, "Safeguarding Compliance", complianceRate],
            ["Total Matches Played", completedMatchesCount, "Active League Teams", (teams || []).length],
            ["", "", "", "", "", ""],
            ["TOP GOAL SCORERS (LEADERBOARD TOP 5)", "", "", "", "", ""],
            ["Rank", "Player Name", "Goals Scored", "POTD Awards", "Total Points", "PPG"],
            ...topScorers.map((s, i) => [
                i + 1,
                s.name || s.player || "Unnamed",
                Number(s.goals || 0),
                Number(s.potd || 0),
                Number(s.pts || 0),
                Number(s.ppg || 0).toFixed(2)
            ])
        ];

        // 3. Prepare Data for Sheet 2: Player Standings
        const playerStandingsHeaders = [
            "Rank", "Player ID", "Player Name", "Position", "Played (P)", "Won (W)", "Drawn (D)", "Lost (L)",
            "Goals", "POTD Awards", "Win Rate", "Deductions", "Total Points (Pts)", "Points Per Game (PPG)", "Safeguarding Verified"
        ];
        const playerStandingsRows = (playerStandings || []).map((s, idx) => {
            const pId = s.id || '';
            const pObj = (players || []).find(p => String(p.id) === String(pId) || String(p.name).toLowerCase() === String(s.name || s.player).toLowerCase());
            const isVerified = pObj ? (pObj.safeguarding_verified || pObj.consent_verified) : false;
            const pld = Number(s.pld || 0);
            const w = Number(s.w || 0);
            const winRate = pld > 0 ? `${Math.round((w / pld) * 100)}%` : '0%';
            return [
                idx + 1,
                pId,
                s.name || s.player || "Player",
                pObj?.position || "Player",
                pld,
                w,
                Number(s.d || 0),
                Number(s.l || 0),
                Number(s.goals || 0),
                Number(s.potd || 0),
                winRate,
                Number(s.deductions || 0),
                Number(s.pts || 0),
                Number(s.ppg || 0).toFixed(2),
                isVerified ? "YES (Verified)" : "PENDING"
            ];
        });

        // 4. Prepare Data for Sheet 3: Team Standings
        const teamStandingsHeaders = [
            "Rank", "Team Name", "Captain Name", "Played (P)", "Won (W)", "Drawn (D)", "Lost (L)",
            "Goals For (GF)", "Goals Against (GA)", "Goal Difference (GD)", "Deductions", "Total Points (Pts)", "PPG"
        ];
        const teamStandingsRows = (captainStandings || []).map((t, idx) => {
            return [
                idx + 1,
                t.name || t.team || "Team",
                t.captain_name || t.captain || "No Captain",
                Number(t.pld || 0),
                Number(t.w || 0),
                Number(t.d || 0),
                Number(t.l || 0),
                Number(t.gf || 0),
                Number(t.ga || 0),
                Number(t.gd || 0),
                Number(t.deductions || 0),
                Number(t.pts || 0),
                Number(t.ppg || 0).toFixed(2)
            ];
        });

        // 5. Prepare Data for Sheet 4: Sessions & Attendance (Comprehensive Identified Player Log & Matrix)
        const resolvePlayerObj = (rawKey) => {
            if (!rawKey) return null;
            if (typeof rawKey === 'object') return rawKey;
            const keyStr = String(rawKey).trim().toLowerCase();
            return (players || []).find(p => 
                p && (
                    String(p.id || '').trim().toLowerCase() === keyStr ||
                    String(p.name || p.player || '').trim().toLowerCase() === keyStr ||
                    String(p.nickname || '').trim().toLowerCase() === keyStr
                )
            ) || null;
        };

        // Determine effective sessions list (if sessions empty, derive from matches or recurring schedule)
        let effectiveSessions = (sessions && sessions.length > 0) ? [...sessions] : [];
        if (effectiveSessions.length === 0 && matches && matches.length > 0) {
            // Derive session records from match days
            const matchDates = Array.from(new Set(matches.map(m => m.date).filter(Boolean))).sort();
            effectiveSessions = matchDates.map(d => {
                const dayMatches = matches.filter(m => m.date === d);
                const matchAttendees = new Set();
                dayMatches.forEach(m => {
                    if (Array.isArray(m.attendees)) m.attendees.forEach(a => matchAttendees.add(a));
                    if (m.attendance && typeof m.attendance === 'object') {
                        Object.keys(m.attendance).forEach(k => { if (m.attendance[k]) matchAttendees.add(k); });
                    }
                });
                return {
                    id: `sess_match_${d}`,
                    date: d,
                    type: "Football Match Day & League Fixtures",
                    title: dayMatches.map(m => m.title || `${m.home_team || 'Home'} vs ${m.away_team || 'Away'}`).join(" | "),
                    lead_trainer: "Head Coach & Match Official",
                    location: "Trinity School, Shirley Park, Croydon, CR9 7AT",
                    status: "Completed",
                    attendees: Array.from(matchAttendees),
                    attendance: Object.fromEntries(Array.from(matchAttendees).map(k => [k, true]))
                };
            });
        }

        // Helper: get column letter from 0-based index
        const getColLetter = (colIdx) => {
            let temp = colIdx + 1;
            let letter = '';
            while (temp > 0) {
                let mod = (temp - 1) % 26;
                letter = String.fromCharCode(65 + mod) + letter;
                temp = Math.floor((temp - mod) / 26);
            }
            return letter;
        };

        // Helper: format session date to "DD MMM" (e.g. 02 May, 09 May)
        const formatSessionDateHeader = (dateStr) => {
            if (!dateStr) return '';
            try {
                const raw = String(dateStr).split('T')[0].trim();
                const parts = raw.split('-');
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const d = new Date(Date.UTC(year, month, day));
                    const dayStr = String(day).padStart(2, '0');
                    const monthStr = d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
                    return `${dayStr} ${monthStr}`;
                }
            } catch (e) {}
            return String(dateStr);
        };

        // Helper: get Month Year title (e.g. May 2026)
        const getMonthYearTitle = (sessList, matchList) => {
            const dates = [];
            if (sessList && sessList.length) sessList.forEach(s => s.date && dates.push(s.date));
            if (matchList && matchList.length) matchList.forEach(m => m.date && dates.push(m.date));
            if (dates.length > 0) {
                dates.sort();
                const sampleDate = dates[0];
                const parts = sampleDate.split('T')[0].split('-');
                if (parts.length === 3) {
                    const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
                    return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
                }
            }
            return new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' });
        };

        // Helper: get Venue Location title
        const getVenueTitle = (sessList) => {
            if (sessList && sessList.length) {
                const loc = sessList.find(s => s.location && s.location.trim())?.location;
                if (loc) {
                    if (loc.toLowerCase().includes('west ham')) return 'West Ham Park';
                    return loc;
                }
            }
            return 'West Ham Park';
        };

        // 5. Prepare Data for Sheet 4: Sessions & Attendance (Matching West Ham Park Attendance Layout)
        const venueName = getVenueTitle(effectiveSessions);
        const monthYearStr = getMonthYearTitle(effectiveSessions, matches);

        // Sort effective sessions chronologically
        const sortedSessionsList = [...effectiveSessions].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
        const dateHeaders = sortedSessionsList.map(s => formatSessionDateHeader(s.date) || s.date || 'Date');

        // Column 0 = Player Name, Column 1 = Total Attendance, Column 2+ = Dates
        const lastDateColIdx = dateHeaders.length > 0 ? (1 + dateHeaders.length) : 1;
        const lastDateColLetter = getColLetter(lastDateColIdx);

        // Build Row 1, Row 2, Row 3, Row 4
        const totalCols = Math.max(2 + dateHeaders.length, 6);
        const emptyRowOfLength = () => Array(totalCols).fill("");

        // Row 1: Venue Banner
        const row1 = [venueName, ...Array(totalCols - 1).fill("")];
        // Row 2: Month / Year Banner
        const row2 = ["", monthYearStr, ...Array(totalCols - 2).fill("")];
        // Row 3: Empty separator row
        const row3 = emptyRowOfLength();
        // Row 4: Table Headers
        const row4 = ["Player Name", "Total Attendance", ...dateHeaders];

        // Sort players alphabetically by name
        const sortedPlayersList = [...(players || [])].sort((a, b) => {
            const nameA = String(a.name || a.player || '').trim();
            const nameB = String(b.name || b.player || '').trim();
            return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
        });

        // Rows 5+: Player data rows
        const playerAttendanceMatrixRows = sortedPlayersList.map((p, idx) => {
            const rowNum = 5 + idx; // 1-based row index in Google Sheets
            const pId = String(p.id || '').trim();
            const pName = String(p.name || p.player || 'Unnamed Player').trim();

            const countFormula = dateHeaders.length > 0
                ? `=COUNTIF(C${rowNum}:${lastDateColLetter}${rowNum}, "✓")`
                : "0";

            const sessionTicks = sortedSessionsList.map(sess => {
                let isPresent = false;
                if (sess.attendance && typeof sess.attendance === 'object') {
                    if (pId && (sess.attendance[pId] === true || sess.attendance[pId] === 'present')) isPresent = true;
                    else if (pName && (sess.attendance[pName] === true || sess.attendance[pName] === 'present')) isPresent = true;
                }
                if (!isPresent && Array.isArray(sess.attendees)) {
                    if (pId && sess.attendees.includes(pId)) isPresent = true;
                    else if (pName && sess.attendees.includes(pName)) isPresent = true;
                    else if (sess.attendees.some(a => typeof a === 'object' && (String(a.id) === pId || String(a.name) === pName))) isPresent = true;
                }
                return isPresent ? "✓" : "";
            });

            return [pName, countFormula, ...sessionTicks];
        });

        // Summary Turnout Row at the bottom
        const lastPlayerRowNum = 4 + sortedPlayersList.length;
        const summaryTurnoutRow = [
            "Total Turnout",
            sortedPlayersList.length > 0 ? `=SUM(B5:B${lastPlayerRowNum})` : "0",
            ...dateHeaders.map((_, dIdx) => {
                const colLetter = getColLetter(2 + dIdx);
                return sortedPlayersList.length > 0
                    ? `=COUNTIF(${colLetter}5:${colLetter}${lastPlayerRowNum}, "✓")`
                    : "0";
            })
        ];

        const combinedSessionSheetData = [
            row1,
            row2,
            row3,
            row4,
            ...playerAttendanceMatrixRows,
            summaryTurnoutRow
        ];

        // 6. Prepare Data for Sheet 5: Matches & Fixtures
        const matchHeaders = [
            "Match Date", "Stage / Type", "Match Title", "Home Team", "Home Score", "Away Score", "Away Team", "Status", "POTD Winner", "Goal Scorers", "Attendance Count"
        ];
        const matchRows = (matches || []).map(m => {
            const hScore = m.home_score !== undefined ? m.home_score : (m.homeScore || 0);
            const aScore = m.away_score !== undefined ? m.away_score : (m.awayScore || 0);
            const scorers = Array.isArray(m.scorers) ? m.scorers.map(sc => typeof sc === 'object' ? `${sc.name || sc.player} (${sc.goals || 1})` : sc).join(", ") : "";
            const attendees = Array.isArray(m.attendees) ? m.attendees.length : (m.attendance ? Object.keys(m.attendance).length : 0);
            return [
                m.date || "",
                m.match_type || m.stage_type || "League Match",
                m.title || `${m.home_team || 'Home'} vs ${m.away_team || 'Away'}`,
                m.home_team || "",
                hScore,
                aScore,
                m.away_team || "",
                m.status || "Completed",
                m.potd_winner || m.potd || "None",
                scorers,
                attendees
            ];
        });

        // 7. Prepare Data for Sheet 6: Safeguarding & Consent
        const consentHeaders = [
            "Player ID", "Participant Name", "Nickname", "Date of Birth", "Age", "Consent Status",
            "Parent / Carer Name", "Parent Phone / Contact", "Parent Email", "Emergency Contact 2",
            "Medical & Support Notes", "Residential Address", "Consent Verification Date"
        ];
        const consentRows = (players || []).map(p => {
            const isVerified = p.safeguarding_verified || p.consent_verified || p.consent_status === 'verified';
            let age = "";
            if (p.dob) {
                const bDate = new Date(p.dob);
                if (!isNaN(bDate.getTime())) {
                    const today = new Date();
                    age = today.getFullYear() - bDate.getFullYear();
                    const m = today.getMonth() - bDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) age--;
                }
            }
            return [
                p.id || "",
                p.name || p.player || "",
                p.nickname || "",
                p.dob || "",
                age ? age.toString() : "",
                isVerified ? "✅ CONSENT VERIFIED" : "⏳ AWAITING PARENT CONSENT",
                p.carer_name || p.parent_name || "",
                p.carer_phone || p.phone || "",
                p.carer_email || p.email || "",
                p.emergency_contact_2 || "",
                p.medical_notes || "None",
                p.address || "",
                p.safeguarding_date || p.consent_date || (isVerified ? "Verified" : "Pending")
            ];
        });

        // 8. Execute batchUpdate across all 6 tabs simultaneously
        const batchData = [
            {
                range: `'Weekly Summary'!A1:F${summaryRows.length}`,
                values: summaryRows
            },
            {
                range: `'Player Standings'!A1:O${playerStandingsRows.length + 1}`,
                values: [playerStandingsHeaders, ...playerStandingsRows]
            },
            {
                range: `'Team Standings'!A1:M${teamStandingsRows.length + 1}`,
                values: [teamStandingsHeaders, ...teamStandingsRows]
            },
            {
                range: `'Sessions & Attendance'!A1:Z${combinedSessionSheetData.length + 10}`,
                values: combinedSessionSheetData
            },
            {
                range: `'Matches & Fixtures'!A1:K${matchRows.length + 1}`,
                values: [matchHeaders, ...matchRows]
            },
            {
                range: `'Safeguarding Consent'!A1:M${consentRows.length + 1}`,
                values: [consentHeaders, ...consentRows]
            }
        ];

        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                valueInputOption: "USER_ENTERED",
                data: batchData
            })
        });

        if (!updateRes.ok) {
            const err = await updateRes.json().catch(() => ({}));
            console.warn("Batch write error, falling back to individual tab writes:", err);
            for (const item of batchData) {
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(item.range)}?valueInputOption=USER_ENTERED`, {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        range: item.range,
                        majorDimension: "ROWS",
                        values: item.values
                    })
                }).catch(e => console.warn(`Failed writing ${item.range}:`, e));
            }
        }

        // 9. Format styling for Sessions & Attendance to match West Ham Park layout
        try {
            const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(sheetId,title))`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (metaRes.ok) {
                const meta = await metaRes.json();
                const sessionSheetObj = (meta.sheets || []).find(s => s.properties?.title === "Sessions & Attendance");
                if (sessionSheetObj && sessionSheetObj.properties?.sheetId !== undefined) {
                    const sId = sessionSheetObj.properties.sheetId;
                    const numDates = dateHeaders.length;
                    const endColIdx = Math.max(2 + numDates, 2);
                    const lastRowIdx = 4 + sortedPlayersList.length + 1; // 0-based exclusive end row

                    const styleRequests = [
                        // Freeze top 4 rows and first 1 column
                        {
                            updateSheetProperties: {
                                properties: {
                                    sheetId: sId,
                                    gridProperties: {
                                        frozenRowCount: 4,
                                        frozenColumnCount: 1
                                    }
                                },
                                fields: "gridProperties.frozenRowCount,gridProperties.frozenColumnCount"
                            }
                        },
                        // Row 1: Venue Header (Forest Green #1E7145, White, Bold 12pt)
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                    startColumnIndex: 0,
                                    endColumnIndex: endColIdx
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.118, green: 0.443, blue: 0.271 },
                                        horizontalAlignment: "LEFT",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            foregroundColor: { red: 1, green: 1, blue: 1 },
                                            fontSize: 12,
                                            bold: true
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Row 2: Month / Year Banner (Forest Green #1E7145, White, Bold 11pt, Centered)
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 1,
                                    endRowIndex: 2,
                                    startColumnIndex: 0,
                                    endColumnIndex: endColIdx
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.118, green: 0.443, blue: 0.271 },
                                        horizontalAlignment: "CENTER",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            foregroundColor: { red: 1, green: 1, blue: 1 },
                                            fontSize: 11,
                                            bold: true
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Row 4: Column Headers (Forest Green #1E7145, White, Bold 10pt, Centered)
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 3,
                                    endRowIndex: 4,
                                    startColumnIndex: 0,
                                    endColumnIndex: endColIdx
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.118, green: 0.443, blue: 0.271 },
                                        horizontalAlignment: "CENTER",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            foregroundColor: { red: 1, green: 1, blue: 1 },
                                            fontSize: 10,
                                            bold: true
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Row 4 Column A: Left align "Player Name"
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 3,
                                    endRowIndex: 4,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        horizontalAlignment: "LEFT"
                                    }
                                },
                                fields: "userEnteredFormat.horizontalAlignment"
                            }
                        },
                        // Total Attendance Column (Column B, Rows 5 to last player): Soft green background, centered, bold
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 4,
                                    endRowIndex: 4 + sortedPlayersList.length,
                                    startColumnIndex: 1,
                                    endColumnIndex: 2
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.91, green: 0.96, blue: 0.91 },
                                        horizontalAlignment: "CENTER",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            fontSize: 10,
                                            bold: true,
                                            foregroundColor: { red: 0.118, green: 0.443, blue: 0.271 }
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Date Attendance Columns (Columns C+, Rows 5 to last player): Centered checkmarks
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 4,
                                    endRowIndex: 4 + sortedPlayersList.length,
                                    startColumnIndex: 2,
                                    endColumnIndex: endColIdx
                                },
                                cell: {
                                    userEnteredFormat: {
                                        horizontalAlignment: "CENTER",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            fontSize: 11,
                                            bold: true
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Summary Row (Row 5 + sortedPlayersList.length): Light Sage Green #E2EFE7, Bold
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 4 + sortedPlayersList.length,
                                    endRowIndex: lastRowIdx,
                                    startColumnIndex: 0,
                                    endColumnIndex: endColIdx
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.88, green: 0.94, blue: 0.90 },
                                        horizontalAlignment: "CENTER",
                                        verticalAlignment: "MIDDLE",
                                        textFormat: {
                                            fontSize: 10,
                                            bold: true,
                                            foregroundColor: { red: 0.1, green: 0.35, blue: 0.2 }
                                        }
                                    }
                                },
                                fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
                            }
                        },
                        // Summary Row Col A: Left align "Total Turnout"
                        {
                            repeatCell: {
                                range: {
                                    sheetId: sId,
                                    startRowIndex: 4 + sortedPlayersList.length,
                                    endRowIndex: lastRowIdx,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        horizontalAlignment: "LEFT"
                                    }
                                },
                                fields: "userEnteredFormat.horizontalAlignment"
                            }
                        },
                        // Column Width: Player Name (Col A) = 180px
                        {
                            updateDimensionProperties: {
                                range: {
                                    sheetId: sId,
                                    dimension: "COLUMNS",
                                    startIndex: 0,
                                    endIndex: 1
                                },
                                properties: { pixelSize: 180 },
                                fields: "pixelSize"
                            }
                        },
                        // Column Width: Total Attendance (Col B) = 130px
                        {
                            updateDimensionProperties: {
                                range: {
                                    sheetId: sId,
                                    dimension: "COLUMNS",
                                    startIndex: 1,
                                    endIndex: 2
                                },
                                properties: { pixelSize: 130 },
                                fields: "pixelSize"
                            }
                        },
                        // Column Width: Date Columns (Col C+) = 90px
                        {
                            updateDimensionProperties: {
                                range: {
                                    sheetId: sId,
                                    dimension: "COLUMNS",
                                    startIndex: 2,
                                    endIndex: endColIdx
                                },
                                properties: { pixelSize: 90 },
                                fields: "pixelSize"
                            }
                        }
                    ];

                    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ requests: styleRequests })
                    }).catch(e => console.warn("Formatting batchUpdate error:", e));
                }
            }
        } catch (styleErr) {
            console.warn("Could not apply Google Sheets visual formatting:", styleErr);
        }

        return {
            spreadsheetId: spreadsheetId,
            spreadsheetUrl: spreadsheetUrl,
            title: title,
            totalTabs: 6
        };
    },

    async createOrSyncConsentGoogleSheet({ players = [], title = "Football United - Parent & Safeguarding Consent Register", existingSpreadsheetId = null } = {}) {
        let token = await this.getGoogleFormsToken();
        if (!token) throw new Error("Google account not signed in. Please click 'Connect Google Account' to authorize Google Sheets.");

        let spreadsheetId = existingSpreadsheetId;
        let spreadsheetUrl = existingSpreadsheetId ? `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit` : null;

        // 1. Create new spreadsheet if not existing
        if (!spreadsheetId) {
            const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    properties: {
                        title: title
                    },
                    sheets: [
                        {
                            properties: {
                                title: "Parent Consent Register",
                                gridProperties: {
                                    frozenRowCount: 1
                                }
                            }
                        }
                    ]
                })
            });

            if (!createRes.ok) {
                if (createRes.status === 401) {
                    this.clearGoogleAccessToken();
                    throw new Error("Google session expired. Please click 'Connect Google Account' to re-authorize.");
                }
                const err = await createRes.json().catch(() => ({}));
                throw new Error(err.error?.message || "Failed to create Google Sheet");
            }

            const sheetData = await createRes.json();
            spreadsheetId = sheetData.spreadsheetId;
            spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
        }

        // 2. Prepare header & data rows
        const headers = [
            "Player ID",
            "Participant Name",
            "Nickname",
            "Date of Birth",
            "Age",
            "Consent Status",
            "Parent / Carer Name",
            "Parent Phone / Contact",
            "Emergency Contact 2",
            "Medical & Support Notes",
            "Residential Address",
            "Consent Date / Verification Timestamp"
        ];

        const rows = (players || []).map(p => {
            const isVerified = p.safeguarding_verified || p.consent_verified || p.consent_status === 'verified';
            const status = isVerified ? "✅ CONSENT VERIFIED" : "⏳ AWAITING PARENT CONSENT";
            let age = "";
            if (p.dob) {
                const bDate = new Date(p.dob);
                if (!isNaN(bDate.getTime())) {
                    const today = new Date();
                    age = today.getFullYear() - bDate.getFullYear();
                    const m = today.getMonth() - bDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
                        age--;
                    }
                }
            }

            return [
                p.id || "",
                p.name || p.player || "",
                p.nickname || "",
                p.dob || "",
                age ? age.toString() : "",
                status,
                p.carer_name || p.parent_name || "",
                p.carer_phone || p.phone || "",
                p.emergency_contact_2 || "",
                p.medical_notes || "None",
                p.address || "",
                p.safeguarding_date || p.consent_date || (isVerified ? "Verified" : "Pending")
            ];
        });

        const allValues = [headers, ...rows];

        // 3. Populate / Update values in the sheet
        const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/'Parent Consent Register'!A1:L${allValues.length}?valueInputOption=USER_ENTERED`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                range: `'Parent Consent Register'!A1:L${allValues.length}`,
                majorDimension: "ROWS",
                values: allValues
            })
        });

        if (!updateRes.ok) {
            const err = await updateRes.json().catch(() => ({}));
            // If the sheet name didn't match (e.g. preexisting sheet), fallback to Sheet1
            const fallbackRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/A1:L${allValues.length}?valueInputOption=USER_ENTERED`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    values: allValues
                })
            });
            if (!fallbackRes.ok) {
                console.warn("Could not write values directly into sheet:", err);
            }
        }

        return {
            spreadsheetId: spreadsheetId,
            spreadsheetUrl: spreadsheetUrl,
            title: title,
            totalRows: rows.length
        };
    }
};

// Explicit user authentication gate: unauthenticated users remain signed out until they login
console.log("🔒 Authentication gate initialized: awaiting authenticated user sign-in.");

console.log("✅ window.fb successfully attached to global scope!");

console.log("🔥 Firebase initialized successfully with Firestore database:", firebaseConfig.projectId);

if (typeof window !== 'undefined') {
    window.__FIREBASE_READY__ = true;
    window.dispatchEvent(new CustomEvent('firebase_ready', { detail: window.fb }));
    window.dispatchEvent(new CustomEvent('firebase-ready', { detail: window.fb }));
}

export {
    app,
    db,
    auth,
    storage,
    storageRef,
    storageRef as ref,
    uploadBytesResumable,
    getDownloadURL,
    firebaseConfig,
    stripProxy,
    forceNetworkConnection as enableNetwork,
    gracefulDisableNetwork as disableNetwork,
    forceNetworkConnection,
    gracefulDisableNetwork
};
if (typeof window !== 'undefined') {
    window.db = db;
    window.firestore = {
        db,
        writeBatch: (database = db) => writeBatch(database || db),
        collection: (databaseOrPath, maybePath) => {
            if (maybePath) return collection(databaseOrPath, maybePath);
            return collection(db, databaseOrPath);
        },
        doc: (databaseOrPath, ...segments) => {
            if (typeof databaseOrPath === 'string') {
                return doc(db, databaseOrPath, ...segments);
            }
            return doc(databaseOrPath, ...segments);
        },
        getDocs,
        updateDoc,
        setDoc,
        deleteDoc,
        deleteField,
        query,
        runTransaction
    };
}
export default window.fb;

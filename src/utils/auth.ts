import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence
} from 'firebase/auth';
import { app, auth, db, firebaseConfig } from '../firebaseConfig';

export { app, auth, db, firebaseConfig };

// Gracefully handle persistence to avoid ITP cookie crashes on iOS in-app browsers
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (err) {
    console.warn('Storage persistence blocked by ITP/WebView. Falling back to inMemoryPersistence:', err);
    try {
      await setPersistence(auth, inMemoryPersistence);
    } catch (e) {
      console.warn('Could not set inMemoryPersistence:', e);
    }
  }
})();

const provider = new GoogleAuthProvider();
// Request Google Sheets and Google Drive File scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const isInAppBrowser = (): boolean => {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || window.navigator.vendor || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inAppPatterns = /WhatsApp|FBAN|FBAV|Instagram|Line|Twitter|Snapchat|MicroMessenger|musical_ly|BytedanceWebview|LinkedInApp|GSA/i;
  return inAppPatterns.test(ua) || (isIOS && !/Safari/i.test(ua) && /WebKit/i.test(ua));
};

export const isITPorCookieBlockedError = (err: any): boolean => {
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
};

export const showInAppBrowserGuidance = () => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('itp-cookie-fallback-modal');
  if (existing) {
    existing.style.display = 'flex';
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'itp-cookie-fallback-modal';
  modal.style.cssText =
    'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);padding:16px;font-family:system-ui,-apple-system,sans-serif;';

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
        <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">To sign in:</div>
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

  const copyBtn = modal.querySelector('#itp-copy-link-btn') as HTMLButtonElement | null;
  const closeBtn = modal.querySelector('#itp-close-modal-btn') as HTMLButtonElement | null;

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
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    if (isInAppBrowser()) {
      console.warn('In-app browser detected during Google Sign-In.');
    }
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (isITPorCookieBlockedError(error)) {
      console.warn('ITP Security cookie restriction triggered:', error);
      showInAppBrowserGuidance();
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

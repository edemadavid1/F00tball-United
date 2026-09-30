import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Apple, 
  Monitor,
  Check, 
  Sparkles,
  Zap,
  ArrowDown,
  Info,
  Share2,
  PlusSquare,
  ChevronRight,
  ShieldCheck,
  Flame
} from 'lucide-react';

interface DownloadAppProps {
  onNavigate: (tab: 'dashboard' | 'sessions' | 'leagues' | 'players' | 'reporting' | 'download') => void;
}

export default function DownloadApp({ onNavigate }: DownloadAppProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [detectedOS, setDetectedOS] = useState<'iOS' | 'Android' | 'Desktop'>('Desktop');
  const [selectedOS, setSelectedOS] = useState<'iOS' | 'Android' | 'Desktop'>('Android');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Detect operating system
    const ua = navigator.userAgent.toLowerCase();
    let currentOS: 'iOS' | 'Android' | 'Desktop' = 'Desktop';
    if (/ipad|iphone|ipod/.test(ua) && !(window as any).MSStream) {
      currentOS = 'iOS';
    } else if (/android/.test(ua)) {
      currentOS = 'Android';
    }
    
    setDetectedOS(currentOS);
    setSelectedOS(currentOS);

    // 2. Check if already running in standalone/installed mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setInstalled(true);
    }

    // 3. Listen for native browser PWA prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
        setInstalled(true);
      } else {
        console.log('User dismissed the PWA install prompt');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback message
      alert("Installation prompt is already handled by your browser. Tap your browser's menu (three dots or share button) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
      
      {/* Page Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/55 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Frictionless Web App Install</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Get Game On on Your Device
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">
          Add Game On directly to your home screen. Experience lightning-fast load times, zero browser bar clutter, and responsive offline features.
        </p>
      </div>

      {installed ? (
        /* Already Installed Success Layout */
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Already Installed & Ready!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              You are currently running Game On as a standalone, optimized Progressive Web App. Enjoy the pure full-screen layout!
            </p>
          </div>
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-2.5 bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white dark:text-slate-950 text-xs font-black rounded-xl transition cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        /* Standard Onboarding Layout */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* OS Selector and Step-by-Step Interactive Block */}
          <div className="md:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* Tabs Selector */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setSelectedOS('Android')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
                  selectedOS === 'Android'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOS('iOS')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
                  selectedOS === 'iOS'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>iOS (iPhone)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOS('Desktop')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-xl transition cursor-pointer ${
                  selectedOS === 'Desktop'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>Desktop</span>
              </button>
            </div>

            {/* Dynamic Content Panels based on OS Selection */}
            {selectedOS === 'Android' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-550">
                    <Smartphone className="w-5 h-5 shrink-0" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Android PWA Installation</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Installing Game On on Android is fully automated and takes just one click. You don't need any complex files or installations.
                  </p>
                </div>

                {isInstallable ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center space-y-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                        🎉 Quick Install Available!
                      </p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto active:scale-95 shadow-md shadow-emerald-500/10"
                      >
                        <ArrowDown className="w-4 h-4 shrink-0" />
                        <span>Install Game On Directly</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2.5 text-amber-500">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          How to install from Chrome / Edge / Opera:
                        </div>
                      </div>
                      <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-decimal list-inside font-medium leading-relaxed pl-1">
                        <li>Tap your browser's menu icon <strong className="text-slate-800 dark:text-slate-200">three dots (⋮)</strong> in the top-right corner.</li>
                        <li>Select <strong className="text-slate-800 dark:text-slate-200">"Install app"</strong> or <strong className="text-slate-800 dark:text-slate-200">"Add to Home Screen"</strong> from the menu.</li>
                        <li>Confirm the installation, and Game On will instantly appear in your app drawer!</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedOS === 'iOS' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-550">
                    <Apple className="w-5 h-5 shrink-0" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white">iOS Safari Installation</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Apple iOS requires Safari to add PWAs manually. Follow these simple steps for a gorgeous standalone experience:
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-xs flex items-center justify-center">1</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      Make sure you are browsing in <strong className="text-slate-800 dark:text-slate-200">Safari</strong>. Tap the <strong className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-bold"><Share2 className="w-3 h-3" /> Share</strong> button in Safari's bottom toolbar.
                    </div>
                  </div>

                  <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-xs flex items-center justify-center">2</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      Scroll down the share list and select <strong className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-bold"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong>.
                    </div>
                  </div>

                  <div className="flex gap-4 items-start bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-xs flex items-center justify-center">3</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                      Tap <strong className="text-slate-800 dark:text-slate-200">"Add"</strong> in the top-right corner to save. An app icon named "Game On" will immediately launch from your dock!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedOS === 'Desktop' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-550">
                    <Monitor className="w-5 h-5 shrink-0" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Desktop App Installation</h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Run Game On inside its own high-performance window on macOS, Windows, or Linux.
                  </p>
                </div>

                {isInstallable ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center space-y-3">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                        🎉 Desktop App Ready!
                      </p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 text-xs font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mx-auto active:scale-95 shadow-md"
                      >
                        <ArrowDown className="w-4 h-4 shrink-0" />
                        <span>Install Desktop App</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-4 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2.5 text-amber-500">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          To install on Desktop (Chrome, Edge, Brave):
                        </div>
                      </div>
                      <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-decimal list-inside font-medium leading-relaxed pl-1">
                        <li>Look at your browser's search bar. Click the <strong className="text-slate-800 dark:text-slate-200">"Install" monitor icon</strong> on the right side of the URL bar.</li>
                        <li>Alternatively, open the browser's menu (three dots) and select <strong className="text-slate-800 dark:text-slate-200">"Install Game On..."</strong>.</li>
                        <li>The app will launch in a self-contained window without address bars, perfectly styled.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Interactive Feedback Info Panel */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-550" />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Secure & Trusted Platform</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Launch Web App</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sidebar / Key PWA Benefits list */}
          <div className="md:col-span-5 space-y-5">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-6">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-550" />
                <span>Why Install Game On?</span>
              </h3>

              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Edge-to-Edge Layout</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">
                      Hides all browser tab clutter, navigation footers, and URL bars to maximize mobile vertical space.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Robust Offline Usage</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">
                      Keeps all league standings, session records, and rosters cached locally so you can manage tournaments on site with zero signal.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">No External Stores</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 font-medium">
                      Install natively from a single shared link. Zero reliance on Google Play Store, Apple App Store, APK files, or work security filters.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Detection Widget */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-550 animate-pulse shrink-0"></div>
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                Detected System: <strong className="text-slate-900 dark:text-white">{detectedOS} Browser</strong>. You can switch tabs above to see instructions for other devices.
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

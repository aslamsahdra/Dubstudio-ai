
import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, History, Trash2, PlayCircle, 
  AudioLines, Languages, Sparkles, AlertCircle, RefreshCcw, LayoutGrid, 
  Cpu, ShieldCheck, Settings, Palette, LogIn, HardDrive, User, LogOut, 
  Smartphone, Crown, Play, ArrowDownToLine
} from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, UILanguageCode } from './types';
import { fileToBase64, pcmToWavBlob } from './utils/fileUtils';
import { exportMergedVideo } from './utils/videoExporter';
import * as geminiService from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import ProcessingOverlay from './components/ProcessingOverlay';
import { translations } from './translations';

type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'purple';

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('en'); // Default to English
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [showSettings, setShowSettings] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');
  const [user, setUser] = useState<{name: string, email: string, isPremium: boolean} | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  const [pendingVideoDuration, setPendingVideoDuration] = useState(0);

  const t = translations[uiLanguage] || translations['en'];

  const themeClasses = {
    indigo: 'from-indigo-500 to-purple-600 bg-indigo-500 text-indigo-400 border-indigo-500/30 shadow-indigo-500/20',
    rose: 'from-rose-500 to-pink-600 bg-rose-500 text-rose-400 border-rose-500/30 shadow-rose-500/20',
    emerald: 'from-emerald-500 to-teal-600 bg-emerald-500 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20',
    amber: 'from-amber-500 to-orange-600 bg-amber-500 text-amber-400 border-amber-500/30 shadow-amber-500/20',
    purple: 'from-purple-500 to-fuchsia-600 bg-purple-500 text-purple-400 border-purple-500/30 shadow-purple-500/20',
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('dub_v4_theme') as ThemeColor;
    if (savedTheme) setThemeColor(savedTheme);
    const savedLang = localStorage.getItem('dub_v4_lang') as UILanguageCode;
    if (savedLang) setUiLanguage(savedLang);

    // FIXED: Service Worker registration for Railway environment
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // Use relative path to ensure origin matches
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then(reg => console.log('Master Service Worker Active'))
          .catch(err => console.debug('SW Registration failed', err));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    });
  }, []);

  useEffect(() => {
    let timer: any;
    if (showAd && adTimer > 0) {
      timer = setInterval(() => setAdTimer(prev => prev - 1), 1000);
    } else if (showAd && adTimer === 0) {
      setShowAd(false);
      proceedToDubbing();
    }
    return () => clearInterval(timer);
  }, [showAd, adTimer]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setPendingVideoDuration(video.duration);
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setDubbedAudioUrl(null);
        setDubbingState({ status: 'idle' });
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const startDubbingProcess = () => {
    if (pendingVideoDuration > 120 && (!user || !user.isPremium)) {
      alert(uiLanguage === 'pa' ? "2 ਮਿੰਟ ਤੋਂ ਵੱਡੀ ਵੀਡੀਓ ਲਈ ਪ੍ਰੀਮੀਅਮ ਪਲਾਨ ਚਾਹੀਦਾ ਹੈ।" : "Premium required for videos > 2 mins.");
      return;
    }

    if (pendingVideoDuration > 15 && (!user || !user.isPremium)) {
      setAdTimer(15);
      setShowAd(true);
    } else {
      proceedToDubbing();
    }
  };

  const proceedToDubbing = async () => {
    if (!videoFile) return;
    setDubbingState({ status: 'uploading' });
    try {
      const base64Video = await fileToBase64(videoFile);
      setDubbingState({ status: 'analyzing' });
      const analysis = await geminiService.generateTranslatedScript(base64Video, videoFile.type, targetLanguage);
      setDubbingState({ status: 'dubbing' });
      const audioBase64 = await geminiService.generateDubbedAudio(analysis, targetLanguage);
      const audioBlob = pcmToWavBlob(audioBase64, 24000);
      const dubbedUrl = URL.createObjectURL(audioBlob);
      setDubbedAudioUrl(dubbedUrl);
      setDubbingState({ status: 'complete' });
    } catch (error: any) {
      setDubbingState({ status: 'error', errorMessage: error.message || "Dubbing Failed" });
    }
  };

  const changeLanguage = (lang: UILanguageCode) => {
    setUiLanguage(lang);
    localStorage.setItem('dub_v4_lang', lang);
  };

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-${themeColor}-500/30 overflow-x-hidden transition-colors duration-500`}>
      {/* PWA INSTALL BANNER - HIGH VISIBILITY */}
      {showInstallBanner && (
        <div className={`bg-gradient-to-r ${themeClasses[themeColor].split(' ').slice(0,2).join(' ')} py-5 px-6 flex items-center justify-between animate-in slide-in-from-top duration-700 z-[200] relative border-b border-white/20 shadow-2xl`}>
           <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-2xl">
                 <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                 <p className="text-white font-black text-sm uppercase tracking-tighter">Install Master Studio</p>
                 <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest">PRO PRODUCTION VERSION</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <button onClick={handleInstallClick} className="bg-white text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                 Install
              </button>
              <button onClick={() => setShowInstallBanner(false)} className="text-white/50 hover:text-white transition-colors p-1.5">
                 <X className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-${themeColor}-600/10 blur-[150px] pointer-events-none -z-10 rounded-full transition-colors duration-700`} />

      <header className="border-b border-white/5 bg-slate-950/90 backdrop-blur-3xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6 group cursor-pointer shrink" onClick={() => window.location.reload()}>
            <div className={`bg-gradient-to-br ${themeClasses[themeColor].split(' ').slice(0,2).join(' ')} p-2.5 sm:p-3.5 rounded-2xl shadow-xl transition-transform group-hover:scale-105 shrink-0`}>
              <AudioLines className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-lg sm:text-2xl font-black text-white tracking-tighter uppercase truncate">DubStudio <span className={themeColor === 'indigo' ? 'text-indigo-400' : themeColor === 'rose' ? 'text-rose-400' : themeColor === 'emerald' ? 'text-emerald-400' : themeColor === 'amber' ? 'text-amber-400' : 'text-purple-400'}>PRO</span></span>
                {user?.isPremium && <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </div>
              <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-0.5 truncate">ASLAM SAHDRA PRODUCTION</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
             <button 
                onClick={() => {setShowSettings(!showSettings);}} 
                className={`p-2.5 sm:p-3.5 rounded-xl border transition-all hover:bg-white/5 ${showSettings ? `bg-${themeColor}-600 border-${themeColor}-400 text-white shadow-lg` : 'border-white/10 text-slate-400'}`}
             >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>

             {user ? (
                <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-white/10">
                   <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${themeClasses[themeColor].split(' ').slice(0,2).join(' ')} flex items-center justify-center text-white font-black text-sm shadow-lg border-2 border-white/20`}>
                     {user.name.charAt(0)}
                   </div>
                </div>
             ) : (
                <button onClick={() => setUser({name: 'Master User', email: 'user@sahdra.com', isPremium: false})} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                   <LogIn className="w-4 h-4" /> Login
                </button>
             )}
          </div>
        </div>
      </header>

      {/* AD OVERLAY MODAL */}
      {showAd && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 sm:p-12 text-center overflow-hidden">
           <div className="absolute top-10 right-10">
              <span className="px-6 py-3 bg-white/10 text-white font-black rounded-2xl text-xl">{adTimer}s</span>
           </div>
           <div className="max-w-2xl space-y-12">
              <div className={`w-32 h-32 bg-${themeColor}-500 rounded-[3rem] mx-auto flex items-center justify-center animate-bounce shadow-3xl`}>
                 <Play className="w-16 h-16 text-white fill-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter">ਡੱਬਿੰਗ ਲਈ ਐਡ ਦੇਖੋ</h2>
                <p className="text-xl text-slate-400 font-bold leading-relaxed">Watch a short ad to unlock high-fidelity neural dubbing.</p>
              </div>
              <div className="p-12 bg-white/5 rounded-[4rem] border border-white/5">
                 <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em]">Advertising Partner: Sahdra Network</p>
              </div>
              <button disabled className="px-10 py-5 bg-white/5 text-slate-600 rounded-3xl font-black uppercase text-sm tracking-widest border border-white/5 opacity-50">
                 Skip available in {adTimer}s
              </button>
           </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 relative">
        {showSettings ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto space-y-12">
            <div className="flex items-center justify-between border-b border-white/10 pb-8">
               <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">Settings</h2>
               <button onClick={() => setShowSettings(false)} className="p-3 bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
               <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-10 space-y-8">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Language & Theme</span>
                  <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => changeLanguage('pa')} className={`py-4 rounded-2xl border font-black text-xs ${uiLanguage === 'pa' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>ਪੰਜਾਬੀ</button>
                     <button onClick={() => changeLanguage('en')} className={`py-4 rounded-2xl border font-black text-xs ${uiLanguage === 'en' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>ENGLISH</button>
                     <button onClick={() => changeLanguage('hi')} className={`py-4 rounded-2xl border font-black text-xs ${uiLanguage === 'hi' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>हिन्दी</button>
                  </div>
                  <div className="flex gap-4">
                     {(['indigo', 'rose', 'emerald', 'amber', 'purple'] as ThemeColor[]).map(color => (
                        <button key={color} onClick={() => setThemeColor(color)} className={`w-12 h-12 rounded-2xl border-2 ${themeColor === color ? 'border-white' : 'border-transparent'} bg-${color}-500 transition-transform active:scale-90`} />
                     ))}
                  </div>
               </div>
               <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-10 space-y-8 flex flex-col justify-center text-center">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                     <Crown className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Master Pro Access</h3>
                  <p className="text-xs text-slate-500 font-bold mb-6">Unlimited dubbing, no ads, high-priority processing.</p>
                  <button className="w-full py-4 bg-amber-500 text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all">Go Premium</button>
               </div>
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="max-w-5xl mx-auto py-12 text-center space-y-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="space-y-6">
                <div className={`inline-flex items-center gap-3 px-5 py-2.5 bg-${themeColor}-500/10 border border-${themeColor}-500/20 rounded-full text-${themeColor}-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4`}>
                    <Sparkles className="w-4 h-4" /> Neural Audio Synthesis
                </div>
                <h1 className="text-6xl md:text-[9rem] font-black tracking-tighter text-white leading-[0.85] drop-shadow-2xl">
                  {uiLanguage === 'pa' ? 'ਵੀਡੀਓਜ਼ ਨੂੰ' : 'DUB YOUR'}<br />
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${themeColor}-400 via-white to-purple-400`}>{uiLanguage === 'pa' ? 'ਮਾਸਟਰ ਡੱਬ' : 'MASTER VIDEOS'}</span> {uiLanguage === 'pa' ? 'ਕਰੋ' : ''}
                </h1>
                <p className="text-slate-500 text-lg sm:text-xl font-bold max-w-2xl mx-auto leading-relaxed uppercase tracking-tight opacity-70">
                    Smart voice matching for Adults & Children. Powered by Aslam Sahdra.
                </p>
            </div>

            <div className="max-w-xl mx-auto pt-8">
              <label className="relative group block cursor-pointer transition-all active:scale-95">
                <div className={`absolute -inset-4 bg-${themeColor}-500/20 rounded-[4.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className={`relative flex flex-col items-center gap-8 p-12 sm:p-24 bg-slate-900/60 backdrop-blur-3xl border-2 border-dashed border-slate-800 rounded-[4.5rem] group-hover:border-${themeColor}-500/50 transition-all shadow-3xl`}>
                  <div className={`w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center group-hover:bg-${themeColor}-500/10 border border-white/5`}>
                    <Upload className={`w-10 h-10 text-white group-hover:text-${themeColor}-400`} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">{t.uploadBtn}</h3>
                    <div className="flex items-center gap-2 justify-center opacity-40">
                       <Smartphone className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Mobile Ready</span>
                    </div>
                  </div>
                </div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 space-y-10 shadow-3xl">
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">{t.targetLanguage}</span>
                        <Languages className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="grid gap-2.5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setTargetLanguage(lang)}
                          className={`flex items-center justify-between px-6 py-5 rounded-[2rem] border-2 transition-all text-sm font-black
                            ${targetLanguage.code === lang.code ? `bg-${themeColor}-600 border-${themeColor}-400 text-white shadow-xl` : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                        >
                          {lang.name}
                          {targetLanguage.code === lang.code && <Check className="w-4 h-4 animate-in zoom-in" />}
                        </button>
                      ))}
                    </div>
                </div>

                <button
                    onClick={startDubbingProcess}
                    disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                    className={`w-full py-7 bg-white text-black rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] transition-all shadow-3xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group`}
                  >
                    {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-6 h-6 group-hover:scale-110 transition-transform" /> {t.generateDub}</> : <RefreshCcw className="w-6 h-6 animate-spin" />}
                </button>
                
                <button onClick={() => setVideoUrl(null)} className="w-full text-center text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-rose-500 transition-colors">Cancel Production</button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
                <div className="relative rounded-[4.5rem] overflow-hidden bg-black shadow-3xl border border-white/10 aspect-video group">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[4rem] flex flex-wrap items-center justify-between gap-8 animate-in slide-in-from-top-12 duration-1000 shadow-2xl">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20"><Check className="w-8 h-8" /></div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Production Done</h3>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mt-2">Verified High-Fidelity Audio</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => { 
                                const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!); 
                                const url = URL.createObjectURL(merged); 
                                const a = document.createElement('a'); 
                                a.href = url; 
                                a.download = `aslam_sahdra_master_${Date.now()}.webm`; 
                                a.click(); 
                            }} 
                            className="px-10 py-5 bg-white text-black rounded-3xl text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-2xl"
                        >
                            <Download className="w-5 h-5" /> Save Master
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-32 text-center border-t border-white/5 bg-slate-950 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-16">
            <div className="flex items-center gap-14 opacity-30">
               <Cpu className={`w-8 h-8 text-${themeColor}-400`} />
               <div className="h-px w-48 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
               <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="space-y-10 w-full">
                <div className="flex flex-col items-center gap-8">
                   <p className="text-sm text-slate-600 font-black uppercase tracking-[1.5em] opacity-50">PRODUCED BY THE LEGEND</p>
                   <p className="text-5xl md:text-[10rem] text-white font-black uppercase tracking-[0.15em] leading-[0.8] drop-shadow-[0_0_80px_rgba(255,255,255,0.15)] transition-all hover:tracking-[0.2em] duration-1000 cursor-default">
                      Aslam Sahdra<br/><span className={`text-${themeColor}-500/40`}>Production</span>
                   </p>
                   <div className={`h-2 w-64 bg-gradient-to-r from-transparent via-${themeColor}-500 to-transparent my-6`} />
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-8 pt-20 border-t border-white/5 w-full max-w-5xl">
              <p className="text-sm text-slate-800 font-black uppercase tracking-[1em] opacity-40">© 2025 ASLAM SAHDRA • ALL RIGHTS RESERVED</p>
            </div>
          </div>
      </footer>
    </div>
  );
}

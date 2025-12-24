
import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, History, Trash2, PlayCircle, 
  AudioLines, Languages, Sparkles, AlertCircle, RefreshCcw, LayoutGrid, 
  Cpu, ShieldCheck, Settings, Palette, LogIn, HardDrive, User, LogOut, 
  Smartphone, Crown, Play, ArrowDownToLine, DownloadCloud
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
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('en'); 
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

    // FIXED: Better Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW Active'))
          .catch(err => console.debug('SW Offline mode active'));
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    });
  }, []);

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
    <div className={`min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans transition-colors duration-500`}>
      {/* GLOW BACKGROUND */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-${themeColor}-600/10 blur-[120px] pointer-events-none -z-10 rounded-full`} />

      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <div className={`bg-gradient-to-br ${themeClasses[themeColor].split(' ').slice(0,2).join(' ')} p-2 rounded-xl shadow-lg`}>
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tighter uppercase">DubStudio <span className={themeColor === 'indigo' ? 'text-indigo-400' : 'text-rose-400'}>PRO</span></span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ASLAM SAHDRA</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {showInstallBanner && (
               <button 
                  onClick={handleInstallClick}
                  className={`flex items-center gap-2 px-4 py-2 bg-${themeColor}-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-${themeColor}-500/20`}
               >
                  <DownloadCloud className="w-4 h-4" /> Install App
               </button>
             )}
             <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2.5 rounded-xl border transition-all ${showSettings ? `bg-${themeColor}-600 border-${themeColor}-400 text-white` : 'border-white/10 text-slate-400'}`}
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* AD OVERLAY */}
      {showAd && (
        <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 text-center">
           <div className="absolute top-10 right-10">
              <span className="px-5 py-2 bg-white/10 text-white font-black rounded-xl text-lg">{adTimer}s</span>
           </div>
           <div className="max-w-xl space-y-10">
              <div className={`w-24 h-24 bg-${themeColor}-500 rounded-3xl mx-auto flex items-center justify-center animate-bounce shadow-2xl shadow-${themeColor}-500/40`}>
                 <Play className="w-12 h-12 text-white fill-white" />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Please wait for Dubbing...</h2>
                <p className="text-slate-400 font-bold">Watching a short ad supports Aslam Sahdra Production to keep this service free.</p>
              </div>
              <button disabled className="px-8 py-4 bg-white/5 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-white/5">
                 Skip in {adTimer}s
              </button>
           </div>
        </div>
      )}

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
        {showSettings ? (
          <div className="max-w-2xl mx-auto space-y-10 py-10 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
               <h2 className="text-2xl font-black text-white tracking-tight uppercase">App Settings</h2>
               <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-8">
               <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose Interface Language</span>
                  <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => changeLanguage('pa')} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'pa' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>ਪੰਜਾਬੀ</button>
                     <button onClick={() => changeLanguage('en')} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'en' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>ENGLISH</button>
                     <button onClick={() => changeLanguage('hi')} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'hi' ? `bg-${themeColor}-600 border-${themeColor}-400` : 'bg-white/5 border-white/5'}`}>हिन्दी</button>
                  </div>
               </div>
               <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pick Theme Color</span>
                  <div className="flex gap-4">
                     {(['indigo', 'rose', 'emerald', 'amber', 'purple'] as ThemeColor[]).map(color => (
                        <button key={color} onClick={() => setThemeColor(color)} className={`w-10 h-10 rounded-xl border-2 ${themeColor === color ? 'border-white' : 'border-transparent'} bg-${color}-500 transition-transform active:scale-90`} />
                     ))}
                  </div>
               </div>
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="max-w-4xl mx-auto py-10 text-center space-y-12 animate-in fade-in duration-1000">
            <div className="space-y-6">
                <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${themeColor}-500/10 border border-${themeColor}-500/20 rounded-full text-${themeColor}-400 text-[9px] font-black uppercase tracking-widest`}>
                    <Sparkles className="w-3 h-3" /> Professional Dubbing Studio
                </div>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.9]">
                  {uiLanguage === 'pa' ? 'ਵੀਡੀਓਜ਼ ਨੂੰ' : 'DUB YOUR'}<br />
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${themeColor}-400 to-purple-400`}>{uiLanguage === 'pa' ? 'ਮਾਸਟਰ ਡੱਬ' : 'MASTER VIDEOS'}</span>
                </h1>
                <p className="text-slate-500 text-base font-bold max-w-xl mx-auto uppercase tracking-tight opacity-70">
                    High-Fidelity AI Dubbing for Adults & Children.
                </p>
            </div>

            <div className="max-w-md mx-auto">
              <label className="relative group block cursor-pointer active:scale-95 transition-all">
                <div className={`absolute -inset-2 bg-${themeColor}-500/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <div className={`relative flex flex-col items-center gap-6 p-12 bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-[3rem] group-hover:border-${themeColor}-500/50 transition-all`}>
                  <div className={`w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-${themeColor}-500/10`}>
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">{t.uploadBtn}</h3>
                </div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{t.targetLanguage}</span>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setTargetLanguage(lang)}
                          className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-xs font-black
                            ${targetLanguage.code === lang.code ? `bg-${themeColor}-600 border-${themeColor}-400 text-white` : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                        >
                          {lang.name}
                          {targetLanguage.code === lang.code && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                </div>

                <button
                    onClick={startDubbingProcess}
                    disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                    className={`w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3`}
                  >
                    {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-5 h-5" /> {t.generateDub}</> : <RefreshCcw className="w-5 h-5 animate-spin" />}
                </button>
                <button onClick={() => setVideoUrl(null)} className="w-full text-center text-[9px] font-black text-slate-600 uppercase tracking-widest">Cancel</button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/5 aspect-video">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-6 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center"><Check className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Dubbing Finished</h3>
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Neural Audio Ready</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => { 
                                const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!); 
                                const url = URL.createObjectURL(merged); 
                                const a = document.createElement('a'); 
                                a.href = url; 
                                a.download = `master_dub_${Date.now()}.webm`; 
                                a.click(); 
                            }} 
                            className="px-8 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl"
                        >
                            <Download className="w-4 h-4" /> Export Video
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-16 text-center border-t border-white/5">
          <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.8em]">© 2025 ASLAM SAHDRA PRODUCTION</p>
      </footer>
    </div>
  );
}

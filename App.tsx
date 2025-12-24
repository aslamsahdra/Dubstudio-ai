
import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, AudioLines, Sparkles, 
  Settings, Smartphone, DownloadCloud, RefreshCcw, Crown, 
  Play, ShieldCheck, CreditCard, Zap, AlertCircle, Info
} from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, UILanguageCode } from './types';
import { fileToBase64, pcmToWavBlob } from './utils/fileUtils';
import { exportMergedVideo } from './utils/videoExporter';
import * as geminiService from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import ProcessingOverlay from './components/ProcessingOverlay';
import { translations } from './translations';

type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'purple';

interface UserProfile {
  isPremium: boolean;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('pa'); 
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [showSettings, setShowSettings] = useState(false);
  const [themeColor, setThemeColor] = useState<ThemeColor>('indigo');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  // Tiers & User State
  const [user, setUser] = useState<UserProfile>({ isPremium: false });
  const [videoDuration, setVideoDuration] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [adTimer, setAdTimer] = useState(15);
  const [showPayment, setShowPayment] = useState(false);

  const t = translations[uiLanguage] || translations['en'];

  useEffect(() => {
    const savedTheme = localStorage.getItem('dub_v4_theme') as ThemeColor;
    if (savedTheme) setThemeColor(savedTheme);
    const savedLang = localStorage.getItem('dub_v4_lang') as UILanguageCode;
    if (savedLang) setUiLanguage(savedLang);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setDubbedAudioUrl(null);
        setDubbingState({ status: 'idle' });
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const startDubbingProcess = () => {
    if (!videoFile) return;

    // Premium Check (> 3 mins)
    if (videoDuration > 180 && !user.isPremium) {
      setShowPayment(true);
      return;
    }

    // Ad Check (30s to 3 mins)
    if (videoDuration > 30 && !user.isPremium) {
      setAdTimer(15);
      setShowAd(true);
      const timer = setInterval(() => {
        setAdTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowAd(false);
            proceedToDubbing();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return;
    }

    // Free (Under 30s)
    proceedToDubbing();
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
      setDubbedAudioUrl(URL.createObjectURL(audioBlob));
      setDubbingState({ status: 'complete' });
    } catch (error: any) {
      setDubbingState({ status: 'error', errorMessage: error.message || "Failed to process. Check your network." });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-${themeColor}-600/10 blur-[100px] pointer-events-none -z-10`} />

      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br from-${themeColor}-600 to-purple-700 p-2.5 rounded-xl shadow-lg shadow-indigo-500/10`}>
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tighter uppercase leading-none block">DubStudio <span className={`text-${themeColor}-400`}>PRO</span></span>
              <p className="text-[7px] font-black text-slate-500 tracking-[0.4em] uppercase mt-0.5">Aslam Sahdra Production</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             {!user.isPremium && (
               <button 
                  onClick={() => setShowPayment(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
               >
                  <Crown className="w-4 h-4" /> Go Premium
               </button>
             )}
             {showInstallBtn && (
               <button 
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
               >
                  <Smartphone className="w-4 h-4" /> Install
               </button>
             )}
             <button onClick={() => setShowSettings(!showSettings)} className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 transition-all">
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* AD OVERLAY (FREE TIER) */}
      {showAd && (
        <div className="fixed inset-0 z-[1000] bg-black/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center">
           <div className="max-w-md space-y-10 animate-in fade-in zoom-in duration-500">
              <div className={`w-28 h-28 bg-${themeColor}-500/20 rounded-[2.5rem] border border-${themeColor}-500/30 mx-auto flex items-center justify-center animate-pulse shadow-3xl shadow-${themeColor}-500/20`}>
                 <Play className={`w-14 h-14 text-${themeColor}-400 fill-${themeColor}-400`} />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Support the Creator</h2>
                <p className="text-slate-400 font-bold text-sm leading-relaxed">Please watch this short 15-second message by <b>Aslam Sahdra</b> to continue with free dubbing.</p>
              </div>
              <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
                <div className={`absolute top-0 left-0 h-full bg-gradient-to-r from-${themeColor}-500 to-purple-500 transition-all duration-1000 ease-linear`} style={{ width: `${(15 - adTimer) / 15 * 100}%` }} />
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Processing will start in {adTimer}s</p>
           </div>
        </div>
      )}

      {/* PAYMENT MODAL (PREMIUM TIER) */}
      {showPayment && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3.5rem] p-10 space-y-10 relative shadow-2xl animate-in slide-in-from-bottom-12">
              <button onClick={() => setShowPayment(false)} className="absolute top-8 right-8 p-2.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
              
              <div className="text-center space-y-5">
                 <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-3xl shadow-amber-500/30 rotate-3">
                    <Crown className="w-12 h-12" />
                 </div>
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter">DubStudio Premium</h2>
                 <p className="text-slate-400 font-bold text-sm">Created by <b>Aslam Sahdra</b> for Professionals</p>
              </div>

              <div className="grid gap-4">
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="p-7 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between group hover:border-amber-500/50 transition-all text-left">
                    <div>
                       <h4 className="font-black text-white uppercase text-sm">Monthly Master</h4>
                       <p className="text-[10px] text-slate-500 font-bold mt-1">Unlimited videos up to 30 mins</p>
                    </div>
                    <span className="text-2xl font-black text-amber-500 group-hover:scale-110 transition-transform">$9.99</span>
                 </button>
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="p-7 bg-amber-500 border-2 border-amber-400 rounded-3xl flex items-center justify-between scale-105 shadow-2xl shadow-amber-500/20 text-left">
                    <div>
                       <h4 className="font-black text-black uppercase text-sm">Annual Production</h4>
                       <p className="text-[10px] text-amber-900 font-bold mt-1">Saves $30 / year + Priority Support</p>
                    </div>
                    <span className="text-2xl font-black text-black">$89.99</span>
                 </button>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
                >
                  <CreditCard className="w-5 h-5" /> Buy Plan Now
                </button>
                <div className="flex items-center justify-center gap-5 text-slate-600">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase"><ShieldCheck className="w-3.5 h-3.5" /> Secure</div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase"><Zap className="w-3.5 h-3.5" /> Fast</div>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase"><Info className="w-3.5 h-3.5" /> 24/7</div>
                </div>
              </div>
           </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {showSettings ? (
          <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex justify-between items-center border-b border-white/5 pb-8">
               <h2 className="text-4xl font-black text-white uppercase tracking-tighter">App Settings</h2>
               <button onClick={() => setShowSettings(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-8">
               <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">Language Preferences</span>
                  <div className="grid grid-cols-3 gap-4">
                     {['pa', 'en', 'hi'].map((lang) => (
                        <button 
                          key={lang}
                          onClick={() => { setUiLanguage(lang as UILanguageCode); localStorage.setItem('dub_v4_lang', lang); }} 
                          className={`py-5 rounded-2xl border-2 font-black text-sm uppercase tracking-widest transition-all ${uiLanguage === lang ? `bg-${themeColor}-600 border-${themeColor}-400 text-white shadow-lg` : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                        >
                          {lang === 'pa' ? 'ਪੰਜਾਬੀ' : lang === 'hi' ? 'हिन्दी' : 'English'}
                        </button>
                     ))}
                  </div>
               </div>
               <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">Studio Theme</span>
                  <div className="flex gap-5">
                     {(['indigo', 'rose', 'emerald', 'amber', 'purple'] as ThemeColor[]).map(color => (
                        <button 
                          key={color} 
                          onClick={() => { setThemeColor(color); localStorage.setItem('dub_v4_theme', color); }} 
                          className={`w-14 h-14 rounded-2xl bg-${color}-500 border-4 transition-transform hover:scale-110 ${themeColor === color ? 'border-white scale-110 shadow-2xl' : 'border-transparent opacity-60'}`} 
                        />
                     ))}
                  </div>
               </div>
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="text-center py-24 space-y-16">
            <div className="space-y-6">
              <div className={`inline-flex items-center gap-2 px-5 py-2.5 bg-${themeColor}-500/10 border border-${themeColor}-500/20 rounded-full text-${themeColor}-400 text-[10px] font-black uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-2`}>
                <Sparkles className="w-4 h-4" /> Neural Studio Edition
              </div>
              <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase">
                {uiLanguage === 'pa' ? 'ਮਾਸਟਰ ਡੱਬ' : 'Master Dub'}<br />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${themeColor}-400 to-purple-400`}>Official Studio</span>
              </h1>
              <p className="text-slate-500 font-black text-sm uppercase tracking-[0.2em]">Crafted with passion by Aslam Sahdra</p>
            </div>

            <label className="block max-w-2xl mx-auto cursor-pointer group active:scale-98 transition-all relative">
               <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
               <div className="relative p-20 bg-slate-900/80 border-2 border-dashed border-slate-800 rounded-[3.5rem] group-hover:border-indigo-500/50 transition-all shadow-3xl backdrop-blur-xl">
                  <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">{t.uploadBtn}</h3>
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">30s Free</span>
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Ads for 3m</span>
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full">Unlimited Pro</span>
                  </div>
               </div>
               <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/5 space-y-10 shadow-3xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Target dialect</span>
                      <span className={`px-4 py-1.5 bg-${themeColor}-500/10 rounded-full text-[10px] font-black text-${themeColor}-400 uppercase tracking-widest border border-${themeColor}-500/20`}>
                         {Math.floor(videoDuration)}s Production
                      </span>
                   </div>
                   <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                     {SUPPORTED_LANGUAGES.map(lang => (
                        <button 
                           key={lang.code}
                           onClick={() => setTargetLanguage(lang)}
                           className={`px-6 py-5 rounded-2xl border-2 text-sm font-black transition-all text-left flex justify-between items-center ${targetLanguage.code === lang.code ? `bg-${themeColor}-600 border-${themeColor}-400 text-white shadow-xl` : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                        >
                           {lang.name}
                           {targetLanguage.code === lang.code && <Check className="w-5 h-5" />}
                        </button>
                     ))}
                   </div>
                </div>
                
                <div className="space-y-4">
                  <button 
                    onClick={startDubbingProcess}
                    disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                    className="w-full py-6 bg-white text-black rounded-2xl font-black text-base uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-3xl disabled:opacity-50"
                  >
                    {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-6 h-6" /> Start Neural Synthesis</> : <RefreshCcw className="w-6 h-6 animate-spin" />}
                  </button>
                  
                  {dubbingState.status === 'error' && (
                    <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-400 text-[10px] font-black uppercase tracking-widest animate-in shake duration-500">
                       <AlertCircle className="w-5 h-5 shrink-0" /> {dubbingState.errorMessage}
                    </div>
                  )}
                </div>

                <button onClick={() => setVideoUrl(null)} className="w-full text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] hover:text-slate-400 transition-colors">Discard Master Record</button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
              <div className="relative rounded-[4rem] overflow-hidden bg-black border border-white/5 shadow-3xl aspect-video group">
                <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                <div className="absolute top-8 left-8 p-4 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                   <p className="text-[10px] font-black text-white/80 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Aslam Sahdra AI Engine</p>
                </div>
              </div>

              {dubbingState.status === 'complete' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[3.5rem] flex flex-col sm:flex-row items-center justify-between gap-8 animate-in slide-in-from-bottom-8 shadow-3xl shadow-emerald-500/5 backdrop-blur-sm">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20"><Check className="w-8 h-8" /></div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Production Ready</h3>
                      <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.2em] mt-1">Multi-vocal neural track synthesized</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                      const url = URL.createObjectURL(merged);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sahdra_production_dub_${Date.now()}.webm`;
                      a.click();
                    }}
                    className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl active:scale-95"
                  >
                    <DownloadCloud className="w-5 h-5 text-emerald-600" /> Export Production
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-16 text-center border-t border-white/5 mt-auto relative">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
         <div className="space-y-4">
           <p className="text-[10px] text-slate-700 font-black uppercase tracking-[1.5em] mb-4">Masterpiece Created By</p>
           <h4 className="text-3xl font-black text-white/10 uppercase tracking-[0.5em] hover:text-white/20 transition-colors cursor-default select-none">ASLAM SAHDRA</h4>
           <p className="text-[8px] text-slate-800 font-bold uppercase tracking-[0.3em]">Official AI Dubbing Suite • 2025 Edition</p>
         </div>
      </footer>
    </div>
  );
}

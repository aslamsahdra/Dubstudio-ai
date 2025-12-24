
import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, AudioLines, Sparkles, 
  Settings, Smartphone, DownloadCloud, RefreshCcw
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const t = translations[uiLanguage] || translations['en'];

  const themeClasses = {
    indigo: 'from-indigo-600 to-purple-700 bg-indigo-600 text-indigo-400 shadow-indigo-500/20',
    rose: 'from-rose-600 to-pink-700 bg-rose-600 text-rose-400 shadow-rose-500/20',
    emerald: 'from-emerald-600 to-teal-700 bg-emerald-600 text-emerald-400 shadow-emerald-500/20',
    amber: 'from-amber-600 to-orange-700 bg-amber-600 text-amber-400 shadow-amber-500/20',
    purple: 'from-purple-600 to-fuchsia-700 bg-purple-600 text-purple-400 shadow-purple-500/20',
  };

  useEffect(() => {
    // Check for saved preferences
    const savedTheme = localStorage.getItem('dub_v4_theme') as ThemeColor;
    if (savedTheme) setThemeColor(savedTheme);
    const savedLang = localStorage.getItem('dub_v4_lang') as UILanguageCode;
    if (savedLang) setUiLanguage(savedLang);

    // Register PWA Install Prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
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
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setDubbedAudioUrl(null);
      setDubbingState({ status: 'idle' });
    }
  };

  const startDubbingProcess = async () => {
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
      setDubbingState({ status: 'error', errorMessage: error.message || "Dubbing Failed" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans">
      {/* Background Glow */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[400px] bg-${themeColor}-600/10 blur-[100px] pointer-events-none -z-10`} />

      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`bg-gradient-to-br ${themeClasses[themeColor]} p-2 rounded-xl`}>
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-black text-white tracking-tighter uppercase">DubStudio <span className={`text-${themeColor}-400`}>AI</span></span>
              <p className="text-[8px] font-bold text-slate-500 tracking-[0.3em] uppercase">Sahdra Productions</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {showInstallBtn && (
               <button 
                  onClick={handleInstallClick}
                  className={`flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10`}
               >
                  <Smartphone className="w-4 h-4 text-indigo-600" /> Install App
               </button>
             )}
             <button 
                onClick={() => setShowSettings(!showSettings)} 
                className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 transition-all"
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {showSettings ? (
          <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-center border-b border-white/5 pb-6">
               <h2 className="text-3xl font-black text-white uppercase tracking-tight">App Settings</h2>
               <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-8">
               <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Interface Language</span>
                  <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => { setUiLanguage('pa'); localStorage.setItem('dub_v4_lang', 'pa'); }} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'pa' ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>ਪੰਜਾਬੀ</button>
                     <button onClick={() => { setUiLanguage('en'); localStorage.setItem('dub_v4_lang', 'en'); }} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'en' ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>English</button>
                     <button onClick={() => { setUiLanguage('hi'); localStorage.setItem('dub_v4_lang', 'hi'); }} className={`py-4 rounded-xl border font-black text-xs ${uiLanguage === 'hi' ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>हिन्दी</button>
                  </div>
               </div>
               <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-white/5 space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Theme Accent</span>
                  <div className="flex gap-4">
                     {(['indigo', 'rose', 'emerald', 'amber', 'purple'] as ThemeColor[]).map(color => (
                        <button key={color} onClick={() => { setThemeColor(color); localStorage.setItem('dub_v4_theme', color); }} className={`w-10 h-10 rounded-xl bg-${color}-500 border-2 ${themeColor === color ? 'border-white' : 'border-transparent'}`} />
                     ))}
                  </div>
               </div>
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="text-center py-20 space-y-12">
            <div className="space-y-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${themeColor}-500/10 border border-${themeColor}-500/20 rounded-full text-${themeColor}-400 text-[10px] font-black uppercase tracking-widest`}>
                <Sparkles className="w-3 h-3" /> AI Neural Audio Studio
              </div>
              <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] uppercase">
                {uiLanguage === 'pa' ? 'ਮਾਸਟਰ ਡੱਬ' : 'Master Dub'}<br />
                <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${themeColor}-400 to-purple-400`}>Production</span>
              </h1>
            </div>

            <label className="block max-w-xl mx-auto cursor-pointer group active:scale-95 transition-all">
               <div className="p-16 bg-slate-900/60 border-2 border-dashed border-slate-800 rounded-[3rem] group-hover:border-indigo-500/50 transition-all shadow-2xl">
                  <Upload className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 mx-auto mb-6" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{t.uploadBtn}</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">MP4 or WebM (Max 100MB)</p>
               </div>
               <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-white/5 space-y-8 shadow-xl">
                <div className="space-y-4">
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Language</span>
                   <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                     {SUPPORTED_LANGUAGES.map(lang => (
                        <button 
                           key={lang.code}
                           onClick={() => setTargetLanguage(lang)}
                           className={`px-6 py-4 rounded-2xl border text-xs font-black transition-all text-left flex justify-between items-center ${targetLanguage.code === lang.code ? `bg-${themeColor}-600 border-${themeColor}-400 text-white` : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
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
                  className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl"
                >
                  {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-5 h-5" /> Start Neural Dub</> : <RefreshCcw className="w-5 h-5 animate-spin" />}
                </button>
                <button onClick={() => setVideoUrl(null)} className="w-full text-[10px] text-slate-600 font-black uppercase tracking-widest hover:text-slate-400 transition-colors">Discard Master</button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="relative rounded-[3rem] overflow-hidden bg-black border border-white/5 shadow-2xl aspect-video">
                <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
              </div>

              {dubbingState.status === 'complete' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2.5rem] flex items-center justify-between gap-6 animate-in slide-in-from-bottom-4 shadow-xl shadow-emerald-500/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center"><Check className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase">Vocal Sync Complete</h3>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Multi-Speaker Track Ready</p>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                      const url = URL.createObjectURL(merged);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `sahdra_master_dub_${Date.now()}.webm`;
                      a.click();
                    }}
                    className="px-8 py-4 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl"
                  >
                    <DownloadCloud className="w-4 h-4 text-emerald-600" /> Export Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center border-t border-white/5 mt-auto">
         <p className="text-[9px] text-slate-700 font-black uppercase tracking-[1em]">© 2025 ASLAM SAHDRA PRODUCTION</p>
      </footer>
    </div>
  );
}

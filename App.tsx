
import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, AudioLines, Sparkles, 
  Settings, Smartphone, DownloadCloud, RefreshCcw, Crown, 
  Play, ShieldCheck, CreditCard, Zap, Share2, Palette, Globe,
  ExternalLink
} from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, UILanguageCode, UI_LANGUAGES } from './types';
import { fileToBase64, pcmToWavBlob } from './utils/fileUtils';
import { exportMergedVideo } from './utils/videoExporter';
import * as geminiService from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import ProcessingOverlay from './components/ProcessingOverlay';
import { translations } from './translations';

const THEMES = [
  { name: 'Indigo', color: 'bg-indigo-600', text: 'text-indigo-400', shadow: 'shadow-indigo-500/20', border: 'border-indigo-500/30' },
  { name: 'Emerald', color: 'bg-emerald-600', text: 'text-emerald-400', shadow: 'shadow-emerald-500/20', border: 'border-emerald-500/30' },
  { name: 'Rose', color: 'bg-rose-600', text: 'text-rose-400', shadow: 'shadow-rose-500/20', border: 'border-rose-500/30' },
  { name: 'Amber', color: 'bg-amber-600', text: 'text-amber-400', shadow: 'shadow-amber-500/20', border: 'border-amber-500/30' },
];

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('pa'); 
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState({ isPremium: false });
  const [videoDuration, setVideoDuration] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [activeTheme, setActiveTheme] = useState(THEMES[0]);

  const t = translations[uiLanguage] || translations['en'];

  useEffect(() => {
    const savedLang = localStorage.getItem('sahdra_v6_lang') as UILanguageCode;
    if (savedLang) setUiLanguage(savedLang);
    const savedTheme = localStorage.getItem('sahdra_theme');
    if (savedTheme) {
      const found = THEMES.find(th => th.name === savedTheme);
      if (found) setActiveTheme(found);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // CLEAR ALL STATE IMMEDIATELY to stop the "infinite loading" bug
      setVideoUrl(null);
      setDubbedAudioUrl(null);
      setDubbingState({ status: 'idle' });
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setVideoDuration(video.duration);
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
      };
      video.onerror = () => {
        setDubbingState({ status: 'error', errorMessage: "Video format not supported" });
      };
      video.src = URL.createObjectURL(file);
    }
  };

  const handleDubbing = async () => {
    if (!videoFile) return;
    if (videoDuration > 180 && !user.isPremium) return setShowPayment(true);
    
    setDubbingState({ status: 'uploading' });
    try {
      const base64 = await fileToBase64(videoFile);
      setDubbingState({ status: 'analyzing' });
      const analysis = await geminiService.generateTranslatedScript(base64, videoFile.type, targetLanguage);
      setDubbingState({ status: 'dubbing' });
      const audioB64 = await geminiService.generateDubbedAudio(analysis, targetLanguage);
      setDubbedAudioUrl(URL.createObjectURL(pcmToWavBlob(audioB64, 24000)));
      setDubbingState({ status: 'complete' });
    } catch (e: any) {
      setDubbingState({ status: 'error', errorMessage: e.message || "Engine Error" });
    }
  };

  const handleShare = async () => {
    if (!videoUrl || !dubbedAudioUrl) return;
    try {
      const mergedBlob = await exportMergedVideo(videoUrl, dubbedAudioUrl);
      const file = new File([mergedBlob], `aslam_sahdra_dub_${Date.now()}.webm`, { type: 'video/webm' });
      
      const appUrl = window.location.origin; // Get the current app link
      const shareText = `Check out my video dubbed by Aslam Sahdra AI! 🎙️✨\nTry it now and download the app here: ${appUrl}`;

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'DubStudio AI Production',
          text: shareText
        });
      } else {
        // Desktop Fallback
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
        navigator.clipboard.writeText(shareText);
        alert("Video saved! App link copied to clipboard. Paste it when you share!");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  return (
    <div className={`min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden`}>
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-[100] sticky top-0">
        <div className="flex items-center gap-3">
          <div className={`${activeTheme.color} p-1.5 rounded-lg shadow-lg ${activeTheme.shadow}`}>
            <AudioLines className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-xs font-black uppercase tracking-tighter">Aslam Sahdra <span className={activeTheme.text}>Neural Studio</span></h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Master Edition V2.5</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           {!user.isPremium && (
             <button onClick={() => setShowPayment(true)} className="px-4 py-1.5 bg-amber-500 text-black rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">
               <Crown className="w-3 h-3 inline mr-1" /> Upgrade
             </button>
           )}
           <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
             <Settings className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* Main Studio Console */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* UPPER: Master Screen (Fixed) */}
        <section className="flex-[1.8] relative bg-black flex items-center justify-center p-0 sm:p-6 overflow-hidden">
           {videoUrl ? (
             <div className="w-full h-full max-w-5xl aspect-video sm:rounded-3xl overflow-hidden shadow-3xl border-0 sm:border border-white/5 bg-black relative">
               <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
               <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
               
               {/* Label */}
               <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${videoUrl ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                 <span className="text-[9px] font-black uppercase text-white/80 tracking-widest">Master Studio Live</span>
               </div>
             </div>
           ) : (
             <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700 p-10">
                <div className={`w-24 h-24 ${activeTheme.color} bg-opacity-10 border ${activeTheme.border} rounded-[2.5rem] flex items-center justify-center mx-auto mb-6`}>
                  <Upload className={`w-10 h-10 ${activeTheme.text}`} />
                </div>
                <h2 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter italic">Neural <span className={activeTheme.text}>Dubbing</span></h2>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">Professional Multi-Language Synthesis</p>
             </div>
           )}
        </section>

        {/* LOWER: Control Center */}
        <section className="bg-slate-950 border-t border-white/10 p-6 sm:p-10 pb-12 sm:pb-10 overflow-y-auto">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
              
              {/* File Info */}
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                 <label className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                    <Upload className="w-4 h-4" /> {videoUrl ? 'Upload New' : t.uploadBtn}
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                 </label>

                 <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 w-full sm:w-auto">
                    <Globe className={`w-4 h-4 ${activeTheme.text}`} />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Output Language</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{targetLanguage.name}</span>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="ml-auto text-[8px] font-black text-indigo-400 uppercase tracking-widest underline decoration-2 underline-offset-4">Change</button>
                 </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                 {videoUrl && (
                   <button 
                     onClick={handleDubbing}
                     disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                     className={`flex-1 lg:flex-none px-12 py-5 ${activeTheme.color} text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl ${activeTheme.shadow} flex items-center justify-center gap-3 disabled:opacity-50`}
                   >
                     {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-4 h-4" /> Start Dubbing</> : <RefreshCcw className="w-4 h-4 animate-spin" />}
                   </button>
                 )}

                 {dubbingState.status === 'complete' && (
                   <div className="flex items-center gap-3 w-full sm:w-auto">
                     <button 
                       onClick={async () => {
                         const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                         const url = URL.createObjectURL(merged);
                         const a = document.createElement('a'); a.href = url; a.download = `sahdra_production_${Date.now()}.webm`; a.click();
                       }}
                       className="flex-1 sm:flex-none px-8 py-5 bg-emerald-500 text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-400 active:scale-95 transition-all"
                     >
                       <DownloadCloud className="w-4 h-4" /> Save
                     </button>
                     <button 
                       onClick={handleShare}
                       className="flex-1 sm:flex-none px-8 py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                     >
                       <Share2 className="w-4 h-4" /> Share
                     </button>
                   </div>
                 )}
              </div>
           </div>
        </section>
      </main>

      {/* Advanced Studio Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-10">
           <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 sm:p-12 space-y-8 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
              
              <div className="flex justify-between items-center sticky top-0 bg-slate-900 py-4 z-10 border-b border-white/5">
                 <div className="flex items-center gap-4">
                   <Settings className={`w-6 h-6 ${activeTheme.text}`} />
                   <h3 className="text-2xl font-black uppercase tracking-tighter italic">Production Console</h3>
                 </div>
                 <button onClick={() => setShowSettings(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
              </div>

              {/* Section 1: Dubbing Output Language (50+ Languages) */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Globe className="w-3 h-3" /> Synthesis Target Language
                    </p>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${activeTheme.text}`}>50+ Available</span>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 h-64 overflow-y-auto pr-4 custom-scrollbar bg-black/20 p-4 rounded-3xl border border-white/5">
                    {SUPPORTED_LANGUAGES.map(l => (
                      <button 
                        key={l.code} 
                        onClick={() => { setTargetLanguage(l); }} 
                        className={`py-3 px-2 rounded-xl border font-bold uppercase text-[9px] tracking-tight transition-all text-center ${targetLanguage.code === l.code ? `${activeTheme.color} border-white/20 text-white` : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                      >
                        {l.name}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Section 2: Interface Language */}
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone className="w-3 h-3" /> App Interface Language
                 </p>
                 <div className="grid grid-cols-3 gap-3">
                    {UI_LANGUAGES.map(l => (
                      <button 
                        key={l.code} 
                        onClick={() => { setUiLanguage(l.code); localStorage.setItem('sahdra_v6_lang', l.code); }} 
                        className={`py-5 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${uiLanguage === l.code ? `${activeTheme.color} border-white/20 text-white` : 'bg-white/5 border-transparent text-slate-500'}`}
                      >
                        {l.name}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Section 3: Theme Customization */}
              <div className="space-y-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Palette className="w-3 h-3" /> Studio Appearance
                 </p>
                 <div className="grid grid-cols-4 gap-4">
                    {THEMES.map(th => (
                      <button 
                        key={th.name} 
                        onClick={() => { setActiveTheme(th); localStorage.setItem('sahdra_theme', th.name); }}
                        className={`group relative h-16 rounded-2xl ${th.color} border-4 transition-all overflow-hidden ${activeTheme.name === th.name ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{th.name}</span>
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Payment Upgrade Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[250] bg-black/98 flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[4rem] p-12 space-y-10 relative">
              <button onClick={() => setShowPayment(false)} className="absolute top-10 right-10 p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
              <div className="text-center space-y-4">
                 <div className="w-24 h-24 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center shadow-3xl shadow-amber-500/30 -rotate-6">
                    <Crown className="w-12 h-12 text-black" />
                 </div>
                 <h2 className="text-4xl font-black uppercase tracking-tighter">Production Pro</h2>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-loose italic">Official License by Aslam Sahdra Production</p>
              </div>
              <div className="space-y-4">
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all shadow-2xl">Activate Annual License - $89.99</button>
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Monthly Access - $9.99</button>
              </div>
           </div>
        </div>
      )}

      {/* Production Footer */}
      <footer className="h-10 border-t border-white/5 flex items-center justify-center bg-black/80 backdrop-blur-md">
         <span className="text-[7px] font-black text-slate-700 uppercase tracking-[1.2em] select-none">ASLAM SAHDRA PRODUCTION STUDIO</span>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { 
  Upload, Mic2, Check, Download, X, AudioLines, Sparkles, 
  Settings, Smartphone, DownloadCloud, RefreshCcw, Crown, 
  Play, ShieldCheck, CreditCard, Zap, Share2
} from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, UILanguageCode } from './types';
import { fileToBase64, pcmToWavBlob } from './utils/fileUtils';
import { exportMergedVideo } from './utils/videoExporter';
import * as geminiService from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import ProcessingOverlay from './components/ProcessingOverlay';
import { translations } from './translations';

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

  const t = translations[uiLanguage] || translations['en'];

  useEffect(() => {
    const savedLang = localStorage.getItem('sahdra_v5_lang') as UILanguageCode;
    if (savedLang) setUiLanguage(savedLang);
  }, []);

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
      const file = new File([mergedBlob], `sahdra_dub_${Date.now()}.webm`, { type: 'video/webm' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'DubStudio Production',
          text: 'Check out this neural dub by Aslam Sahdra Production!'
        });
      } else {
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans overflow-hidden">
      {/* Top Header - Floating Style */}
      <header className="h-16 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-[100]">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <AudioLines className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xs font-black uppercase tracking-tighter">Aslam Sahdra <span className="text-indigo-500">Neural Studio</span></h1>
        </div>
        <div className="flex items-center gap-3">
           {!user.isPremium && (
             <button onClick={() => setShowPayment(true)} className="px-4 py-1.5 bg-amber-500 text-black rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
               <Crown className="w-3 h-3 inline mr-1" /> Upgrade
             </button>
           )}
           <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-white"><Settings className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Main Studio Console */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* UPPER: Master Screen Area */}
        <section className="flex-1 relative bg-black/40 flex items-center justify-center p-4">
           {videoUrl ? (
             <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-3xl border border-white/5 bg-black relative">
               <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
               <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
               {/* Label */}
               <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase text-white/80 tracking-widest">Neural Master View</span>
               </div>
             </div>
           ) : (
             <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-indigo-500/10 border border-indigo-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-4xl sm:text-7xl font-black text-white uppercase tracking-tighter italic">Neural <span className="text-indigo-500">Dubbing</span> Engine</h2>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em]">Professional Studio by Aslam Sahdra</p>
             </div>
           )}
        </section>

        {/* LOWER: Control Console */}
        <section className="h-auto bg-slate-950 border-t border-white/5 p-6 sm:p-10">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
              
              {/* Left Side: File & Language */}
              <div className="flex flex-col sm:flex-row items-center gap-5 w-full lg:w-auto">
                 <label className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                    <Upload className="w-4 h-4" /> {videoUrl ? 'New Master' : t.uploadBtn}
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                 </label>

                 <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-4">Output:</span>
                    <select 
                      value={targetLanguage.code} 
                      onChange={(e) => setTargetLanguage(SUPPORTED_LANGUAGES.find(l => l.code === e.target.value)!)}
                      className="bg-transparent text-white font-black uppercase text-[10px] tracking-widest border-none focus:ring-0 cursor-pointer pr-10"
                    >
                      {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code} className="bg-slate-900">{l.name}</option>)}
                    </select>
                 </div>
              </div>

              {/* Right Side: Execution */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                 {videoUrl && (
                   <button 
                     onClick={handleDubbing}
                     disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                     className="flex-1 lg:flex-none px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-500 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
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
                         const a = document.createElement('a'); a.href = url; a.download = `dubbed_${Date.now()}.webm`; a.click();
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[3rem] p-10 space-y-10 animate-in zoom-in duration-300">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase tracking-tighter italic">Studio Console</h3>
                 <button onClick={() => setShowSettings(false)} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Interface Language</p>
                 <div className="grid grid-cols-3 gap-3">
                    {['pa', 'en', 'hi'].map(l => (
                      <button 
                        key={l} 
                        onClick={() => { setUiLanguage(l as UILanguageCode); localStorage.setItem('sahdra_v5_lang', l); }} 
                        className={`py-4 rounded-xl border-2 font-black uppercase text-[10px] transition-all ${uiLanguage === l ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-transparent text-slate-500'}`}
                      >
                        {l === 'pa' ? 'ਪੰਜਾਬੀ' : l === 'hi' ? 'हिन्दी' : 'English'}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[250] bg-black/95 flex items-center justify-center p-6">
           <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[4rem] p-12 space-y-10 relative">
              <button onClick={() => setShowPayment(false)} className="absolute top-10 right-10 p-2 bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
              <div className="text-center space-y-4">
                 <div className="w-20 h-20 bg-amber-500 rounded-3xl mx-auto flex items-center justify-center shadow-3xl shadow-amber-500/30 -rotate-6">
                    <Crown className="w-10 h-10 text-black" />
                 </div>
                 <h2 className="text-4xl font-black uppercase tracking-tighter">Production Pro</h2>
                 <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-loose italic">Official License for Aslam Sahdra Production</p>
              </div>
              <div className="space-y-4">
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="w-full py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all">Buy Annual Access - $89.99</button>
                 <button onClick={() => { setUser({ isPremium: true }); setShowPayment(false); }} className="w-full py-6 bg-white/5 text-white border border-white/10 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all">Buy Monthly - $9.99</button>
              </div>
           </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="h-10 border-t border-white/5 flex items-center justify-center bg-black/50 backdrop-blur-md">
         <span className="text-[7px] font-black text-slate-700 uppercase tracking-[1.5em] select-none">© 2025 ASLAM SAHDRA PRODUCTION STUDIO</span>
      </footer>
    </div>
  );
}

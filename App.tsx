
import React, { useState, useEffect } from 'react';
import { Upload, Mic2, Check, Download, X, History, Trash2, PlayCircle, AudioLines, Languages, Sparkles, AlertCircle, RefreshCcw, LayoutGrid, Cpu, ShieldCheck } from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, UILanguageCode } from './types';
import { fileToBase64, pcmToWavBlob } from './utils/fileUtils';
import { exportMergedVideo } from './utils/videoExporter';
import * as geminiService from './services/geminiService';
import VideoPlayer from './components/VideoPlayer';
import ProcessingOverlay from './components/ProcessingOverlay';
import { translations } from './translations';

interface HistoryItem {
  id: string;
  originalUrl: string;
  dubbedUrl: string;
  language: string;
  fileName: string;
  timestamp: number;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('pa'); 
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const t = translations[uiLanguage] || translations['en'];

  useEffect(() => {
    const saved = localStorage.getItem('dub_v4_master_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 15);
    setHistory(updated);
    localStorage.setItem('dub_v4_master_history', JSON.stringify(updated));
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(i => i.id !== id);
    setHistory(updated);
    localStorage.setItem('dub_v4_master_history', JSON.stringify(updated));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024 * 1024) {
        alert("File too large. Max 150MB.");
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setDubbedAudioUrl(null);
      setDubbingState({ status: 'idle' });
    }
  };

  const startDubbing = async () => {
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
      saveHistory({
        id: Date.now().toString(),
        originalUrl: videoUrl!,
        dubbedUrl: dubbedUrl,
        language: targetLanguage.name,
        fileName: videoFile.name,
        timestamp: Date.now()
      });
    } catch (error: any) {
      setDubbingState({ status: 'error', errorMessage: error.message || "Dubbing Failed" });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-indigo-600/10 blur-[150px] pointer-events-none -z-10 rounded-full" />

      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-3xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <AudioLines className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-tighter uppercase">DubStudio <span className="text-indigo-400">PRO</span></span>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">Master Edition</span>
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">BY ASLAM SAHDRA</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setShowHistory(!showHistory)} 
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border transition-all font-bold text-xs
                  ${showHistory ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}
             >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">{uiLanguage === 'pa' ? 'ਗੈਲਰੀ' : uiLanguage === 'hi' ? 'गैलरी' : 'History'}</span>
             </button>
             <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                <button onClick={() => setUiLanguage('pa')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-colors ${uiLanguage === 'pa' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ਪੰ</button>
                <button onClick={() => setUiLanguage('en')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-colors ${uiLanguage === 'en' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
                <button onClick={() => setUiLanguage('hi')} className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-colors ${uiLanguage === 'hi' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>हि</button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20">
        {showHistory ? (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tight uppercase">{uiLanguage === 'pa' ? 'ਤੁਹਾਡੀ ਗੈਲਰੀ' : uiLanguage === 'hi' ? 'आपकी गैलरी' : 'Your Gallery'}</h2>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Production History • Aslam Sahdra</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-3 bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 text-center bg-slate-900/30 rounded-[4rem] border border-dashed border-white/5">
                 <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
                    <LayoutGrid className="w-10 h-10 text-slate-700" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-500 uppercase tracking-widest">{uiLanguage === 'pa' ? 'ਗੈਲਰੀ ਖਾਲੀ ਹੈ' : 'Gallery Empty'}</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-900/60 border border-white/10 rounded-[3rem] overflow-hidden group hover:border-indigo-500/50 transition-all shadow-2xl">
                    <div className="aspect-video bg-black relative overflow-hidden">
                       <video src={item.originalUrl} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-700" />
                       <div className="absolute inset-0 flex items-center justify-center">
                          <button 
                            onClick={() => { 
                                setVideoUrl(item.originalUrl); 
                                setDubbedAudioUrl(item.dubbedUrl); 
                                setShowHistory(false); 
                                setDubbingState({status: 'complete'}); 
                            }} 
                            className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-3xl transform scale-90 group-hover:scale-100 transition-all duration-500 active:scale-90"
                          >
                             <PlayCircle className="w-8 h-8" />
                          </button>
                       </div>
                       <div className="absolute top-6 left-6">
                          <span className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">{item.language}</span>
                       </div>
                    </div>
                    <div className="p-8 flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-base font-bold text-white truncate">{item.fileName}</span>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <button onClick={() => deleteHistory(item.id)} className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !videoUrl ? (
          <div className="max-w-5xl mx-auto py-12 space-y-16 text-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
                    <Sparkles className="w-4 h-4" /> Neural Synthesis Studio
                </div>
                <h1 className="text-6xl md:text-[10rem] font-black tracking-tighter text-white leading-[0.8] drop-shadow-2xl">
                  {uiLanguage === 'pa' ? 'ਵੀਡੀਓਜ਼ ਨੂੰ' : uiLanguage === 'hi' ? 'वीडियोस को' : 'DUB YOUR'}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-purple-400">{uiLanguage === 'pa' ? 'ਮਾਸਟਰ ਡੱਬ' : uiLanguage === 'hi' ? 'मास्टर डब' : 'MASTER VIDEOS'}</span> {uiLanguage === 'pa' ? 'ਕਰੋ' : uiLanguage === 'hi' ? 'करें' : ''}।
                </h1>
                <p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                    Professional AI video dubbing with high-fidelity voice matching. Powered by Neural Engine 2025.
                </p>
            </div>

            <div className="max-w-2xl mx-auto pt-8">
              <label className="relative group block cursor-pointer transition-transform active:scale-95">
                <div className="absolute -inset-6 bg-indigo-500/10 rounded-[5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex flex-col items-center gap-8 p-16 md:p-32 bg-slate-900/40 backdrop-blur-3xl border-2 border-dashed border-slate-800 rounded-[5rem] group-hover:border-indigo-500/50 transition-all shadow-2xl">
                  <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors border border-white/5 shadow-inner">
                    <Upload className="w-10 h-10 text-white group-hover:text-indigo-400" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-white tracking-tight uppercase">{t.uploadBtn}</h3>
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em]">{t.maxSize}</p>
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
                 <button onClick={() => setVideoUrl(null)} className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/5">
                    <X className="w-5 h-5" /> Change Production
                 </button>

                 <div className="space-y-5">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">{t.targetLanguage}</span>
                        <Languages className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setTargetLanguage(lang)}
                          disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                          className={`flex items-center justify-between px-7 py-5 rounded-[2rem] border-2 transition-all text-sm font-black
                            ${targetLanguage.code === lang.code ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-600/20' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:border-white/5'}`}
                        >
                          {lang.name}
                          {targetLanguage.code === lang.code && <Check className="w-5 h-5 animate-in zoom-in" />}
                        </button>
                      ))}
                    </div>
                 </div>

                 <button
                    onClick={startDubbing}
                    disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                    className="w-full py-7 bg-white text-black rounded-[2.5rem] font-black text-base uppercase tracking-[0.2em] transition-all shadow-3xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 group"
                  >
                    {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? <><Mic2 className="w-6 h-6 group-hover:scale-110 transition-transform" /> {t.generateDub}</> : <RefreshCcw className="w-6 h-6 animate-spin" />}
                 </button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
                <div className="relative rounded-[4.5rem] overflow-hidden bg-black shadow-3xl border border-white/10 aspect-video group">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-12 rounded-[4rem] flex flex-wrap items-center justify-between gap-8 animate-in slide-in-from-top-12 duration-1000 shadow-2xl">
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20"><Check className="w-10 h-10" /></div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Production Ready</h3>
                                <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em] mt-3">Exported in high-fidelity {targetLanguage.name}</p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => { 
                                const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!); 
                                const url = URL.createObjectURL(merged); 
                                const a = document.createElement('a'); 
                                a.href = url; 
                                a.download = `aslam_sahdra_dub_${Date.now()}.webm`; 
                                a.click(); 
                            }} 
                            className="px-10 py-5 bg-white text-black rounded-3xl text-sm font-black uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-2xl"
                        >
                            <Download className="w-5 h-5" /> Download Master
                        </button>
                    </div>
                )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-20 text-center border-t border-white/5 bg-slate-950/60 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">
            <div className="flex items-center gap-6 opacity-30">
               <Cpu className="w-5 h-5" />
               <div className="h-px w-20 bg-slate-800" />
               <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-3">
                <p className="text-sm text-white font-black tracking-tight uppercase">DubStudio PRO <span className="text-indigo-400">Master</span></p>
                <p className="text-[10px] text-slate-600 font-black tracking-[0.6em] uppercase">Neural Engine 2025 • Aslam Sahdra Production</p>
            </div>
            <p className="text-[9px] text-slate-800 font-black uppercase tracking-widest">Authorized Edition v1.4.5</p>
          </div>
      </footer>
    </div>
  );
}

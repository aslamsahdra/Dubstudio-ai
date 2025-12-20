
import React, { useState, useEffect } from 'react';
import { Upload, Video, Languages, Mic2, Sparkles, Check, Download, Share2, X, Copy, MessageCircle, Info, HelpCircle, Rocket, ExternalLink, ShieldCheck } from 'lucide-react';
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
  const [uiLanguage] = useState<UILanguageCode>('en'); 
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [isDubEnabled, setIsDubEnabled] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const t = translations[uiLanguage];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("File size exceeds 100MB limit.");
        return;
      }
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setDubbedAudioUrl(null);
      setDubbingState({ status: 'idle' });
    }
  };

  const startDubbing = async () => {
    if (!videoFile || !isOnline) return;
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
      setIsDubEnabled(true);
    } catch (error: any) {
      console.error(error);
      setDubbingState({ status: 'error', errorMessage: error.message || "Dubbing failed. Please check your API Key." });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-indigo-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-purple-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      {/* HEADER */}
      <header className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.2)] group-hover:scale-105 transition-all">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-white tracking-tight leading-none">DubStudio <span className="text-indigo-400">AI</span></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Professional Suite</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Engine Ready</span>
             </div>
             <button 
               onClick={() => setShowHelpModal(true)}
               className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition-all border border-white/5"
             >
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Setup Guide</span>
             </button>
             <button 
               onClick={() => setShowShareModal(true)} 
               className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
             >
                Share
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {!videoUrl ? (
          <div className="text-center py-20 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="inline-flex items-center gap-3 mb-10 px-5 py-2 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next-Generation AI Voice Matching
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.85] text-white">
              Global reach, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300">Native voice.</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-16 font-medium leading-relaxed max-w-2xl mx-auto">
              Automatically translate and dub your videos with studio-quality voices. 
              The most advanced AI engine for content creators.
            </p>
            
            <div className="max-w-xl mx-auto">
              <label className="relative group block cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-700"></div>
                <div className="relative flex flex-col items-center gap-6 p-20 bg-slate-900 border border-white/10 rounded-[2.5rem] group-hover:bg-slate-800 transition-all border-dashed">
                  <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
                    <Upload className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">Upload Source Video</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">MP4, WebM • Max 100MB</p>
                  </div>
                </div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-[2rem] p-8">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Active Project</h2>
                    <button onClick={() => setVideoUrl(null)} className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-colors">Discard</button>
                 </div>
                 <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="bg-indigo-500/20 p-2 rounded-lg"><Video className="w-5 h-5 text-indigo-400" /></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold truncate text-slate-200">{videoFile?.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ready to process</span>
                    </div>
                 </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-[2rem] p-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Translation Output</h2>
                <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setTargetLanguage(lang)}
                            disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                            className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-sm font-bold
                                ${targetLanguage.code === lang.code 
                                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-900/40' 
                                  : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                        >
                            <span className="flex items-center gap-3">
                              <Languages className={`w-4 h-4 ${targetLanguage.code === lang.code ? 'text-white' : 'text-slate-600'}`} />
                              {lang.name}
                            </span>
                            {targetLanguage.code === lang.code && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
              </div>

              <button
                onClick={startDubbing}
                disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete' || !isOnline}
                className="group relative w-full py-6 bg-white text-black rounded-2xl font-black text-lg transition-all shadow-2xl hover:bg-indigo-50 active:scale-95 disabled:opacity-50 overflow-hidden flex items-center justify-center gap-3"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? (
                   <>
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    Start AI Dubbing
                   </>
                ) : (
                  <span className="animate-pulse">Synthesizing...</span>
                )}
              </button>
            </div>

            {/* Main Stage Area */}
            <div className="lg:col-span-8 space-y-8">
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/10 aspect-video">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={isDubEnabled} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-8 animate-in slide-in-from-top-6">
                        <div className="flex items-center gap-6">
                            <div className="bg-emerald-500 p-4 rounded-2xl text-white shadow-lg shadow-emerald-500/20"><Check className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-black text-xl text-white">Dubbing Successful</h3>
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">Output: {targetLanguage.name} • High Fidelity</p>
                            </div>
                        </div>
                        <button 
                          onClick={async () => {
                              const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                              const url = URL.createObjectURL(merged);
                              const a = document.createElement('a'); a.href = url; a.download = 'dubbed_video.webm'; a.click();
                          }} 
                          className="px-8 py-4 bg-white text-black hover:bg-slate-100 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-xl active:scale-95"
                        >
                            <Download className="w-5 h-5" /> Download Final File
                        </button>
                    </div>
                )}

                {dubbingState.status === 'error' && (
                   <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2.5rem] flex items-center gap-6 text-rose-400">
                      <Rocket className="w-8 h-8 rotate-180" />
                      <div>
                        <p className="font-black text-lg uppercase">Synthesis Failed</p>
                        <p className="text-sm font-medium opacity-80">{dubbingState.errorMessage}</p>
                      </div>
                   </div>
                )}
            </div>
          </div>
        )}
      </main>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-xl shadow-3xl relative">
                <button onClick={() => setShowHelpModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-3xl font-black text-white mb-8 tracking-tighter">Local Setup Guide</h2>
                
                <div className="space-y-6 mb-12">
                    {[
                      { step: 1, title: "API Configuration", text: "Create a .env file and add your API_KEY from Google AI Studio." },
                      { step: 2, title: "Dependencies", text: "Run 'npm install' to fetch all required libraries." },
                      { step: 3, title: "Launch App", text: "Run 'npm run dev' to start your local studio environment." },
                      { step: 4, title: "GitHub Sync", text: "Connect your project to GitHub via the header button to save progress." }
                    ].map(item => (
                      <div key={item.step} className="flex gap-6">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-indigo-600/20">{item.step}</div>
                        <div>
                          <p className="font-black text-white mb-1">{item.title}</p>
                          <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    ))}
                </div>

                <button onClick={() => setShowHelpModal(false)} className="w-full py-5 bg-white text-black rounded-2xl font-black transition-all hover:bg-slate-100 shadow-xl">Understood</button>
            </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in zoom-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] p-10 w-full max-w-md shadow-3xl relative text-center">
                <button onClick={() => setShowShareModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                <div className="bg-indigo-600/10 p-5 rounded-3xl inline-block mb-6">
                  <Rocket className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-3xl font-black mb-10 text-white">Share Studio</h3>
                <div className="space-y-6">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group">
                        <input type="text" readOnly value={window.location.href} className="bg-transparent text-slate-400 text-xs flex-1 outline-none px-2 font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Studio URL copied!"); }} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-lg"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => window.open(`https://wa.me/?text=Check this amazing AI Dubbing Studio: ${window.location.href}`)} className="flex flex-col items-center gap-4 p-8 bg-white/5 hover:bg-white/10 rounded-[2.5rem] transition-all border border-white/5">
                          <MessageCircle className="w-10 h-10 text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">WhatsApp</span>
                       </button>
                       <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=Transform your videos with AI: ${window.location.href}`)} className="flex flex-col items-center gap-4 p-8 bg-white/5 hover:bg-white/10 rounded-[2.5rem] transition-all border border-white/5">
                          <Share2 className="w-10 h-10 text-indigo-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Twitter</span>
                       </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <footer className="border-t border-white/5 bg-slate-950/80 py-10 text-center">
          <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5`}>
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isOnline ? "Network Active" : "Link Lost"}</span>
                  </div>
              </div>
              <p className="text-[11px] text-slate-600 font-bold tracking-widest uppercase">© 2025 DubStudio AI. All rights reserved.</p>
          </div>
      </footer>
    </div>
  );
}

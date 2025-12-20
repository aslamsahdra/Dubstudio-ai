
import React, { useState, useEffect } from 'react';
import { Upload, Video, Languages, Mic2, Sparkles, Check, Download, Share2, X, Copy, MessageCircle, Info, HelpCircle, Rocket } from 'lucide-react';
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
      setDubbingState({ status: 'error', errorMessage: error.message || "Dubbing failed. Please check your API Key and connection." });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* GLOW DECOR */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-indigo-600/10 blur-[120px] pointer-events-none -z-10" />

      {/* NAVBAR */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:scale-110 transition-transform">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tighter">DubStudio <span className="text-indigo-500">AI</span></span>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setShowHelpModal(true)}
               className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
             >
                <HelpCircle className="w-4 h-4" />
                Setup Guide
             </button>
             <button 
               onClick={() => setShowShareModal(true)} 
               className="px-5 py-2.5 bg-white text-black rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
             >
                Share App
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-20">
        {!videoUrl ? (
          <div className="text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3" />
              Next-Gen Translation
            </div>
            <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] text-white">
              Give your video <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">a new voice.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 mb-12 font-medium leading-relaxed">
              Professional-grade AI dubbing in seconds. Automatically detect speakers and translate your content into 50+ languages.
            </p>
            
            <label className="relative group block cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative flex flex-col items-center gap-6 p-16 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] hover:bg-[#111] transition-all">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-2xl">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-2xl font-black text-white block mb-2">Drop your video here</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supports MP4, WebM (Max 100MB)</span>
                </div>
              </div>
              <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12 items-start animate-in fade-in duration-700">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Video Source</h2>
                    <button onClick={() => setVideoUrl(null)} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">Reset</button>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                    <Video className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold truncate text-slate-300">{videoFile?.name}</span>
                 </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Select Language</h2>
                <div className="grid gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setTargetLanguage(lang)}
                            disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                            className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-sm font-bold
                                ${targetLanguage.code === lang.code ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-300'}`}
                        >
                            <span>{lang.name}</span>
                            {targetLanguage.code === lang.code && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
              </div>

              <button
                onClick={startDubbing}
                disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete' || !isOnline}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all shadow-2xl shadow-indigo-900/40 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? (
                   <>
                    <Sparkles className="w-6 h-6" />
                    Generate Dub
                   </>
                ) : (
                  <span className="animate-pulse">Processing...</span>
                )}
              </button>
            </div>

            {/* Player Area */}
            <div className="lg:col-span-8 space-y-8">
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 aspect-video group">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={isDubEnabled} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] flex flex-wrap items-center justify-between gap-8 animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-5">
                            <div className="bg-indigo-600 p-4 rounded-2xl text-white"><Mic2 className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-black text-xl text-white">AI Dubbing Ready!</h3>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Synced to: {targetLanguage.name}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button 
                              onClick={async () => {
                                  const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                                  const url = URL.createObjectURL(merged);
                                  const a = document.createElement('a'); a.href = url; a.download = 'final_video.webm'; a.click();
                              }} 
                              className="px-8 py-4 bg-white text-black hover:bg-indigo-50 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
                            >
                                <Download className="w-5 h-5" /> Download Video
                            </button>
                        </div>
                    </div>
                )}

                {dubbingState.status === 'error' && (
                   <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-400">
                      <Rocket className="w-6 h-6 rotate-180" />
                      <div>
                        <p className="font-black text-sm uppercase">Processing Error</p>
                        <p className="text-xs opacity-80">{dubbingState.errorMessage}</p>
                      </div>
                   </div>
                )}
            </div>
          </div>
        )}
      </main>

      {/* HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 w-full max-w-xl shadow-2xl relative">
                <button onClick={() => setShowHelpModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-5 h-5" /></button>
                <h2 className="text-3xl font-black text-white mb-8 tracking-tighter">Setup Instructions</h2>
                
                <div className="space-y-6 mb-10">
                    <div className="flex gap-5">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black shrink-0">1</div>
                       <p className="text-slate-400 text-sm leading-relaxed"><b className="text-white">API Key:</b> Get your free Gemini API key from <a href="https://aistudio.google.com/" target="_blank" className="text-indigo-400 underline">Google AI Studio</a>. Put it in your <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">.env</code> file.</p>
                    </div>
                    <div className="flex gap-5">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black shrink-0">2</div>
                       <p className="text-slate-400 text-sm leading-relaxed"><b className="text-white">Local Run:</b> Type <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">npm install</code> and then <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">npm run dev</code> in your terminal.</p>
                    </div>
                    <div className="flex gap-5">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black shrink-0">3</div>
                       <p className="text-slate-400 text-sm leading-relaxed"><b className="text-white">Hosting:</b> To make this live, upload the code to <b className="text-white">GitHub</b> and connect it to <b className="text-white">Vercel</b>.</p>
                    </div>
                </div>

                <button onClick={() => setShowHelpModal(false)} className="w-full py-5 bg-white text-black rounded-2xl font-black transition-all hover:bg-indigo-50">Got it, Let's Go!</button>
            </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in zoom-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative">
                <button onClick={() => setShowShareModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white bg-white/5 p-2 rounded-full"><X className="w-4 h-4" /></button>
                <h3 className="text-2xl font-black mb-8 text-white text-center">Share DubStudio</h3>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <input type="text" readOnly value={window.location.href} className="bg-transparent text-slate-400 text-xs flex-1 outline-none px-2 font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Copied!"); }} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => window.open(`https://wa.me/?text=Check this AI Dubbing tool: ${window.location.href}`)} className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] transition-all border border-white/5">
                          <MessageCircle className="w-8 h-8 text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest">WhatsApp</span>
                       </button>
                       <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=Dub any video with AI: ${window.location.href}`)} className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] transition-all border border-white/5">
                          <Share2 className="w-8 h-8 text-indigo-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Twitter</span>
                       </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <footer className="border-t border-white/5 bg-black/40 py-8 text-center">
          <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">{isOnline ? "Network Ready" : "Connection Lost"}</span>
              </div>
              <p className="text-[10px] text-slate-700 font-medium tracking-wide">© 2025 DubStudio AI. Built for professionals.</p>
          </div>
      </footer>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { Upload, Video, Languages, Mic2, Sparkles, Check, Download, Share2, X, Copy, MessageCircle, HelpCircle, Rocket, ShieldCheck, AudioLines, RefreshCcw, AlertCircle, PlayCircle, Settings2, Activity, Smartphone, Key, ExternalLink } from 'lucide-react';
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
  const [uiLanguage, setUiLanguage] = useState<UILanguageCode>('en'); // Changed default to English
  const [targetLanguage, setTargetLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); 
  const [dubbingState, setDubbingState] = useState<DubbingState>({ status: 'idle' });
  const [isDubEnabled, setIsDubEnabled] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const t = translations[uiLanguage] || translations['en'];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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
      const errorMsg = error.message?.toLowerCase();
      const isAuthError = errorMsg?.includes('key') || error.message?.includes('401') || error.message?.includes('403');
      setDubbingState({ 
        status: 'error', 
        errorMessage: isAuthError 
          ? "API Key missing or invalid. Check your Railway environment variables." 
          : error.message || "Synthesis failed." 
      });
    }
  };

  const hardRefresh = () => window.location.reload();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[600px] bg-indigo-600/10 blur-[150px] pointer-events-none -z-10 rounded-full" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-3xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5 group cursor-pointer" onClick={hardRefresh}>
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 transition duration-700"></div>
              <div className="relative bg-slate-900 border border-white/10 p-3 rounded-2xl shadow-2xl group-active:scale-95 transition-transform">
                <AudioLines className="w-6 h-6 text-indigo-400 group-hover:text-white transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white tracking-tighter leading-none flex items-baseline gap-2">
                DubStudio <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">PRO</span>
              </span>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">BY ASLAM SAHDRA</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {deferredPrompt && (
               <button onClick={handleInstallClick} className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-500/20 group">
                  <Smartphone className="w-4 h-4" />
                  <span>Install</span>
               </button>
             )}

             <div className="flex bg-white/5 rounded-xl p-1 border border-white/5 mr-2">
                <button onClick={() => setUiLanguage('en')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${uiLanguage === 'en' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
                <button onClick={() => setUiLanguage('pa')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${uiLanguage === 'pa' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>ਪੰ</button>
             </div>

             <button onClick={() => setShowHelpModal(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group">
                <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
             </button>
             <button onClick={() => setShowShareModal(true)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                <Share2 className="w-4 h-4 text-slate-400" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 lg:py-20">
        {!videoUrl ? (
          <div className="max-w-5xl mx-auto text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl">
              <Sparkles className="w-4 h-4" />
              Next-Gen Neural Dubbing
            </div>
            
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] text-white">
              Make Your Videos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-purple-400">Global Now.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
              High-quality dubbing using advanced AI. <br />
              In any language, with perfectly natural voice synthesis.
            </p>
            
            <div className="max-w-xl mx-auto pt-10">
              <label className="relative group block cursor-pointer">
                <div className="absolute -inset-4 bg-indigo-500/20 rounded-[4rem] blur-2xl group-hover:bg-indigo-500/30 transition duration-700"></div>
                <div className="relative flex flex-col items-center gap-8 p-16 md:p-32 bg-slate-900/60 backdrop-blur-3xl border-2 border-dashed border-slate-800 rounded-[4rem] group-hover:border-indigo-500/50 group-hover:bg-slate-900/80 transition-all duration-500">
                  <div className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                    <Upload className="w-10 h-10" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-black text-white">{t.uploadBtn}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em]">{t.maxSize}</p>
                  </div>
                </div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-8 space-y-8 shadow-2xl">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]" />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Studio Session</h2>
                    </div>
                    <button onClick={() => setVideoUrl(null)} className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors group">
                      <X className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
                    </button>
                 </div>

                 <div className="p-5 bg-black/40 rounded-3xl border border-white/5 flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                      <Video className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-white truncate">{videoFile?.name}</span>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Master Recording</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.targetLanguage}</span>
                    </div>
                    <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setTargetLanguage(lang)}
                          disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                          className={`flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all text-sm font-bold
                            ${targetLanguage.code === lang.code 
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-900/40' 
                              : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10 hover:text-slate-200'}`}
                        >
                          <span className="flex items-center gap-3">
                            <Languages className="w-4 h-4 opacity-50" />
                            {lang.name}
                          </span>
                          {targetLanguage.code === lang.code && <Check className="w-4 h-4 animate-in zoom-in" />}
                        </button>
                      ))}
                    </div>
                 </div>

                 <button
                    onClick={startDubbing}
                    disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete' || !isOnline}
                    className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-lg transition-all shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 overflow-hidden relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    {dubbingState.status === 'idle' || dubbingState.status === 'complete' ? (
                      <>
                        <PlayCircle className="w-6 h-6" />
                        {t.generateDub}
                      </>
                    ) : (
                      <span className="animate-pulse">Processing...</span>
                    )}
                 </button>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-10">
                <div className="relative rounded-[4rem] overflow-hidden bg-black shadow-[0_50px_100px_rgba(0,0,0,0.6)] border border-white/10 aspect-video group">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={isDubEnabled} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 rounded-[3rem] flex flex-wrap items-center justify-between gap-8 animate-in slide-in-from-top-12 duration-700">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-3xl flex items-center justify-center shadow-2xl">
                                <Check className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter">Master Ready</h3>
                                <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-2">HIFI AUDIO • {targetLanguage.name} SYNCHRONIZED</p>
                            </div>
                        </div>
                        <button 
                          onClick={async () => {
                              const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                              const url = URL.createObjectURL(merged);
                              const a = document.createElement('a'); a.href = url; a.download = 'dubbed_video_pro.webm'; a.click();
                          }} 
                          className="px-10 py-5 bg-white text-black hover:bg-slate-100 rounded-2xl text-sm font-black flex items-center gap-3 transition-all active:scale-95 shadow-xl"
                        >
                            <Download className="w-5 h-5" /> {t.saveVideo}
                        </button>
                    </div>
                )}

                {dubbingState.status === 'error' && (
                   <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem] flex flex-col items-center gap-6 animate-in shake duration-500 shadow-2xl">
                      <div className="w-16 h-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shrink-0">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-xl font-black text-rose-400 tracking-tighter uppercase">Synthesis Error</h4>
                        <p className="text-sm font-medium text-rose-200 mt-2 max-w-md mx-auto">{dubbingState.errorMessage}</p>
                        
                        <div className="mt-8 p-6 bg-black/40 border border-rose-500/20 rounded-2xl text-left">
                            <p className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                               <Settings2 className="w-4 h-4 text-indigo-400" /> Railway Help:
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                If builds are failing, ensure your Railway environment is configured correctly. Check the API_KEY variable.
                            </p>
                            <button onClick={() => setShowHelpModal(true)} className="mt-4 w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Setup Guide</button>
                        </div>
                        
                        <button onClick={hardRefresh} className="mt-6 px-10 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">Refresh App</button>
                      </div>
                   </div>
                )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-16 text-center border-t border-white/5 bg-slate-950/40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-10">
              <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-slate-900 border border-white/5 shadow-inner">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isOnline ? "Link Status: Online" : "Link Status: Offline"}</span>
                  </div>
              </div>
              <div className="space-y-4 opacity-50 group hover:opacity-100 transition-opacity duration-700 cursor-default">
                  <div className="flex items-center justify-center gap-3">
                    <Mic2 className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-black tracking-[0.4em] text-white uppercase">DubStudio AI Studio</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] text-indigo-400 font-black tracking-widest uppercase">Created by Aslam Sahdra</p>
                    <p className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">Premium Synthesis Suite • 2025 Edition</p>
                  </div>
              </div>
          </div>
      </footer>

      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[4rem] p-8 md:p-12 w-full max-w-2xl shadow-3xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                <button onClick={() => setShowHelpModal(false)} className="absolute top-10 right-10 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                
                <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">Railway Build Fix</h2>
                
                <div className="space-y-8 mb-12">
                    <div className="bg-indigo-500/10 p-8 rounded-[2.5rem] border border-indigo-500/20">
                       <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Deployment Guide</p>
                       <p className="text-slate-200 text-sm leading-relaxed font-bold mb-4">
                         Everything is optimized for Railway. Just ensure:
                       </p>
                       <ol className="text-slate-300 text-sm space-y-4 list-decimal pl-5">
                         <li>The project builds using <b>npm run build</b>.</li>
                         <li>The <b>API_KEY</b> is set in the Railway <b>Variables</b> tab.</li>
                         <li>Node.js version is 20 or higher.</li>
                       </ol>
                    </div>
                </div>
                
                <button onClick={() => setShowHelpModal(false)} className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm tracking-[0.2em] uppercase shadow-2xl hover:scale-[0.98] transition-all">Understood</button>
            </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in zoom-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[4rem] p-12 w-full max-w-md shadow-3xl text-center relative">
                <button onClick={() => setShowShareModal(false)} className="absolute top-10 right-10 text-slate-500 hover:text-white p-2"><X className="w-6 h-6" /></button>
                <div className="w-20 h-20 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-indigo-500/20">
                  <Rocket className="w-10 h-10 text-indigo-400" />
                </div>
                <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Invite Friends</h3>
                <p className="text-slate-500 text-sm mb-10 font-medium">Share the magic of AI Dubbing with other creators.</p>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => window.open(`https://wa.me/?text=Check out DubStudio AI: ${window.location.href}`)} className="p-8 bg-black/40 hover:bg-black/60 rounded-[2.5rem] border border-white/5 transition-all group">
                      <MessageCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp</span>
                   </button>
                   <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link Copied!"); }} className="p-8 bg-black/40 hover:bg-black/60 rounded-[2.5rem] border border-white/5 transition-all group">
                      <Copy className="w-10 h-10 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Copy Link</span>
                   </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

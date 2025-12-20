
import React, { useState, useEffect } from 'react';
import { Upload, Video, Languages, Mic2, Sparkles, Check, Download, Share2, X, Copy, MessageCircle, Info, Rocket, Github, HelpCircle, AlertCircle } from 'lucide-react';
import { DubbingState, Language, SUPPORTED_LANGUAGES, ScriptAnalysis, UILanguageCode } from './types';
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
  
  // Default UI to English
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
        alert(t.fileLargeError);
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
      const analysis = await geminiService.generateTranslatedScript(base64Video, videoFile.type, targetLanguage);
      setDubbingState({ status: 'dubbing' });
      const audioBase64 = await geminiService.generateDubbedAudio(analysis, targetLanguage);
      const audioBlob = pcmToWavBlob(audioBase64, 24000);
      setDubbedAudioUrl(URL.createObjectURL(audioBlob));
      setDubbingState({ status: 'complete' });
      setIsDubEnabled(true);
    } catch (error) {
      console.error(error);
      setDubbingState({ status: 'error', errorMessage: String(error) });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg">
              <Mic2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-tight leading-none">DubStudio AI</span>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Professional Video Dubbing</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
               onClick={() => setShowHelpModal(true)}
               className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all text-[11px] font-black uppercase tracking-tight border border-slate-700"
             >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Instructions</span>
             </button>

             <button onClick={() => setShowShareModal(true)} className="p-2 sm:px-3 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold border border-indigo-500 flex items-center gap-2 text-[11px] uppercase tracking-tight shadow-lg shadow-indigo-600/20">
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Share</span>
             </button>
          </div>
        </div>
      </header>

      {/* INSTRUCTIONS MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden">
                <button onClick={() => setShowHelpModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X className="w-5 h-5" /></button>
                
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400 border border-indigo-500/20">
                        <Info className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-white">How to use this app?</h2>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 flex gap-4 items-center">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold shrink-0">1</div>
                        <p className="text-sm text-slate-300"><b>Upload Video:</b> Choose any video file (under 100MB).</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 flex gap-4 items-center">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold shrink-0">2</div>
                        <p className="text-sm text-slate-300"><b>Select Language:</b> Choose the language you want for the dubbing.</p>
                    </div>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 flex gap-4 items-center">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold shrink-0">3</div>
                        <p className="text-sm text-slate-300"><b>Generate:</b> Click "Generate Dub" and wait for AI to process.</p>
                    </div>
                </div>

                <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 mb-6">
                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Rocket className="w-4 h-4" /> Professional Note
                    </h4>
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      To host this app on your own website, you must click the <b>"Deploy"</b> button located at the <b>very top-right of the IDE</b> (not inside this app preview).
                    </p>
                </div>

                <button 
                    onClick={() => setShowHelpModal(false)} 
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all"
                >
                    I understand!
                </button>
            </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in zoom-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative">
                <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X className="w-4 h-4" /></button>
                <h3 className="text-2xl font-black mb-6 text-white text-center">Share this Tool</h3>
                <div className="space-y-6">
                    <div className="flex items-center gap-2 bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <input type="text" readOnly value={window.location.href} className="bg-transparent text-slate-300 text-sm flex-1 outline-none px-2 font-mono" />
                        <button 
                          onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Copied!"); }} 
                          className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <button 
                          onClick={() => window.open(`https://wa.me/?text=Check out DubStudio AI: ${window.location.href}`, '_blank')}
                          className="flex flex-col items-center gap-3 p-5 bg-slate-800 hover:bg-slate-700 rounded-3xl transition-all border border-slate-700"
                       >
                          <MessageCircle className="w-8 h-8 text-emerald-500" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">WhatsApp</span>
                       </button>
                       <button 
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=Dub any video with AI: ${window.location.href}`, '_blank')}
                          className="flex flex-col items-center gap-3 p-5 bg-slate-800 hover:bg-slate-700 rounded-3xl transition-all border border-slate-700"
                       >
                          <Share2 className="w-8 h-8 text-indigo-400" />
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">Twitter</span>
                       </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-10 md:py-16">
        {!videoUrl ? (
          <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] shadow-inner">
              <Sparkles className="w-3 h-3" />
              Advanced AI Dubbing
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter leading-tight text-white">
              Translate Videos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Instantly with AI</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
              Upload your video and watch it come to life in over 50 languages with perfectly synchronized AI voices.
            </p>
            
            <div className="relative group max-w-lg mx-auto">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <label className="relative flex flex-col items-center gap-8 p-16 bg-slate-900 border-2 border-slate-800 border-dashed rounded-[2.5rem] cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all active:scale-[0.98]">
                <div className="p-6 bg-indigo-600 text-white rounded-2xl shadow-xl">
                  <Upload className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <span className="text-2xl font-black text-white block mb-2">{t.uploadBtn}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-4 py-1.5 rounded-full">{t.maxSize}</span>
                </div>
                <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-10 animate-in fade-in duration-700">
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 backdrop-blur-sm">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Video className="w-4 h-4 text-indigo-400" /> {t.sourceVideo}
                    </h2>
                    <button onClick={() => setVideoUrl(null)} className="text-[10px] font-black text-indigo-400 uppercase border-b border-indigo-400/30">Change</button>
                 </div>
                 <div className="text-sm font-bold text-white truncate bg-slate-800/80 p-4 rounded-2xl border border-slate-700">{videoFile?.name}</div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 backdrop-blur-sm">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-6">
                    <Languages className="w-4 h-4 text-indigo-400" /> {t.targetLanguage}
                </h2>
                <div className="grid gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setTargetLanguage(lang)}
                            disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete'}
                            className={`flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all
                                ${targetLanguage.code === lang.code ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800'}`}
                        >
                            <span className="font-bold">{lang.name}</span>
                            {targetLanguage.code === lang.code && <Check className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
              </div>

              <button
                onClick={startDubbing}
                disabled={dubbingState.status !== 'idle' && dubbingState.status !== 'complete' || !isOnline}
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-xl shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 border-b-4 border-indigo-800"
              >
                {!isOnline ? "Network Offline" : (dubbingState.status === 'idle' || dubbingState.status === 'complete') ? (
                   <>
                    <Sparkles className="w-6 h-6" />
                    {t.generateDub}
                   </>
                ) : "Processing..."}
              </button>
            </div>

            {/* Main Player Area */}
            <div className="lg:col-span-8 space-y-8">
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-slate-800 aspect-video ring-1 ring-white/5">
                    <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={isDubEnabled} />
                    <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
                </div>

                {dubbingState.status === 'complete' && (
                    <div className="bg-slate-900/80 border border-slate-700 p-8 rounded-[2rem] flex flex-wrap items-center justify-between gap-6 backdrop-blur-md animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-5">
                            <div className="bg-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-indigo-600/20"><Mic2 className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-black text-xl text-white">Dubbing Ready!</h3>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Target Language: {targetLanguage.name}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => dubbedAudioUrl && window.open(dubbedAudioUrl)} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-2xl text-xs font-black flex items-center gap-2 transition-all border border-slate-700">
                                <Download className="w-4 h-4" /> Download Audio
                            </button>
                            <button 
                              onClick={async () => {
                                  const merged = await exportMergedVideo(videoUrl!, dubbedAudioUrl!);
                                  const url = URL.createObjectURL(merged);
                                  const a = document.createElement('a'); a.href = url; a.download = 'dubbed_video.webm'; a.click();
                              }} 
                              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg border-b-4 border-green-800"
                            >
                                <Download className="w-5 h-5" /> Save Final Video
                            </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 text-center">
          <div className="flex items-center justify-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isOnline ? "Network Connected" : "Connection Lost"}</span>
          </div>
      </footer>
    </div>
  );
}

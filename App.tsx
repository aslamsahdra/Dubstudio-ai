
import React, { useState, useEffect } from 'react';
import { Upload, Mic2, Check, Download, X, History, Trash2, PlayCircle, AudioLines, Languages, Sparkles, AlertCircle, RefreshCcw } from 'lucide-react';
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
    const saved = localStorage.getItem('dub_v3_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveHistory = (item: HistoryItem) => {
    const updated = [item, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('dub_v3_history', JSON.stringify(updated));
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(i => i.id !== id);
    setHistory(updated);
    localStorage.setItem('dub_v3_history', JSON.stringify(updated));
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
      setDubbingState({ status: 'error', errorMessage: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans">
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-indigo-600 p-2 rounded-xl"><AudioLines className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-bold text-white tracking-tight">DubStudio <span className="text-indigo-400">PRO</span></span>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setShowHistory(!showHistory)} className={`p-2.5 rounded-xl border border-white/10 transition-all ${showHistory ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                <History className="w-5 h-5" />
             </button>
             <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setUiLanguage('pa')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${uiLanguage === 'pa' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>ਪੰ</button>
                <button onClick={() => setUiLanguage('en')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${uiLanguage === 'en' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>EN</button>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        {showHistory ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your Gallery</h2>
              <button onClick={() => setShowHistory(false)} className="text-xs font-bold uppercase tracking-widest text-slate-500">Close</button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.map(item => (
                <div key={item.id} className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden group">
                  <div className="aspect-video bg-black relative">
                    <video src={item.originalUrl} className="w-full h-full object-cover opacity-40" />
                    <button onClick={() => { setVideoUrl(item.originalUrl); setDubbedAudioUrl(item.dubbedUrl); setShowHistory(false); setDubbingState({status: 'complete'}); }} className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="min-w-0"><p className="text-sm font-bold text-white truncate">{item.fileName}</p><p className="text-[10px] text-indigo-400 font-bold uppercase">{item.language}</p></div>
                    <button onClick={() => deleteHistory(item.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !videoUrl ? (
          <div className="max-w-4xl mx-auto py-20 text-center space-y-12">
            <h1 className="text-6xl md:text-8xl font-black text-white leading-tight">Video <span className="text-indigo-400">Dubbing</span> <br/> Made Simple.</h1>
            <label className="block max-w-md mx-auto cursor-pointer">
              <div className="p-16 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/50 hover:border-indigo-500/50 transition-all">
                <Upload className="w-12 h-12 text-white mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white">{t.uploadBtn}</h3>
              </div>
              <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 border border-white/10 p-6 rounded-[2.5rem] space-y-6">
                <button onClick={() => setVideoUrl(null)} className="w-full py-3 bg-white/5 text-slate-400 rounded-xl text-xs font-bold uppercase">Change Video</button>
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-500">{t.targetLanguage}</span>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <button key={lang.code} onClick={() => setTargetLanguage(lang)} className={`w-full px-5 py-3.5 rounded-xl border-2 text-left text-sm font-bold transition-all ${targetLanguage.code === lang.code ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-transparent text-slate-500'}`}>{lang.name}</button>
                    ))}
                  </div>
                </div>
                <button onClick={startDubbing} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 disabled:opacity-50">{dubbingState.status === 'idle' || dubbingState.status === 'complete' ? t.generateDub : 'Processing...'}</button>
              </div>
            </div>
            <div className="lg:col-span-8 space-y-6">
              <div className="aspect-video bg-black rounded-[3rem] overflow-hidden relative border border-white/10">
                <VideoPlayer originalVideoUrl={videoUrl} dubbedAudioUrl={dubbedAudioUrl} isDubbedAudioEnabled={true} />
                <ProcessingOverlay state={dubbingState} uiLanguage={uiLanguage} />
              </div>
              {dubbingState.status === 'complete' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex items-center justify-between">
                  <div><h3 className="text-xl font-bold text-white">Dubbing Ready!</h3><p className="text-xs text-emerald-400 font-bold">Successfully generated {targetLanguage.name} version.</p></div>
                  <button onClick={async () => { const m = await exportMergedVideo(videoUrl!, dubbedAudioUrl!); const u = URL.createObjectURL(m); const a = document.createElement('a'); a.href = u; a.download = 'dub.webm'; a.click(); }} className="px-6 py-3 bg-white text-black rounded-xl font-bold text-xs uppercase"><Download className="w-4 h-4 inline mr-2" /> Download</button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

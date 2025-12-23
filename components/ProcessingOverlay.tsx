
import React from 'react';
import { Loader2, Mic, BrainCircuit, Sparkles, Check } from 'lucide-react';
import { DubbingState, UILanguageCode } from '../types';
import { translations } from '../translations';

interface ProcessingOverlayProps {
  state: DubbingState;
  uiLanguage?: UILanguageCode;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ state, uiLanguage = 'en' }) => {
  if (state.status === 'idle' || state.status === 'complete' || state.status === 'error') return null;

  const t = translations[uiLanguage] || translations['en'];

  const steps = [
    { 
      id: 'uploading', 
      label: t.step1 || 'Uploading...', 
      hint: uiLanguage === 'pa' ? 'ਇਸ ਵਿੱਚ ਥੋੜਾ ਸਮਾਂ ਲੱਗ ਸਕਦਾ ਹੈ...' : 'Sending data to cloud...',
      icon: <Loader2 className="animate-spin" /> 
    },
    { 
      id: 'analyzing', 
      label: t.step2 || 'Analyzing...', 
      hint: uiLanguage === 'pa' ? 'AI ਸੰਵਾਦ ਅਤੇ ਆਵਾਜ਼ਾਂ ਦੀ ਪਛਾਣ ਕਰ ਰਿਹਾ ਹੈ...' : 'AI is watching and translating...',
      icon: <BrainCircuit className="animate-pulse" /> 
    },
    { 
      id: 'dubbing', 
      label: t.step3 || 'Dubbing...', 
      hint: uiLanguage === 'pa' ? 'ਕੁਦਰਤੀ ਆਵਾਜ਼ਾਂ ਦਾ ਨਿਰਮਾਣ ਜਾਰੀ ਹੈ...' : 'Synthesizing natural human voices...',
      icon: <Mic className="animate-bounce" /> 
    },
    { 
      id: 'exporting', 
      label: t.step4 || 'Exporting...', 
      hint: uiLanguage === 'pa' ? 'ਬੱਸ ਥੋੜਾ ਹੋਰ ਇੰਤਜ਼ਾਰ ਕਰੋ...' : 'Finalizing synchronization...',
      icon: <Sparkles className="animate-pulse" /> 
    },
  ];

  return (
    <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-8 rounded-[4rem] transition-all duration-700">
      <div className="w-full max-w-md space-y-12">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 animate-pulse-ring rounded-full opacity-20"></div>
            <div className="relative bg-indigo-500/10 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl">
              <Sparkles className="w-12 h-12 text-indigo-400 animate-pulse" />
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase">
              {uiLanguage === 'pa' ? 'ਪ੍ਰੋਸੈਸਿੰਗ ਜਾਰੀ ਹੈ' : 'Processing Master'}
            </h3>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">DubStudio AI synthesis engine</p>
          </div>
        </div>

        <div className="space-y-6 bg-slate-900/40 p-10 rounded-[3rem] border border-white/5">
          {steps.map((step, index) => {
            if (step.id === 'exporting' && state.status !== 'exporting') return null;

            const currentIndex = steps.findIndex(s => s.id === state.status);
            const isActive = state.status === step.id;
            const isPast = currentIndex > index;
            
            return (
              <div key={step.id} className={`flex items-start gap-6 transition-all duration-500 ${isActive || isPast ? 'opacity-100' : 'opacity-20'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all
                  ${isActive ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 
                    isPast ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 
                    'border-slate-800 text-slate-700'}`}>
                  {isPast ? <Check className="w-6 h-6" /> : step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <p className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-white' : isPast ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-indigo-400/80 font-bold mt-2 animate-in fade-in slide-in-from-left-2 duration-700">
                      {step.hint}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
              {uiLanguage === 'pa' ? 'ਕਿਰਪਾ ਕਰਕੇ ਸਕ੍ਰੀਨ ਬੰਦ ਨਾ ਕਰੋ' : 'Please keep the screen active'}
            </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;

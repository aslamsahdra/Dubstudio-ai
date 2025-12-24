
import React from 'react';
import { Settings, Cpu, Mic, Sparkles, Check, Zap, Video, Box, Layers, Database } from 'lucide-react';
import { DubbingState, UILanguageCode } from '../types';
import { translations } from '../translations';

interface ProcessingOverlayProps {
  state: DubbingState;
  uiLanguage?: UILanguageCode;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ state, uiLanguage = 'pa' }) => {
  if (state.status === 'idle' || state.status === 'complete' || state.status === 'error') return null;

  const t = translations[uiLanguage] || translations['en'];

  const steps = [
    { id: 'uploading', icon: <Video />, label: t.step1 },
    { id: 'analyzing', icon: <Database />, label: t.step2 },
    { id: 'dubbing', icon: <Mic />, label: t.step3 },
    { id: 'exporting', icon: <Sparkles />, label: t.step4 },
  ];

  const currentIndex = steps.findIndex(s => s.id === state.status);

  return (
    <div className="absolute inset-0 bg-[#020617]/98 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-8 overflow-hidden select-none">
      
      {/* Machine Concept Container */}
      <div className="w-full max-w-3xl space-y-16 relative">
        
        {/* The "Belna" Machine Visualizer */}
        <div className="relative p-1 bg-white/5 rounded-[4rem] border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between p-12 bg-black/40 rounded-[3.8rem] relative overflow-hidden h-64">
            
            {/* Input Side (Raw Feed) */}
            <div className="flex flex-col items-center gap-4 z-10 shrink-0">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all duration-700 ${currentIndex >= 0 ? 'bg-indigo-600 border-indigo-400 text-white shadow-3xl shadow-indigo-500/20' : 'bg-slate-900 border-white/5 text-slate-700'}`}>
                <Box className={`w-10 h-10 ${currentIndex === 0 ? 'animate-bounce' : ''}`} />
              </div>
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.3em]">Source Data</span>
            </div>

            {/* The Processing Gears (Ganna Pelna Style Rollers) */}
            <div className="flex-1 flex items-center justify-center gap-12 relative overflow-hidden">
               {/* Moving Stream Line */}
               <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
               
               <div className="flex flex-col gap-3 animate-spin duration-[5000ms]">
                  <Settings className="w-16 h-16 text-indigo-500 opacity-60" />
               </div>
               <div className="flex flex-col gap-3 animate-spin-reverse duration-[7000ms]">
                  <Cpu className="w-24 h-24 text-purple-600 opacity-80" />
               </div>
               <div className="flex flex-col gap-3 animate-spin duration-[4000ms]">
                  <Layers className="w-20 h-20 text-emerald-500 opacity-50" />
               </div>

               {/* Digital "Particles" flying through */}
               <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                  <div className="flex gap-12 animate-stream-logic">
                     {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-indigo-400/30 rounded-full blur-sm" />
                     ))}
                  </div>
               </div>
            </div>

            {/* Output Side (Neural Export) */}
            <div className="flex flex-col items-center gap-4 z-10 shrink-0">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-2 transition-all duration-700 ${state.status === 'exporting' ? 'bg-emerald-500 border-emerald-400 text-white animate-pulse shadow-3xl shadow-emerald-500/20' : 'bg-slate-900 border-white/5 text-slate-700'}`}>
                <Sparkles className="w-10 h-10" />
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.3em]">Neural Master</span>
            </div>

            {/* Header Branding on Machine */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
               <span className="text-[7px] font-black text-slate-600 uppercase tracking-[1em] mb-1">Neural Synthesis Unit</span>
               <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          </div>
        </div>

        {/* 4-Step Production Status */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const isActive = state.status === step.id;
            const isPast = currentIndex > index;
            
            return (
              <div key={step.id} className="relative group">
                <div className={`flex flex-col items-center gap-4 p-6 rounded-[2.5rem] border-2 transition-all duration-700 ${isActive ? 'bg-indigo-600 border-indigo-400 shadow-3xl shadow-indigo-500/20 scale-105' : isPast ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-white/5 border-transparent opacity-30'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white text-indigo-600' : isPast ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}>
                    {/* Fix: cast step.icon as React.ReactElement<any> to allow the className prop during cloning */}
                    {isPast ? <Check className="w-6 h-6" /> : React.cloneElement(step.icon as React.ReactElement<any>, { className: isActive ? 'animate-pulse w-6 h-6' : 'w-6 h-6' })}
                  </div>
                  <div className="text-center">
                    <h4 className={`text-[8px] font-black uppercase tracking-[0.2em] leading-tight ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</h4>
                  </div>
                </div>
                {index < steps.length - 1 && (
                   <div className="hidden sm:block absolute top-1/2 -right-4 -translate-y-1/2 text-slate-800">
                      <Zap className="w-4 h-4" />
                   </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3">
           <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-[1px] bg-slate-800" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Aslam Sahdra Production Studio</p>
              <div className="w-12 h-[1px] bg-slate-800" />
           </div>
        </div>
      </div>

      <style>{`
        @keyframes stream-logic {
          from { transform: translateX(-150%); }
          to { transform: translateX(150%); }
        }
        .animate-stream-logic {
          animation: stream-logic 3s linear infinite;
        }
        .animate-spin-reverse {
          animation: spin 6s linear infinite reverse;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProcessingOverlay;


import React from 'react';
import { Loader2, Wand2, Mic, User, Download, Users } from 'lucide-react';
import { DubbingState, UILanguageCode } from '../types';
import { translations } from '../translations';

interface ProcessingOverlayProps {
  state: DubbingState;
  uiLanguage?: UILanguageCode;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ state, uiLanguage = 'en' }) => {
  if (state.status === 'idle' || state.status === 'complete' || state.status === 'error') return null;

  const t = translations[uiLanguage];

  const steps = [
    { id: 'uploading', label: t.step1, icon: <Loader2 className="animate-spin" /> },
    { id: 'analyzing', label: t.step2, icon: <Users className="animate-pulse" /> },
    { id: 'dubbing', label: t.step3, icon: <Mic className="animate-bounce" /> },
    { id: 'exporting', label: t.step4, icon: <Download className="animate-bounce" /> },
  ];

  return (
    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 rounded-xl transition-all duration-500">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-500/10 p-4 rounded-full">
            <Wand2 className="w-10 h-10 text-indigo-400" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-center text-white mb-8">{t.readyMessage}</h3>

        <div className="space-y-6">
          {steps.map((step, index) => {
            if (step.id === 'exporting' && state.status !== 'exporting') return null;

            const isActive = state.status === step.id;
            const isPast = steps.findIndex(s => s.id === state.status) > index;
            
            return (
              <div key={step.id} className={`flex items-center gap-4 ${isActive || isPast ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 
                  ${isActive ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 
                    isPast ? 'border-green-500 text-green-400 bg-green-500/10' : 
                    'border-slate-600 text-slate-500'}`}>
                  {isPast ? <div className="w-3 h-3 bg-green-500 rounded-full" /> : step.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;

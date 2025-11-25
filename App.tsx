import React, { useState } from 'react';
import { ReferenceItem, AppStep, DesignState } from './types';
import ReferenceStep from './components/ReferenceStep';
import DesignStep from './components/DesignStep';
import ResultStep from './components/ResultStep';
import { generateStoreFrontDesign } from './services/geminiService';
import { Store } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.REFERENCES);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [targetImagePreview, setTargetImagePreview] = useState<string | null>(null);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDesignGeneration = async () => {
    if (!targetImage || !maskBase64) return;
    
    setStep(AppStep.RESULT);
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateStoreFrontDesign(
        targetImage,
        maskBase64,
        references,
        userPrompt
      );
      setResultUrl(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetApp = () => {
    setStep(AppStep.REFERENCES);
    setReferences([]);
    setTargetImage(null);
    setTargetImagePreview(null);
    setMaskBase64(null);
    setUserPrompt("");
    setResultUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
                <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">StoreFront AI</h1>
          </div>
          
          <nav className="hidden sm:flex items-center gap-8">
            <StepIndicator current={step} step={AppStep.REFERENCES} label="1. Style" />
            <div className="w-8 h-px bg-slate-300"></div>
            <StepIndicator current={step} step={AppStep.WORKSPACE} label="2. Edit" />
            <div className="w-8 h-px bg-slate-300"></div>
            <StepIndicator current={step} step={AppStep.RESULT} label="3. Result" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {step === AppStep.REFERENCES && (
            <ReferenceStep 
              references={references} 
              setReferences={setReferences} 
              onNext={() => setStep(AppStep.WORKSPACE)} 
            />
          )}

          {step === AppStep.WORKSPACE && (
            <DesignStep 
              targetImage={targetImage}
              targetImagePreview={targetImagePreview}
              setTargetImage={(f, p) => { setTargetImage(f); setTargetImagePreview(p); }}
              setMaskBase64={setMaskBase64}
              userPrompt={userPrompt}
              setUserPrompt={setUserPrompt}
              onBack={() => setStep(AppStep.REFERENCES)}
              onNext={handleDesignGeneration}
            />
          )}

          {step === AppStep.RESULT && (
            <ResultStep 
              isLoading={isGenerating}
              resultUrl={resultUrl}
              error={error}
              onReset={resetApp}
              onBack={() => setStep(AppStep.WORKSPACE)}
            />
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} StoreFront AI. Powered by Google Gemini.
        </div>
      </footer>
    </div>
  );
};

// Helper for Header
const StepIndicator: React.FC<{ current: AppStep; step: AppStep; label: string }> = ({ current, step, label }) => {
  const isActive = current === step;
  const isCompleted = current > step;
  
  return (
    <div className={`flex items-center gap-2 ${isActive ? 'text-indigo-600 font-semibold' : isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
        isActive ? 'border-indigo-600 bg-indigo-50' : 
        isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 
        'border-slate-300'
      }`}>
        {isCompleted ? '✓' : step}
      </div>
      <span>{label}</span>
    </div>
  );
}

export default App;
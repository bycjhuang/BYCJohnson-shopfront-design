import React from 'react';
import { Button, Card, Spinner } from './ui';
import { Download, RefreshCw, ChevronLeft } from 'lucide-react';

interface ResultStepProps {
  isLoading: boolean;
  resultUrl: string | null;
  error: string | null;
  onReset: () => void;
  onBack: () => void;
}

const ResultStep: React.FC<ResultStepProps> = ({ isLoading, resultUrl, error, onReset, onBack }) => {
  
  const handleDownload = () => {
    if (resultUrl) {
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = 'storefront-design.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 animate-fade-in">
        <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-slate-900">Designing your storefront...</h3>
            <p className="text-slate-500 max-w-md mx-auto">
                Our AI architects are analyzing your references and applying the new design to the masked area. This usually takes about 10-20 seconds.
            </p>
        </div>
      </div>
    );
  }

  if (error) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 animate-fade-in">
             <div className="bg-red-50 p-6 rounded-xl border border-red-100 max-w-lg text-center">
                 <h3 className="text-red-800 font-bold text-lg mb-2">Something went wrong</h3>
                 <p className="text-red-600 mb-6">{error}</p>
                 <Button onClick={onBack}>Try Again</Button>
             </div>
        </div>
     )
  }

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Your Design Concept</h2>
                <p className="text-slate-600">Generated based on your references and context.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Adjust
                </Button>
                <Button onClick={onReset} variant="secondary">
                    <RefreshCw className="w-4 h-4 mr-2" /> New Project
                </Button>
            </div>
       </div>

       <Card className="p-2 bg-slate-900 border-slate-800">
            <div className="relative rounded-lg overflow-hidden group">
                 {resultUrl && <img src={resultUrl} alt="Generated Design" className="w-full h-auto" />}
                 
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                     <Button onClick={handleDownload} className="shadow-lg">
                        <Download className="w-4 h-4 mr-2" /> Download High Res
                     </Button>
                 </div>
            </div>
       </Card>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
           <div className="bg-blue-50 p-4 rounded-lg">
               <h4 className="font-semibold text-blue-900 mb-1">Lighting</h4>
               <p className="text-sm text-blue-700">Check how the AI handled the light sources. Does the signage stand out?</p>
           </div>
           <div className="bg-purple-50 p-4 rounded-lg">
               <h4 className="font-semibold text-purple-900 mb-1">Materials</h4>
               <p className="text-sm text-purple-700">Verify if the textures match your reference images provided in Step 1.</p>
           </div>
           <div className="bg-emerald-50 p-4 rounded-lg">
               <h4 className="font-semibold text-emerald-900 mb-1">Integration</h4>
               <p className="text-sm text-emerald-700">Notice how the design blends with the existing perspective of the building.</p>
           </div>
       </div>
    </div>
  );
};

export default ResultStep;
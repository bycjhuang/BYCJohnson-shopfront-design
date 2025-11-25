import React, { useRef } from 'react';
import { ReferenceItem } from '../types';
import { generateId } from '../utils';
import { Button, Card, Label, TextArea } from './ui';
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';

interface ReferenceStepProps {
  references: ReferenceItem[];
  setReferences: React.Dispatch<React.SetStateAction<ReferenceItem[]>>;
  onNext: () => void;
}

const ReferenceStep: React.FC<ReferenceStepProps> = ({ references, setReferences, onNext }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newRefs: ReferenceItem[] = Array.from(e.target.files).map((file: File) => ({
        id: generateId(),
        file,
        previewUrl: URL.createObjectURL(file),
        description: ''
      }));
      setReferences(prev => [...prev, ...newRefs]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDescriptionChange = (id: string, text: string) => {
    setReferences(prev => prev.map(ref => ref.id === id ? { ...ref, description: text } : ref));
  };

  const handleRemove = (id: string) => {
    setReferences(prev => prev.filter(ref => ref.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Step 1: Style References</h2>
        <p className="text-slate-600">Upload images of styles, materials, or details you like. Add a note to each to explain what to copy.</p>
      </div>

      {/* Upload Area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-white"
      >
        <div className="bg-indigo-100 p-3 rounded-full mb-4">
          <Upload className="w-6 h-6 text-indigo-600" />
        </div>
        <p className="text-indigo-900 font-medium">Click to upload reference images</p>
        <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG</p>
        <input 
          ref={fileInputRef}
          type="file" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileUpload} 
        />
      </div>

      {/* List of References */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {references.map((ref) => (
          <Card key={ref.id} className="flex flex-col md:flex-row p-4 gap-4">
            <div className="w-full md:w-32 h-32 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative group">
              <img src={ref.previewUrl} alt="Reference" className="w-full h-full object-cover" />
              <button 
                onClick={(e) => { e.stopPropagation(); handleRemove(ref.id); }}
                className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor={`desc-${ref.id}`}>What should we take from this image?</Label>
              <TextArea 
                id={`desc-${ref.id}`}
                placeholder="e.g., Use this wooden slat texture for the sign..."
                value={ref.description}
                onChange={(e) => handleDescriptionChange(ref.id, e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </Card>
        ))}
        {references.length === 0 && (
          <div className="col-span-1 md:col-span-2 text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
            No references uploaded yet.
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={references.length === 0}>
          Next Step
        </Button>
      </div>
    </div>
  );
};

export default ReferenceStep;
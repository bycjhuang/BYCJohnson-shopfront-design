import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Card, Label, TextArea, Input } from './ui';
import { Upload, Eraser, PenTool, Undo } from 'lucide-react';

interface DesignStepProps {
  targetImage: File | null;
  targetImagePreview: string | null;
  setTargetImage: (file: File | null, preview: string | null) => void;
  setMaskBase64: (base64: string | null) => void;
  userPrompt: string;
  setUserPrompt: (prompt: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const DesignStep: React.FC<DesignStepProps> = ({
  targetImage,
  targetImagePreview,
  setTargetImage,
  setMaskBase64,
  userPrompt,
  setUserPrompt,
  onNext,
  onBack
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // We need to keep track of drawing history for undo
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize canvas when image is loaded
  useEffect(() => {
    if (targetImagePreview && canvasRef.current && containerRef.current) {
      const img = new Image();
      img.src = targetImagePreview;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Match canvas dimensions to the rendered image size
        // We use the natural size for high quality masking processing, then scale via CSS
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill with transparent initially (or black if we want the mask logic to be different)
          // For Gemini API standard masking usually:
          // We will send the mask as a separate image.
          // Let's assume clear canvas = no change, drawing = change.
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Save initial blank state
          if (history.length === 0) {
             setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
          }
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetImagePreview]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTargetImage(file, URL.createObjectURL(file));
      setHistory([]); // Reset history for new image
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Save current state before new stroke
    setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
    
    const { x, y } = getCoordinates(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Visual style for user
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    // We draw with a semi-transparent color for visual feedback
    // But for the mask export, we'll need to process this.
    // Actually, simple strategy: Draw opaque color. 
    // When exporting, we create a temporary canvas where this color is white and everything else is black.
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; 
    ctx.globalCompositeOperation = 'source-over';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvasRef.current);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const handleUndo = () => {
    if (history.length > 0 && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const previousState = history[history.length - 1];
        ctx.putImageData(previousState, 0, 0);
        setHistory(prev => prev.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
             setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)]);
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }
  }

  const prepareAndSubmit = () => {
    if (!canvasRef.current || !targetImagePreview) return;
    
    // Generate the binary mask
    // 1. Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tCtx = tempCanvas.getContext('2d');
    
    if (!tCtx) return;

    // 2. Fill background with BLACK (no change area)
    tCtx.fillStyle = '#000000';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // 3. Draw the User's canvas onto this. 
    // Since user drew with rgba(255, 0, 0, 0.5), we need to check pixels.
    // Or simpler: We replicate the user's drawing path? No, path is lost.
    // We scan the user canvas. Wherever alpha > 0, we paint WHITE on temp canvas.
    const userImgData = canvasRef.current.getContext('2d')?.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (userImgData) {
        const targetData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = userImgData.data;
        const tData = targetData.data;

        for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            // If the user drew here (alpha > 0)
            if (alpha > 0) {
                tData[i] = 255;     // R
                tData[i + 1] = 255; // G
                tData[i + 2] = 255; // B
                tData[i + 3] = 255; // Alpha
            }
        }
        tCtx.putImageData(targetData, 0, 0);
    }

    const maskDataUrl = tempCanvas.toDataURL('image/png');
    setMaskBase64(maskDataUrl);
    onNext();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Step 2: Context & Requirements</h2>
        <p className="text-slate-600">Upload your current shop photo. Use the brush to mark the area you want to renovate.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Canvas/Image Area */}
        <div className="lg:col-span-2 space-y-4">
            {!targetImagePreview ? (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl h-96 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-white"
                >
                    <div className="bg-indigo-100 p-3 rounded-full mb-4">
                        <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-indigo-900 font-medium">Upload Current Storefront Photo</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-2">
                             <PenTool className="w-4 h-4 text-slate-500" />
                             <Label className="mb-0 text-xs">Brush Size</Label>
                             <input 
                                type="range" 
                                min="10" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-24 accent-indigo-600"
                             />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <Button variant="outline" onClick={handleUndo} className="px-3 py-1 text-sm flex items-center gap-2" title="Undo">
                            <Undo className="w-3 h-3" /> Undo
                        </Button>
                        <Button variant="outline" onClick={handleClear} className="px-3 py-1 text-sm flex items-center gap-2 text-red-600 hover:text-red-700" title="Clear Mask">
                            <Eraser className="w-3 h-3" /> Clear
                        </Button>
                        <div className="flex-1 text-right text-xs text-slate-400">
                             Paint over the area to change
                        </div>
                    </div>

                    {/* Editor */}
                    <div 
                        ref={containerRef}
                        className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner group"
                        style={{ minHeight: '400px' }}
                    >
                        <img 
                            src={targetImagePreview} 
                            alt="Target" 
                            className="w-full h-auto block select-none pointer-events-none" 
                        />
                        <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
                        />
                        {/* Overlay helper text if canvas is empty? Maybe distracting. */}
                    </div>
                    <div className="text-center">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-sm">
                            Change Photo
                        </Button>
                    </div>
                </div>
            )}
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
            />
        </div>

        {/* Right Column: Prompt Inputs */}
        <div className="space-y-6">
            <Card className="p-6 h-full flex flex-col">
                <div className="flex-1 space-y-4">
                    <div>
                        <Label htmlFor="main-prompt">Design Instructions</Label>
                        <p className="text-xs text-slate-500 mb-2">Describe the overall vibe. e.g. "Modern minimalist coffee shop with warm lighting and wooden accents."</p>
                        <TextArea 
                            id="main-prompt"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            rows={8}
                            placeholder="I want a modern facade. Change the sign to say 'Bean & Brew'. Use dark grey metal cladding..."
                        />
                    </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
                    <Button 
                        onClick={prepareAndSubmit} 
                        disabled={!targetImage || !userPrompt.trim()}
                        className="w-full py-3 text-lg shadow-lg shadow-indigo-200"
                    >
                        Generate Design
                    </Button>
                    <Button variant="outline" onClick={onBack} className="w-full">
                        Back to References
                    </Button>
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default DesignStep;
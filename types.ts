export interface ReferenceItem {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
}

export interface DesignState {
  references: ReferenceItem[];
  targetImage: File | null;
  targetImagePreview: string | null;
  maskImageBase64: string | null;
  userPrompt: string;
  isGenerating: boolean;
  resultImageUrl: string | null;
  error: string | null;
}

export enum AppStep {
  REFERENCES = 1,
  WORKSPACE = 2,
  RESULT = 3,
}
import { GoogleGenAI } from "@google/genai";
import { ReferenceItem } from "../types";
import { fileToBase64 } from "../utils";

const MODEL_NAME = 'gemini-2.5-flash-image';

// Helper to determine the closest supported aspect ratio
const getBestAspectRatio = (width: number, height: number): string => {
  const ratio = width / height;
  const supportedRatios = [
    { str: "1:1", val: 1.0 },
    { str: "4:3", val: 4/3 },
    { str: "3:4", val: 3/4 },
    { str: "16:9", val: 16/9 },
    { str: "9:16", val: 9/16 },
  ];

  // Find closest
  return supportedRatios.reduce((prev, curr) => {
    return (Math.abs(curr.val - ratio) < Math.abs(prev.val - ratio) ? curr : prev);
  }).str;
};

// Helper to get image dimensions from base64
const getImageDimensions = (base64Data: string, mimeType: string): Promise<{width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = (e) => reject(e);
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
};

export const generateStoreFrontDesign = async (
  targetFile: File,
  maskBase64: string, // This is the raw base64 data (no prefix ideally, or stripped inside)
  references: ReferenceItem[],
  prompt: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing in environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Convert Target to Base64
    const targetBase64 = await fileToBase64(targetFile);
    
    // 2. Determine Aspect Ratio
    let aspectRatio = "1:1";
    try {
      const dims = await getImageDimensions(targetBase64, targetFile.type);
      aspectRatio = getBestAspectRatio(dims.width, dims.height);
      console.log(`Detected dimensions: ${dims.width}x${dims.height}. Using Aspect Ratio: ${aspectRatio}`);
    } catch (e) {
      console.warn("Could not determine image dimensions, defaulting to 1:1", e);
    }

    // 3. Prepare parts
    const parts: any[] = [];

    // STRICT System instruction for inpainting/renovation
    let promptText = `You are an expert architectural designer specializing in realistic retail storefront renovations.

TASK:
Renovate the storefront shown in the "TARGET IMAGE" based on the "USER REQUEST" and "REFERENCE IMAGES".
You must perform a photorealistic INPAINTING operation constrained by the "MASK IMAGE".

INPUT IMAGES LEGEND:
1. TARGET IMAGE: The first image provided. The original photo of the shop.
2. MASK IMAGE: The second image provided. A binary guide (White = Renovate, Black = Protect).
3. REFERENCE IMAGES: All subsequent images. Use these for materials, colors, and style.

USER REQUEST: "${prompt}"

STRICT CONSTRAINTS:
1. PERSPECTIVE LOCK: You must absolutely maintain the original camera angle, lens distortion, and vanishing points of the TARGET IMAGE. The result must perfectly overlay the original.
2. MASK ADHERENCE: 
   - BLACK AREAS: Do NOT modify any pixel where the mask is black. The street, sidewalk, neighboring buildings, and upper floors must remain identical to the TARGET IMAGE.
   - WHITE AREAS: Only generate new design content within the white areas of the mask.
3. REALISM: The lighting (sun direction, shadows, ambient occlusion) of the new design must match the original photo perfectly.
4. STYLE TRANSFER: Apply the architectural details and materials from the REFERENCE IMAGES to the renovated section.

REFERENCE DESCRIPTIONS:
`;

    references.forEach((ref, index) => {
      promptText += `\n- Ref ${index + 1}: ${ref.description}`;
    });

    parts.push({ text: promptText });

    // Add Target Image (Index 0 for the model)
    parts.push({
      inlineData: {
        mimeType: targetFile.type,
        data: targetBase64,
      },
    });

    // Add Mask Image (Index 1 for the model)
    // The mask comes from canvas.toDataURL(), so it has the prefix "data:image/png;base64,"
    const cleanMaskBase64 = maskBase64.replace(/^data:image\/\w+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanMaskBase64,
      },
    });

    // Add References (Index 2+ for the model)
    for (const ref of references) {
      const refBase64 = await fileToBase64(ref.file);
      parts.push({
        inlineData: {
          mimeType: ref.file.type,
          data: refBase64,
        },
      });
    }

    // Call API
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
            aspectRatio: aspectRatio as any, 
        }
      }
    });

    // Extract image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const contentParts = candidates[0].content.parts;
      for (const part of contentParts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image was generated. The model might have returned only text.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate design.");
  }
};
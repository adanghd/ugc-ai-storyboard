import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardFrame, StoryboardRequest, AspectRatio } from '../types';
import { CAMERA_ANGLES } from '../constants';

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

const textModel = 'gemini-2.5-pro';
const imageModel = 'gemini-2.5-flash-image';

// --- NEW FUNCTION: Regenerate only the text (Hook & Script) ---
// FIX: Removed apiKey parameter and switched to process.env.API_KEY.
export const regenerateStoryboardText = async (request: StoryboardRequest) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const textGenPrompt = createTextGenerationPrompt(request);
    const responseSchema = createResponseSchema(request.musicStyle !== null);

    const planResponse = await ai.models.generateContent({
        model: textModel,
        contents: textGenPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
    });

    const plan = JSON.parse(planResponse.text);
    return {
        hook: plan.hook,
        fullScript: plan.fullScript,
        musicPrompt: plan.musicPrompt || null,
    };
}


// --- NEW FUNCTION: Regenerate a single frame's image ---
// FIX: Removed apiKey parameter and switched to process.env.API_KEY.
export const regenerateFrameImage = async (
    frameData: { sceneDescription: string, cameraAngle: string },
    baseRequest: StoryboardRequest
) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const userImages = getUserImageParts(baseRequest);

    // FIX: Pass the entire request object to provide more context for image generation.
    const imagePrompt = createImageGenerationPrompt(frameData, baseRequest);

    const imageParts = [...userImages, { text: imagePrompt }];

    const imageResult = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: imageParts },
    });

    const imagePart = imageResult.candidates?.[0]?.content?.parts.find(p => 'inlineData' in p && p.inlineData.mimeType.startsWith('image/'));

    if (imagePart && 'inlineData' in imagePart) {
      const base64Image = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType;
      return `data:${mimeType};base64,${base64Image}`;
    }
    
    throw new Error('Gagal membuat gambar baru.');
}


// FIX: Removed apiKey parameter and switched to process.env.API_KEY.
export const generateFullStoryboard = async (request: StoryboardRequest, onProgress: (message: string, currentStep: number, totalSteps: number) => void) => {
  const totalSteps = 1 + request.frameCount; // 1 for planning, N for frames
  
  onProgress('Menganalisis produk dan membuat konsep cerita...', 1, totalSteps);
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Step 1: Generate the storyboard plan (textual part)
  const storyboardPlanPrompt = createTextGenerationPrompt(request);
  const responseSchema = createResponseSchema(request.musicStyle !== null);

  const planResponse = await ai.models.generateContent({
    model: textModel,
    contents: storyboardPlanPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const plan = JSON.parse(planResponse.text);

  // Step 2: Generate images for each frame
  const imageFrames: StoryboardFrame[] = [];
  const userImages = getUserImageParts(request);

  for (let i = 0; i < plan.frames.length; i++) {
    const currentStep = i + 2;
    onProgress(`Membuat gambar untuk frame ${i + 1} dari ${plan.frames.length}...`, currentStep, totalSteps);
    const framePlan = plan.frames[i];
    
    // FIX: Pass the entire request object to provide more context for image generation.
    const imagePrompt = createImageGenerationPrompt(framePlan, request);
    
    const imageParts = [
      ...userImages,
      { text: imagePrompt },
    ];

    const imageResult = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: imageParts },
    });
    
    const imagePart = imageResult.candidates?.[0]?.content?.parts.find(p => 'inlineData' in p && p.inlineData.mimeType.startsWith('image/'));
    if (imagePart && 'inlineData' in imagePart) {
      const base64Image = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType;
      imageFrames.push({
        id: i + 1,
        imageUrl: `data:${mimeType};base64,${base64Image}`,
        script: framePlan.script,
        cameraAngle: framePlan.cameraAngle,
        sceneDescription: framePlan.sceneDescription, // Pass description for regeneration
      });
    } else {
        console.warn(`Image generation failed for frame ${i + 1}. Using placeholder.`);
        imageFrames.push({
            id: i + 1,
            imageUrl: `https://picsum.photos/seed/${Math.random()}/1080/1920`,
            script: framePlan.script,
            cameraAngle: framePlan.cameraAngle,
            sceneDescription: framePlan.sceneDescription,
        });
    }
  }

  onProgress('Storyboard selesai dibuat!', totalSteps, totalSteps);
  return {
    hook: plan.hook,
    fullScript: plan.fullScript,
    frames: imageFrames,
    musicPrompt: plan.musicPrompt || null,
  };
};

// --- Helper Functions to avoid code repetition ---

const getUserImageParts = (request: StoryboardRequest) => {
    const userImages: any[] = [];
    if (request.uploadMode === 'combined' && request.combinedImage) {
        userImages.push(fileToGenerativePart(request.combinedImage.split(',')[1], request.combinedImage.split(';')[0].split(':')[1]));
    } else {
        if (request.modelImage) {
            userImages.push(fileToGenerativePart(request.modelImage.split(',')[1], request.modelImage.split(';')[0].split(':')[1]));
        }
        if (request.productImage) {
            userImages.push(fileToGenerativePart(request.productImage.split(',')[1], request.productImage.split(';')[0].split(':')[1]));
        }
    }
    return userImages;
}

const createTextGenerationPrompt = (request: StoryboardRequest) => `
    **PERSONA:** Act as an expert "UGC Ad Director". Your goal is to create a logical, persuasive, and visually compelling storyboard that is ready for production. Your logic must be flawless.

    **PROJECT BRIEF:**
    - Product URL: ${request.productUrl} (Analyze this for benefits, features, and reviews)
    - Target Audience: ${request.targetAudience}
    - Style/Concept: ${request.styleConcept}
    - Total Frames: ${request.frameCount}
    ${request.musicStyle ? `- Background Music Mood: ${request.musicStyle}` : ''}

    **USER ASSETS FOR CONSISTENCY:**
    ${request.uploadMode === 'combined' && request.combinedImage ? '- User provided a single image of the model holding the product. Maintain model, outfit, and product consistency.' : ''}
    ${request.uploadMode === 'separate' && request.modelImage ? '- User provided a model image. Maintain this model\'s face, hair, and OUTFIT.' : ''}
    ${request.uploadMode === 'separate' && request.productImage ? '- User provided a product image. This product\'s appearance is NON-NEGOTIABLE.' : ''}

    **CORE LOGIC & RULES (MANDATORY):**
    1.  **Deep Analysis:** Analyze the product URL to extract key selling points. The script must be based on real benefits and user pain points.
    2.  **Storyselling Structure:** The script must flow naturally: Problem/Hook -> Introduce Product as Solution -> Show Benefit/Result -> Clear Call to Action (CTA).
    3.  **Strategic Scene Composition (CRITICAL):**
        -   For any storyboard with 3 or more frames, it is **MANDATORY** to include **EXACTLY ONE** "Product-Only Shot". Describe this scene clearly (e.g., "Aesthetic close-up of the product on a clean vanity table with soft morning light."). This is a non-negotiable rule.
        -   For **ALL** other frames that include the model, the \`sceneDescription\` **MUST** describe the model actively and logically interacting with the product (e.g., "Model smiling while spraying the perfume on her wrist," not "Model standing in a room."). This is a non-negotiable rule.
    4.  **Language:** All text output must be in Bahasa Indonesia.

    **OUTPUT FORMAT (Strict JSON):**
    -   "hook": An irresistible 8-second hook that identifies a relatable problem or sparks curiosity.
    -   "fullScript": The complete video narration, from hook to CTA, written in a conversational, non-rigid tone.
    -   "frames": An array of ${request.frameCount} frame objects:
        -   "sceneDescription": A highly detailed visual description for the image AI. Mention pose, expression, background, lighting, and product placement. Adhere to the Strategic Scene Composition rules.
        -   "cameraAngle": Choose **ONE** effective angle from: ${CAMERA_ANGLES.join(', ')}.
        -   "script": A short voice-over line for this specific scene.
    ${request.musicStyle ? `    - "musicPrompt": A detailed prompt for a music AI (like Suno) based on the mood.` : ''}

    **FINAL CHECK:** Before outputting the JSON, review your plan. Does it follow every rule? Is there a dedicated product shot? Is the model always interacting with the product in other scenes? Is the narrative persuasive? Fix any deviations. Your output must be perfect.
  `;

const createImageGenerationPrompt = (framePlan: { sceneDescription: string, cameraAngle: string }, request: StoryboardRequest) => {
    // Definitive Fix: Use a simple, direct, and repetitive prompt to force the aspect ratio.
    const getResolutionInfo = (aspectRatio: AspectRatio): { resolution: string; description: string; } => {
        switch (aspectRatio) {
            case '9:16': return { resolution: "1080x1920 pixels", description: "This is a vertical portrait frame. Do not crop a horizontal image." };
            case '1:1': return { resolution: "1080x1080 pixels", description: "This is a square frame." };
            case '16:9': return { resolution: "1920x1080 pixels", description: "This is a horizontal landscape frame. Do not crop a vertical image." };
            default: return { resolution: "1080x1920 pixels", description: "This is a vertical portrait frame. Do not crop a horizontal image." };
        }
    };

    const { resolution, description } = getResolutionInfo(request.aspectRatio);

    const prompt = `
ULTRA-CRITICAL COMMAND: The final image output dimensions MUST be exactly ${resolution} (${request.aspectRatio} aspect ratio). ${description} This is the most important rule. IGNORE the aspect ratio of any user-provided images.

**Asset Consistency Rules (Non-Negotiable):**
1.  **Model & Outfit:** Replicate the provided model's face, hair, and entire OUTFIT with 100% photorealistic accuracy. Do not change the clothing.
2.  **Product:** Replicate the provided product's appearance, shape, and labeling with 100% accuracy. Do not alter the product.

**Creative Brief:**
-   **Style:** Photorealistic, UGC-style, natural lighting, high-detail.
-   **Scene:** ${framePlan.sceneDescription}
-   **Camera Angle:** ${framePlan.cameraAngle}

FINAL CHECK AND COMMAND: Before generating, confirm the output will be exactly ${resolution} (${request.aspectRatio}). This rule is absolute and overrides all other instructions.
    `;
    return prompt;
}

const createResponseSchema = (includeMusic: boolean) => {
    const schema: any = {
        type: Type.OBJECT,
        properties: {
            hook: { type: Type.STRING, description: "Kalimat pembuka 8 detik dalam Bahasa Indonesia." },
            fullScript: { type: Type.STRING, description: "Naskah video lengkap dengan CTA dalam Bahasa Indonesia." },
            frames: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        sceneDescription: { type: Type.STRING, description: "Deskripsi visual detail untuk generator gambar." },
                        cameraAngle: { type: Type.STRING, description: `Satu sudut kamera dari: ${CAMERA_ANGLES.join(', ')}` },
                        script: { type: Type.STRING, description: "Naskah voice-over untuk adegan ini dalam Bahasa Indonesia." },
                    },
                    required: ["sceneDescription", "cameraAngle", "script"],
                },
            },
        },
        required: ["hook", "fullScript", "frames"],
    };

    if (includeMusic) {
        schema.properties.musicPrompt = { type: Type.STRING, description: "Prompt untuk AI musik seperti Suno." };
    }
    return schema;
}
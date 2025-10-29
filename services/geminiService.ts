import { StoryboardFrame, StoryboardRequest, AspectRatio } from '../types';
import { CAMERA_ANGLES } from '../constants';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
const TEXT_MODEL = 'google/gemini-2.5-flash';
// Mengganti model gambar ke DALL-E 3 untuk stabilitas dan kualitas hasil yang lebih baik via OpenRouter
const IMAGE_MODEL = 'openai/dall-e-3';

const commonHeaders = (apiKey: string) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin, 
    'X-Title': 'UGC AI Storyboard Builder',
});

const handleApiResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Catch syntax errors for non-json responses
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`[${response.status}] ${errorMessage}`);
    }
    return response.json();
};

const imagePartForChat = (base64DataUrl: string) => ({
    type: 'image_url',
    image_url: { url: base64DataUrl },
});

const getUserImageParts = (request: StoryboardRequest): string[] => {
    const userImages: string[] = [];
    if (request.uploadMode === 'combined' && request.combinedImage) {
        userImages.push(request.combinedImage);
    } else {
        if (request.modelImage) userImages.push(request.modelImage);
        if (request.productImage) userImages.push(request.productImage);
    }
    return userImages;
}

const createTextGenerationPrompt = (request: StoryboardRequest) => `
    **PERSONA:** Act as an expert "UGC Ad Director". Your goal is to create a logical, persuasive, and visually compelling storyboard that is ready for production.

    **PROJECT BRIEF:**
    - Product URL: ${request.productUrl} (Analyze this for benefits, features, and reviews)
    - Target Audience: ${request.targetAudience}
    - Style/Concept: ${request.styleConcept}
    - Total Frames: ${request.frameCount}
    ${request.musicStyle ? `- Background Music Mood: ${request.musicStyle}` : ''}
    ${(request.modelImage || request.productImage || request.combinedImage) ? '- User has provided reference images. Analyze them for model, outfit, and product consistency.' : ''}
    
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

export const regenerateStoryboardText = async (request: StoryboardRequest, apiKey: string) => {
    const aiPrompt = createTextGenerationPrompt(request);
    const promptWithJsonInstruction = aiPrompt + "\n\nIMPORTANT: Respond with a valid JSON object ONLY. Do not include markdown formatting or any other text.";

    const userImages = getUserImageParts(request);
    const messageContent: any[] = [{ type: 'text', text: promptWithJsonInstruction }];
    userImages.forEach(img => messageContent.push(imagePartForChat(img)));
    
    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: commonHeaders(apiKey),
        body: JSON.stringify({
            model: TEXT_MODEL,
            messages: [{ role: 'user', content: messageContent }],
            response_format: { type: "json_object" },
        }),
    });

    const data = await handleApiResponse(response);
    const plan = JSON.parse(data.choices[0].message.content);
    
    const storyboardPlan = {
      hook: plan.hook,
      fullScript: plan.fullScript,
      frames: plan.frames,
      musicPrompt: plan.musicPrompt || null,
    }
    
    if (!storyboardPlan.hook || !storyboardPlan.fullScript || !storyboardPlan.frames) {
      throw new Error("AI response is missing required storyboard fields (hook, fullScript, or frames).");
    }

    return storyboardPlan;
};


export const regenerateFrameImage = async (
    frameData: { sceneDescription: string, cameraAngle: string },
    baseRequest: StoryboardRequest,
    apiKey: string
): Promise<string> => {
    // DALL-E 3 works best with descriptive prompts. We will combine all info into a single powerful prompt.
    // NOTE: DALL-E 3's API via OpenRouter (/images/generations) does not support passing reference images.
    // The visual consistency relies on the detailed description generated by the text model, which has seen the images.
    const imagePromptText = `
      UGC-style photorealistic ad image.
      Style: ${baseRequest.styleConcept}, natural lighting, high-detail, authentic social media feel for ${baseRequest.targetAudience}.
      Scene: ${frameData.sceneDescription}.
      Shot Type: ${frameData.cameraAngle}.
      The final image must be a high-quality photograph, not an illustration.
    `;

    // Map our aspect ratio to DALL-E 3 supported sizes
    const getDalleSize = (ratio: AspectRatio): '1024x1024' | '1792x1024' | '1024x1792' => {
        switch (ratio) {
            case '1:1': return '1024x1024';
            case '16:9': return '1792x1024';
            case '9:16':
            default: return '1024x1792';
        }
    };

    const response = await fetch(`${OPENROUTER_API_BASE}/images/generations`, {
        method: 'POST',
        headers: commonHeaders(apiKey),
        body: JSON.stringify({
            model: IMAGE_MODEL,
            prompt: imagePromptText,
            n: 1,
            size: getDalleSize(baseRequest.aspectRatio),
            response_format: 'b64_json', // Request base64 to avoid dealing with temporary URLs
        }),
    });

    const data = await handleApiResponse(response);
    
    if (!data.data || !data.data[0] || !data.data[0].b64_json) {
         throw new Error("Image data not found in the response from DALL-E 3 model.");
    }

    // Return a data URL that can be directly used in <img> src
    return `data:image/png;base64,${data.data[0].b64_json}`;
};

export const generateFullStoryboard = async (request: StoryboardRequest, apiKey: string, onProgress: (message: string, currentStep: number, totalSteps: number) => void) => {
  const totalSteps = 1 + request.frameCount;
  
  onProgress('Menganalisis produk dan membuat konsep cerita...', 1, totalSteps);
  
  // Step 1: Generate the storyboard plan (textual part)
  const storyboardPlan = await regenerateStoryboardText(request, apiKey);
  const planFrames = storyboardPlan.frames;

  // Step 2: Generate images for each frame
  const imageFrames: StoryboardFrame[] = [];

  for (let i = 0; i < planFrames.length; i++) {
    const currentStep = i + 2;
    onProgress(`Membuat gambar untuk frame ${i + 1} dari ${planFrames.length}...`, currentStep, totalSteps);
    const framePlan = planFrames[i];
    
    if (!framePlan.sceneDescription || !framePlan.cameraAngle || !framePlan.script) {
        console.warn(`Frame ${i+1} is missing data from the plan. Using placeholder.`);
        imageFrames.push({
            id: i + 1,
            imageUrl: `https://picsum.photos/seed/${Math.random()}/1080/1920`,
            script: "Data tidak lengkap dari AI.",
            cameraAngle: "N/A",
            sceneDescription: "N/A",
        });
        continue;
    }
    
    try {
        const newImageUrl = await regenerateFrameImage(framePlan, request, apiKey);
        imageFrames.push({
            id: i + 1,
            imageUrl: newImageUrl,
            script: framePlan.script,
            cameraAngle: framePlan.cameraAngle,
            sceneDescription: framePlan.sceneDescription,
        });
    } catch(err) {
        console.warn(`Image generation failed for frame ${i + 1}. Using placeholder.`, err);
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
    hook: storyboardPlan.hook,
    fullScript: storyboardPlan.fullScript,
    frames: imageFrames,
    musicPrompt: storyboardPlan.musicPrompt,
  };
};
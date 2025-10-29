
export type AspectRatio = '9:16' | '1:1' | '16:9';

export type UploadMode = 'separate' | 'combined';

export type MusicStyle = 'chill' | 'upbeat' | 'cinematic' | 'energetic';

export interface StoryboardFrame {
  id: number;
  imageUrl: string;
  script: string;
  cameraAngle: string;
  sceneDescription: string; // Added to support per-frame regeneration
}

export interface StoryboardResult {
  hook: string;
  fullScript: string;
  frames: StoryboardFrame[];
  musicPrompt: string | null;
}

export interface StoryboardRequest {
  productUrl: string;
  targetAudience: string;
  styleConcept: string;
  frameCount: number;
  aspectRatio: AspectRatio;
  modelImage: string | null;
  productImage: string | null;
  combinedImage: string | null;
  uploadMode: UploadMode;
  musicStyle: MusicStyle | null;
}
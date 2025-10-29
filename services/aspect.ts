export const ASPECT_MAP = {
  "9:16": { width: 1080, height: 1920 },
  "4:5":  { width: 1080, height: 1350 },
  "1:1":  { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 }
} as const;

export type AspectKey = keyof typeof ASPECT_MAP;

export function ensureDims(ar: AspectKey) {
  const dims = ASPECT_MAP[ar];
  if (!dims) throw new Error(`Unsupported AR: ${ar}`);
  return dims;
}

const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";
const PROXY_BASE = import.meta.env.VITE_PROXY_BASE || "http://localhost:8787/api";
const ORIGIN = "https://openrouter.ai/api/v1";

export const OPENROUTER_MODELS = {
  text: "google/gemini-2.5-pro",
  image: "google/gemini-2.5-flash-image-preview"
} as const;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function httpPost<T>(path: string, body: any): Promise<T> {
  const url = USE_PROXY ? `${PROXY_BASE}${path}` : `${ORIGIN}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function orGenerateText(messages: ChatMessage[], opts?: {
  temperature?: number; max_tokens?: number;
}) {
  const payload = {
    model: OPENROUTER_MODELS.text,
    messages,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 1200,
    stream: false
  };
  type Resp = { choices?: { message?: { content?: string } }[] };
  const json = await httpPost<Resp>("/chat/completions", payload);
  return json.choices?.[0]?.message?.content ?? "";
}

export async function orGenerateImage(params: {
  prompt: string;
  aspect_ratio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";
  refImages?: { url: string }[];
}) {
  const content: any[] = [{ type: "text", text: params.prompt }];
  if (params.refImages?.length) {
    for (const img of params.refImages) content.push({ type: "input_image", image_url: { url: img.url } });
  }
  const payload = {
    model: OPENROUTER_MODELS.image,
    messages: [{ role: "user", content }],
    modalities: ["image", "text"],
    image_config: params.aspect_ratio ? { aspect_ratio: params.aspect_ratio } : undefined,
    stream: false
  };
  type Img = { type: "image_url"; image_url: { url: string } };
  type Resp = { choices?: { message?: { images?: Img[] } }[] };
  const json = await httpPost<Resp>("/chat/completions", payload);
  const images = json.choices?.[0]?.message?.images ?? [];
  return images.map(i => i.image_url.url); // dataURL
}

import { useState } from "react";
import { orGenerateText, orGenerateImage } from "./services/openrouter";
import { ensureDims, ASPECT_MAP, AspectKey } from "./services/aspect";

type Scene = {
  id: string;
  title: string;
  intent: string;
  prompt?: string;
  image?: string;
  status?: "idle" | "generating" | "done" | "error";
};

const DEFAULT_AR: AspectKey = "9:16";

export default function App() {
  const [ar, setAr] = useState<AspectKey>(DEFAULT_AR);
  const [generating, setGenerating] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([
    { id: "S1", title: "Hook",    intent: "Model angkat lipstik dekat bibir, tatapan confident." },
    { id: "S2", title: "Benefit", intent: "Close-up tekstur, label kemasan terbaca jelas." },
    { id: "S3", title: "CTA",     intent: "Model senyum tipis, tampilkan produk dan CTA." }
  ]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const text = await orGenerateText([
        { role: "system", content: "You are a UGC storyboard writer. Output concise, ad-ready scene beats in JSON." },
        { role: "user", content:
`Produk: Lipstik premium, tone elegan.
Format: [{"id":"S1","beat":"..."},{"id":"S2","beat":"..."},{"id":"S3","beat":"..."}]
Bahasa Indonesia, ringkas, fokus iklan, 3 beat.` }
      ], { temperature: 0.6, max_tokens: 600 });

      let parsed: { id: string; beat: string }[] = [];
      try { parsed = JSON.parse(text); } catch {}

      const dims = ensureDims(ar);
      const systemLocks = `
SYSTEM:
- Render exactly ${dims.width}x${dims.height} (AR ${ar}). No letterboxing, no borders, no cropping.
STYLE LOCKS:
- Pertahankan teks label produk PERSIS dari referensi (jika diberikan).
- Tone warna konsisten elegan, premium, soft shadows.
- Kamera: three-quarter portrait, chest-up bila relevan; kemasan terbaca jelas.
OUTPUT:
- Photorealistic, ad-ready, tajam di tepi kemasan, tanpa motion blur pada label.
`.trim();

      const updated: Scene[] = [];
      for (const sc of scenes) {
        updated.push({ ...sc, status: "generating" });
        setScenes([...updated, ...scenes.slice(updated.length)]);
        const beat = parsed.find(p => p.id === sc.id)?.beat ?? sc.intent;
        const prompt = `${systemLocks}\n\nSHOT INTENT:\n${beat}\n\n(Opsional) Jika ada ref image, gunakan tangan natural memegang produk dan pastikan label terbaca.`;
        const imgs = await orGenerateImage({ prompt, aspect_ratio: ar });
        updated[updated.length - 1] = { ...sc, prompt, image: imgs[0], status: "done" };
        setScenes([...updated, ...scenes.slice(updated.length)]);
      }
    } catch (e) {
      console.error(e);
      setScenes(s => s.map(x => x.status === "generating" ? ({ ...x, status: "error" }) : x));
      alert((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">UGC AI Storyboard</h1>
        <span className="rounded-full border px-3 py-1 text-sm text-blue-600">Proxy: ON</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm">Aspect Ratio</label>
        <select className="rounded-lg border px-3 py-2" value={ar} onChange={e => setAr(e.target.value as AspectKey)}>
          {Object.keys(ASPECT_MAP).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <button
          className="ml-auto rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate Storyboard"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {scenes.map(sc => (
          <div key={sc.id} className="rounded-xl border p-3">
            <div className="mb-1 text-sm text-gray-500">{sc.id}</div>
            <div className="font-semibold">{sc.title}</div>
            <div className="mt-2 text-sm text-gray-700">{sc.intent}</div>
            {sc.prompt && <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">{sc.prompt}</pre>}
            <div className="mt-2">
              {sc.image
                ? <img src={sc.image} alt={sc.title} className="w-full rounded-lg" />
                : <div className="flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
                    {sc.status === "generating" ? "Generating..." : "No image"}
                  </div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

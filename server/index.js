import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;
const ORIGIN = "https://openrouter.ai/api/v1/chat/completions";

app.use(express.json({ limit: "25mb" }));
app.use(
  cors({
    origin: process.env.OPENROUTER_SITE_URL || "http://localhost:5173"
  })
);

function toBase64DataUrl(base64, mime = "image/png") {
  if (!base64) return null;
  // Jika sudah data URL, langsung balikin
  if (String(base64).startsWith("data:")) return base64;
  return `data:${mime};base64,${base64}`;
}

/**
 * Body yang diterima:
 * {
 *   prompt: string,              // wajib
 *   aspectRatio?: "9:16"|"16:9"|"1:1"|string,
 *   seed?: number,
 *   imageRef?: string            // optional, dataURL/base64/URL utk konsistensi
 * }
 */
app.post("/api/generate-image", async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "9:16",
      seed = undefined,
      imageRef = undefined
    } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required (string)" });
    }

    // Siapkan content (text + optional imageRef)
    const content = [];
    content.push({ type: "text", text: prompt });

    if (imageRef && typeof imageRef === "string" && imageRef.trim().length > 0) {
      // Bisa data URL (data:image/...), base64 tanpa header, atau URL publik
      // OpenRouter kompatibel dengan "image_url"
      let urlOrData = imageRef.trim();
      if (/^[A-Za-z0-9+/]+=*$/.test(urlOrData) && !urlOrData.startsWith("data:")) {
        urlOrData = toBase64DataUrl(urlOrData);
      }
      content.push({ type: "input_image", image_url: urlOrData });
    }

    const body = {
      model: process.env.MODEL || "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content
        }
      ],
      // Wajib untuk image gen via OpenRouter
      modalities: ["image", "text"],
      // AR fix di sisi model
      image_config: { aspect_ratio: aspectRatio },
      // Seed opsional biar lebih deterministik
      ...(typeof seed === "number" ? { seed } : {})
    };

    const r = await fetch(ORIGIN, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        ...(process.env.OPENROUTER_SITE_URL
          ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }
          : {}),
        "X-Title": "UGC AI Storyboard"
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(r.status).json({
        error: data?.error?.message || data?.error || "OpenRouter error",
        raw: data
      });
    }

    // Robust extractor: support beberapa skema output OpenRouter
    let imageDataUrl = null;
    let mime = "image/png";

    const choice = data?.choices?.[0];

    // 1) Skema message.content array dengan output_image (base64)
    const contentArr = choice?.message?.content;
    if (Array.isArray(contentArr)) {
      for (const part of contentArr) {
        if (part?.type === "output_image") {
          if (part?.mime_type) mime = part.mime_type;
          if (part?.image_base64) imageDataUrl = toBase64DataUrl(part.image_base64, mime);
          if (part?.image_url?.url) imageDataUrl = part.image_url.url; // kalau URL
          if (imageDataUrl) break;
        }
        // beberapa model kirim langsung image_url
        if (part?.type === "image_url" && part?.image_url?.url) {
          imageDataUrl = part.image_url.url;
          break;
        }
      }
    }

    // 2) Skema lama: choices[0].message.images[0].image_url.url
    if (!imageDataUrl) {
      const urlV2 = choice?.message?.images?.[0]?.image_url?.url;
      if (urlV2) imageDataUrl = urlV2;
    }

    // 3) Skema base64 langsung di top-level (fallback ekstrem)
    if (!imageDataUrl) {
      const b64 =
        data?.image_base64 ||
        choice?.image_base64 ||
        data?.choices?.[0]?.message?.image_base64;
      if (b64) imageDataUrl = toBase64DataUrl(b64, mime);
    }

    if (!imageDataUrl) {
      return res.status(502).json({
        error: "No image returned by model",
        raw: data
      });
    }

    return res.json({
      image: imageDataUrl,
      // useful untuk chaining konsistensi frame berikutnya
      meta: {
        aspectRatio,
        seed: typeof seed === "number" ? seed : undefined,
        model: body.model
      },
      raw: data
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

/**
 * Endpoint chaining multi-frame untuk konsistensi:
 * kirim promptFrame[], aspectRatio, seed, dan optional firstImageRef
 * Server akan generate berurutan; setiap frame pakai hasil sebelumnya sebagai referensi.
 *
 * Body:
 * {
 *   prompts: string[],             // wajib, minimal 1
 *   aspectRatio?: string,          // default "9:16"
 *   seed?: number,
 *   firstImageRef?: string         // optional (dataURL/base64/URL)
 * }
 */
app.post("/api/generate-sequence", async (req, res) => {
  try {
    const { prompts, aspectRatio = "9:16", seed, firstImageRef } = req.body || {};
    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: "prompts must be a non-empty string array" });
    }

    const results = [];
    let lastImage = firstImageRef || undefined;

    for (let i = 0; i < prompts.length; i++) {
      const resp = await fetch(`http://localhost:${PORT}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompts[i],
          aspectRatio,
          seed,
          imageRef: lastImage
        })
      });
      const json = await resp.json();
      if (!resp.ok) {
        return res.status(resp.status).json({ error: json?.error || "sequence error", step: i, raw: json });
      }
      results.push({ index: i, image: json.image, meta: json.meta });
      lastImage = json.image; // chaining ke frame berikutnya
    }

    return res.json({ frames: results, aspectRatio, seed });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`OpenRouter API server running at http://localhost:${PORT}`);
});

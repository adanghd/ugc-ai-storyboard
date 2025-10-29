import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(cors({ origin: process.env.OPENROUTER_SITE_URL || "http://localhost:5173" }));

const ORIGIN = "https://openrouter.ai/api/v1";
const BASE_HEADERS = {
  "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
  "X-Title": process.env.OPENROUTER_APP_NAME || "UGC AI Storyboard (Local)"
};

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat/completions", async (req, res) => {
  try {
    const r = await fetch(`${ORIGIN}/chat/completions`, {
      method: "POST",
      headers: BASE_HEADERS,
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    res.status(r.status)
       .type(r.headers.get("content-type") || "application/json")
       .send(text);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Proxy error" });
  }
});

app.listen(process.env.PORT || 8787, () => {
  console.log(`[server] http://localhost:${process.env.PORT || 8787}`);
});

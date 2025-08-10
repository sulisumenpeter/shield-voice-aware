import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

// CORS headers for HTTP (not used by Twilio WS but kept for completeness)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utilities: mu-law decode (8kHz) -> PCM16, then upsample to 16kHz
function muLawDecode(muByte: number): number {
  muByte = ~muByte;
  const sign = (muByte & 0x80) ? -1 : 1;
  let exponent = (muByte >> 4) & 0x07;
  let mantissa = muByte & 0x0F;
  let magnitude = ((mantissa << 4) + 0x08) << (exponent + 3);
  return sign * (magnitude - 132); // 132 is bias
}

function decodeMuLaw(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const mu = binary.charCodeAt(i) & 0xff;
    out[i] = muLawDecode(mu);
  }
  return out;
}

// Linear upsample from 8kHz to 16kHz
function upsampleTo16k(pcm8k: Int16Array): Int16Array {
  if (pcm8k.length === 0) return pcm8k;
  const factor = 2; // 8k -> 16k
  const out = new Int16Array(pcm8k.length * factor);
  for (let i = 0; i < pcm8k.length - 1; i++) {
    const a = pcm8k[i];
    const b = pcm8k[i + 1];
    out[i * factor] = a;
    out[i * factor + 1] = (a + b) >> 1; // simple linear interp
  }
  // last sample duplicate
  const last = pcm8k[pcm8k.length - 1];
  out[out.length - 2] = last;
  out[out.length - 1] = last;
  return out;
}

// Create WAV (mono, 16-bit, 16kHz)
function pcm16ToWav(pcm16: Int16Array, sampleRate = 16000): Uint8Array {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm16.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
    offset += s.length;
  }

  // RIFF header
  writeString("RIFF");
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;          // Subchunk1Size (16 for PCM)
  view.setUint16(offset, 1, true); offset += 2;           // AudioFormat (1 = PCM)
  view.setUint16(offset, numChannels, true); offset += 2; // NumChannels
  view.setUint32(offset, sampleRate, true); offset += 4;  // SampleRate
  view.setUint32(offset, byteRate, true); offset += 4;    // ByteRate
  view.setUint16(offset, blockAlign, true); offset += 2;  // BlockAlign
  view.setUint16(offset, 16, true); offset += 2;          // BitsPerSample
  writeString("data");
  view.setUint32(offset, dataSize, true); offset += 4;    // Subchunk2Size

  // PCM data
  const out = new Uint8Array(buffer);
  let o = 44;
  for (let i = 0; i < pcm16.length; i++, o += 2) {
    view.setInt16(o, pcm16[i], true);
  }
  return out;
}

// Risk scoring helper
function labelToRisk(label: string): number {
  switch (label.toLowerCase()) {
    case "scam": return 90;
    case "suspicious": return 55;
    case "safe": return 10;
    default: return 30;
  }
}

// Classify text using OpenAI (gpt-4o-mini)
async function classifyText(text: string, openAIKey: string): Promise<{label: string; rationale: string; risk: number}> {
  const system = `Classify the user's utterance into one of: Safe, Suspicious, Scam. Return strict JSON {"label":"Safe|Suspicious|Scam","rationale":"..."}. Keep it concise.`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Classification error:", errText);
    throw new Error("OpenAI classification failed");
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  let parsed: { label?: string; rationale?: string } = {};
  try { parsed = JSON.parse(content); } catch {}
  const label = parsed.label || "Suspicious";
  const rationale = parsed.rationale || "Uncertain, needs review.";
  return { label, rationale, risk: labelToRisk(label) };
}

// Transcribe using Whisper (chunked)
async function transcribeChunkWav(wavBytes: Uint8Array, openAIKey: string): Promise<string> {
  const form = new FormData();
  const blob = new Blob([wavBytes], { type: "audio/wav" });
  form.append("file", blob, "chunk.wav");
  form.append("model", "whisper-1");
  form.append("response_format", "json");
  try {
    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAIKey}` },
      body: form,
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Whisper error:", errText);
      throw new Error("Whisper transcription failed");
    }
    const json = await resp.json();
    return json.text || "";
  } catch (e) {
    console.error("Transcription exception:", e);
    return "";
  }
}

// Anti-spoofing via Hugging Face Inference API (AASIST)
async function detectSpoof(
  wavBytes: Uint8Array,
  hfToken: string,
  model = "speechbrain/antispoofing-AASIST",
  timeoutMs = 1500,
): Promise<{ label: "synthetic" | "genuine"; score: number } | null> {
  try {
    if (!hfToken) return null;
    const url = `https://api-inference.huggingface.co/models/${model}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "audio/wav",
        Accept: "application/json",
      },
      body: wavBytes,
      signal: controller.signal,
    }).catch((e) => {
      console.error("HF request error:", e);
      return null as any;
    });
    clearTimeout(id);
    if (!resp || !resp.ok) {
      if (resp) {
        const t = await resp.text();
        console.warn("HF non-OK:", resp.status, t);
      }
      return null;
    }
    const data = await resp.json();
    // Expecting array like: [{label:"bonafide", score:0.98}, {label:"spoof", score:0.02}]
    if (!Array.isArray(data)) return null;
    let spoofProb = 0;
    for (const item of data) {
      const lbl = String(item.label || "").toLowerCase();
      if (lbl.includes("spoof")) {
        spoofProb = Number(item.score) || 0;
        break;
      }
      if (lbl.includes("bona") || lbl.includes("genuine")) {
        // fallback if only bonafide given
        const bona = Number(item.score) || 0;
        spoofProb = Math.max(spoofProb, 1 - bona);
      }
    }
    const label = spoofProb >= 0.5 ? "synthetic" : "genuine";
    return { label, score: spoofProb };
  } catch (e) {
    console.error("detectSpoof exception:", e);
    return null;
  }
}

// HMAC token verification (hex digest)
async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

async function verifySignedToken(secret: string, payload: string, token: string): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, payload);
  return timingSafeEqual(expected, token);
}

serve(async (req) => {
  // Handle CORS preflight for HTTP
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept WebSocket (Twilio Media Streams)
  const upgradeHeader = req.headers.get("upgrade") || "";
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  // Parse and verify signed token BEFORE upgrading
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  const callId = url.searchParams.get("call_id");
  const language = url.searchParams.get("lang") || "en";
  const tsParam = url.searchParams.get("ts");
  const tokenParam = url.searchParams.get("token");
  const tokenSecret = Deno.env.get("TWILIO_MEDIA_TOKEN_SECRET") || "";

  if (!userId || !callId || !tsParam || !tokenParam || !tokenSecret) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const ts = parseInt(tsParam, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 60_000) {
    return new Response("Token expired", { status: 401, headers: corsHeaders });
  }
  const isValid = await verifySignedToken(tokenSecret, `${userId}:${callId}:${ts}`, tokenParam);
  if (!isValid) {
    return new Response("Invalid token", { status: 401, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req, { protocol: req.headers.get("Sec-WebSocket-Protocol") ?? undefined });

  // Env & clients
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const OPENAI = Deno.env.get("OPENAI_API_KEY")!;
  const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN") || "";
  const ANTISPOOF_ENABLED = (Deno.env.get("ANTISPOOF_ENABLED") ?? "true").toLowerCase() !== "false";
  const ANTISPOOF_MODEL = Deno.env.get("ANTISPOOF_MODEL") || "speechbrain/antispoofing-AASIST";
  const ANTISPOOF_THRESHOLD = parseFloat(Deno.env.get("ANTISPOOF_THRESHOLD") ?? "0.5");
  const ANTISPOOF_TIMEOUT_MS = parseInt(Deno.env.get("ANTISPOOF_TIMEOUT_MS") ?? "1500");
  const ANTISPOOF_WEIGHT = Math.max(0, Math.min(1, parseFloat(Deno.env.get("ANTISPOOF_WEIGHT") ?? "0.35")));
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let pcmBuffer8k: Int16Array[] = [];
  const CHUNK_TARGET_MS = 1500; // ~1.5s latency target
  let samplesAccumulated = 0;   // at 8kHz
  const samplesPerMs8k = 8;     // 8 samples per ms at 8kHz
  const targetSamples8k = CHUNK_TARGET_MS * samplesPerMs8k;

  let cumulativeRisk = 0;
  let segments = 0;

  // Anti-spoofing state (latest result)
  let lastSpoofScore: number | null = null; // 0..1 probability of spoof
  let lastSpoofLabel: "synthetic" | "genuine" | "unknown" = "unknown";

  async function flushChunk() {
    try {
      if (!pcmBuffer8k.length) return;
      // Merge buffers
      const total = pcmBuffer8k.reduce((sum, arr) => sum + arr.length, 0);
      const merged8k = new Int16Array(total);
      let off = 0;
      for (const arr of pcmBuffer8k) { merged8k.set(arr, off); off += arr.length; }
      pcmBuffer8k = []; samplesAccumulated = 0;

      // Upsample to 16kHz and build WAV
      const pcm16k = upsampleTo16k(merged8k);
      const wav = pcm16ToWav(pcm16k, 16000);

      // Kick off anti-spoof in parallel (non-blocking) for minimal latency
      const spoofPromise = (ANTISPOOF_ENABLED && HF_TOKEN)
        ? detectSpoof(wav, HF_TOKEN, ANTISPOOF_MODEL, ANTISPOOF_TIMEOUT_MS)
        : Promise.resolve(null);

      // Transcribe
      const text = await transcribeChunkWav(wav, OPENAI);
      if (!text) {
        // Still update latest spoof if available
        const spoofRes = await spoofPromise;
        if (spoofRes) { lastSpoofScore = spoofRes.score; lastSpoofLabel = spoofRes.label; }
        return;
      }

      // Classify
      const { label, rationale, risk } = await classifyText(text, OPENAI);

      // Await anti-spoof result (should already be ready or within timeout)
      const spoofRes = await spoofPromise;
      if (spoofRes) {
        lastSpoofScore = spoofRes.score;
        lastSpoofLabel = spoofRes.label;
      }

      // Fuse risk with anti-spoof (if available)
      const spoofProb = lastSpoofScore ?? 0;
      const fusedRisk = Math.round(risk * (1 - ANTISPOOF_WEIGHT) + (spoofProb * 100) * ANTISPOOF_WEIGHT);

      // Accumulate risk (simple moving average)
      segments += 1;
      cumulativeRisk = Math.round(((cumulativeRisk * (segments - 1)) + fusedRisk) / segments);

      // Persist if we have user_id
      if (userId) {
        await supabase.from("transcripts").insert({
          user_id: userId,
          call_id: callId,
          speaker: "caller",
          content: text,
          label,
          rationale,
        });
        await supabase.from("calls").upsert({
          id: callId,
          user_id: userId,
          risk_score: cumulativeRisk,
          direction: "inbound",
          channel: "twilio",
        }, { onConflict: "id" });
        if (label.toLowerCase() !== "safe") {
          await supabase.from("alerts").insert({
            user_id: userId,
            call_id: callId,
            level: label.toLowerCase(),
            message: `Detected ${label}: ${rationale}`,
          });
        }
      }

      // Also stream a compact event back on the WS for any client listeners
      socket.send(JSON.stringify({
        type: "transcript.segment",
        call_id: callId,
        language,
        speaker: "caller",
        text,
        label,
        rationale,
        risk: fusedRisk,
        cumulative_risk: cumulativeRisk,
        spoof: lastSpoofScore == null ? null : { score: lastSpoofScore, label: lastSpoofLabel, threshold: ANTISPOOF_THRESHOLD },
        ts: Date.now(),
      }));
    } catch (err) {
      console.error("flushChunk error:", err);
    }
  }

  socket.onopen = () => {
    console.log("Twilio WS connected", { callId, userId });
    // Inform client
    try { socket.send(JSON.stringify({ type: "connected", call_id: callId })); } catch {}
  };

  socket.onmessage = async (ev) => {
    try {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data));
      // Twilio events: start, media, mark, stop
      if (msg.event === "start") {
        console.log("Twilio start", msg.streamSid);
      } else if (msg.event === "media") {
        const payload = msg.media?.payload as string | undefined;
        if (!payload) return;
        const pcm8k = decodeMuLaw(payload);
        pcmBuffer8k.push(pcm8k);
        samplesAccumulated += pcm8k.length;
        if (samplesAccumulated >= targetSamples8k) {
          await flushChunk();
        }
      } else if (msg.event === "stop") {
        console.log("Twilio stop");
        await flushChunk();
        try { socket.send(JSON.stringify({ type: "call.ended", call_id: callId })); } catch {}
        socket.close();
      }
    } catch (e) {
      console.error("onmessage parse error", e);
    }
  };

  socket.onclose = () => {
    console.log("Twilio WS closed", { callId });
  };

  socket.onerror = (e) => {
    console.error("Twilio WS error", e);
  };

  return response;
});
